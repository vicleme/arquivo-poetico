import './helpers/dom-real.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Leitura autônoma, entrega 4: o dado, os modais, salvar e abrir, coluna,
// busca, Preencher campo e Importar campos.
const { db } = await import('../js/db.js');
const {
    OPCOES_LEITURA_AUTONOMA,
    leituraAutonomaDe,
    temLeituraCondicionada,
    definirLeituraAutonoma,
    lerLeituraAutonoma,
    rotuloLeituraCondicionada,
    avisoSorteioLeituraCondicionada,
} = await import('../js/leitura-autonoma.js');
const { montarRegistro } = await import('../js/exportar.js');
const { gerarMarkdownItem } = await import('../js/exportar-md.js');
const { renderVisualizacaoHtml } = await import('../js/visualizar.js');
const { atualizarAvisoLeituraSorteio } = await import('../js/editor.js');
const { DEFINICAO_COLUNAS } = await import('../js/colunas.js');
const { celulaLeituraAutonoma } = await import('../js/celulas-tabela.js');
const { filtrarTextos, PREFIXOS_CANONICOS_POR_CAMPO } = await import('../js/utils.js');
const { decorarCamposBusca } = await import('../js/render-listas.js');
const {
    obterCampoPreenchivel,
    planejarPreenchimento,
    aplicarPreenchimento,
    planejarLimpeza,
    aplicarLimpeza,
} = await import('../js/campos-preenchiveis.js');
const { lerExtrasDaEntrada, aplicarCamposSimples } =
    await import('../js/importar-campos-extras.js');
const fs = await import('node:fs');
const ler = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');

describe('o dado', () => {
    it('quatro opções, a primeira é o padrão vazio', () => {
        assert.deepEqual(
            OPCOES_LEITURA_AUTONOMA.map((o) => o.valor),
            ['', 'sequencia', 'conjunto', 'inicio'],
        );
        assert.equal(OPCOES_LEITURA_AUTONOMA[0].rotulo, 'Lê-se sozinho');
    });
    it('ausente, desconhecido e de outro tipo valem Lê-se sozinho', () => {
        for (const item of [{}, null, { leituraAutonoma: 'x' }, { leituraAutonoma: 3 }]) {
            assert.equal(leituraAutonomaDe(item), '');
            assert.equal(temLeituraCondicionada(item), false);
        }
        assert.equal(temLeituraCondicionada({ leituraAutonoma: 'conjunto' }), true);
    });
    it('definir devolve se mudou e grava sempre a string', () => {
        const t = {};
        assert.equal(definirLeituraAutonoma(t, 'sequencia'), true);
        assert.equal(definirLeituraAutonoma(t, 'sequencia'), false);
        assert.equal(definirLeituraAutonoma(t, 'lixo'), true);
        assert.equal(t.leituraAutonoma, '');
        assert.equal(definirLeituraAutonoma(null, 'conjunto'), false);
    });
    it('lerLeituraAutonoma aceita valor, rótulo e forma solta', () => {
        assert.equal(lerLeituraAutonoma('Só em sequência'), 'sequencia');
        assert.equal(lerLeituraAutonoma('sequência'), 'sequencia');
        assert.equal(lerLeituraAutonoma('CONJUNTO'), 'conjunto');
        assert.equal(lerLeituraAutonoma('só como início'), 'inicio');
        assert.equal(lerLeituraAutonoma('só como origem'), 'inicio');
        assert.equal(lerLeituraAutonoma('Lê-se sozinho'), '');
        assert.equal(lerLeituraAutonoma('talvez'), undefined);
        assert.equal(lerLeituraAutonoma(null), undefined);
    });
});

describe('modais e salvar', () => {
    it('os dois modais têm o select com as quatro opções, e o salvar e abrir o ligam', () => {
        for (const [arq, id] of [
            ['../modais/modal-poema.html', 'p-leitura-autonoma'],
            ['../modais/modal-prosa.html', 'pr-leitura-autonoma'],
        ]) {
            const html = ler(arq);
            assert.match(html, new RegExp(`<select[^>]*id="${id}"`), arq);
            for (const v of ['sequencia', 'conjunto', 'inicio']) {
                assert.ok(html.includes(`value="${v}"`), `${arq} sem ${v}`);
            }
        }
        const forms = ler('../js/forms.js');
        assert.match(forms, /leituraAutonoma: document\.getElementById\('p-leitura-autonoma'\)/);
        assert.match(forms, /leituraAutonoma: document\.getElementById\('pr-leitura-autonoma'\)/);
        assert.match(forms, /leituraAutonoma: \['p-leitura-autonoma'/);
        assert.match(forms, /leituraAutonoma: \['pr-leitura-autonoma'/);
    });
});

describe('coluna', () => {
    it('existe em Poemas e Prosas, escondida por padrão', () => {
        for (const tabela of ['poemas', 'prosas']) {
            const def = DEFINICAO_COLUNAS[tabela].find((c) => c.key === 'leituraAutonoma');
            assert.ok(def, tabela);
            assert.equal(def.default, false);
            assert.equal(def.label, 'Leitura autônoma');
        }
    });
    it('a célula mostra "—" no padrão e o rótulo nos outros', () => {
        assert.match(celulaLeituraAutonoma({}), /—/);
        assert.match(celulaLeituraAutonoma({ leituraAutonoma: 'conjunto' }), /Só em conjunto/);
    });
});

describe('busca leitura:', () => {
    const lista = () => {
        db.poemas = [
            { id: 1, titulo: 'A', leituraAutonoma: 'sequencia' },
            { id: 2, titulo: 'B' },
            { id: 3, titulo: 'C', leituraAutonoma: 'conjunto' },
            { id: 4, titulo: 'D', leituraAutonoma: '' },
            { id: 5, titulo: 'E', leituraAutonoma: 'inicio' },
        ];
        return db.poemas.map((p) => decorarCamposBusca(p, '', 'poema'));
    };
    const ids = (l) => l.map((i) => i.id);
    it('acha pelo rótulo, com ou sem acento', () => {
        assert.deepEqual(ids(filtrarTextos(lista(), 'leitura:sequencia')), [1]);
        assert.deepEqual(ids(filtrarTextos(lista(), 'leitura:conjunto')), [3]);
        assert.deepEqual(ids(filtrarTextos(lista(), 'leitura:início')), [5]);
    });
    it('`leitura:*` acha os condicionados e `-leitura:*` os que se leem sozinhos', () => {
        assert.deepEqual(ids(filtrarTextos(lista(), 'leitura:*')), [1, 3, 5]);
        assert.deepEqual(ids(filtrarTextos(lista(), '-leitura:*')), [2, 4]);
    });
    it('o prefixo é canônico', () => {
        assert.ok(Object.values(PREFIXOS_CANONICOS_POR_CAMPO).includes('leitura'));
    });
});

describe('Preencher campo em massa', () => {
    const campo = obterCampoPreenchivel('leituraAutonoma');
    const itens = () => [{ id: 1, leituraAutonoma: 'conjunto' }, { id: 2 }, { id: 3 }];
    it('o campo é de opções e inclui o padrão', () => {
        assert.equal(campo.tipo, 'opcoes');
        assert.equal(campo.opcoes.length, 4);
    });
    it('aplicar muda só quem estava diferente', () => {
        const lista = itens();
        const p = planejarPreenchimento(lista, campo, 'conjunto');
        assert.deepEqual(
            p.alterar.map((i) => i.id),
            [2, 3],
        );
        aplicarPreenchimento(p.alterar, campo, 'conjunto');
        assert.ok(lista.every((i) => i.leituraAutonoma === 'conjunto'));
    });
    it('Limpar campo volta ao padrão', () => {
        const lista = itens();
        const { alterar, jaVazios } = planejarLimpeza(lista, campo);
        assert.equal(alterar.length, 1);
        assert.equal(jaVazios, 2);
        aplicarLimpeza(alterar, campo);
        assert.equal(leituraAutonomaDe(lista[0]), '');
    });
});

describe('Importar campos', () => {
    const simples = (bruta) => {
        const problemas = [];
        return { simples: lerExtrasDaEntrada(bruta, problemas).simples, problemas };
    };
    it('valor válido vira campo simples; sozinho e vazio são ignorados', () => {
        assert.deepEqual(simples({ titulo: 'a', leituraAutonoma: 'só em sequência' }).simples, [
            { chave: 'leituraAutonoma', valor: 'sequencia' },
        ]);
        for (const v of ['sozinho', 'Lê-se sozinho', '', null]) {
            const r = simples({ titulo: 'a', leituraAutonoma: v });
            assert.deepEqual(r.simples, []);
            assert.deepEqual(r.problemas, []);
        }
    });
    it('valor desconhecido vai para o relatório', () => {
        const r = simples({ titulo: 'a', leituraAutonoma: 'talvez' });
        assert.deepEqual(r.simples, []);
        assert.equal(r.problemas[0].campo, 'leituraAutonoma');
    });
    it('aplicar preenche o vazio, mantém o que existe e só troca com substituir', () => {
        const item = {};
        const rel = { camposSimples: [] };
        aplicarCamposSimples(item, [{ chave: 'leituraAutonoma', valor: 'conjunto' }], rel);
        assert.equal(item.leituraAutonoma, 'conjunto');
        const rel2 = { camposSimples: [] };
        aplicarCamposSimples(item, [{ chave: 'leituraAutonoma', valor: 'inicio' }], rel2);
        assert.equal(item.leituraAutonoma, 'conjunto');
        assert.equal(rel2.camposSimples[0].acao, 'mantido');
        aplicarCamposSimples(item, [{ chave: 'leituraAutonoma', valor: 'inicio' }], rel2, {
            substituir: true,
        });
        assert.equal(item.leituraAutonoma, 'inicio');
    });
});

describe('documentação do sorteio (entrega 6)', () => {
    it('sorteio-for-ai existe nas duas línguas e descreve a Leitura autônoma e os três níveis de sigilo', () => {
        for (const arq of ['../docs/sorteio-for-ai.md', '../docs/sorteio-for-ai-pt-br.md']) {
            const t = ler(arq);
            for (const termo of ['leituraAutonoma', 'sequencia', 'conjunto', 'inicio']) {
                assert.ok(t.includes(`\`${termo}\``), `${arq}: ${termo}`);
            }
            for (const campo of ['sigiloso', 'anonimizar', 'autorEmSigilo', 'sorteavel']) {
                assert.ok(t.includes(`\`${campo}\``), `${arq}: ${campo}`);
            }
            assert.match(t, /só o começo/, arq);
            assert.doesNotMatch(t, /[—–]/, `${arq}: travessão`);
        }
    });
    it('o README das duas línguas lista o documento', () => {
        for (const arq of ['../README.md', '../README.pt-br.md']) {
            assert.match(ler(arq), /sorteio-for-ai\.md \/ sorteio-for-ai-pt-br\.md/, arq);
        }
    });
    it('a FAQ tem as perguntas da Leitura autônoma e do sigilo, e a do sorteio fala do "só o começo"', async () => {
        const { perguntaFaq } = await import('../js/faq-conteudo.js');
        assert.match(perguntaFaq('faq-leitura-autonoma').resposta, /Só como início/);
        assert.match(perguntaFaq('faq-leitura-autonoma').resposta, /só o começo/);
        assert.match(perguntaFaq('faq-sigilo-do-autor').resposta, /Anonimizar autor/);
        const sorteio = perguntaFaq('faq-sorteio-leitura').resposta;
        assert.match(sorteio, /em construção/);
        assert.match(sorteio, /só o começo/);
    });
});

describe('documentação', () => {
    it('os docs para IAs descrevem o campo', () => {
        for (const arq of [
            '../docs/campos-poema-prosa-for-ai.md',
            '../docs/campos-poema-prosa-for-ai-pt-br.md',
            '../docs/importar-campos-for-ai.md',
            '../docs/importar-campos-for-ai-pt-br.md',
        ]) {
            assert.match(ler(arq), /`leituraAutonoma`/, arq);
        }
    });
});

describe('entrega 5: saídas, aviso do modal e ligação', () => {
    db.livros = [];
    db.partes = [];
    db.secoes = [];
    db.autores = [];
    db.itensColetanea = [];
    const poema = (extra = {}) => ({
        id: 1,
        titulo: 'T',
        texto: 'verso',
        status: 'publicado',
        ...extra,
    });

    it('rotuloLeituraCondicionada: vazio para "Lê-se sozinho", rótulo para os outros', () => {
        assert.equal(rotuloLeituraCondicionada({}), '');
        assert.equal(rotuloLeituraCondicionada({ leituraAutonoma: '' }), '');
        assert.equal(rotuloLeituraCondicionada({ leituraAutonoma: 'lixo' }), '');
        assert.equal(
            rotuloLeituraCondicionada({ leituraAutonoma: 'sequencia' }),
            'Só em sequência',
        );
        assert.equal(rotuloLeituraCondicionada({ leituraAutonoma: 'conjunto' }), 'Só em conjunto');
        assert.equal(rotuloLeituraCondicionada({ leituraAutonoma: 'inicio' }), 'Só como início');
    });

    it('.md e Ver: bloco "Leitura autônoma" só nos que não se leem sozinhos', () => {
        for (const valor of ['sequencia', 'conjunto', 'inicio']) {
            const reg = montarRegistro('poema', poema({ leituraAutonoma: valor }));
            const rotulo = rotuloLeituraCondicionada({ leituraAutonoma: valor });
            assert.match(
                gerarMarkdownItem(reg),
                new RegExp(`### Leitura autônoma\\n\\n${rotulo}\\n`),
            );
            const html = renderVisualizacaoHtml(reg);
            assert.match(html, /Leitura autônoma/);
            assert.ok(html.includes(rotulo), valor);
        }
        for (const extra of [{}, { leituraAutonoma: '' }, { leituraAutonoma: 'lixo' }]) {
            const reg = montarRegistro('poema', poema(extra));
            assert.doesNotMatch(gerarMarkdownItem(reg), /Leitura autônoma/);
            assert.doesNotMatch(renderVisualizacaoHtml(reg), /Leitura autônoma/);
        }
    });

    it('.json e .csv já levavam o campo (nada a mudar)', () => {
        assert.equal(
            montarRegistro('poema', poema({ leituraAutonoma: 'conjunto' })).leituraAutonoma,
            'conjunto',
        );
    });

    it('avisoSorteioLeituraCondicionada: só com "Pode ser sorteado" e leitura condicionada', () => {
        assert.equal(avisoSorteioLeituraCondicionada({ sorteavel: true, leituraAutonoma: '' }), '');
        assert.equal(avisoSorteioLeituraCondicionada({ sorteavel: true }), '');
        assert.equal(
            avisoSorteioLeituraCondicionada({ sorteavel: false, leituraAutonoma: 'conjunto' }),
            '',
        );
        assert.equal(avisoSorteioLeituraCondicionada(null), '');
        const aviso = avisoSorteioLeituraCondicionada({
            sorteavel: true,
            leituraAutonoma: 'conjunto',
        });
        assert.match(aviso, /"Só em conjunto"/);
        assert.match(aviso, /o sorteio de leitura vai ignorá-lo/);
        assert.doesNotMatch(aviso, /—/);
    });

    it('os modais de Poema e Prosa: parágrafo do aviso e as duas caixas ligadas à função', () => {
        for (const [arq, pre, tab] of [
            ['../modais/modal-poema.html', 'p', 'poemas'],
            ['../modais/modal-prosa.html', 'pr', 'prosas'],
        ]) {
            const html = ler(arq);
            assert.ok(html.includes(`id="${pre}-leitura-sorteio-aviso"`), arq);
            const chamada = `onchange="atualizarAvisoLeituraSorteio('${tab}')"`;
            assert.equal(html.split(chamada).length - 1, 2, `${arq}: sorteavel e select`);
            assert.doesNotMatch(html, /não deve escolher o texto sozinho/, arq);
        }
    });

    it('atualizarAvisoLeituraSorteio mostra e esconde o aviso conforme as duas caixas', () => {
        for (const [tab, pre] of [
            ['poemas', 'p'],
            ['prosas', 'pr'],
        ]) {
            document.body.innerHTML = `
                <input type="checkbox" id="${pre}-sorteavel" />
                <select id="${pre}-leitura-autonoma">
                    <option value="">Lê-se sozinho</option>
                    <option value="sequencia">Só em sequência</option>
                </select>
                <p id="${pre}-leitura-sorteio-aviso" class="hidden"></p>`;
            const aviso = document.getElementById(`${pre}-leitura-sorteio-aviso`);
            const caixa = document.getElementById(`${pre}-sorteavel`);
            const select = document.getElementById(`${pre}-leitura-autonoma`);

            atualizarAvisoLeituraSorteio(tab);
            assert.equal(aviso.classList.contains('hidden'), true, 'nada marcado');

            caixa.checked = true;
            atualizarAvisoLeituraSorteio(tab);
            assert.equal(aviso.classList.contains('hidden'), true, 'só sorteável');

            select.value = 'sequencia';
            atualizarAvisoLeituraSorteio(tab);
            assert.equal(aviso.classList.contains('hidden'), false);
            assert.match(aviso.textContent, /"Só em sequência"/);

            caixa.checked = false;
            atualizarAvisoLeituraSorteio(tab);
            assert.equal(aviso.classList.contains('hidden'), true, 'desmarcou');
            assert.equal(aviso.textContent, '');
        }
        document.body.innerHTML = '';
        assert.doesNotThrow(() => atualizarAvisoLeituraSorteio('poemas'));
    });
});
