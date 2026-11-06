const cache = new Map();
let base = null;

export const defineBase = (relativa) => { base = new URL(relativa, window.location.href); };

export function busca(arquivo) {
  if (!cache.has(arquivo)) {
    const p = fetch(new URL(arquivo, base))
      .then((r) => { if (!r.ok) throw new Error(`${arquivo}: HTTP ${r.status}`); return r.json(); })
      .catch((e) => { cache.delete(arquivo); throw e; });
    cache.set(arquivo, p);
  }
  return cache.get(arquivo);
}
