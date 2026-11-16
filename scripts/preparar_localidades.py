"""Convierte los anillos oficiales de Bogotá en un recurso compacto para el tablero."""
import argparse
import json
from pathlib import Path


def simplificar(puntos, tolerancia=0.00012):
    """Douglas-Peucker sobre un tramo del anillo para su representación en pantalla."""
    if len(puntos) <= 2:
        return puntos
    x0, y0 = puntos[0]
    x1, y1 = puntos[-1]
    dx, dy = x1 - x0, y1 - y0
    largo = dx * dx + dy * dy
    mayor = tolerancia * tolerancia
    corte = None
    for i, (x, y) in enumerate(puntos[1:-1], 1):
        t = min(1, max(0, ((x-x0)*dx + (y-y0)*dy) / largo)) if largo else 0
        distancia = (x-x0-t*dx)**2 + (y-y0-t*dy)**2
        if distancia > mayor:
            corte, mayor = i, distancia
    if corte is None:
        return [puntos[0], puntos[-1]]
    return simplificar(puntos[:corte+1], tolerancia)[:-1] + simplificar(puntos[corte:], tolerancia)


def preparar(origen):
    datos = json.loads(origen.read_text(encoding="utf-8-sig"))
    zonas = {}
    for feature in datos["features"]:
        codigo = str(feature["attributes"]["LocCodigo"]).zfill(2)
        if codigo in zonas:
            raise ValueError(f"Código de localidad duplicado: {codigo}")
        anillos = []
        for anillo in feature["geometry"]["rings"]:
            compacto = [tuple(round(value, 5) for value in punto) for punto in simplificar(anillo)]
            if len(set(compacto)) >= 3:
                anillos.append(compacto)
        if not anillos or any(not (-75 < x < -73 and 3 < y < 6) for r in anillos for x, y in r):
            raise ValueError(f"Geometría no válida para la localidad {codigo}")
        zonas[codigo] = anillos
    if set(zonas) != {f"{codigo:02}" for codigo in range(1, 21)}:
        raise ValueError("La capa debe contener las 20 localidades y sus códigos oficiales.")
    return zonas


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("origen", type=Path)
    parser.add_argument("destino", type=Path)
    args = parser.parse_args()
    args.destino.write_text(json.dumps(preparar(args.origen), separators=(",", ":")) + "\n", encoding="utf-8")
