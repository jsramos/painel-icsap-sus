export function criaEstado(P) {
  const municipios = new Map(P.municipios.map(([id, nome, reg]) => [id, { id, nome, reg }]));
  const regioes = new Map(P.regioes.map(([cod, nome]) => [cod, { cod, nome, muns: [] }]));
  for (const m of municipios.values()) regioes.get(m.reg).muns.push(m.id);

  function coerente({ ano, regiao, mun }) {
    const a = Number(ano);
    const e = { ano: P.anos.includes(a) ? a : P.ano_ultimo, regiao: null, mun: null };
    let aviso = null;
    if (mun && !municipios.has(mun)) aviso = P.textos.aviso_endereco_municipio;
    else if (mun) { e.mun = mun; e.regiao = municipios.get(mun).reg; }
    else if (regiao && !regioes.has(regiao)) aviso = P.textos.aviso_endereco_regiao;
    else if (regiao) {
      e.regiao = regiao;
      const ms = regioes.get(regiao).muns;
      if (ms.length === 1) e.mun = ms[0];
    }
    return { estado: e, aviso };
  }

  const doEndereco = (search) => {
    const q = new URLSearchParams(search);
    return coerente({ ano: q.get("ano"), regiao: q.get("regiao"), mun: q.get("mun") });
  };
  const paraEndereco = (e) => {
    const q = new URLSearchParams();
    q.set("ano", e.ano);
    if (e.regiao) q.set("regiao", e.regiao);
    if (e.mun) q.set("mun", e.mun);
    return `?${q}`;
  };
  const igual = (a, b) => a.ano === b.ano && a.regiao === b.regiao && a.mun === b.mun;

  return { municipios, regioes, coerente, doEndereco, paraEndereco, igual };
}
