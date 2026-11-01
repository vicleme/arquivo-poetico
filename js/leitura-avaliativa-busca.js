// Leitura avaliativa (Fase 22): a busca por prefixo `pegou:` e `incomodou:` nas
// abas Poemas e Prosas. Lógica pura, sem DOM: transforma a leitura mais recente
// de cada texto em texto de busca, para a cadeia da busca (CAMPOS_ATRIBUTO, em
// utils.js) achar o texto pelo item, como já faz com `valencia:` e `leitura:`.
//
// Regras (as mesmas do filtro "Pegou:" da aba Leitura avaliativa, F22-D18):
//   - vale só a leitura mais recente de cada texto, então o resultado reflete a
//     opinião atual, não a média de todas as leituras;
//   - `pegou:` olha os itens de "De que maneira te pegou" e guarda também o peso de cada um
//     ("Originalidade Central"), então `pegou:originalidade` acha em qualquer peso,
//     `pegou:"originalidade central"` só no peso central e `pegou:central` acha o
//     texto que tem qualquer item no central;
//   - `incomodou:` olha os itens de "O que incomodou" (não têm peso);
//   - `releria:` e `mostraria:` olham a resposta da leitura mais recente (Sim, Talvez ou
//     Não; F22-D30). `releria:sim`, `releria:não`, `mostraria:talvez`;
//   - texto sem leitura, ou leitura sem nada marcado naquele bloco, fica com o
//     campo vazio: `pegou:*` acha os que têm algo marcado e `-pegou:*` os demais. Em
//     `releria:` e `mostraria:`, `*` acha quem respondeu e `-releria:*` quem deixou em
//     branco ou nunca foi lido (a aba separa os dois; a busca não precisa).

import {
    ITENS_INCOMODOU,
    ITENS_PEGOU,
    PESOS,
    RESPOSTAS,
    rotuloItemPegou,
    ultimaLeitura,
} from './leitura-avaliativa.js';

const lista = (v) => (Array.isArray(v) ? v : []);

const rotuloDe = (itens, id) => itens.find((i) => i.id === id)?.rotulo || '';
const rotuloDoPeso = (id) => PESOS.find((p) => p.id === id)?.rotulo || '';

const rotuloDaResposta = (id) => RESPOSTAS.find((r) => r.id === id)?.rotulo || '';

// Texto de busca de uma leitura: { _buscaPegou, _buscaIncomodou, _buscaReleria,
// _buscaMostraria }. Item
// desconhecido (id que não existe mais na lista) é ignorado.
export function camposBuscaDaLeitura(leitura) {
    const pegou = lista(leitura?.pegou)
        .map((m) => {
            const rotulo = rotuloItemPegou(m?.item);
            if (!rotulo) return '';
            const peso = rotuloDoPeso(m?.peso);
            return peso ? `${rotulo} ${peso}` : rotulo;
        })
        .filter(Boolean)
        .join(', ');
    const incomodou = lista(leitura?.incomodou)
        .map((id) => rotuloDe(ITENS_INCOMODOU, id))
        .filter(Boolean)
        .join(', ');
    return {
        _buscaPegou: pegou,
        _buscaIncomodou: incomodou,
        _buscaReleria: rotuloDaResposta(leitura?.releria),
        _buscaMostraria: rotuloDaResposta(leitura?.mostraria),
    };
}

// Os quatro campos para um texto, a partir de `db.leituras`. `tipo` é 'poema' ou
// 'prosa' (o mesmo das leituras); sem tipo, ou sem leitura, os campos ficam vazios.
export function camposBuscaDeLeitura(leituras, tipo, textoId) {
    if (tipo !== 'poema' && tipo !== 'prosa') return camposBuscaDaLeitura(null);
    const doTexto = lista(leituras).filter(
        (l) => l?.tipo === tipo && String(l.textoId) === String(textoId),
    );
    return camposBuscaDaLeitura(ultimaLeitura(doTexto));
}

// Itens que estão em uso na leitura mais recente de algum texto da aba, para a
// caixinha de sugestões só oferecer o que a busca acha. `campo`: 'pegou',
// 'incomodou', 'releria' ou 'mostraria'. Devolve `{ valor, detalhe }` na ordem da lista
// de fábrica (em 'releria' e 'mostraria', Sim, Talvez e Não, só os que alguém respondeu).
export function itensEmUsoParaBusca(dbRef, tabela, campo) {
    const tipo = tabela === 'prosas' ? 'prosa' : 'poema';
    const ehResposta = campo === 'releria' || campo === 'mostraria';
    const itens = ehResposta ? RESPOSTAS : campo === 'incomodou' ? ITENS_INCOMODOU : ITENS_PEGOU;
    const ids = new Set();
    for (const texto of lista(dbRef?.[tabela])) {
        const doTexto = lista(dbRef?.leituras).filter(
            (l) => l?.tipo === tipo && String(l.textoId) === String(texto.id),
        );
        const ultima = ultimaLeitura(doTexto);
        if (!ultima) continue;
        if (ehResposta) ids.add(ultima[campo]);
        else if (campo === 'incomodou') lista(ultima.incomodou).forEach((id) => ids.add(id));
        else lista(ultima.pegou).forEach((m) => ids.add(m?.item));
    }
    return itens
        .filter((i) => ids.has(i.id))
        .map((i) => ({ valor: i.rotulo, detalhe: i.descricao || '' }));
}
