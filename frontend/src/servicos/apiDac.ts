import { TODOS_CAMPOS, type DadosBrutos } from "../dominio/matricula";

/** Aceita lista pura, PagedResult ({ items }) ou envelope ({ data }); chaves em PascalCase ou camelCase. */
export function normalizarRespostaApi(json: unknown): DadosBrutos[] {
  const j = json as Record<string, unknown> | unknown[] | null;
  const lista = (Array.isArray(j) ? j
    : (j?.items ?? j?.Items ?? j?.data ?? j?.matriculas ?? [])) as Record<string, unknown>[];
  return lista.map((item) => {
    const obj: DadosBrutos = {};
    for (const c of TODOS_CAMPOS) {
      const camel = c[0].toLowerCase() + c.slice(1);
      obj[c] = item[c] ?? item[camel];
    }
    return obj;
  });
}

async function buscarComTempo(url: string, opcoes: RequestInit = {}, ms = 4000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opcoes, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}

export class ErroApi extends Error {
  constructor(mensagem: string, readonly status?: number) { super(mensagem); }
}

const CHAVE_URL = "dac.apiUrl";

export const ApiDAC = {
  // Vazio = mesma origem: o proxy do Vite (dev) ou o nginx (produção) repassa /api ao backend, que não tem CORS
  urlPadrao: "",

  get url(): string {
    try { return localStorage.getItem(CHAVE_URL) ?? this.urlPadrao; } catch { return this.urlPadrao; }
  },
  set url(valor: string) {
    try { localStorage.setItem(CHAVE_URL, valor.replace(/\/+$/, "")); } catch { /* sem storage */ }
  },
  get descricao(): string {
    return this.url || `${location.origin} → backend (via proxy)`;
  },

  async obterMatriculas(): Promise<DadosBrutos[]> {
    const resp = await buscarComTempo(`${this.url}/api/matriculas/get-metrics`);
    if (!resp.ok) throw new ErroApi(`HTTP ${resp.status}`, resp.status);
    const lista = normalizarRespostaApi(await resp.json());
    if (!lista.length) throw new ErroApi("API sem registros");
    return lista;
  },

  async importarCsv(arquivo: File): Promise<string> {
    const form = new FormData();
    form.append("file", arquivo);
    const resp = await buscarComTempo(`${this.url}/api/matriculas/import-csv`, { method: "POST", body: form }, 30000);
    if (!resp.ok) {
      // 409: o backend recusa a importação quando algum ano do arquivo já está no banco
      throw new ErroApi(resp.status === 409 ? "ano já existe no banco" : `HTTP ${resp.status}`, resp.status);
    }
    return resp.text();
  },
};
