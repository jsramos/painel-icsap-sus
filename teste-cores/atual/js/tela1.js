import { P, iniciaPagina } from "./pagina.js";
import { busca } from "./dados.js";
import { linhas, lista, paragrafos, esc } from "./formato.js";
import { htmlCartoes } from "./cartoes.js";
import { tabSerie, tabSerieMun, tabMunicipios, tabFaixas } from "./tabelas.js";
import { naLargura, ligaValores } from "./graficos.js";
import { svgSerie, svgSerieMun, rotulosMun } from "./serie.js";
import { svgFaixas } from "./barras.js";
import { leTopo } from "./topo.js";
import { criaMapa } from "./mapa.js";

const $ = (id) => document.getElementById(id);
const serieUF = linhas(P.serie_uf);
const linhaUF = { serie: serieUF.map((r) => ({ ano: r.ano, tp: r.tp })), sigla: P.uf };
const inicial = P.t1;
const nomeFaixa = new Map(linhas(inicial.faixas).map((f) => [f.faixa_ordem, f.faixa_etaria]));
const SEM_ROTULOS = { quebras: [], faixa: null, semTaxa: null, d17: null, notasD17: [] };
const topoP = busca("municipios.topojson").then(leTopo);
let mapa = null;
let vista = null;

function refFaixas(cartoes) {
  const k = cartoes.find((c) => c.rotulo === "% ICSAP");
  const v = k ? Number(k.valor.replace("%", "").replace(",", ".")) : NaN;
  return Number.isFinite(v) ? { valor: v, rotulo: `todas as idades: ${k.valor}` } : null;
}
const faixasDe = (t, col, cod) => linhas(t).filter((r) => r[col] === cod).map((r) => ({ ...r, faixa_etaria: nomeFaixa.get(r.faixa_ordem) }));

function trocaSvg(fig, html) {
  fig.querySelector("svg")?.remove();
  fig.insertAdjacentHTML("afterbegin", html);
  const d = fig.querySelector(".dica-ponto");
  if (d) d.hidden = true;
}
const redesenhaSerie = naLargura($("fig-serie"), (largura) => {
  if (!vista) return;
  const o = { largura, destaque: vista.ano, ref: P.ano_referencia, pandemia: P.pandemia, titulo: vista.tituloSerie };
  trocaSvg($("fig-serie"), vista.tipo === "mun"
    ? svgSerieMun(vista.serie, { ...o, uf: linhaUF, rot: vista.rotulos, faixa: P.quebras_em_faixa })
    : svgSerie(vista.serie, { ...o, uf: vista.tipo === "regiao" ? linhaUF : null, quebras: vista.quebras ?? [] }));
});
const redesenhaFaixas = naLargura($("fig-faixa"), (largura) => {
  if (!vista) return;
  $("fig-faixa").innerHTML = svgFaixas(vista.faixas, { largura, ref: refFaixas(vista.cartoes), titulo: vista.tituloFaixa });
});
ligaValores($("fig-serie"));

function poe(id, html, conf) {
  const no = $(id);
  no.innerHTML = html;
  if (conf) no.dataset.conf = conf;
}

function montaVista(estado, t1, comum, municipal, E) {
  const tx = t1.uf.textos;
  const v = { chave: `${estado.ano}|${estado.regiao}|${estado.mun}`, ano: estado.ano, t1, tx };
  if (estado.mun) {
    const mu = municipal.municipios[estado.mun], mt = mu.textos;
    const s = linhas(comum.serie_municipios[estado.mun]);
    let rot = rotulosMun(s, mt, P.quebras_em_faixa);
    if (!rot) { console.warn(`Rótulos da série de ${estado.mun} não conferem com as marcas`); rot = SEM_ROTULOS; }
    Object.assign(v, { tipo: "mun", p: "m", cartoes: mu.cartoes, serie: s, rotulos: rot, faixas: faixasDe(t1.faixas_municipios, "id_municipio", estado.mun),
      tituloSerie: mt.titulo, subSerie: mt.serie_subtitulo, comoSerie: mt.serie_como, tabSerie: tabSerieMun(s, comum.n_minimo_estavel),
      tituloFaixa: mt.faixa_titulo, subFaixa: mt.faixa_subtitulo, comoFaixa: mt.faixa_como, elTitulo: "titulo" });
  } else if (estado.regiao) {
    const rg = t1.regioes[estado.regiao], rt = rg.textos;
    const s = linhas(comum.serie_regioes).filter((r) => r.cod_regiao_saude === estado.regiao);
    const quebras = lista(rt.serie_marca).map((z) => (typeof z === "string" ? { texto: z } : { texto: z.texto, ano: Number(z.valor) })).filter((q) => q.ano);
    Object.assign(v, { tipo: "regiao", p: "r", cartoes: rg.cartoes, serie: s, quebras, faixas: faixasDe(t1.faixas_regioes, "cod_regiao_saude", estado.regiao),
      tituloSerie: rt.serie_titulo, subSerie: rt.serie_subtitulo, comoSerie: rt.serie_como, tabSerie: tabSerie(s),
      tituloFaixa: rt.faixa_titulo, subFaixa: rt.faixa_subtitulo, comoFaixa: rt.faixa_como, elTitulo: "serie_titulo" });
  } else {
    Object.assign(v, { tipo: "uf", p: "t1", cartoes: t1.uf.cartoes, serie: serieUF, faixas: linhas(t1.faixas),
      tituloSerie: tx.serie_titulo_br, subSerie: tx.serie_subtitulo, comoSerie: tx.serie_como, tabSerie: tabSerie(serieUF),
      tituloFaixa: tx.faixa_titulo, subFaixa: tx.faixa_subtitulo, comoFaixa: tx.faixa_como, elTitulo: "serie_titulo_br" });
  }
  return v;
}

function mostra(v, E) {
  const p = v.p, tx = v.tx;
  $("vista").dataset.unidade = v.tipo === "uf" ? "uf" : `${p}:${v.tipo === "mun" ? v.chave.split("|")[2] : v.chave.split("|")[1]}`;
  $("t1-cartoes").innerHTML = htmlCartoes(v.cartoes);
  poe("t1-serie-titulo", esc(v.tituloSerie ?? ""), `${p}/${v.elTitulo}`);
  poe("t1-serie-sub", esc(v.subSerie ?? ""), `${p}/serie_subtitulo`);
  poe("t1-serie-como", paragrafos(v.comoSerie), `${p}/serie_como`);
  poe("t1-serie-tab", v.tabSerie, `${p}/tab_serie`);
  poe("t1-mapa-titulo", esc(tx.mapa_titulo));
  poe("t1-mapa-sub", esc(tx.mapa_subtitulo));
  poe("t1-mapa-como", paragrafos(tx.mapa_como));
  poe("t1-mapa-nota", paragrafos(tx.nota_leitos));
  poe("t1-mapa-tab", tabMunicipios(linhas(v.t1.municipios), E.municipios, E.regioes));
  poe("t1-faixa-titulo", esc(v.tituloFaixa ?? ""), `${p}/faixa_titulo`);
  poe("t1-faixa-sub", esc(v.subFaixa ?? ""), `${p}/faixa_subtitulo`);
  poe("t1-faixa-como", paragrafos(v.comoFaixa), `${p}/faixa_como`);
  poe("t1-faixa-tab", tabFaixas(v.faixas), `${p}/tab_faixas`);
}

function mostraMapa(estado, t1, E, vigente) {
  topoP.then((T) => {
    if (!vigente()) return;
    if (!mapa) mapa = criaMapa(T, P, E, { aoEscolher: (id) => E.escolhe({ mun: id }) });
    mapa(t1, estado, t1.uf.textos.mapa_titulo);
  }).catch((e) => console.error(e));
}

async function desenha(estado, vigente, E) {
  const tipo = estado.mun ? "mun" : estado.regiao ? "regiao" : "uf";
  const chave = `${estado.ano}|${estado.regiao}|${estado.mun}`;
  const t1P = tipo === "uf" && estado.ano === inicial.ano ? inicial : busca(`t1_${estado.ano}.json`);
  const [t1, comum, municipal] = await Promise.all([t1P, tipo === "uf" ? null : busca("comum.json"),
    tipo === "mun" ? busca(`municipal_${estado.ano}.json`) : null]);
  if (!vigente()) return null;
  const pronta = !vista && chave === `${inicial.ano}|null|null`;
  vista = montaVista(estado, t1, comum, municipal, E);
  if (!pronta) mostra(vista, E);
  redesenhaSerie();
  redesenhaFaixas();
  mostraMapa(estado, t1, E, vigente);
  return null;
}

const E = iniciaPagina(desenha);
window.painelConfere = async () => {
  const t1 = await busca(`t1_${inicial.ano}.json`);
  mostra(montaVista({ ano: inicial.ano, regiao: null, mun: null }, t1, null, null, E), E);
};
