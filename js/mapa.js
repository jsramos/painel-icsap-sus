import { esc, fp, fn } from "./formato.js";
import { enquadra, caixaDe, caminhoMunicipio, malha } from "./topo.js";
import { el, naLargura, medeTexto } from "./graficos.js";

const $ = (id) => document.getElementById(id);

function naProporcao(T, caixa, prop) {
  const [x0, y0, x1, y1] = caixa;
  const w = (x1 - x0) * T.cos, h = y1 - y0;
  if (h / w > prop) { const nw = h / prop / T.cos, cx = (x0 + x1) / 2; return [cx - nw / 2, y0, cx + nw / 2, y1]; }
  const nh = w * prop, cy = (y0 + y1) / 2;
  return [x0, cy - nh / 2, x1, cy + nh / 2];
}

export function criaMapa(T, P, E, { aoEscolher }) {
  const idsRM = new Set(P.destaque ? P.destaque.ids : []);
  const ksUF = T.geoms.map((_, k) => k);
  const ksRM = ksUF.filter((k) => idsRM.has(T.geoms[k].id));
  const pontos = P.pontos;

  function monta(alvo, ks, caixa, rotulo) {
    const pr = enquadra(T, caixa);
    const dentro = new Set(ks);
    const regiao = (k) => (dentro.has(k) ? T.geoms[k].r : null);
    const rm = (k) => (dentro.has(k) && idsRM.has(T.geoms[k].id) ? 1 : null);
    const muns = ks.map((k) => el("path", { class: "m-mun", "data-id": T.geoms[k].id, d: caminhoMunicipio(T, k, pr) })).join("");
    alvo.innerHTML = el("svg", { viewBox: `0 0 ${pr.L} ${pr.A}`, role: "img", "aria-label": rotulo, preserveAspectRatio: "xMidYMid meet" },
      el("g", { class: "m-muns" }, muns) + el("g", { class: "m-sobre" }) +
      el("path", { class: "m-reg", d: malha(T, regiao, pr) }) + (idsRM.size ? el("path", { class: "m-rm", d: malha(T, rm, pr) }) : "") +
      el("g", { class: "m-topo" }));
    const svg = alvo.querySelector("svg");
    return { alvo, svg, pr, dentro, caixa, vb: [0, 0, pr.L, pr.A], caminhos: new Map([...svg.querySelectorAll("path.m-mun")].map((p) => [p.dataset.id, p])) };
  }
  const mapas = [monta($("mapa-estado"), ksUF, T.caixa, "Mapa do estado")];
  if (ksRM.length && $("mapa-destaque")) mapas.push(monta($("mapa-destaque"), ksRM, caixaDe(T, ksRM, 0.02), `Destaque: ${P.destaque.nome}`));
  const prop = mapas[0].pr.A / mapas[0].pr.L;

  let dados = null, vista = null;

  function sobre(m) {
    const u = m.vb[2] / Math.max(1, m.svg.clientWidth || m.alvo.clientWidth);
    const de = (k) => caminhoMunicipio(T, k, m.pr);
    const noMapa = (id) => m.caminhos.has(id);
    let baixo = "", alto = "";
    for (const [id, r] of dados) if (r.d8 && noMapa(id)) baixo += el("path", { class: "m-d8", d: de(T.porId.get(id)) });
    for (const [id, r] of dados) if (r.instavel && noMapa(id) && pontos[id]) {
      const [lon, lat] = pontos[id];
      alto += el("circle", { class: "m-instavel", cx: m.pr.x(lon), cy: m.pr.y(lat), r: (m === mapas[0] ? 3.2 : 4) * u, "stroke-width": u });
    }
    const daRegiao = (k) => (m.dentro.has(k) && T.geoms[k].r === vista.regiao ? 1 : null);
    if (vista.regiao && !vista.mun) alto += el("path", { class: "m-dest", d: malha(T, daRegiao, m.pr) });
    if (vista.mun && noMapa(vista.mun)) {
      const k = T.porId.get(vista.mun);
      alto += el("path", { class: "m-dest-reg", d: malha(T, daRegiao, m.pr) });
      alto += el("path", { class: "m-dest", d: de(k) });
      const [lon, lat] = pontos[vista.mun];
      const nome = E.municipios.get(vista.mun).nome, nw = medeTexto(nome, 12.5, "bold") * u;
      const nx = m.pr.x(lon), ny = m.pr.y(lat) - 9 * u;
      alto += el("rect", { class: "m-rotulo-fundo", x: nx - nw / 2 - 4 * u, y: ny - 12 * u, width: nw + 8 * u, height: 16 * u, rx: 3 * u });
      alto += el("text", { class: "g-texto m-rotulo", x: nx, y: ny, "text-anchor": "middle", "font-size": 12.5 * u }, esc(nome));
    }
    m.svg.querySelector("g.m-sobre").innerHTML = baixo;
    m.svg.querySelector("g.m-topo").innerHTML = alto;
  }

  function enquadramento(m) {
    let vb = [0, 0, m.pr.L, m.pr.A];
    if (m === mapas[0] && vista.regiao && !vista.mun) {
      const ks = E.regioes.get(vista.regiao).muns.map((id) => T.porId.get(id)).filter((k) => k != null);
      const [lon0, lat0, lon1, lat1] = naProporcao(T, caixaDe(T, ks, 0.08), prop);
      vb = [m.pr.x(lon0), m.pr.y(lat1), m.pr.x(lon1) - m.pr.x(lon0), m.pr.y(lat0) - m.pr.y(lat1)].map(Math.round);
    }
    m.vb = vb;
    m.svg.setAttribute("viewBox", vb.join(" "));
  }

  const legenda = (mc) => {
    if (mc.unico) return "";
    const it = (cor, rot) => `<span class="m-leg-item" data-conf="t1/mapa_classes"><span class="m-leg-cor ${cor}"></span>${esc(rot)}</span>`;
    return `<span class="m-leg-tit">Taxa padronizada por 10 mil</span>` + mc.rotulos.map((r, i) => it(`c${i + 1}`, r)).join("") +
      it("d8", mc.rotulo_d8) + `<span class="m-leg-item" data-conf="t1/mapa_classes"><span class="m-leg-ponto"></span>${esc(mc.rotulo_instavel)}</span>`;
  };

  const caixaFig = $("fig-mapa");
  const dica = $("mapa-dica"), cartao = $("mapa-cartao");
  const taxaTxt = (r) => (r.d8 || r.tp == null ? "—" : `${fp(r.tp, 1)} por 10 mil`);
  const internTxt = (r) => (r.pop_sus === 0 && r.n_icsap === 0 ? null
    : `${fn(r.n_icsap)} ${r.n_icsap === 1 ? "internação" : "internações"} (ICSAP) em ${vista.ano}`);
  const marcasTxt = (r) => [r.d8 ? "denominador não confiável" : null, r.instavel ? `taxa instável (menos de ${P.n_minimo_estavel} ICSAP)` : null].filter(Boolean);
  const posiciona = (no, ev) => {
    const b = caixaFig.getBoundingClientRect();
    const x = Math.min(ev.clientX - b.left + 12, b.width - no.offsetWidth - 4), y = ev.clientY - b.top + 12;
    no.style.left = `${Math.max(4, x)}px`; no.style.top = `${y}px`;
  };
  const fechaCartao = () => { cartao.hidden = true; };
  for (const m of mapas) {
    m.svg.addEventListener("pointermove", (ev) => {
      const p = ev.target.closest("path.m-mun");
      if (ev.pointerType !== "mouse" || !p || !dados) { dica.hidden = true; return; }
      const r = dados.get(p.dataset.id);
      dica.innerHTML = `<b>${esc(E.municipios.get(p.dataset.id).nome)}</b> · ${esc(taxaTxt(r))}`;
      dica.hidden = false;
      posiciona(dica, ev);
    });
    m.svg.addEventListener("pointerleave", () => { dica.hidden = true; });
    m.svg.addEventListener("click", (ev) => {
      const p = ev.target.closest("path.m-mun");
      if (!p || !dados) { fechaCartao(); return; }
      const id = p.dataset.id, r = dados.get(id);
      dica.hidden = true;
      cartao.innerHTML = `<button type="button" class="m-fecha" aria-label="Fechar">×</button><b>${esc(E.municipios.get(id).nome)}</b>` +
        `<div>Taxa padronizada: ${esc(taxaTxt(r))}</div>` + (internTxt(r) ? `<div>${esc(internTxt(r))}</div>` : "") + marcasTxt(r).map((t) => `<div class="m-marca">${esc(t)}</div>`).join("") +
        (vista.mun === id ? "" : `<button type="button" class="m-ver" data-id="${id}">Ver município</button>`);
      cartao.hidden = false;
      posiciona(cartao, ev);
      ev.stopPropagation();
    });
  }
  cartao.addEventListener("click", (ev) => {
    if (ev.target.closest(".m-fecha")) fechaCartao();
    const b = ev.target.closest(".m-ver");
    if (b) { fechaCartao(); aoEscolher(b.dataset.id); }
  });
  document.addEventListener("click", (ev) => { if (!cartao.hidden && !cartao.contains(ev.target) && !ev.target.closest("#fig-mapa svg")) fechaCartao(); });
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") fechaCartao(); });

  const redesenha = naLargura($("fig-mapa"), () => { if (dados) for (const m of mapas) sobre(m); });

  return function atualiza(t1, estado, titulo) {
    dados = new Map(t1.municipios.linhas.map((l) => { const o = Object.fromEntries(t1.municipios.colunas.map((c, i) => [c, l[i]])); return [o.id_municipio, o]; }));
    vista = estado;
    for (const m of mapas) {
      for (const [id, p] of m.caminhos) {
        const r = dados.get(id);
        const cl = !r ? "" : t1.mapa_classes.unico ? "c3" : r.d8 || r.classe == null ? "d8" : `c${r.classe}`;
        const esm = estado.regiao && !estado.mun && E.municipios.get(id).reg !== estado.regiao;
        p.setAttribute("class", `m-mun ${cl}${esm ? " m-esm" : ""}`);
      }
      enquadramento(m);
    }
    mapas[0].svg.setAttribute("aria-label", titulo);
    $("mapa-legenda").innerHTML = legenda(t1.mapa_classes);
    fechaCartao();
    redesenha();
    $("fig-mapa").dataset.vista = `${estado.ano}|${estado.regiao}|${estado.mun}`;
    performance.mark("painel:mapa");
  };
}
