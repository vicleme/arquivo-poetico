import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Busca de Local e de Idioma: `territorialidade:` e `localescrita:` acham
// também o que está DENTRO do Local (por qualquer caminho), com "Nome (Tipo)"
// para distinguir homônimos e as versões ...direta: para o Local exato;
// `idiomaprincipal:`, `idiomasecundario:` e `dialeto:` olham o papel e o
// dialeto de cada idioma (`idioma:` segue achando em qualquer papel).
const { db } = await import('../js/db.js');
const L = await import('../js/locais.js');
const { filtrarTextos, PREFIXOS_CANONICOS_POR_CAMPO, espelhoDeIdiomas } =
    await import('../js/utils.js');
const { decorarCamposBusca } = await import('../js/render-listas.js');

const ids = (lista) => lista.map((i) => i.id);

function zerar() {
    db.temas = [];
    db.assuntos = [];
    db.pessoas = [];
    db.grupos = [];
    db.autores = [];
    db.livros = [];
    db.epocas = [];
    db.periodosHistoricos = [];
    db.movimentosEscolas = [];
    db.poemas = [];
    db.prosas = [];
    // Mesmo acervo de locais.test.js: Estação Lapa pertence à Lapa E ao Metrô.
    db.locais = [
        { id: 1, nome: 'Brasil', tipo: 'País', pertenceA: [], notas: '' },
        { id: 2, nome: 'São Paulo', tipo: 'Estado', pertenceA: [1], notas: '' },
        { id: 3, nome: 'São Paulo', tipo: 'Cidade', pertenceA: [2], notas: '' },
        { id: 4, nome: 'Lapa', tipo: 'Bairro', pertenceA: [3], notas: '' },
        { id: 5, nome: 'Metrô de São Paulo', tipo: 'Rede ou sistema', pertenceA: [3], notas: '' },
        { id: 6, nome: 'Estação Lapa', tipo: 'Estação', pertenceA: [4, 5], notas: '' },
        { id: 7, nome: 'Santos', tipo: 'Cidade', pertenceA: [2], notas: '' },
        { id: 8, nome: 'Ponta da Praia', tipo: 'Bairro', pertenceA: [7], notas: '' },
        { id: 9, nome: 'Praça Coração de Maria', tipo: 'Logradouro', pertenceA: [8], notas: '' },
        { id: 10, nome: 'Paris', tipo: '', pertenceA: [], notas: '' },
    ];
}

function texto(id, territorialidade, localEscrita = null, extra = {}) {
    return {
        id,
        titulo: `T${id}`,
        territorialidade,
        sinalizacoesTerritorialidade: L.espelhoDeLocais(db, territorialidade),
        localEscrita,
        ...extra,
    };
}

describe('territorialidade: hierárquica', () => {
    let itens;
    beforeEach(() => {
        zerar();
        itens = [
            texto(1, [6]), // Estação Lapa
            texto(2, [9]), // Praça Coração de Maria (Santos)
            texto(3, [4]), // Lapa
            texto(4, [7]), // Santos
            texto(5, [10]), // Paris (sem pai)
            texto(6, []), // sem Local
        ].map((i) => decorarCamposBusca(i));
    });

    it('o país acha tudo que está dentro dele', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'territorialidade:Brasil')), [1, 2, 3, 4]);
    });

    it('passa pelos dois pais da Estação Lapa (bairro e Metrô)', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'territorialidade:Lapa')), [1, 3]);
        assert.deepEqual(ids(filtrarTextos(itens, 'territorialidade:"Metrô de São Paulo"')), [1]);
    });

    it('distingue São Paulo cidade de São Paulo estado pelo tipo', () => {
        assert.deepEqual(
            ids(filtrarTextos(itens, 'territorialidade:"São Paulo (Cidade)"')),
            [1, 3],
        );
        assert.deepEqual(
            ids(filtrarTextos(itens, 'territorialidade:"São Paulo (Estado)"')),
            [1, 2, 3, 4],
        );
        // Só o nome pega os dois Locais.
        assert.deepEqual(ids(filtrarTextos(itens, 'territorialidade:"São Paulo"')), [1, 2, 3, 4]);
    });

    it('ignora caixa e acento, como o resto da busca', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'territorialidade:estacao')), [1]);
    });

    it('Local sem tipo entra como "sem tipo"', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'territorialidade:"Paris (sem tipo)"')), [5]);
        assert.deepEqual(ids(filtrarTextos(itens, 'territorialidade:Paris')), [5]);
    });

    it('exclusão e combinação com "ou" funcionam com o campo novo', () => {
        assert.deepEqual(
            ids(filtrarTextos(itens, 'territorialidade:Brasil -territorialidade:Santos')),
            [1, 3],
        );
        assert.deepEqual(
            ids(filtrarTextos(itens, 'territorialidade:Lapa ou territorialidade:Paris')),
            [1, 3, 5],
        );
    });

    it('presença: territorialidade:* acha quem tem algum Local', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'territorialidade:*')), [1, 2, 3, 4, 5]);
    });

    it('texto com só o espelho de nomes (sem ids) continua achável', () => {
        const antigo = decorarCamposBusca({
            id: 9,
            titulo: 'Antigo',
            sinalizacoesTerritorialidade: 'Recife, Olinda',
        });
        assert.deepEqual(ids(filtrarTextos([antigo], 'territorialidade:olinda')), [9]);
    });
});

describe('territorialidadedireta: só o Local exato', () => {
    beforeEach(zerar);

    it('não sobe nem desce a hierarquia', () => {
        const itens = [texto(1, [6]), texto(2, [4]), texto(3, [3])].map((i) =>
            decorarCamposBusca(i),
        );
        assert.deepEqual(ids(filtrarTextos(itens, 'territorialidadedireta:"Lapa (Bairro)"')), [2]);
        assert.deepEqual(ids(filtrarTextos(itens, 'territorialidade:"Lapa (Bairro)"')), [1, 2]);
        assert.deepEqual(
            ids(filtrarTextos(itens, 'territorialidadedireta:"São Paulo (Cidade)"')),
            [3],
        );
    });
});

describe('localescrita: hierárquico, e localescritadireta: exato', () => {
    beforeEach(zerar);

    it('acha por qualquer Local acima do de escrita', () => {
        const itens = [
            texto(1, [], 8), // escrito na Ponta da Praia
            texto(2, [], 6), // escrito na Estação Lapa
            texto(3, [6], null), // cita a Estação Lapa, sem local de escrita
        ].map((i) => decorarCamposBusca(i));
        assert.deepEqual(ids(filtrarTextos(itens, 'localescrita:Santos')), [1]);
        assert.deepEqual(ids(filtrarTextos(itens, 'localescrita:Brasil')), [1, 2]);
        assert.deepEqual(ids(filtrarTextos(itens, 'localescrita:"Metrô de São Paulo"')), [2]);
        assert.deepEqual(ids(filtrarTextos(itens, 'localescritadireta:Santos')), []);
        assert.deepEqual(ids(filtrarTextos(itens, 'localescritadireta:"Ponta da Praia"')), [1]);
    });

    it('não se mistura com a Territorialidade', () => {
        const item = decorarCamposBusca(texto(1, [9], 6));
        assert.equal(filtrarTextos([item], 'territorialidade:"Estação Lapa"').length, 0);
        assert.equal(filtrarTextos([item], 'localescrita:"Estação Lapa"').length, 1);
        assert.equal(filtrarTextos([item], 'localescrita:"Praça"').length, 0);
    });

    it('localEscrita que não existe mais no cadastro não quebra nem acha', () => {
        const item = decorarCamposBusca(texto(1, [], 999));
        assert.equal(item._buscaLocalEscrita, '');
    });
});

describe('o atalho "Ver textos" do Local bate com a busca', () => {
    beforeEach(zerar);

    it('a consulta gerada acha exatamente os textos que citam o Local ou sublocais', () => {
        db.poemas = [
            texto(101, [6]),
            texto(102, [9, 6]),
            texto(103, [7]),
            texto(104, [10]),
            texto(105, [3]),
        ];
        const itens = db.poemas.map((p) => decorarCamposBusca(p));
        db.locais.forEach((local) => {
            const esperado = L.textosQueCitamLocalOuSublocais(db, local.id).poemasIds.sort();
            const consulta = L.consultaTerritorialidadeDoLocal(db, local.id);
            const achados = ids(filtrarTextos(itens, consulta)).sort();
            assert.deepEqual(achados, esperado, `${local.nome} (${local.tipo}): ${consulta}`);
        });
    });

    it('a consulta tem um termo só, com o tipo quando há tipo', () => {
        assert.equal(
            L.consultaTerritorialidadeDoLocal(db, 6),
            'territorialidade:"Estação Lapa (Estação)"',
        );
        assert.equal(
            L.consultaTerritorialidadeDoLocal(db, 3),
            'territorialidade:"São Paulo (Cidade)"',
        );
        assert.equal(L.consultaTerritorialidadeDoLocal(db, 10), 'territorialidade:"Paris"');
    });
});

describe('idioma por papel e dialeto', () => {
    function item(id, idiomas, extra = {}) {
        const obj = { id, titulo: `T${id}`, idiomas, ...extra };
        obj.idioma = espelhoDeIdiomas(idiomas);
        return decorarCamposBusca(obj);
    }
    let itens;
    beforeEach(() => {
        zerar();
        itens = [
            item(1, [{ idioma: 'pt-BR', papel: 'principal', dialetos: [] }]),
            item(2, [
                { idioma: 'pt-BR', papel: 'principal', dialetos: [] },
                { idioma: 'Inglês', papel: 'secundario', dialetos: [] },
            ]),
            item(3, [
                { idioma: 'Espanhol', papel: 'principal', dialetos: ['rioplatense'] },
                { idioma: 'Inglês', papel: 'principal', dialetos: [] },
            ]),
            item(4, []),
        ];
    });

    it('idiomaprincipal: só acha quem tem o idioma como Principal', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'idiomaprincipal:pt-BR')), [1, 2]);
        assert.deepEqual(ids(filtrarTextos(itens, 'idiomaprincipal:ingles')), [3]);
    });

    it('idiomasecundario: só acha o papel Secundário', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'idiomasecundario:ingles')), [2]);
        assert.deepEqual(ids(filtrarTextos(itens, 'idiomasecundario:pt-BR')), []);
    });

    it('idioma: segue achando em qualquer papel', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'idioma:ingles')), [2, 3]);
    });

    it('um texto meio a meio aparece nos dois Principais', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'idiomaprincipal:espanhol')), [3]);
        assert.deepEqual(
            ids(filtrarTextos(itens, 'idiomaprincipal:espanhol idiomaprincipal:ingles')),
            [3],
        );
    });

    it('presença: idiomasecundario:* acha quem tem algum Secundário', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'idiomasecundario:*')), [2]);
    });

    it('dialeto: acha o dialeto e o idioma a que ele pertence', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'dialeto:rioplatense')), [3]);
        assert.deepEqual(ids(filtrarTextos(itens, 'dialeto:espanhol')), [3]);
        assert.deepEqual(ids(filtrarTextos(itens, 'dialeto:*')), [3]);
        assert.deepEqual(ids(filtrarTextos(itens, 'dialeto:ingles')), []);
    });

    it('dialeto: acha em qualquer dos vários dialetos do mesmo idioma', () => {
        const dialogo = item(5, [
            { idioma: 'pt-BR', papel: 'principal', dialetos: ['paulistano', 'gaúcho'] },
        ]);
        assert.deepEqual(ids(filtrarTextos([dialogo], 'dialeto:paulistano')), [5]);
        assert.deepEqual(ids(filtrarTextos([dialogo], 'dialeto:gaucho')), [5]);
        assert.deepEqual(ids(filtrarTextos([dialogo], 'dialeto:paulistano dialeto:gaucho')), [5]);
        assert.deepEqual(ids(filtrarTextos([dialogo], 'dialeto:carioca')), []);
    });

    it('texto antigo, só com o `idioma` em string, conta como Principal', () => {
        const antigo = decorarCamposBusca({ id: 7, titulo: 'Antigo', idioma: 'fr' });
        assert.deepEqual(ids(filtrarTextos([antigo], 'idiomaprincipal:fr')), [7]);
        assert.deepEqual(ids(filtrarTextos([antigo], 'idiomasecundario:fr')), []);
    });
});

describe('prefixos canônicos', () => {
    it('cada campo novo tem o seu prefixo para a legenda e o atalho de coluna', () => {
        assert.equal(PREFIXOS_CANONICOS_POR_CAMPO._buscaTerritorialidade, 'territorialidade');
        assert.equal(
            PREFIXOS_CANONICOS_POR_CAMPO._buscaTerritorialidadeDireta,
            'territorialidadedireta',
        );
        assert.equal(PREFIXOS_CANONICOS_POR_CAMPO._buscaLocalEscrita, 'localescrita');
        assert.equal(PREFIXOS_CANONICOS_POR_CAMPO._buscaLocalEscritaDireta, 'localescritadireta');
        assert.equal(PREFIXOS_CANONICOS_POR_CAMPO._buscaIdiomaPrincipal, 'idiomaprincipal');
        assert.equal(PREFIXOS_CANONICOS_POR_CAMPO._buscaIdiomaSecundario, 'idiomasecundario');
        assert.equal(PREFIXOS_CANONICOS_POR_CAMPO._buscaDialeto, 'dialeto');
    });
});
