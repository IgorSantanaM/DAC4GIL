"""Converte os CSVs do portal dados.ms.gov.br em data/matriculas.js (fallback offline do dashboard).

Uso: python3 scripts/gerar_dados.py ../dados/csv
"""
import csv
import glob
import json
import os
import sys

COLUNAS = [
    "AnoReferencia", "NomeMunicipio", "NomeUnidadeEscolar", "MatriculasTotal",
    "MatriculaInicial", "MatriculaAposCenso", "Transferidos", "Cancelados", "Falecido",
    "Abandono", "Aprovados", "Reprovados", "Cursando", "OutrasSituacoes",
]
TEXTO = {"NomeMunicipio", "NomeUnidadeEscolar"}


def main(pasta):
    linhas = []
    for arquivo in sorted(glob.glob(os.path.join(pasta, "*.csv"))):
        with open(arquivo, encoding="utf-8-sig", newline="") as f:
            for r in csv.DictReader(f):
                linhas.append([r[c].strip() if c in TEXTO else int(r[c] or 0) for c in COLUNAS])
    saida = os.path.join(os.path.dirname(__file__), "..", "data", "matriculas.js")
    with open(saida, "w", encoding="utf-8") as f:
        f.write("// Gerado por scripts/gerar_dados.py — fonte: dados.ms.gov.br/dataset/matriculas-por-unidade-escolar\n")
        f.write("window.MATRICULAS_MS = ")
        json.dump({"colunas": COLUNAS, "linhas": linhas}, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
    print(f"{len(linhas)} registros -> {os.path.normpath(saida)}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "..", "dados", "csv"))
