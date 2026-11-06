import { esc, semAcento } from "./formato.js";

const MAX_OPCOES = 60;

export function ligaFiltros(E, pedido) {
  const fReg = document.getElementById("f-regiao");
  const fAno = document.getElementById("f-ano");
  const fMun = document.getElementById("f-mun");
  const lista = document.getElementById("f-mun-lista");
  const form = document.getElementById("filtros");
  const bFiltros = document.getElementById("b-filtros");
  const resumo = document.getElementById("resumo-txt");
  const nomeUF = document.getElementById("f-uf").selectedOptions[0].textContent;
  const painel = (abre) => { form.classList.toggle("aberto", abre); bFiltros.setAttribute("aria-expanded", String(abre)); };
  bFiltros.addEventListener("click", () => painel(!form.classList.contains("aberto")));
  const aoMudar = (mudanca) => { painel(false); pedido(mudanca); };
  const chave = new Map([...E.municipios.values()].map((m) => [m.id, semAcento(m.nome)]));
  const ordem = [...E.municipios.keys()];
  let atual = null;
  let opcoes = [];
  let sel = -1;

  fReg.addEventListener("change", () => aoMudar({ regiao: fReg.value || null, mun: null }));
  fAno.addEventListener("change", () => aoMudar({ ano: Number(fAno.value) }));

  function abre(texto = fMun.value) {
    const q = semAcento(texto.trim());
    const grupos = [[], [], [], []];
    for (const id of ordem) {
      const k = chave.get(id);
      const pos = !q || k.startsWith(q) ? 0 : k.includes(q) ? 1 : -1;
      if (pos < 0) continue;
      const dentro = !atual.regiao || E.municipios.get(id).reg === atual.regiao;
      if (dentro) grupos[pos].push(id); else if (q) grupos[2 + pos].push(id);
    }
    const nDentro = grupos[0].length + grupos[1].length;
    const achados = grupos.flat();
    opcoes = (q ? [] : [{ id: null, rotulo: "Todos" }]).concat(achados.slice(0, MAX_OPCOES).map((id, i) => {
      const m = E.municipios.get(id);
      return { id, rotulo: m.nome, regiao: i >= nDentro ? E.regioes.get(m.reg).nome : null };
    }));
    sel = q && opcoes.length ? 0 : -1;
    const mais = achados.length > MAX_OPCOES ? `<li class="vazio" aria-disabled="true">… e mais ${achados.length - MAX_OPCOES}; continue digitando</li>` : "";
    lista.innerHTML = opcoes.length
      ? opcoes.map((o, i) => `<li role="option" id="f-mun-op-${i}" data-i="${i}" aria-selected="${i === sel}">${esc(o.rotulo)}` +
        `${o.regiao ? ` <small>${esc(o.regiao)}</small>` : ""}</li>`).join("") + mais
      : `<li class="vazio" aria-disabled="true">Nenhum município com esse nome</li>`;
    lista.hidden = false;
    fMun.setAttribute("aria-expanded", "true");
    marca();
  }
  function fecha(restaura = true) {
    lista.hidden = true;
    fMun.setAttribute("aria-expanded", "false");
    fMun.removeAttribute("aria-activedescendant");
    if (restaura) fMun.value = atual.mun ? E.municipios.get(atual.mun).nome : "";
  }
  function marca() {
    for (const li of lista.querySelectorAll("li[role=option]")) li.setAttribute("aria-selected", String(Number(li.dataset.i) === sel));
    if (sel >= 0) {
      fMun.setAttribute("aria-activedescendant", `f-mun-op-${sel}`);
      document.getElementById(`f-mun-op-${sel}`)?.scrollIntoView({ block: "nearest" });
    } else fMun.removeAttribute("aria-activedescendant");
  }
  function escolhe(i) {
    const o = opcoes[i];
    fecha(false);
    if (!o) { fecha(); return; }
    fMun.value = o.id ? o.rotulo : "";
    aoMudar({ mun: o.id, regiao: o.id ? E.municipios.get(o.id).reg : atual.regiao });
  }

  fMun.addEventListener("focus", () => { fMun.select(); abre(""); });
  fMun.addEventListener("click", () => { if (lista.hidden) { fMun.select(); abre(""); } });
  fMun.addEventListener("input", () => abre());
  fMun.addEventListener("keydown", (ev) => {
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      ev.preventDefault();
      if (lista.hidden) { abre(); return; }
      const n = opcoes.length;
      if (n) { sel = ev.key === "ArrowDown" ? (sel + 1) % n : (sel - 1 + n) % n; marca(); }
    } else if (ev.key === "Enter") {
      ev.preventDefault();
      if (!lista.hidden && sel >= 0) escolhe(sel);
      else if (!fMun.value.trim()) { fecha(false); aoMudar({ mun: null, regiao: atual.regiao }); }
    } else if (ev.key === "Escape") { fecha(); }
  });
  lista.addEventListener("mousedown", (ev) => {
    const li = ev.target.closest("li[role=option]");
    ev.preventDefault();
    if (li) escolhe(Number(li.dataset.i));
  });
  fMun.addEventListener("blur", () => { if (!lista.hidden) fecha(); });

  return function mostra(e) {
    atual = e;
    fReg.value = e.regiao ?? "";
    fAno.value = String(e.ano);
    fecha();
    const onde = e.mun ? E.municipios.get(e.mun).nome : e.regiao ? E.regioes.get(e.regiao).nome : null;
    resumo.textContent = [nomeUF, e.ano, onde].filter(Boolean).join(" · ");
  };
}
