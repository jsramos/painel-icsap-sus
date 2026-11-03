import { esc, fn, fp } from "./formato.js";
import { escala, marcas, el, medeTexto, ligaDica } from "./graficos.js";

const CELULAR = "(max-width: 767px)";
const ALTURA = 280;

function svgPorte(rs, { largura, ymax, uf, rotuloUF, sel, regDe, titulo }) {
  const W = largura, H = ALTURA, m = { e: 34, d: 4, t: 10, b: 6 };
  const n = rs.length;
  const x = escala(-1, n + 2, m.e, W - m.d), y = escala(0, ymax, H - m.b, m.t);
  const passo = (W - m.e - m.d) / (n + 3);
  const p = [];
  for (const v of marcas(ymax, 3)) {
    p.push(el("line", { class: "g-grade", x1: m.e, x2: W - m.d, y1: y(v), y2: y(v) }));
    p.push(el("text", { class: "g-texto g-eixo", x: m.e - 5, y: y(v) + 4, "text-anchor": "end" }, fn(v)));
  }
  p.push(el("line", { class: "g-ref", x1: m.e, x2: W - m.d, y1: y(uf.tp), y2: y(uf.tp) }));
  const k = sel.mun ? rs.findIndex((r) => r.id_municipio === sel.mun) : -1;
  const dest = k < 0 ? null : (() => {
    const r = rs[k], cx = x(k + 1), rot = `${sel.nome}: ${fp(r.tp, 1)}`, w = medeTexto(rot, 12.5, "bold");
    return { r, cx, rot, w, tx: Math.min(Math.max(cx, m.e + w / 2 + 2), W - m.d - w / 2 - 2), ty: Math.max(m.t + 12, y(r.sup) - 9 - (r.q_janela ? 10 : 0)) };
  })();
  if (rotuloUF) {
    const t = `${uf.sigla}: ${fp(uf.tp, 1)}`, wu = medeTexto(t, 11.5);
    const cruza = (x0, b) => dest && b - 9 < dest.ty + 5 && dest.ty - 12 < b + 3 && x0 < dest.tx + dest.w / 2 + 2 && dest.tx - dest.w / 2 - 2 < x0 + wu;
    const lugares = [[x(1), y(uf.tp) - 5], [W - m.d - 2 - wu, y(uf.tp) - 5], [x(1), y(uf.tp) + 14], [W - m.d - 2 - wu, y(uf.tp) + 14]];
    const [lx, ly] = lugares.find(([x0, b]) => !cruza(x0, b)) ?? lugares[0];
    p.push(el("text", { class: "g-texto g-ref-rot g-halo", x: lx, y: ly }, t));
  }
  const esm = (r) => sel.regiao && regDe(r.id_municipio) !== sel.regiao;
  const largIC = Math.max(0.6, Math.min(2.2, passo * 0.55)), rp = Math.max(1.3, Math.min(2.4, passo * 0.45));
  const ic = [], pts = [], mk = [];
  rs.forEach((r, i) => {
    const cx = x(i + 1), c = esm(r) ? " r-esm" : "", naReg = sel.regiao && !c;
    ic.push(el("line", { class: `r-ic${c}`, x1: cx, x2: cx, y1: y(r.inf), y2: y(r.sup), "stroke-width": largIC }));
    pts.push(el("circle", { class: `r-pt${c}`, cx, cy: y(r.tp), r: naReg ? Math.max(2.6, rp * 1.5) : rp, "data-id": r.id_municipio, "data-valor": fp(r.tp, 1) }));
    if (r.instavel) mk.push(el("circle", { class: `r-instavel${c}`, cx, cy: y(r.tp), r: 3.4 }));
    if (r.q_janela) { const ty = y(r.sup + ymax * 0.035); mk.push(el("path", { class: `r-quebra${c}`, d: `M${cx - 3.6} ${ty - 3}L${cx + 3.6} ${ty - 3}L${cx} ${ty + 3.4}Z` })); }
  });
  p.push(ic.join(""), pts.join(""), mk.join(""));
  if (dest) {
    const { r, cx } = dest;
    p.push(el("line", { class: "r-ic-dest", x1: cx, x2: cx, y1: y(r.inf), y2: y(r.sup) }));
    p.push(el("circle", { class: `r-pt-dest${r.instavel ? " g-instavel" : ""}`, cx, cy: y(r.tp), r: 4.6 }));
    p.push(el("text", { class: "g-texto g-rotulo-dest g-halo", x: dest.tx, y: dest.ty, "text-anchor": "middle" }, esc(dest.rot)));
  }
  return el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img", "aria-label": titulo }, el("title", {}, titulo) + p.join(""));
}
export function criaRanking(fig, portes, E) {
  const regDe = (id) => E.municipios.get(id).reg;
  fig.innerHTML = `<div class="r-eixo">por 10 mil SUS-dependentes</div><div class="r-portes">${portes.map((p) =>
    `<details class="r-porte" data-porte="${p.porte_ordem}" open><summary><span class="r-porte-nome">${esc(p.porte)}</span> <span class="r-porte-n"></span></summary><div class="r-fig"></div></details>`).join("")}` +
    `<div class="r-legenda"></div></div><div class="r-eixo r-eixo-x">Municípios em ordem decrescente de taxa, dentro de cada porte (residentes)</div>`;
  const paineis = [...fig.querySelectorAll("details.r-porte")];
  const celular = window.matchMedia(CELULAR);
  let v = null;
  const desenha = (d) => {
    if (!v || !d.open) return;
    const alvo = d.querySelector(".r-fig"), w = Math.round(alvo.clientWidth);
    if (!w) return;
    const rs = v.porPorte.get(Number(d.dataset.porte)) ?? [];
    alvo.dataset.largura = w;
    alvo.querySelector("svg")?.remove();
    alvo.insertAdjacentHTML("afterbegin", svgPorte(rs, { largura: w, ymax: v.ymax, uf: v.uf, rotuloUF: celular.matches || d === paineis[0], sel: v.sel, regDe, titulo: `${v.titulo} (${d.querySelector(".r-porte-nome").textContent})` }));
  };
  const desenhaTodos = () => paineis.forEach(desenha);
  new ResizeObserver(() => requestAnimationFrame(() => {
    for (const d of paineis) { const a = d.querySelector(".r-fig"); if (d.open && Math.round(a.clientWidth) !== Number(a.dataset.largura)) desenha(d); }
  })).observe(fig);
  for (const d of paineis) {
    d.addEventListener("toggle", () => desenha(d));
    d.querySelector("summary").addEventListener("click", (ev) => { if (!celular.matches) ev.preventDefault(); });
    const alvo = d.querySelector(".r-fig");
    ligaDica(alvo, (ev) => {
      const svg = alvo.querySelector("svg");
      if (!svg || !v) return null;
      const rs = v.porPorte.get(Number(d.dataset.porte)) ?? [];
      const b = svg.getBoundingClientRect(), w = b.width, n = rs.length;
      const i = Math.round(((ev.clientX - b.left - 34) / (w - 38)) * (n + 3) - 1) - 1;
      const r = rs[Math.max(0, Math.min(n - 1, i))];
      if (!r || ev.clientX - b.left < 30) return null;
      return `<b>${esc(E.municipios.get(r.id_municipio).nome)}</b> · ${fp(r.tp, 1)} (IC ${fp(r.inf, 1)}–${fp(r.sup, 1)})`;
    });
  }
  const abre = (forcar) => {
    const pm = v?.portePorMun;
    for (const d of paineis) {
      const deve = !celular.matches || (pm != null && Number(d.dataset.porte) === pm);
      if (forcar || !celular.matches) d.open = deve;
    }
  };
  celular.addEventListener("change", () => { abre(true); desenhaTodos(); });

  return function atualiza(vista, { rola = false } = {}) {
    const porPorte = new Map(portes.map((p) => [p.porte_ordem, []]));
    for (const r of vista.rk) porPorte.get(r.porte_ordem)?.push(r);
    const ymax = Math.max(...vista.rk.map((r) => r.sup)) * 1.08;
    const pm = vista.sel.mun ? vista.rk.find((r) => r.id_municipio === vista.sel.mun)?.porte_ordem ?? null : null;
    const mudouMun = v?.sel.mun !== vista.sel.mun;
    v = { porPorte, ymax, uf: vista.uf, sel: vista.sel, titulo: vista.titulo, portePorMun: pm };
    for (const d of paineis) d.querySelector(".r-porte-n").textContent = `(${porPorte.get(Number(d.dataset.porte)).length})`;
    fig.querySelector(".r-legenda").innerHTML = vista.legenda.map(([cl, t, conf]) => `<div class="r-leg-item"><span class="r-leg-sim ${cl}"></span><span${conf ? ` data-conf="${conf}"` : ""}>${esc(t).replace(/\n/g, "<br>")}</span></div>`).join("");
    abre(mudouMun);
    desenhaTodos();
    if (rola && celular.matches && pm != null) fig.querySelector(`details.r-porte[data-porte="${pm}"]`).scrollIntoView({ behavior: "smooth", block: "start" });
  };
}
