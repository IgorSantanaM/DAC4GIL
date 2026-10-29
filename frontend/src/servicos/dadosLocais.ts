import type { DadosBrutos } from "../dominio/matricula";

interface Pacote { colunas: string[]; linhas: (string | number)[][] }

/** Cópia local dos CSVs oficiais, carregada sob demanda (fora do bundle inicial). */
export async function carregarDadosLocais(): Promise<DadosBrutos[]> {
  const { default: pacote } = (await import("../dados/matriculas.json")) as { default: Pacote };
  return pacote.linhas.map((linha) =>
    Object.fromEntries(pacote.colunas.map((c, i) => [c, linha[i]])) as DadosBrutos);
}
