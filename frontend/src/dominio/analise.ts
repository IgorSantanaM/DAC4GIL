/** Cálculos do painel (resumo, KPIs, série anual e ranking) sem nenhuma dependência de UI. */
import { agregar, type Agregado, type ChaveAgregado, type Matricula } from "./matricula";
import { abandonoRegistrado, anosCompletos, anosSemAbandono, COBERTURA_MINIMA } from "./metodologia";
import type { RepositorioMatriculas } from "./repositorio";
import { fmtInt, fmtPct, fmtPp } from "./formatar";

export interface Filtros {
  municipio: string;
  ano: number | null; // null = todos os anos
  escola: string;
}

export type PontoSerie = Agregado & { ano: number };

/** Série anual (todas as escolas do recorte) — o filtro de ano só destaca o ponto. */
export function serieAnual(repo: RepositorioMatriculas, municipio: string, escola: string): PontoSerie[] {
  const base = repo.filtrar({ municipio, escola });
  const porAno = new Map<number, Matricula[]>();
  for (const m of base) {
    const lista = porAno.get(m.AnoReferencia);
    if (lista) lista.push(m); else porAno.set(m.AnoReferencia, [m]);
  }
  return repo.anos().map((ano) => ({ ano, ...agregar(porAno.get(ano) ?? []) }));
}

export const anoFechado = (s: { cobertura: number | null }): boolean => (s.cobertura ?? 0) >= COBERTURA_MINIMA;

/* ---------- Resumo: "A educação está evoluindo?" ---------- */

export type ClasseVariacao = "bom" | "ruim" | "";

export interface ItemResumo {
  rotulo: string;
  valor: string;
  /** Texto ou variação em p.p. com classe de cor. */
  variacao?: { cls: ClasseVariacao; texto: string };
  texto?: string;
}

export type Resumo =
  | { insuficiente: true; recorte: string }
  | {
      insuficiente: false;
      recorte: string;
      icone: string;
      veredito: string;
      cls: ClasseVariacao;
      explicacao: string;
      melhorAno: { ano: number; valor: string };
      itens: ItemResumo[];
    };

export function calcularResumo(repo: RepositorioMatriculas, f: Filtros): Resumo {
  const serie = serieAnual(repo, f.municipio, f.escola).filter((s) => anoFechado(s) && s.taxaAprovacao != null);
  const recorte = (f.municipio || "Mato Grosso do Sul") + (f.escola ? ` · escolas com “${f.escola}”` : "");
  if (serie.length < 2) return { insuficiente: true, recorte };

  const ini = serie[0], fim = serie[serie.length - 1];
  // Se o abandono só existe numa das pontas, a taxa do INEP não é comparável: usa aprovados ÷ (aprovados + reprovados)
  const quebra = abandonoRegistrado(repo, ini.ano) !== abandonoRegistrado(repo, fim.ano);
  const chaveAprov: "taxaAprovacao" | "taxaAprovacaoComparavel" = quebra ? "taxaAprovacaoComparavel" : "taxaAprovacao";
  const v = (p: PontoSerie, c: ChaveAgregado) => p[c] as number;
  const dAprov = v(fim, chaveAprov) - v(ini, chaveAprov);
  const dAprovInep = v(fim, "taxaAprovacao") - v(ini, "taxaAprovacao");
  const dReprov = v(fim, "taxaReprovacao") - v(ini, "taxaReprovacao");
  const LIMIAR = 0.01; // variações abaixo de 1 p.p. contam como estabilidade
  const [icone, veredito, cls]: [string, string, ClasseVariacao] =
    dAprov >= LIMIAR ? ["▲", "Sim, a aprovação melhorou", "bom"]
      : dAprov <= -LIMIAR ? ["▼", "Não, a aprovação piorou", "ruim"]
        : ["■", "Estável", ""];
  const melhor = serie.reduce((a, b) => (v(b, chaveAprov) > v(a, chaveAprov) ? b : a));

  const item = (rotulo: string, de: number | null, para: number | null, d: number, maiorMelhor: boolean, casas: number): ItemResumo => ({
    rotulo: `${rotulo} · ${ini.ano}→${fim.ano}`,
    valor: `${fmtPct(de, casas)} → ${fmtPct(para, casas)}`,
    variacao: { cls: Math.abs(d) < 0.0005 ? "" : (d > 0) === maiorMelhor ? "bom" : "ruim", texto: fmtPp(d) },
  });

  const semAband = anosSemAbandono(repo).filter((a) => a <= fim.ano);
  const itemAbandono: ItemResumo = abandonoRegistrado(repo, fim.ano)
    ? item("Abandono", ini.taxaAbandono, fim.taxaAbandono, v(fim, "taxaAbandono") - v(ini, "taxaAbandono"), false, 2)
    : {
        rotulo: `Abandono · ${ini.ano}→${fim.ano}`,
        valor: "Não registrado",
        texto: `A fonte não informa abandono desde ${semAband[0]}${abandonoRegistrado(repo, ini.ano) ? ` (${ini.ano}: ${fmtPct(ini.taxaAbandono, 2)})` : ""}.`,
      };

  const explicacao = quebra
    ? `Na base comparável (aprovados ÷ aprovados + reprovados), a aprovação foi de ${fmtPct(v(ini, chaveAprov))} em ${ini.ano} para ${fmtPct(v(fim, chaveAprov))} em ${fim.ano} (${fmtPp(dAprov)}). Pela fórmula do INEP a variação aparece como ${fmtPp(dAprovInep)}, mas essa fórmula muda de base quando o abandono deixa de ser registrado.`
    : `A aprovação foi de ${fmtPct(ini.taxaAprovacao)} em ${ini.ano} para ${fmtPct(fim.taxaAprovacao)} em ${fim.ano} (${fmtPp(dAprov)}).`;

  return {
    insuficiente: false, recorte, icone, veredito, cls, explicacao,
    melhorAno: { ano: melhor.ano, valor: fmtPct(v(melhor, chaveAprov)) },
    itens: [
      item(quebra ? "Aprovação comparável" : "Aprovação", v(ini, chaveAprov), v(fim, chaveAprov), dAprov, true, 1),
      item("Reprovação", ini.taxaReprovacao, fim.taxaReprovacao, dReprov, false, 1),
      itemAbandono,
    ],
  };
}

/* ---------- KPIs ---------- */

export interface Kpi {
  rotulo: string;
  valor: string;
  variacao?: { cls: ClasseVariacao; texto: string; resto: string };
  nota?: string;
}

export function calcularKpis(repo: RepositorioMatriculas, f: Filtros): Kpi[] {
  const anos = f.ano != null ? [f.ano] : anosCompletos(repo);
  const atual = agregar(repo.filtrar({ municipio: f.municipio, escola: f.escola }).filter((m) => anos.includes(m.AnoReferencia)));
  let anterior: Agregado | null = null;
  let anoAnterior: number | undefined;
  if (f.ano != null) {
    anoAnterior = repo.anos().filter((a) => a < f.ano!).pop();
    if (anoAnterior) anterior = agregar(repo.filtrar({ municipio: f.municipio, escola: f.escola, ano: anoAnterior }));
  }

  const delta = (chave: ChaveAgregado, maiorMelhor: boolean, tipo: "pp" | "n", sufixo = ""): Pick<Kpi, "variacao" | "nota"> => {
    const a = atual[chave] as number | null, b = anterior?.[chave] as number | null | undefined;
    if (!anterior || a == null || b == null) {
      return { nota: f.ano == null ? `${anos[0] ?? ""}–${anos[anos.length - 1] ?? ""} (anos fechados)` : "sem ano anterior" };
    }
    const d = a - b;
    const texto = tipo === "pp" ? fmtPp(d) : (d >= 0 ? "+" : "−") + fmtInt(Math.abs(d));
    return { variacao: { cls: d === 0 ? "" : (d > 0) === maiorMelhor ? "bom" : "ruim", texto, resto: `vs ${anoAnterior}${sufixo}` } };
  };

  const kpiAbandono = (): Kpi => {
    const faltando = anos.filter((a) => !abandonoRegistrado(repo, a));
    if (!faltando.length) {
      const ok = anterior && anoAnterior != null && abandonoRegistrado(repo, anoAnterior);
      return { rotulo: "Taxa de abandono", valor: fmtPct(atual.taxaAbandono, 2), ...(ok ? delta("taxaAbandono", false, "pp") : { nota: "sem ano anterior comparável" }) };
    }
    if (faltando.length === anos.length) return { rotulo: "Taxa de abandono", valor: "Não registrado", nota: "a fonte não informa neste ano" };
    return { rotulo: "Taxa de abandono", valor: "Não comparável", nota: `registrado só em ${anos.filter((a) => abandonoRegistrado(repo, a)).join(", ")}` };
  };

  const quebra = anterior && f.ano != null && anoAnterior != null && abandonoRegistrado(repo, f.ano) !== abandonoRegistrado(repo, anoAnterior);
  return [
    { rotulo: "Matrículas", valor: fmtInt(atual.MatriculasTotal), ...delta("MatriculasTotal", true, "n") },
    {
      rotulo: "Taxa de aprovação", valor: fmtPct(atual.taxaAprovacao),
      ...(quebra ? delta("taxaAprovacaoComparavel", true, "pp", " (base comparável)") : delta("taxaAprovacao", true, "pp")),
    },
    { rotulo: "Taxa de reprovação", valor: fmtPct(atual.taxaReprovacao), ...delta("taxaReprovacao", false, "pp") },
    kpiAbandono(),
    { rotulo: "Cancelados", valor: fmtInt(atual.Cancelados), ...delta("Cancelados", false, "n") },
    { rotulo: "Escolas", valor: fmtInt(atual.escolas), ...delta("escolas", true, "n") },
  ];
}

/* ---------- Ranking ---------- */

export const TOP_RANKING = 15;

export interface ItemRanking extends Agregado { nome: string }

export interface Ranking {
  ano: number | undefined;
  itens: ItemRanking[];
  totalGrupos: number;
}

/** Sem município: ranking de municípios. Com município: ranking das escolas dele. */
export function calcularRanking(repo: RepositorioMatriculas, f: Filtros, ordem: "piores" | "melhores"): Ranking {
  const completos = anosCompletos(repo);
  const ano = f.ano != null && completos.includes(f.ano) ? f.ano : completos[completos.length - 1];
  const base = repo.filtrar({ municipio: f.municipio, ano, escola: f.escola });
  const chave = f.municipio ? "NomeUnidadeEscolar" : "NomeMunicipio";
  const grupos = new Map<string, Matricula[]>();
  for (const m of base) {
    const lista = grupos.get(m[chave]);
    if (lista) lista.push(m); else grupos.set(m[chave], [m]);
  }
  const minimo = f.municipio ? 1 : 30; // evita que municípios minúsculos dominem o ranking
  const itens = [...grupos].map(([nome, lista]) => ({ nome, ...agregar(lista) }))
    .filter((i) => i.taxaAprovacao != null && i.situacoesFinais >= minimo)
    .sort((a, b) => (ordem === "piores" ? a.taxaAprovacao! - b.taxaAprovacao! : b.taxaAprovacao! - a.taxaAprovacao!))
    .slice(0, TOP_RANKING);
  return { ano, itens, totalGrupos: grupos.size };
}
