import { fn, fp, fpC } from "./formato.js";
import { escala, marcas, el, largTexto, quebraLinhas } from "./graficos.js";
import { COMPACTO } from "./serie.js";

const EMPILHA = 640;
export function svgRankingGrupos(r, { largura, titulo, dataBase }) {
  const W = largura, emp = W < EMPILHA;
  const pains = [
    { id: "taxa", tit: "Taxa padronizada (por 10 mil SUS-dependentes)", v: (g) => g.tp, rot: (g) => fp(g.tp, 1), dv: (g) => fp(g.tp, 1), folga: 1.28 },
    { id: "gasto", tit: `Gasto (R$ milhões de ${dataBase} · % do total)`, v: (g) => g.val / 1e6, rot: (g) => `R$ ${fpC(g.val / 1e6, 1)} mi · ${fp(g.pct_val, 1)}%`, dv: (g) => fpC(g.val / 1e6, 1), folga: 1.62 },
  ];
  const p = [];
  const painel = (pn, x0, x1, y0, linha, alturaBarra, comNome) => {
    const max = Math.max(...r.map(pn.v));
    const larg = Math.max(...r.map((g) => largTexto(pn.rot(g), 11.5)));
    const xmax = emp ? max * (x1 - x0) / Math.max(40, x1 - x0 - larg - 8) : max * pn.folga;
    const x = escala(0, xmax, x0, x1);
    const pe = y0 + linha(r.length - 1) + alturaBarra / 2 + 8;
    p.push(el("text", { class: "g-texto g-painel-tit", x: x0, y: y0 - 10 }, pn.tit));
    for (const v of marcas(xmax, emp ? 3 : 4)) {
      p.push(el("line", { class: "g-grade", x1: x(v), x2: x(v), y1: y0, y2: pe }));
      const t = fn(v), mw = largTexto(t, 11) / 2 + 1;
      p.push(el("text", { class: "g-texto g-eixo", x: Math.min(Math.max(x(v), mw), W - mw), y: pe + 15, "text-anchor": "middle" }, t));
    }
    r.forEach((g, i) => {
      const yc = y0 + linha(i);
      if (comNome) comNome(g, yc);
      p.push(el("rect", { class: "g-barra", x: x(0), y: yc - alturaBarra / 2, width: Math.max(0, x(pn.v(g)) - x(0)), height: alturaBarra,
        "data-painel": pn.id, "data-grupo": g.grupo, "data-valor": pn.dv(g) }, el("title", {}, `${g.nome}: ${pn.rot(g)}`)));
      p.push(el("text", { class: "g-texto g-rotulo", x: x(pn.v(g)) + 5, y: yc + 4.5 }, pn.rot(g)));
    });
    return pe + 22;
  };
  let H;
  if (!emp) {
    const L = Math.min(230, Math.max(150, W * 0.22)), gap = 28, pw = (W - L - 12 - gap) / 2;
    const ls = r.map((g) => quebraLinhas(g.nome, L - 6, 12));
    const linha = (i) => i * 34 + 17;
    const y0 = 30;
    ls.forEach((l, i) => p.push(el("text", { class: "g-texto g-eixo-y", x: L, y: y0 + linha(i) + 4 - (l.length - 1) * 6.5, "text-anchor": "end" },
      l.map((t, k) => el("tspan", { x: L, dy: k ? 13 : 0 }, t)).join(""))));
    const x0 = L + 12;
    H = Math.max(painel(pains[0], x0, x0 + pw, y0, linha, 20), painel(pains[1], x0 + pw + gap, W - 4, y0, linha, 20));
  } else {
    const ls = r.map((g) => quebraLinhas(g.nome, W - 8, 12));
    const desl = [];
    let acc = 0;
    ls.forEach((l) => { desl.push(acc + l.length * 14 + 12); acc += l.length * 14 + 27; });
    const linha = (i) => desl[i];
    const nomes = (g, yc) => {
      const l = ls[r.indexOf(g)];
      p.push(el("text", { class: "g-texto g-eixo-y", x: 0, y: yc - 14 - (l.length - 1) * 14 }, l.map((t, k) => el("tspan", { x: 0, dy: k ? 14 : 0 }, t)).join("")));
    };
    let y = 30;
    for (const pn of pains) y = painel(pn, 0, W - 4, y, linha, 14, nomes) + 26;
    H = y - 26;
  }
  return el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img", "aria-label": titulo }, el("title", {}, titulo) + p.join(""));
}

export function svgFaixas(f, { largura, ref, titulo }) {
  const W = largura, compacto = W < COMPACTO, linha = compacto ? 44 : 34;
  const m = { e: 74, d: 14, t: 26, b: 40 };
  const H = m.t + f.length * linha + m.b;
  const xmax = Math.max(...f.map((r) => r.pct ?? 0), 1) * (compacto ? 1.08 : 1.42);
  const x = escala(0, xmax, m.e, W - m.d);
  const yc = (i) => m.t + (i + 0.5) * linha + (compacto ? 7 : 0);
  const p = [];
  for (const v of marcas(xmax, compacto ? 3 : 5)) {
    p.push(el("line", { class: "g-grade", x1: x(v), x2: x(v), y1: m.t - 6, y2: H - m.b }));
    p.push(el("text", { class: "g-texto g-eixo", x: x(v), y: H - m.b + 16, "text-anchor": "middle" }, `${fn(v)}%`));
  }
  p.push(el("text", { class: "g-texto g-eixo", x: (m.e + W - m.d) / 2, y: H - 6, "text-anchor": "middle" }, "% das internações da faixa (sem partos)"));
  p.push(el("text", { class: "g-texto g-eixo", transform: `translate(14 ${(m.t + H - m.b) / 2}) rotate(-90)`, "text-anchor": "middle" }, "Faixa etária (anos)"));
  if (ref) {
    p.push(el("line", { class: "g-ref", x1: x(ref.valor), x2: x(ref.valor), y1: m.t - 8, y2: H - m.b }));
    const dir = compacto && x(ref.valor) > W * 0.6;
    p.push(el("text", { class: "g-texto g-ref-rot", x: x(ref.valor) + (dir ? -4 : 4), y: m.t - 12, "text-anchor": dir ? "end" : "start" }, ref.rotulo));
  }
  f.forEach((r, i) => {
    const h = compacto ? 14 : linha * 0.42;
    const tem = r.pct != null;
    const rot = tem ? `${fp(r.pct, 1)}% · ${fn(r.icsap)}` : "—";
    p.push(el("text", { class: "g-texto g-eixo", x: m.e - 8, y: yc(i) + 4, "text-anchor": "end" }, r.faixa_etaria));
    if (tem) p.push(el("rect", { class: "g-barra", x: x(0), y: yc(i) - h / 2, width: Math.max(0, x(r.pct) - x(0)), height: h,
      "data-faixa": r.faixa_etaria, "data-valor": fp(r.pct, 1) }, el("title", {}, `${r.faixa_etaria}: ${fp(r.pct, 1)}%`)));
    if (compacto) p.push(el("text", { class: "g-texto g-rotulo", x: x(0) + 1, y: yc(i) - h / 2 - 5 }, rot));
    else p.push(el("text", { class: "g-texto g-rotulo", x: x(tem ? r.pct : 0) + 5, y: yc(i) + 4.5 }, rot));
  });
  return el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img", "aria-label": titulo }, el("title", {}, titulo) + p.join(""));
}
