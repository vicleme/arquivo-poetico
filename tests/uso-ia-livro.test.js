import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    normalizarEstado,
    normalizarComo,
    normalizarDataUso,
    normalizarTextoRef,
    normalizarUso,
    normalizarUsoIa,
    usoIaDoLivro,
    camposUsoIa,
    pendenciasDoUsoIa,
    ferramentasUsadas,
    ondeUsados,
    modelosUsados,
    rotuloEstado,
    textoDoUso,
    textoUsoIa,
    tituloDoTextoDoUso,
    livroCombinaComUsoIa,
    filtrarLivrosPorUsoIa,
    impactoExclusaoTextoNosUsosIa,
    removerTextoDosUsosIa,
    restaurarTextoNosUsosIa,
    usoIaParaExportar,
} from '../js/uso-ia-livro.js';

const livroUsou = (usos, extra = {}) => ({ id: 1, usoIa: { estado: 'usou', usos, ...extra } });

describe('estado e normalização', () => {
    it('estado desconhecido vira Não informado', () => {
        assert.equal(normalizarEstado('usou'), 'usou');
        assert.equal(normalizarEstado('nao-usou'), 'nao-usou');
        assert.equal(normalizarEstado('talvez'), '');
        assert.equal(normalizarEstado(undefined), '');
    });

    it('livro antigo é Não informado, nunca Não usou', () => {
        assert.deepEqual(usoIaDoLivro({ id: 1 }), { estado: '' });
        assert.equal(rotuloEstado(usoIaDoLivro({}).estado), 'Não informado');
        assert.deepEqual(camposUsoIa(undefined), {});
    });

    it('"como" usa a grafia da lista, ignorando caixa e acento', () => {
        assert.equal(normalizarComo('gerou do zero'), 'Gerou do zero');
        assert.equal(normalizarComo('Gerou Quase Pronto'), 'Gerou quase pronto');
        assert.equal(normalizarComo('GEROU UMA BASE'), 'Gerou uma base');
        assert.equal(normalizarComo('Corrigiu ou revisou'), 'Corrigiu ou revisou');
        assert.equal(normalizarComo('inventado'), '');
    });

    it('data parcial: só o válido, dia sem mês cai, sem ano não vale', () => {
        assert.deepEqual(normalizarDataUso({ ano: 2025 }), { ano: 2025 });
        assert.deepEqual(normalizarDataUso({ ano: 2025, mes: 3 }), { ano: 2025, mes: 3 });
        assert.deepEqual(normalizarDataUso({ ano: 2025, dia: 5 }), { ano: 2025 });
        assert.deepEqual(normalizarDataUso({ ano: 2025, mes: 13 }), { ano: 2025 });
        assert.equal(normalizarDataUso({ mes: 3 }), null);
        assert.equal(normalizarDataUso(null), null);
    });

    it('vínculo com texto só aceita poema ou prosa com id', () => {
        assert.deepEqual(normalizarTextoRef({ tipo: 'Poema', id: 4 }), { tipo: 'poema', id: 4 });
        assert.equal(normalizarTextoRef({ tipo: 'livro', id: 4 }), null);
        assert.equal(normalizarTextoRef({ tipo: 'poema' }), null);
    });

    it('uso grava só o que tem valor e descarta uso vazio', () => {
        assert.deepEqual(
            normalizarUso({ onde: '  Capa ', ferramenta: 'Midjourney', modelo: '', como: 'x' }),
            { onde: 'Capa', ferramenta: 'Midjourney' },
        );
        assert.equal(normalizarUso({ onde: '', descricao: '  ' }), null);
    });

    it('usos só valem com estado "usou"', () => {
        const base = { usos: [{ onde: 'Capa' }], nota: 'n' };
        assert.deepEqual(normalizarUsoIa({ estado: 'usou', ...base }), {
            estado: 'usou',
            usos: [{ onde: 'Capa' }],
            nota: 'n',
        });
        assert.deepEqual(normalizarUsoIa({ estado: 'nao-usou', ...base }), {
            estado: 'nao-usou',
            nota: 'n',
        });
        // Não informado também perde os usos, mas a nota geral continua valendo.
        assert.deepEqual(normalizarUsoIa({ estado: '', ...base }), { estado: '', nota: 'n' });
        assert.equal(normalizarUsoIa({ estado: '', usos: base.usos }), null);
    });

    it('"usou" sem nenhum uso continua válido; sem nada, não grava a chave', () => {
        assert.deepEqual(camposUsoIa({ estado: 'usou' }), { usoIa: { estado: 'usou' } });
        assert.deepEqual(camposUsoIa({ estado: '', usos: [] }), {});
    });

    it('pendência: uso com algo preenchido e sem "onde"', () => {
        const u = {
            estado: 'usou',
            usos: [{ onde: 'Capa' }, { ferramenta: 'Claude' }, { onde: '', descricao: '' }],
        };
        assert.deepEqual(pendenciasDoUsoIa(u), { semOnde: [1] });
        assert.deepEqual(pendenciasDoUsoIa({ estado: 'nao-usou' }), { semOnde: [] });
    });
});

describe('sugestões', () => {
    const livros = [
        livroUsou([{ onde: 'Capa', ferramenta: 'claude', modelo: 'Sonnet' }]),
        livroUsou([{ onde: 'Prefácio', ferramenta: 'Flux Kontext', modelo: 'sonnet' }]),
    ];

    it('ferramentas juntam as de fábrica e as digitadas, sem repetir', () => {
        const f = ferramentasUsadas(livros);
        assert.ok(f.includes('ChatGPT'));
        assert.ok(f.includes('Flux Kontext'));
        assert.equal(f.filter((x) => x.toLowerCase() === 'claude').length, 1);
    });

    it('onde soma o que já foi digitado; modelo só o digitado', () => {
        assert.ok(ondeUsados(livros).includes('Prefácio'));
        assert.deepEqual(modelosUsados(livros), ['Sonnet']);
    });
});

describe('leitura', () => {
    it('textoDoUso monta uma linha', () => {
        assert.equal(
            textoDoUso({
                onde: 'Capa',
                ferramenta: 'Midjourney',
                modelo: 'v6',
                data: { mes: 3, ano: 2025 },
                como: 'Gerou do zero',
            }),
            'Capa: Midjourney v6, 03/2025 (Gerou do zero)',
        );
    });

    it('textoUsoIa por estado', () => {
        assert.equal(textoUsoIa({}), '');
        assert.equal(textoUsoIa({ usoIa: { estado: 'nao-usou' } }), 'Não usou');
        assert.equal(textoUsoIa({ usoIa: { estado: 'usou' } }), 'Usou');
        assert.equal(
            textoUsoIa(livroUsou([{ onde: 'Capa' }, { onde: 'Revisão', ferramenta: 'Claude' }])),
            'Usou: Capa; Revisão: Claude',
        );
    });

    it('título do texto ligado, ou null se sumiu', () => {
        const dbRef = { poemas: [{ id: 4, titulo: 'Vinco' }], prosas: [] };
        assert.equal(tituloDoTextoDoUso({ texto: { tipo: 'poema', id: '4' } }, dbRef), 'Vinco');
        assert.equal(tituloDoTextoDoUso({ texto: { tipo: 'prosa', id: 4 } }, dbRef), null);
        assert.equal(tituloDoTextoDoUso({}, dbRef), null);
    });
});

describe('filtro', () => {
    const livros = [
        { id: 1 },
        { id: 2, usoIa: { estado: 'nao-usou' } },
        { id: 3, usoIa: { estado: 'usou' } },
    ];
    it('separa usou, não usou e não informado', () => {
        assert.deepEqual(
            filtrarLivrosPorUsoIa(livros, 'usou').map((l) => l.id),
            [3],
        );
        assert.deepEqual(
            filtrarLivrosPorUsoIa(livros, 'nao-usou').map((l) => l.id),
            [2],
        );
        assert.deepEqual(
            filtrarLivrosPorUsoIa(livros, 'nao-informado').map((l) => l.id),
            [1],
        );
        assert.equal(filtrarLivrosPorUsoIa(livros, '').length, 3);
        assert.equal(livroCombinaComUsoIa({ id: 9 }, 'usou'), false);
    });
});

describe('exclusão de texto ligado a um uso', () => {
    const montar = () => ({
        livros: [
            livroUsou([
                { onde: 'Texto', texto: { tipo: 'poema', id: 4 } },
                { onde: 'Capa' },
                { onde: 'Revisão', texto: { tipo: 'poema', id: 4 } },
            ]),
            {
                id: 2,
                usoIa: {
                    estado: 'usou',
                    usos: [{ onde: 'Texto', texto: { tipo: 'prosa', id: 4 } }],
                },
            },
        ],
    });

    it('conta livros e usos afetados, separando poema de prosa', () => {
        const dbRef = montar();
        assert.deepEqual(impactoExclusaoTextoNosUsosIa(dbRef, 'poema', 4), {
            livrosIds: [1],
            usos: 2,
        });
        assert.deepEqual(impactoExclusaoTextoNosUsosIa(dbRef, 'prosa', 4).livrosIds, [2]);
        assert.equal(impactoExclusaoTextoNosUsosIa(dbRef, 'poema', 99).usos, 0);
    });

    it('remover tira só o vínculo, o uso fica, e o Desfazer devolve', () => {
        const dbRef = montar();
        const removidos = removerTextoDosUsosIa(dbRef, 'poema', 4);
        assert.equal(removidos.length, 2);
        assert.equal(dbRef.livros[0].usoIa.usos.length, 3);
        assert.equal('texto' in dbRef.livros[0].usoIa.usos[0], false);
        assert.equal(dbRef.livros[0].usoIa.usos[0].onde, 'Texto');
        assert.deepEqual(dbRef.livros[1].usoIa.usos[0].texto, { tipo: 'prosa', id: 4 });
        restaurarTextoNosUsosIa(dbRef, removidos);
        assert.deepEqual(dbRef.livros, montar().livros);
    });

    it('restaurar ignora livro que sumiu e não sobrescreve vínculo novo', () => {
        const dbRef = montar();
        const removidos = removerTextoDosUsosIa(dbRef, 'poema', 4);
        dbRef.livros[0].usoIa.usos[0].texto = { tipo: 'poema', id: 7 };
        dbRef.livros.splice(1, 1);
        restaurarTextoNosUsosIa(dbRef, removidos);
        assert.deepEqual(dbRef.livros[0].usoIa.usos[0].texto, { tipo: 'poema', id: 7 });
    });
});

describe('saída para arquivo', () => {
    const dbRef = { poemas: [{ id: 4, titulo: 'Vinco' }], prosas: [] };

    it('Não informado não sai', () => {
        assert.equal(usoIaParaExportar({ id: 1 }, dbRef), null);
    });

    it('o texto ligado sai pelo título e o id não vaza', () => {
        const livro = livroUsou(
            [
                { onde: 'Texto', texto: { tipo: 'poema', id: 4 } },
                { onde: 'Capa', texto: { tipo: 'poema', id: 99 } },
            ],
            { nota: 'geral' },
        );
        assert.deepEqual(usoIaParaExportar(livro, dbRef), {
            estado: 'usou',
            usos: [{ onde: 'Texto', texto: { tipo: 'poema', titulo: 'Vinco' } }, { onde: 'Capa' }],
            nota: 'geral',
        });
    });

    it('nota geral sem estado sai sozinha, sem a chave estado', () => {
        assert.deepEqual(usoIaParaExportar({ id: 1, usoIa: { estado: '', nota: 'x' } }, dbRef), {
            nota: 'x',
        });
    });

    it('Não usou sai só com o estado', () => {
        assert.deepEqual(usoIaParaExportar({ id: 1, usoIa: { estado: 'nao-usou' } }, dbRef), {
            estado: 'nao-usou',
        });
    });
});
