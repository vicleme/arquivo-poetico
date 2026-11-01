import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nomesDosTemas } from './helpers/temas-do-texto.js';

// Fase 2, Etapa 3, itens 3c e 3e: (3e) o salvar do modal de Poema e de Prosa
// grava `temas` por id e nunca o campo antigo `sinalizacoesTema` (Etapa 5: o
// campo foi apagado), mesmo ao editar texto que ainda o tinha; (3c) o Localizar e
// Substituir não oferece mais o campo Tema (renomear fica na aba Temas, que
// preserva o papel).

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const lerModal = (f) => fs.readFileSync(path.resolve(__dirname, '../modais', f), 'utf8');
document.body.innerHTML =
    lerModal('modal-poema.html') + lerModal('modal-prosa.html') + '<div id="avisos-toast"></div>';
for (const pref of ['p', 'pr']) {
    for (const cat of [
        'tradicao',
        'estilo',
        'relacao',
        'sensibilidade',
        'tom',
        'outros',
        'dominioImagetico',
    ]) {
        const id = `${pref}-sinal-${cat}`;
        if (!document.getElementById(id)) {
            document.body.insertAdjacentHTML('beforeend', `<input type="hidden" id="${id}" />`);
        }
    }
}

const { db } = await import('../js/db.js');
const { initFormPoema, initFormProsa, temasParaSalvar } = await import('../js/forms.js');
const E = await import('../js/editor.js');

const nomeDe = (id) => db.temas.find((t) => t.id == id)?.nome;

function zerar() {
    db.temas = [
        { id: 1, nome: 'Luto', notas: '' },
        { id: 2, nome: 'Saudade', notas: '' },
    ];
    db.assuntos = [];
    db.poemas = [];
    db.prosas = [];
    db.autores = [];
    E.resetTemasTexto('poemas');
    E.resetTemasTexto('prosas');
}

describe('temasParaSalvar (3e)', () => {
    beforeEach(zerar);

    it('entrega `temas` por id e não leva mais o espelho junto', () => {
        E.adicionarTemaTexto('poemas', 'Saudade');
        E.adicionarTemaTexto('poemas', 'Esperança');
        const r = temasParaSalvar('poemas');
        assert.equal(Object.prototype.hasOwnProperty.call(r, 'sinalizacoesTema'), false);
        assert.deepEqual(
            r.temas.map((e) => nomeDe(e.temaId)),
            ['Saudade', 'Esperança'],
        );
        assert.equal(db.temas.length, 3, 'Tema novo entra no cadastro ao salvar');
    });
});

describe('modal de Poema: salvar grava só `temas`, sem o campo antigo (3e e Etapa 5)', () => {
    const enviar = (titulo) => {
        document.getElementById('p-titulo').value = titulo;
        document.getElementById('form-poema').onsubmit({ preventDefault() {} });
    };

    beforeEach(() => {
        zerar();
        initFormPoema();
        document.getElementById('p-edit-id').value = '';
    });

    it('texto novo: papéis fora de ordem saem na ordem principal, secundário, indefinido', () => {
        E.adicionarTemaTexto('poemas', 'Luto'); // indefinido
        E.adicionarTemaTexto('poemas', 'Saudade');
        E.mudarPapelTemaTexto('poemas', 1, 'principal');
        E.adicionarTemaTexto('poemas', 'Esperança');
        E.mudarPapelTemaTexto('poemas', 2, 'secundario');
        enviar('Novo');
        const salvo = db.poemas[0];
        assert.deepEqual(
            salvo.temas.map((e) => [nomeDe(e.temaId), e.papel]),
            [
                ['Luto', ''],
                ['Saudade', 'principal'],
                ['Esperança', 'secundario'],
            ],
        );
        assert.equal(nomesDosTemas(salvo, db), 'Saudade, Esperança, Luto');
        assert.equal('sinalizacoesTema' in salvo, false);
    });

    it('texto sem Tema salva com `temas` vazio e sem o campo antigo', () => {
        enviar('Sem tema');
        assert.deepEqual(db.poemas[0].temas, []);
        assert.equal('sinalizacoesTema' in db.poemas[0], false);
        assert.equal(nomesDosTemas(db.poemas[0], db), '');
    });

    it('editar texto que ainda tinha o campo antigo: os `temas` editados mandam e o campo some', () => {
        db.poemas = [
            {
                id: 5,
                titulo: 'Antigo',
                texto: 'x',
                temas: [{ temaId: 1, papel: '' }],
                sinalizacoesTema: 'espelho velho e errado',
            },
        ];
        document.getElementById('p-edit-id').value = '5';
        E.carregarTemasTexto('poemas', db.poemas[0]);
        E.mudarPapelTemaTexto('poemas', 0, 'principal');
        E.adicionarTemaTexto('poemas', 'Saudade');
        enviar('Antigo');
        assert.equal(db.poemas.length, 1);
        assert.deepEqual(db.poemas[0].temas, [
            { temaId: 1, papel: 'principal' },
            { temaId: 2, papel: '' },
        ]);
        assert.equal(nomesDosTemas(db.poemas[0], db), 'Luto, Saudade');
        assert.equal('sinalizacoesTema' in db.poemas[0], false);
    });
});

describe('modal de Prosa: salvar grava só `temas`, sem o campo antigo (3e e Etapa 5)', () => {
    const enviar = (titulo) => {
        document.getElementById('pr-titulo').value = titulo;
        document.getElementById('form-prosa').onsubmit({ preventDefault() {} });
    };

    beforeEach(() => {
        zerar();
        initFormProsa();
        document.getElementById('pr-edit-id').value = '';
    });

    it('texto novo: nomes na ordem dos papéis, sem o campo antigo', () => {
        E.adicionarTemaTexto('prosas', 'Luto');
        E.adicionarTemaTexto('prosas', 'Saudade');
        E.mudarPapelTemaTexto('prosas', 1, 'secundario');
        E.mudarPapelTemaTexto('prosas', 0, 'principal');
        enviar('Nova prosa');
        assert.equal(nomesDosTemas(db.prosas[0], db), 'Luto, Saudade');
        assert.equal('sinalizacoesTema' in db.prosas[0], false);
        assert.deepEqual(
            db.prosas[0].temas.map((e) => e.papel),
            ['principal', 'secundario'],
        );
    });
});

describe('Localizar e Substituir sem o campo Tema (3c, D1)', () => {
    const html = fs.readFileSync(path.resolve(__dirname, '../localizar-substituir.html'), 'utf8');

    it('não lista mais `sinalizacoesTema` para Poema nem para Prosa', () => {
        assert.equal(html.includes('sinalizacoesTema'), false);
        assert.equal(html.includes("label: 'Tema'"), false);
    });

    it('os demais campos, inclusive Territorialidade (Fase 2b), continuam', () => {
        assert.equal(
            (html.match(/key: 'sinalizacoesTerritorialidade'/g) || []).length,
            2,
            'Poema e Prosa',
        );
        assert.ok(html.includes("key: 'titulo'"));
        assert.ok(html.includes("key: 'notas'"));
    });

    it('avisa onde renomear Tema', () => {
        assert.match(html, /aba Temas do app/);
    });
});
