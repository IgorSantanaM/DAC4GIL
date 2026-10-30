import { useEffect, useRef, useState } from "react";
import { lerCsv } from "../dominio/csv";
import { fmtInt } from "../dominio/formatar";
import type { DadosBrutos } from "../dominio/matricula";
import { ApiDAC, ErroApi } from "../servicos/apiDac";

interface Props {
  aberto: boolean;
  onFechar: () => void;
  onReconectar: () => Promise<"carregando" | "api" | "local">;
  onAdicionar: (lista: DadosBrutos[]) => number;
}

export function DialogoConfig({ aberto, onFechar, onReconectar, onAdicionar }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("");
  const [statusImport, setStatusImport] = useState("");

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (aberto && !dlg.open) { setUrl(ApiDAC.url); dlg.showModal(); }
    if (!aberto && dlg.open) dlg.close();
  }, [aberto]);

  async function reconectar() {
    ApiDAC.url = url.trim() || ApiDAC.urlPadrao;
    setStatus("Conectando…");
    const tipo = await onReconectar();
    setStatus(tipo === "api" ? "Conectado à API." : "API não respondeu — usando dados locais.");
  }

  async function importar() {
    const arquivo = arquivoRef.current?.files?.[0];
    if (!arquivo) { setStatusImport("Selecione um arquivo CSV."); return; }
    let linhas: DadosBrutos[], novas: number;
    try {
      linhas = lerCsv(await arquivo.text());
      novas = onAdicionar(linhas);
    } catch (e) {
      setStatusImport("CSV inválido: " + (e as Error).message);
      return;
    }
    const anos = [...new Set(linhas.map((l) => Number(l.AnoReferencia)))].sort((a, b) => a - b);
    let msgApi: string;
    try {
      await ApiDAC.importarCsv(arquivo);
      msgApi = "enviado à API (o banco é atualizado em segundo plano)";
    } catch (e) {
      const erro = e as ErroApi;
      msgApi = erro.status !== 409 ? `API não recebeu (${erro.message})`
        : anos.length === 1 ? `a API não importou porque o banco já tem dados de ${anos[0]}`
          : `a API não importou porque o banco já tem dados de pelo menos um destes anos: ${anos.join(", ")}`;
    }
    setStatusImport(`${fmtInt(novas)} registros novos no painel; ${msgApi}.`);
  }

  return (
    <dialog id="dlg-config" ref={ref} onClose={onFechar}>
      <form method="dialog" className="dlg">
        <h2>Backend &amp; importação</h2>
        <label className="campo">
          <span>URL da API (opcional)</span>
          <input id="cfg-url" type="url" placeholder="Vazio = mesma origem (proxy)" value={url} onChange={(e) => setUrl(e.target.value)} />
        </label>
        <p className="sub">
          Deixe vazio para usar o proxy (Vite em desenvolvimento, nginx em produção), que repassa <code>/api</code> ao backend.
          O painel lê <code>GET /api/matriculas/get-metrics</code>; se a API não responder, usa a cópia local dos CSVs oficiais.
        </p>
        <div className="dlg-linha">
          <button id="cfg-testar" className="btn" type="button" onClick={reconectar}>Salvar e reconectar</button>
          <span id="cfg-status" className="sub">{status}</span>
        </div>
        <hr />
        <label className="campo">
          <span>Importar CSV do portal</span>
          <input id="cfg-arquivo" ref={arquivoRef} type="file" accept=".csv,text/csv" />
        </label>
        <p className="sub">O arquivo é enviado para <code>POST /api/matriculas/import-csv</code> e também incluído no painel imediatamente.</p>
        <div className="dlg-linha">
          <button id="cfg-importar" className="btn" type="button" onClick={importar}>Importar</button>
          <span id="cfg-import-status" className="sub">{statusImport}</span>
        </div>
        <div className="dlg-rodape"><button className="btn btn-fantasma" value="fechar">Fechar</button></div>
      </form>
    </dialog>
  );
}
