"""Pruebas de regresión del ETL de VacunaBI sin depender de la red.

Ejecutar: python -m unittest -v test_etl_regression
"""
import math
import io
import json
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

import pandas as pd

import etl
from etl import anual, cobertura, limpiar_mensual, limpiar_sectores, num_es


class TestETLRegression(unittest.TestCase):
    """Comprueba limpieza, agregación y manejo de periodos parciales."""

    def test_api_rechaza_una_pagina_incompleta(self):
        def respuesta(rows):
            return io.BytesIO(json.dumps({"success": True, "result": {"total": 2, "records": rows}}).encode())
        with patch.object(etl.urllib.request, "urlopen", side_effect=[respuesta([{"_id": 1}]), respuesta([])]):
            with self.assertRaisesRegex(ValueError, "Descarga incompleta"):
                etl.consultar_api(etl.RES_SECTORES)

    def test_fallo_de_segunda_fuente_preserva_tablero_y_registra_fase(self):
        with TemporaryDirectory() as directorio:
            salida = Path(directorio)
            tablero = salida / "dashboard.html"
            tablero.write_bytes(b"tablero previo")
            crudo = salida / "crudo_sectores.csv"
            crudo.write_bytes(b"extraccion previa")
            with patch.object(etl, "OUT", salida), patch.object(
                etl, "consultar_api", side_effect=[self.datos_sectores(), TimeoutError("sin respuesta")]
            ):
                with self.assertRaises(TimeoutError):
                    etl.main()
            auditoria = json.loads((salida / "auditoria.json").read_text(encoding="utf-8"))[-1]
            self.assertEqual(auditoria["estado"], "Fallida")
            self.assertEqual(auditoria["fase"], "Descarga mensual")
            self.assertEqual(tablero.read_bytes(), b"tablero previo")
            self.assertEqual(crudo.read_bytes(), b"extraccion previa")

    def test_archivo_bloqueado_revierte_publicacion_parcial(self):
        with TemporaryDirectory() as directorio:
            salida = Path(directorio)
            temporal = salida / "temporal"
            temporal.mkdir()
            nuevos = ["a.csv", "dashboard.html"]
            for nombre in nuevos:
                (salida / nombre).write_text("anterior", encoding="utf-8")
                (temporal / nombre).write_text("nuevo", encoding="utf-8")
            reemplazar = Path.replace

            def simular_bloqueo(origen, destino):
                if origen == temporal / "dashboard.html":
                    raise PermissionError("archivo bloqueado")
                return reemplazar(origen, destino)

            with patch.object(etl, "OUT", salida), patch.object(Path, "replace", simular_bloqueo):
                with self.assertRaises(PermissionError):
                    etl.publicar_salidas(temporal)
            self.assertEqual([(salida / nombre).read_text() for nombre in nuevos], ["anterior", "anterior"])

    @staticmethod
    def datos_sectores():
        filas = [
            {
                "FECHA_REPORTE": "26/08/2025",
                "NOMBRE_LOCALIDAD": "05 - Usme",
                "BIOLOGICO_EDAD": "Triple viral (1 año de edad)",
                "INSTITUCION": "ICBF",
                "DOSIS_APLICADA": "17",
                "DENOMINADOR": "24",
                "COBERTURA": "708",
            },
            {
                "FECHA_REPORTE": "26/08/2025",
                "NOMBRE_LOCALIDAD": "02 - Chapinero",
                "BIOLOGICO_EDAD": "Pentavalente",
                "INSTITUCION": "ICBF",
                "DOSIS_APLICADA": "12",
                "DENOMINADOR": "10",
                "COBERTURA": "1200",
            },
        ]
        return pd.DataFrame([filas[0], filas[0].copy(), filas[1], {
            **filas[1], "NOMBRE_LOCALIDAD": "NO ACTUALIZADO",
        }])

    def test_interpreta_numeros_colombianos(self):
        self.assertEqual(num_es(" 98.914 "), 98914)
        self.assertEqual(num_es(" 7,8 "), 7.8)
        self.assertTrue(math.isnan(num_es(None)))

    def test_excluye_localidad_invalida_y_duplicado(self):
        datos, log = limpiar_sectores(self.datos_sectores())
        self.assertEqual(log["filas_originales"], 4)
        self.assertEqual(log["filas_localidad_no_valida"], 1)
        self.assertEqual(log["duplicados_eliminados"], 1)
        self.assertEqual(log["filas_finales"], 2)
        self.assertEqual(set(datos["localidad"]), {"Usme", "Chapinero"})

    def test_cobertura_mayor_a_cien_conserva_valor_y_alerta(self):
        datos, log = limpiar_sectores(self.datos_sectores())
        chapinero = datos.loc[datos["localidad"] == "Chapinero"].iloc[0]
        self.assertEqual(chapinero["cobertura_reportada"], 120.0)
        self.assertEqual(chapinero["cobertura_recalculada"], 120.0)
        self.assertTrue(chapinero["flag_sobre_100"])
        # El log se calcula ANTES del filtro territorial: cuenta el registro
        # de Chapinero y otro con localidad inválida.
        self.assertEqual(log["filas_sobre_100"], 2)

    def test_agrega_cobertura_ponderada_por_denominador(self):
        datos, _ = limpiar_sectores(self.datos_sectores())
        resultado = cobertura(datos, ["institucion"]).iloc[0]
        # (17 + 12) / (24 + 10) * 100 = 85,3 %; no media simple.
        self.assertEqual(resultado["dosis_aplicada"], 29)
        self.assertEqual(resultado["denominador"], 34)
        self.assertEqual(resultado["cobertura"], 85.3)

    def test_excluye_total_y_distingue_anio_incompleto(self):
        registros = [
            {
                "Biologico": "Penta <1año",
                "Ano": "2026",
                "Orden mes": str(mes),
                "Mes": "mes",
                "Meta": "100",
                "Vacunados": "10" if mes != 3 else None,
                "Cobertura": "0",
                "Column7": None,
            }
            for mes in range(1, 4)
        ]
        registros.append({**registros[0], "Orden mes": "13", "Vacunados": "999"})
        mensual, log = limpiar_mensual(pd.DataFrame(registros))
        resumen = anual(mensual).iloc[0]
        self.assertEqual(log["filas_total_eliminadas"], 1)
        self.assertEqual(log["meses_sin_reporte"], 1)
        self.assertEqual(resumen["meses_reportados"], 2)
        self.assertFalse(bool(resumen["anio_completo"]))
        self.assertEqual(resumen["vacunados"], 20)
        self.assertEqual(resumen["cobertura"], 20.0)


if __name__ == "__main__":
    unittest.main()
