import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import { anoFechado, serieAnual, type Filtros, type PontoSerie } from "../../dominio/analise";
import { abandonoRegistrado, anosSemAbandono } from "../../dominio/metodologia";
import type { RepositorioMatriculas } from "../../dominio/repositorio";
import type { ChaveAgregado } from "../../dominio/matricula";
import { blocosBase, fmtTooltipPct, opcoesBase, useCores } from "./base";

interface Props { repo: RepositorioMatriculas; filtros: Filtros; escuro: boolean }

/** Valor em % só para anos fechados e (no abandono) com registro na fonte. */
export function taxaOuNada(repo: RepositorioMatriculas, s: PontoSerie | undefined, chave: ChaveAgregado): number | null {
  if (!s || !anoFechado(s) || s[chave] == null) return null;
  if (chave === "taxaAbandono" && !abandonoRegistrado(repo, s.ano)) return null;
  return +((s[chave] as number) * 100).toFixed(2);
}

export function useSerie(repo: RepositorioMatriculas, filtros: Filtros) {
  return useMemo(() => serieAnual(repo, filtros.municipio, filtros.escola), [repo, filtros.municipio, filtros.escola]);
}

export const sufixoPct = { callback: (v: string | number) => v + "%" };

export function GraficoAprovacao({ repo, filtros, escuro }: Props) {
  const c = useCores(escuro);
  const serie = useSerie(repo, filtros);
  const serieTaxa = useMemo(() => serie.filter(anoFechado), [serie]);
  const rotulo = filtros.municipio || "Mato Grosso do Sul";
  const semAband = anosSemAbandono(repo);

  const { data, options } = useMemo(() => {
    const linha = (label: string, dados: (number | null)[], cor: string, extra = {}) => ({
      label, data: dados, borderColor: cor, backgroundColor: cor, borderWidth: 2, tension: 0, spanGaps: true,
      pointRadius: serieTaxa.map((s) => (s.ano === filtros.ano ? 6 : 4)), pointHoverRadius: 7,
      pointBorderColor: c.superficie, pointBorderWidth: 2, ...extra,
    });
    const datasets = [linha(rotulo, serieTaxa.map((s) => taxaOuNada(repo, s, "taxaAprovacao")), c.s1)];
    if (filtros.municipio) {
      const ref = new Map(serieAnual(repo, "", "").map((s) => [s.ano, s]));
      datasets.push(linha("Média estadual", serieTaxa.map((s) => taxaOuNada(repo, ref.get(s.ano), "taxaAprovacao")), c.neutro, { borderDash: [5, 4], pointRadius: 3 }));
    }
    const valores = datasets.flatMap((d) => d.data).filter((v): v is number => v != null);
    const b = blocosBase(c);
    return {
      data: { labels: serieTaxa.map((s) => String(s.ano)), datasets },
      options: opcoesBase<"line">(c, {
        plugins: {
          legend: { ...b.legenda, display: datasets.length > 1 },
          tooltip: { ...b.tooltip, callbacks: { label: (x: { dataset: { label?: string }; raw: unknown }) => ` ${x.dataset.label}: ${fmtTooltipPct(x.raw as number | null)}` } },
        },
        scales: {
          x: b.eixoX,
          y: { ...b.eixoY, suggestedMin: Math.max(0, Math.floor(Math.min(...valores, 100) - 5)), suggestedMax: 100, ticks: { ...b.eixoY.ticks, ...sufixoPct } },
        },
      }),
    };
  }, [repo, serieTaxa, filtros.municipio, filtros.ano, rotulo, c]);

  return (
    <article className="cartao cartao-largo">
      <header>
        <h2>Evolução da taxa de aprovação</h2>
        <p className="sub">
          {rotulo}{filtros.escola ? ` · escolas com “${filtros.escola}”` : ""} · aprovados ÷ (aprovados + reprovados + abandono)
          {semAband.length ? `. A partir de ${semAband[0]} o abandono não é registrado, o que infla a taxa — parte do salto ${semAband[0] - 1}→${semAband[0]} é efeito disso.` : ""}
        </p>
      </header>
      <div className="grafico"><Line data={data} options={options} aria-label="Gráfico de linha da taxa de aprovação por ano" role="img" /></div>
    </article>
  );
}
