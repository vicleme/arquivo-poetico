import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { db } from '../js/db.js';
import { gerarMarkdownExportacao, contarCamposPreenchidos } from '../js/exportar-md.js';

function resetarDb() {
    db.livros = [];
    db.partes = [];
    db.secoes = [];
    db.poemas = [];
    db.prosas = [];
    db.elementos = [];
    db.coletaneas = [];
    db.itensColetanea = [];
    db.autores = [];
}

describe('gerarMarkdownExportacao — Elos e Referências', () => {
    beforeEach(resetarDb);

    it('resolve os {id,tipo,texto} de conceitos.elos/referencias pros títulos dos poemas ligados', () => {
        db.poemas = [
            { id: 1, titulo: 'Poema A', texto: 'linha 1' },
            { id: 2, titulo: 'Poema B', texto: 'linha 2' },
            {
                id: 3,
                titulo: 'Poema C',
                texto: 'linha 3',
                conceitos: {
                    elos: [{ id: 1, tipo: '', texto: '' }],
                    referencias: [
                        { id: 1, tipo: '', texto: '' },
                        { id: 2, tipo: '', texto: '' },
                    ],
                },
            },
        ];

        const md = gerarMarkdownExportacao([db.poemas[2]]);

        assert.match(md, /\*\*Elos:\*\* Poema A/);
        assert.match(md, /\*\*Referências:\*\* Poema A, Poema B/);
    });

    it('inclui o rótulo (Relação+Direção) como prefixo e a nota livre entre parênteses quando preenchidos', () => {
        db.poemas = [
            { id: 1, titulo: 'Poema A', texto: 'linha 1' },
            {
                id: 2,
                titulo: 'Poema C',
                texto: 'linha 3',
                conceitos: {
                    elos: [
                        {
                            id: 1,
                            relacao: 'Reescrita',
                            direcao: 'destino',
                            texto: 'primeira versão, em prosa',
                        },
                    ],
                    referencias: [],
                },
            },
        ];

        const md = gerarMarkdownExportacao([db.poemas[1]]);

        assert.match(md, /\*\*Elos:\*\* Reescrita de: Poema A \(primeira versão, em prosa\)/);
    });

    it('omite as linhas de Elos/Referências quando o item não tem conceitos', () => {
        db.poemas = [{ id: 1, titulo: 'Solo', texto: 'linha única' }];

        const md = gerarMarkdownExportacao(db.poemas);

        assert.doesNotMatch(md, /\*\*Elos:\*\*/);
        assert.doesNotMatch(md, /\*\*Referências:\*\*/);
    });

    it('ignora entradas de elos/referências que não correspondem a nenhum poema existente', () => {
        db.poemas = [
            {
                id: 1,
                titulo: 'Único',
                texto: 'x',
                conceitos: { elos: [{ id: 999, tipo: '', texto: '' }], referencias: [] },
            },
        ];

        const md = gerarMarkdownExportacao(db.poemas);

        assert.doesNotMatch(md, /\*\*Elos:\*\*/);
    });
});

describe('gerarMarkdownExportacao — Idioma (item 9)', () => {
    beforeEach(resetarDb);

    it('inclui a linha de Idioma quando o campo está preenchido', () => {
        db.poemas = [{ id: 1, titulo: 'Solo', texto: 'x', idioma: 'en' }];
        const md = gerarMarkdownExportacao(db.poemas);
        assert.match(md, /\*\*Idioma:\*\* en/);
    });

    it('omite a linha de Idioma quando o campo não está preenchido (dado ainda não migrado)', () => {
        db.poemas = [{ id: 1, titulo: 'Solo', texto: 'x' }];
        const md = gerarMarkdownExportacao(db.poemas);
        assert.doesNotMatch(md, /\*\*Idioma:\*\*/);
    });
});

describe('gerarMarkdownExportacao — Autoria (Nome (Papel), via cadastro central)', () => {
    beforeEach(resetarDb);

    it('inclui a linha de Autoria, no formato "Nome (Papel)", quando o item tem vínculo', () => {
        db.autores = [{ id: 1, nome: 'Victor Leme', sobre: '' }];
        db.poemas = [
            { id: 1, titulo: 'Solo', texto: 'x', autoria: [{ autorId: 1, papel: 'Autor' }] },
        ];
        const md = gerarMarkdownExportacao(db.poemas);
        assert.match(md, /\*\*Autoria:\*\* Victor Leme \(Autor\)/);
    });

    it('junta mais de um autor com vírgula, cada um com seu próprio papel', () => {
        db.autores = [
            { id: 1, nome: 'Victor Leme', sobre: '' },
            { id: 2, nome: 'Dalton', sobre: '' },
        ];
        db.poemas = [
            {
                id: 1,
                titulo: 'Dupla',
                texto: 'x',
                autoria: [
                    { autorId: 1, papel: 'Autor' },
                    { autorId: 2, papel: 'Coautor' },
                ],
            },
        ];
        const md = gerarMarkdownExportacao(db.poemas);
        assert.match(md, /\*\*Autoria:\*\* Victor Leme \(Autor\), Dalton \(Coautor\)/);
    });

    it('omite a linha de Autoria quando o campo não está preenchido (dado ainda não migrado)', () => {
        db.poemas = [{ id: 1, titulo: 'Solo', texto: 'x' }];
        const md = gerarMarkdownExportacao(db.poemas);
        assert.doesNotMatch(md, /\*\*Autoria:\*\*/);
    });

    it('não conta Autoria em Campos Preenchidos (migração sempre preenche — mesmo raciocínio do Idioma)', () => {
        db.autores = [{ id: 1, nome: 'Victor Leme', sobre: '' }];
        const semAutoria = { id: 1, titulo: 'Solo', texto: 'x' };
        const comAutoria = {
            id: 2,
            titulo: 'Solo',
            texto: 'x',
            autoria: [{ autorId: 1, papel: 'Autor' }],
        };
        assert.equal(contarCamposPreenchidos(semAutoria), contarCamposPreenchidos(comAutoria));
    });
});

describe('gerarMarkdownExportacao — Envios e Reações (item 7, lista pessoa+data+meio+reação)', () => {
    beforeEach(resetarDb);

    it('inclui o bloco "### Envios e Reações" com pessoa, meio e data no cabeçalho da linha', () => {
        db.poemas = [
            {
                id: 1,
                titulo: 'Solo',
                texto: 'x',
                envios: [
                    {
                        pessoa: 'Dani',
                        data: { dia: 12, mes: 5, ano: 2023 },
                        meio: 'WhatsApp',
                        reacao: 'Achou a metáfora da aragonita bonita.',
                        notas: '',
                    },
                ],
            },
        ];
        const md = gerarMarkdownExportacao(db.poemas);
        assert.match(md, /### Envios e Reações/);
        assert.match(
            md,
            /- \*\*Dani, via WhatsApp, 12\/05\/2023:\*\* Achou a metáfora da aragonita bonita\./,
        );
    });

    it('lista mais de um envio, um por linha, cada um com seus próprios dados', () => {
        db.poemas = [
            {
                id: 1,
                titulo: 'Solo',
                texto: 'x',
                envios: [
                    { pessoa: 'Dani', meio: 'WhatsApp', reacao: 'Gostou' },
                    { pessoa: 'Rafa', meio: 'Instagram', reacao: 'Comentou' },
                ],
            },
        ];
        const md = gerarMarkdownExportacao(db.poemas);
        assert.match(md, /- \*\*Dani, via WhatsApp:\*\* Gostou/);
        assert.match(md, /- \*\*Rafa, via Instagram:\*\* Comentou/);
    });

    it('mostra a nota entre parênteses e em itálico, separada da reação', () => {
        db.poemas = [
            {
                id: 1,
                titulo: 'Solo',
                texto: 'x',
                envios: [{ pessoa: 'Dani', reacao: 'Gostou', notas: 'Enviei sem querer 2x' }],
            },
        ];
        const md = gerarMarkdownExportacao(db.poemas);
        assert.match(md, /Gostou \*\(Enviei sem querer 2x\)\*/);
    });

    it('omite o bloco quando não há envios (campo ausente ou lista vazia)', () => {
        db.poemas = [
            { id: 1, titulo: 'Sem campo', texto: 'x' },
            { id: 2, titulo: 'Lista vazia', texto: 'x', envios: [] },
        ];
        const md = gerarMarkdownExportacao(db.poemas);
        assert.doesNotMatch(md, /### Envios e Reações/);
    });

    it('conta em Campos Preenchidos (diferente de Idioma/Autoria — não é preenchido por migração)', () => {
        const semEnvios = { id: 1, titulo: 'Solo', texto: 'x' };
        const comEnvios = {
            id: 2,
            titulo: 'Solo',
            texto: 'x',
            envios: [{ pessoa: 'Dani', reacao: 'Gostou' }],
        };
        assert.equal(contarCamposPreenchidos(comEnvios), contarCamposPreenchidos(semEnvios) + 1);
    });
});

describe('gerarMarkdownExportacao — Reconhecimentos (item 8, lista prêmio+posição+ano+texto)', () => {
    beforeEach(resetarDb);

    it('inclui o bloco "### Reconhecimentos" com prêmio, posição e ano no cabeçalho da linha', () => {
        db.poemas = [
            {
                id: 1,
                titulo: 'beija-flor',
                texto: 'x',
                reconhecimentos: [
                    {
                        premio: 'Concurso X',
                        posicao: '1º lugar',
                        ano: 2020,
                        texto: 'Categoria poesia.',
                    },
                ],
            },
        ];
        const md = gerarMarkdownExportacao(db.poemas);
        assert.match(md, /### Reconhecimentos/);
        assert.match(md, /- \*\*Concurso X, 1º lugar, 2020:\*\* Categoria poesia\./);
    });

    it('lista mais de um reconhecimento, um por linha, cada um com seus próprios dados', () => {
        db.poemas = [
            {
                id: 1,
                titulo: 'Solo',
                texto: 'x',
                reconhecimentos: [
                    { premio: 'Concurso X', posicao: '1º lugar', ano: 2020, texto: '' },
                    { premio: 'Concurso Y', posicao: 'Menção honrosa', ano: 2021, texto: '' },
                ],
            },
        ];
        const md = gerarMarkdownExportacao(db.poemas);
        assert.match(md, /- \*\*Concurso X, 1º lugar, 2020:\*\*/);
        assert.match(md, /- \*\*Concurso Y, Menção honrosa, 2021:\*\*/);
    });

    it('omite campos ausentes do cabeçalho da linha (ex.: sem ano)', () => {
        db.poemas = [
            {
                id: 1,
                titulo: 'Solo',
                texto: 'x',
                reconhecimentos: [{ premio: 'Concurso X', posicao: '1º lugar', texto: 'Nota' }],
            },
        ];
        const md = gerarMarkdownExportacao(db.poemas);
        assert.match(md, /- \*\*Concurso X, 1º lugar:\*\* Nota/);
    });

    it('omite o bloco quando não há reconhecimentos (campo ausente ou lista vazia)', () => {
        db.poemas = [
            { id: 1, titulo: 'Sem campo', texto: 'x' },
            { id: 2, titulo: 'Lista vazia', texto: 'x', reconhecimentos: [] },
        ];
        const md = gerarMarkdownExportacao(db.poemas);
        assert.doesNotMatch(md, /### Reconhecimentos/);
    });

    it('conta em Campos Preenchidos (diferente de Idioma/Autoria — não é preenchido por migração)', () => {
        const semReconhecimentos = { id: 1, titulo: 'Solo', texto: 'x' };
        const comReconhecimentos = {
            id: 2,
            titulo: 'Solo',
            texto: 'x',
            reconhecimentos: [{ premio: 'Concurso X' }],
        };
        assert.equal(
            contarCamposPreenchidos(comReconhecimentos),
            contarCamposPreenchidos(semReconhecimentos) + 1,
        );
    });
});

describe('gerarMarkdownExportacao — Grupos (Grupo (Pessoa), via cadastro central)', () => {
    beforeEach(() => {
        resetarDb();
        db.pessoas = [];
        db.grupos = [];
    });

    it('mostra "Grupo (Pessoa)" pra cada grupo que uma pessoa do texto pertence', () => {
        db.grupos = [
            { id: 10, nome: 'Namorado', cor: 'blue' },
            { id: 11, nome: 'Ex-namorado', cor: 'amber' },
        ];
        db.pessoas = [
            { id: 1, nome: 'Dalton', grupoIds: [10] },
            { id: 2, nome: 'Pedro', grupoIds: [11] },
        ];
        db.poemas = [
            {
                id: 1,
                titulo: 'Poema A',
                texto: 'x',
                pessoas: [
                    { pessoaId: 1, papeis: [] },
                    { pessoaId: 2, papeis: [] },
                ],
            },
        ];

        const md = gerarMarkdownExportacao(db.poemas);

        assert.match(md, /\*\*Grupos:\*\* Namorado \(Dalton\), Ex-namorado \(Pedro\)/);
    });

    it('pessoa em mais de um grupo gera um par por grupo, não uma linha combinada', () => {
        db.grupos = [
            { id: 10, nome: 'Namorado', cor: 'blue' },
            { id: 11, nome: 'Ex-namorado', cor: 'amber' },
        ];
        db.pessoas = [{ id: 1, nome: 'Pedro', grupoIds: [10, 11] }];
        db.poemas = [
            { id: 1, titulo: 'Poema A', texto: 'x', pessoas: [{ pessoaId: 1, papeis: [] }] },
        ];

        const md = gerarMarkdownExportacao(db.poemas);

        assert.match(md, /\*\*Grupos:\*\* Namorado \(Pedro\), Ex-namorado \(Pedro\)/);
    });

    it('omite a linha "Grupos" quando nenhuma pessoa do texto pertence a um grupo', () => {
        db.pessoas = [{ id: 1, nome: 'Sem Grupo', grupoIds: [] }];
        db.poemas = [
            { id: 1, titulo: 'Poema A', texto: 'x', pessoas: [{ pessoaId: 1, papeis: [] }] },
        ];

        const md = gerarMarkdownExportacao(db.poemas);

        assert.doesNotMatch(md, /\*\*Grupos:\*\*/);
    });

    it('linha "Grupos" é independente da linha "Pessoas" (papel do texto ≠ grupo da pessoa)', () => {
        db.grupos = [{ id: 10, nome: 'Amigos', cor: 'emerald' }];
        db.pessoas = [{ id: 1, nome: 'Fábio', grupoIds: [10] }];
        db.poemas = [
            {
                id: 1,
                titulo: 'Poema A',
                texto: 'x',
                pessoas: [{ pessoaId: 1, papeis: ['Dedicatário(a)'] }],
            },
        ];

        const md = gerarMarkdownExportacao(db.poemas);

        assert.match(md, /\*\*Pessoas:\*\* Fábio \(Dedicatário\(a\)\)/);
        assert.match(md, /\*\*Grupos:\*\* Amigos \(Fábio\)/);
    });
});
