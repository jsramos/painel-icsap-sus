const milhar = (s) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export const fn = (x) => {
  const r = Math.round(x);
  return (r < 0 ? "-" : "") + milhar(String(Math.abs(r)));
};
export const fp = (x, d = 1) => x.toFixed(d).replace(".", ",");
export const fpC = (x, d = 1) => {
  const t = Math.abs(x) * 2 ** (d + 1);
  if (!Number.isInteger(t) || t % 2 === 0) return fp(x, d);
  const k = (Math.abs(x) * 10 ** d - 0.5), par = k % 2 === 0 ? k : k + 1;
  return (x < 0 ? "-" : "") + fp(par / 10 ** d, d);
};
export const fsn = (x, d = 1) => {
  const r = Number(x.toFixed(d));
  return (r > 0 ? "+" : r < 0 ? "−" : "") + fp(Math.abs(x), d);
};

export const esc = (s) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
export const escAttr = (s) => esc(s).replace(/"/g, "&quot;");
export const negrito = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");

export const lista = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
export const paragrafos = (v) => lista(v).map((t) => `<p>${negrito(t)}</p>`).join("");

export const linhas = (t) => t.linhas.map((l) => Object.fromEntries(t.colunas.map((c, i) => [c, l[i]])));

export const colador = new Intl.Collator("pt-BR");
export const semAcento = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
