import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const lerModal = (arquivo) =>
    fs.readFileSync(path.resolve(__dirname, '../modais', arquivo), 'utf8');

// garantirModal() (modais.js) busca o HTML do modal via fetch — aqui
// devolve o arquivo real do disco, pra testar o modal de verdade em vez
// de um fixture manual (mesmo motivo de form-autor-campos.test.js).
globalThis.fetch = async (url) => ({
    ok: true,
    status: 200,
    text: async () => lerModal(path.basename(url)),
});

document.body.innerHTML =
    '<main></main><div id="modais-container"></div><div id="lista-autores"></div>';

const { registrarModal } = await import('../js/modais.js');
const { db } = await import('../js/db.js');
const { initFormAutor } = await import('../js/forms.js');
const { renderAutores } = await import('../js/render-listas.js');
const { renderVisualizacaoAutorHtml, abrirVisualizacaoAutor, editarAutorDoVisualizador } =
    await import('../js/visualizar-autor.js');

registrarModal('modal-visualizar-autor', 'modal-visualizar-autor.html', () => {});
registrarModal('modal-autor', 'modal-autor.html', initFormAutor);

const AUTOR_COMPLETO = {
    id: 1,
    nome: 'Cruz e Sousa',
    isni: '0000 0001 2345 6789',
    nacionalidade: 'brasileira',
    nascimento: { dia: 24, mes: 11, ano: 1861 },
    obito: { dia: 19, mes: 3, ano: 1898 },
    nomesLiterarios: [{ nome: 'Dante Negro', tipo: 'Pseudônimo' }],
    sexo: 'Masculino',
    corRaca: 'Preta',
    genero: 'Homem',
    orientacaoSexual: 'Heterossexual',
    identidadeCisTrans: 'Cisgênero',
    religiao: 'Catolicismo',
    neurodivergencias: 'TDAH, Dislexia',
    condicoesClinicas: [{ nome: 'Tuberculose', tipo: 'Física' }],
    deficiencias: [{ nome: 'Cegueira', tipo: 'Visual' }],
    classeSocial: 'Livre pobre',
    grauAcademico: 'Ensino Médio',
    instituicoes: 'Ateneu Provincial, Escola Normal',
    ocupacoes: 'Poeta, Jornalista',
    sobre: 'Nota livre.\nSegunda linha.',
};

describe('renderVisualizacaoAutorHtml', () => {
    it('Autor só com nome: mensagem de vazio, sem nenhuma seção', () => {
        const html = renderVisualizacaoAutorHtml({ id: 1, nome: 'A' });
        assert.match(html, /Nenhum outro dado cadastrado/);
        assert.ok(!html.includes('<section'));
        assert.match(html, /Ainda não aparece em nenhum texto\./);
    });

    it('Autor completo: mostra cabeçalho, as 3 seções e o Sobre', () => {
        const html = renderVisualizacaoAutorHtml(AUTOR_COMPLETO, {
            totalPoemas: 3,
            totalProsas: 1,
        });
        // cabeçalho
        assert.match(html, /Dante Negro/);
        assert.match(html, /· Pseudônimo/);
        assert.match(html, /ISNI:<\/strong> 0000 0001 2345 6789/);
        assert.match(html, /Nacionalidade:<\/strong> brasileira/);
        assert.match(html, /Domínio público:<\/strong> desde/);
        // seções
        assert.match(html, />Identidade</);
        assert.match(html, />Saúde, neurodivergência e deficiência</);
        assert.match(html, />Formação e trabalho</);
        assert.match(html, />Sobre</);
        // campos novos
        assert.match(html, /Religião:<\/strong> Catolicismo/);
        assert.match(html, /Classe social:<\/strong> Livre pobre/);
        assert.match(html, /Grau acadêmico:<\/strong> Ensino Médio/);
        // chips com tipo
        assert.match(html, /Tuberculose <span[^>]*>· Física/);
        assert.match(html, /Cegueira <span[^>]*>· Visual/);
        // listas por vírgula viram chips separados
        assert.match(html, />TDAH</);
        assert.match(html, />Dislexia</);
        assert.match(html, /Ateneu Provincial/);
        assert.match(html, /Escola Normal/);
        assert.match(html, /Jornalista/);
        // contagem
        assert.match(html, /Aparece em 3 poemas e 1 prosa\./);
    });

    it('seção sem nenhum campo preenchido não aparece', () => {
        const html = renderVisualizacaoAutorHtml({ id: 2, nome: 'B', religiao: 'Espiritismo' });
        assert.match(html, />Identidade</);
        assert.ok(!html.includes('Saúde, neurodivergência'));
        assert.ok(!html.includes('Formação e trabalho'));
        assert.ok(!html.includes('>Sobre<'));
    });

    it('campo vazio dentro de uma seção preenchida não gera linha', () => {
        const html = renderVisualizacaoAutorHtml({ id: 3, nome: 'C', religiao: 'Espiritismo' });
        assert.ok(!html.includes('Sexo:'));
        assert.ok(!html.includes('Orientação sexual:'));
    });

    it('mostra o Grupo sexual e de gênero derivado só quando dá pra classificar', () => {
        const completo = renderVisualizacaoAutorHtml({
            sexo: 'Masculino',
            genero: 'Homem',
            orientacaoSexual: 'Heterossexual',
        });
        assert.match(
            completo,
            /Grupo sexual e de gênero \(derivado\):<\/strong> Cis-heteronormativo/,
        );
        const incompleto = renderVisualizacaoAutorHtml({ sexo: 'Masculino' });
        assert.ok(!incompleto.includes('Grupo sexual e de gênero'));
    });

    it('aceita Condições clínicas em formato legado (string separada por vírgula)', () => {
        const html = renderVisualizacaoAutorHtml({ condicoesClinicas: 'Asma, Enxaqueca' });
        assert.match(html, />Asma</);
        assert.match(html, />Enxaqueca</);
    });

    it('não lista os textos do Autor — só a contagem', () => {
        db.poemas = [
            {
                id: 10,
                titulo: 'Título Secreto do Poema',
                autoria: [{ autorId: 1, papel: 'Autor' }],
            },
        ];
        const html = renderVisualizacaoAutorHtml(AUTOR_COMPLETO, {
            totalPoemas: 1,
            totalProsas: 0,
        });
        assert.ok(!html.includes('Título Secreto do Poema'));
        assert.match(html, /Aparece em 1 poema\./);
    });

    it('preserva quebras de linha do Sobre e escapa HTML em todos os campos de texto livre', () => {
        const html = renderVisualizacaoAutorHtml({
            nome: 'X',
            sobre: '<img src=x onerror=alert(1)>\nlinha 2',
            religiao: '<script>x</script>',
            nomesLiterarios: [{ nome: '<b>Falso</b>', tipo: 'Heterônimo' }],
            deficiencias: [{ nome: '<i>x</i>', tipo: 'Visual' }],
            ocupacoes: '<u>Padre</u>',
        });
        assert.ok(!html.includes('<script>'));
        assert.ok(!html.includes('<img'));
        assert.ok(!html.includes('<b>Falso'));
        assert.ok(!html.includes('<i>x'));
        assert.ok(!html.includes('<u>Padre'));
        assert.match(html, /white-space: pre-wrap/);
    });
});

describe('abrirVisualizacaoAutor / editarAutorDoVisualizador', () => {
    beforeEach(() => {
        db.autores = [
            { ...AUTOR_COMPLETO, souEu: true },
            { id: 2, nome: 'Outro' },
        ];
        db.poemas = [
            { id: 10, titulo: 'P1', autoria: [{ autorId: 1 }] },
            { id: 11, titulo: 'P2', autoria: [{ autorId: 1 }] },
        ];
        db.prosas = [];
        // toggleModal alterna: fecha qualquer modal que um teste anterior tenha deixado aberto.
        document.querySelectorAll('.fixed[id^="modal-"]').forEach((m) => m.classList.add('hidden'));
    });

    it('preenche título (com "(você)"), conteúdo e abre o modal', async () => {
        await abrirVisualizacaoAutor(1);
        const modal = document.getElementById('modal-visualizar-autor');
        assert.ok(modal, 'modal deveria ter sido carregado');
        assert.ok(!modal.classList.contains('hidden'));
        assert.equal(
            document.getElementById('modal-visualizar-autor-titulo').innerText,
            'Cruz e Sousa (você)',
        );
        const conteudo = document.getElementById('visualizar-autor-conteudo').innerHTML;
        assert.match(conteudo, /Aparece em 2 poemas\./);
        assert.match(conteudo, /Cegueira/);
    });

    it('Autor inexistente não abre nada nem quebra', async () => {
        const antes = document.getElementById('visualizar-autor-conteudo')?.innerHTML;
        await abrirVisualizacaoAutor(999);
        assert.equal(document.getElementById('visualizar-autor-conteudo')?.innerHTML, antes);
    });

    it('"Editar" fecha a visualização e abre o formulário do mesmo Autor preenchido', async () => {
        await abrirVisualizacaoAutor(1);
        await editarAutorDoVisualizador();
        assert.ok(document.getElementById('modal-visualizar-autor').classList.contains('hidden'));
        const modalEdicao = document.getElementById('modal-autor');
        assert.ok(!modalEdicao.classList.contains('hidden'));
        assert.equal(document.getElementById('au-nome').value, 'Cruz e Sousa');
        assert.equal(document.getElementById('au-edit-id').value, '1');
    });

    it('o modal tem o botão Editar ligado à função global esperada', () => {
        assert.match(
            lerModal('modal-visualizar-autor.html'),
            /onclick="editarAutorDoVisualizador\(\)"/,
        );
    });
});

describe('Card do Autor na lista (renderAutores)', () => {
    beforeEach(() => {
        db.autores = [{ ...AUTOR_COMPLETO }];
        db.poemas = [{ id: 10, titulo: 'P1', autoria: [{ autorId: 1 }] }];
        db.prosas = [];
        renderAutores();
    });

    it('tem botão Ver (ver-autor), Editar e Excluir', () => {
        const html = document.getElementById('lista-autores').innerHTML;
        assert.match(html, /data-action="ver-autor" data-id="1"/);
        assert.match(html, /data-action="editar-autor"/);
        assert.match(html, /data-action="excluir-item"/);
    });

    it('fica enxuto: nome, nacionalidade/datas e contagem — o resto só no visualizador', () => {
        const texto = document.getElementById('lista-autores').textContent;
        assert.match(texto, /Cruz e Sousa/);
        assert.match(texto, /brasileira/);
        assert.match(texto, /aparece em 1 texto/);
        [
            '0000 0001',
            'Catolicismo',
            'Tuberculose',
            'Cegueira',
            'TDAH',
            'Jornalista',
            'Nota livre',
            'Domínio público',
        ].forEach((t) => assert.ok(!texto.includes(t), `"${t}" não deveria aparecer no card`));
    });
});
