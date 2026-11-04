import { fn, fp } from "./formato.js";
import { escala, marcas, el, largTexto, quebraLinhas } from "./graficos.js";

export const COMPACTO = 480;
const altura = (W) => (W < COMPACTO ? 220 : Math.round(Math.min(400, Math.max(240, W * 0.42))));
const linhas = (texto, larg) => quebraLinhas(texto, larg, 11.5);

function caixaAlto(texto, cx, x0, x1, px = 11.5) {
  const ls = linhas(texto, x1 - x0);
  const w = Math.max(...ls.map((l) => largTexto(l, px)));
  return { ls, w, c: Math.min(Math.max(cx, x0 + w / 2), x1 - w / 2) };
}
function rotuloAlto(texto, cx, cy, x0, x1, classe, conf) {
  const { ls, c } = caixaAlto(texto, cx, x0, x1);
  return el("text", { class: `g-texto ${classe}`, x: c, y: cy, "text-anchor": "middle", "data-conf": conf },
    ls.map((l, i) => el("tspan", { x: c, dy: i ? 13 : 0 }, l)).join(""));
}

function folgaAlto(vs, altos, h) {
  let ymin = 0;
  for (const a of altos) for (const r of vs) {
    if (Math.abs(r.cx - a.c) >= (r.w + a.w) / 2 + 2) continue;
    const livre = a.nivel - (9 + 13 * (a.ls.length - 1) + r.acima) / h;
    if (livre > 0) ymin = Math.max(ymin, r.v / livre);
  }
  return ymin;
}

function moldura(p, { W, H, m, x, y, ymax, anos, pandemia }) {
  const [p0, p1] = pandemia;
  p.push(el("rect", { class: "g-pandemia", x: x(p0 - 0.5), y: y(ymax), width: x(p1 + 0.5) - x(p0 - 0.5), height: y(0) - y(ymax) }));
  for (const v of marcas(ymax)) {
    p.push(el("line", { class: "g-grade", x1: m.e, x2: W - m.d, y1: y(v), y2: y(v) }));
    p.push(el("text", { class: "g-texto g-eixo", x: m.e - 6, y: y(v) + 4, "text-anchor": "end" }, fn(v)));
  }
  p.push(el("text", { class: "g-texto g-eixo", transform: `translate(14 ${(m.t + H - m.b) / 2}) rotate(-90)`, "text-anchor": "middle" },
    "por 10 mil SUS-dependentes"));
  p.push(el("text", { class: "g-texto g-pandemia-rot", x: x((p0 + p1) / 2), y: y(ymax * 0.955) + 4, "text-anchor": "middle" },
    `Pandemia (${p0}–${p1})`));
  const passo = W < 360 ? 2 : 1;
  anos.forEach((a, i) => {
    if ((anos.length - 1 - i) % passo === 0) p.push(el("text", { class: "g-texto g-eixo", x: x(a), y: H - m.b + 18, "text-anchor": "middle" }, String(a)));
  });
}

function linhaUF(p, ref, x, y) {
  p.push(el("polyline", { class: "g-linha-uf", points: ref.serie.map((r) => `${x(r.ano)},${y(r.tp)}`).join(" ") }));
}
function rotuloUF(p, ref, x, y, ult) {
  const u = ref.serie[ref.serie.length - 1];
  const sy = y(u.tp) + 4;
  let sx = x(u.ano) + 9;
  if (ult && Math.abs(sy - ult.base) < 13) sx = Math.max(sx, ult.c + ult.w / 2 + 4);
  p.push(el("text", { class: "g-texto g-uf-rot", x: sx, y: sy }, ref.sigla));
}

const svg = (W, H, titulo, p) => el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img", "aria-label": titulo }, el("title", {}, titulo) + p.join(""));

export function svgSerie(s, { largura, destaque, ref, pandemia, titulo, uf = null, quebras = [] }) {
  const W = largura, H = altura(W), compacto = W < COMPACTO;
  const m = { e: 62, d: uf ? 30 : 14, t: 12, b: 30 };
  const a0 = s[0].ano, a1 = s[s.length - 1].ano;
  const x = escala(a0 - 0.45, a1 + 0.45, m.e, W - m.d);
  const iMin = s.reduce((k, r, i) => (r.tp < s[k].tp ? i : k), 0);
  const anoMin = s[iMin].ano;
  const anos = [...new Set(compacto ? [a0, ref, a1] : [a0, ref, anoMin, a1, destaque])].filter((a) => s.some((r) => r.ano === a));
  const rots = anos.map((a) => {
    const r = s.find((z) => z.ano === a), abaixo = a === anoMin || a === ref, esquerda = a === ref && ref !== anoMin;
    const t = fp(r.tp, 1), w = largTexto(t, 12.5);
    return { a, r, t, w, abaixo, esquerda, c: esquerda ? x(a) - 4 - w / 2 : x(a) };
  });
  const topo = Math.max(...s.map((r) => r.sup), ...(uf ? uf.serie.map((r) => r.tp) : []));
  const h = H - m.b - m.t;
  const altos = [{ ...caixaAlto(`Pandemia (${pandemia[0]}–${pandemia[1]})`, x((pandemia[0] + pandemia[1]) / 2), -1e9, 1e9, 12), nivel: 0.955 },
    ...quebras.map((q) => ({ ...caixaAlto(q.texto, x(q.ano - 0.5), m.e, W - m.d), nivel: 0.855 }))];
  const ymax = Math.max(topo * (quebras.length ? 1.2 : 1.16),
    folgaAlto(rots.map((o) => ({ cx: o.c, w: o.w, v: o.r.tp, acima: o.abaixo ? -10 : 21 })), altos, h));
  const y = escala(0, ymax, H - m.b, m.t);
  const p = [];
  moldura(p, { W, H, m, x, y, ymax, anos: s.map((r) => r.ano), pandemia });
  if (uf) linhaUF(p, uf, x, y);
  for (const q of quebras) {
    p.push(el("line", { class: "g-quebra", x1: x(q.ano - 0.5), x2: x(q.ano - 0.5), y1: y(0), y2: y(ymax * 0.8) }));
    p.push(rotuloAlto(q.texto, x(q.ano - 0.5), y(ymax * 0.855) + 4, m.e, W - m.d, "g-marca-rot"));
  }
  const ic = s.map((r) => `${x(r.ano)},${y(r.sup)}`).concat([...s].reverse().map((r) => `${x(r.ano)},${y(r.inf)}`));
  p.push(el("polygon", { class: "g-ic", points: ic.join(" ") }));
  p.push(el("polyline", { class: "g-linha", points: s.map((r) => `${x(r.ano)},${y(r.tp)}`).join(" ") }));
  for (const r of s) {
    const dest = r.ano === destaque;
    p.push(el("circle", { class: dest ? "g-ponto-dest" : "g-ponto", cx: x(r.ano), cy: y(r.tp), r: dest ? 6 : 4.5,
      "data-ano": r.ano, "data-valor": fp(r.tp, 1) }, el("title", {}, `${r.ano}: ${fp(r.tp, 1)}`)));
  }
  for (const o of rots) {
    p.push(el("text", {
      class: `g-texto ${o.a === destaque ? "g-rotulo-dest" : "g-rotulo"}`,
      x: x(o.a) + (o.esquerda ? -4 : 0), y: y(o.r.tp) + (o.abaixo ? 20 : -11), "text-anchor": o.esquerda ? "end" : "middle",
    }, o.t));
  }
  if (uf) {
    const u = rots.find((o) => o.a === a1);
    rotuloUF(p, uf, x, y, u && { c: u.c, w: u.w, base: y(u.r.tp) + (u.abaixo ? 20 : -11) });
  }
  return svg(W, H, titulo, p);
}

export function svgSerieMun(s, { largura, destaque, ref, pandemia, titulo, uf, rot, faixa }) {
  const W = largura, H = altura(W), compacto = W < COMPACTO;
  const ok = (r) => !(r.marcas & 2) && r.tp != null;
  const so = s.filter(ok);
  const qq = s.filter((r) => r.marcas & 4);
  const semTaxa = s.filter((r) => r.marcas & 2).map((r) => r.ano);
  const mloc = s.filter((r) => r.marcas & 8);
  const temLeg = mloc.length > 0 && rot.d17;
  const m = { e: 62, d: 30, t: 12, b: temLeg ? 50 : 30 };
  const a0 = s[0].ano, a1 = s[s.length - 1].ano;
  const x = escala(a0 - 0.45, a1 + 0.45, m.e, W - m.d);
  let trecho = [], ant = null;
  const trechos = [];
  for (const r of s) {
    const novo = ant === null || (r.marcas & 4) || !ok(ant);
    if (novo && trecho.length) { trechos.push(trecho); trecho = []; }
    if (ok(r)) trecho.push(r);
    ant = r;
  }
  if (trecho.length) trechos.push(trecho);
  const ultTrecho = trechos[trechos.length - 1];
  const anosRot = !so.length ? new Set() :
    new Set(compacto ? [so[0].ano, ref, so[so.length - 1].ano] : [so[0].ano, ref, ultTrecho[0].ano, so[so.length - 1].ano, destaque]);
  const rots = so.filter((r) => anosRot.has(r.ano)).map((r) => { const t = fp(r.tp, 1); return { r, t, w: largTexto(t, 12.5), c: x(r.ano) }; });
  const topo = Math.max(...so.map((r) => r.sup), ...uf.serie.map((r) => r.tp));
  const rotFaixaLongo = qq.length >= faixa && rot.faixa && linhas(rot.faixa, W - m.d - m.e).length > 1;
  const h = H - m.b - m.t;
  const altos = [{ ...caixaAlto(`Pandemia (${pandemia[0]}–${pandemia[1]})`, x((pandemia[0] + pandemia[1]) / 2), -1e9, 1e9, 12), nivel: 0.955 }];
  if (qq.length >= faixa) {
    if (rot.faixa) altos.push({ ...caixaAlto(rot.faixa, (x(Math.min(...qq.map((r) => r.ano)) - 0.5) + x(Math.max(...qq.map((r) => r.ano)) - 0.5)) / 2, m.e, W - m.d), nivel: 0.855 });
  } else qq.forEach((r, i) => { if (rot.quebras[i]) altos.push({ ...caixaAlto(rot.quebras[i], x(r.ano - 0.5), m.e, W - m.d), nivel: 0.855 }); });
  const ymax = Math.max(topo * (qq.length >= faixa ? (rotFaixaLongo ? 1.45 : 1.32) : 1.2),
    folgaAlto(rots.map((o) => ({ cx: o.c, w: o.w, v: o.r.sup, acima: 17 })), altos, h));
  const y = escala(0, ymax, H - m.b, m.t);
  const p = [];
  moldura(p, { W, H, m, x, y, ymax, anos: s.map((r) => r.ano), pandemia });
  linhaUF(p, uf, x, y);
  if (semTaxa.length) {
    for (const a of semTaxa) p.push(el("rect", { class: "g-sem-taxa", x: x(a - 0.38), y: y(ymax * 0.07), width: x(a + 0.38) - x(a - 0.38), height: y(0) - y(ymax * 0.07) }));
    if (rot.semTaxa) p.push(rotuloAlto(rot.semTaxa, x(semTaxa.reduce((t, a) => t + a, 0) / semTaxa.length), y(ymax * 0.135) - 2, m.e, W - m.d, "g-marca-rot", "m/serie"));
  }
  if (qq.length >= faixa) {
    const x0 = x(Math.min(...qq.map((r) => r.ano)) - 0.5), x1 = x(Math.max(...qq.map((r) => r.ano)) - 0.5);
    p.push(el("rect", { class: "g-faixa-quebras", x: x0, y: y(ymax * 0.8), width: x1 - x0, height: y(0) - y(ymax * 0.8) }));
    for (const xx of [x0, x1]) p.push(el("line", { class: "g-quebra", x1: xx, x2: xx, y1: y(0), y2: y(ymax * 0.8) }));
    if (rot.faixa) p.push(rotuloAlto(rot.faixa, (x0 + x1) / 2, y(ymax * 0.855) + 4, m.e, W - m.d, "g-marca-rot", "m/serie"));
  } else qq.forEach((r, i) => {
    p.push(el("line", { class: "g-quebra", x1: x(r.ano - 0.5), x2: x(r.ano - 0.5), y1: y(0), y2: y(ymax * 0.8) }));
    if (rot.quebras[i]) p.push(rotuloAlto(rot.quebras[i], x(r.ano - 0.5), y(ymax * 0.855) + 4, m.e, W - m.d, "g-marca-rot", "m/serie"));
  });
  mloc.forEach((r, i) => {
    const cx = x(r.ano - 0.5), cy = y(ymax * 0.035), d = 5.5;
    p.push(el("path", { class: "g-d17", d: `M${cx} ${cy - d}L${cx + d} ${cy}L${cx} ${cy + d}L${cx - d} ${cy}Z` }, rot.notasD17[i] ? el("title", { "data-conf": "m/serie" }, rot.notasD17[i]) : ""));
  });
  if (temLeg) {
    const cx = m.e + 6, cy = H - 12, d = 5;
    p.push(el("path", { class: "g-d17", d: `M${cx} ${cy - d}L${cx + d} ${cy}L${cx} ${cy + d}L${cx - d} ${cy}Z` }));
    p.push(el("text", { class: "g-texto g-eixo", x: cx + 11, y: cy + 4, "data-conf": "m/serie" }, rot.d17));
  }
  for (const r of so) p.push(el("line", { class: "g-ic-barra", x1: x(r.ano), x2: x(r.ano), y1: y(r.inf), y2: y(r.sup) }));
  for (const t of trechos) if (t.length > 1) p.push(el("polyline", { class: "g-linha", points: t.map((r) => `${x(r.ano)},${y(r.tp)}`).join(" ") }));
  for (const r of so) {
    const dest = r.ano === destaque;
    p.push(el("circle", { class: `${dest ? "g-ponto-dest" : "g-ponto"}${r.marcas & 1 ? " g-instavel" : ""}`, cx: x(r.ano), cy: y(r.tp), r: dest ? 6 : 4.5,
      "data-ano": r.ano, "data-valor": fp(r.tp, 1) }, el("title", {}, `${r.ano}: ${fp(r.tp, 1)}`)));
  }
  for (const o of rots) {
    p.push(el("text", { class: `g-texto ${o.r.ano === destaque ? "g-rotulo-dest" : "g-rotulo"}`, x: o.c, y: y(o.r.sup) - 7, "text-anchor": "middle" }, o.t));
  }
  const u = rots[rots.length - 1];
  rotuloUF(p, uf, x, y, u && u.r.ano === a1 ? { c: u.c, w: u.w, base: y(u.r.sup) - 7 } : null);
  return svg(W, H, titulo, p);
}

export function rotulosMun(s, textos, faixa) {
  const lis = (v) => (v == null ? [] : Array.isArray(v) ? [...v] : [v]);
  const r = lis(textos.serie_rotulo), notas = lis(textos.serie_nota_d17);
  const nq = s.filter((z) => z.marcas & 4).length;
  const out = { quebras: [], faixa: null, semTaxa: null, d17: null, notasD17: notas };
  if (nq >= faixa) out.faixa = r.shift(); else out.quebras = r.splice(0, nq);
  if (s.some((z) => z.marcas & 2)) out.semTaxa = r.shift();
  if (s.some((z) => z.marcas & 8)) out.d17 = r.pop();
  const esperado = s.filter((z) => z.marcas & 8).length;
  return r.length <= 1 && notas.length === esperado && (nq === 0 || out.faixa || out.quebras.length === nq) ? out : null;
}
