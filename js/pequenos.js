import { fp } from "./formato.js";
import { escala, marcas, el, quebraLinhas } from "./graficos.js";

const colunas = (W) => (W >= 900 ? 5 : W >= 600 ? 3 : 2);
const casas = (ts) => (ts.some((v) => Math.abs(v * 10 - Math.round(v * 10)) > 1e-6) ? 2 : 1);

export function svgPequenos(grupos, uf, { largura, ref, pandemia, titulo, mun = null }) {
  const W = largura, nc = colunas(W), gx = W < 600 ? 12 : 18, gy = 18;
  const pw = (W - (nc - 1) * gx) / nc;
  const tits = grupos.map((g) => quebraLinhas(g.nome, pw - 4, 11.5));
  const tH = Math.max(...tits.map((l) => l.length)) * 13 + 4;
  const m = { e: 30, d: 6, t: tH + 16, b: 20 };
  const ph = W < 600 ? 104 : 118;
  const qH = m.t + ph + m.b;
  const topo = 18;
  const anos = [...new Set([...uf.values()].flat().map((r) => r.ano))].sort((a, b) => a - b);
  const a0 = anos[0], a1 = anos[anos.length - 1];
  const marcasX = [a0, ref, pandemia[1], a1].filter((a, i, v) => v.indexOf(a) === i);
  const p = [el("text", { class: "g-texto g-eixo", x: 0, y: 11 }, "por 10 mil SUS-dependentes")];
  grupos.forEach((g, k) => {
    const ox = (k % nc) * (pw + gx), oy = topo + Math.floor(k / nc) * (qH + gy);
    const su = uf.get(g.grupo) ?? [], sm = mun ? (mun.serie.get(g.grupo) ?? []) : [];
    const foco = mun ? sm : su;
    const vals = [...su, ...sm].map((r) => r.tp).filter((v) => v != null);
    const ymax = Math.max(...vals, 0.1) * 1.25;
    const x = escala(a0 - 0.6, a1 + 0.6, ox + m.e, ox + pw - m.d), y = escala(0, ymax, oy + m.t + ph, oy + m.t);
    const q = [];
    q.push(el("text", { class: "g-texto g-quadro-tit", x: ox, y: oy + 11 }, tits[k].map((t, i) => el("tspan", { x: ox, dy: i ? 13 : 0 }, t)).join("")));
    q.push(el("rect", { class: "g-pandemia", x: x(pandemia[0] - 0.5), y: y(ymax), width: x(pandemia[1] + 0.5) - x(pandemia[0] - 0.5), height: y(0) - y(ymax) }));
    const ts = marcas(ymax, 4).filter((v) => v <= ymax);
    const cs = casas(ts);
    for (const v of ts) {
      q.push(el("line", { class: "g-grade", x1: ox + m.e, x2: ox + pw - m.d, y1: y(v), y2: y(v) }));
      q.push(el("text", { class: "g-texto g-eixo g-eixo-p", x: ox + m.e - 4, y: y(v) + 3.5, "text-anchor": "end" }, fp(v, cs)));
    }
    for (const a of marcasX) q.push(el("text", { class: "g-texto g-eixo g-eixo-p", x: x(a), y: oy + m.t + ph + 14, "text-anchor": "middle" }, String(a)));
    const trechos = (s) => s.reduce((acc, r) => { if (r.tp == null) acc.push([]); else acc[acc.length - 1].push(r); return acc; }, [[]]).filter((t) => t.length);
    const linha = (s, classe, so) => { for (const t of trechos(s)) q.push(t.length > 1 ? el("polyline", { class: classe, points: t.map((r) => `${x(r.ano)},${y(r.tp)}`).join(" ") }) : el("circle", { class: so, cx: x(t[0].ano), cy: y(t[0].tp), r: 1.6 })); };
    if (mun) linha(su, "g-linha-uf", "g-linha-uf-so");
    linha(foco, "g-linha g-linha-p", "g-linha-so");
    for (const r of foco) {
      if (r.tp == null) continue;
      const rot = r.ano === ref || r.ano === a1;
      q.push(el("circle", rot ? { class: "g-ponto g-ponto-p", cx: x(r.ano), cy: y(r.tp), r: 3, "data-grupo": g.grupo, "data-ano": r.ano, "data-valor": fp(r.tp, 1) }
        : { class: "g-alvo", cx: x(r.ano), cy: y(r.tp), r: 5 }, el("title", {}, `${r.ano}: ${fp(r.tp, 1)}`)));
      if (rot) q.push(el("text", { class: "g-texto g-rotulo-p", x: x(r.ano), y: y(r.tp) - 7, "text-anchor": "middle" }, fp(r.tp, 1)));
    }
    p.push(el("g", { "data-grupo": g.grupo }, q.join("")));
  });
  const H = topo + Math.ceil(grupos.length / nc) * (qH + gy) - gy;
  return el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img", "aria-label": titulo }, el("title", {}, titulo) + p.join(""));
}
