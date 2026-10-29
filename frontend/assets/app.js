/* Painel ODS 4 — filtros, indicadores, gráficos e tabela. */
(function () {
  "use strict";

  const { RepositorioMatriculas, ApiDAC, agregar, dadosLocais, lerCsv } = window.DAC;

  const COBERTURA_MINIMA = 0.5; // abaixo disso o ano letivo ainda estava aberto na extração
  const REGISTRO_ABANDONO_MINIMO = 0.1; // fração mínima de escolas com abandono > 0 para o ano ter o dado
  const POR_PAGINA = 25;
  const TOP_RANKING = 15;

  const repo = new RepositorioMatriculas();
  const estado = {
    municipio: "",
    ano: null,          // null = todos os anos
    escola: "",
    ordemRanking: "piores",
    ordenacao: { col: "MatriculasTotal", asc: false },
    pagina: 1,
    fonte: "",
  };
  const graficos = {};

  const $ = (sel) => document.querySelector(sel);
  const fmtInt = new Intl.NumberFormat("pt-BR");
  const fmtPct = (v, casas = 1) => v == null ? "—" : (v * 100).toFixed(casas).replace(".", ",") + "%";
  const fmtPp = (v) => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v * 100).toFixed(1).replace(".", ",") + " p.p.";

  /* ---------- Carga ---------- */

  async function carregar() {
    repo.limpar();
    try {
      const lista = await ApiDAC.obterMatriculas();
      repo.adicionar(lista);
      definirFonte("api", `API · ${fmtInt.format(repo.todas.length)} registros`);
    } catch (erro) {
      repo.adicionar(dadosLocais());
      definirFonte("local", `Dados locais · ${fmtInt.format(repo.todas.length)} registros`,
        `API indisponível em ${ApiDAC.descricao} (${erro.message}). Exibindo a cópia local dos CSVs oficiais.`);
    }
    montarFiltros();
    renderizar();
  }

  function definirFonte(tipo, texto, dica) {
    estado.fonte = tipo;
    const el = $("#fonte-dados");
    el.className = "pill " + tipo;
    el.textContent = texto;
    el.title = dica || `Conectado a ${ApiDAC.descricao}`;
  }

  /* ---------- Filtros ---------- */

  /** A fonte parou de preencher a coluna Abandono: 2018 tem 222 escolas com registro, 2019 tem 25 e 2020+ nenhuma.
   *  O critério é estadual por ano, porque é uma falha de registro da base e não do recorte filtrado. */
  function abandonoRegistrado(ano) {
    const lista = repo.porAno.get(ano) || [];
    return lista.length > 0 && lista.filter((m) => m.Abandono > 0).length / lista.length >= REGISTRO_ABANDONO_MINIMO;
  }

  function anosSemAbandono() { return repo.anos().filter((a) => !abandonoRegistrado(a)); }

  function anosCompletos() {
    return repo.anos().filter((a) => (agregar(repo.porAno.get(a)).cobertura ?? 0) >= COBERTURA_MINIMA);
  }

  function montarFiltros() {
    const selMun = $("#f-municipio");
    selMun.length = 1;
    for (const m of repo.municipios()) selMun.add(new Option(m, m));
    if (!repo.porMunicipio.has(estado.municipio)) estado.municipio = "";
    selMun.value = estado.municipio;

    const selAno = $("#f-ano");
    selAno.length = 0;
    selAno.add(new Option("Todos os anos", ""));
    const completos = new Set(anosCompletos());
    for (const a of repo.anos()) selAno.add(new Option(completos.has(a) ? String(a) : `${a} (em andamento)`, a));
    if (estado.ano == null || !repo.porAno.has(estado.ano)) estado.ano = [...completos].pop() ?? null;
    selAno.value = estado.ano ?? "";
  }

  function ligarEventos() {
    $("#f-municipio").addEventListener("change", (e) => { estado.municipio = e.target.value; estado.pagina = 1; renderizar(); });
    $("#f-ano").addEventListener("change", (e) => { estado.ano = e.target.value ? Number(e.target.value) : null; estado.pagina = 1; renderizar(); });
    let espera;
    $("#f-escola").addEventListener("input", (e) => {
      clearTimeout(espera);
      espera = setTimeout(() => { estado.escola = e.target.value; estado.pagina = 1; renderizar(); }, 200);
    });
    $("#btn-limpar").addEventListener("click", () => {
      estado.municipio = ""; estado.escola = ""; estado.ano = null; estado.pagina = 1;
      $("#f-escola").value = "";
      montarFiltros();
      renderizar();
    });

    document.querySelectorAll(".segmentado button").forEach((b) => b.addEventListener("click", () => {
      estado.ordemRanking = b.dataset.ordem;
      document.querySelectorAll(".segmentado button").forEach((x) => x.classList.toggle("ativo", x === b));
      renderizarRanking();
    }));

    document.querySelectorAll("#tabela th").forEach((th) => th.addEventListener("click", () => {
      const col = th.dataset.col;
      estado.ordenacao = { col, asc: estado.ordenacao.col === col ? !estado.ordenacao.asc : col.startsWith("Nome") };
      renderizarTabela();
    }));
    $("#pag-ant").addEventListener("click", () => { estado.pagina--; renderizarTabela(); });
    $("#pag-prox").addEventListener("click", () => { estado.pagina++; renderizarTabela(); });
    $("#btn-exportar").addEventListener("click", exportarCsv);

    $("#btn-tema").addEventListener("click", alternarTema);
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", renderizarGraficos);

    // Diálogo de backend/importação
    const dlg = $("#dlg-config");
    $("#btn-config").addEventListener("click", () => { $("#cfg-url").value = ApiDAC.url; dlg.showModal(); });
    $("#cfg-testar").addEventListener("click", async () => {
      ApiDAC.url = $("#cfg-url").value.trim() || ApiDAC.urlPadrao;
      $("#cfg-status").textContent = "Conectando…";
      await carregar();
      $("#cfg-status").textContent = estado.fonte === "api" ? "Conectado à API." : "API não respondeu — usando dados locais.";
    });
    $("#cfg-importar").addEventListener("click", importarArquivo);
  }

  async function importarArquivo() {
    const arquivo = $("#cfg-arquivo").files[0];
    const status = $("#cfg-import-status");
    if (!arquivo) { status.textContent = "Selecione um arquivo CSV."; return; }
    let novas;
    try {
      novas = repo.adicionar(lerCsv(await arquivo.text()));
    } catch (e) {
      status.textContent = "CSV inválido: " + e.message;
      return;
    }
    let msgApi;
    try { await ApiDAC.importarCsv(arquivo); msgApi = "enviado à API"; }
    catch (e) { msgApi = `API não recebeu (${e.message})`; }
    status.textContent = `${fmtInt.format(novas)} registros novos no painel; ${msgApi}.`;
    montarFiltros();
    renderizar();
  }

  /* ---------- Renderização ---------- */

  function renderizar() {
    renderizarAviso();
    renderizarResumo();
    renderizarKpis();
    renderizarGraficos();
    renderizarTabela();
  }

  function renderizarAviso() {
    const completos = new Set(anosCompletos());
    const abertos = repo.anos().filter((a) => !completos.has(a));
    const partes = [];
    if (estado.ano != null && !completos.has(estado.ano)) {
      partes.push(`<strong>${estado.ano}</strong> ainda estava em andamento quando os dados foram extraídos (a maioria dos alunos aparece como “cursando”), então as taxas desse ano não são comparáveis.`);
    } else if (abertos.length) {
      partes.push(`Anos em andamento (${abertos.join(", ")}) ficam fora das linhas de taxa; aparecem só em matrículas e situação final.`);
    }
    const semAband = anosSemAbandono();
    if (semAband.length) {
      partes.push(`<strong>Abandono não registrado a partir de ${semAband[0]}:</strong> a coluna vem zerada em praticamente todas as escolas, enquanto os cancelamentos seguem em ~3% das matrículas. É falha de registro da fonte, não queda real. Por isso o abandono aparece como “não registrado” nesses anos, e a evolução da aprovação também é mostrada numa base comparável (aprovados ÷ aprovados + reprovados).`);
    }
    const el = $("#aviso-parcial");
    el.innerHTML = partes.join(" ");
    el.hidden = false;
  }

  /** Responde ao enunciado: compara o primeiro e o último ano fechado do recorte atual. */
  function renderizarResumo() {
    const serie = serieAnual(estado.municipio).filter((s) => (s.cobertura ?? 0) >= COBERTURA_MINIMA && s.taxaAprovacao != null);
    const el = $("#resumo");
    const recorte = (estado.municipio || "Mato Grosso do Sul") + (estado.escola ? ` · escolas com “${escapar(estado.escola)}”` : "");
    if (serie.length < 2) {
      el.innerHTML = `<div><div class="resumo-pergunta">A educação está evoluindo? · ${recorte}</div>
        <div class="resumo-veredito">Dados insuficientes</div>
        <div class="resumo-texto">É preciso ao menos dois anos letivos encerrados no recorte para comparar.</div></div>`;
      return;
    }
    const ini = serie[0], fim = serie[serie.length - 1];
    // Se o abandono só existe numa das pontas, a taxa do INEP não é comparável: usa aprovados ÷ (aprovados + reprovados)
    const quebra = abandonoRegistrado(ini.ano) !== abandonoRegistrado(fim.ano);
    const chaveAprov = quebra ? "taxaAprovacaoComparavel" : "taxaAprovacao";
    const dAprov = fim[chaveAprov] - ini[chaveAprov];
    const dAprovInep = fim.taxaAprovacao - ini.taxaAprovacao;
    const dReprov = fim.taxaReprovacao - ini.taxaReprovacao;
    const LIMIAR = 0.01; // variações abaixo de 1 p.p. contam como estabilidade
    const [icone, veredito, cls] = dAprov >= LIMIAR ? ["▲", "Sim, a aprovação melhorou", "bom"]
      : dAprov <= -LIMIAR ? ["▼", "Não, a aprovação piorou", "ruim"]
      : ["■", "Estável", ""];
    const melhorAno = serie.reduce((a, b) => b[chaveAprov] > a[chaveAprov] ? b : a);
    const item = (rotulo, de, para, d, maiorMelhor, casas) => {
      const c = Math.abs(d) < 0.0005 ? "" : (d > 0) === maiorMelhor ? "bom" : "ruim";
      return `<div><div class="resumo-pergunta">${rotulo} · ${ini.ano}→${fim.ano}</div>
        <div class="resumo-valor">${fmtPct(de, casas)} → ${fmtPct(para, casas)}</div>
        <div class="resumo-texto"><span class="${c}">${fmtPp(d)}</span></div></div>`;
    };
    const semAband = anosSemAbandono().filter((a) => a <= fim.ano);
    const itemAbandono = abandonoRegistrado(fim.ano)
      ? item("Abandono", ini.taxaAbandono, fim.taxaAbandono, fim.taxaAbandono - ini.taxaAbandono, false, 2)
      : `<div><div class="resumo-pergunta">Abandono · ${ini.ano}→${fim.ano}</div>
          <div class="resumo-valor">Não registrado</div>
          <div class="resumo-texto">A fonte não informa abandono desde ${semAband[0]}${abandonoRegistrado(ini.ano) ? ` (${ini.ano}: ${fmtPct(ini.taxaAbandono, 2)})` : ""}.</div></div>`;
    const explicacao = quebra
      ? `Na base comparável (aprovados ÷ aprovados + reprovados), a aprovação foi de ${fmtPct(ini[chaveAprov])} em ${ini.ano} para ${fmtPct(fim[chaveAprov])} em ${fim.ano} (${fmtPp(dAprov)}). Pela fórmula do INEP a variação aparece como ${fmtPp(dAprovInep)}, mas essa fórmula muda de base quando o abandono deixa de ser registrado.`
      : `A aprovação foi de ${fmtPct(ini.taxaAprovacao)} em ${ini.ano} para ${fmtPct(fim.taxaAprovacao)} em ${fim.ano} (${fmtPp(dAprov)}).`;
    el.innerHTML = `
      <div>
        <div class="resumo-pergunta">A educação está evoluindo? · ${recorte}</div>
        <div class="resumo-veredito ${cls}"><span class="icone" aria-hidden="true">${icone}</span>${veredito}</div>
        <div class="resumo-texto">${explicacao} Melhor ano: ${melhorAno.ano} (${fmtPct(melhorAno[chaveAprov])}).</div>
      </div>
      ${item(quebra ? "Aprovação comparável" : "Aprovação", ini[chaveAprov], fim[chaveAprov], dAprov, true, 1)}
      ${item("Reprovação", ini.taxaReprovacao, fim.taxaReprovacao, dReprov, false, 1)}
      ${itemAbandono}`;
  }

  function renderizarKpis() {
    const anos = estado.ano != null ? [estado.ano] : anosCompletos();
    const atual = agregar(repo.filtrar({ ...estado, ano: null }).filter((m) => anos.includes(m.AnoReferencia)));
    let anterior = null, anoAnterior = null;
    if (estado.ano != null) {
      anoAnterior = repo.anos().filter((a) => a < estado.ano).pop();
      if (anoAnterior) anterior = agregar(repo.filtrar({ ...estado, ano: anoAnterior }));
    }
    const delta = (chave, maiorMelhor, tipo) => {
      if (!anterior || atual[chave] == null || anterior[chave] == null) {
        return estado.ano == null ? `${anos[0] ?? ""}–${anos[anos.length - 1] ?? ""} (anos fechados)` : "sem ano anterior";
      }
      const d = atual[chave] - anterior[chave];
      const txt = tipo === "pp" ? fmtPp(d) : (d >= 0 ? "+" : "−") + fmtInt.format(Math.abs(d));
      const cls = d === 0 ? "" : (d > 0) === maiorMelhor ? "bom" : "ruim";
      return `<span class="${cls}">${txt}</span> vs ${anoAnterior}`;
    };
    const cartoes = [
      ["Matrículas", fmtInt.format(atual.MatriculasTotal), delta("MatriculasTotal", true, "n")],
      ["Taxa de aprovação", fmtPct(atual.taxaAprovacao),
        anterior && abandonoRegistrado(estado.ano) !== abandonoRegistrado(anoAnterior)
          ? delta("taxaAprovacaoComparavel", true, "pp") + " (base comparável)"
          : delta("taxaAprovacao", true, "pp")],
      ["Taxa de reprovação", fmtPct(atual.taxaReprovacao), delta("taxaReprovacao", false, "pp")],
      kpiAbandono(anos, atual, anterior, anoAnterior),
      ["Cancelados", fmtInt.format(atual.Cancelados), delta("Cancelados", false, "n")],
      ["Escolas", fmtInt.format(atual.escolas), delta("escolas", true, "n")],
    ];
    function kpiAbandono(anos, atual, anterior, anoAnterior) {
      const faltando = anos.filter((a) => !abandonoRegistrado(a));
      if (!faltando.length) {
        const ok = anterior && abandonoRegistrado(anoAnterior);
        return ["Taxa de abandono", fmtPct(atual.taxaAbandono, 2), ok ? delta("taxaAbandono", false, "pp") : "sem ano anterior comparável"];
      }
      if (faltando.length === anos.length) return ["Taxa de abandono", "Não registrado", "a fonte não informa neste ano"];
      return ["Taxa de abandono", "Não comparável", `registrado só em ${anos.filter(abandonoRegistrado).join(", ")}`];
    }
    $("#kpis").innerHTML = cartoes.map(([r, v, d]) =>
      `<div class="kpi"><div class="kpi-rotulo">${r}</div><div class="kpi-valor">${v}</div><div class="kpi-delta">${d}</div></div>`).join("");
  }

  /* ---------- Gráficos ---------- */

  function cor(nome) { return getComputedStyle(document.documentElement).getPropertyValue(nome).trim(); }

  function comAlfa(hex, alfa) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${alfa})`;
  }

  function opcoesBase(extra = {}) {
    const texto = cor("--text-secondary"), grade = cor("--grid");
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 },
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { labels: { color: texto, boxWidth: 10, boxHeight: 10, usePointStyle: true, pointStyle: "circle", font: { family: "Inter", size: 12 } } },
        tooltip: {
          backgroundColor: cor("--surface-1"), titleColor: cor("--text-primary"), bodyColor: texto,
          borderColor: cor("--border"), borderWidth: 1, padding: 10, boxPadding: 4, usePointStyle: true,
          titleFont: { family: "Inter", weight: "600" }, bodyFont: { family: "Inter" },
        },
      },
      scales: {
        x: { grid: { display: false }, border: { color: grade }, ticks: { color: texto, font: { family: "Inter", size: 12 } } },
        y: { grid: { color: grade }, border: { display: false }, ticks: { color: texto, font: { family: "Inter", size: 12 } } },
      },
      ...extra,
    };
  }

  function desenhar(id, config) {
    if (graficos[id]) graficos[id].destroy();
    graficos[id] = new Chart(document.getElementById(id), config);
  }

  /** Série anual (todas as escolas do recorte) — o filtro de ano só destaca o ponto. */
  function serieAnual(municipio) {
    const base = repo.filtrar({ municipio, escola: estado.escola });
    const porAno = new Map();
    for (const m of base) {
      if (!porAno.has(m.AnoReferencia)) porAno.set(m.AnoReferencia, []);
      porAno.get(m.AnoReferencia).push(m);
    }
    return repo.anos().map((ano) => ({ ano, ...agregar(porAno.get(ano) || []) }));
  }

  function renderizarGraficos() {
    if (typeof Chart === "undefined") return;
    Chart.defaults.font.family = "Inter, system-ui, sans-serif";
    const serie = serieAnual(estado.municipio);
    const anos = serie.map((s) => String(s.ano));
    const fechado = (s) => (s.cobertura ?? 0) >= COBERTURA_MINIMA;
    const taxaOuNada = (s, chave) => fechado(s) && s[chave] != null && (chave !== "taxaAbandono" || abandonoRegistrado(s.ano))
      ? +(s[chave] * 100).toFixed(2) : null;
    const destaque = (s) => s.ano === estado.ano;
    const rotulo = estado.municipio || "Mato Grosso do Sul";
    const s1 = cor("--series-1"), s2 = cor("--series-2"), s3 = cor("--series-3"), s4 = cor("--series-4");
    const neutro = cor("--neutral"), sup = cor("--surface-1");

    // Linhas de taxa só usam anos com ano letivo encerrado
    const serieTaxa = serie.filter(fechado);
    const anosTaxa = serieTaxa.map((s) => String(s.ano));
    const linha = (label, dados, c, extra = {}) => ({
      label, data: dados, borderColor: c, backgroundColor: c, borderWidth: 2, tension: 0, spanGaps: true,
      pointRadius: serieTaxa.map((s) => destaque(s) ? 6 : 4), pointHoverRadius: 7,
      pointBorderColor: sup, pointBorderWidth: 2, ...extra,
    });
    const pct = { callback: (v) => v + "%" };
    const tooltipPct = { callbacks: { label: (c) => ` ${c.dataset.label}: ${c.raw == null ? "não registrado" : c.raw.toFixed(1).replace(".", ",") + "%"}` } };

    // 1. Aprovação (com o estado como referência quando há município selecionado)
    const dsAprov = [linha(rotulo, serieTaxa.map((s) => taxaOuNada(s, "taxaAprovacao")), s1)];
    if (estado.municipio) {
      const ref = new Map(serieAnual("").map((s) => [s.ano, s]));
      dsAprov.push(linha("Média estadual", serieTaxa.map((s) => taxaOuNada(ref.get(s.ano), "taxaAprovacao")), neutro, { borderDash: [5, 4], pointRadius: 3 }));
    }
    const valsAprov = dsAprov.flatMap((d) => d.data).filter((v) => v != null);
    desenhar("g-aprovacao", {
      type: "line",
      data: { labels: anosTaxa, datasets: dsAprov },
      options: opcoesBase({
        plugins: { ...opcoesBase().plugins, legend: { ...opcoesBase().plugins.legend, display: dsAprov.length > 1 }, tooltip: { ...opcoesBase().plugins.tooltip, ...tooltipPct } },
        scales: { ...opcoesBase().scales, y: { ...opcoesBase().scales.y, suggestedMin: Math.max(0, Math.floor(Math.min(...valsAprov, 100) - 5)), suggestedMax: 100, ticks: { ...opcoesBase().scales.y.ticks, ...pct } } },
      }),
    });
    const semAband = anosSemAbandono();
    $("#sub-evolucao").textContent = `${rotulo}${estado.escola ? ` · escolas com “${estado.escola}”` : ""} · aprovados ÷ (aprovados + reprovados + abandono)`
      + (semAband.length ? `. A partir de ${semAband[0]} o abandono não é registrado, o que infla a taxa — parte do salto ${semAband[0] - 1}→${semAband[0]} é efeito disso.` : "");

    // 2. Reprovação e abandono
    desenhar("g-insucesso", {
      type: "line",
      data: {
        labels: anosTaxa,
        datasets: [
          linha("Reprovação", serieTaxa.map((s) => taxaOuNada(s, "taxaReprovacao")), s2),
          linha("Abandono", serieTaxa.map((s) => taxaOuNada(s, "taxaAbandono")), s3),
        ],
      },
      options: opcoesBase({
        plugins: { ...opcoesBase().plugins, tooltip: { ...opcoesBase().plugins.tooltip, ...tooltipPct } },
        scales: { ...opcoesBase().scales, y: { ...opcoesBase().scales.y, beginAtZero: true, ticks: { ...opcoesBase().scales.y.ticks, ...pct } } },
      }),
    });

    // 3. Matrículas por ano
    desenhar("g-matriculas", {
      type: "bar",
      data: {
        labels: anos,
        datasets: [{
          label: "Matrículas", data: serie.map((s) => s.MatriculasTotal),
          backgroundColor: serie.map((s) => estado.ano == null || destaque(s) ? s1 : comAlfa(s1, 0.4)),
          borderRadius: { topLeft: 4, topRight: 4 }, borderSkipped: "start", maxBarThickness: 36,
        }],
      },
      options: opcoesBase({
        plugins: { ...opcoesBase().plugins, legend: { display: false }, tooltip: { ...opcoesBase().plugins.tooltip, callbacks: { label: (c) => ` ${fmtInt.format(c.raw)} matrículas` } } },
        scales: { ...opcoesBase().scales, y: { ...opcoesBase().scales.y, beginAtZero: true, ticks: { ...opcoesBase().scales.y.ticks, callback: (v) => fmtInt.format(v) } } },
      }),
    });

    // 4. Situação final (100% empilhado)
    const grupos = [
      ["Aprovados", (s) => s.Aprovados, s1],
      ["Reprovados", (s) => s.Reprovados, s2],
      ["Abandono", (s) => s.Abandono, s3],
      ["Cursando", (s) => s.Cursando, s4],
      ["Transf./cancel./outros", (s) => s.Transferidos + s.Cancelados + s.Falecido + s.OutrasSituacoes, neutro],
    ];
    const totalSit = serie.map((s) => grupos.reduce((acc, [, f]) => acc + f(s), 0));
    desenhar("g-situacao", {
      type: "bar",
      data: {
        labels: anos,
        datasets: grupos.map(([label, f, c]) => ({
          label, data: serie.map((s, i) => totalSit[i] ? +(100 * f(s) / totalSit[i]).toFixed(2) : 0),
          absolutos: serie.map(f), backgroundColor: c, borderColor: sup, borderWidth: { top: 2 }, borderSkipped: false, maxBarThickness: 56,
        })),
      },
      options: opcoesBase({
        plugins: {
          ...opcoesBase().plugins,
          legend: { ...opcoesBase().plugins.legend, position: "bottom" },
          tooltip: { ...opcoesBase().plugins.tooltip, callbacks: { label: (c) => ` ${c.dataset.label}: ${c.raw.toFixed(1).replace(".", ",")}% (${fmtInt.format(c.dataset.absolutos[c.dataIndex])})` } },
        },
        scales: {
          x: { ...opcoesBase().scales.x, stacked: true },
          y: { ...opcoesBase().scales.y, stacked: true, max: 100, ticks: { ...opcoesBase().scales.y.ticks, ...pct } },
        },
      }),
    });

    renderizarRanking();
  }

  /** Sem município: ranking de municípios. Com município: ranking das escolas dele. */
  function renderizarRanking() {
    if (typeof Chart === "undefined") return;
    const completos = anosCompletos();
    const ano = estado.ano != null && completos.includes(estado.ano) ? estado.ano : completos[completos.length - 1];
    const base = repo.filtrar({ municipio: estado.municipio, ano, escola: estado.escola });
    const chave = estado.municipio ? "NomeUnidadeEscolar" : "NomeMunicipio";
    const grupos = new Map();
    for (const m of base) {
      if (!grupos.has(m[chave])) grupos.set(m[chave], []);
      grupos.get(m[chave]).push(m);
    }
    const minimo = estado.municipio ? 1 : 30; // evita que municípios minúsculos dominem o ranking
    let itens = [...grupos].map(([nome, lista]) => ({ nome, ...agregar(lista) }))
      .filter((i) => i.taxaAprovacao != null && i.situacoesFinais >= minimo);
    itens.sort((a, b) => estado.ordemRanking === "piores" ? a.taxaAprovacao - b.taxaAprovacao : b.taxaAprovacao - a.taxaAprovacao);
    itens = itens.slice(0, TOP_RANKING);

    $("#titulo-ranking").textContent = estado.municipio ? `Escolas de ${estado.municipio} por taxa de aprovação` : "Municípios por taxa de aprovação";
    $("#sub-ranking").textContent = ano == null ? "Sem ano fechado disponível."
      : `${ano}${estado.ano != null && estado.ano !== ano ? ` (último ano fechado; ${estado.ano} está em andamento)` : ""} · ${itens.length} de ${grupos.size} ${estado.municipio ? "escolas" : "municípios"}`;

    const s1 = cor("--series-1");
    const curto = (t) => t.length > 38 ? t.slice(0, 36) + "…" : t;
    $(".grafico-ranking").style.height = Math.max(160, itens.length * 24 + 40) + "px";
    desenhar("g-ranking", {
      type: "bar",
      data: {
        labels: itens.map((i) => curto(i.nome)),
        datasets: [{
          label: "Taxa de aprovação", data: itens.map((i) => +(i.taxaAprovacao * 100).toFixed(2)),
          backgroundColor: s1, borderRadius: { topRight: 4, bottomRight: 4 }, borderSkipped: "start", barThickness: 14,
        }],
      },
      options: opcoesBase({
        indexAxis: "y",
        interaction: { mode: "nearest", axis: "y", intersect: false },
        plugins: {
          ...opcoesBase().plugins,
          legend: { display: false },
          tooltip: {
            ...opcoesBase().plugins.tooltip,
            callbacks: {
              title: (c) => itens[c[0].dataIndex].nome,
              label: (c) => {
                const i = itens[c.dataIndex];
                return [` Aprovação: ${fmtPct(i.taxaAprovacao)}`, ` Reprovação: ${fmtPct(i.taxaReprovacao)}`, ` Abandono: ${abandonoRegistrado(ano) ? fmtPct(i.taxaAbandono, 2) : "não registrado"}`, ` Matrículas: ${fmtInt.format(i.MatriculasTotal)}`];
              },
            },
          },
        },
        scales: {
          x: { ...opcoesBase().scales.y, min: Math.max(0, Math.floor(Math.min(...itens.map((i) => i.taxaAprovacao * 100), 100) / 10) * 10 - 10), max: 100, ticks: { ...opcoesBase().scales.y.ticks, callback: (v) => v + "%" } },
          y: { ...opcoesBase().scales.x, ticks: { ...opcoesBase().scales.x.ticks, autoSkip: false } },
        },
      }),
    });
  }

  /* ---------- Tabela ---------- */

  function linhasTabela() {
    const { col, asc } = estado.ordenacao;
    const linhas = repo.filtrar(estado);
    const valor = (m) => m[col];
    return linhas.sort((a, b) => {
      const va = valor(a), vb = valor(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      const r = typeof va === "string" ? va.localeCompare(vb, "pt-BR") : va - vb;
      return asc ? r : -r;
    });
  }

  function escapar(t) {
    return String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function renderizarTabela() {
    const linhas = linhasTabela();
    const paginas = Math.max(1, Math.ceil(linhas.length / POR_PAGINA));
    estado.pagina = Math.min(Math.max(1, estado.pagina), paginas);
    const pagina = linhas.slice((estado.pagina - 1) * POR_PAGINA, estado.pagina * POR_PAGINA);

    $("#tabela tbody").innerHTML = pagina.length ? pagina.map((m) => `
      <tr>
        <td>${escapar(m.NomeUnidadeEscolar)}</td>
        <td>${escapar(m.NomeMunicipio)}</td>
        <td class="num">${m.AnoReferencia}</td>
        <td class="num">${fmtInt.format(m.MatriculasTotal)}</td>
        <td class="num">${fmtInt.format(m.Aprovados)}</td>
        <td class="num">${fmtInt.format(m.Reprovados)}</td>
        <td class="num">${fmtInt.format(m.Abandono)}</td>
        <td class="num">${fmtPct(m.taxaAprovacao)}</td>
        <td class="num">${abandonoRegistrado(m.AnoReferencia) ? fmtPct(m.taxaAbandono, 2) : "n/r"}</td>
      </tr>`).join("") : `<tr><td colspan="9" class="vazio">Nenhuma escola encontrada com esses filtros.</td></tr>`;

    document.querySelectorAll("#tabela th").forEach((th) => {
      const ativo = th.dataset.col === estado.ordenacao.col;
      th.classList.toggle("ordenado", ativo);
      th.classList.toggle("asc", ativo && estado.ordenacao.asc);
    });
    $("#sub-tabela").textContent = `${fmtInt.format(linhas.length)} registros (escola × ano) no recorte atual`;
    $("#pag-info").textContent = `Página ${estado.pagina} de ${paginas}`;
    $("#pag-ant").disabled = estado.pagina <= 1;
    $("#pag-prox").disabled = estado.pagina >= paginas;
  }

  function exportarCsv() {
    const cols = ["AnoReferencia", "NomeMunicipio", "NomeUnidadeEscolar", "MatriculasTotal", "MatriculaInicial", "MatriculaAposCenso",
      "Transferidos", "Cancelados", "Falecido", "Abandono", "Aprovados", "Reprovados", "Cursando", "OutrasSituacoes"];
    const q = (v) => /[",;\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v;
    const corpo = linhasTabela().map((m) => [...cols.map((c) => q(m[c])), m.taxaAprovacao ?? "", abandonoRegistrado(m.AnoReferencia) ? m.taxaAbandono ?? "" : ""].join(","));
    const csv = [[...cols, "TaxaAprovacao", "TaxaAbandono"].join(","), ...corpo].join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `matriculas_ms_${estado.municipio || "estado"}_${estado.ano ?? "todos"}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ---------- Tema ---------- */

  function alternarTema() {
    const raiz = document.documentElement;
    const escuroAgora = raiz.dataset.theme ? raiz.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    raiz.dataset.theme = escuroAgora ? "light" : "dark";
    try { localStorage.setItem("dac.tema", raiz.dataset.theme); } catch { /* sem storage */ }
    renderizarGraficos();
  }

  try { const t = localStorage.getItem("dac.tema"); if (t) document.documentElement.dataset.theme = t; } catch { /* sem storage */ }

  ligarEventos();
  carregar();
})();
