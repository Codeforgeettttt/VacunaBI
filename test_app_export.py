"""Pruebas del guardado de escritorio con un selector de archivos controlado."""
import base64
import importlib.util
import sys
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch


def escritorio():
    spec = importlib.util.spec_from_file_location("app_prueba", Path(__file__).with_name("app.py"))
    module = importlib.util.module_from_spec(spec)
    with patch.dict(sys.modules, {"webview": SimpleNamespace(SAVE_DIALOG=30)}):
        spec.loader.exec_module(module)
    actualizacion = module.Actualizacion()
    actualizacion._ventana = Mock()
    return actualizacion


class TestEscritorio(unittest.TestCase):
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
