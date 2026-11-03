import { criaEstado } from "./estado.js";
import { ligaFiltros } from "./filtros.js";
import { defineBase } from "./dados.js";

export const P = JSON.parse(document.getElementById("dados-pagina").textContent);
defineBase(P.base_dados);

export function iniciaPagina(desenha) {
  const E = criaEstado(P);
  const avisoEl = document.getElementById("aviso");
  const abas = [...document.querySelectorAll("nav.abas a")];
  let atual = null, seq = 0;
  let exibido = { ano: P.ano_ultimo, regiao: null, mun: null };
  const muda = (mudanca) => {
    const { estado } = E.coerente({ ...atual, ...mudanca });
    if (!E.igual(estado, atual)) aplica(estado, null, "push");
    else mostraFiltros(atual);
  };
  E.escolhe = muda;
  const mostraFiltros = ligaFiltros(E, muda);
  performance.mark("painel:filtros");
  const endereco = (e) => (e.ano === P.ano_ultimo && !e.regiao && !e.mun ? "" : E.paraEndereco(e));

  function marca(estado, modo) {
    atual = estado;
    mostraFiltros(estado);
    const q = endereco(estado);
    const url = `${location.pathname}${q}${location.hash}`;
    if (modo === "push") history.pushState(null, "", url);
    else if (q !== location.search) history.replaceState(null, "", url);
    for (const a of abas) a.search = q;
  }

  async function aplica(estado, avisoEndereco, modo) {
    marca(estado, modo);
    const n = ++seq;
    let aviso = null;
    try {
      aviso = await desenha(estado, () => n === seq, E);
      if (n === seq) exibido = estado;
    } catch (e) {
      console.error(e);
      if (n !== seq) return;
      marca(exibido, "corrige");
      aviso = "Não foi possível carregar os dados desta seleção; a página continua com a anterior. Verifique a conexão e tente de novo.";
    }
    if (n !== seq) return;
    const avisos = [avisoEndereco, aviso].filter(Boolean);
    avisoEl.textContent = avisos.join(" ");
    avisoEl.hidden = !avisos.length;
    const html = document.documentElement;
    html.classList.remove("carregando");
    html.dataset.vista = `${exibido.ano}|${exibido.regiao}|${exibido.mun}`;
    html.dataset.vistas = String(Number(html.dataset.vistas ?? 0) + 1);
    performance.mark("painel:vista");
    window.dispatchEvent(new CustomEvent("painel:vista", { detail: { ...exibido } }));
  }

  window.addEventListener("popstate", () => aplica(E.doEndereco(location.search).estado, null, "pop"));
  const { estado, aviso } = E.doEndereco(location.search);
  aplica(estado, aviso, "inicio");
  return E;
}
