// ============================================================
// campo-tags-autor.js: o campo de tags de autor da obra (Intertextualidade
// e Hipertextualidade), em um componente só. Os modais de Poema e Prosa o
// usam hoje; "Corrigir obra" e o Modo revisão o usarão nas entregas
// seguintes, sem reescrever o comportamento.
//
// O componente guarda a lista em memória e desenha as tags (chips) no
// contêiner. O texto ainda não confirmado fica no próprio input e entra na
// lista ao salvar (`obterComPendente`), como acontece no "Conhecido(a) como".
// Os elementos são procurados pelo id a cada uso, porque os modais são
// carregados sob demanda; se o contêiner de chips não existir, a lista
// continua valendo, só não é desenhada.
//
// Como se usa na tela:
//   - Enter ou vírgula confirma o que está digitado como uma tag;
//   - escolher uma sugestão da lista (datalist) confirma na hora;
//   - Backspace com o campo vazio tira a última tag;
//   - o × de cada tag a remove;
//   - sair do campo NÃO confirma: o botão "+" do formulário perderia o clique
//     se a tela se mexesse entre apertar e soltar o mouse.
//
// Lógica de lista (limpar, repetidos, ordem) vem de autores-da-obra.js: a
// ordem digitada é guardada, e "tom jobim" e "Tom Jobim" são a mesma tag.
// ============================================================

import { normalizarAutores } from './autores-da-obra.js';

const CLASSE_CHIP =
    'inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px]';
const CLASSE_REMOVER = 'text-red-400 hover:text-red-600 dark:hover:text-red-400 font-bold px-0.5';

// `idInput` e `idChips`: ids dos elementos. `aoMudar` é chamado depois de
// confirmar ou remover uma tag (não em `definir` nem em `limpar`, que são
// chamados por quem já sabe que mudou). `rotulo` é o nome do que a tag
// guarda ('autor' por padrão; o campo de Personagem usa 'personagem') e só
// aparece na dica e no aria-label do ×.
export function criarCampoTagsAutor({ idInput, idChips, aoMudar = () => {}, rotulo = 'autor' }) {
    let tags = [];

    const input = () => document.getElementById(idInput);
    const chips = () => document.getElementById(idChips);

    function desenhar() {
        const area = chips();
        if (!area) return;
        area.replaceChildren();
        tags.forEach((nome, i) => {
            const chip = document.createElement('span');
            chip.className = CLASSE_CHIP;
            chip.append(document.createTextNode(nome));
            const botao = document.createElement('button');
            botao.type = 'button';
            botao.className = CLASSE_REMOVER;
            botao.title = `Remover ${rotulo}`;
            botao.setAttribute('aria-label', `Remover ${nome}`);
            botao.dataset.autorRemover = String(i);
            botao.textContent = '×';
            chip.append(botao);
            area.append(chip);
        });
    }

    function pendente() {
        return (input()?.value || '').trim();
    }

    // As tags já confirmadas.
    function obter() {
        return [...tags];
    }

    // As confirmadas mais o que está digitado e ainda não virou tag (o texto
    // inteiro, uma tag só: sem dividir por vírgula ou "e").
    function obterComPendente() {
        return normalizarAutores([...tags, pendente()]);
    }

    function definir(lista) {
        tags = normalizarAutores(lista);
        const campo = input();
        if (campo) campo.value = '';
        desenhar();
    }

    function limpar() {
        definir([]);
    }

    function confirmar() {
        const campo = input();
        const antes = tags.length;
        tags = normalizarAutores([...tags, pendente()]);
        if (campo) campo.value = '';
        desenhar();
        if (tags.length !== antes) aoMudar();
        campo?.focus();
    }

    function remover(indice) {
        if (!Number.isInteger(indice) || indice < 0 || indice >= tags.length) return;
        tags = tags.filter((_, i) => i !== indice);
        desenhar();
        aoMudar();
    }

    // Liga os eventos uma única vez por elemento (o modal pode ser religado
    // ao ser aberto de novo).
    function ligar() {
        const campo = input();
        if (campo && !campo.dataset.tagsAutorLigado) {
            campo.dataset.tagsAutorLigado = '1';
            campo.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ',') {
                    if (e.key === ',' && !pendente()) {
                        e.preventDefault();
                        return;
                    }
                    e.preventDefault();
                    // Enter sem nada digitado não faz nada (o Enter dos
                    // outros campos é quem adiciona a entrada).
                    if (pendente()) confirmar();
                    return;
                }
                if (e.key === 'Backspace' && !campo.value && tags.length) {
                    e.preventDefault();
                    remover(tags.length - 1);
                }
            });
            campo.addEventListener('input', (e) => {
                // Escolher uma sugestão da lista dispara este tipo de evento;
                // digitar não.
                if (e.inputType === 'insertReplacementText' && pendente()) confirmar();
            });
        }
        const area = chips();
        if (area && !area.dataset.tagsAutorLigado) {
            area.dataset.tagsAutorLigado = '1';
            area.addEventListener('click', (e) => {
                const botao = e.target?.closest?.('[data-autor-remover]');
                if (!botao) return;
                remover(Number(botao.dataset.autorRemover));
            });
        }
    }

    return { ligar, obter, obterComPendente, definir, limpar, confirmar, remover };
}
