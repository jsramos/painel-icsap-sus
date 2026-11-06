import { esc, fn, fp, fpC, fsn } from "./formato.js";
import { rotTaxa } from "./matriz.js";

export function tabela(cab, linhas, alinha) {
  const th = cab.map((c, j) => `<th class="${alinha[j]}" scope="col">${esc(c)}</th>`).join("");
  const tr = linhas.map((l) => `<tr>${l.map((v, j) => `<td class="${alinha[j]}">${esc(v)}</td>`).join("")}</tr>`).join("");
  return `<table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
}

export const tabSerie = (s) => tabela(
  ["Ano", "ICSAP", "SUS-dependentes", "Taxa bruta", "Taxa padronizada", "IC 95%"],
  s.map((r) => [String(r.ano), fn(r.n_icsap), fn(r.pop_sus), fp(r.taxa_bruta, 1), fp(r.tp, 1), `${fp(r.inf, 1)}–${fp(r.sup, 1)}`]),
  ["e", "d", "d", "d", "d", "d"]);

export const tabMunicipios = (t, municipios, regioes) => tabela(
  ["Município", "Região de Saúde", "ICSAP", "SUS-dependentes", "Taxa padronizada", "Sinal"],
  t.map((r) => {
    const m = municipios.get(r.id_municipio);
    return [m.nome, regioes.get(m.reg).nome, fn(r.n_icsap), fn(r.pop_sus), r.tp == null ? "—" : fp(r.tp, 1),
      r.d8 ? "denominador não confiável" : r.instavel ? "taxa instável" : ""];
  }),
  ["e", "e", "d", "d", "d", "e"]);

export const tabSerieMun = (s, nMin) => tabela(
  ["Ano", "ICSAP", "SUS-dependentes", "Variação dos SUS-dependentes", "Taxa padronizada (IC 95%)", "Marcas"],
  s.map((r) => {
    const ok = !(r.marcas & 2) && r.tp != null;
    const mk = [r.marcas & 2 ? "denominador não confiável" : null,
      r.marcas & 4 ? `quebra de série (de ${r.ano - 1} para ${r.ano})` : null,
      r.marcas & 8 ? `mudança na internação local (de ${r.ano - 1} para ${r.ano})` : null,
      r.marcas & 1 ? `taxa instável (menos de ${nMin} ICSAP)` : null].filter(Boolean).join("; ");
    return [String(r.ano), fn(r.n_icsap), fn(r.pop_sus), r.var_ps == null ? "" : `${fsn(r.var_ps, 1)}%`,
      ok ? `${fp(r.tp, 1)} (${fp(r.inf, 1)}–${fp(r.sup, 1)})` : "—", mk];
  }),
  ["e", "d", "d", "d", "d", "e"]);

export const tabFaixas = (f) => tabela(
  ["Faixa etária", "ICSAP", "Internações (sem partos)", "% ICSAP"],
  f.map((r) => [r.faixa_etaria, fn(r.icsap), fn(r.total), r.pct == null ? "—" : `${fp(r.pct, 1)}%`]),
  ["e", "d", "d", "d"]);

const nomeG = (g) => `${g.grupo} ${g.nome}`;
export const tabRankingGrupos = (r) => tabela(
  ["Posição", "Grupo", "ICSAP", "% das ICSAP", "Taxa bruta", "Taxa padronizada (IC 95%)", "Gasto (R$ mi)", "% do gasto", "Gasto por internação (R$)"],
  r.map((g, i) => [String(i + 1), nomeG(g), fn(g.n_icsap), `${fp(g.pct_n, 1)}%`, fp(g.taxa_bruta, 1), `${fp(g.tp, 1)} (${fp(g.inf, 1)}–${fp(g.sup, 1)})`,
    fpC(g.val / 1e6, 1), `${fp(g.pct_val, 1)}%`, fn(g.medio)]),
  ["d", "e", "d", "d", "d", "d", "d", "d", "d"]);

export function tabEvolucao(r, evo, ref, ano) {
  const anos = [...new Set([...evo.values()].flat().map((e) => e.ano))].sort((a, b) => a - b);
  const comVar = ano > ref;
  return tabela(["Grupo", ...anos.map(String), ...(comVar ? [`${ref}→${ano}`] : [])],
    r.map((g) => { const s = new Map((evo.get(g.grupo) ?? []).map((e) => [e.ano, e.tp])); return [nomeG(g), ...anos.map((a) => fp(s.get(a), 1)), ...(comVar ? [`${fsn(g.var_ref_pct, 1)}%`] : [])]; }),
    ["e", ...anos.map(() => "d"), ...(comVar ? ["d"] : [])]);
}

export function tabMatriz(r, faixas, matriz) {
  const cel = new Map(matriz.map((c) => [`${c.grupo}|${c.faixa_ordem}`, c]));
  return tabela(["Grupo", ...faixas.map((f) => f.faixa_etaria)],
    [...r.map((g) => [nomeG(g), ...faixas.map((f) => { const c = cel.get(`${g.grupo}|${f.faixa_ordem}`); return `${rotTaxa(c.taxa)} (${fn(c.n)})`; })]),
      ["SUS-dependentes da faixa", ...faixas.map((f) => fn(f.pop_sus))]],
    ["e", ...faixas.map(() => "d")]);
}

const icTxt = (r) => (r.conf && r.tp != null ? `${fp(r.tp, 1)} (${fp(r.inf, 1)}–${fp(r.sup, 1)})` : "—");
const tendTxt = (r) => (r.var_ref == null ? "—" : `${fsn(r.var_ref, 1)}%`);
const propTxt = (r) => (r.pct_proprio == null ? "—" : `${fp(r.pct_proprio, 1)}% (${fn(r.n_proprio)})`);
export const marcasMun = (r, nMin) => [r.instavel ? `taxa instável (menos de ${nMin} ICSAP)` : null, r.d8 ? "denominador não confiável" : null,
  r.anos_quebra ? `quebra de série em ${r.anos_quebra}` : null, r.nota_local ? "mudança na internação local" : null].filter(Boolean).join("; ");

export const tabRankingMun = (rk, E, portes, ref, nMin) => tabela(
  ["Posição", "Município", "Região de Saúde", "Porte", "Residentes", "ICSAP", "Taxa padronizada (IC 95%)", `Frente a ${ref}`, "% de internações no próprio município", "Marcas"],
  rk.map((r) => { const m = E.municipios.get(r.id_municipio);
    return [r.posicao == null ? "—" : String(r.posicao), m.nome, E.regioes.get(m.reg).nome, portes.get(r.porte_ordem), fn(r.pop_residente), fn(r.n_icsap),
      icTxt(r), tendTxt(r), propTxt(r), marcasMun(r, nMin)]; }),
  ["d", "e", "e", "e", "d", "d", "d", "d", "d", "e"]);

export const tabPares = (membros, E, un, uf, ref, nMin) => tabela(
  ["Município", "Residentes", "ICSAP", "Taxa padronizada (IC 95%)", `Frente a ${ref}`, "% de internações no próprio município", "Marcas"],
  [...membros.map((r) => [E.municipios.get(r.id_municipio).nome, fn(r.pop_residente), fn(r.n_icsap), icTxt(r), tendTxt(r), propTxt(r), marcasMun(r, nMin)]),
    [un.tab, "", "", fp(un.tp, 1), "", "", ""], [uf.nome, "", "", fp(uf.tp, 1), "", "", ""]],
  ["e", "d", "d", "d", "d", "d", "e"]);
