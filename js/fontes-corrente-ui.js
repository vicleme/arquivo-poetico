// ============================================================
// fontes-corrente-ui.js: lista editável de fontes nos modais (Corrente literária e,
// pela mesma fábrica, Período Histórico: ver fontes-periodo-historico-ui.js)
// ============================================================
// O estado mora no próprio DOM (uma linha por fonte, na lista do modal).
// `ler` (lerFontesCorrente, na Corrente) devolve a lista saneada na hora de salvar; linha
// totalmente vazia é descartada, sem aviso. A lógica de normalizar e comparar
// fontes fica em fontes-corrente.js (puro).

import { normalizarFonte, normalizarFontes } from './fontes-corrente.js';

const CLASSE_CAMPO = 'text-sm w-full';

function campo(rotulo, nomeCampo, valor, { classe = '', placeholder = '', multilinha = false }) {
    const bloco = document.createElement('div');
    if (classe) bloco.className = classe;
    const label = document.createElement('label');
    label.className = 'form-label';
    label.textContent = rotulo;
    const entrada = document.createElement(multilinha ? 'textarea' : 'input');
    if (!multilinha) entrada.type = 'text';
    else entrada.rows = 2;
    entrada.className = CLASSE_CAMPO;
    entrada.dataset.campoFonte = nomeCampo;
    entrada.setAttribute('aria-label', rotulo);
    entrada.placeholder = placeholder;
    entrada.value = valor || '';
    bloco.append(label, entrada);
    return bloco;
}

// Lista editável de fontes ligada a um modal. Cada modal passa os ids da sua
// lista e do aviso "nenhuma fonte", o nome da função global do botão "Remover
// fonte" (os botões são criados em JS com `onclick` inline, então o nome
// precisa existir no `window`, ver main.js) e `compacto` (uma coluna só, para
// modais estreitos como o de Período Histórico; o `md:` do Tailwind olha a
// janela, não o modal, e espremeria as seis colunas).
export function criarListaDeFontes({ idLista, idVazio, nomeRemover, compacto = false }) {
    const lista = () => document.getElementById(idLista);

    function atualizarAvisoVazio() {
        const l = lista();
        const vazio = document.getElementById(idVazio);
        if (!l || !vazio) return;
        vazio.classList.toggle('hidden', l.children.length > 0);
    }

    function criarLinha(fonte) {
        const f = normalizarFonte(fonte) || { autor: '', obra: '', ano: '', nota: '' };
        const linha = document.createElement('div');
        linha.dataset.fonteLinha = 'true';
        linha.className = `p-3 rounded border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 grid grid-cols-1 gap-2${compacto ? '' : ' md:grid-cols-6'}`;
        const largura = (md) => (compacto ? '' : md);
        linha.append(
            campo('Autor', 'autor', f.autor, {
                classe: largura('md:col-span-2'),
                placeholder: 'Ex: Alfredo Bosi',
            }),
            campo('Obra', 'obra', f.obra, {
                classe: largura('md:col-span-3'),
                placeholder: 'Ex: História concisa da literatura brasileira',
            }),
            campo('Ano', 'ano', f.ano, {
                classe: largura('md:col-span-1'),
                placeholder: 'Ex: 1970',
            }),
            campo('Nota (capítulo, página, onde o autor diverge)', 'nota', f.nota, {
                classe: largura('md:col-span-6'),
                placeholder: 'Opcional',
                multilinha: true,
            }),
        );
        const remover = document.createElement('div');
        remover.className = `${largura('md:col-span-6')} flex justify-end`.trim();
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.textContent = 'Remover fonte';
        botao.setAttribute('onclick', `${nomeRemover}(this)`);
        botao.className =
            'text-xs font-semibold px-2 py-1 rounded text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40';
        remover.append(botao);
        linha.append(remover);
        return linha;
    }

    return {
        // Troca o conteúdo da lista pelas fontes dadas (abrir um item para editar).
        carregar(fontes) {
            const l = lista();
            if (!l) return;
            l.replaceChildren(...normalizarFontes(fontes).map(criarLinha));
            atualizarAvisoVazio();
        },
        // Esvazia a lista (modal de item novo).
        reset() {
            this.carregar([]);
        },
        // Botão "Adicionar fonte": linha em branco no fim, com o foco no Autor.
        adicionar() {
            const l = lista();
            if (!l) return;
            const linha = criarLinha(null);
            l.append(linha);
            atualizarAvisoVazio();
            linha.querySelector('[data-campo-fonte="autor"]')?.focus();
        },
        // Botão "Remover fonte" de uma linha (recebe o próprio botão).
        remover(botao) {
            botao?.closest?.('[data-fonte-linha]')?.remove();
            atualizarAvisoVazio();
        },
        // Fontes como estão na tela, saneadas: linha vazia some e a mesma obra
        // do mesmo autor não se repete.
        ler() {
            const l = lista();
            if (!l) return [];
            const brutas = [...l.querySelectorAll('[data-fonte-linha]')].map((linha) => {
                const valor = (nome) =>
                    linha.querySelector(`[data-campo-fonte="${nome}"]`)?.value ?? '';
                return {
                    autor: valor('autor'),
                    obra: valor('obra'),
                    ano: valor('ano'),
                    nota: valor('nota'),
                };
            });
            return normalizarFontes(brutas);
        },
    };
}

// ─── Corrente literária ──────────────────────────────────────────
const corrente = criarListaDeFontes({
    idLista: 'me-fontes-lista',
    idVazio: 'me-fontes-vazio',
    nomeRemover: 'removerFonteCorrente',
});

export const carregarFontesCorrente = (fontes) => corrente.carregar(fontes);
export const resetFontesCorrente = () => corrente.reset();
export const adicionarFonteCorrente = () => corrente.adicionar();
export const removerFonteCorrente = (botao) => corrente.remover(botao);
export const lerFontesCorrente = () => corrente.ler();
