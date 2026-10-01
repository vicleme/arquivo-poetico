// faixa-origem.js: faixa "Voltar para <aba> · Limpar filtro" no topo da aba
// de destino quando a pessoa chega por um atalho ("Ver textos" de Tema,
// Assunto, Local, Pessoa, drill-down de Estatísticas etc.).
//
// As abas são seções da mesma página, então o atalho troca de aba e deixa
// o filtro preso na caixa de busca do destino, sem caminho de volta. A
// faixa resolve as duas coisas:
// - "Voltar" reabre a aba de origem e desfaz o filtro que o atalho pôs;
// - "Limpar filtro" desfaz o filtro e fica na aba.
// A faixa vale enquanto o filtro for o do atalho: editar a caixa de busca
// (ou qualquer controle do filtro) à mão, limpar ou voltar a remove. Trocar
// de aba pela navegação NÃO a remove, para quem voltar ao destino dias
// depois ver por que a lista está filtrada.
//
// Sem dependência de outros módulos do app (usa `window.abrirAba`, como o
// resto do código que navega entre abas, para não criar ciclo de import).

// destino (id da aba) → { faixa, desligar }
const ativas = new Map();

function abaAtiva() {
    return document.querySelector('.tab-content.active')?.id || null;
}

// Nome da aba como aparece no menu (o botão de navegação tem id `btn-<aba>`).
function rotuloDaAba(id) {
    return document.getElementById(`btn-${id}`)?.textContent.trim() || id;
}

function escapar(texto) {
    return String(texto ?? '').replace(
        /[&<>"']/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
}

export function removerFaixaDeOrigem(destino) {
    const atual = ativas.get(destino);
    if (!atual) return;
    atual.desligar();
    atual.faixa.remove();
    ativas.delete(destino);
}

// Há faixa ativa na aba `destino`? (para testes e para quem precisa saber)
export function temFaixaDeOrigem(destino) {
    return ativas.has(destino);
}

const BOTAO =
    'text-xs px-2 py-1 rounded border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40';

// Abre `destino` por atalho e mostra a faixa.
// - `aplicar()`: põe o filtro (o mesmo código que o atalho já tinha).
// - `limpar()`: desfaz exatamente esse filtro.
// - `controles`: ids dos elementos do filtro; mexer em qualquer um à mão
//   encerra a faixa (o filtro deixou de ser o do atalho).
// - `descricao`: texto da faixa ("Filtrando por tema “Amor”").
export function abrirPorAtalho({ destino, descricao, aplicar, limpar, controles = [] }) {
    const origem = abaAtiva();
    const secao = document.getElementById(destino);
    // Sem a seção no DOM não há onde pôr a faixa; ainda assim o atalho
    // tem que funcionar como sempre funcionou.
    removerFaixaDeOrigem(destino);
    window.abrirAba?.(destino);
    aplicar();
    if (!secao) return;

    const voltarPara = origem && origem !== destino ? origem : null;
    const faixa = document.createElement('div');
    faixa.dataset.faixaOrigem = destino;
    faixa.setAttribute('role', 'status');
    faixa.className =
        'flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-3 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-sm';
    faixa.innerHTML = `
        <span class="text-gray-700 dark:text-slate-200">${escapar(descricao)}</span>
        <span class="flex flex-wrap gap-2">
            ${voltarPara ? `<button type="button" data-faixa="voltar" class="${BOTAO}">← Voltar para ${escapar(rotuloDaAba(voltarPara))}</button>` : ''}
            <button type="button" data-faixa="limpar" class="${BOTAO}">Limpar filtro</button>
        </span>`;
    secao.insertBefore(faixa, secao.firstChild);

    const encerrar = () => removerFaixaDeOrigem(destino);
    faixa.querySelector('[data-faixa="limpar"]').onclick = () => {
        encerrar();
        limpar();
    };
    const botaoVoltar = faixa.querySelector('[data-faixa="voltar"]');
    if (botaoVoltar) {
        botaoVoltar.onclick = () => {
            encerrar();
            limpar();
            window.abrirAba?.(voltarPara);
        };
    }

    // Edição manual dos controles do filtro encerra a faixa, sem mexer no
    // que a pessoa escolheu. (Mudar `.value` por código não dispara evento.)
    const ouvintes = [];
    controles.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        ['input', 'change'].forEach((tipo) => {
            el.addEventListener(tipo, encerrar);
            ouvintes.push([el, tipo]);
        });
    });
    ativas.set(destino, {
        faixa,
        desligar: () => ouvintes.forEach(([el, tipo]) => el.removeEventListener(tipo, encerrar)),
    });
}
