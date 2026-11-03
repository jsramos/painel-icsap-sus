import { P, iniciaPagina } from "./pagina.js";
import { busca } from "./dados.js";
import { linhas, paragrafos, esc, fp, fsn, colador } from "./formato.js";
import { tabRankingMun, tabPares } from "./tabelas.js";
import { naLargura, ligaDica } from "./graficos.js";
import { criaRanking } from "./ranking.js";
import { svgPares, legendaPares } from "./pares.js";

const $ = (id) => document.getElementById(id);
const inicial = P.t3;
const portes = linhas(P.portes);
const nomePorte = new Map(portes.map((p) => [p.porte_ordem, p.porte]));
const ref = P.ano_referencia, nMin = P.n_minimo_estavel;
let ranking = null, E = null;
let anoTextos = inicial.ano;
let munAnterior = null, primeira = true;
let pares = null;

const quebraDepois = (a) => !!a && a.split(", ").some((x) => Number(x) > ref);
const rankingDe = (t3) => linhas(t3.ranking).map((r) => ({ ...r, q_janela: quebraDepois(r.anos_quebra) }));

function poe(id, html) { $(id).innerHTML = html; }
function titulo(id, t) { const no = $(id); no.textContent = t ?? ""; no.hidden = !t; }

function mostraAno(t3, rk) {
  const tx = t3.uf.textos;
  titulo("t3-ranking-titulo", tx.ranking_titulo);
  poe("t3-ranking-sub", esc(tx.ranking_subtitulo ?? ""));
  poe("t3-ranking-como", paragrafos(tx.ranking_como));
  poe("t3-ranking-nota", paragrafos(tx.nota_cauda));
  poe("t3-ranking-tab", tabRankingMun(rk, E, nomePorte, ref, nMin));
  const nl = rk.filter((r) => r.nota_local && t3.municipios?.[r.id_municipio]?.textos.nota_d17);
  poe("t3-ranking-d17", nl.length ? `<p>${nl.map((r) => `<b>${esc(E.municipios.get(r.id_municipio).nome)}:</b> ${esc(t3.municipios[r.id_municipio].textos.nota_d17)}`).join("<br>")}</p>` : "");
}

function convite(texto) {
  let h = esc(texto);
  const cont = new Map();
  for (const m of E.municipios.values()) cont.set(m.nome, (cont.get(m.nome) ?? 0) + 1);
  for (const m of E.municipios.values()) {
    if (cont.get(m.nome) !== 1) continue;
    const re = new RegExp(`(: |, | e )(${esc(m.nome).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}) \\((n[ao] )`);
    h = h.replace(re, (_, a, nome, b) => `${a}<a href="?mun=${m.id}" data-mun="${m.id}">${nome}</a> (${b}`);
  }
  return h;
}

function montaPares(t3, rk, id, ano) {
  const porId = new Map(rk.map((r) => [r.id_municipio, r]));
  const pg = t3.pares_grupos[t3.pares_municipio[id]];
  const todos = [...pg.membros, ...pg.membros_sem_taxa].map((m) => porId.get(m)).filter(Boolean);
  const nome = (r) => E.municipios.get(r.id_municipio).nome;
  const conf = todos.filter((r) => r.conf).sort((a, b) => b.tp - a.tp || colador.compare(nome(a), nome(b)));
  const sem = todos.filter((r) => !r.conf).sort((a, b) => colador.compare(nome(a), nome(b)));
  const pgc = P.pares_grandes, grande = conf.length > pgc.mais_de;
  const pos = conf.findIndex((r) => r.id_municipio === id);
  let un;
  if (pg.nivel === "macro") {
    const cm = linhas(t3.macro_municipio).find((r) => r.id_municipio === id).cod_macro;
    const mc = linhas(t3.macros).find((r) => r.cod_macro === cm);
    un = { rot: "Macrorregião (todos os portes)", tab: `${mc.nome} (todos os portes)`, tp: mc.tp };
  } else {
    const cr = E.municipios.get(id).reg;
    const nr = E.regioes.get(cr).nome, nomeRS = /^Região/.test(nr) ? nr : `Região de Saúde ${nr}`;
    un = { rot: "Região de Saúde (todos os portes)", tab: `${nomeRS} (todos os portes)`, tp: linhas(t3.regioes).find((r) => r.cod_regiao_saude === cr).tp };
  }
  const med = grande ? pg.mediana : null;
  const mostraVar = ano > ref;
  const motivo = (r) => t3.municipios[r.id_municipio]?.textos.motivo_frente_ref;
  const nota = (r) => (r.var_ref != null ? `frente a ${ref}: ${fsn(r.var_ref, 1)}%` : motivo(r) ? `frente a ${ref}: — (${motivo(r)})` : `frente a ${ref}: —`);
  const g = {
    grande,
    linhas: conf.map((r, i) => ({ id: r.id_municipio, nome: nome(r), tp: r.tp, inf: r.inf, sup: r.sup, instavel: r.instavel, destaque: i === pos,
      rotulo: !grande || Math.abs(i - pos) <= pgc.vizinhos, nota: mostraVar ? nota(r) : "" })),
    refs: [{ tipo: "uf", valor: t3.uf_tp, rot: `${P.uf}: ${fp(t3.uf_tp, 1)}` }, { tipo: "un", valor: un.tp, rot: `${un.rot}: ${fp(un.tp, 1)}` },
      ...(grande ? [{ tipo: "med", valor: med, rot: `Mediana do grupo: ${fp(med, 1)}` }] : [])],
  };
  const leg = [{ tipo: "uf", texto: `${P.uf} ${fp(t3.uf_tp, 1)}` }, { tipo: "un", texto: `${un.tab} ${fp(un.tp, 1)}` },
    ...(grande ? [{ tipo: "med", texto: `mediana do grupo ${fp(med, 1)}` }] : [])];
  return { g, leg, mostraVar, tab: tabPares([...conf, ...sem], E, un, { nome: P.nome_uf, tp: t3.uf_tp }, ref, nMin) };
}

function mostraPares(estado, t3, rk) {
  const corpo = $("t3-pares-corpo"), conv = $("t3-pares-convite"), sem = $("t3-pares-sem");
  const id = estado.mun, r = id ? rk.find((x) => x.id_municipio === id) : null;
  conv.hidden = !!id;
  if (!id) conv.innerHTML = convite(t3.uf.textos.pares_convite ?? "");
  sem.hidden = !(r && !r.conf);
  sem.textContent = r && !r.conf ? t3.municipios[id]?.textos.sem_comparacao ?? "" : "";
  corpo.hidden = !(r && r.conf);
  if (!(r && r.conf)) { pares = null; $("fig-pares").querySelector("svg")?.remove(); return; }
  const mt = t3.municipios[id].textos, mp = montaPares(t3, rk, id, estado.ano);
  titulo("t3-pares-titulo", mt.pares_titulo);
  poe("t3-pares-sub", esc(mt.pares_subtitulo ?? ""));
  poe("t3-pares-leg", legendaPares(mp.leg));
  poe("t3-pares-como", paragrafos(mt.pares_como));
  poe("t3-pares-exemplo", paragrafos(mt.pares_exemplo));
  poe("t3-pares-tab", mp.tab);
  pares = { g: mp.g, mostraVar: mp.mostraVar, titulo: mt.pares_titulo, linhaEm: null };
  redesenhaPares();
}
const redesenhaPares = naLargura($("fig-pares"), (largura) => {
  if (!pares) return;
  const fig = $("fig-pares"), { svg, linhaEm } = svgPares(pares.g, { largura, titulo: pares.titulo, mostraVar: pares.mostraVar });
  fig.querySelector("svg")?.remove();
  fig.insertAdjacentHTML("afterbegin", svg);
  pares.linhaEm = linhaEm;
});
ligaDica($("fig-pares"), (ev) => {
  const svg = $("fig-pares").querySelector("svg");
  if (!svg || !pares?.linhaEm) return null;
  const r = pares.linhaEm(ev.clientY - svg.getBoundingClientRect().top);
  return r ? `<b>${esc(r.nome)}</b> · ${fp(r.tp, 1)} (IC ${fp(r.inf, 1)}–${fp(r.sup, 1)})` : null;
});

async function desenha(estado, vigente, Est) {
  E = Est;
  if (!ranking) ranking = criaRanking($("fig-ranking3"), portes, E);
  const t3 = estado.ano === inicial.ano && !estado.mun ? inicial : await busca(`t3_${estado.ano}.json`);
  if (!vigente()) return null;
  const rk = rankingDe(t3);
  if (estado.ano !== anoTextos) { mostraAno(t3, rk); anoTextos = estado.ano; }
  const tx = t3.uf.textos;
  ranking({
    rk: rk.filter((r) => r.conf), uf: { sigla: P.uf, tp: t3.uf_tp }, titulo: tx.ranking_titulo,
    sel: { regiao: estado.regiao, mun: estado.mun, nome: estado.mun ? E.municipios.get(estado.mun).nome : null },
    legenda: [["r-sim-instavel", `Taxa instável (menos de ${nMin} ICSAP)`], ...(tx.legenda_d10 ? [["r-sim-quebra", tx.legenda_d10, "t3/legenda_d10"]] : []),
      ["r-sim-d8", tx.legenda_d8, "t3/legenda_d8"]],
  }, { rola: !primeira && estado.mun && estado.mun !== munAnterior });
  mostraPares(estado, t3, rk);
  $("vista").dataset.unidade = estado.mun ? `m:${estado.mun}` : estado.regiao ? `r:${estado.regiao}` : "uf";
  munAnterior = estado.mun; primeira = false;
  return null;
}

const Ep = iniciaPagina(desenha);
$("t3-pares-convite").addEventListener("click", (ev) => {
  const a = ev.target.closest("a[data-mun]");
  if (a) { ev.preventDefault(); Ep.escolhe({ mun: a.dataset.mun }); }
});
window.painelConfere = async () => { const t3 = await busca(`t3_${inicial.ano}.json`); mostraAno(t3, rankingDe(t3)); anoTextos = inicial.ano; };
