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
// No topo há uma caixa de busca (T10, lógica em busca-ajuda.js): filtra as
// duas listas ao digitar, abre os itens que casam e esconde grupo, categoria
// e seção que ficaram vazios. Esc limpa a caixa.
//
// As duas listas são montadas por JS a partir dos módulos de dados —
// o HTML do modal só tem os contêineres vazios — mesmo padrão de
// selecao-massa.js/campos-preenchiveis.js: pra crescer uma tarefa ou
// uma pergunta nova basta editar o arquivo de dados, sem mexer aqui.
// ============================================================

import { garantirModal, toggleModal } from './modais.js';
import { iniciarTour } from './tour.js';
import { tarefaComoFaco } from './como-faco-passos.js';
import { buscarNaAjuda } from './busca-ajuda.js';
import { blocosDaResposta, trechosDaLinha } from './ajuda-formatar.js';
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

// `abrir`: itens já abertos (busca ativa, para o achado aparecer na hora).
function renderComoFaco(grupos, abrir) {
    const container = $('ca-como-faco-lista');
    if (!container) return;
    container.replaceChildren(
        ...grupos.map((grupo) => {
            const bloco = criar('div', { classe: 'space-y-2' });
            bloco.append(
                criar('h5', {
                    classe: 'text-xs font-semibold uppercase text-gray-400 dark:text-slate-500',
                    texto: grupo.rotulo,
                }),
                ...grupo.tarefas.map((tarefa) => {
                    const detalhes = criar('details', { classe: 'campo-grupo' });
                    detalhes.open = abrir;
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
            return bloco;
        }),
    );
}

// Desenha uma linha de texto com negrito, itálico e código (ajuda-formatar.js).
// Tudo entra por textContent: a resposta nunca é lida como HTML.
const CLASSE_TRECHO = {
    b: 'font-semibold text-gray-800 dark:text-slate-100',
    code: 'px-1 rounded bg-gray-100 dark:bg-slate-800 text-xs',
};
function trechosEm(pai, linha) {
    for (const { texto, estilo } of trechosDaLinha(linha)) {
        if (!estilo) {
            pai.append(document.createTextNode(texto));
            continue;
        }
        const tag = { b: 'strong', i: 'em', code: 'code' }[estilo];
        pai.append(criar(tag, { classe: CLASSE_TRECHO[estilo], texto }));
    }
}

// Resposta do FAQ em blocos curtos: parágrafos, listas e subtítulos, em vez
// de um <p> só. Texto sem marcação sai como um parágrafo, como antes.
const COR_TEXTO = 'text-sm text-gray-600 dark:text-slate-300';
function blocosDaRespostaEm(corpo, resposta) {
    for (const bloco of blocosDaResposta(resposta)) {
        if (bloco.tipo === 'ul') {
            const lista = criar('ul', { classe: `${COR_TEXTO} list-disc pl-5 space-y-1 mb-3` });
            for (const item of bloco.itens) {
                const li = criar('li');
                trechosEm(li, item);
                lista.append(li);
            }
            corpo.append(lista);
        } else if (bloco.tipo === 'h') {
            const h = criar('h6', {
                classe: 'text-xs font-semibold uppercase text-gray-400 dark:text-slate-500 mt-4 mb-1',
            });
            trechosEm(h, bloco.texto);
            corpo.append(h);
        } else {
            const p = criar('p', { classe: `${COR_TEXTO} mb-3` });
            trechosEm(p, bloco.texto);
            corpo.append(p);
        }
    }
}

function renderFaq(categorias, abrir) {
    const container = $('ca-faq-lista');
    if (!container) return;
    container.replaceChildren(
        ...categorias.map((categoria) => {
            const bloco = criar('div', { classe: 'space-y-2' });
            bloco.append(
                criar('h5', {
                    classe: 'text-xs font-semibold uppercase text-gray-400 dark:text-slate-500',
                    texto: categoria.rotulo,
                }),
                ...categoria.perguntas.map((p) => {
                    const detalhes = criar('details', { classe: 'campo-grupo' });
                    detalhes.open = abrir;
                    const resumo = criar('summary', { texto: p.pergunta });
                    const corpo = criar('div', { classe: 'campo-grupo-corpo' });
                    blocosDaRespostaEm(corpo, p.resposta);
                    detalhes.append(resumo, corpo);
                    return detalhes;
                }),
            );
            return bloco;
        }),
    );
}

// Texto do aviso sob a caixa de busca; vazio quando a busca está inativa.
function textoStatusBusca(r) {
    if (!r.ativa) return '';
    if (r.vazia) return 'Nada encontrado. Tente menos palavras ou tire as aspas.';
    if (r.parcial) {
        const quem = r.total === 1 ? '1 item que tem' : `${r.total} itens que têm`;
        return `Nenhum item tem todas as palavras. Mostrando ${quem} ${r.acertos} de ${r.totalTermos}.`;
    }
    return r.total === 1 ? '1 resultado' : `${r.total} resultados`;
}

// Redesenha as duas listas para o texto da busca. Sem busca (texto vazio)
// volta ao estado de sempre: tudo visível e tudo recolhido. Com busca, a
// apresentação some (os achados sobem para o topo) e uma seção sem nenhum
// achado também some.
function aplicarBusca(texto) {
    const r = buscarNaAjuda(texto);
    renderComoFaco(r.grupos, r.ativa);
    renderFaq(r.categorias, r.ativa);
    $('ca-secao-apresentacao')?.classList.toggle('hidden', r.ativa);
    $('ca-secao-como-faco')?.classList.toggle('hidden', !r.grupos.length);
    $('ca-secao-faq')?.classList.toggle('hidden', !r.categorias.length);
    const status = $('ca-busca-status');
    if (status) {
        status.textContent = textoStatusBusca(r);
        status.classList.toggle('hidden', !r.ativa);
    }
}

// Esc na caixa: com texto, limpa; já vazia, fecha a Central (o atalho global
// de modais ignora Esc enquanto um campo tem foco, então o fechamento é feito
// aqui). stopPropagation evita o atalho global tratar o mesmo Esc de novo.
function aoTeclarNaBusca(e) {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    const caixa = e.currentTarget;
    if (caixa.value) {
        caixa.value = '';
        aplicarBusca('');
    } else {
        toggleModal('modal-central-ajuda');
    }
}

// "Expandir tudo" e "Recolher tudo" de cada lista (Como eu faço e Perguntas
// frequentes): abrem ou fecham todos os itens que estão na tela, inclusive
// com a busca ativa (aí só os achados existem). Cada botão mexe só na sua lista.
function ligarExpansao() {
    for (const [prefixo, lista] of [
        ['ca-como-faco', 'ca-como-faco-lista'],
        ['ca-faq', 'ca-faq-lista'],
    ]) {
        for (const [acao, abrir] of [
            ['expandir', true],
            ['recolher', false],
        ]) {
            $(`${prefixo}-${acao}`)?.addEventListener('click', () => {
                $(lista)
                    ?.querySelectorAll('details')
                    .forEach((d) => {
                        d.open = abrir;
                    });
            });
        }
    }
}

function ligarBusca() {
    const caixa = $('ca-busca');
    if (!caixa) return;
    caixa.addEventListener('input', () => aplicarBusca(caixa.value));
    caixa.addEventListener('keydown', aoTeclarNaBusca);
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
// Os dados são estáticos (vêm só dos módulos de dados, nada muda em
// runtime): a montagem inicial e a ligação da caixa de busca bastam aqui. A
// cada abertura (ver abrirCentralAjuda) a busca é zerada e o texto do botão
// de apresentação, recalculado.
export function initCentralAjuda() {
    ligarBusca();
    ligarExpansao();
    aplicarBusca('');
}

export async function abrirCentralAjuda() {
    await garantirModal('modal-central-ajuda');
    atualizarTextoBotaoApresentacao();
    // sempre abre sem busca: a lista inteira, tudo recolhido
    const caixa = $('ca-busca');
    if (caixa) caixa.value = '';
    aplicarBusca('');
    await toggleModal('modal-central-ajuda');
}

// Botão "Ver/Rever a apresentação completa": fecha ESTE modal e abre o
// modal de sempre (modo-aprendizado.js) — mesmo caminho que o primeiro
// acesso automático usa, só que disparado manualmente.
export async function abrirApresentacaoDaAjuda() {
    await toggleModal('modal-central-ajuda');
    await abrirModoAprendizado();
}
