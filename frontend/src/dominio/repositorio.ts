import { Matricula, type DadosBrutos } from "./matricula";

export function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export interface FiltroRepositorio {
  municipio?: string;
  ano?: number | null;
  escola?: string;
}

function indexar<K>(mapa: Map<K, Matricula[]>, chave: K, valor: Matricula) {
  const lista = mapa.get(chave);
  if (lista) lista.push(valor); else mapa.set(chave, [valor]);
}

/** Repositório em memória indexado por ano e por município (Map → lista). Imutável do ponto de vista do React: use `clonar`. */
export class RepositorioMatriculas {
  todas: Matricula[] = [];
  porAno = new Map<number, Matricula[]>();
  porMunicipio = new Map<string, Matricula[]>();
  private chaves = new Set<string>();

  /** Adiciona registros novos; retorna quantos entraram (reimportar o mesmo ano não duplica). */
  adicionar(lista: Iterable<Matricula | DadosBrutos>): number {
    let novas = 0;
    for (const bruto of lista) {
      const m = bruto instanceof Matricula ? bruto : new Matricula(bruto);
      if (!m.AnoReferencia || !m.NomeMunicipio || !m.NomeUnidadeEscolar) continue;
      const chave = `${m.AnoReferencia}|${m.NomeMunicipio}|${m.NomeUnidadeEscolar}`;
      if (this.chaves.has(chave)) continue;
      this.chaves.add(chave);
      this.todas.push(m);
      indexar(this.porAno, m.AnoReferencia, m);
      indexar(this.porMunicipio, m.NomeMunicipio, m);
      novas++;
    }
    return novas;
  }

  /** Cópia independente, para o React detectar a mudança de referência. */
  clonar(): RepositorioMatriculas {
    const r = new RepositorioMatriculas();
    r.adicionar(this.todas);
    return r;
  }

  anos(): number[] { return [...this.porAno.keys()].sort((a, b) => a - b); }
  municipios(): string[] { return [...this.porMunicipio.keys()].sort((a, b) => a.localeCompare(b, "pt-BR")); }

  filtrar({ municipio, ano, escola }: FiltroRepositorio = {}): Matricula[] {
    const base = municipio ? this.porMunicipio.get(municipio) ?? []
      : ano ? this.porAno.get(ano) ?? [] : this.todas;
    const termo = normalizar(escola ?? "");
    return base.filter((m) =>
      (!ano || m.AnoReferencia === ano) &&
      (!municipio || m.NomeMunicipio === municipio) &&
      (!termo || normalizar(m.NomeUnidadeEscolar).includes(termo)));
  }
}
