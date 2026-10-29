import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import type { Filtros, PontoSerie } from "../../dominio/analise";
import { fmtInt } from "../../dominio/formatar";
import type { RepositorioMatriculas } from "../../dominio/repositorio";
import { blocosBase, fmtTooltipPct, opcoesBase, useCores } from "./base";
import { sufixoPct, useSerie } from "./GraficoAprovacao";

interface Props { repo: RepositorioMatriculas; filtros: Filtros; escuro: boolean }

export function GraficoSituacao({ repo, filtros, escuro }: Props) {
  const c = useCores(escuro);
  const serie = useSerie(repo, filtros);

  const { data, options } = useMemo(() => {
    const grupos: [string, (s: PontoSerie) => number, string][] = [
      ["Aprovados", (s) => s.Aprovados, c.s1],
      ["Reprovados", (s) => s.Reprovados, c.s2],
      ["Abandono", (s) => s.Abandono, c.s3],
      ["Cursando", (s) => s.Cursando, c.s4],
      ["Transf./cancel./outros", (s) => s.Transferidos + s.Cancelados + s.Falecido + s.OutrasSituacoes, c.neutro],
    ];
    const totais = serie.map((s) => grupos.reduce((acc, [, f]) => acc + f(s), 0));
    const b = blocosBase(c);
    return {
      data: {
        labels: serie.map((s) => String(s.ano)),
        datasets: grupos.map(([label, f, cor]) => ({
          label, data: serie.map((s, i) => (totais[i] ? +((100 * f(s)) / totais[i]).toFixed(2) : 0)),
          absolutos: serie.map(f), backgroundColor: cor, borderColor: c.superficie, borderWidth: { top: 2 },
          borderSkipped: false as const, maxBarThickness: 56,
        })),
      },
      options: opcoesBase<"bar">(c, {
        plugins: {
          legend: { ...b.legenda, position: "bottom" },
          tooltip: {
            ...b.tooltip,
            callbacks: {
              label: (x: { dataset: { label?: string; absolutos?: number[] }; raw: unknown; dataIndex: number }) =>
                ` ${x.dataset.label}: ${fmtTooltipPct(x.raw as number)} (${fmtInt(x.dataset.absolutos?.[x.dataIndex] ?? 0)})`,
            },
          },
        },
        scales: {
          x: { ...b.eixoX, stacked: true },
          y: { ...b.eixoY, stacked: true, max: 100, ticks: { ...b.eixoY.ticks, ...sufixoPct } },
        },
      }),
    };
  }, [serie, c]);

  return (
    <article className="cartao cartao-largo">
      <header>
        <h2>Situação final dos alunos</h2>
        <p className="sub">Composição das matrículas por ano (%). Anos com muitos alunos “cursando” ainda não foram fechados.</p>
      </header>
      <div className="grafico grafico-alto"><Bar data={data} options={options} aria-label="Gráfico de barras empilhadas da situação final por ano" role="img" /></div>
    </article>
  );
}
