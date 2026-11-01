// ============================================================
// mapa-origens.js: lógica pura que transforma a contagem de textos por origem
// (`agregarTextosPorOrigem`, em `estatisticas-dados-data-obra.js`) nos dados do
// mapa de calor: quantos textos cada país do mapa tem, o que é "Desconhecida" e
// o que não tem lugar no mapa.
//
// Entra o resultado de `agregarTextosPorOrigem`: `itens` (um por origem, com o
// `rotulo` digitado e a lista `ids` dos textos) mais `comEntradas`, `comOrigem` e
// `semOrigem`. Sai:
//
//   paises        [{ codigo, nome, textos, rotulos, ids }], do mais para o menos
//                 textos. Só os países que têm texto.
//   desconhecida  { textos, rotulos, ids }   a etiqueta "Desconhecida"
//   semLugar      [{ rotulo, textos, ids }]  origens que não são país do mapa
//                 ("Roma Antiga", "Celta"): nada some em silêncio
//   maximo        o maior `textos` entre os países (o topo da escala de cor)
//   textosNoMapa  quantos textos aparecem em algum país
//   comEntradas, comOrigem, semOrigem   repassados, para o resumo da tela
//
// Um texto conta UMA vez em cada país, mesmo que traga duas etiquetas do mesmo
// lugar ("Inglaterra" e "Reino Unido" pintam o mesmo país): por isso a soma é
// por texto (`tipo` e `id`), e não a soma das contagens das etiquetas.
// ============================================================

import { codigoDoPaisDaOrigem, ehOrigemDesconhecida, paisPorCodigo } from './mapa-paises.js';

function chaveDoTexto(ref) {
    return `${ref.tipo}:${ref.id}`;
}

// Junta listas de referências a textos sem repetir texto.
function unirReferencias(grupos) {
    const vistos = new Map();
    grupos.forEach((refs) => {
        refs.forEach((ref) => {
            const chave = chaveDoTexto(ref);
            if (!vistos.has(chave)) vistos.set(chave, ref);
        });
    });
    return [...vistos.values()];
}

function ordenarPorTextos(a, b, campoNome) {
    return b.textos - a.textos || a[campoNome].localeCompare(b[campoNome], 'pt-BR');
}

export function montarDadosDoMapa(agregado) {
    const itens = Array.isArray(agregado?.itens) ? agregado.itens : [];

    const porPais = new Map(); // codigo -> { rotulos: [], refs: [[...]] }
    const desconhecidas = { rotulos: [], refs: [] };
    const semLugar = [];

    itens.forEach((item) => {
        const refs = Array.isArray(item.ids) ? item.ids : [];
        if (ehOrigemDesconhecida(item.rotulo)) {
            desconhecidas.rotulos.push(item.rotulo);
            desconhecidas.refs.push(refs);
            return;
        }
        const codigo = codigoDoPaisDaOrigem(item.rotulo);
        if (!codigo) {
            semLugar.push({ rotulo: item.rotulo, textos: refs.length, ids: refs });
            return;
        }
        if (!porPais.has(codigo)) porPais.set(codigo, { rotulos: [], refs: [] });
        const alvo = porPais.get(codigo);
        alvo.rotulos.push(item.rotulo);
        alvo.refs.push(refs);
    });

    const paises = [...porPais.entries()]
        .map(([codigo, { rotulos, refs }]) => {
            const ids = unirReferencias(refs);
            return { codigo, nome: paisPorCodigo(codigo).nome, textos: ids.length, rotulos, ids };
        })
        .sort((a, b) => ordenarPorTextos(a, b, 'nome'));

    const idsDesconhecida = unirReferencias(desconhecidas.refs);
    const idsNoMapa = unirReferencias(paises.map((p) => p.ids));

    return {
        paises,
        desconhecida: {
            textos: idsDesconhecida.length,
            rotulos: desconhecidas.rotulos,
            ids: idsDesconhecida,
        },
        semLugar: semLugar.sort((a, b) => ordenarPorTextos(a, b, 'rotulo')),
        maximo: paises.reduce((m, p) => Math.max(m, p.textos), 0),
        textosNoMapa: idsNoMapa.length,
        comEntradas: agregado?.comEntradas ?? 0,
        comOrigem: agregado?.comOrigem ?? 0,
        semOrigem: agregado?.semOrigem ?? 0,
    };
}
