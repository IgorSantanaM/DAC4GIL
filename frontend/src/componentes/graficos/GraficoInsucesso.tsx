import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import { anoFechado, type Filtros } from "../../dominio/analise";
import type { RepositorioMatriculas } from "../../dominio/repositorio";
import { blocosBase, fmtTooltipPct, opcoesBase, useCores } from "./base";
import { sufixoPct, taxaOuNada, useSerie } from "./GraficoAprovacao";

interface Props { repo: RepositorioMatriculas; filtros: Filtros; escuro: boolean }

export function GraficoInsucesso({ repo, filtros, escuro }: Props) {
  const c = useCores(escuro);
  const serie = useSerie(repo, filtros);

  const { data, options } = useMemo(() => {
    const serieTaxa = serie.filter(anoFechado);
    const linha = (label: string, dados: (number | null)[], cor: string) => ({
      label, data: dados, borderColor: cor, backgroundColor: cor, borderWidth: 2, tension: 0, spanGaps: true,
      pointRadius: serieTaxa.map((s) => (s.ano === filtros.ano ? 6 : 4)), pointHoverRadius: 7,
      pointBorderColor: c.superficie, pointBorderWidth: 2,
    });
    const b = blocosBase(c);
    return {
      data: {
        labels: serieTaxa.map((s) => String(s.ano)),
        datasets: [
          linha("Reprovação", serieTaxa.map((s) => taxaOuNada(repo, s, "taxaReprovacao")), c.s2),
          linha("Abandono", serieTaxa.map((s) => taxaOuNada(repo, s, "taxaAbandono")), c.s3),
        ],
      },
      options: opcoesBase<"line">(c, {
        plugins: {
          legend: b.legenda,
          tooltip: { ...b.tooltip, callbacks: { label: (x: { dataset: { label?: string }; raw: unknown }) => ` ${x.dataset.label}: ${fmtTooltipPct(x.raw as number | null)}` } },
        },
        scales: { x: b.eixoX, y: { ...b.eixoY, beginAtZero: true, ticks: { ...b.eixoY.ticks, ...sufixoPct } } },
      }),
    };
  }, [repo, serie, filtros.ano, c]);

  return (
    <article className="cartao">
      <header>
        <h2>Reprovação e abandono</h2>
        <p className="sub">% das situações finais por ano</p>
      </header>
      <div className="grafico"><Line data={data} options={options} aria-label="Gráfico de linha das taxas de reprovação e abandono por ano" role="img" /></div>
    </article>
  );
}
