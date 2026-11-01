import './helpers/dom-real.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Autor sigiloso no sorteio (entrega 3 de 6): a autoria como o leitor vê,
// na lógica pura, na ficha, nos créditos e na página.
const { textoAutoriaPublica, chavesDeAutoresSigilosos, autoresSemSigilosos, assinaturaAnonimiza } =
    await import('../js/autoria-publica.js');
const { textoAutoriaDe } = await import('../js/utils.js');
const { fichaDoTexto } = await import('../js/ficha-do-texto.js');
const { creditosDe, blocosParatextoDoTexto } = await import('../js/paratexto-publico.js');
const { montarSortear, montarParatexto } = await import('../js/sortear-pagina.js');

const PESSOA = {
    id: 1,
    nome: 'Maria Real',
    nomesLiterarios: [{ nome: 'Job', tipo: 'Pseudônimo' }],
};
const SIGILOSA = { ...PESSOA, sigiloso: true };
const OUTRO = { id: 2, nome: 'João Aberto' };

const texto = (autoria, extra = {}) => ({
    id: 10,
    titulo: 'T',
    texto: 'verso',
    status: 'publicado',
    sorteavel: true,
    autoria,
    ...extra,
});
const vinc = (autorId, extra = {}) => ({
    autorId,
    papel: 'Autor',
    assinatura: 'Ortônimo',
    ...extra,
});
const comPseudonimo = (autorId = 1) =>
    vinc(autorId, { assinatura: 'Pseudônimo', nomeLiterario: 'Job' });

describe('textoAutoriaPublica', () => {
    it('sem Autor sigiloso é igual ao texto do autor, inclusive "pseudônimo de X"', () => {
        const item = texto([comPseudonimo(), vinc(2)]);
        const cadastro = [PESSOA, OUTRO];
        assert.equal(textoAutoriaPublica(item, cadastro), textoAutoriaDe(item, cadastro));
        assert.equal(
            textoAutoriaPublica(item, cadastro),
            'Job (Autor, pseudônimo de Maria Real), João Aberto (Autor)',
        );
    });

    it('sigiloso e assinado com nome literário: só o nome literário, sem "pseudônimo de"', () => {
        const item = texto([comPseudonimo()]);
        assert.equal(textoAutoriaPublica(item, [SIGILOSA]), 'Job (Autor)');
        // o texto do autor continua com o nome real
        assert.match(textoAutoriaDe(item, [SIGILOSA]), /pseudônimo de Maria Real/);
    });

    it('sigiloso e assinado com o nome civil: o autor some; sem ninguém, vira null', () => {
        assert.equal(textoAutoriaPublica(texto([vinc(1)]), [SIGILOSA]), null);
        // nome literário vazio cai no nome civil: também some
        const vazio = texto([vinc(1, { assinatura: 'Pseudônimo', nomeLiterario: '' })]);
        assert.equal(textoAutoriaPublica(vazio, [SIGILOSA]), null);
        // nome literário igual ao civil (sem acento e caixa) também some
        const igual = texto([vinc(1, { assinatura: 'Pseudônimo', nomeLiterario: 'MARIA REAL' })]);
        assert.equal(textoAutoriaPublica(igual, [SIGILOSA]), null);
    });

    it('coautores contam um a um', () => {
        const item = texto([vinc(1), { ...vinc(2), papel: 'Coautor' }]);
        assert.equal(textoAutoriaPublica(item, [SIGILOSA, OUTRO]), 'João Aberto (Coautor)');
        const dois = texto([comPseudonimo(), vinc(2)]);
        assert.equal(
            textoAutoriaPublica(dois, [SIGILOSA, OUTRO]),
            'Job (Autor), João Aberto (Autor)',
        );
    });

    it('sem autoria ou com autor excluído do cadastro: null', () => {
        assert.equal(textoAutoriaPublica(texto([]), [SIGILOSA]), null);
        assert.equal(textoAutoriaPublica(texto([vinc(99)]), [SIGILOSA]), null);
        assert.equal(textoAutoriaPublica({ titulo: 'x' }, [SIGILOSA]), null);
    });

    it('`sigiloso: false` ou ausente não esconde nada', () => {
        const item = texto([vinc(1)]);
        assert.equal(
            textoAutoriaPublica(item, [{ ...PESSOA, sigiloso: false }]),
            'Maria Real (Autor)',
        );
        assert.equal(textoAutoriaPublica(item, [PESSOA]), 'Maria Real (Autor)');
    });
});

describe('créditos de obras citadas', () => {
    it('o nome civil de um Autor sigiloso sai da lista de autores da obra', () => {
        const ocultos = chavesDeAutoresSigilosos([SIGILOSA, OUTRO]);
        assert.deepEqual([...ocultos], ['maria real']);
        assert.deepEqual(autoresSemSigilosos(['Maria Real', 'Outro'], ocultos), ['Outro']);
        // sem acento, caixa nem pontuação
        assert.deepEqual(
            autoresSemSigilosos(['MARIA  réal.'], chavesDeAutoresSigilosos([SIGILOSA])),
            [],
        );
        assert.deepEqual(autoresSemSigilosos(['Maria Real'], new Set()), ['Maria Real']);
    });

    const item = {
        intertextualidade: [
            { relacao: 'Citação', obra: 'Poema X', autores: ['Maria Real', 'Outro Nome'] },
            { relacao: 'Paráfrase', obra: 'Poema Y', autor: 'maria real' },
            { relacao: 'Citação', obra: 'Poema Z', autor: 'Fulano' },
        ],
    };
    const textos = (linhas) => linhas.map((l) => l.map((s) => s.texto).join(''));

    it('só o nome sigiloso some; os outros autores e a obra ficam', () => {
        const ocultos = chavesDeAutoresSigilosos([SIGILOSA]);
        assert.deepEqual(textos(creditosDe(item, ocultos)), [
            'Citação: Poema X (Outro Nome)',
            'Paráfrase: Poema Y',
            'Citação: Poema Z (Fulano)',
        ]);
    });

    it('sem o conjunto, nada muda (compatível com quem chama sem ele)', () => {
        assert.deepEqual(textos(creditosDe(item)), [
            'Citação: Poema X (Maria Real e Outro Nome)',
            'Paráfrase: Poema Y (maria real)',
            'Citação: Poema Z (Fulano)',
        ]);
    });

    it('o conjunto chega pelo bloco "Obras citadas e adaptadas"', () => {
        const ocultos = chavesDeAutoresSigilosos([SIGILOSA]);
        const bloco = blocosParatextoDoTexto(item, ocultos).find(
            (b) => b.rotulo === 'Obras citadas e adaptadas',
        );
        assert.equal(bloco.itens[1][0].texto, 'Paráfrase: Poema Y');
    });
});

describe('ficha e página do sorteio', () => {
    const dbDe = (autores, item) => ({ autores, poemas: [item], prosas: [], temas: [] });

    it('a ficha mostra a autoria pública', () => {
        const aberto = fichaDoTexto(
            dbDe([PESSOA], texto([comPseudonimo()])),
            'poema',
            texto([comPseudonimo()]),
        );
        assert.equal(
            aberto.find((l) => l.rotulo === 'Autoria').valor,
            'Job (Autor, pseudônimo de Maria Real)',
        );
        const item = texto([comPseudonimo()]);
        const sigiloso = fichaDoTexto(dbDe([SIGILOSA], item), 'poema', item);
        assert.equal(sigiloso.find((l) => l.rotulo === 'Autoria').valor, 'Job (Autor)');
        const civil = texto([vinc(1)]);
        const semLinha = fichaDoTexto(dbDe([SIGILOSA], civil), 'poema', civil);
        assert.equal(
            semLinha.some((l) => l.rotulo === 'Autoria'),
            false,
        );
    });

    it('montarParatexto recebe o cadastro e esconde o nome civil nos créditos', () => {
        const item = {
            intertextualidade: [{ relacao: 'Citação', obra: 'X', autor: 'Maria Real' }],
        };
        assert.match(montarParatexto(item).textContent, /Citação: X \(Maria Real\)/);
        const oculto = montarParatexto(item, [SIGILOSA]).textContent;
        assert.match(oculto, /Citação: X/);
        assert.doesNotMatch(oculto, /Maria Real/);
    });

    it('a página sorteada mostra a autoria pública, sem o nome real', () => {
        const item = texto([comPseudonimo()], {
            intertextualidade: [{ relacao: 'Citação', obra: 'X', autor: 'Maria Real' }],
        });
        const raiz = document.createElement('main');
        document.body.innerHTML = '';
        document.body.append(raiz);
        const dados = {};
        montarSortear(raiz, {
            db: dbDe([SIGILOSA], item),
            aleatorio: () => 0,
            armazenamento: {
                getItem: (k) => (k in dados ? dados[k] : null),
                setItem: (k, v) => {
                    dados[k] = String(v);
                },
            },
        });
        document.getElementById('sortear-botao').click();
        const tela = document.getElementById('sortear-resultado').textContent;
        assert.match(tela, /Autoria/);
        assert.match(tela, /Job \(Autor\)/);
        assert.doesNotMatch(tela, /Maria Real/);
        assert.doesNotMatch(tela, /pseudônimo de/);
    });
});

// Anonimizar autor, por nome literário (entrega 3b): a marca no nome vale só
// para os textos assinados com ele; a caixa do Autor continua valendo para todos.
describe('Anonimizar autor (marca no nome literário)', () => {
    const ALVARO = { nome: 'Álvaro', tipo: 'Heterônimo' };
    const JOB_MARCADO = { nome: 'Job', tipo: 'Pseudônimo', anonimizar: true };
    const MARIA = { id: 1, nome: 'Maria Real', nomesLiterarios: [ALVARO, JOB_MARCADO] };
    const comAlvaro = vinc(1, { assinatura: 'Heterônimo', nomeLiterario: 'Álvaro' });
    const comJob = vinc(1, { assinatura: 'Pseudônimo', nomeLiterario: 'Job' });

    it('texto assinado com o nome marcado sai só com ele, sem "pseudônimo de"', () => {
        assert.equal(textoAutoriaPublica(texto([comJob]), [MARIA]), 'Job (Autor)');
        assert.match(textoAutoriaDe(texto([comJob]), [MARIA]), /pseudônimo de Maria Real/);
    });

    it('texto assinado com outro nome do mesmo autor segue como hoje', () => {
        assert.equal(
            textoAutoriaPublica(texto([comAlvaro]), [MARIA]),
            'Álvaro (Autor, heterônimo de Maria Real)',
        );
    });

    it('texto assinado com o nome civil segue visível: a marca é do nome, não do Autor', () => {
        assert.equal(textoAutoriaPublica(texto([vinc(1)]), [MARIA]), 'Maria Real (Autor)');
    });

    it('a caixa do Autor continua mais forte: esconde também o nome civil', () => {
        const sigilosa = { ...MARIA, sigiloso: true };
        assert.equal(textoAutoriaPublica(texto([vinc(1)]), [sigilosa]), null);
        assert.equal(textoAutoriaPublica(texto([comJob]), [sigilosa]), 'Job (Autor)');
        assert.equal(textoAutoriaPublica(texto([comAlvaro]), [sigilosa]), 'Álvaro (Autor)');
    });

    it('coautores contam um a um, cada par com a sua regra', () => {
        const item = texto([comJob, comAlvaro, { ...vinc(2), papel: 'Coautor' }]);
        assert.equal(
            textoAutoriaPublica(item, [MARIA, OUTRO]),
            'Job (Autor), Álvaro (Autor, heterônimo de Maria Real), João Aberto (Coautor)',
        );
    });

    it('acha o nome marcado sem depender de acento, caixa e pontuação', () => {
        const maria = {
            ...MARIA,
            nomesLiterarios: [{ nome: 'Álvaro de Campos', tipo: 'Heterônimo', anonimizar: true }],
        };
        const par = {
            autor: maria,
            assinatura: 'Heterônimo',
            nomeLiterario: 'ALVARO DE CAMPOS.',
        };
        assert.equal(assinaturaAnonimiza(par), true);
    });

    it('nome fora da lista do Autor, Ortônimo e marca falsa não anonimizam', () => {
        const par = (extra) => ({
            autor: MARIA,
            assinatura: 'Pseudônimo',
            nomeLiterario: 'Job',
            ...extra,
        });
        assert.equal(assinaturaAnonimiza(par()), true);
        assert.equal(assinaturaAnonimiza(par({ assinatura: 'Ortônimo' })), false);
        assert.equal(assinaturaAnonimiza(par({ nomeLiterario: 'Desconhecido' })), false);
        assert.equal(assinaturaAnonimiza(par({ nomeLiterario: '' })), false);
        const falsa = { ...MARIA, nomesLiterarios: [{ ...JOB_MARCADO, anonimizar: false }] };
        assert.equal(assinaturaAnonimiza(par({ autor: falsa })), false);
        assert.equal(assinaturaAnonimiza(par({ autor: { id: 3, nome: 'Sem nomes' } })), false);
    });

    it('sem nenhuma marca e sem a caixa, o resultado é idêntico ao do autor', () => {
        const solta = { ...MARIA, nomesLiterarios: [ALVARO, { nome: 'Job', tipo: 'Pseudônimo' }] };
        const item = texto([comJob, comAlvaro]);
        assert.equal(textoAutoriaPublica(item, [solta]), textoAutoriaDe(item, [solta]));
    });

    it('a ficha do texto, na página, usa a marca', () => {
        const item = texto([comJob]);
        const bd = { autores: [MARIA], poemas: [item], prosas: [], temas: [] };
        const linha = fichaDoTexto(bd, 'poema', item).find((l) => l.rotulo === 'Autoria');
        assert.equal(linha.valor, 'Job (Autor)');
        const civil = texto([vinc(1)]);
        const bd2 = { autores: [MARIA], poemas: [civil], prosas: [], temas: [] };
        assert.equal(
            fichaDoTexto(bd2, 'poema', civil).find((l) => l.rotulo === 'Autoria').valor,
            'Maria Real (Autor)',
        );
    });
});
