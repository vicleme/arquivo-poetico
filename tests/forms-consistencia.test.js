// forms.js tem várias funções que deveriam ficar espelhadas — o mesmo
// conjunto de campos, só que escritas à mão duas vezes (Sonoridade vs
// Molde, Poema vs Prosa) ou por dois caminhos diferentes dentro da
// mesma feature (abrir o modal vs. importar JSON). Nada no sistema de
// tipos ou na estrutura do arquivo impede as duas cópias de divergirem
// quando um campo novo é adicionado só de um lado — foi exatamente
// assim que o campo `peMetrico` ficou faltando em
// `aplicarClassificacaoSonoridade` por uma sessão inteira, mesmo com
// `popularCamposSonoridade` (a função-irmã, usada ao abrir o modal)
// já tratando ele corretamente: a importação de JSON validava
// `peMetrico` certinho, mas nunca refletia no <select>, porque essa
// função específica não tinha a linha de `popularSelectOpcoes`
// correspondente.
//
// Este teste não executa as funções (não simula clique nem monta o
// DOM de nenhum modal) — ele lê o texto de cada uma, extrai os ids de
// campo que ela referencia (mesma técnica puramente textual de
// tests/sinalizacoes-consistencia.test.js e tests/wiring-onclick.test.js:
// pega gap mais rápido que reler o código, e não quebra por mudança de
// HTML/DOM que essas funções nem tocam diretamente) e compara os
// conjuntos entre cada par — depois de normalizar o prefixo de id
// (son-/molde-, p-/pr-) quando o par é entre duas features diferentes.
// Falha aqui é sinal de "campo esquecido do outro lado", não
// necessariamente de bug — às vezes a assimetria é proposital (ver
// exceções documentadas em cada `it`).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FORMS_JS = fs.readFileSync(path.resolve(__dirname, '../js/forms.js'), 'utf8');

// Acha `function nome(...) { ... }` ou `export function nome(...) { ... }`
// e devolve só o texto do corpo (entre as chaves), casando profundidade
// de `{`/`}` pra não parar numa chave interna — mesmo raciocínio de
// extrairBlocoEntreChaves em sinalizacoes-consistencia.test.js, só que
// ancorado numa assinatura de função em vez de `const X = [`.
function corpoDaFuncao(nome) {
    const re = new RegExp(`(?:export )?function ${nome}\\([^)]*\\)\\s*{`);
    const m = re.exec(FORMS_JS);
    assert.ok(m, `função "${nome}" não encontrada em js/forms.js`);
    let i = m.index + m[0].length;
    let profundidade = 1;
    const inicio = i;
    while (profundidade > 0) {
        if (FORMS_JS[i] === '{') profundidade++;
        else if (FORMS_JS[i] === '}') profundidade--;
        i++;
    }
    return FORMS_JS.slice(inicio, i - 1);
}

// Ids de campo são sempre strings literais em kebab-case (pelo menos um
// hífen) neste arquivo — `document.getElementById('son-pe-metrico')`,
// mas também aparecem como item de array-e-loop nas funções de Época
// (`['p-epoca-ini', 'p-epoca-fim'].forEach(...)`). Pegar TODA string
// literal nesse formato dentro do corpo, não só as que vêm coladas em
// `getElementById(`, cobre os dois casos com a mesma regra — outras
// strings literais que aparecem nessas funções ('change', nomes de
// opções com espaço/maiúscula) não batem no padrão, então não geram
// falso positivo.
function idsDaFuncao(nome) {
    const corpo = corpoDaFuncao(nome);
    const re = /'([a-z][a-z0-9]*(?:-[a-z0-9]+)+)'/g;
    const ids = new Set();
    let m;
    while ((m = re.exec(corpo))) ids.add(m[1]);
    return ids;
}

// Troca o prefixo de cada id (ex.: 'son-tom' com de='son-' e para='molde-'
// vira 'molde-tom') — ids que não começam com `de` ficam como estão
// (não deveria sobrar nenhum, mas isso é o que o assert.deepEqual abaixo
// pega, não esta função).
function trocarPrefixo(ids, de, para) {
    return [...ids].map((id) => (id.startsWith(de) ? para + id.slice(de.length) : id)).sort();
}

describe('forms.js — consistência entre funções gêmeas', () => {
    // popularCamposSonoridade (abrir "Adicionar"/"Editar Escansão") e
    // aplicarClassificacaoSonoridade (aplicar um JSON importado) tratam
    // do mesmo formulário por dois caminhos — precisam tocar exatamente
    // os mesmos campos de classificação, ou um deles fica incompleto
    // silenciosamente (foi o que aconteceu com peMetrico).
    it('popularCamposSonoridade e aplicarClassificacaoSonoridade tocam os mesmos campos de classificação', () => {
        const idsPopular = idsDaFuncao('popularCamposSonoridade');
        const idsAplicar = idsDaFuncao('aplicarClassificacaoSonoridade');

        // Exceção documentada: son-linhas-ignoradas é campo de recorte da
        // grade (não de classificação) e é aplicado à parte, direto em
        // importarSonoridadeDeArquivo (forms.js) — não é um campo que
        // aplicarClassificacaoSonoridade deveria tratar. popularSelectOpcoes
        // some das duas listas de propósito pra sobrar só os 9 campos de
        // classificação (7 + peMetrico) que de fato precisam bater.
        const EXCECOES_SO_EM_POPULAR = new Set(['son-linhas-ignoradas']);
        const classificacaoPopular = [...idsPopular].filter(
            (id) => !EXCECOES_SO_EM_POPULAR.has(id),
        );

        assert.deepEqual(
            classificacaoPopular.sort(),
            [...idsAplicar].sort(),
            'aplicarClassificacaoSonoridade deixou de tocar algum campo que popularCamposSonoridade trata (ou vice-versa) — confira se um campo novo foi adicionado só de um lado.',
        );
    });

    // aplicarCascataSonoridade e aplicarCascataMolde replicam a mesma
    // matriz de validação em cascata pra duas features (decisão 3 de
    // manutencao/criacao-molde.md: Molde reaproveita a taxonomia inteira
    // da Sonoridade) — mas são duas funções escritas à mão, uma pra cada
    // prefixo de id (son-/molde-), não uma função só parametrizada. Se um
    // campo novo entrar na cascata de um lado (como peMetrico entrou) e
    // não for replicado no outro, a trava bidirecional correspondente
    // simplesmente não existe em Molde (ou em Sonoridade).
    it('aplicarCascataSonoridade e aplicarCascataMolde tocam os mesmos campos (só variando o prefixo son-/molde-)', () => {
        const idsSonoridade = idsDaFuncao('aplicarCascataSonoridade');
        const idsMolde = idsDaFuncao('aplicarCascataMolde');

        assert.deepEqual(
            trocarPrefixo(idsSonoridade, 'son-', 'molde-'),
            [...idsMolde].sort(),
            'aplicarCascataSonoridade e aplicarCascataMolde divergiram — um campo da cascata foi adicionado/removido só de um lado.',
        );
    });

    // Mesmo raciocínio para o par Poema/Prosa do bloco de Época: os dois
    // toggles (desabilitar De/Até quando "não se aplica" está marcado)
    // deveriam sempre tocar o mesmo conjunto de campos, só trocando o
    // prefixo p-/pr-.
    it('toggleCamposEpocaNa e toggleCamposEpocaNaProsa tocam os mesmos campos (só variando o prefixo p-/pr-)', () => {
        const idsPoema = idsDaFuncao('toggleCamposEpocaNa');
        const idsProsa = idsDaFuncao('toggleCamposEpocaNaProsa');

        assert.deepEqual(
            trocarPrefixo(idsPoema, 'p-', 'pr-'),
            [...idsProsa].sort(),
            'toggleCamposEpocaNa e toggleCamposEpocaNaProsa divergiram — um campo de Época foi adicionado/removido só de um lado.',
        );
    });

    // E a sugestão automática de datas/contexto ao repetir um nome de
    // Época já usado — mesmo par p-/pr-, mesmo risco.
    it('aplicarSugestaoEpoca e aplicarSugestaoEpocaProsa tocam os mesmos campos (só variando o prefixo p-/pr-)', () => {
        const idsPoema = idsDaFuncao('aplicarSugestaoEpoca');
        const idsProsa = idsDaFuncao('aplicarSugestaoEpocaProsa');

        assert.deepEqual(
            trocarPrefixo(idsPoema, 'p-', 'pr-'),
            [...idsProsa].sort(),
            'aplicarSugestaoEpoca e aplicarSugestaoEpocaProsa divergiram — um campo de Época foi adicionado/removido só de um lado.',
        );
    });
});
