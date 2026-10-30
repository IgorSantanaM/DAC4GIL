import { useMemo } from "react";
import {
  BarElement, CategoryScale, Chart, Legend, LinearScale, LineElement, PointElement, Tooltip,
  type ChartOptions,
} from "chart.js";

Chart.register(BarElement, CategoryScale, Legend, LinearScale, LineElement, PointElement, Tooltip);
Chart.defaults.font.family = "Inter, system-ui, sans-serif";

export interface Cores {
  textoSecundario: string; textoPrimario: string; grade: string; superficie: string; borda: string;
  s1: string; s2: string; s3: string; s4: string; neutro: string;
}

/** Lê as variáveis CSS do tema atual; recalcula quando `escuro` muda. */
export function useCores(escuro: boolean): Cores {
  return useMemo(() => {
    const estilo = getComputedStyle(document.documentElement);
    const v = (n: string) => estilo.getPropertyValue(n).trim();
    return {
      textoSecundario: v("--text-secondary"), textoPrimario: v("--text-primary"), grade: v("--grid"),
      superficie: v("--surface-1"), borda: v("--border"),
      s1: v("--series-1"), s2: v("--series-2"), s3: v("--series-3"), s4: v("--series-4"), neutro: v("--neutral"),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escuro]);
}

export function comAlfa(hex: string, alfa: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${alfa})`;
}

const FONTE = { family: "Inter", size: 12 };

/** Blocos comuns de opções; cada gráfico mistura o que precisa por cima. */
export function blocosBase(c: Cores) {
  return {
    legenda: {
      labels: { color: c.textoSecundario, boxWidth: 10, boxHeight: 10, usePointStyle: true, pointStyle: "circle" as const, font: FONTE },
    },
    tooltip: {
      backgroundColor: c.superficie, titleColor: c.textoPrimario, bodyColor: c.textoSecundario,
      borderColor: c.borda, borderWidth: 1, padding: 10, boxPadding: 4, usePointStyle: true,
      titleFont: { family: "Inter", weight: 600 }, bodyFont: { family: "Inter" },
    },
    eixoX: { grid: { display: false }, border: { color: c.grade }, ticks: { color: c.textoSecundario, font: FONTE } },
    eixoY: { grid: { color: c.grade }, border: { display: false }, ticks: { color: c.textoSecundario, font: FONTE } },
  };
}

export function opcoesBase<T extends "line" | "bar">(c: Cores, extra: Record<string, unknown> = {}): ChartOptions<T> {
  const b = blocosBase(c);
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 250 },
    interaction: { mode: "index", intersect: false },
    plugins: { legend: b.legenda, tooltip: b.tooltip },
    scales: { x: b.eixoX, y: b.eixoY },
    ...extra,
  } as unknown as ChartOptions<T>;
}

export const fmtTooltipPct = (v: number | null) =>
  v == null ? "não registrado" : v.toFixed(1).replace(".", ",") + "%";
