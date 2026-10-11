// ============================================================
// estatisticas-dados-personagens.js: agregações de Personagem (Fase 11,
// etapa 7). Sem DOM. Parte sempre do corpus filtrado das Estatísticas
// (textosDasEstatisticas), nunca de todo o acervo.
//
// Regras de contagem, iguais às da busca `personagem:` e dos prefixos de papel
// e centralidade (etapa 5), para a barra bater com a lista que o clique abre:
// - A unidade é o texto. Um texto conta uma vez em cada barra a que tem
//   direito, então a soma das barras pode passar do total de textos.
// - Personagem é identificado pelo nome (chaveTema), como na busca: dois
//   cadastros de mesmo nome viram uma barra só. A grafia exibida é a primeira.
// - Vínculo que aponta para Personagem fora do cadastro é ignorado.
// ============================================================

import { db } from './db.js';
import { chaveTema } from './utils.js';
import { textosDasEstatisticas } from './estatisticas-dados.js';
import {
    PAPEIS_PERSONAGEM,
    ROTULOS_CENTRALIDADE_PERSONAGEM,
    centralidadeAplicavel,
    normalizarCentralidadePersonagem,
    normalizarPapeisPersonagem,
} from './personagens.js';
import { TIPO_ECO_PERSONAGEM } from './ancora-eco.js';

// Prefixo de busca de cada papel (o clique na barra abre `prefixo:*`).
export const PREFIXO_BUSCA_PAPEL_PERSONAGEM = {
    Voz: 'personagemvoz',
    Interlocutor: 'personageminterlocutor',
    Aparição: 'personagemaparicao',
    Menção: 'personagemmencao',
    Alusão: 'personagemalusao',
};

// Categorias de centralidade, na ordem das barras. `prefixo` é null onde a
// busca não tem prefixo ("não se aplica" não é um valor que se procure).
export const CATEGORIAS_CENTRALIDADE_PERSONAGEM = [
    { chave: 'protagonista', rotulo: 'Protagonista', prefixo: 'personagemprotagonista' },
    { chave: 'secundario', rotulo: 'Secundário', prefixo: 'personagemsecundario' },
    {
        chave: 'indefinido',
        rotulo: ROTULOS_CENTRALIDADE_PERSONAGEM[''],
        prefixo: 'personagemsemcentralidade',
    },
    { chave: 'naoSeAplica', rotulo: 'Só Menção/Alusão', prefixo: null },
];

const FAIXAS_PERSONAGENS_POR_TEXTO = [
    { rotulo: 'Nenhum', cabe: (n) => n === 0 },
    { rotulo: '1', cabe: (n) => n === 1 },
    { rotulo: '2', cabe: (n) => n === 2 },
    { rotulo: '3', cabe: (n) => n === 3 },
    { rotulo: '4 ou mais', cabe: (n) => n >= 4 },
];

// Vínculos do texto cujo Personagem está no cadastro, com o nome já resolvido.
function vinculosValidos(texto) {
    const cadastro = db.personagens || [];
    return (texto?.personagens || [])
        .map((v) => ({ vinculo: v, personagem: cadastro.find((p) => p.id == v.personagemId) }))
        .filter((x) => x.personagem?.nome)
        .map((x) => ({ ...x.vinculo, nome: x.personagem.nome }));
}

function categoriaDeCentralidade(vinculo) {
    const papeis = normalizarPapeisPersonagem(vinculo.papeis);
    if (!centralidadeAplicavel(papeis)) return 'naoSeAplica';
    const c = normalizarCentralidadePersonagem(vinculo.centralidade, papeis);
    return c === '' ? 'indefinido' : c;
}

// Textos por Personagem, em qualquer papel, do maior para o menor. Devolve
// { labels, data } em paralelo; o clique abre `personagem:"Nome"`.
export function agregarPorPersonagem() {
    const contagem = new Map();
    textosDasEstatisticas().forEach((t) => {
        const vistos = new Set();
        vinculosValidos(t).forEach((v) => {
            const chave = chaveTema(v.nome);
            if (vistos.has(chave)) return;
            vistos.add(chave);
            const atual = contagem.get(chave) || { label: v.nome, n: 0 };
            atual.n += 1;
            contagem.set(chave, atual);
        });
    });
    const ordenado = [...contagem.values()].sort(
        (a, b) => b.n - a.n || a.label.localeCompare(b.label, 'pt-BR'),
    );
    return { labels: ordenado.map((o) => o.label), data: ordenado.map((o) => o.n) };
}

// Textos por papel (Voz, Interlocutor, Aparição, Menção, Alusão): um texto
// conta em cada papel em que algum Personagem aparece. Todos os papéis saem,
// também os de zero, para a escala não mudar conforme o recorte.
export function agregarPersonagensPorPapel() {
    const contagem = new Map(PAPEIS_PERSONAGEM.map((p) => [p, 0]));
    textosDasEstatisticas().forEach((t) => {
        const papeisDoTexto = new Set();
        vinculosValidos(t).forEach((v) =>
            normalizarPapeisPersonagem(v.papeis).forEach((p) => papeisDoTexto.add(p)),
        );
        papeisDoTexto.forEach((p) => contagem.set(p, contagem.get(p) + 1));
    });
    return { labels: [...PAPEIS_PERSONAGEM], data: PAPEIS_PERSONAGEM.map((p) => contagem.get(p)) };
}

// Textos por centralidade: um texto conta em cada categoria que algum Personagem
// seu tem. "Não se aplica" é o Personagem só com Menção e/ou Alusão (não é
// falha de preenchimento); "Indefinido" é o que ainda não foi preenchido.
export function agregarPersonagensPorCentralidade() {
    const contagem = new Map(CATEGORIAS_CENTRALIDADE_PERSONAGEM.map((c) => [c.chave, 0]));
    textosDasEstatisticas().forEach((t) => {
        const categorias = new Set(vinculosValidos(t).map(categoriaDeCentralidade));
        categorias.forEach((c) => contagem.set(c, contagem.get(c) + 1));
    });
    return {
        labels: CATEGORIAS_CENTRALIDADE_PERSONAGEM.map((c) => c.rotulo),
        data: CATEGORIAS_CENTRALIDADE_PERSONAGEM.map((c) => contagem.get(c.chave)),
        prefixos: CATEGORIAS_CENTRALIDADE_PERSONAGEM.map((c) => c.prefixo),
    };
}

// Quantos textos têm 0, 1, 2, 3 ou 4+ Personagens (vínculos válidos).
export function distribuicaoPersonagensPorTexto() {
    const textos = textosDasEstatisticas();
    const contagem = FAIXAS_PERSONAGENS_POR_TEXTO.map(() => 0);
    textos.forEach((t) => {
        const n = new Set(vinculosValidos(t).map((v) => chaveTema(v.nome))).size;
        const i = FAIXAS_PERSONAGENS_POR_TEXTO.findIndex((f) => f.cabe(n));
        if (i >= 0) contagem[i] += 1;
    });
    return {
        labels: FAIXAS_PERSONAGENS_POR_TEXTO.map((f) => f.rotulo),
        data: contagem,
        textos: textos.length,
    };
}

// Ecos do tipo "Personagem em comum" por Personagem âncora. Um Eco com duas
// âncoras conta uma vez para cada uma, então a soma das barras passa do total
// de Ecos; o Eco sem âncora (ou só com âncora que saiu do cadastro) não entra
// em barra nenhuma e vai para `semAncora`. `ecos` é o total de Ecos do tipo no
// recorte, e a soma por âncora pode ser conferida contra ele.
export function agregarEcosPorPersonagem() {
    const cadastro = db.personagens || [];
    const contagem = new Map();
    let ecos = 0;
    let semAncora = 0;
    textosDasEstatisticas().forEach((t) => {
        (t.conceitos?.ecos || []).forEach((eco) => {
            if (eco.tipo !== TIPO_ECO_PERSONAGEM) return;
            ecos += 1;
            const nomes = new Map();
            (eco.ancoras || []).forEach((a) => {
                if (a.especie !== 'personagem') return;
                const nome = cadastro.find((p) => p.id == a.id)?.nome;
                if (nome) nomes.set(chaveTema(nome), nome);
            });
            if (!nomes.size) {
                semAncora += 1;
                return;
            }
            nomes.forEach((nome, chave) => {
                const atual = contagem.get(chave) || { label: nome, n: 0 };
                atual.n += 1;
                contagem.set(chave, atual);
            });
        });
    });
    const ordenado = [...contagem.values()].sort(
        (a, b) => b.n - a.n || a.label.localeCompare(b.label, 'pt-BR'),
    );
    return {
        labels: ordenado.map((o) => o.label),
        data: ordenado.map((o) => o.n),
        ecos,
        semAncora,
    };
}
