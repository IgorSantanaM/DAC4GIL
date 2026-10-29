import type { Fonte } from "../hooks/useMatriculas";

interface Props {
  fonte: Fonte;
  escuro: boolean;
  onAlternarTema: () => void;
  onAbrirConfig: () => void;
}

export function Cabecalho({ fonte, onAlternarTema, onAbrirConfig }: Props) {
  return (
    <header className="topo">
      <div className="topo-titulo">
        <span className="ods-selo" aria-hidden="true">4</span>
        <div>
          <h1>Educação de Qualidade em MS</h1>
          <p>Aprovação e abandono na rede estadual · 2018–2026</p>
        </div>
      </div>
      <div className="topo-acoes">
        <span id="fonte-dados" className={`pill ${fonte.tipo === "carregando" ? "" : fonte.tipo}`} title={fonte.dica}>{fonte.texto}</span>
        <button id="btn-tema" className="btn-icone" type="button" aria-label="Alternar tema claro/escuro" onClick={onAlternarTema}>◐</button>
        <button id="btn-config" className="btn" type="button" onClick={onAbrirConfig}>Backend &amp; importação</button>
      </div>
    </header>
  );
}
