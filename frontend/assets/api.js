/* Camada de dados do painel: modelo Matricula (espelha DAC4GIL.Domain.Matriculas.Matricula),
 * cliente da API DAC4GIL.Presentation e leitor de CSV do portal dados.ms.gov.br. */
(function () {
  "use strict";

  const CAMPOS_NUMERICOS = [
    "AnoReferencia", "MatriculasTotal", "MatriculaInicial", "MatriculaAposCenso", "Transferidos",
    "Cancelados", "Falecido", "Abandono", "Aprovados", "Reprovados", "Cursando", "OutrasSituacoes",
  ];
  const CAMPOS_TEXTO = ["NomeMunicipio", "NomeUnidadeEscolar"];
  const TODOS_CAMPOS = [CAMPOS_NUMERICOS[0], ...CAMPOS_TEXTO, ...CAMPOS_NUMERICOS.slice(1)];

  class Matricula {
    constructor(dados) {
      for (const c of CAMPOS_TEXTO) this[c] = String(dados[c] ?? "").trim();
      for (const c of CAMPOS_NUMERICOS) this[c] = Number(dados[c]) || 0;
    }

    /** Alunos com situação final definida (base das taxas de rendimento do INEP). */
    get situacoesFinais() { return this.Aprovados + this.Reprovados + this.Abandono; }
    get taxaAprovacao() { return taxa(this.Aprovados, this.situacoesFinais); }
    get taxaAbandono() { return taxa(this.Abandono, this.situacoesFinais); }
    get taxaReprovacao() { return taxa(this.Reprovados, this.situacoesFinais); }
  }

  function taxa(parte, total) { return total > 0 ? parte / total : null; }

  /** Soma um conjunto de matrículas em um único agregado com as mesmas taxas. */
  function agregar(lista) {
    const soma = { escolas: new Set() };
    for (const c of CAMPOS_NUMERICOS) if (c !== "AnoReferencia") soma[c] = 0;
    for (const m of lista) {
      for (const c of CAMPOS_NUMERICOS) if (c !== "AnoReferencia") soma[c] += m[c];
      soma.escolas.add(m.NomeMunicipio + "|" + m.NomeUnidadeEscolar);
    }
    const finais = soma.Aprovados + soma.Reprovados + soma.Abandono;
    return {
      ...soma,
      escolas: soma.escolas.size,
      situacoesFinais: finais,
      taxaAprovacao: taxa(soma.Aprovados, finais),
      taxaReprovacao: taxa(soma.Reprovados, finais),
      taxaAbandono: taxa(soma.Abandono, finais),
      // Base que existe em todos os anos (o abandono deixou de ser registrado a partir de 2019)
      taxaAprovacaoComparavel: taxa(soma.Aprovados, soma.Aprovados + soma.Reprovados),
      // Parcela das matrículas com ano letivo encerrado — 2024 e 2026 vieram quase todas "cursando".
      cobertura: taxa(finais, finais + soma.Cursando),
    };
  }

  /** Repositório em memória indexado por ano e por município (Map → lista). */
  class RepositorioMatriculas {
    constructor() { this.limpar(); }

    limpar() {
      this.todas = [];
      this.porAno = new Map();
      this.porMunicipio = new Map();
      this.chaves = new Set();
    }

    adicionar(lista) {
      let novas = 0;
      for (const bruto of lista) {
        const m = bruto instanceof Matricula ? bruto : new Matricula(bruto);
        if (!m.AnoReferencia || !m.NomeMunicipio || !m.NomeUnidadeEscolar) continue;
        const chave = `${m.AnoReferencia}|${m.NomeMunicipio}|${m.NomeUnidadeEscolar}`;
        if (this.chaves.has(chave)) continue; // reimportar o mesmo ano não duplica
        this.chaves.add(chave);
        this.todas.push(m);
        indexar(this.porAno, m.AnoReferencia, m);
        indexar(this.porMunicipio, m.NomeMunicipio, m);
        novas++;
      }
      return novas;
    }

    anos() { return [...this.porAno.keys()].sort((a, b) => a - b); }
    municipios() { return [...this.porMunicipio.keys()].sort((a, b) => a.localeCompare(b, "pt-BR")); }

    filtrar({ municipio, ano, escola } = {}) {
      let base = municipio ? this.porMunicipio.get(municipio) || []
        : ano ? this.porAno.get(ano) || [] : this.todas;
      const termo = normalizar(escola || "");
      return base.filter((m) =>
        (!ano || m.AnoReferencia === ano) &&
        (!municipio || m.NomeMunicipio === municipio) &&
        (!termo || normalizar(m.NomeUnidadeEscolar).includes(termo)));
    }
  }

  function indexar(mapa, chave, valor) {
    if (!mapa.has(chave)) mapa.set(chave, []);
    mapa.get(chave).push(valor);
  }

  function normalizar(s) {
    return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  }

  /* ---------- Fontes de dados ---------- */

  function dadosLocais() {
    const pacote = window.MATRICULAS_MS;
    if (!pacote) return [];
    return pacote.linhas.map((linha) => {
      const obj = {};
      pacote.colunas.forEach((c, i) => { obj[c] = linha[i]; });
      return obj;
    });
  }

  /** Aceita lista pura, PagedResult ({ items }) ou envelope ({ data }); chaves em PascalCase ou camelCase. */
  function normalizarRespostaApi(json) {
    const lista = Array.isArray(json) ? json
      : json?.items ?? json?.Items ?? json?.data ?? json?.matriculas ?? [];
    return lista.map((item) => {
      const obj = {};
      for (const c of TODOS_CAMPOS) {
        const camel = c[0].toLowerCase() + c.slice(1);
        obj[c] = item[c] ?? item[camel];
      }
      return obj;
    });
  }

  async function buscarComTempo(url, opcoes = {}, ms = 4000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try { return await fetch(url, { ...opcoes, signal: ctrl.signal }); }
    finally { clearTimeout(t); }
  }

  const ApiDAC = {
    // Vazio = mesma origem: o servidor.py repassa /api ao backend (que não tem CORS habilitado)
    urlPadrao: "",

    get url() {
      try { return localStorage.getItem("dac.apiUrl") ?? this.urlPadrao; } catch { return this.urlPadrao; }
    },
    get descricao() { return this.url || `${location.origin} → backend (via servidor.py)`; },
    set url(valor) {
      try { localStorage.setItem("dac.apiUrl", valor.replace(/\/+$/, "")); } catch { /* sem storage */ }
    },

    async obterMatriculas() {
      const resp = await buscarComTempo(`${this.url}/api/matriculas/get-metrics`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const lista = normalizarRespostaApi(await resp.json());
      if (!lista.length) throw new Error("API sem registros");
      return lista;
    },

    async importarCsv(arquivo) {
      const form = new FormData();
      form.append("file", arquivo);
      const resp = await buscarComTempo(`${this.url}/api/matriculas/import-csv`, { method: "POST", body: form }, 30000);
      if (!resp.ok) {
        // 409: o backend recusa a importação quando algum ano do arquivo já está no banco
        const erro = new Error(resp.status === 409 ? "ano já existe no banco" : `HTTP ${resp.status}`);
        erro.status = resp.status;
        throw erro;
      }
      return resp.text();
    },
  };

  /** Leitor de CSV com suporte a campos entre aspas e separador "," ou ";". */
  function lerCsv(texto) {
    texto = texto.replace(/^﻿/, "");
    const primeiraLinha = texto.slice(0, texto.indexOf("\n"));
    const sep = (primeiraLinha.match(/;/g) || []).length > (primeiraLinha.match(/,/g) || []).length ? ";" : ",";
    const linhas = [];
    let campo = "", linha = [], aspas = false;
    for (let i = 0; i < texto.length; i++) {
      const ch = texto[i];
      if (aspas) {
        if (ch === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
        else if (ch === '"') aspas = false;
        else campo += ch;
      } else if (ch === '"') aspas = true;
      else if (ch === sep) { linha.push(campo); campo = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && texto[i + 1] === "\n") i++;
        linha.push(campo); campo = "";
        if (linha.some((v) => v !== "")) linhas.push(linha);
        linha = [];
      } else campo += ch;
    }
    if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
    const [cab, ...corpo] = linhas;
    if (!cab) return [];
    const cabecalho = cab.map((c) => c.trim());
    const faltando = TODOS_CAMPOS.filter((c) => !cabecalho.includes(c));
    if (faltando.length) throw new Error("Colunas ausentes: " + faltando.join(", "));
    return corpo.map((v) => Object.fromEntries(cabecalho.map((c, i) => [c, v[i]])));
  }

  window.DAC = { Matricula, RepositorioMatriculas, ApiDAC, agregar, dadosLocais, lerCsv, normalizar };
})();
