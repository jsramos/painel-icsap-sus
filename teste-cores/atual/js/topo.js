export function leTopo(topo) {
  const [sx, sy] = topo.transform.scale, [tx, ty] = topo.transform.translate;
  const arcos = topo.arcs.map((a) => {
    let x = 0, y = 0;
    return a.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; });
  });
  const geoms = Object.values(topo.objects)[0].geometries.map((g) => ({
    id: g.id, r: g.properties.r,
    poligonos: g.type === "Polygon" ? [g.arcs] : g.type === "MultiPolygon" ? g.arcs : [],
  }));
  const lados = arcos.map(() => []);
  geoms.forEach((g, k) => { for (const p of g.poligonos) for (const anel of p) for (const i of anel) lados[i < 0 ? ~i : i].push(k); });
  const latm = ((topo.bbox[1] + topo.bbox[3]) / 2) * Math.PI / 180;
  return { arcos, geoms, lados, cos: Math.cos(latm), caixa: topo.bbox, porId: new Map(geoms.map((g, k) => [g.id, k])) };
}

export function enquadra(T, caixa, L = 2000) {
  const [lon0, lat0, lon1, lat1] = caixa;
  const k = L / ((lon1 - lon0) * T.cos);
  return { k, L, A: Math.round((lat1 - lat0) * k), x: (lon) => (lon - lon0) * T.cos * k, y: (lat) => (lat1 - lat) * k };
}

export function caixaDe(T, ks, folga = 0) {
  let a = [Infinity, Infinity, -Infinity, -Infinity];
  for (const k of ks) for (const p of T.geoms[k].poligonos) for (const anel of p) for (const i of anel) {
    for (const [lon, lat] of T.arcos[i < 0 ? ~i : i]) a = [Math.min(a[0], lon), Math.min(a[1], lat), Math.max(a[2], lon), Math.max(a[3], lat)];
  }
  const fx = (a[2] - a[0]) * folga, fy = (a[3] - a[1]) * folga;
  return [a[0] - fx, a[1] - fy, a[2] + fx, a[3] + fy];
}

function trecho(pts, pr, fecha) {
  let s = "", px = null, py = null;
  for (const [lon, lat] of pts) {
    const x = Math.round(pr.x(lon)), y = Math.round(pr.y(lat));
    if (px === null) s += `M${x} ${y}`;
    else if (x !== px || y !== py) s += `l${x - px} ${y - py}`;
    else continue;
    px = x; py = y;
  }
  return fecha ? `${s}z` : s;
}
const pontosArco = (T, i) => (i < 0 ? [...T.arcos[~i]].reverse() : T.arcos[i]);

export function caminhoMunicipio(T, k, pr) {
  let s = "";
  for (const p of T.geoms[k].poligonos) for (const anel of p) {
    const pts = [];
    anel.forEach((i, j) => { const a = pontosArco(T, i); pts.push(...(j ? a.slice(1) : a)); });
    s += trecho(pts, pr, true);
  }
  return s;
}

export function malha(T, grupo, pr) {
  let s = "";
  T.lados.forEach((ls, i) => {
    const g = ls.map(grupo);
    const entra = ls.length === 1 ? g[0] != null : g[0] !== g[1];
    if (entra) s += trecho(T.arcos[i], pr, false);
  });
  return s;
}
