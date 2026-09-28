// ============================================================
// central-ajuda.js — Bloco 3 do Modo Aprendizado: o modal que o "?" abre
// agora, com 3 entradas de ajuda num lugar só (ver manutencao/status.md):
//
//   1. "Ver/Rever a apresentação completa" — reabre o modal de sempre
//      (perfil + convite ao tour), de modo-aprendizado.js.
//   2. "Como eu faço para..." — lista de tarefas (como-faco-passos.js),
//      cada uma com uma frase de descrição e um botão que abre um
//      mini-tour reaproveitando o MESMO motor de tour.js usado no Bloco 2
//      (iniciarTour). Procedimental: aponta pra elementos reais da tela.
//   3. "Perguntas frequentes" (faq-conteudo.js) — só texto, sem apontar
//      pra nada: são perguntas conceituais, não de "onde eu clico".
//
// As duas listas são montadas por JS a partir dos módulos de dados —
// o HTML do modal só tem os contêineres vazios — mesmo padrão de
// selecao-massa.js/campos-preenchiveis.js: pra crescer uma tarefa ou
// uma pergunta nova basta editar o arquivo de dados, sem mexer aqui.
// ============================================================

import { garantirModal, toggleModal } from './modais.js';
import { iniciarTour } from './tour.js';
import { TAREFAS_COMO_FACO, tarefaComoFaco } from './como-faco-passos.js';
import { CATEGORIAS_FAQ } from './faq-conteudo.js';
import { lerPerfilModoAprendizado, abrirModoAprendizado } from './modo-aprendizado.js';

const $ = (id) => document.getElementById(id);

function criar(tag, { classe, texto, atributos } = {}) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto !== undefined) el.textContent = texto;
    if (atributos) {
        for (const [chave, valor] of Object.entries(atributos)) el.setAttribute(chave, valor);
    }
    return el;
}

// Botão "Mostrar na tela": fecha ESTE modal e inicia o mini-tour da
// tarefa. Reaproveita iniciarTour sem `extra` (não há "outro perfil"
// aqui) — o próprio motor já cuida de destacar, navegar de aba e voltar
// pra aba original ao terminar.
async function mostrarTarefaNaTela(idTarefa) {
    const tarefa = tarefaComoFaco(idTarefa);
    if (!tarefa) return; // id inexistente (ex.: renomeado) — não quebra o clique
    await toggleModal('modal-central-ajuda');
    iniciarTour({ passos: tarefa.passos });
}

function renderComoFaco() {
    const container = $('ca-como-faco-lista');
    if (!container) return;
    container.replaceChildren(
        ...TAREFAS_COMO_FACO.map((tarefa) => {
            const detalhes = criar('details', { classe: 'campo-grupo' });
            const resumo = criar('summary', { texto: tarefa.titulo });
            const corpo = criar('div', { classe: 'campo-grupo-corpo' });
            const botao = criar('button', {
                classe: 'text-sm text-blue-600 dark:text-blue-400 underline',
                texto: 'Mostrar na tela',
                atributos: { type: 'button' },
            });
            botao.addEventListener('click', () => mostrarTarefaNaTela(tarefa.id));
            if (tarefa.descricao) {
                corpo.append(
                    criar('p', {
                        classe: 'text-sm text-gray-600 dark:text-slate-300 mb-2',
                        texto: tarefa.descricao,
                    }),
                );
            }
            corpo.append(botao);
            detalhes.append(resumo, corpo);
            return detalhes;
        }),
    );
}

function renderFaq() {
    const container = $('ca-faq-lista');
    if (!container) return;
    container.replaceChildren(
        ...CATEGORIAS_FAQ.map((categoria) => {
            const bloco = criar('div', { classe: 'space-y-2' });
            bloco.append(
                criar('h5', {
                    classe: 'text-xs font-semibold uppercase text-gray-400 dark:text-slate-500',
                    texto: categoria.rotulo,
                }),
                ...categoria.perguntas.map((p) => {
                    const detalhes = criar('details', { classe: 'campo-grupo' });
                    const resumo = criar('summary', { texto: p.pergunta });
                    const corpo = criar('div', { classe: 'campo-grupo-corpo' });
                    corpo.append(
                        criar('p', {
                            classe: 'text-sm text-gray-600 dark:text-slate-300',
                            texto: p.resposta,
                        }),
                    );
                    detalhes.append(resumo, corpo);
                    return detalhes;
                }),
            );
            return bloco;
        }),
    );
}

// Nasce SEM perfil salvo → "Ver" (nunca passou pela apresentação).
// Com perfil salvo → "Rever" (já viu antes, está voltando).
function atualizarTextoBotaoApresentacao() {
    const botao = $('ca-btn-apresentacao');
    if (!botao) return;
    const jaViu = lerPerfilModoAprendizado() !== null;
    botao.textContent = jaViu ? 'Rever a apresentação completa' : 'Ver a apresentação completa';
}

// init do registrarModal — roda uma vez, na primeira carga do modal.
// As listas são estáticas (vêm só dos módulos de dados, nada muda em
// runtime), então montá-las aqui é suficiente; só o texto do botão de
// apresentação precisa ser recalculado a cada abertura (ver abrirCentralAjuda).
export function initCentralAjuda() {
    renderComoFaco();
    renderFaq();
}

export async function abrirCentralAjuda() {
    await garantirModal('modal-central-ajuda');
    atualizarTextoBotaoApresentacao();
    await toggleModal('modal-central-ajuda');
}

// Botão "Ver/Rever a apresentação completa": fecha ESTE modal e abre o
// modal de sempre (modo-aprendizado.js) — mesmo caminho que o primeiro
// acesso automático usa, só que disparado manualmente.
export async function abrirApresentacaoDaAjuda() {
    await toggleModal('modal-central-ajuda');
    await abrirModoAprendizado();
}
