import './helpers/localstorage-shim.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { montarFontesBuscaTexto, prefixosOcultosBuscaTexto } =
    await import('../js/fontes-sugestoes-busca-texto.js');
const { sugerirBuscaTexto, PREFIXOS_CANONICOS_TEXTO } =
    await import('../js/sugestoes-busca-texto.js');

const valores = (fonte) =>
    (typeof fonte === 'function' ? fonte() : fonte).map((v) =>
        typeof v === 'object' ? v.valor : v,
    );

function acervo() {
    return {
        etiquetas: [
            { id: 1, nome: 'Moldura de abertura', categoria: 'estilo' },
            { id: 2, nome: 'Poesia confessional', categoria: 'tradicao' },
            { id: 3, nome: 'Melancólico', categoria: 'tom' },
        ],
        temas: [
            { id: 10, nome: 'Luto' },
            { id: 11, nome: 'Amor' },
            { id: 12, nome: 'Tempo' },
        ],
        assuntos: [{ id: 20, nome: 'Vida emocional', temaIds: [10, 11] }],
        pessoas: [
            { id: 30, nome: 'Maria Silva' },
            { id: 31, nome: 'Fulano Oculto', oculto: true },
        ],
        grupos: [
            { id: 40, nome: 'Família' },
            { id: 41, nome: 'Grupo escondido', oculto: true },
        ],
        personagens: [{ id: 50, nome: 'Capitu' }],
        autores: [{ id: 60, nome: 'Vi' }],
        livros: [{ id: 1, titulo: 'Primeiro livro' }],
        partes: [{ id: 2, titulo: 'Parte um' }],
        secoes: [{ id: 3, titulo: 'Luto Estendido' }],
        locais: [{ id: 70, nome: 'Santos' }],
        epocas: [
            { id: 80, nome: 'Adolescência' },
            { id: 81, nome: 'Período oculto', oculto: true },
        ],
        periodosHistoricos: [{ id: 90, nome: 'Nova República' }],
        movimentosEscolas: [
            { id: 100, nome: 'Romantismo', programa: 'Movimento' },
            { id: 101, nome: 'Parnasianismo', programa: 'Escola' },
            { id: 102, nome: 'Ultrarromantismo', programa: '', paiId: 100 },
        ],
        poemas: [
            {
                id: 1,
                titulo: 'A',
                temas: [
                    { temaId: 10, papel: 'principal' },
                    { temaId: 11, papel: 'secundario' },
                    { temaId: 12, papel: '' },
                ],
                pessoas: [{ pessoaId: 30, papeis: ['Dedicatário(a)'] }],
                idiomas: [{ idioma: 'pt-BR', papel: 'principal', dialetos: ['paulistano'] }],
            },
        ],
        prosas: [{ id: 5, titulo: 'P', genero: ['Conto'], temas: [] }],
    };
}

describe('fontes das sugestões da busca de Poemas e Prosas', () => {
    it('etiquetas por categoria e a geral, com a categoria como detalhe', () => {
        const f = montarFontesBuscaTexto(acervo(), 'poemas');
        assert.deepEqual(valores(f.estilo), ['Moldura de abertura']);
        assert.deepEqual(valores(f.tradicao), ['Poesia confessional']);
        assert.deepEqual(valores(f.tom), ['Melancólico']);
        assert.deepEqual(valores(f.relacao), []);
        const geral = f.etiqueta();
        assert.equal(geral.length, 3);
        assert.deepEqual(
            geral.find((e) => e.valor === 'Melancólico'),
            { valor: 'Melancólico', detalhe: 'Tom' },
        );
    });

    it('tema por papel só oferece o que está em uso nos textos da aba', () => {
        const f = montarFontesBuscaTexto(acervo(), 'poemas');
        assert.deepEqual(valores(f.tema).sort(), ['Amor', 'Luto', 'Tempo']);
        assert.deepEqual(valores(f.temaprincipal), ['Luto']);
        assert.deepEqual(valores(f.temasecundario), ['Amor']);
        assert.deepEqual(valores(f.temasempapel), ['Tempo']);
        assert.deepEqual(valores(montarFontesBuscaTexto(acervo(), 'prosas').temaprincipal), []);
    });

    it('pessoa, grupo e período biográfico ocultos não são oferecidos', () => {
        const f = montarFontesBuscaTexto(acervo(), 'poemas');
        assert.deepEqual(valores(f.pessoa), ['Maria Silva']);
        assert.deepEqual(valores(f.grupo), ['Família']);
        assert.deepEqual(valores(f.epoca), ['Adolescência']);
    });

    it('papel sugere só os papéis em uso', () => {
        const f = montarFontesBuscaTexto(acervo(), 'poemas');
        assert.deepEqual(valores(f.papel), ['Dedicatário(a)']);
    });

    it('vínculos pessoa e papel (T6): só pares em uso na aba, sem pessoa oculta', () => {
        const db = acervo();
        db.pessoas.push({ id: 32, nome: 'Pedro' });
        db.poemas[0].pessoas.push(
            { pessoaId: 30, papeis: ['Voz', 'Retratado(a)'] },
            { pessoaId: 31, papeis: ['Voz'] },
            { pessoaId: 32, papeis: ['Mencionado(a)'] },
        );
        db.prosas[0].pessoas = [{ pessoaId: 32, papeis: ['Aludido(a)'] }];
        const poemas = montarFontesBuscaTexto(db, 'poemas').vinculospessoa();
        assert.deepEqual(poemas, [
            { nome: 'Maria Silva', papeis: ['Retratado(a)', 'Dedicatário(a)', 'Voz'] },
            { nome: 'Pedro', papeis: ['Mencionado(a)'] },
        ]);
        // a aba de Prosas só enxerga o que as prosas têm
        assert.deepEqual(montarFontesBuscaTexto(db, 'prosas').vinculospessoa(), [
            { nome: 'Pedro', papeis: ['Aludido(a)'] },
        ]);
        // e a caixinha usa essa tabela para oferecer o @papel
        const r = sugerirBuscaTexto('pessoa:Pedro@', montarFontesBuscaTexto(db, 'poemas'));
        assert.deepEqual(
            r.itens.map((i) => i.texto),
            ['pessoa:Pedro@Mencionado(a)'],
        );
    });

    it('livro, parte, seção, autor, local, período histórico e assunto vêm dos cadastros', () => {
        const f = montarFontesBuscaTexto(acervo(), 'poemas');
        assert.deepEqual(valores(f.livro), ['Primeiro livro']);
        assert.deepEqual(valores(f.parte), ['Parte um']);
        assert.deepEqual(valores(f.secao), ['Luto Estendido']);
        assert.deepEqual(valores(f.autor), ['Vi']);
        assert.deepEqual(valores(f.localescrita), ['Santos']);
        assert.deepEqual(valores(f.territorialidadedireta), ['Santos']);
        assert.deepEqual(valores(f.periodohistorico), ['Nova República']);
        assert.deepEqual(valores(f.assunto), ['Vida emocional']);
        assert.deepEqual(valores(f.personagem), ['Capitu']);
    });

    it('movimento e escola respeitam o Programa, com a herança do pai', () => {
        const f = montarFontesBuscaTexto(acervo(), 'poemas');
        assert.deepEqual(valores(f.corrente).sort(), [
            'Parnasianismo',
            'Romantismo',
            'Ultrarromantismo',
        ]);
        assert.deepEqual(valores(f.movimento).sort(), ['Romantismo', 'Ultrarromantismo']);
        assert.deepEqual(valores(f.escola), ['Parnasianismo']);
        assert.deepEqual(valores(f.movimentodireto).sort(), ['Romantismo', 'Ultrarromantismo']);
    });

    it('idioma e dialeto saem do que os textos da aba já usam; gênero só em Prosa', () => {
        const poemas = montarFontesBuscaTexto(acervo(), 'poemas');
        assert.deepEqual(valores(poemas.idioma), ['pt-BR']);
        assert.deepEqual(valores(poemas.idiomaprincipal), ['pt-BR']);
        assert.deepEqual(valores(poemas.idiomasecundario), []);
        assert.deepEqual(valores(poemas.dialeto), ['paulistano']);
        assert.deepEqual(valores(poemas.genero), []);
        assert.deepEqual(valores(montarFontesBuscaTexto(acervo(), 'prosas').genero), ['Conto']);
    });

    it('genero fica oculto em Poemas e visível em Prosas', () => {
        assert.deepEqual(prefixosOcultosBuscaTexto('poemas'), ['genero']);
        assert.deepEqual(prefixosOcultosBuscaTexto('prosas'), []);
    });

    it('as fontes só usam prefixos canônicos da busca', () => {
        const f = montarFontesBuscaTexto(acervo(), 'poemas');
        // `vinculospessoa` não é prefixo: é a tabela de pares do `pessoa:Nome@Papel`.
        const fora = Object.keys(f).filter(
            (p) => p !== 'vinculospessoa' && !PREFIXOS_CANONICOS_TEXTO.includes(p),
        );
        assert.deepEqual(fora, []);
    });

    it('funciona com um acervo vazio, sem lançar nada', () => {
        const f = montarFontesBuscaTexto({}, 'poemas');
        Object.keys(f).forEach((p) => assert.deepEqual(valores(f[p]), []));
    });

    it('integra com sugerirBuscaTexto: oferece temas em uso e o *', () => {
        const f = montarFontesBuscaTexto(acervo(), 'poemas');
        const s = sugerirBuscaTexto('temaprincipal:', f, {
            prefixosOcultos: prefixosOcultosBuscaTexto('poemas'),
        });
        assert.deepEqual(
            s.itens.map((i) => i.texto),
            ['temaprincipal:*', 'temaprincipal:Luto'],
        );
        assert.equal(sugerirBuscaTexto('genero:', f, { prefixosOcultos: ['genero'] }), null);
    });
});
