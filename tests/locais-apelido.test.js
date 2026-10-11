import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Apelido de Local: texto curto e opcional que as Estatísticas usam no lugar
// do nome (o nome longo estoura o gráfico). Só exibição: cadastro, busca por
// nome, exportação e clique na barra seguem pelo nome e pelo id.
const { db } = await import('../js/db.js');
const L = await import('../js/locais.js');
const E = await import('../js/estatisticas.js');
const { montarRegistro } = await import('../js/exportar.js');

function zerar() {
    localStorage.clear();
    ['livros', 'partes', 'secoes', 'elementos', 'pessoas', 'grupos', 'autores', 'epocas'].forEach(
        (c) => (db[c] = []),
    );
    db.temas = [];
    db.assuntos = [];
    db.prosas = [];
    db.locais = [
        { id: 1, nome: 'Brasil', tipo: 'País', pertenceA: [], notas: '' },
        { id: 2, nome: 'Metrô de São Paulo', tipo: 'Rede ou sistema', pertenceA: [1], notas: '' },
        { id: 3, nome: 'Estação Lapa', tipo: 'Estação', pertenceA: [2], notas: '' },
        { id: 4, nome: 'Praça Coração de Maria', tipo: 'Logradouro', pertenceA: [1], notas: '' },
    ];
    db.poemas = [texto(1, [2, 3], 3), texto(2, [2], 3), texto(3, [4], 4), texto(4, [1], null)];
}

function texto(id, cita, escrita) {
    return {
        id,
        titulo: `T${id}`,
        ano: 2020,
        territorialidade: cita,
        sinalizacoesTerritorialidade: L.espelhoDeLocais(db, cita),
        localEscrita: escrita,
    };
}

describe('apelido: cadastro', () => {
    beforeEach(zerar);

    it('criarLocal guarda o apelido limpo; sem apelido a chave nem existe', () => {
        const a = L.criarLocal(db, { nome: 'Estação da Luz', apelido: '  Luz,  ' });
        assert.equal(db.locais.find((l) => l.id === a.id).apelido, 'Luz');
        const b = L.criarLocal(db, { nome: 'Estação Sé' });
        assert.equal('apelido' in db.locais.find((l) => l.id === b.id), false);
    });

    it('apelido igual ao nome (sem caixa nem acento) não conta como apelido', () => {
        const r = L.criarLocal(db, { nome: 'Estação Sé', apelido: 'ESTAÇÃO SE' });
        assert.equal('apelido' in db.locais.find((l) => l.id === r.id), false);
        assert.equal(L.limparApelidoLocal('Brasil', 'brasil'), '');
    });

    it('editarLocal põe, troca e tira o apelido; sem a chave em `campos`, não mexe', () => {
        L.editarLocal(db, 3, { apelido: 'Lapa' });
        assert.equal(db.locais.find((l) => l.id === 3).apelido, 'Lapa');
        L.editarLocal(db, 3, { notas: 'x' });
        assert.equal(db.locais.find((l) => l.id === 3).apelido, 'Lapa');
        L.editarLocal(db, 3, { apelido: '' });
        assert.equal('apelido' in db.locais.find((l) => l.id === 3), false);
    });

    it('renomear o Local para o próprio apelido tira o apelido', () => {
        L.editarLocal(db, 3, { apelido: 'Lapa' });
        L.editarLocal(db, 3, { nome: 'Lapa' });
        assert.equal('apelido' in db.locais.find((l) => l.id === 3), false);
    });

    it('sincronizarLocais limpa apelido torto (backup editado à mão) sem mexer no resto', () => {
        db.locais[2].apelido = '  Lapa, SP ';
        db.locais[3].apelido = 42;
        db.locais[0].apelido = 'brasil';
        L.sincronizarLocais(db);
        assert.equal(db.locais[2].apelido, 'Lapa SP');
        assert.equal(db.locais[3].apelido, '42');
        assert.equal('apelido' in db.locais[0], false);
    });

    it('mesclar: o destino sem apelido fica com o da origem; com apelido, mantém o seu', () => {
        db.locais.push({
            id: 5,
            nome: 'Estação Lapa (SP)',
            tipo: 'Estação',
            pertenceA: [],
            notas: '',
            apelido: 'Lapa',
        });
        L.mesclarLocais(db, 5, 3);
        assert.equal(db.locais.find((l) => l.id === 3).apelido, 'Lapa');

        db.locais.push({
            id: 6,
            nome: 'Outra Lapa',
            tipo: 'Estação',
            pertenceA: [],
            notas: '',
            apelido: 'Outra',
        });
        L.mesclarLocais(db, 6, 3);
        assert.equal(db.locais.find((l) => l.id === 3).apelido, 'Lapa');
    });
});

describe('apelido: Estatísticas', () => {
    beforeEach(zerar);

    const rotulos = (campo, modo) => E.agregarPorLocal({ campo, modo, tipo: '' });

    it('a barra traz o apelido no lugar do nome, e o nome onde não há apelido', () => {
        L.editarLocal(db, 2, { apelido: 'Metrô SP' });
        const r = rotulos('territorialidade', 'direto');
        assert.ok(r.labels.includes('Metrô SP'));
        assert.ok(!r.labels.includes('Metrô de São Paulo'));
        assert.ok(r.labels.includes('Praça Coração de Maria'));
        assert.equal(r.data[r.labels.indexOf('Metrô SP')], 2);
    });

    it('o clique continua por id: a consulta usa o nome e o tipo, não o apelido', () => {
        L.editarLocal(db, 2, { apelido: 'Metrô SP' });
        const r = rotulos('territorialidade', 'direto');
        const id = r.ids[r.labels.indexOf('Metrô SP')];
        assert.equal(id, 2);
        const consulta = L.consultaBuscaDoLocal(db, id, 'territorialidadedireta');
        assert.ok(consulta.includes('Metrô de São Paulo'));
    });

    it('vale também para o Local de escrita e para o seletor de Assuntos por local', () => {
        L.editarLocal(db, 3, { apelido: 'Lapa' });
        assert.ok(rotulos('escrita', 'direto').labels.includes('Lapa'));
        const opcoes = E.locaisDeEscritaParaSelecao();
        assert.ok(opcoes.some((o) => o.rotulo === 'Lapa'));
    });

    it('dois Locais com o mesmo apelido ganham tipo e pai, sem repetir rótulo', () => {
        L.editarLocal(db, 3, { apelido: 'Centro' });
        L.editarLocal(db, 4, { apelido: 'Centro' });
        const r = L.rotulosUnicosDeLocais(db, [3, 4]);
        assert.equal(r.get('3'), 'Centro (Estação, em Metrô de São Paulo)');
        assert.equal(r.get('4'), 'Centro (Logradouro, em Brasil)');
    });

    it('apelido igual ao nome de outro Local do gráfico também desempata', () => {
        L.editarLocal(db, 3, { apelido: 'Brasil' });
        const r = L.rotulosUnicosDeLocais(db, [1, 3]);
        assert.equal(new Set(r.values()).size, 2);
    });
});

describe('apelido: busca, exportação e importação', () => {
    beforeEach(zerar);

    it('o apelido é termo de busca da Territorialidade (e do Local de escrita)', () => {
        L.editarLocal(db, 3, { apelido: 'Lapa' });
        assert.ok(L.buscaTerritorialidadeDoTexto(db, db.poemas[0]).includes('Lapa'));
        assert.ok(L.buscaLocalEscritaDoTexto(db, db.poemas[0]).includes('Lapa'));
    });

    it('a exportação leva o apelido só de quem tem, e o texto exportado segue com o nome', () => {
        L.editarLocal(db, 3, { apelido: 'Lapa' });
        const reg = montarRegistro('poema', db.poemas[0]);
        const hierarquia = reg.locaisHierarquia;
        assert.equal(hierarquia.find((h) => h.nome === 'Estação Lapa').apelido, 'Lapa');
        assert.equal('apelido' in hierarquia.find((h) => h.nome === 'Metrô de São Paulo'), false);
    });

    it('importar cria o Local com apelido; num Local existente só preenche se faltava', () => {
        const origem = {
            territorialidade: [{ localId: 90 }],
            localEscrita: null,
            locaisHierarquia: [
                { localId: 80, nome: 'Brasil', tipo: 'País', pertenceA: [] },
                {
                    localId: 81,
                    nome: 'Metrô de São Paulo',
                    tipo: 'Rede ou sistema',
                    pertenceA: [80],
                },
                {
                    localId: 90,
                    nome: 'Estação Lapa',
                    tipo: 'Estação',
                    pertenceA: [81],
                    apelido: 'Lapa',
                },
            ],
        };
        // casa com o Local 3 (mesmo nome, tipo e pai) e, como ele não tinha apelido, recebe o do lote
        L.importarLocaisDoTexto(db, origem);
        const lapa = db.locais.filter((l) => l.nome === 'Estação Lapa');
        assert.equal(lapa.length, 1);
        assert.equal(lapa[0].apelido, 'Lapa');

        // existente com apelido nunca é trocado
        db.locais.find((l) => l.id === 3).apelido = 'Minha Lapa';
        L.importarLocaisDoTexto(db, origem);
        assert.equal(db.locais.find((l) => l.id === 3).apelido, 'Minha Lapa');

        // Local novo vindo no lote nasce com apelido
        L.importarLocaisDoTexto(db, {
            territorialidade: [{ localId: 92 }],
            locaisHierarquia: [
                { localId: 92, nome: 'Estação Sé', tipo: 'Estação', pertenceA: [], apelido: 'Sé' },
            ],
        });
        assert.equal(db.locais.find((l) => l.nome === 'Estação Sé').apelido, 'Sé');
    });
});
