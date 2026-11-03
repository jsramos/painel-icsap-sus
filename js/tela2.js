import { P, iniciaPagina } from "./pagina.js";
import { busca } from "./dados.js";
import { linhas, paragrafos, esc } from "./formato.js";
import { tabRankingGrupos, tabEvolucao, tabMatriz } from "./tabelas.js";
import { naLargura } from "./graficos.js";
import { svgRankingGrupos } from "./barras.js";
import { svgPequenos } from "./pequenos.js";
import { htmlMatriz } from "./matriz.js";

const $ = (id) => document.getElementById(id);
const inicial = P.t2;
const nomeGrupo = new Map(linhas(P.grupos).map((g) => [g.grupo, g.nome]));
function porGrupo(rs) {
  const m = new Map();
  for (const r of rs) { if (!m.has(r.grupo)) m.set(r.grupo, []); m.get(r.grupo).push({ ano: r.ano, tp: r.tp }); }
  for (const s of m.values()) s.sort((a, b) => a.ano - b.ano);
  return m;
}
const evoUF = porGrupo(linhas(P.evolucao_uf));
const rankingDe = (t2) => linhas(t2.ranking).map((g) => ({ ...g, nome: nomeGrupo.get(g.grupo) }));
let vista = null;
let anoTextos = inicial.ano;
let anoMatriz = null;

let indiceMun = null;
async function municipio(id) {
  if (!indiceMun) {
    const ev = await busca("evolucao_municipios.json");
    const por = new Map();
    for (const [m, grupo, ano, tp] of ev.evolucao.linhas) { if (!por.has(m)) por.set(m, []); por.get(m).push({ grupo, ano, tp }); }
    indiceMun = { por, textos: ev.textos, cache: new Map() };
  }
  if (!indiceMun.cache.has(id)) indiceMun.cache.set(id, { serie: porGrupo(indiceMun.por.get(id) ?? []), textos: indiceMun.textos[id]?.textos ?? {} });
  return indiceMun.cache.get(id);
}

const redesenhaRanking = naLargura($("fig-ranking2"), (largura) => {
  if (vista) $("fig-ranking2").innerHTML = svgRankingGrupos(vista.rk, { largura, titulo: vista.t2.textos.ranking_titulo, dataBase: P.data_base });
});
const redesenhaEvolucao = naLargura($("fig-evolucao"), (largura) => {
  if (!vista) return;
  const tx = vista.t2.textos;
  $("fig-evolucao").innerHTML = svgPequenos(vista.rk, evoUF, { largura, ref: P.ano_referencia, pandemia: P.pandemia,
    titulo: tx.evolucao_titulo ?? tx.evolucao_subtitulo, mun: vista.mun });
});

function poe(id, html) { $(id).innerHTML = html; }
function titulo(id, t) { const no = $(id); no.textContent = t ?? ""; no.hidden = !t; }

function mostraAno(t2) {
  const tx = t2.textos, rk = rankingDe(t2);
  titulo("t2-ranking-titulo", tx.ranking_titulo);
  poe("t2-ranking-sub", esc(tx.ranking_subtitulo ?? ""));
  poe("t2-ranking-como", paragrafos(tx.ranking_como));
  poe("t2-ranking-nota", paragrafos(tx.nota_angina));
  poe("t2-ranking-tab", tabRankingGrupos(rk));
  titulo("t2-evolucao-titulo", tx.evolucao_titulo);
  poe("t2-evolucao-sub", esc(tx.evolucao_subtitulo ?? ""));
  poe("t2-evolucao-como", paragrafos(tx.evolucao_como));
  poe("t2-evolucao-nota", paragrafos(tx.nota_resp_alta));
  poe("t2-evolucao-tab", tabEvolucao(rk, evoUF, P.ano_referencia, t2.ano));
  titulo("t2-matriz-titulo", tx.matriz_titulo);
  poe("t2-matriz-sub", esc(tx.matriz_subtitulo ?? ""));
  poe("t2-matriz-como", paragrafos(tx.matriz_como));
  poe("t2-matriz-nota", paragrafos(tx.nota_resp_faixa));
  poe("t2-matriz-tab", tabMatriz(rk, linhas(t2.faixas), linhas(t2.matriz)));
}

const legenda = (t) => (t ?? "").split(" · ").map((parte, i) => esc(parte).replace(/^—/, `<span class="leg-traco ${i ? "leg-mun" : "leg-uf"}">—</span>`)).join(" · ");
function mostraMunicipio(m) {
  const av = $("t2-aviso"), lg = $("t2-evolucao-leg");
  av.hidden = lg.hidden = !m;
  av.textContent = m ? m.textos.aviso_municipio ?? "" : "";
  lg.innerHTML = m ? legenda(m.textos.legenda_municipio) : "";
}

async function desenha(estado, vigente) {
  const [t2, m] = await Promise.all([estado.ano === inicial.ano ? inicial : busca(`t2_${estado.ano}.json`), estado.mun ? municipio(estado.mun) : null]);
  if (!vigente()) return null;
  vista = { ano: estado.ano, t2, rk: rankingDe(t2), mun: m };
  if (estado.ano !== anoTextos) { mostraAno(t2); anoTextos = estado.ano; }
  if (estado.ano !== anoMatriz) { $("fig-matriz").innerHTML = htmlMatriz(t2, vista.rk, t2.textos.matriz_titulo); anoMatriz = estado.ano; }
  mostraMunicipio(m);
  $("vista").dataset.unidade = estado.mun ? `m:${estado.mun}` : "uf";
  redesenhaRanking();
  redesenhaEvolucao();
  return null;
}

iniciaPagina(desenha);
window.painelConfere = async () => { mostraAno(await busca(`t2_${inicial.ano}.json`)); anoTextos = inicial.ano; };
