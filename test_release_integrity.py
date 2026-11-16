"""Pruebas offline del contrato de ensamblado del dashboard y empaquetado Windows.

Estas comprobaciones NO sustituyen la apertura manual de VacunaBI.exe.
"""
from pathlib import Path
import unittest

ROOT = Path(__file__).parent
COMPONENTS = (
    "frontend/data.js",
    "frontend/tables.js",
    "frontend/stages.js",
)
ASSETS = (
    "dashboard_template.html",
    "chart.umd.min.js",
    "decisiones.js",
    "localidades.json",
    "frontend/dashboard.css",
    "frontend/navigation.js",
    "frontend/charts.js",
    "frontend/dashboard.js",
    *COMPONENTS,
)
PLACEHOLDERS = (
    "/*__CHARTJS__*/",
    "/*__DECISIONES__*/",
    "/*__ESTILOS__*/",
    "/*__COMPONENTES__*/",
    "/*__NAVEGACION__*/",
    "/*__GRAFICOS__*/",
    "/*__DASHBOARD__*/",
)


class TestReleaseIntegrity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.template = (ROOT / "dashboard_template.html").read_text(encoding="utf-8")
        cls.etl = (ROOT / "etl.py").read_text(encoding="utf-8")
        cls.windows = (ROOT / ".github/workflows/windows.yml").read_text(encoding="utf-8")
        cls.navigation = (ROOT / "frontend/navigation.js").read_text(encoding="utf-8")

    def test_recursos_locales_existen_y_no_estan_vacios(self):
        for relative in ASSETS:
            with self.subTest(recurso=relative):
                path = ROOT / relative
                self.assertTrue(path.is_file(), f"Falta {relative}")
                self.assertGreater(path.stat().st_size, 0, f"Está vacío: {relative}")

    def test_etl_resuelve_los_marcadores_del_html_autonomo(self):
        for marker in PLACEHOLDERS:
            with self.subTest(marcador=marker):
                self.assertIn(marker, self.template)
                self.assertIn(marker, self.etl)
        charts = (ROOT / "frontend/charts.js").read_text(encoding="utf-8")
        self.assertIn("/*__DATOS__*/null", charts)
        self.assertIn("/*__DATOS__*/null", self.etl)
        for filename in ("charts.js", "dashboard.js"):
            self.assertIn(filename, self.etl)
        for component in COMPONENTS:
            self.assertIn('"' + Path(component).name + '"', self.etl)

    def test_empaquetado_incluye_todos_los_recursos(self):
        for asset in ("dashboard_template.html", "chart.umd.min.js",
                      "decisiones.js", "localidades.json", "frontend"):
            with self.subTest(recurso=asset):
                self.assertIn('--add-data "' + asset, self.windows)
        self.assertIn("test_release_integrity", self.windows)

    def test_vistas_tienen_navegacion_y_descripcion(self):
        pages = ("resumen", "localidades", "sectores", "calidad",
                 "decisiones", "metodologia")
        for page in pages:
            with self.subTest(vista=page):
                self.assertIn(f'data-page="{page}"', self.template)
                self.assertIn(f'data-nav="{page}"', self.template)
                self.assertIn(page + ":", self.navigation)
        self.assertIn('id="module-description"', self.template)

    def test_flujo_guiado_conserva_cuatro_etapas(self):
        stages = (ROOT / "frontend/stages.js").read_text(encoding="utf-8")
        for step in range(1, 5):
            with self.subTest(etapa=step):
                self.assertIn(f'data-step="{step}"', self.template)
                self.assertIn(f'data-decision-panel="{step}"', self.template)
        self.assertIn("showStep", stages)
        self.assertIn('id="decision-progress"', self.template)

    def test_modulos_frontend_son_independientes_de_cdn(self):
        self.assertNotIn('<script src="https://', self.template)
        self.assertNotIn('<link href="https://', self.template)


if __name__ == "__main__":
    unittest.main()
