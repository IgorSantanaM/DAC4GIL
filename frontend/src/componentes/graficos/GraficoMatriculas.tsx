import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import type { Filtros } from "../../dominio/analise";
import { fmtInt } from "../../dominio/formatar";
import type { RepositorioMatriculas } from "../../dominio/repositorio";
import { blocosBase, comAlfa, opcoesBase, useCores } from "./base";
import { useSerie } from "./GraficoAprovacao";

interface Props { repo: RepositorioMatriculas; filtros: Filtros; escuro: boolean }

export function GraficoMatriculas({ repo, filtros, escuro }: Props) {
  const c = useCores(escuro);
  const serie = useSerie(repo, filtros);

  const { data, options } = useMemo(() => {
    const b = blocosBase(c);
    return {
      data: {
        labels: serie.map((s) => String(s.ano)),
        datasets: [{
          label: "Matrículas", data: serie.map((s) => s.MatriculasTotal),
          backgroundColor: serie.map((s) => (filtros.ano == null || s.ano === filtros.ano ? c.s1 : comAlfa(c.s1, 0.4))),
          borderRadius: { topLeft: 4, topRight: 4 }, borderSkipped: "start" as const, maxBarThickness: 36,
        }],
      },
      options: opcoesBase<"bar">(c, {
        plugins: {
          legend: { display: false },
          tooltip: { ...b.tooltip, callbacks: { label: (x: { raw: unknown }) => ` ${fmtInt(x.raw as number)} matrículas` } },
        },
        scales: { x: b.eixoX, y: { ...b.eixoY, beginAtZero: true, ticks: { ...b.eixoY.ticks, callback: (v: string | number) => fmtInt(Number(v)) } } },
      }),
    };
  }, [serie, filtros.ano, c]);

  return (
    <article className="cartao">
      <header>
        <h2>Matrículas por ano</h2>
        <p className="sub">Total de matrículas registradas</p>
      </header>
      <div className="grafico"><Bar data={data} options={options} aria-label="Gráfico de barras do total de matrículas por ano" role="img" /></div>
    </article>
  );
}
