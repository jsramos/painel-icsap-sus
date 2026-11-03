import { escAttr } from "./formato.js";

export const escala = (d0, d1, r0, r1) => (x) => r0 + ((x - d0) / (d1 - d0)) * (r1 - r0);

export const largTexto = (s, px) => s.length * px * 0.55;
let ctxMede = null;
export function medeTexto(s, px, peso = "normal") {
  ctxMede ??= document.createElement("canvas").getContext("2d");
  ctxMede.font = `${peso} ${px}px Arial, Helvetica, sans-serif`;
  return ctxMede.measureText(s).width;
}

export function quebraLinhas(texto, larg, px) {
  const out = [];
  for (const l of texto.split("\n")) {
    let cur = "";
    for (const w of l.split(" ")) {
      const t = cur ? `${cur} ${w}` : w;
      if (cur && largTexto(t, px) > larg) { out.push(cur); cur = w; } else cur = t;
    }
    out.push(cur);
  }
  return out;
}

export function ligaDica(fig, achar) {
  const dica = document.createElement("div");
  dica.className = "m-dica";
  dica.hidden = true;
  fig.style.position = "relative";
  fig.appendChild(dica);
  const mostra = (ev) => {
    const h = achar(ev);
    if (!h) { dica.hidden = true; return; }
    dica.innerHTML = h;
    dica.hidden = false;
    const b = fig.getBoundingClientRect();
    const x = Math.min(ev.clientX - b.left + 12, b.width - dica.offsetWidth - 4);
    dica.style.left = `${Math.max(4, x)}px`;
    dica.style.top = `${ev.clientY - b.top + 14}px`;
  };
  fig.addEventListener("pointermove", (ev) => { if (ev.pointerType === "mouse") mostra(ev); });
  fig.addEventListener("pointerleave", () => { dica.hidden = true; });
  fig.addEventListener("click", mostra);
  return dica;
}

export function marcas(max, n = 4) {
  const bruto = max / n, pot = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * pot).find((p) => p >= bruto * 0.85) ?? 10 * pot;
  const out = [];
  for (let v = 0; v <= max + 1e-9; v += passo) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

export const el = (nome, at = {}, filhos = "") =>
  `<${nome}${Object.entries(at).filter(([, v]) => v != null && v !== false).map(([k, v]) => ` ${k}="${escAttr(v)}"`).join("")}>${filhos}</${nome}>`;

export function ligaValores(fig) {
  const dica = document.createElement("div");
  dica.className = "dica-ponto";
  dica.hidden = true;
  fig.style.position = "relative";
  fig.appendChild(dica);
  fig.addEventListener("click", (ev) => {
    const pts = [...fig.querySelectorAll("circle[data-ano]")];
    if (!pts.length) return;
    const b = fig.getBoundingClientRect();
    const perto = pts.reduce((a, c) => { const r = c.getBoundingClientRect(); const d = Math.abs(r.left + r.width / 2 - ev.clientX); return d < a.d ? { c, d, r } : a; }, { d: Infinity });
    if (perto.d > 40) { dica.hidden = true; return; }
    dica.textContent = `${perto.c.dataset.ano}: ${perto.c.dataset.valor}`;
    dica.hidden = false;
    dica.style.left = `${perto.r.left + perto.r.width / 2 - b.left}px`;
    dica.style.top = `${perto.r.top - b.top - 8}px`;
  });
}

export function naLargura(alvo, desenha) {
  let largura = 0;
  const vez = () => {
    const w = Math.round(alvo.clientWidth);
    if (w > 0 && w !== largura) { largura = w; desenha(w); }
  };
  vez();
  new ResizeObserver(() => requestAnimationFrame(vez)).observe(alvo);
  return () => { largura = 0; vez(); };
}
