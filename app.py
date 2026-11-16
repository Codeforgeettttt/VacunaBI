"""Aplicación de escritorio (se compila como VacunaBI.exe).

Abre su propia ventana, ejecuta el ETL contra la API y muestra el dashboard dentro de la ventana,
sin navegador. Usa WebView2, que viene incluido en Windows 10/11.
"""
import base64
import binascii
import html
import os
import re
import sys
import traceback
from pathlib import Path
from tempfile import NamedTemporaryFile
from threading import Lock

if sys.stdout is None:  # en el .exe sin consola no hay stdout y los print() de etl fallarían
    sys.stdout = sys.stderr = open(os.devnull, "w")

import webview

import etl

PANTALLA = """<body style="margin:0;height:100vh;display:grid;place-items:center;background:#0b111b;color:#f0efec;
font:16px system-ui,'Segoe UI',sans-serif;text-align:center"><div>{}</div></body>"""


def abrir_dashboard(ventana):
    ventana.load_url((etl.OUT / "dashboard.html").resolve().as_uri())


class Actualizacion:
    def __init__(self):
        self._lock = Lock()
        self._export_lock = Lock()
        self._ventana = None
        self._copia_local = False
        self._aviso_recarga = False

    def refresh_data(self):
        if not self._lock.acquire(blocking=False):
            return {"ok": False, "message": "Ya hay una consulta en curso."}
        try:
            etl.main()
            self._copia_local = False
            return {"ok": True}
        except Exception:
            traceback.print_exc()
            return {"ok": False, "message": "No se completó la actualización. Se conserva el tablero anterior."}
        finally:
            self._lock.release()

    def get_audit(self):
        return etl.historial_auditoria()

    def usa_copia_local(self):
        return self._copia_local

    def recargar_dashboard(self):
        """Vuelve a abrir el archivo local sin parámetros que WebView2 no resuelve."""
        if self._ventana is None or not (etl.OUT / "dashboard.html").is_file():
            return {"ok": False, "message": "No se encontró el tablero actualizado en el equipo."}
        try:
            self._aviso_recarga = True
            abrir_dashboard(self._ventana)
            return {"ok": True}
        except Exception:
            self._aviso_recarga = False
            traceback.print_exc()
            return {"ok": False, "message": "No se pudo volver a abrir el tablero actualizado."}

    def consumir_aviso_recarga(self):
        """El mensaje de éxito se muestra una sola vez en el HTML recién abierto."""
        aviso = self._aviso_recarga
        self._aviso_recarga = False
        return aviso

    def guardar_exportacion(self, nombre, contenido):
        if not isinstance(nombre, str) or not re.fullmatch(r"VacunaBI-[a-z-]+\.(csv|xlsx)", nombre):
            return {"estado": "error", "mensaje": "Formato de exportación inválido."}
        try:
            datos = base64.b64decode(contenido, validate=True)
        except (TypeError, ValueError, binascii.Error):
            return {"estado": "error", "mensaje": "No se pudo preparar el archivo."}
        if not self._export_lock.acquire(blocking=False):
            return {"estado": "error", "mensaje": "Ya hay una exportación en curso."}
        try:
            seleccion = self._ventana.create_file_dialog(webview.SAVE_DIALOG, save_filename=nombre)
            if not seleccion:
                return {"estado": "cancelada"}
            destino = Path(seleccion[0] if isinstance(seleccion, (list, tuple)) else seleccion)
            with NamedTemporaryFile(dir=destino.parent, delete=False) as archivo:
                temporal = Path(archivo.name)
                try:
                    archivo.write(datos)
                    archivo.close()
                    temporal.replace(destino)
                finally:
                    temporal.unlink(missing_ok=True)
            return {"estado": "guardada", "mensaje": f"Archivo guardado: {destino.name}."}
        except Exception:
            traceback.print_exc()
            return {"estado": "error", "mensaje": "No se pudo guardar el archivo en la ubicación elegida."}
        finally:
            self._export_lock.release()


def cargar(ventana, actualizacion):
    try:
        result = actualizacion.refresh_data()
        if result["ok"]:
            abrir_dashboard(ventana)
            return
        if (etl.OUT / "dashboard.html").is_file():
            actualizacion._copia_local = True
            abrir_dashboard(ventana)
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
    actualizacion._ventana = v
    webview.start(cargar, (v, actualizacion))
