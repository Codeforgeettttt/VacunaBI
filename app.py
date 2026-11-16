"""Aplicación de escritorio (se compila como VacunaBI.exe).

Abre su propia ventana, ejecuta el ETL contra la API y muestra el dashboard dentro de la ventana,
sin navegador. Usa WebView2, que viene incluido en Windows 10/11.
"""
import html
import os
import sys
import traceback

if sys.stdout is None:  # en el .exe sin consola no hay stdout y los print() de etl fallarían
    sys.stdout = sys.stderr = open(os.devnull, "w")

import webview

import etl

PANTALLA = """<body style="margin:0;height:100vh;display:grid;place-items:center;background:#0b111b;color:#f0efec;
font:16px system-ui,'Segoe UI',sans-serif;text-align:center"><div>{}</div></body>"""


def cargar(ventana):
    try:
        etl.main()
        ventana.load_url((etl.OUT / "dashboard.html").resolve().as_uri())
    except Exception as e:
        traceback.print_exc()
        ventana.load_html(PANTALLA.format(
            "<h2>No se pudieron cargar los datos</h2><p>Revise la conexión a internet: el programa consulta la API "
            f"de Datos Abiertos Bogotá.</p><p style='color:#898781;font-size:13px'>{html.escape(str(e))}</p>"))


if __name__ == "__main__":
    v = webview.create_window("VacunaBI · Cobertura de vacunación", html=PANTALLA.format(
        "<h2>VacunaBI · Bogotá D.C.</h2><p>Consultando la API de Datos Abiertos Bogotá…</p>"),
        width=1280, height=860, min_size=(800, 600))
    webview.start(cargar, v)
