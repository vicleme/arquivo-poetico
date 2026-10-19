import './helpers/dom-real.js';

import fs from 'node:fs';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Modal "Importar campos por .json" (modais/modal-importar-campos.html +
// ui-importar-campos.js): prévia, aplicar, desfazer e download do modelo.
const modal = fs.readFileSync(
    new URL('../modais/modal-importar-campos.html', import.meta.url),
    'utf8',
);
document.body.innerHTML = `<main></main>${modal}`;

const { db } = await import('../js/db.js');
const {
    abrirImportarCampos,
    initFormImportarCampos,
    aplicarImportacaoCampos,
    desfazerImportacaoCampos,
    baixarModeloCampos,
    dependencias,
} = await import('../js/ui-importar-campos.js');
const { garantirTema } = await import('../js/temas.js');

const $ = (id) => document.getElementById(id);
const conferir = () =>
    $('form-importar-campos').dispatchEvent(new Event('submit', { cancelable: true }));
const colar = (valor) => {
    $('icp-texto').value = typeof valor === 'string' ? valor : JSON.stringify(valor);
};
const textoDoRelatorio = () => $('icp-relatorio').textContent.replace(/\s+/g, ' ');

initFormImportarCampos();
// happy-dom não tem IndexedDB: o snapshot forçado é trocado por um que dá certo.
dependencias.snapshot = async () => true;

function preparar() {
    db.poemas = [
        {
            id: 1,
            titulo: 'Olhar Lírico',
            temas: [],
            sinalizacoesTema: '',
            assuntosPapel: [],
            assuntosExcluidos: [],
        },
        { id: 2, titulo: 'Caveira', temas: [], sinalizacoesTema: '' },
    ];
    db.prosas = [{ id: 10, titulo: 'Caveira', temas: [], sinalizacoesTema: '' }];
    db.temas = [];
    db.etiquetas = [];
    db.tagClusters = [];
    db.assuntos = [];
    const saudade = garantirTema(db, 'Saudade');
    db.assuntos.push({ id: 100, nome: 'Vida emocional', notas: '', temaIds: [saudade] });
    $('form-importar-campos').reset();
    $('icp-relatorio').innerHTML = '';
    $('icp-aplicar').disabled = true;
    // O formulário zerado não dispara "input": limpa a conferência anterior.
    $('icp-texto').dispatchEvent(new Event('input'));
}

const ARQUIVO = {
    textos: [
        {
            id: 1,
            etiquetas: { Tom: ['Esperançoso'] },
            temas: [{ tema: 'Saudade', papel: 'principal' }],
            assuntos: [{ assunto: 'Vida emocional', papel: 'secundario' }],
        },
        { titulo: 'Caveira', etiquetas: { Tom: ['Sombrio'] } },
        { titulo: 'Não Existe', etiquetas: { Tom: ['x'] } },
    ],
};

describe('modal Importar campos (DOM real via happy-dom)', () => {
    beforeEach(preparar);

    it('abre o modal limpo, com Aplicar desligado', async () => {
        $('icp-texto').value = 'sobra';
        // O registro do modal (registrarModal) é do main.js e não roda aqui; o
        // que a abertura limpa, sim.
        await abrirImportarCampos();
        assert.equal($('icp-texto').value, '');
        assert.equal($('icp-aplicar').disabled, true);
        assert.equal($('icp-relatorio').innerHTML, '');
    });

    it('Conferir mostra a prévia, não grava nada e liga o Aplicar', () => {
        colar(ARQUIVO);
        conferir();
        const t = textoDoRelatorio();
        assert.match(t, /1 texto será alterado/);
        assert.match(t, /3 entradas no arquivo/);
        assert.match(t, /2 entradas ficaram de fora/);
        // "Caveira" existe em Poema e em Prosa; "Não Existe" não existe.
        assert.match(t, /o título existe em mais de um texto \(Poema id 2, Prosa id 10\)/);
        assert.match(t, /nenhum texto com esse título/);
        assert.match(t, /Tom: Esperançoso/);
        assert.equal($('icp-aplicar').disabled, false);
        assert.equal(db.etiquetas.length, 0);
        assert.deepEqual(db.poemas[0].temas, []);
    });

    it('Jargão e gíria: a prévia mostra a soma e marca o termo novo; Aplicar grava e Desfazer volta', async () => {
        colar({
            textos: [{ id: 1, jargaoGiria: ['Gíria juvenil', 'Giria de balada'] }],
        });
        conferir();
        const t = textoDoRelatorio();
        assert.match(t, /2 jargões ou gírias somados/);
        assert.match(t, /Jargão e gíria \(termos novos, sem cadastro\): Giria de balada/);
        assert.match(t, /\+ Jargão e gíria: Gíria juvenil, Giria de balada/);
        assert.equal(db.poemas[0].jargaoGiria, undefined);
        assert.equal($('icp-aplicar').disabled, false);

        await aplicarImportacaoCampos();
        assert.deepEqual(db.poemas[0].jargaoGiria, ['Gíria juvenil', 'Giria de balada']);
        desfazerImportacaoCampos();
        assert.equal(db.poemas[0].jargaoGiria, undefined);
    });

    it('editar o texto depois de conferir desliga o Aplicar', () => {
        colar(ARQUIVO);
        conferir();
        assert.equal($('icp-aplicar').disabled, false);
        colar(ARQUIVO);
        $('icp-texto').dispatchEvent(new Event('input'));
        assert.equal($('icp-aplicar').disabled, true);
    });

    it('JSON inválido, sem "textos" e "textos" vazio explicam o problema e não ligam o Aplicar', () => {
        colar('{ quebrado');
        conferir();
        assert.match(textoDoRelatorio(), /O JSON não é válido/);
        colar({ itens: [] });
        conferir();
        assert.match(textoDoRelatorio(), /não tem a lista “textos”/);
        colar({ textos: [] });
        conferir();
        assert.match(textoDoRelatorio(), /Os exemplos do modelo ficam em “exemplos”/);
        assert.equal($('icp-aplicar').disabled, true);
    });

    it('arquivo em que nada mudaria avisa e não liga o Aplicar', () => {
        colar({ textos: [{ titulo: 'Não Existe', etiquetas: { Tom: ['x'] } }] });
        conferir();
        assert.equal($('icp-aplicar').disabled, true);
        assert.match(textoDoRelatorio(), /nenhum texto com esse título/);
    });

    it('Aplicar grava, mostra o relatório e Desfazer devolve tudo (uma vez só)', async () => {
        colar(ARQUIVO);
        conferir();
        await aplicarImportacaoCampos();
        assert.equal(db.etiquetas.length, 1);
        assert.equal(db.poemas[0].temas.length, 1);
        assert.deepEqual(db.poemas[0].assuntosPapel, [{ assuntoId: 100, papel: 'secundario' }]);
        assert.match(textoDoRelatorio(), /Importado: 1 texto alterado/);
        assert.match(textoDoRelatorio(), /Desfazer importação/);
        assert.equal($('icp-aplicar').disabled, true);

        desfazerImportacaoCampos();
        assert.equal(db.etiquetas.length, 0);
        assert.deepEqual(db.poemas[0].temas, []);
        assert.deepEqual(db.poemas[0].assuntosPapel, []);
        assert.match(textoDoRelatorio(), /Importação desfeita/);

        desfazerImportacaoCampos();
        assert.equal(db.etiquetas.length, 0);
    });

    it('sem snapshot de segurança, nada é gravado e o Aplicar volta a ligar', async () => {
        const original = dependencias.snapshot;
        dependencias.snapshot = async () => false;
        try {
            colar(ARQUIVO);
            conferir();
            await aplicarImportacaoCampos();
            assert.equal(db.etiquetas.length, 0);
            assert.equal($('icp-aplicar').disabled, false);
        } finally {
            dependencias.snapshot = original;
        }
    });

    it('a prévia lista as etiquetas e os temas novos para conferir a grafia', () => {
        colar({
            textos: [{ id: 1, etiquetas: { Tom: ['Inédito'] }, temas: ['Tema Novo', 'Saudade'] }],
        });
        conferir();
        const t = textoDoRelatorio();
        assert.match(t, /Vão entrar no cadastro \(novas\)/);
        assert.match(t, /Tom: Inédito/);
        assert.match(t, /Temas: Tema Novo/);
        // Saudade já existia: só o Tema Novo aparece como novo no cadastro.
        assert.match(t, /Temas: Tema Novo O que muda em cada texto/);
    });

    it('escapa HTML vindo do arquivo', () => {
        colar({ textos: [{ titulo: '<img src=x onerror=alert(1)>', etiquetas: { Tom: ['a'] } }] });
        conferir();
        assert.equal($('icp-relatorio').querySelector('img'), null);
        assert.match(textoDoRelatorio(), /<img src=x onerror=alert\(1\)>/);
    });
});

describe('Baixar modelo', () => {
    function capturar(acao) {
        const baixados = [];
        const criar = URL.createObjectURL;
        const revogar = URL.revokeObjectURL;
        const click = window.HTMLAnchorElement.prototype.click;
        URL.createObjectURL = (blob) => {
            baixados.push({ blob });
            return 'blob:teste';
        };
        URL.revokeObjectURL = () => {};
        window.HTMLAnchorElement.prototype.click = function () {
            baixados[baixados.length - 1].nome = this.download;
        };
        try {
            acao();
        } finally {
            URL.createObjectURL = criar;
            URL.revokeObjectURL = revogar;
            window.HTMLAnchorElement.prototype.click = click;
        }
        return baixados;
    }

    it('baixa o modelo simples e o modelo com o vocabulário do acervo', async () => {
        preparar();
        db.etiquetas = [];
        const [simples] = capturar(() => baixarModeloCampos());
        assert.equal(simples.nome, 'arquivo-poetico-modelo-campos.json');
        const m1 = JSON.parse(await simples.blob.text());
        assert.equal(m1.formato, 'arquivo-poetico-campos');
        assert.equal('vocabulario' in m1, false);

        const [com] = capturar(() => baixarModeloCampos({ comVocabulario: true }));
        assert.equal(com.nome, 'arquivo-poetico-modelo-campos-com-vocabulario.json');
        const m2 = JSON.parse(await com.blob.text());
        assert.deepEqual(m2.vocabulario.temas, ['Saudade']);
        assert.deepEqual(m2.vocabulario.assuntos, [
            { assunto: 'Vida emocional', temas: ['Saudade'] },
        ]);
    });
});

describe('modal Importar campos: extras (territorialidade, pessoas, campos simples)', () => {
    beforeEach(() => {
        preparar();
        db.locais = [];
        db.pessoas = [];
        db.poemas[0].pendencia = 'antiga';
    });

    const EXTRAS = {
        textos: [
            {
                id: 1,
                territorialidade: ['Santos'],
                localEscrita: 'Santos',
                pessoas: [{ pessoa: 'Gab', papeis: ['Retratado(a)'] }],
                pendencia: 'nova',
            },
            { id: 2, pessoas: [{ pessoa: 'Dani', papeis: ['Padrinho'] }] },
        ],
    };

    it('a prévia mostra locais e pessoas novos, o campo mantido e o papel inválido', () => {
        colar(EXTRAS);
        conferir();
        const t = textoDoRelatorio();
        assert.match(t, /1 local somado/);
        assert.match(t, /1 pessoa ajustada/);
        assert.match(t, /Locais: Santos/);
        assert.match(t, /Pessoas: Gab/);
        assert.match(t, /Pendência ficou “antiga” \(o arquivo trazia “nova”\)/);
        assert.match(t, /o papel “Padrinho” não está na lista/);
        assert.equal(db.locais.length, 0);
        assert.equal(db.pessoas.length, 0);
        assert.equal($('icp-aplicar').disabled, false);
    });

    it('a opção de substituir troca o campo e desliga o Aplicar até conferir de novo', () => {
        colar(EXTRAS);
        conferir();
        $('icp-substituir').checked = true;
        $('icp-substituir').dispatchEvent(new Event('change'));
        assert.equal($('icp-aplicar').disabled, true);
        conferir();
        assert.match(textoDoRelatorio(), /Pendência: “antiga” → “nova”/);
    });

    it('aplicar grava locais, pessoas e campos, e desfazer devolve tudo', async () => {
        colar(EXTRAS);
        $('icp-substituir').checked = true;
        conferir();
        await aplicarImportacaoCampos();
        assert.equal(db.poemas[0].pendencia, 'nova');
        assert.equal(db.poemas[0].sinalizacoesTerritorialidade, 'Santos');
        assert.equal(db.locais.length, 1);
        assert.equal(db.pessoas.length, 1);
        assert.equal(db.poemas[0].pessoas[0].papeis[0], 'Retratado(a)');
        desfazerImportacaoCampos();
        assert.equal(db.poemas[0].pendencia, 'antiga');
        assert.equal(db.locais.length, 0);
        assert.equal(db.pessoas.length, 0);
        assert.deepEqual(db.poemas[0].pessoas ?? [], []);
    });
});

describe('modal Importar campos: ligações Tema → Assunto', () => {
    beforeEach(() => {
        preparar();
        garantirTema(db, 'Memória');
        db.assuntos.push({ id: 101, nome: 'Tempo, memória e perda', notas: '', temaIds: [] });
    });

    const ARQUIVO_LIGACOES = {
        textos: [],
        ligacoes: [
            { tema: 'Memória', assunto: 'Tempo, memória e perda' },
            { tema: 'Tema Fantasma', assunto: 'Vida emocional' },
            { tema: 'Saudade', assunto: 'Assunto Fantasma' },
        ],
    };

    it('arquivo só com ligações liga o Aplicar, mostra a prévia e não grava nada ainda', () => {
        colar(ARQUIVO_LIGACOES);
        conferir();
        const t = textoDoRelatorio();
        assert.match(t, /1 tema será ligado a um assunto/);
        assert.match(t, /Temas que serão ligados a Assuntos/);
        assert.match(t, /Memória → Tempo, memória e perda/);
        assert.match(t, /o Tema “Tema Fantasma” não existe/);
        assert.match(t, /o Assunto “Assunto Fantasma” não existe/);
        assert.equal($('icp-aplicar').disabled, false);
        assert.deepEqual(db.assuntos.find((a) => a.id === 101).temaIds, []);
    });

    it('Aplicar liga o Tema ao Assunto e Desfazer devolve (uma vez só)', async () => {
        colar(ARQUIVO_LIGACOES);
        conferir();
        await aplicarImportacaoCampos();
        assert.equal(db.assuntos.find((a) => a.id === 101).temaIds.length, 1);
        assert.match(textoDoRelatorio(), /Importado: 1 tema ligado a um assunto/);
        assert.match(textoDoRelatorio(), /Temas ligados a Assuntos/);
        desfazerImportacaoCampos();
        assert.deepEqual(db.assuntos.find((a) => a.id === 101).temaIds, []);
    });

    it('ligação que já existe não liga o Aplicar', () => {
        db.assuntos
            .find((a) => a.id === 101)
            .temaIds.push(db.temas.find((x) => x.nome === 'Memória').id);
        colar({ ligacoes: [{ tema: 'Memória', assunto: 'Tempo, memória e perda' }] });
        conferir();
        assert.equal($('icp-aplicar').disabled, true);
        assert.match(textoDoRelatorio(), /1 ligação já existia/);
    });

    it('arquivo com "ligacoes" mas sem "textos" é aceito', () => {
        colar({ ligacoes: [{ tema: 'Memória', assunto: 'Tempo, memória e perda' }] });
        conferir();
        assert.doesNotMatch(textoDoRelatorio(), /não tem a lista/);
        assert.equal($('icp-aplicar').disabled, false);
    });
});
