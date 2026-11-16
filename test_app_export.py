"""Pruebas del guardado de escritorio con un selector de archivos controlado."""
import base64
import importlib.util
import sys
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch


def cargar_modulo():
    spec = importlib.util.spec_from_file_location("app_prueba", Path(__file__).with_name("app.py"))
    module = importlib.util.module_from_spec(spec)
    with patch.dict(sys.modules, {"webview": SimpleNamespace(SAVE_DIALOG=30)}):
        spec.loader.exec_module(module)
    return module


def escritorio():
    actualizacion = cargar_modulo().Actualizacion()
    actualizacion._ventana = Mock()
    return actualizacion


class TestEscritorio(unittest.TestCase):
    def test_apertura_sin_api_usa_uri_local_y_avisa_al_tablero(self):
        module = cargar_modulo()
        control = module.Actualizacion()
        ventana = Mock()
        with TemporaryDirectory() as raiz:
            carpeta = Path(raiz)
            dashboard = carpeta / "dashboard.html"
            dashboard.touch()
            with patch.object(module.etl, "OUT", carpeta), patch.object(
                control, "refresh_data", return_value={"ok": False}
            ):
                module.cargar(ventana, control)
            ventana.load_url.assert_called_once_with(dashboard.resolve().as_uri())
            self.assertTrue(control.usa_copia_local())

    def test_inicio_con_cache_compatible_evitar_descarga_repetida(self):
        module = cargar_modulo()
        control = module.Actualizacion()
        ventana = Mock()
        with TemporaryDirectory() as raiz:
            carpeta = Path(raiz)
            tablero = carpeta / "dashboard.html"
            tablero.write_text(
                f'<meta name="vacunabi-version" content="{module.etl.VERSION_TABLERO}">',
                encoding="utf-8",
            )
            with patch.object(module.etl, "OUT", carpeta), patch.object(
                control, "refresh_data"
            ) as refresh:
                module.cargar(ventana, control)
                self.assertTrue(module.hay_tablero_compatible())
            refresh.assert_not_called()
            ventana.load_url.assert_called_once_with(tablero.resolve().as_uri())
            self.assertTrue(control.inicio_con_copia_guardada())
            self.assertFalse(control.usa_copia_local())

    def test_inicio_con_cache_viejo_descarga_una_sola_vez(self):
        module = cargar_modulo()
        control = module.Actualizacion()
        ventana = Mock()
        with TemporaryDirectory() as raiz:
            carpeta = Path(raiz)
            tablero = carpeta / "dashboard.html"
            tablero.write_text("<html>cache de versión anterior</html>", encoding="utf-8")
            with patch.object(module.etl, "OUT", carpeta), patch.object(
                control, "refresh_data", return_value={"ok": True}
            ) as refresh:
                module.cargar(ventana, control)
            refresh.assert_called_once_with()
            ventana.load_url.assert_called_once_with(tablero.resolve().as_uri())
            self.assertFalse(control.inicio_con_copia_guardada())

    def test_cache_compatible_no_depende_de_un_archivo_incompleto(self):
        module = cargar_modulo()
        with TemporaryDirectory() as raiz, patch.object(module.etl, "OUT", Path(raiz)):
            self.assertFalse(module.hay_tablero_compatible())
            (Path(raiz) / "dashboard.html").write_text(
                "<html><meta name='vacunabi-version' content='0.0'></html>",
                encoding="utf-8",
            )
            self.assertFalse(module.hay_tablero_compatible())

    def test_recarga_tras_actualizar_usa_uri_local_sin_query(self):
        module = cargar_modulo()
        control = module.Actualizacion()
        ventana = Mock()
        control._ventana = ventana
        with TemporaryDirectory() as raiz:
            carpeta = Path(raiz)
            dashboard = carpeta / "dashboard.html"
            dashboard.write_text("<html>Datos actualizados</html>", encoding="utf-8")
            with patch.object(module.etl, "OUT", carpeta):
                result = control.recargar_dashboard()
            self.assertEqual(result, {"ok": True})
            ventana.load_url.assert_called_once_with(dashboard.resolve().as_uri())
            self.assertNotIn("?", ventana.load_url.call_args.args[0])
            self.assertTrue(control.consumir_aviso_recarga())
            self.assertFalse(control.consumir_aviso_recarga())

    def test_recarga_sin_copia_no_navega(self):
        module = cargar_modulo()
        control = module.Actualizacion()
        control._ventana = Mock()
        with TemporaryDirectory() as raiz, patch.object(module.etl, "OUT", Path(raiz)):
            result = control.recargar_dashboard()
        self.assertFalse(result["ok"])
        control._ventana.load_url.assert_not_called()
        self.assertFalse(control.consumir_aviso_recarga())

    def test_recarga_fallida_no_anuncia_exito(self):
        module = cargar_modulo()
        control = module.Actualizacion()
        control._ventana = Mock()
        control._ventana.load_url.side_effect = RuntimeError("Error de navegación")
        with TemporaryDirectory() as raiz:
            carpeta = Path(raiz)
            (carpeta / "dashboard.html").touch()
            with patch.object(module.etl, "OUT", carpeta):
                result = control.recargar_dashboard()
        self.assertFalse(result["ok"])
        self.assertFalse(control.consumir_aviso_recarga())

    def test_guardado_y_cancelacion(self):
        control = escritorio()
        payload = base64.b64encode(b"Localidad;Cobertura\nUsme;84.6").decode()
        with TemporaryDirectory() as raiz:
            path = Path(raiz) / "salida.csv"
            control._ventana.create_file_dialog.return_value = (str(path),)
            self.assertEqual(control.guardar_exportacion("VacunaBI-sector.csv", payload)["estado"], "guardada")
            self.assertEqual(path.read_bytes(), base64.b64decode(payload))
            control._ventana.create_file_dialog.return_value = None
            self.assertEqual(control.guardar_exportacion("VacunaBI-sector.csv", payload)["estado"], "cancelada")
            self.assertEqual(list(Path(raiz).iterdir()), [path])

    def test_archivo_invalido_no_abre_dialogo(self):
        control = escritorio()
        self.assertEqual(control.guardar_exportacion("../salida.exe", "YQ==")["estado"], "error")
        self.assertEqual(control.guardar_exportacion("VacunaBI-sector.csv", "???")["estado"], "error")
        control._ventana.create_file_dialog.assert_not_called()
