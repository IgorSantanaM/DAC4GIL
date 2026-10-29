import { useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import { calcularRanking, type Filtros } from "../../dominio/analise";
import { fmtInt, fmtPct } from "../../dominio/formatar";
import { abandonoRegistrado } from "../../dominio/metodologia";
import type { RepositorioMatriculas } from "../../dominio/repositorio";
import { blocosBase, opcoesBase, useCores } from "./base";

interface Props { repo: RepositorioMatriculas; filtros: Filtros; escuro: boolean }

const curto = (t: string) => (t.length > 38 ? t.slice(0, 36) + "…" : t);

export function GraficoRanking({ repo, filtros, escuro }: Props) {
  const c = useCores(escuro);
  const [ordem, setOrdem] = useState<"piores" | "melhores">("piores");
  const ranking = useMemo(() => calcularRanking(repo, filtros, ordem), [repo, filtros, ordem]);
  const { ano, itens, totalGrupos } = ranking;

  const { data, options } = useMemo(() => {
    const b = blocosBase(c);
    const minimo = Math.max(0, Math.floor(Math.min(...itens.map((i) => i.taxaAprovacao! * 100), 100) / 10) * 10 - 10);
    return {
      data: {
        labels: itens.map((i) => curto(i.nome)),
        datasets: [{
          label: "Taxa de aprovação", data: itens.map((i) => +(i.taxaAprovacao! * 100).toFixed(2)),
          backgroundColor: c.s1, borderRadius: { topRight: 4, bottomRight: 4 }, borderSkipped: "start" as const, barThickness: 14,
        }],
      },
      options: opcoesBase<"bar">(c, {
        indexAxis: "y",
        interaction: { mode: "nearest", axis: "y", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...b.tooltip,
            callbacks: {
              title: (x: { dataIndex: number }[]) => itens[x[0].dataIndex].nome,
              label: (x: { dataIndex: number }) => {
                const i = itens[x.dataIndex];
                return [
                  ` Aprovação: ${fmtPct(i.taxaAprovacao)}`, ` Reprovação: ${fmtPct(i.taxaReprovacao)}`,
                  ` Abandono: ${ano != null && abandonoRegistrado(repo, ano) ? fmtPct(i.taxaAbandono, 2) : "não registrado"}`,
                  ` Matrículas: ${fmtInt(i.MatriculasTotal)}`,
                ];
              },
            },
          },
        },
        scales: {
          x: { ...b.eixoY, min: minimo, max: 100, ticks: { ...b.eixoY.ticks, callback: (v: string | number) => v + "%" } },
          y: { ...b.eixoX, ticks: { ...b.eixoX.ticks, autoSkip: false } },
        },
      }),
    };
  }, [itens, ano, repo, c]);

  const titulo = filtros.municipio ? `Escolas de ${filtros.municipio} por taxa de aprovação` : "Municípios por taxa de aprovação";
  const sub = ano == null ? "Sem ano fechado disponível."
    : `${ano}${filtros.ano != null && filtros.ano !== ano ? ` (último ano fechado; ${filtros.ano} está em andamento)` : ""} · ${itens.length} de ${totalGrupos} ${filtros.municipio ? "escolas" : "municípios"}`;

  return (
    <article className="cartao cartao-largo">
      <header className="cabecalho-com-acoes">
        <div>
          <h2>{titulo}</h2>
          <p className="sub">{sub}</p>
        </div>
        <div className="segmentado" role="group" aria-label="Ordem do ranking">
          <button type="button" className={ordem === "piores" ? "ativo" : ""} onClick={() => setOrdem("piores")}>Menores taxas</button>
          <button type="button" className={ordem === "melhores" ? "ativo" : ""} onClick={() => setOrdem("melhores")}>Maiores taxas</button>
        </div>
      </header>
      <div className="grafico grafico-ranking" style={{ height: Math.max(160, itens.length * 24 + 40) }}>
        <Bar data={data} options={options} aria-label="Ranking por taxa de aprovação" role="img" />
      </div>
    </article>
  );
}
