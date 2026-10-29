import { useCallback, useEffect, useState } from "react";

const CHAVE = "dac.tema";
const consulta = () => window.matchMedia("(prefers-color-scheme: dark)");

/** Aplica o tema salvo antes do primeiro render, para não piscar. */
export function aplicarTemaSalvo(): void {
  try {
    const t = localStorage.getItem(CHAVE);
    if (t) document.documentElement.dataset.theme = t;
  } catch { /* sem storage */ }
}

/** `escuro` muda quando o usuário alterna o tema ou o sistema muda; os gráficos usam isso para recalcular as cores. */
export function useTema() {
  const [escuro, setEscuro] = useState(() => {
    const t = document.documentElement.dataset.theme;
    return t ? t === "dark" : consulta().matches;
  });

  useEffect(() => {
    const mq = consulta();
    const aoMudar = () => { if (!document.documentElement.dataset.theme) setEscuro(mq.matches); };
    mq.addEventListener("change", aoMudar);
    return () => mq.removeEventListener("change", aoMudar);
  }, []);

  const alternar = useCallback(() => {
    const novo = escuro ? "light" : "dark";
    // Define antes do setState: os gráficos leem as variáveis CSS durante o render seguinte.
    document.documentElement.dataset.theme = novo;
    try { localStorage.setItem(CHAVE, novo); } catch { /* sem storage */ }
    setEscuro(novo === "dark");
  }, [escuro]);

  return { escuro, alternar };
}
