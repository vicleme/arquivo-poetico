import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { db } from '../js/db.js';
import {
    gerarMarkdownExportacao,
    contarCamposPreenchidos,
    INFO_STATUS,
    legendaCorParaMarkdown,
} from '../js/exportar-md.js';

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

describe('gerarMarkdownExportacao — Elos e Ecos', () => {
    beforeEach(resetarDb);

    it('resolve os {id,tipo,texto} de conceitos.elos/ecos pros títulos dos poemas ligados', () => {
        db.poemas = [
            { id: 1, titulo: 'Poema A', texto: 'linha 1' },
            { id: 2, titulo: 'Poema B', texto: 'linha 2' },
            {
                id: 3,
                titulo: 'Poema C',
                texto: 'linha 3',
                conceitos: {
                    elos: [{ id: 1, tipo: '', texto: '' }],
                    ecos: [
                        { id: 1, tipo: '', texto: '' },
                        { id: 2, tipo: '', texto: '' },
                    ],
                },
            },
        ];

        const md = gerarMarkdownExportacao([db.poemas[2]]);

        assert.match(md, /\*\*Elos:\*\* Poema A/);
        assert.match(md, /\*\*Ecos:\*\* Poema A, Poema B/);
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
                    ecos: [],
                },
            },
        ];

        const md = gerarMarkdownExportacao([db.poemas[1]]);

        assert.match(md, /\*\*Elos:\*\* Reescrita de: Poema A \(primeira versão, em prosa\)/);
    });

    it('omite as linhas de Elos/Ecos quando o item não tem conceitos', () => {
        db.poemas = [{ id: 1, titulo: 'Solo', texto: 'linha única' }];

        const md = gerarMarkdownExportacao(db.poemas);

        assert.doesNotMatch(md, /\*\*Elos:\*\*/);
        assert.doesNotMatch(md, /\*\*Ecos:\*\*/);
    });

    it('ignora entradas de elos/ecos que não correspondem a nenhum poema existente', () => {
        db.poemas = [
            {
                id: 1,
                titulo: 'Único',
                texto: 'x',
                conceitos: { elos: [{ id: 999, tipo: '', texto: '' }], ecos: [] },
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

describe('gerarMarkdownExportacao — Autoavaliação (campo novo, texto livre)', () => {
    beforeEach(resetarDb);

    it('inclui o bloco "### Autoavaliação" com o texto digitado', () => {
        db.poemas = [
            { id: 1, titulo: 'Solo', texto: 'x', autoavaliacao: 'Gostei bastante deste.' },
        ];
        const md = gerarMarkdownExportacao(db.poemas);
        assert.match(md, /### Autoavaliação\n\nGostei bastante deste\./);
    });

    it('omite o bloco quando não há autoavaliação (campo ausente ou vazio)', () => {
        db.poemas = [
            { id: 1, titulo: 'Sem campo', texto: 'x' },
            { id: 2, titulo: 'Vazio', texto: 'x', autoavaliacao: '   ' },
        ];
        const md = gerarMarkdownExportacao(db.poemas);
        assert.doesNotMatch(md, /### Autoavaliação/);
    });

    it('conta em Campos Preenchidos', () => {
        const semAutoavaliacao = { id: 1, titulo: 'Solo', texto: 'x' };
        const comAutoavaliacao = { id: 2, titulo: 'Solo', texto: 'x', autoavaliacao: 'Opinião' };
        assert.equal(
            contarCamposPreenchidos(comAutoavaliacao),
            contarCamposPreenchidos(semAutoavaliacao) + 1,
        );
    });

    it('funciona igual em Prosa', () => {
        db.prosas = [{ id: 1, titulo: 'Conto', texto: 'x', autoavaliacao: 'Podia ser melhor.' }];
        const md = gerarMarkdownExportacao(db.prosas);
        assert.match(md, /### Autoavaliação\n\nPodia ser melhor\./);
    });
});

describe('gerarMarkdownExportacao — Intertextualidade com link e nota (campos novos)', () => {
    beforeEach(resetarDb);

    it('inclui link e nota na linha, depois do texto principal (sem linkTexto, o link vira o rótulo)', () => {
        db.poemas = [
            {
                id: 1,
                titulo: 'Solo',
                texto: 'x',
                intertextualidade: [
                    {
                        tipo: 'Citação',
                        texto: 'Trecho citado',
                        link: 'https://exemplo.com/obra',
                        nota: 'Nota livre',
                    },
                ],
            },
        ];
        const md = gerarMarkdownExportacao(db.poemas);
        assert.match(md, /### Intertextualidade/);
        assert.match(
            md,
            /- \*\*Citação:\*\* Trecho citado — \[https:\/\/exemplo\.com\/obra\]\(https:\/\/exemplo\.com\/obra\) \*\(Nota livre\)\*/,
        );
    });

    it('usa linkTexto como rótulo do link Markdown quando preenchido', () => {
        db.poemas = [
            {
                id: 1,
                titulo: 'Solo',
                texto: 'x',
                intertextualidade: [
                    {
                        tipo: 'Notícias',
                        texto: '',
                        link: 'https://g1.globo.com/pe/pernambuco/noticia/2020/06/19/algum-slug-bem-longo.ghtml',
                        linkTexto: 'G1 Pernambuco',
                    },
                ],
            },
        ];
        const md = gerarMarkdownExportacao(db.poemas);
        assert.match(
            md,
            /- \*\*Notícias:\*\* {2}— \[G1 Pernambuco\]\(https:\/\/g1\.globo\.com\/pe\/pernambuco\/noticia\/2020\/06\/19\/algum-slug-bem-longo\.ghtml\)/,
        );
    });

    it('omite o traço/parênteses quando link ou nota estão ausentes', () => {
        db.poemas = [
            {
                id: 1,
                titulo: 'Solo',
                texto: 'x',
                intertextualidade: [{ tipo: 'Citação', texto: 'Trecho' }],
            },
        ];
        const md = gerarMarkdownExportacao(db.poemas);
        assert.match(md, /- \*\*Citação:\*\* Trecho\n/);
    });

    it('continua funcionando sem os campos novos (compatibilidade com dados antigos)', () => {
        db.poemas = [
            {
                id: 1,
                titulo: 'Solo',
                texto: 'x',
                intertextualidade: [{ tipo: 'Citação', texto: 'Trecho antigo' }],
            },
        ];
        assert.doesNotThrow(() => gerarMarkdownExportacao(db.poemas));
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

    it('mostra o grupo referenciado diretamente, sem parêntese de pessoa', () => {
        db.grupos = [{ id: 10, nome: 'Família', cor: 'blue' }];
        db.poemas = [{ id: 1, titulo: 'Poema A', texto: 'x', gruposDiretos: [10] }];

        const md = gerarMarkdownExportacao(db.poemas);

        assert.match(md, /\*\*Grupos:\*\* Família(?!\s*\()/);
    });

    it('junta grupo-via-pessoa e grupo direto na mesma linha, nessa ordem', () => {
        db.grupos = [
            { id: 10, nome: 'Namorado', cor: 'blue' },
            { id: 20, nome: 'Família', cor: 'rose' },
        ];
        db.pessoas = [{ id: 1, nome: 'Dalton', grupoIds: [10] }];
        db.poemas = [
            {
                id: 1,
                titulo: 'Poema A',
                texto: 'x',
                pessoas: [{ pessoaId: 1, papeis: [] }],
                gruposDiretos: [20],
            },
        ];

        const md = gerarMarkdownExportacao(db.poemas);

        assert.match(md, /\*\*Grupos:\*\* Namorado \(Dalton\), Família\n/);
    });

    it('grupoId direto sem correspondência no cadastro (grupo excluído) é ignorado, não quebra a linha', () => {
        db.grupos = [{ id: 10, nome: 'Família', cor: 'blue' }];
        db.poemas = [{ id: 1, titulo: 'Poema A', texto: 'x', gruposDiretos: [10, 999] }];

        const md = gerarMarkdownExportacao(db.poemas);

        assert.match(md, /\*\*Grupos:\*\* Família\n/);
    });

    it('gruposDiretos ausente (dado antigo, sem o campo) não quebra e não afeta a linha', () => {
        db.pessoas = [{ id: 1, nome: 'Sem Grupo', grupoIds: [] }];
        db.poemas = [
            { id: 1, titulo: 'Poema A', texto: 'x', pessoas: [{ pessoaId: 1, papeis: [] }] },
        ];

        assert.doesNotThrow(() => gerarMarkdownExportacao(db.poemas));
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

describe('gerarMarkdownExportacao — Status "Privado" (🔒)', () => {
    beforeEach(resetarDb);

    it('mostra o emoji e o título certos pro status "privado"', () => {
        db.poemas = [{ id: 1, titulo: 'Poema Íntimo', texto: 'x', status: 'privado' }];

        const md = gerarMarkdownExportacao(db.poemas);

        assert.match(md, /\*\*Status:\*\* 🔒 Privado/);
    });

    it('INFO_STATUS reconhece "privado" (não cai no fallback genérico ⚪)', () => {
        assert.equal(INFO_STATUS.privado.emoji, '🔒');
        assert.equal(INFO_STATUS.privado.titulo, 'Privado');
    });
});

describe('legendaCorParaMarkdown (cor/fundo/fonte perdidos na conversão para Markdown)', () => {
    it('texto sem nenhum <div> de estilo não gera legenda', () => {
        assert.equal(legendaCorParaMarkdown('verso sem formatação'), '');
    });

    it('**negrito**/_itálico_/<u> sozinhos (sem cor/fundo/fonte) não geram legenda', () => {
        assert.equal(legendaCorParaMarkdown('**negrito** e _itálico_ e <u>sublinhado</u>'), '');
    });

    it('cor de texto gera uma linha "- "trecho" — cor do texto #HEX"', () => {
        const md = legendaCorParaMarkdown('<div style="color: #ff0000;">vermelho</div>');
        assert.match(md, /^_Formatação de cor\/fundo\/fonte do texto original/);
        assert.match(md, /- "vermelho" — cor do texto #FF0000/);
    });

    it('fundo (background-color) gera "fundo #HEX", separado de cor de texto', () => {
        const md = legendaCorParaMarkdown(
            '<div style="background-color: #710808;">texto com fundo</div>',
        );
        assert.match(md, /- "texto com fundo" — fundo #710808/);
        assert.ok(!md.includes('cor do texto'));
    });

    it('cor de texto e fundo no mesmo <div> entram na mesma linha, "cor do texto X, fundo Y"', () => {
        const md = legendaCorParaMarkdown(
            '<div style="color: #ffffff; background-color: #710808;">ambos</div>',
        );
        assert.match(md, /- "ambos" — cor do texto #FFFFFF, fundo #710808/);
    });

    it('regressão: background-color não é lido como color (bug do "color:" batendo como substring)', () => {
        const md = legendaCorParaMarkdown('<div style="background-color: #710808;">fundo só</div>');
        assert.ok(!md.includes('cor do texto #710808'));
        assert.match(md, /fundo #710808/);
    });

    it('font-family gera \'fonte "nome"\', entre aspas', () => {
        const md = legendaCorParaMarkdown('<div style="font-family: Georgia;">com fonte</div>');
        assert.match(md, /- "com fonte" — fonte "Georgia"/);
    });

    it('runs consecutivos com o mesmo estilo (cor/fundo/fonte) viram um único trecho agrupado', () => {
        const md = legendaCorParaMarkdown(
            '<div style="color: #ff0000;">um **dois** três</div>',
        );
        // "um ", "dois" (negrito) e " três" são 3 runs com a mesma cor —
        // devem virar um único grupo/linha, não três.
        const ocorrencias = (md.match(/— cor do texto #FF0000/g) || []).length;
        assert.equal(ocorrencias, 1);
        assert.match(md, /- "um dois três" — cor do texto #FF0000/);
    });

    it('um run sem cor/fundo/fonte no meio fecha o grupo — não funde trechos de estilos diferentes', () => {
        const md = legendaCorParaMarkdown(
            '<div style="color: #ff0000;">vermelho</div> sem cor <div style="color: #0000ff;">azul</div>',
        );
        assert.match(md, /- "vermelho" — cor do texto #FF0000/);
        assert.match(md, /- "azul" — cor do texto #0000FF/);
        // Duas linhas separadas, não uma só juntando os dois trechos.
        assert.equal((md.match(/^- /gm) || []).length, 2);
    });

    it('grupo que atravessa quebra de linha (mesmo <div> envolvendo vários versos) junta os trechos com " / "', () => {
        const md = legendaCorParaMarkdown(
            '<div style="color: #ff0000;">verso um\nverso dois</div>',
        );
        assert.match(md, /- "verso um \/ verso dois" — cor do texto #FF0000/);
    });

    it('cor de 3 dígitos (#f00) é expandida e normalizada em maiúsculas (#FF0000)', () => {
        const md = legendaCorParaMarkdown('<div style="color: #f00;">curta</div>');
        assert.match(md, /- "curta" — cor do texto #FF0000/);
    });

    it('fundo cobrindo vários trechos de cor diferente é anunciado uma vez só, aninhado', () => {
        const md = legendaCorParaMarkdown(
            '<div style="background-color: #710808;">' +
                '<div style="color: #727272;">cinza</div>' +
                '<div style="color: #ffffff;">branco</div>' +
                '</div>',
        );
        // Só uma ocorrência de "fundo #710808" (não uma por trecho de cor).
        assert.equal((md.match(/fundo #710808/g) || []).length, 1);
        assert.match(md, /- fundo #710808 no trecho "cinza \/ branco":/);
        assert.match(md, /  - "cinza" — cor do texto #727272/);
        assert.match(md, /  - "branco" — cor do texto #FFFFFF/);
    });

    it('fundo isolado (sem outro trecho de cor no mesmo bloco) mantém o formato antigo, sem aninhar', () => {
        const md = legendaCorParaMarkdown(
            '<div style="background-color: #710808;"><div style="color: #ffffff;">só um trecho</div></div>',
        );
        assert.match(md, /^- "só um trecho" — cor do texto #FFFFFF, fundo #710808/m);
        assert.ok(!md.includes('no trecho'));
    });
});
