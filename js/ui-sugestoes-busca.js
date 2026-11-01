// ============================================================
// ui-sugestoes-busca.js: a caixinha de sugestões sob uma caixa de busca por
// campo. A lógica das sugestões mora em sugestoes-busca-campos.js; aqui só a
// ligação com a caixa: abre ao digitar, setas escolhem, Enter ou Tab aplicam,
// Esc fecha, clique também aplica. Aplicar a sugestão só escreve na caixa e
// chama `mudou`, a mesma função de quem digita. Cada caixa cria a sua
// (Modo revisão: ui-sugestoes-busca-revisao.js; listas de Obras, Autores e
// Origens: ui-sugestoes-busca-conexoes.js).
// ============================================================

import { aplicarSugestaoBusca } from './sugestoes-busca-campos.js';

// `sugerir(texto, itens)` devolve `{ inicio, itens }` ou `null`.
export function criarSugestoesBusca({ idCaixa, idLista, sugerir }) {
    let estado = { sugestao: null, ativo: -1 };
    let obterItens = () => [];
    let aoMudar = () => {};

    const lista = () => document.getElementById(idLista);

    function fechar() {
        estado = { sugestao: null, ativo: -1 };
        const el = lista();
        if (!el) return;
        el.classList.add('hidden');
        el.replaceChildren();
        document.getElementById(idCaixa)?.setAttribute('aria-expanded', 'false');
    }

    function marcarAtivo() {
        const el = lista();
        if (!el) return;
        Array.from(el.children).forEach((filho, i) => {
            const ativo = i === estado.ativo;
            filho.setAttribute('aria-selected', ativo ? 'true' : 'false');
            filho.classList.toggle('bg-blue-50', ativo);
            filho.classList.toggle('dark:bg-blue-950', ativo);
        });
    }

    function atualizar() {
        const caixa = document.getElementById(idCaixa);
        const el = lista();
        if (!caixa || !el) return;
        const sugestao = sugerir(caixa.value, obterItens());
        if (!sugestao) {
            fechar();
            return;
        }
        estado = { sugestao, ativo: 0 };
        el.replaceChildren(
            ...sugestao.itens.map((item, i) => {
                const linha = document.createElement('div');
                linha.setAttribute('role', 'option');
                linha.dataset.indice = String(i);
                linha.className =
                    'flex items-baseline justify-between gap-3 px-2.5 py-1.5 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-slate-200';
                const nome = document.createElement('span');
                nome.textContent = item.rotulo;
                linha.append(nome);
                if (item.detalhe) {
                    const detalhe = document.createElement('span');
                    detalhe.className = 'text-xs text-gray-400 dark:text-slate-500';
                    detalhe.textContent = item.detalhe;
                    linha.append(detalhe);
                }
                return linha;
            }),
        );
        el.classList.remove('hidden');
        caixa.setAttribute('aria-expanded', 'true');
        marcarAtivo();
    }

    function aplicar(indice) {
        const caixa = document.getElementById(idCaixa);
        const { sugestao } = estado;
        const item = sugestao?.itens[indice];
        if (!caixa || !item) return;
        caixa.value = aplicarSugestaoBusca(caixa.value, sugestao.inicio, item);
        aoMudar(caixa.value);
        caixa.focus();
        // Termo completo: segue digitando; termo pela metade (o prefixo): já oferece o resto.
        atualizar();
    }

    function aoTeclar(e) {
        const total = estado.sugestao?.itens.length ?? 0;
        if (!total) return;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            estado.ativo = (estado.ativo + (e.key === 'ArrowDown' ? 1 : -1) + total) % total;
            marcarAtivo();
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            aplicar(estado.ativo);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            fechar();
        }
    }

    // `itens()` devolve os itens de onde saem os valores oferecidos (todos, sem
    // filtro) e `mudou(texto)` é chamada quando a sugestão muda o texto da caixa.
    function iniciar({ itens, mudou }) {
        const caixa = document.getElementById(idCaixa);
        const el = lista();
        if (!caixa || !el) return;
        obterItens = itens;
        aoMudar = mudou;
        if (caixa.dataset.sugestoesLigadas) return;
        caixa.dataset.sugestoesLigadas = 'sim';
        caixa.setAttribute('aria-controls', idLista);
        caixa.setAttribute('aria-autocomplete', 'list');
        caixa.addEventListener('input', atualizar);
        caixa.addEventListener('keydown', aoTeclar);
        caixa.addEventListener('blur', () => setTimeout(fechar, 120));
        // mousedown (e não click): a caixa perderia o foco antes do clique chegar.
        el.addEventListener('mousedown', (e) => {
            const linha = e.target.closest('[data-indice]');
            if (!linha) return;
            e.preventDefault();
            aplicar(Number(linha.dataset.indice));
        });
    }

    return { fechar, atualizar, iniciar };
}
