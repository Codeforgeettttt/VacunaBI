"""Pruebas sin red para verificar la estructura UI de VacunaBI.

Uso: python -m unittest -v test_dashboard_template
"""
import re
import unittest
from html.parser import HTMLParser
from pathlib import Path

TEMPLATE = Path(__file__).with_name("dashboard_template.html")
PAGES = {"resumen", "localidades", "sectores", "calidad", "metodologia", "decisiones"}
CHARTS = {"cAnual", "cActual", "cLoc", "cInst", "cGrupo"}
KPIS = {"k1", "k2", "k3", "k4"}


class DashboardParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.canvas_ids = set()
        self.pages = set()
        self.navigation = set()
        self.links = []
        self.languages = []
        self.landmarks = set()

    def handle_starttag(self, tag, attributes):
        props = dict(attributes)
        if "id" in props:
            self.ids.append(props["id"])
            if tag == "canvas":
                self.canvas_ids.add(props["id"])
        if "data-page" in props:
            self.pages.add(props["data-page"])
        if "data-nav" in props:
            self.navigation.add(props["data-nav"])
        if tag == "a":
            self.links.append(props.get("href", ""))
        if tag == "html":
            self.languages.append(props.get("lang"))
        if tag in ("main", "nav", "header"):
            self.landmarks.add(tag)


class TestDashboardV11(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.content = TEMPLATE.read_text(encoding="utf-8")
        cls.document = DashboardParser()
        cls.document.feed(cls.content)

    def test_vistas_y_navegacion_coinciden(self):
        self.assertEqual(self.document.pages, PAGES)
        self.assertEqual(self.document.navigation, PAGES)
        for name in PAGES:
            self.assertIn(f"#{name}", self.document.links)

    def test_conserva_graficos_e_indicadores(self):
        self.assertEqual(self.document.canvas_ids, CHARTS)
        self.assertTrue(KPIS.issubset(self.document.ids))
        self.assertTrue({"heat", "log", "meta-info"}.issubset(self.document.ids))

    def test_no_hay_identificadores_duplicados(self):
        self.assertEqual(len(self.document.ids), len(set(self.document.ids)))

    def test_marcadores_de_inyeccion_etl(self):
        self.assertIn("/*__CHARTJS__*/", self.content)
        self.assertIn("/*__GRAFICOS__*/", self.content)
        self.assertIn("/*__DASHBOARD__*/", self.content)
        charts = (TEMPLATE.parent / "frontend" / "charts.js").read_text(encoding="utf-8")
        self.assertIn("/*__DATOS__*/null", charts)
        self.assertIn("const D =", charts)

    def test_accesibilidad_basica_y_rutas(self):
        self.assertIn("es", self.document.languages)
        self.assertTrue({"main", "nav", "header"}.issubset(self.document.landmarks))
        self.assertIn("#main-content", self.document.links)
        self.assertIn("aria-current", self.content)
        self.assertIn("aria-label", self.content)

    def test_graficos_se_redimensionan_al_cambiar_de_vista(self):
        navigation = (TEMPLATE.parent / "frontend" / "navigation.js").read_text(encoding="utf-8")
        self.assertIn("hashchange", navigation)
        self.assertRegex(navigation, r"chart\.resize\(\)")

    def test_recursos_y_controles_de_experiencia(self):
        self.assertIn("/*__ESTILOS__*/", self.content)
        self.assertIn("/*__NAVEGACION__*/", self.content)
        self.assertTrue({"module-title", "summary-finding", "kGap", "scenario-status", "priority-weights"}.issubset(self.document.ids))

    def test_estados_y_contexto_de_v22(self):
        self.assertIn("/*__COMPONENTES__*/", self.content)
        self.assertTrue({"source-availability", "filter-suggestions", "filters-status"}.issubset(self.document.ids))
        self.assertTrue({"module-description", "period-status", "territory-quality",
                         "decision-progress", "decision-selection", "audit-summary", "export-status"}.issubset(self.document.ids))

    def test_controles_de_exploracion_y_exportacion(self):
        controls = {
            "advanced-filters", "fSource", "fYear", "fLocal", "fBio", "fSector", "fMode", "fCompare",
            "fMonthFrom", "fMonthTo", "fReset", "filters-status", "table-source",
            "table-search", "table-sort", "table-prev", "table-next",
            "selection-table", "export-csv", "export-xlsx", "chart-dialog",
        }
        self.assertTrue(controls.issubset(self.document.ids))

    def test_mapa_y_panel_territorial(self):
        controls = {
            "territory-map", "territory-detail", "territory-legend",
            "territory-compare", "territory-comparison",
            "territory-district", "territory-history", "territory-periods", "territory-export",
        }
        self.assertTrue(controls.issubset(self.document.ids))

    def test_vista_de_auditoria_y_fuentes(self):
        self.assertTrue({"audit-sources", "audit-runs", "log"}.issubset(self.document.ids))

    def test_tema_tablas_de_graficos_y_politica_de_contenido(self):
        self.assertIn("theme-toggle", self.document.ids)
        dashboard = (TEMPLATE.parent / "frontend" / "dashboard.js").read_text(encoding="utf-8")
        self.assertIn("Consultar tabla del gráfico", dashboard)
        self.assertIn("Content-Security-Policy", self.content)


if __name__ == "__main__":
    unittest.main()
