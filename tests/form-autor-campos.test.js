import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Campos do modal de Autor: Religião, Classe social, Neurodivergência,
// Condições clínicas (tags tipificadas Física/Mental) e Escolaridade
// (Grau acadêmico + Instituições frequentadas). DOM real do modal, ver
// form-autor-sou-eu.test.js pelo motivo.
const MODAL_HTML = fs.readFileSync(path.resolve(__dirname, '../modais/modal-autor.html'), 'utf8');
document.body.innerHTML = MODAL_HTML;

const { db } = await import('../js/db.js');
const { initFormAutor, editarAutor } = await import('../js/forms.js');
const editor = await import('../js/editor.js');
const { renderDropdowns, prepararNovo } = await import('../js/ui.js');
const {
    CLASSES_SOCIAIS_AUTOR,
    DIMENSOES_CONDICAO_CLINICA,
    GRAUS_ACADEMICOS_AUTOR,
    TIPOS_DEFICIENCIA,
} = await import('../js/utils.js');

const el = (id) => document.getElementById(id);
const enviar = () => el('form-autor').onsubmit({ preventDefault() {} });
const apertarEnter = (id) =>
    el(id).dispatchEvent(
        new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    );

function limparModal() {
    el('form-autor').reset();
    el('au-edit-id').value = '';
    editor.resetNomesLiterariosAutor();
    editor.resetOcupacoesAutor();
    editor.resetNeurodivergenciasAutor();
    editor.resetCondicoesClinicasAutor();
    editor.resetDeficienciasAutor();
    editor.resetInstituicoesAutor();
}

describe('Modal de Autor: novos campos (Religião, Classe social, Neurodivergência, Condições clínicas, Escolaridade)', () => {
    beforeEach(() => {
        db.autores = [];
        limparModal();
        initFormAutor();
    });

    it('as opções do select de Classe social batem com CLASSES_SOCIAIS_AUTOR', () => {
        const opcoes = Array.from(el('au-classe-social').options)
            .map((o) => o.value)
            .filter(Boolean);
        assert.deepEqual(opcoes, CLASSES_SOCIAIS_AUTOR);
    });

    it('as opções do select de Grau acadêmico batem com GRAUS_ACADEMICOS_AUTOR', () => {
        const opcoes = Array.from(el('au-grau-academico').options)
            .map((o) => o.value)
            .filter(Boolean);
        assert.deepEqual(opcoes, GRAUS_ACADEMICOS_AUTOR);
    });

    it('Grau acadêmico fora da lista (dado legado) não some ao abrir e salvar o Autor', async () => {
        db.autores = [{ id: 9, nome: 'Legado', grauAcademico: 'Curso técnico' }];
        await editarAutor(9);
        assert.equal(el('au-grau-academico').value, 'Curso técnico');
        enviar();
        assert.equal(db.autores[0].grauAcademico, 'Curso técnico');

        // A opção provisória não vaza pro Autor seguinte.
        db.autores.push({ id: 10, nome: 'Outro', grauAcademico: 'Doutorado' });
        await editarAutor(10);
        assert.equal(el('au-grau-academico').value, 'Doutorado');
        assert.ok(!el('au-grau-academico').querySelector('option[data-legado]'));
    });

    it('grava e relê todos os campos novos', async () => {
        el('au-nome').value = 'Lima Barreto';
        el('au-religiao').value = 'Catolicismo';
        el('au-classe-social').value = 'Livre pobre';
        el('au-grau-academico').value = 'Ensino Superior incompleto';

        el('au-neurodivergencia-input').value = 'TDAH';
        editor.adicionarNeurodivergenciaAutor();
        el('au-neurodivergencia-input').value = 'Dislexia';
        editor.adicionarNeurodivergenciaAutor();

        el('au-condicao-clinica-input').value = 'Alcoolismo';
        editor.adicionarCondicaoClinicaAutor();
        editor.alterarTipoCondicaoClinicaAutor('Alcoolismo', 'Mental');
        el('au-condicao-clinica-input').value = 'Diabetes tipo 1';
        editor.adicionarCondicaoClinicaAutor();

        el('au-instituicao-input').value = 'Escola Politécnica';
        editor.adicionarInstituicaoAutor();
        el('au-instituicao-input').value = 'Colégio Pedro II';
        editor.adicionarInstituicaoAutor();

        enviar();

        assert.equal(db.autores.length, 1);
        const a = db.autores[0];
        assert.equal(a.religiao, 'Catolicismo');
        assert.equal(a.classeSocial, 'Livre pobre');
        assert.equal(a.grauAcademico, 'Ensino Superior incompleto');
        assert.equal(a.neurodivergencias, 'TDAH, Dislexia');
        assert.equal(a.instituicoes, 'Escola Politécnica, Colégio Pedro II');
        assert.deepEqual(a.condicoesClinicas, [
            { nome: 'Alcoolismo', tipo: 'Mental' },
            { nome: 'Diabetes tipo 1', tipo: 'Física' },
        ]);

        // Limpa o modal e recarrega a partir do cadastro.
        limparModal();
        await editarAutor(a.id);
        assert.equal(el('au-religiao').value, 'Catolicismo');
        assert.equal(el('au-classe-social').value, 'Livre pobre');
        assert.equal(el('au-grau-academico').value, 'Ensino Superior incompleto');
        assert.equal(el('au-neurodivergencias').value, 'TDAH, Dislexia');
        assert.equal(el('au-instituicoes').value, 'Escola Politécnica, Colégio Pedro II');
        assert.deepEqual(JSON.parse(el('au-condicoes-clinicas').value), a.condicoesClinicas);
        assert.match(el('au-neurodivergencias-container').textContent, /TDAH/);
        assert.match(el('au-condicoes-clinicas-container').textContent, /Alcoolismo/);
        assert.match(el('au-instituicoes-container').textContent, /Colégio Pedro II/);
    });

    it('tipo da condição clínica começa em Física e alterna só a tag escolhida', () => {
        el('au-condicao-clinica-input').value = 'Asma';
        editor.adicionarCondicaoClinicaAutor();
        el('au-condicao-clinica-input').value = 'Depressão';
        editor.adicionarCondicaoClinicaAutor();
        editor.alterarTipoCondicaoClinicaAutor('Depressão', 'Mental');
        // tipo fora da lista fechada é ignorado
        editor.alterarTipoCondicaoClinicaAutor('Asma', 'Espiritual');

        assert.deepEqual(JSON.parse(el('au-condicoes-clinicas').value), [
            { nome: 'Asma', tipo: DIMENSOES_CONDICAO_CLINICA[0] },
            { nome: 'Depressão', tipo: 'Mental' },
        ]);
    });

    it('Deficiências: grava e relê tags tipificadas (Física/Auditiva/Visual/Intelectual/Mental-psicossocial/Múltipla)', async () => {
        el('au-nome').value = 'Autor com deficiência';
        el('au-deficiencia-input').value = 'Cegueira';
        editor.adicionarDeficienciaAutor();
        editor.alterarTipoDeficienciaAutor('Cegueira', 'Visual');
        el('au-deficiencia-input').value = 'Surdez parcial';
        editor.adicionarDeficienciaAutor();
        editor.alterarTipoDeficienciaAutor('Surdez parcial', 'Auditiva');
        el('au-deficiencia-input').value = 'Surdocegueira';
        apertarEnter('au-deficiencia-input');
        editor.alterarTipoDeficienciaAutor('Surdocegueira', 'Múltipla');
        // tipo fora da lista é ignorado (continua Física, o padrão)
        el('au-deficiencia-input').value = 'Paralisia';
        editor.adicionarDeficienciaAutor();
        editor.alterarTipoDeficienciaAutor('Paralisia', 'Espiritual');

        enviar();
        const a = db.autores[0];
        assert.deepEqual(a.deficiencias, [
            { nome: 'Cegueira', tipo: 'Visual' },
            { nome: 'Surdez parcial', tipo: 'Auditiva' },
            { nome: 'Surdocegueira', tipo: 'Múltipla' },
            { nome: 'Paralisia', tipo: 'Física' },
        ]);

        limparModal();
        assert.deepEqual(JSON.parse(el('au-deficiencias').value), []);
        await editarAutor(a.id);
        assert.deepEqual(JSON.parse(el('au-deficiencias').value), a.deficiencias);
        assert.match(el('au-deficiencias-container').textContent, /Surdez parcial/);
    });

    it('as 6 categorias de deficiência aparecem como opções do chip', () => {
        el('au-deficiencia-input').value = 'Cegueira';
        editor.adicionarDeficienciaAutor();
        const opcoes = Array.from(
            el('au-deficiencias-container').querySelectorAll('select option'),
        ).map((o) => o.value);
        assert.deepEqual(opcoes, TIPOS_DEFICIENCIA);
    });

    it('Autor só com deficiência abre o grupo Saúde ao editar', async () => {
        db.autores = [{ id: 5, nome: 'X', deficiencias: [{ nome: 'Cegueira', tipo: 'Visual' }] }];
        await editarAutor(5);
        const abertos = Array.from(
            document.querySelectorAll('#modal-autor details[data-grupo-autor]'),
        )
            .filter((d) => d.open)
            .map((d) => d.dataset.grupoAutor);
        assert.deepEqual(abertos, ['saude']);
    });

    it('não duplica tag repetida nem grava tag vazia', () => {
        el('au-neurodivergencia-input').value = 'TDAH';
        editor.adicionarNeurodivergenciaAutor();
        el('au-neurodivergencia-input').value = 'TDAH';
        editor.adicionarNeurodivergenciaAutor();
        el('au-neurodivergencia-input').value = '   ';
        editor.adicionarNeurodivergenciaAutor();
        assert.equal(el('au-neurodivergencias').value, 'TDAH');
    });

    it('Enter nos inputs de tag adiciona a tag', () => {
        el('au-neurodivergencia-input').value = 'Autismo';
        apertarEnter('au-neurodivergencia-input');
        el('au-condicao-clinica-input').value = 'Epilepsia';
        apertarEnter('au-condicao-clinica-input');
        el('au-instituicao-input').value = 'Universidade de Coimbra';
        apertarEnter('au-instituicao-input');

        assert.equal(el('au-neurodivergencias').value, 'Autismo');
        assert.deepEqual(JSON.parse(el('au-condicoes-clinicas').value), [
            { nome: 'Epilepsia', tipo: 'Física' },
        ]);
        assert.equal(el('au-instituicoes').value, 'Universidade de Coimbra');
    });

    it('Autor antigo (sem os campos novos) abre com tudo vazio, sem herdar o anterior', async () => {
        db.autores = [
            {
                id: 1,
                nome: 'Com tudo',
                religiao: 'Espiritismo',
                classeSocial: 'Livre pobre',
                neurodivergencias: 'TDAH',
                condicoesClinicas: [{ nome: 'Asma', tipo: 'Física' }],
                grauAcademico: 'Doutorado',
                instituicoes: 'USP',
            },
            { id: 2, nome: 'Legado' },
        ];
        await editarAutor(1);
        await editarAutor(2);
        assert.equal(el('au-religiao').value, '');
        assert.equal(el('au-classe-social').value, '');
        assert.equal(el('au-grau-academico').value, '');
        assert.equal(el('au-neurodivergencias').value, '');
        assert.equal(el('au-instituicoes').value, '');
        assert.deepEqual(JSON.parse(el('au-condicoes-clinicas').value), []);
        assert.equal(el('au-condicoes-clinicas-container').textContent.trim(), '');

        // Salvar o legado sem mexer grava os campos novos vazios, sem quebrar.
        enviar();
        const salvo = db.autores.find((x) => x.id == 2);
        assert.equal(salvo.religiao, '');
        assert.equal(salvo.classeSocial, '');
        assert.deepEqual(salvo.condicoesClinicas, []);
    });

    it('aceita condicoesClinicas em formato legado (string separada por vírgula) sem quebrar', async () => {
        db.autores = [{ id: 3, nome: 'Teste', condicoesClinicas: 'Asma, Enxaqueca' }];
        await editarAutor(3);
        assert.deepEqual(JSON.parse(el('au-condicoes-clinicas').value), [
            { nome: 'Asma', tipo: 'Física' },
            { nome: 'Enxaqueca', tipo: 'Física' },
        ]);
    });

    it('modal tem os 3 grupos colapsáveis, fechados por padrão, com todos os campos dentro do grupo certo', () => {
        const grupos = Array.from(
            document.querySelectorAll('#modal-autor details[data-grupo-autor]'),
        );
        assert.deepEqual(
            grupos.map((d) => d.dataset.grupoAutor),
            ['identidade', 'saude', 'formacao'],
        );
        assert.ok(grupos.every((d) => d.classList.contains('campo-grupo')));

        const grupoDe = (id) =>
            el(id).closest('details[data-grupo-autor]')?.dataset.grupoAutor ?? null;
        [
            'au-sexo',
            'au-cor-raca',
            'au-genero',
            'au-orientacao-sexual',
            'au-identidade-cis-trans',
            'au-religiao',
        ].forEach((id) => assert.equal(grupoDe(id), 'identidade', id));
        ['au-neurodivergencia-input', 'au-condicao-clinica-input', 'au-deficiencia-input'].forEach(
            (id) => assert.equal(grupoDe(id), 'saude', id),
        );
        [
            'au-classe-social',
            'au-grau-academico',
            'au-instituicao-input',
            'au-ocupacao-input',
        ].forEach((id) => assert.equal(grupoDe(id), 'formacao', id));
        // Sempre visíveis, fora de qualquer grupo:
        [
            'au-nome',
            'au-isni',
            'au-nome-literario-input',
            'au-nacionalidade',
            'au-nasc-ano',
            'au-obito-ano',
            'au-sobre',
        ].forEach((id) => assert.equal(grupoDe(id), null, id));
    });

    it('editarAutor abre só os grupos com dados; Autor novo fecha todos', async () => {
        const abertos = () =>
            Array.from(document.querySelectorAll('#modal-autor details[data-grupo-autor]'))
                .filter((d) => d.open)
                .map((d) => d.dataset.grupoAutor);

        db.autores = [
            { id: 1, nome: 'Só saúde', neurodivergencias: 'TDAH' },
            { id: 2, nome: 'Identidade e formação', genero: 'Mulher', ocupacoes: 'Jornalista' },
            { id: 3, nome: 'Nada' },
        ];
        await editarAutor(1);
        assert.deepEqual(abertos(), ['saude']);
        await editarAutor(2);
        assert.deepEqual(abertos(), ['identidade', 'formacao']);
        await editarAutor(3);
        assert.deepEqual(abertos(), []);

        // Abre à mão e confirma que "Novo Autor" zera o estado dos grupos.
        await editarAutor(2);
        assert.equal(abertos().length, 2);
        await prepararNovo('autor');
        assert.deepEqual(abertos(), []);
    });

    it('renderDropdowns popula os datalists de Religião e Instituições', () => {
        db.autores = [
            {
                id: 1,
                nome: 'A',
                religiao: 'Budismo',
                grauAcademico: 'Curso técnico',
                instituicoes: 'USP, UFRJ',
            },
            { id: 2, nome: 'B', instituicoes: 'USP' },
        ];
        renderDropdowns();
        const valores = (id) =>
            Array.from(el(id).querySelectorAll('option')).map((o) => o.getAttribute('value'));

        const religioes = valores('sugestoes-religiao-autor');
        assert.ok(religioes.includes('Budismo'));
        assert.ok(religioes.includes('Catolicismo')); // semente fixa

        // Instituições: só o que já foi cadastrado, sem repetir
        assert.deepEqual(valores('sugestoes-instituicoes-autor'), ['UFRJ', 'USP']);
    });
});
