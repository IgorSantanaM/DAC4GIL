import { useState } from "react";
import { Aviso, Kpis, Resumo } from "./componentes/Indicadores";
import { Cabecalho } from "./componentes/Cabecalho";
import { DialogoConfig } from "./componentes/DialogoConfig";
import { PainelFiltros } from "./componentes/PainelFiltros";
import { TabelaEscolas } from "./componentes/TabelaEscolas";
import { GraficoAprovacao } from "./componentes/graficos/GraficoAprovacao";
import { GraficoInsucesso } from "./componentes/graficos/GraficoInsucesso";
import { GraficoMatriculas } from "./componentes/graficos/GraficoMatriculas";
import { GraficoRanking } from "./componentes/graficos/GraficoRanking";
import { GraficoSituacao } from "./componentes/graficos/GraficoSituacao";
import { useFiltros } from "./hooks/useFiltros";
import { useMatriculas } from "./hooks/useMatriculas";
import { useTema } from "./hooks/useTema";

export default function App() {
  const { repo, fonte, carregar, adicionar } = useMatriculas();
  const { filtros, alterar, limpar, pagina, setPagina } = useFiltros(repo);
  const { escuro, alternar } = useTema();
  const [configAberta, setConfigAberta] = useState(false);
  const pronto = repo.todas.length > 0;

  return (
    <>
      <Cabecalho fonte={fonte} escuro={escuro} onAlternarTema={alternar} onAbrirConfig={() => setConfigAberta(true)} />
      <main>
        <PainelFiltros repo={repo} filtros={filtros} onAlterar={alterar} onLimpar={limpar} />
        {pronto && (
          <>
            <Aviso repo={repo} filtros={filtros} />
            <Resumo repo={repo} filtros={filtros} />
            <Kpis repo={repo} filtros={filtros} />
            <section className="grade">
              <GraficoAprovacao repo={repo} filtros={filtros} escuro={escuro} />
              <GraficoInsucesso repo={repo} filtros={filtros} escuro={escuro} />
              <GraficoMatriculas repo={repo} filtros={filtros} escuro={escuro} />
              <GraficoSituacao repo={repo} filtros={filtros} escuro={escuro} />
              <GraficoRanking repo={repo} filtros={filtros} escuro={escuro} />
            </section>
            <TabelaEscolas repo={repo} filtros={filtros} pagina={pagina} onPagina={setPagina} />
          </>
        )}
        <footer className="rodape">
          Fonte: Portal de Dados Abertos de MS —{" "}
          <a href="https://www.dados.ms.gov.br/dataset/matriculas-por-unidade-escolar" target="_blank" rel="noopener noreferrer">Matrículas por Unidade Escolar</a>.
          O portal não publicou o ano de 2025. Projeto DAC · 4º semestre · UCDB · ODS 4.
        </footer>
      </main>
      <DialogoConfig aberto={configAberta} onFechar={() => setConfigAberta(false)} onReconectar={carregar} onAdicionar={adicionar} />
    </>
  );
}
