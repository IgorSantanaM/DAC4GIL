/** Modelo de matrícula (espelha DAC4GIL.Domain.Matriculas.Matricula) e agregação de taxas. */

export const CAMPOS_NUMERICOS = [
  "AnoReferencia", "MatriculasTotal", "MatriculaInicial", "MatriculaAposCenso", "Transferidos",
  "Cancelados", "Falecido", "Abandono", "Aprovados", "Reprovados", "Cursando", "OutrasSituacoes",
] as const;
export const CAMPOS_TEXTO = ["NomeMunicipio", "NomeUnidadeEscolar"] as const;
export const TODOS_CAMPOS = [CAMPOS_NUMERICOS[0], ...CAMPOS_TEXTO, ...CAMPOS_NUMERICOS.slice(1)] as const;

export type CampoNumerico = (typeof CAMPOS_NUMERICOS)[number];
export type CampoTexto = (typeof CAMPOS_TEXTO)[number];
export type CampoMatricula = CampoNumerico | CampoTexto;
export type DadosBrutos = Partial<Record<CampoMatricula, unknown>>;

export function taxa(parte: number, total: number): number | null {
  return total > 0 ? parte / total : null;
}

export class Matricula {
  AnoReferencia = 0; MatriculasTotal = 0; MatriculaInicial = 0; MatriculaAposCenso = 0;
  Transferidos = 0; Cancelados = 0; Falecido = 0; Abandono = 0; Aprovados = 0;
  Reprovados = 0; Cursando = 0; OutrasSituacoes = 0;
  NomeMunicipio = ""; NomeUnidadeEscolar = "";

  constructor(dados: DadosBrutos) {
    for (const c of CAMPOS_TEXTO) this[c] = String(dados[c] ?? "").trim();
    for (const c of CAMPOS_NUMERICOS) this[c] = Number(dados[c]) || 0;
  }

  /** Alunos com situação final definida (base das taxas de rendimento do INEP). */
  get situacoesFinais(): number { return this.Aprovados + this.Reprovados + this.Abandono; }
  get taxaAprovacao(): number | null { return taxa(this.Aprovados, this.situacoesFinais); }
  get taxaAbandono(): number | null { return taxa(this.Abandono, this.situacoesFinais); }
  get taxaReprovacao(): number | null { return taxa(this.Reprovados, this.situacoesFinais); }
}

type SomaNumerica = Record<Exclude<CampoNumerico, "AnoReferencia">, number>;

export interface Agregado extends SomaNumerica {
  escolas: number;
  situacoesFinais: number;
  taxaAprovacao: number | null;
  taxaReprovacao: number | null;
  taxaAbandono: number | null;
  /** Base que existe em todos os anos (o abandono deixou de ser registrado a partir de 2019). */
  taxaAprovacaoComparavel: number | null;
  /** Parcela das matrículas com ano letivo encerrado — 2024 e 2026 vieram quase todas "cursando". */
  cobertura: number | null;
}

export type ChaveAgregado = { [K in keyof Agregado]: Agregado[K] extends number | null ? K : never }[keyof Agregado];

/** Soma um conjunto de matrículas em um único agregado com as mesmas taxas. */
export function agregar(lista: Iterable<Matricula>): Agregado {
  const soma = Object.fromEntries(
    CAMPOS_NUMERICOS.filter((c) => c !== "AnoReferencia").map((c) => [c, 0]),
  ) as SomaNumerica;
  const escolas = new Set<string>();
  for (const m of lista) {
    for (const c of CAMPOS_NUMERICOS) if (c !== "AnoReferencia") soma[c] += m[c];
    escolas.add(`${m.NomeMunicipio}|${m.NomeUnidadeEscolar}`);
  }
  const finais = soma.Aprovados + soma.Reprovados + soma.Abandono;
  return {
    ...soma,
    escolas: escolas.size,
    situacoesFinais: finais,
    taxaAprovacao: taxa(soma.Aprovados, finais),
    taxaReprovacao: taxa(soma.Reprovados, finais),
    taxaAbandono: taxa(soma.Abandono, finais),
    taxaAprovacaoComparavel: taxa(soma.Aprovados, soma.Aprovados + soma.Reprovados),
    cobertura: taxa(finais, finais + soma.Cursando),
  };
}
