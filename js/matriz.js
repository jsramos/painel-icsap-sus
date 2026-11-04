import { esc, escAttr, fpC, linhas } from "./formato.js";
import { amostra, el } from "./graficos.js";

export const rotTaxa = (v) => (v === 0 ? "0" : v < 0.05 ? "<0,1" : fpC(v, 1));

const bloco = (k) => el("svg", { class: "mz-bloco", viewBox: "0 0 10 10", preserveAspectRatio: "none", "aria-hidden": "true", focusable: "false" },
  el("rect", { class: `mz-cor c${k}`, width: 10, height: 10 }));

export function htmlMatriz(t2, grupos, titulo) {
  const fx = linhas(t2.faixas);
  const cel = new Map(linhas(t2.matriz).map((c) => [`${c.grupo}|${c.faixa_ordem}`, c]));
  const cab = `<tr><th class="mz-canto" scope="col"></th>${fx.map((f) => `<th scope="col">${esc(f.faixa_etaria)}</th>`).join("")}</tr>`;
  const corpo = grupos.map((g) => `<tr><th scope="row">${esc(g.nome)}</th>${fx.map((f) => {
    const c = cel.get(`${g.grupo}|${f.faixa_ordem}`);
    return `<td class="mz c${c.classe}" data-grupo="${g.grupo}" data-faixa="${escAttr(f.faixa_etaria)}" data-valor="${escAttr(rotTaxa(c.taxa))}">${bloco(c.classe)}<span class="mz-num">${esc(rotTaxa(c.taxa))}</span></td>`;
  }).join("")}</tr>`).join("");
  const mc = t2.matriz_classes;
  const it = (cl, rot) => `<span class="m-leg-item" data-conf="t2/matriz_classes">${amostra(`m-leg-cor mz-leg ${cl}`)}${esc(rot)}</span>`;
  return `<div class="mz-eixo">Faixa etária (anos)</div><div class="mz-rolagem"><table class="matriz" aria-label="${escAttr(titulo)}"><thead>${cab}</thead><tbody>${corpo}</tbody></table></div>` +
    `<div class="m-legenda"><span class="m-leg-tit">Taxa específica por 10 mil</span>${it("c0", mc.rotulo_zero)}${mc.rotulos.map((r, i) => it(`c${i + 1}`, r)).join("")}</div>`;
}
