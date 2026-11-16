"""ETL + KPIs + dashboard: cobertura de vacunación en Bogotá D.C.

Consulta en vivo la API CKAN del Portal de Datos Abiertos de Bogotá (Secretaría
Distrital de Salud / Observatorio de Salud - SaluData), limpia los datos, genera la
base consolidada (Excel + CSV), calcula los KPI y construye dashboard.html.

Uso:  python etl.py          (cada ejecución trae los datos más recientes)
"""
import json
import math
import shutil
import sys
import unicodedata
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from tempfile import NamedTemporaryFile, TemporaryDirectory

import pandas as pd

API = "https://datosabiertos.bogota.gov.co/api/3/action/datastore_search"
RES_SECTORES = "e519cce2-9951-41de-afbc-005d1e1d24dd"  # Seguimiento cobertura vacunación - sectores
RES_MENSUAL = "1910589c-2836-41d3-aba4-00488bb5e5f3"   # Cobertura vacunación en Bogotá D.C. (mensual)
ESCHEMAS = {
    RES_SECTORES: {"fecha_reporte", "nombre_localidad", "biologico_edad", "institucion",
                   "dosis_aplicada", "denominador", "cobertura"},
    RES_MENSUAL: {"biologico", "ano", "orden mes", "mes", "meta", "vacunados", "cobertura", "column7"},
}
META = 95.0  # meta PAI - Ministerio de Salud
EXE = getattr(sys, "frozen", False)  # True cuando corre como .exe (PyInstaller)
RECURSOS = Path(getattr(sys, "_MEIPASS", Path(__file__).parent))  # plantilla y Chart.js empaquetados
OUT = (Path(sys.executable).parent if EXE else Path(__file__).parent) / "salidas"

ZONAS = {  # agrupación geográfica usada en DIM_LOCALIDAD
    "Usaquén": "Norte", "Chapinero": "Norte", "Suba": "Norte", "Barrios Unidos": "Norte", "Teusaquillo": "Norte",
    "Santa Fe": "Centro", "Los Mártires": "Centro", "La Candelaria": "Centro", "Antonio Nariño": "Centro",
    "Puente Aranda": "Centro",
    "Usme": "Sur", "Tunjuelito": "Sur", "San Cristóbal": "Sur", "Rafael Uribe Uribe": "Sur",
    "Ciudad Bolívar": "Sur", "Sumapaz": "Rural",
    "Bosa": "Occidente", "Kennedy": "Occidente", "Fontibón": "Occidente", "Engativá": "Occidente",
}
LOCALIDADES = (
    "Usaquén", "Chapinero", "Santa Fe", "San Cristóbal", "Usme", "Tunjuelito",
    "Bosa", "Kennedy", "Fontibón", "Engativá", "Suba", "Barrios Unidos", "Teusaquillo",
    "Los Mártires", "Antonio Nariño", "Puente Aranda", "La Candelaria", "Rafael Uribe Uribe",
    "Ciudad Bolívar", "Sumapaz",
)


def limites_localidades():
    limites = json.loads((RECURSOS / "localidades.json").read_text(encoding="utf-8"))
    return [
        {"codigo": f"{codigo:02}", "localidad": nombre, "anillos": limites[f"{codigo:02}"]}
        for codigo, nombre in enumerate(LOCALIDADES, 1)
    ]


def consultar_api(resource_id):
    """Trae todos los registros de un recurso CKAN, paginando."""
    filas, offset = [], 0
    total = None
    identificadores = set()
    while True:
        url = f"{API}?resource_id={resource_id}&limit=1000&offset={offset}"
        with urllib.request.urlopen(url, timeout=60) as r:
            res = json.load(r)
        if not res.get("success"):
            raise RuntimeError(f"API respondió error para {resource_id}: {res.get('error')}")
        resultado = res["result"]
        lote = resultado["records"]
        total_pagina = resultado["total"]
        if not isinstance(total_pagina, int) or total_pagina <= 0:
            raise ValueError(f"El recurso {resource_id} no contiene registros.")
        if total is None:
            total = total_pagina
        ids = {fila.get("_id") for fila in lote}
        if (total_pagina != total or not lote or offset + len(lote) > total
                or None in ids or len(ids) != len(lote) or identificadores.intersection(ids)):
            raise ValueError(f"Descarga incompleta o inconsistente para {resource_id}.")
        identificadores.update(ids)
        filas += lote
        offset += len(lote)
        if offset == total:
            df = pd.DataFrame(filas).drop(columns="_id")
            faltantes = ESCHEMAS[resource_id] - {nombre.lower() for nombre in df.columns}
            if faltantes:
                raise ValueError(f"Faltan columnas en {resource_id}: {', '.join(sorted(faltantes))}.")
            return df


def num_es(valor):
    """'98.914' -> 98914.0 ; ' 7,8 ' -> 7.8 ; None/'' -> NaN (formato numérico colombiano)."""
    if valor is None or str(valor).strip() == "":
        return float("nan")
    return float(str(valor).strip().replace(".", "").replace(",", "."))


def numero_mensual(valor):
    try:
        numero = num_es(valor)
    except (ValueError, TypeError):
        return float("nan")
    return numero if math.isfinite(numero) else float("nan")


def sin_tildes(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def grupo_biologico(b):
    b = sin_tildes(b).lower()
    if "covid" in b:
        return "COVID-19"
    if "papiloma" in b:
        return "VPH (9-17 años)"
    if any(k in b for k in ("influenza", "neumococo")):
        return "Adulto mayor"
    if any(k in b for k in ("pentavalente", "triple viral", "difteria")):
        return "Primera infancia"
    return "Escolar / otros"


def limpiar_sectores(df):
    log = {"filas_originales": len(df)}
    df = df.rename(columns=str.lower).copy()
    for c in df.columns:
        df[c] = df[c].astype(str).str.strip().str.replace(r"\s+", " ", regex=True)
    df["fecha_reporte"] = pd.to_datetime(df["fecha_reporte"], format="%d/%m/%Y", errors="coerce")
    for c in ("dosis_aplicada", "denominador", "cobertura"):
        df[c] = pd.to_numeric(df[c], errors="coerce").replace([float("inf"), -float("inf")], float("nan"))
    # La API publica la cobertura x10 sin separador decimal (708 = 70,8 %).
    df["cobertura_reportada"] = df.pop("cobertura") / 10
    df["cobertura_recalculada"] = (df["dosis_aplicada"] / df["denominador"].where(df["denominador"] > 0) * 100).round(1)
    df["flag_inconsistencia"] = (df["cobertura_reportada"] - df["cobertura_recalculada"]).abs() > 0.1
    df["flag_sobre_100"] = df["cobertura_recalculada"] > 100
    log["filas_cobertura_inconsistente"] = int(df["flag_inconsistencia"].sum())
    log["filas_sobre_100"] = int(df["flag_sobre_100"].sum())

    loc = df.pop("nombre_localidad").str.extract(r"^(\d+)\s*-\s*(.+)$")
    df["cod_localidad"] = pd.to_numeric(loc[0], errors="coerce")
    df["localidad"] = loc[1]
    validas = df["localidad"].isin(ZONAS)
    log["filas_localidad_no_valida"] = int((~validas).sum())  # 'NO ACTUALIZADO' y 'Localidad Desconocida'
    df = df[validas].copy()
    completos = (df["fecha_reporte"].notna() & df["dosis_aplicada"].ge(0) & df["denominador"].gt(0)
                 & ~df["biologico_edad"].str.lower().isin({"", "none", "nan", "<na>"})
                 & ~df["institucion"].str.lower().isin({"", "none", "nan", "<na>"}))
    log["filas_invalidas"] = int((~completos).sum())
    df = df[completos].copy()
    df["zona"] = df["localidad"].map(ZONAS)

    df["institucion"] = df["institucion"].replace({"INTERACIÓN VEJÉZ": "INTEGRACIÓN VEJEZ"}).str.title()
    df = df.rename(columns={"biologico_edad": "biologico"})
    df["grupo_biologico"] = df["biologico"].map(grupo_biologico)
    df["cumple_meta"] = df["cobertura_recalculada"] >= META
    df["brecha_meta"] = (META - df["cobertura_recalculada"]).clip(lower=0).round(1)

    antes = len(df)
    df = df.drop_duplicates(["fecha_reporte", "localidad", "biologico", "institucion"])
    log["duplicados_eliminados"] = antes - len(df)
    log["filas_finales"] = len(df)
    cols = ["fecha_reporte", "cod_localidad", "localidad", "zona", "institucion", "grupo_biologico", "biologico",
            "dosis_aplicada", "denominador", "cobertura_reportada", "cobertura_recalculada", "brecha_meta",
            "cumple_meta", "flag_inconsistencia", "flag_sobre_100"]
    return df[cols].sort_values(["cod_localidad", "institucion", "biologico"]), log


def limpiar_mensual(df):
    log = {"filas_originales": len(df)}
    df = df.rename(columns={"Biologico": "biologico", "Ano": "anio", "Orden mes": "mes_num", "Mes": "mes",
                            "Meta": "poblacion_meta", "Vacunados": "vacunados_mes"})
    df["biologico"] = df["biologico"].str.strip().str.replace(r"\s+", " ", regex=True)
    for c in ("anio", "mes_num"):
        df[c] = pd.to_numeric(df[c], errors="coerce")
    totales = df["mes_num"] == 13
    log["filas_total_eliminadas"] = int(totales.sum())  # la fila 'Total' se recalcula, en 2026 viene errada
    df = df[~totales].copy()
    sin_reporte = df["vacunados_mes"].isna() | df["vacunados_mes"].astype(str).str.strip().eq("")
    for c in ("poblacion_meta", "vacunados_mes"):
        df[c] = df[c].map(numero_mensual)
    validas = (df["anio"].between(1900, 2200) & df["anio"].mod(1).eq(0)
               & df["mes_num"].isin(range(1, 13)) & df["biologico"].fillna("").ne("")
               & df["poblacion_meta"].gt(0) & (sin_reporte | df["vacunados_mes"].ge(0)))
    log["filas_invalidas"] = int((~validas).sum())
    df = df[validas].copy()
    df[["anio", "mes_num"]] = df[["anio", "mes_num"]].astype(int)
    antes = len(df)
    df = df.drop_duplicates(["biologico", "anio", "mes_num"])
    log["duplicados_eliminados"] = antes - len(df)
    log["meses_sin_reporte"] = int(df["vacunados_mes"].isna().sum())
    df = df.drop(columns=["Column7", "Cobertura"])  # acumulado y % se recalculan a partir de los datos base
    df = df.sort_values(["biologico", "anio", "mes_num"])
    df["reportado"] = df["vacunados_mes"].notna()
    df["vacunados_acum"] = df.groupby(["biologico", "anio"])["vacunados_mes"].cumsum()
    df["cobertura_acum"] = (df["vacunados_acum"] / df["poblacion_meta"] * 100).round(1)
    log["filas_finales"] = len(df)
    return df, log


def anual(mensual):
    g = mensual[mensual["reportado"]].groupby(["biologico", "anio"])
    a = g.agg(poblacion_meta=("poblacion_meta", "max"), vacunados=("vacunados_mes", "sum"),
              meses_reportados=("mes_num", "count")).reset_index()
    a["cobertura"] = (a["vacunados"] / a["poblacion_meta"] * 100).round(1)
    a["anio_completo"] = a["meses_reportados"] == 12
    # Para el año en curso se proyecta a 12 meses al ritmo observado.
    a["cobertura_proyectada"] = (a["cobertura"] * 12 / a["meses_reportados"]).round(1)
    a["brecha_meta"] = (META - a["cobertura"]).clip(lower=0).round(1)
    return a


def cobertura(df, por):
    g = df.groupby(por)[["dosis_aplicada", "denominador"]].sum().reset_index()
    g["cobertura"] = (g["dosis_aplicada"] / g["denominador"] * 100).round(1)
    return g


def dosis_adicionales(dosis, denominador, meta=META):
    """Dosis enteras necesarias para alcanzar la meta con el denominador observado."""
    if not all(math.isfinite(valor) for valor in (dosis, denominador, meta)):
        return None
    if dosis < 0 or denominador <= 0 or not 0 < meta <= 100:
        return None
    return max(0, math.ceil(meta * denominador / 100) - dosis)


def calcular_kpis(sec, anu):
    sec = sec[sec["fecha_reporte"] == sec["fecha_reporte"].max()]
    infancia = sec[sec["grupo_biologico"] == "Primera infancia"]
    por_loc = cobertura(infancia, ["localidad", "zona"]).sort_values("cobertura")
    cerrados = anu[anu["anio_completo"]]
    ult = cerrados["anio"].max()
    tv1 = cerrados[(cerrados["biologico"] == "Triple viral 1 año") & (cerrados["anio"] == ult)]["cobertura"].iloc[0]
    tv5 = cerrados[(cerrados["biologico"].str.startswith("Triple viral R1 o DPT")) & (cerrados["anio"] == ult)]["cobertura"].iloc[0]
    validos = sec["denominador"] > 0
    return {
        "fecha_corte_sectores": sec["fecha_reporte"].max().strftime("%Y-%m-%d"),
        "ultimo_anio_cerrado": int(ult),
        "cobertura_global_sectores": round(sec["dosis_aplicada"].sum() / sec["denominador"].sum() * 100, 1),
        "cobertura_primera_infancia_sectores": round(infancia["dosis_aplicada"].sum() / infancia["denominador"].sum() * 100, 1),
        "pct_registros_cumplen_meta": round(sec.loc[validos, "cumple_meta"].mean() * 100, 1),
        "localidades_bajo_meta_infancia": int((por_loc["cobertura"] < META).sum()),
        "localidad_menor_cobertura": por_loc.iloc[0]["localidad"],
        "localidad_menor_cobertura_valor": float(por_loc.iloc[0]["cobertura"]),
        "tv_1anio_ult": float(tv1),
        "tv_5anios_ult": float(tv5),
        "caida_esquema_1a5": round(float(tv1 - tv5), 1),
        "biologicos_cumplen_meta_ult": int((cerrados[cerrados["anio"] == ult]["cobertura"] >= META).sum()),
        "biologicos_total_ult": int((cerrados["anio"] == ult).sum()),
        "dosis_faltantes_meta_infancia": dosis_adicionales(float(infancia["dosis_aplicada"].sum()), float(infancia["denominador"].sum())),
    }


def construir_dashboard(sec, anu, mens, kpis, logs, *, destino=None, auditoria=()):
    anio_actual = int(anu["anio"].max())
    dimensiones = ["fecha_reporte", "localidad", "zona", "institucion", "grupo_biologico", "biologico"]
    medidas = ["dosis_aplicada", "denominador"]
    sectoriales = sec.loc[sec["denominador"].gt(0) & sec["dosis_aplicada"].ge(0), dimensiones + medidas].copy()
    sectoriales["fecha_reporte"] = sectoriales["fecha_reporte"].dt.strftime("%Y-%m-%d")
    columnas_mensuales = ["anio", "biologico", "mes_num", "vacunados_acum", "poblacion_meta", "cobertura_acum"]
    mensual = mens.loc[mens["poblacion_meta"].gt(0), columnas_mensuales].dropna()
    datos = {
        "kpis": kpis,
        "meta": META,
        "limites_localidades": limites_localidades(),
        "generado": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "logs": logs,
        "auditoria": auditoria,
        "anual": anu.to_dict("records"),
        "mensual_actual": mens[mens["anio"] == anio_actual][["biologico", "mes_num", "cobertura_acum"]].dropna().to_dict("records"),
        "anio_actual": anio_actual,
        "sectoriales": sectoriales.to_dict("records"),
        "mensual": mensual.to_dict("records"),
        "loc_infancia": cobertura(sec[sec["grupo_biologico"] == "Primera infancia"], ["localidad", "zona"])
            .sort_values("cobertura").to_dict("records"),
        "institucion": cobertura(sec, ["institucion"]).sort_values("cobertura").to_dict("records"),
        "grupo": cobertura(sec, ["grupo_biologico"]).sort_values("cobertura").to_dict("records"),
        "zona": cobertura(sec, ["zona"]).sort_values("cobertura").to_dict("records"),
        "heat": cobertura(sec, ["localidad", "institucion"]).to_dict("records"),
    }
    plantilla = (RECURSOS / "dashboard_template.html").read_text(encoding="utf-8")
    decisiones = (RECURSOS / "decisiones.js").read_text(encoding="utf-8")
    frontend = RECURSOS / "frontend"
    html = (plantilla.replace("/*__CHARTJS__*/", (RECURSOS / "chart.umd.min.js").read_text(encoding="utf-8"))
            .replace("/*__DECISIONES__*/", decisiones)
            .replace("/*__ESTILOS__*/", (frontend / "dashboard.css").read_text(encoding="utf-8"))
            .replace("/*__NAVEGACION__*/", (frontend / "navigation.js").read_text(encoding="utf-8"))
            .replace("/*__DATOS__*/null", json.dumps(datos, ensure_ascii=False, default=str).replace("<", "\\u003c")))
    escribir_texto((destino or OUT) / "dashboard.html", html)


def escribir_texto(path, contenido):
    with NamedTemporaryFile("w", dir=path.parent, suffix=".tmp", encoding="utf-8", delete=False) as file:
        temp_path = Path(file.name)
        try:
            file.write(contenido)
            file.close()
            temp_path.replace(path)
        finally:
            temp_path.unlink(missing_ok=True)


def guardar_salidas(destino, raw_sec, raw_men, sec, mens, anu, kpis, logs, auditoria):
    raw_sec.to_csv(destino / "crudo_sectores.csv", index=False, encoding="utf-8-sig")
    raw_men.to_csv(destino / "crudo_mensual.csv", index=False, encoding="utf-8-sig")
    dim_loc = pd.DataFrame([{"localidad": l, "zona": z} for l, z in ZONAS.items()])
    with pd.ExcelWriter(destino / "base_consolidada.xlsx") as xw:
        sec.to_excel(xw, sheet_name="HECHOS_SECTORES", index=False)
        mens.to_excel(xw, sheet_name="HECHOS_MENSUAL", index=False)
        anu.to_excel(xw, sheet_name="COBERTURA_ANUAL", index=False)
        dim_loc.to_excel(xw, sheet_name="DIM_LOCALIDAD", index=False)
        sec[["grupo_biologico", "biologico"]].drop_duplicates().to_excel(xw, sheet_name="DIM_BIOLOGICO", index=False)
        pd.DataFrame(kpis.items(), columns=["kpi", "valor"]).to_excel(xw, sheet_name="KPI", index=False)
        pd.DataFrame([(f, k, v) for f, d in logs.items() for k, v in d.items()],
                     columns=["fuente", "paso", "valor"]).to_excel(xw, sheet_name="LOG_LIMPIEZA", index=False)
    sec.to_csv(destino / "hechos_sectores.csv", index=False, encoding="utf-8-sig")
    anu.to_csv(destino / "cobertura_anual.csv", index=False, encoding="utf-8-sig")
    escribir_texto(destino / "kpis.json", json.dumps({"kpis": kpis, "limpieza": logs}, ensure_ascii=False, indent=2))
    construir_dashboard(sec, anu, mens, kpis, logs, destino=destino, auditoria=auditoria)


def historial_auditoria():
    try:
        valor = json.loads((OUT / "auditoria.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []
    return valor[-29:] if isinstance(valor, list) else []


def ahora():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def publicar_salidas(destino):
    archivos = sorted(destino.iterdir(), key=lambda archivo: archivo.name == "dashboard.html")
    respaldo = destino / "respaldo"
    respaldo.mkdir()
    for archivo in archivos:
        anterior = OUT / archivo.name
        if anterior.is_file():
            shutil.copy2(anterior, respaldo / archivo.name)
    reemplazados = []
    try:
        for archivo in archivos:
            objetivo = OUT / archivo.name
            archivo.replace(objetivo)
            reemplazados.append(objetivo)
    except OSError:
        for objetivo in reversed(reemplazados):
            anterior = respaldo / objetivo.name
            if anterior.is_file():
                anterior.replace(objetivo)
            else:
                objetivo.unlink(missing_ok=True)
        raise


def main():
    OUT.mkdir(exist_ok=True)
    historial = historial_auditoria()
    ejecucion = {"inicio": ahora(), "estado": "En curso", "fase": "Descarga sectorial", "fuentes": {}}
    fuentes = ejecucion["fuentes"]
    print("Consultando API de Datos Abiertos Bogotá...")
    try:
        raw_sec = consultar_api(RES_SECTORES)
        fuentes["sectores"] = {"recurso": RES_SECTORES, "originales": len(raw_sec)}
        ejecucion["fase"] = "Descarga mensual"
        raw_men = consultar_api(RES_MENSUAL)
        fuentes["mensual"] = {"recurso": RES_MENSUAL, "originales": len(raw_men)}
        ejecucion["fase"] = "Validación y transformación"
        sec, log_sec = limpiar_sectores(raw_sec)
        mens, log_men = limpiar_mensual(raw_men)
        if sec.empty or not mens["reportado"].any():
            raise ValueError("Una fuente quedó sin registros utilizables.")
        anu = anual(mens)
        kpis = calcular_kpis(sec, anu)
        logs = {"sectores": log_sec, "mensual": log_men}
        ultimo = mens.loc[mens["reportado"], ["anio", "mes_num"]].sort_values(["anio", "mes_num"]).iloc[-1]
        fuentes["sectores"].update(corte=kpis["fecha_corte_sectores"], aceptados=len(sec),
                                  descartados=len(raw_sec)-len(sec),
                                  observados=int((sec["flag_sobre_100"] | sec["flag_inconsistencia"]).sum()))
        fuentes["mensual"].update(corte=f"{ultimo.anio:04d}-{ultimo.mes_num:02d}", aceptados=len(mens),
                                 descartados=len(raw_men)-len(mens), observados=log_men["meses_sin_reporte"])
        ejecucion["fase"] = "Publicación"
        with TemporaryDirectory(dir=OUT) as temporal:
            destino = Path(temporal)
            publicado = {**ejecucion, "fin": ahora(), "estado": "Correcta", "fase": "Completa"}
            guardar_salidas(destino, raw_sec, raw_men, sec, mens, anu, kpis, logs, [*historial, publicado])
            escribir_texto(destino / "auditoria.json", json.dumps([*historial, publicado], ensure_ascii=False, indent=2))
            publicar_salidas(destino)
    except Exception as error:
        historial.append({**ejecucion, "fin": ahora(), "estado": "Fallida", "detalle": str(error)})
        try:
            escribir_texto(OUT / "auditoria.json", json.dumps(historial, ensure_ascii=False, indent=2))
        except OSError as error_escritura:
            print(f"No se pudo guardar la auditoría: {error_escritura}", file=sys.stderr)
        raise
    print(json.dumps(kpis, ensure_ascii=False, indent=2))
    print(f"Listo. Archivos en {OUT}")


if __name__ == "__main__":
    main()
