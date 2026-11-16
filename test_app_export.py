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
