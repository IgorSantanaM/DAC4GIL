import { useMemo, useState } from "react";
import type { Filtros } from "../dominio/analise";
import { fmtInt, fmtPct } from "../dominio/formatar";
import type { Matricula } from "../dominio/matricula";
import { abandonoRegistrado } from "../dominio/metodologia";
import type { RepositorioMatriculas } from "../dominio/repositorio";

const POR_PAGINA = 25;

interface Ordenacao { col: string; asc: boolean }

const COLUNAS: { col: string; rotulo: string; num: boolean }[] = [
  { col: "NomeUnidadeEscolar", rotulo: "Escola", num: false },
  { col: "NomeMunicipio", rotulo: "Município", num: false },
  { col: "AnoReferencia", rotulo: "Ano", num: true },
  { col: "MatriculasTotal", rotulo: "Matrículas", num: true },
  { col: "Aprovados", rotulo: "Aprovados", num: true },
  { col: "Reprovados", rotulo: "Reprovados", num: true },
  { col: "Abandono", rotulo: "Abandono", num: true },
  { col: "taxaAprovacao", rotulo: "Aprovação", num: true },
  { col: "taxaAbandono", rotulo: "Abandono %", num: true },
];

const valorDe = (m: Matricula, col: string) => (m as unknown as Record<string, string | number | null>)[col];

interface Props {
  repo: RepositorioMatriculas;
  filtros: Filtros;
  pagina: number;
  onPagina: (p: number) => void;
}

export function TabelaEscolas({ repo, filtros, pagina, onPagina }: Props) {
  const [ord, setOrd] = useState<Ordenacao>({ col: "MatriculasTotal", asc: false });

  const linhas = useMemo(() => {
    const lista = repo.filtrar(filtros);
    return lista.sort((a, b) => {
      const va = valorDe(a, ord.col), vb = valorDe(b, ord.col);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      const r = typeof va === "string" ? va.localeCompare(vb as string, "pt-BR") : va - (vb as number);
      return ord.asc ? r : -r;
    });
  }, [repo, filtros, ord]);

  const paginas = Math.max(1, Math.ceil(linhas.length / POR_PAGINA));
  const atual = Math.min(Math.max(1, pagina), paginas);
  const visiveis = linhas.slice((atual - 1) * POR_PAGINA, atual * POR_PAGINA);

  const ordenar = (col: string) =>
    setOrd((o) => ({ col, asc: o.col === col ? !o.asc : col.startsWith("Nome") }));

  function exportarCsv() {
    const cols = ["AnoReferencia", "NomeMunicipio", "NomeUnidadeEscolar", "MatriculasTotal", "MatriculaInicial", "MatriculaAposCenso",
      "Transferidos", "Cancelados", "Falecido", "Abandono", "Aprovados", "Reprovados", "Cursando", "OutrasSituacoes"];
    const q = (v: unknown) => (/[",;\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    const corpo = linhas.map((m) => [
      ...cols.map((c) => q(valorDe(m, c))), m.taxaAprovacao ?? "",
      abandonoRegistrado(repo, m.AnoReferencia) ? m.taxaAbandono ?? "" : "",
    ].join(","));
    const csv = [[...cols, "TaxaAprovacao", "TaxaAbandono"].join(","), ...corpo].join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), {
      href: url, download: `matriculas_ms_${filtros.municipio || "estado"}_${filtros.ano ?? "todos"}.csv`,
    });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="cartao tabela-cartao">
      <header className="cabecalho-com-acoes">
        <div>
          <h2>Unidades escolares</h2>
          <p className="sub">{fmtInt(linhas.length)} registros (escola × ano) no recorte atual</p>
        </div>
        <button id="btn-exportar" className="btn btn-fantasma" type="button" onClick={exportarCsv}>Exportar CSV</button>
      </header>
      <div className="tabela-rolagem">
        <table id="tabela">
          <thead>
            <tr>
              {COLUNAS.map(({ col, rotulo, num }) => {
                const ativo = ord.col === col;
                return (
                  <th key={col} className={[num ? "num" : "", ativo ? "ordenado" : "", ativo && ord.asc ? "asc" : ""].filter(Boolean).join(" ")}
                    onClick={() => ordenar(col)}>{rotulo}</th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visiveis.length ? visiveis.map((m) => (
              <tr key={`${m.AnoReferencia}|${m.NomeMunicipio}|${m.NomeUnidadeEscolar}`}>
                <td>{m.NomeUnidadeEscolar}</td>
                <td>{m.NomeMunicipio}</td>
                <td className="num">{m.AnoReferencia}</td>
                <td className="num">{fmtInt(m.MatriculasTotal)}</td>
                <td className="num">{fmtInt(m.Aprovados)}</td>
                <td className="num">{fmtInt(m.Reprovados)}</td>
                <td className="num">{fmtInt(m.Abandono)}</td>
                <td className="num">{fmtPct(m.taxaAprovacao)}</td>
                <td className="num">{abandonoRegistrado(repo, m.AnoReferencia) ? fmtPct(m.taxaAbandono, 2) : "n/r"}</td>
              </tr>
            )) : (
              <tr><td colSpan={9} className="vazio">Nenhuma escola encontrada com esses filtros.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <nav className="paginacao" aria-label="Paginação">
        <button id="pag-ant" className="btn btn-fantasma" type="button" disabled={atual <= 1} onClick={() => onPagina(atual - 1)}>‹ Anterior</button>
        <span id="pag-info">Página {atual} de {paginas}</span>
        <button id="pag-prox" className="btn btn-fantasma" type="button" disabled={atual >= paginas} onClick={() => onPagina(atual + 1)}>Próxima ›</button>
      </nav>
    </section>
  );
}
