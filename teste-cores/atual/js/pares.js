import { esc, fn, fp } from "./formato.js";
import { escala, marcas, el, largTexto, medeTexto } from "./graficos.js";
import { COMPACTO } from "./serie.js";

function faixaRotulos(refs, x, x0, x1) {
  const rs = refs.map((r) => ({ ...r, px: x(r.valor), w: medeTexto(r.rot, 11.5) })).sort((a, b) => a.px - b.px);
  rs.forEach((r, i) => {
    const anc = rs.length === 1 || i === rs.length - 1 ? "start" : i === 0 ? "end" : "middle";
    const a = anc === "end" ? r.px - 4 - r.w : anc === "start" ? r.px + 4 : r.px - r.w / 2;
    r.a = Math.max(x0, Math.min(a, x1 - r.w));
    r.b = r.a + r.w;
  });
  const filas = [];
  for (const r of rs) {
    let f = 0;
    while (f < 2 && (filas[f] ?? []).some((o) => r.a < o.b + 8 && o.a < r.b + 8)) f++;
    (filas[f] ??= []).push(r);
    r.fila = f;
  }
  return rs;
}

export const legendaPares = (itens) => itens.map(({ tipo, texto }) =>
  `<span class="p-leg-item"><svg class="p-leg-traco" width="24" height="10" aria-hidden="true"><line class="p-ref-${tipo}" x1="1" x2="23" y1="5" y2="5"/></svg>${esc(texto)}</span>`)
  .join(`<span class="p-leg-sep"> · </span>`);

export function svgPares(g, { largura, titulo, mostraVar }) {
  const W = largura, cel = W < COMPACTO, L = g.linhas, p = [];
  const maxV = Math.max(...L.map((r) => r.sup), ...g.refs.map((r) => r.valor));
  let x0, x1, yT;
  const larguraNome = (r) => largTexto(r.nome, 12.5) * (r.destaque ? 1.08 : 1);
  if (cel) { x0 = 6; x1 = W - 6; }
  else {
    const nw = Math.min(W * 0.28, Math.max(...L.filter((r) => r.rotulo).map(larguraNome)) + 10);
    const vw = mostraVar ? Math.min(W * 0.3, Math.max(0, ...L.filter((r) => r.rotulo).map((r) => largTexto(r.nota, 11.5))) + 14) : 0;
    x0 = nw + 8; x1 = W - vw - 10;
  }
  const aoLado = g.grande || cel;
  const xmax = aoLado ? maxV * (x1 - x0) / Math.max(60, x1 - x0 - 40) : maxV * 1.06;
  const x = escala(0, xmax, x0, x1);
  const rots = cel ? [] : faixaRotulos(g.refs, x, x0, x1);
  const nf = rots.length ? Math.max(...rots.map((r) => r.fila)) + 1 : 0;
  const yFila = (f) => 4 + (f + 1) * 15 - 3;
  yT = nf ? yFila(nf - 1) + 10 : 6;
  const alt = (r) => (cel ? (r.rotulo ? (mostraVar ? 50 : 36) : 9) : g.grande ? 17 : 40);
  const ys = [];
  let acc = yT + (cel ? 4 : g.grande ? 6 : 18);
  for (const r of L) { const h = alt(r); ys.push({ y0: acc, h, yc: acc + (cel && r.rotulo ? 27 : h / 2) }); acc += h; }
  const yB = acc + 6;
  for (const v of marcas(xmax, cel ? 4 : 6)) {
    p.push(el("line", { class: "g-grade", x1: x(v), x2: x(v), y1: yT, y2: yB }));
    const t = fn(v), mw = largTexto(t, 11) / 2 + 1;
    p.push(el("text", { class: "g-texto g-eixo", x: Math.min(Math.max(x(v), mw), W - mw), y: yB + 15, "text-anchor": "middle" }, t));
  }
  p.push(el("text", { class: "g-texto g-eixo", x: (x0 + x1) / 2, y: yB + 32, "text-anchor": "middle" }, "Taxa padronizada por 10 mil SUS-dependentes (IC 95%)"));
  for (const r of g.refs) {
    const rr = rots.find((o) => o.tipo === r.tipo);
    p.push(el("line", { class: `p-ref-${r.tipo}`, x1: x(r.valor), x2: x(r.valor), y1: yB, y2: rr ? yFila(rr.fila) + 4 : yT }));
  }
  for (const r of rots) {
    p.push(el("rect", { class: "p-rot-fundo", x: r.a - 2, y: yFila(r.fila) - 11, width: r.w + 4, height: 15 }));
    p.push(el("text", { class: "g-texto g-ref-rot", x: r.a, y: yFila(r.fila) }, esc(r.rot)));
  }
  L.forEach((r, i) => {
    const { y0, yc } = ys[i];
    const cls = r.destaque ? "p-dest" : "";
    p.push(el("line", { class: `p-ic ${cls}`, x1: x(r.inf), x2: x(r.sup), y1: yc, y2: yc, "stroke-width": g.grande || (cel && !r.rotulo) ? 2 : 3 }));
    p.push(el("circle", { class: `p-pt ${cls}${r.instavel ? " g-instavel" : ""}`, cx: x(r.tp), cy: yc, r: g.grande || cel ? 3.6 : 5.5, "data-id": r.id, "data-valor": fp(r.tp, 1) }));
    if (!r.rotulo) return;
    const peso = r.destaque ? "g-rotulo-dest" : "g-rotulo";
    if (cel) {
      p.push(el("text", { class: `g-texto ${r.destaque ? "p-nome-dest" : "p-nome"}`, x: x0, y: y0 + 12 }, esc(r.nome)));
      if (mostraVar) p.push(el("text", { class: "g-texto p-nota", x: x0, y: y0 + 44 }, esc(r.nota)));
    } else {
      p.push(el("text", { class: `g-texto ${r.destaque ? "p-nome-dest" : "p-nome"}`, x: x0 - 10, y: yc + 4.5, "text-anchor": "end" }, esc(r.nome)));
      if (mostraVar) p.push(el("text", { class: "g-texto p-nota", x: x1 + 14, y: yc + 4 }, esc(r.nota)));
    }
    const txt = fp(r.tp, 1), tw = medeTexto(txt, 12.5, r.destaque ? "bold" : "normal");
    const tx = aoLado ? x(r.sup) + 6 : x(r.tp) - tw / 2, ty = aoLado ? yc + 4.5 : yc - 11;
    p.push(el("rect", { class: "p-rot-fundo", x: tx - 2, y: ty - 11, width: tw + 4, height: 15 }));
    p.push(el("text", { class: `g-texto ${peso}`, x: tx, y: ty }, txt));
  });
  const H = yB + 40;
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img", "aria-label": titulo }, el("title", {}, titulo) + p.join(""));
  const linhaEm = (yy) => { const k = ys.findIndex((o) => yy >= o.y0 && yy < o.y0 + o.h); return k < 0 ? null : L[k]; };
  return { svg, linhaEm };
}
