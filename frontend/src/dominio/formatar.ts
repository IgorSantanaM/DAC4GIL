const inteiro = new Intl.NumberFormat("pt-BR");

export const fmtInt = (v: number): string => inteiro.format(v);
export const fmtPct = (v: number | null | undefined, casas = 1): string =>
  v == null ? "—" : (v * 100).toFixed(casas).replace(".", ",") + "%";
export const fmtPp = (v: number): string =>
  (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v * 100).toFixed(1).replace(".", ",") + " p.p.";
