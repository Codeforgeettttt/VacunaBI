"""Aplicación de escritorio (se compila como VacunaBI.exe).

Abre su propia ventana, ejecuta el ETL contra la API y muestra el dashboard dentro de la ventana,
sin navegador. Usa WebView2, que viene incluido en Windows 10/11.
"""
import html
import os
import sys
import traceback
from threading import Lock

if sys.stdout is None:  # en el .exe sin consola no hay stdout y los print() de etl fallarían
    sys.stdout = sys.stderr = open(os.devnull, "w")

import webview

import etl

PANTALLA = """<body style="margin:0;height:100vh;display:grid;place-items:center;background:#0b111b;color:#f0efec;
font:16px system-ui,'Segoe UI',sans-serif;text-align:center"><div>{}</div></body>"""


def abrir_dashboard(ventana, sin_conexion=False):
    url = (etl.OUT / "dashboard.html").resolve().as_uri()
    ventana.load_url(url + ("?sin-conexion=1" if sin_conexion else ""))


class Actualizacion:
    def __init__(self):
        self._lock = Lock()

    def refresh_data(self):
        if not self._lock.acquire(blocking=False):
            return {"ok": False, "message": "Ya hay una consulta en curso."}
        try:
            etl.main()
            return {"ok": True}
        except Exception:
            traceback.print_exc()
            return {"ok": False, "message": "No se completó la actualización. Se conserva el tablero anterior."}
        finally:
            self._lock.release()

    def get_audit(self):
        return etl.historial_auditoria()


def cargar(ventana, actualizacion):
    try:
        result = actualizacion.refresh_data()
        if result["ok"]:
            abrir_dashboard(ventana)
            return
        if (etl.OUT / "dashboard.html").is_file():
            abrir_dashboard(ventana, sin_conexion=True)
            return
        mensaje = result["message"]
    except Exception:
        traceback.print_exc()
        mensaje = "No se pudo abrir el tablero. Vuelve a iniciar VacunaBI."
    ventana.load_html(PANTALLA.format(
        f"<h2>No se pudieron cargar los datos</h2><p>{html.escape(mensaje)}</p>"))


if __name__ == "__main__":
    webview.settings["ALLOW_DOWNLOADS"] = True
    actualizacion = Actualizacion()
    v = webview.create_window("VacunaBI · Cobertura de vacunación", html=PANTALLA.format(
        "<h2>VacunaBI · Bogotá D.C.</h2><p>Consultando la API de Datos Abiertos Bogotá…</p>"),
        width=1280, height=860, min_size=(800, 600), js_api=actualizacion)
    webview.start(cargar, (v, actualizacion))
