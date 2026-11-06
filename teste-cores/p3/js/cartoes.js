import { esc } from "./formato.js";

export const htmlCartoes = (cs) => cs.map((k) =>
  `<div class="cartao" data-conf="cartao"><div class="rot">${esc(k.rotulo)}</div><div class="val">${esc(k.valor)}</div>` +
  `<div class="det">${esc(k.detalhe)}</div><div class="nota">${esc(k.nota)}</div></div>`).join("");
