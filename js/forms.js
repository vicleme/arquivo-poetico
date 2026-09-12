// ============================================================
// forms.js — Submit handlers e funções de edição por entidade
// ============================================================

import {
    db,
    save,
    obterOuCriarEpocaPorNome,
    calcularImpactoExclusaoPessoa,
    calcularImpactoExclusaoEpoca,
    mesclarPessoas,
    mesclarEpocas,
    getEscansaoDoPoema,
} from './db.js';
import {
    reordenarPosicao,
    fecharEspaco,
    getIrmaosTopoLivro,
    getIrmaosPorEscopo,
    lerDataParcial,
    preencherDataParcial,
    preencherDataParcialSeVazio,
    seqOuNull,
    gerarId,
    escapeHtml,
    mostrarAviso,
    mostrarAvisoComAcao,
    abrirModalConfirmacao,
    criarRastreadorDeAlteracoes,
    violaOrdemDeDatas,
    obterSugestaoEpocaPorId,
    nomeEpoca,
    CORES_GRUPO,
    CORES_GRUPO_PADRAO,
    pontoCorGrupo,
    FORMAS_POEMA,
    REGULARIDADES_METRICAS,
    TAMANHOS_VERSO,
    ESQUEMA_RIMAS_PRESENCA,
    ESQUEMA_RIMAS_PADRAO,
    ORIGENS_TRADICAO_SONORIDADE,
    REGISTROS_SONORIDADE,
    TONS_SONORIDADE,
    calcularOpcoesCascataSonoridade,
    corrigirPresencaRimaSeVersoBranco,
    sugerirOrigemTradicaoPorTamanho,
    avisoMonorrimaAtipica,
} from './utils.js';

// Rastreadores de alterações não salvas dos formulários de texto longo
// (ver toggleModal em modais.js — confirma antes de fechar se sujo).
// Instanciados aqui (não em utils.js) porque quem sabe quando salvar
// terminou — e portanto quando "limpar" — é o submit handler de cada
// formulário, que mora neste módulo.
export const rastreadorPoema = criarRastreadorDeAlteracoes();
export const rastreadorProsa = criarRastreadorDeAlteracoes();
import { salvarCapa, deletarCapa } from './capas.js';
import { getColetaneasDeItem } from './coletaneas.js';
import { toggleModal, garantirModal, renderDropdowns, sincronizarFiltroDestino } from './ui.js';
import {
    atualizarDatalist,
    carregarPessoas,
    obterPessoas,
    resetSinalizacoes,
    carregarSinalizacoes,
    resetPessoas,
    carregarGruposDiretos,
    obterGruposDiretos,
    resetGruposDiretos,
    carregarAutoria,
    obterAutoria,
    resetAutoria,
    carregarEnvios,
    obterEnvios,
    resetEnvios,
    carregarReconhecimentos,
    obterReconhecimentos,
    resetReconhecimentos,
    resetGeneroProsa,
    carregarGeneroProsa,
    atualizarDatalistProsa,
    obterIntertextualidade,
    carregarIntertextualidade,
    resetIntertextualidade,
    obterReferenciasExternas,
    carregarReferenciasExternas,
    resetReferenciasExternas,
    obterAnexos,
    carregarAnexos,
    resetAnexos,
    obterAnotacoes,
    carregarAnotacoes,
    obterElos,
    carregarElos,
    resetElos,
    obterEcos,
    carregarEcos,
    resetEcos,
    renderPainelElosDerivados,
    atualizarFiltroSecoesMigracao,
    renderPainelElosDerivadosProsa,
    obterLojas,
    carregarLojas,
    resetLojas,
} from './editor.js';
import { renderPessoas, renderEpocas } from './render-listas.js';
import {
    construirLinhasIniciais,
    inicializarGradeSonoridade,
    obterLinhasSonoridade,
    obterRimasSonoridade,
    calcularDivergenciaSilabas,
} from './editor-sonoridade.js';
import { validarJsonSonoridade } from './importar-sonoridade.js';

// Lê o par Livro/Seção de texto livre dos campos de Migração (Cortado
// de / Lançado em) — compartilhado por Poema e Prosa (item 4), por isso
// vive no escopo do módulo em vez de dentro de um dos dois onsubmit.
function lerLivroSecao(prefLivro, prefSecao) {
    const livro = document.getElementById(prefLivro)?.value || '';
    const secao = document.getElementById(prefSecao)?.value || '';
    return livro || secao ? { livro, secao } : null;
}

// ─── Preenchimento declarativo de formulário de edição ──────────────
// Substitui a lista repetitiva de "document.getElementById(id).value =
// objeto.campo || ''" que cada editarX (Livro/Parte/Seção/Poema/Prosa/
// Elemento) tinha, uma linha por campo simples do formulário — por um
// mapa campo → input e uma única chamada. Cada entrada do mapa aceita:
//   'input-id'                          → objeto[campo] ?? ''
//   ['input-id', padrao]                → objeto[campo] ?? padrao
//   ['input-id', padrao, transformar]   → transformar(objeto[campo] ?? padrao)
// Checkbox (input.type === 'checkbox') é detectado automaticamente e
// preenchido via .checked em vez de .value. Input ausente no DOM (ex:
// campo condicional) é simplesmente ignorado.
// Fica de fora do mapa qualquer campo composto ou com lógica própria —
// data parcial (preencherDataParcial), vínculo (paiTipo:paiId), select
// múltiplo, tags — que já não se repetia entre os seis, então não
// precisa dessa abstração.
function preencherCampos(objeto, mapa) {
    for (const [campo, spec] of Object.entries(mapa)) {
        const [inputId, padrao = '', transformar] = Array.isArray(spec) ? spec : [spec];
        const el = document.getElementById(inputId);
        if (!el) continue;
        if (el.type === 'checkbox') {
            el.checked = !!objeto[campo];
            continue;
        }
        const valor = objeto[campo] ?? padrao;
        el.value = transformar ? transformar(valor) : valor;
    }
}

// ─── Indicador somente-leitura "Aparece em: Coletânea X › Parte Y" ──
// Usado no modal de Poema e de Prosa. A edição em si (a qual coletânea,
// qual parte, sequência, override) continua só pela aba Coletâneas —
// isso aqui é só pra não esconder do usuário que o vínculo existe.
function renderColetaneasInfo(containerId, refTipo, refId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const lista = getColetaneasDeItem(refTipo, refId);
    el.innerHTML = lista.length
        ? `<div class="text-[11px] bg-indigo-50 dark:bg-indigo-950 border border-indigo-100 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg px-3 py-2 mt-1">
              📚 Aparece em: ${lista.map((c) => `<strong>${escapeHtml(c.coletaneaTitulo)}</strong> › ${escapeHtml(c.parteTitulo)}`).join(' &nbsp;·&nbsp; ')}
           </div>`
        : '';
}

// ─── Livro ───────────────────────────────────────────────────

export function initFormLivro() {
    const form = document.getElementById('form-livro');
    if (!form) return;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('l-edit-id').value;
        const capaFile = document.getElementById('l-capa').files[0];
        const removerCapa = document.getElementById('l-remover-capa').checked;
        const capaAtual = id ? db.livros.find((x) => x.id == id)?.capa : null;
        // "Remover capa" tem prioridade sobre um arquivo eventualmente selecionado —
        // se a pessoa marcou a caixa, a intenção é ficar sem capa, ponto final.
        let capaFinal;
        if (removerCapa) {
            await deletarCapa(capaAtual);
            capaFinal = null;
        } else {
            // salvarCapa retorna o novo ID (e descarta o antigo) se houver arquivo novo,
            // ou null se não houver — nesse caso mantemos o ID já existente.
            const novoCapaId = capaFile ? await salvarCapa(capaFile, capaAtual) : null;
            capaFinal = novoCapaId ?? capaAtual;
        }

        const dataPublicacao = lerDataParcial('l-data');
        const dataUltimaEdicao = lerDataParcial('l-ultima-edicao');
        if (violaOrdemDeDatas(dataPublicacao, dataUltimaEdicao)) {
            return mostrarAviso(
                'A Data da Última Edição não pode ser anterior à Data de Primeira Publicação.',
            );
        }

        const dados = {
            id: id ? parseInt(id) : gerarId(),
            titulo: document.getElementById('l-titulo').value,
            sequencia: seqOuNull(document.getElementById('l-sequencia').value),
            siglaOficial: document.getElementById('l-sigla-oficial').value,
            siglaPessoal: document.getElementById('l-sigla-pessoal').value,
            data: dataPublicacao,
            dataUltimaEdicao,
            tipo: document.getElementById('l-tipo').value,
            fase: document.getElementById('l-fase').value,
            abertura: document.getElementById('l-abertura').value,
            sinopse: document.getElementById('l-sinopse').value,
            capaDesc: document.getElementById('l-capa-desc').value,
            fraseCapa: document.getElementById('l-frase-capa').value,
            orelha1: document.getElementById('l-orelha-1').value,
            orelha2: document.getElementById('l-orelha-2').value,
            contracapa: document.getElementById('l-contracapa').value,
            isbn13: document.getElementById('l-isbn-13').value.trim(),
            isbn10: document.getElementById('l-isbn-10').value.trim(),
            codigoBarrasUrl: document.getElementById('l-codigo-barras').value.trim(),
            pdfUrl: document.getElementById('l-pdf').value.trim(),
            epubUrl: document.getElementById('l-epub').value.trim(),
            fichaCatalograficaUrl: document.getElementById('l-ficha-catalografica').value.trim(),
            certificadoDireitoAutoralUrl: document
                .getElementById('l-certificado-direito-autoral')
                .value.trim(),
            cartaExclusividadeUrl: document.getElementById('l-carta-exclusividade').value.trim(),
            lojas: obterLojas(),
            capa: capaFinal,
        };

        const posicaoAntiga = id ? (db.livros.find((x) => x.id == id)?.sequencia ?? null) : null;

        if (id) db.livros[db.livros.findIndex((x) => x.id == id)] = dados;
        else db.livros.push(dados);

        reordenarPosicao(db.livros, dados, dados.sequencia, posicaoAntiga);

        save();
        resetLojas();
        toggleModal('modal-livro');
    };
}

const MAPA_LIVRO = {
    id: 'l-edit-id',
    titulo: 'l-titulo',
    sequencia: 'l-sequencia',
    siglaOficial: 'l-sigla-oficial',
    siglaPessoal: 'l-sigla-pessoal',
    tipo: ['l-tipo', 'Inéditos'],
    fase: 'l-fase',
    abertura: 'l-abertura',
    sinopse: 'l-sinopse',
    capaDesc: 'l-capa-desc',
    fraseCapa: 'l-frase-capa',
    orelha1: 'l-orelha-1',
    orelha2: 'l-orelha-2',
    contracapa: 'l-contracapa',
    isbn13: 'l-isbn-13',
    isbn10: 'l-isbn-10',
    codigoBarrasUrl: 'l-codigo-barras',
    pdfUrl: 'l-pdf',
    epubUrl: 'l-epub',
    fichaCatalograficaUrl: 'l-ficha-catalografica',
    certificadoDireitoAutoralUrl: 'l-certificado-direito-autoral',
    cartaExclusividadeUrl: 'l-carta-exclusividade',
};

export async function editarLivro(id) {
    const l = db.livros.find((x) => x.id == id);
    if (!l) return;
    await garantirModal('modal-livro');
    renderDropdowns();

    preencherCampos(l, MAPA_LIVRO);
    preencherDataParcial('l-data', l.data);
    preencherDataParcial('l-ultima-edicao', l.dataUltimaEdicao);
    carregarLojas(l.lojas || []);
    document.getElementById('l-remover-capa').checked = false;
    document.getElementById('modal-livro-titulo').innerText = 'Editar Livro';
    toggleModal('modal-livro');
}

// ─── Pessoa ──────────────────────────────────────────────────
// Cadastro central: quem a pessoa É (nome + grupos que pertence),
// constante entre poemas. O papel que ela ocupa em CADA texto
// (Retratado(a)/Dedicatário(a)/etc.) não mora aqui — mora em
// item.pessoas, dentro do próprio poema/prosa (ver criarGrupoDePessoas
// em editor.js). Grupo em si vem de um cadastro à parte (ver Grupo,
// abaixo) — aqui só marcamos quais grupos, já existentes, esta pessoa
// pertence, via checkbox (não cria grupo novo por aqui de propósito:
// grupo cadastrável formalmente é o ponto de não hardcodar "Júlias"/
// "Friends" no código-fonte, então criar mora só na aba Grupos).

export function initFormPessoa() {
    const form = document.getElementById('form-pessoa');
    if (!form) return;

    form.onsubmit = (e) => {
        e.preventDefault();
        const id = document.getElementById('ps-edit-id').value;
        const nome = document.getElementById('ps-nome').value.trim();
        const grupoIds = Array.from(
            document.querySelectorAll('#ps-grupos-container input[type="checkbox"]:checked'),
        ).map((el) => parseInt(el.value));

        // Grava os dados do form no cadastro (cria se `id` vazio, atualiza
        // no lugar se não) — usado tanto no caminho normal quanto como
        // primeiro passo de "Mesclar agora" abaixo (o registro precisa
        // existir em `db.pessoas` antes de virar `origemId` de
        // mesclarPessoas, que só opera sobre entradas já cadastradas).
        const gravar = () => {
            const dados = { id: id ? parseInt(id) : gerarId(), nome, grupoIds };
            if (id) db.pessoas[db.pessoas.findIndex((x) => x.id == id)] = dados;
            else db.pessoas.push(dados);
            return dados.id;
        };

        // Nome duplicado (mesmo critério de dedup exato de
        // obterOuCriarPessoaPorNome/migrarPessoasParaCadastro) — não
        // decide sozinho: pode ser a mesma pessoa cadastrada duas vezes
        // (aí faz sentido mesclar) ou duas pessoas diferentes de
        // propósito, mesmo nome (ex.: grupos diferentes) — aí o Victor
        // quer mesmo os dois registros separados. Motivado por uma
        // pergunta dele sobre o mesmo risco em Época, ver abaixo.
        const duplicata = db.pessoas.find((x) => x.nome === nome && x.id != id);

        if (!duplicata) {
            gravar();
            save();
            toggleModal('modal-pessoa');
            return;
        }

        abrirModalConfirmacao({
            titulo: `Já existe uma Pessoa chamada "${duplicata.nome}"`,
            rotulo: 'Nome duplicado',
            mensagem:
                'Pode ser a mesma pessoa cadastrada duas vezes, ou duas pessoas diferentes de propósito (mesmo nome, grupos diferentes, por exemplo). O que você quer fazer?',
            textoConfirmar: 'Mesclar agora',
            corConfirmar: '#d97706',
            acaoSecundaria: {
                texto: 'Salvar mesmo assim',
                onClick: () => {
                    gravar();
                    save();
                    toggleModal('modal-pessoa');
                },
            },
            onConfirmar: () => {
                const origemId = gravar();
                mesclarPessoas(db, origemId, duplicata.id);
                save();
                toggleModal('modal-pessoa');
                renderPessoas();
                mostrarAviso(`Mesclado com "${duplicata.nome}"`, 'sucesso');
            },
        });
    };
}

export async function editarPessoa(id) {
    const p = db.pessoas.find((x) => x.id == id);
    if (!p) return;
    await garantirModal('modal-pessoa');
    renderDropdowns(); // popula #ps-grupos-container com os grupos existentes

    document.getElementById('ps-edit-id').value = p.id;
    document.getElementById('ps-nome').value = p.nome;
    document.querySelectorAll('#ps-grupos-container input[type="checkbox"]').forEach((el) => {
        el.checked = (p.grupoIds || []).includes(parseInt(el.value));
    });
    document.getElementById('modal-pessoa-titulo').innerText = 'Editar Pessoa';
    toggleModal('modal-pessoa');
}

// ─── Grupo ───────────────────────────────────────────────────
// Registro dedicado (não tag livre tipo Sinalizações) justamente pra
// poder criar/editar/renomear formalmente, sem hardcode no código-fonte
// (ver conversa que definiu isso) e sem o risco de divergência que uma
// string solta repetida em cada Pessoa teria.

// Desenha as bolinhas de CORES_GRUPO (fonte única, ver utils.js) e marca
// a selecionada com um anel; clique grava em #g-cor (hidden input) e
// redesenha pra mover o anel. Sem input[type=color] de propósito — a
// paleta é curada (ver CORES_GRUPO em utils.js).
export function renderSeletorCorGrupo(corSelecionada) {
    const container = document.getElementById('g-cor-container');
    if (!container) return;
    container.innerHTML = CORES_GRUPO.map(({ chave, rotulo }) => {
        const selecionada = chave === corSelecionada;
        const anel = selecionada
            ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-slate-900'
            : '';
        return `<button type="button" title="${escapeHtml(rotulo)}" aria-label="${escapeHtml(rotulo)}"
            onclick="selecionarCorGrupo('${chave}')"
            class="w-6 h-6 rounded-full ${pontoCorGrupo(chave)} ${anel}"></button>`;
    }).join('');
}

window.selecionarCorGrupo = (chave) => {
    document.getElementById('g-cor').value = chave;
    renderSeletorCorGrupo(chave);
};

export function initFormGrupo() {
    const form = document.getElementById('form-grupo');
    if (!form) return;

    form.onsubmit = (e) => {
        e.preventDefault();
        const id = document.getElementById('g-edit-id').value;
        const dados = {
            id: id ? parseInt(id) : gerarId(),
            nome: document.getElementById('g-nome').value.trim(),
            cor: document.getElementById('g-cor').value || CORES_GRUPO_PADRAO,
        };

        if (id) db.grupos[db.grupos.findIndex((x) => x.id == id)] = dados;
        else db.grupos.push(dados);

        save();
        toggleModal('modal-grupo');
    };
}

export async function editarGrupo(id) {
    const g = db.grupos.find((x) => x.id == id);
    if (!g) return;
    await garantirModal('modal-grupo');
    document.getElementById('g-edit-id').value = g.id;
    document.getElementById('g-nome').value = g.nome;
    document.getElementById('g-cor').value = g.cor || CORES_GRUPO_PADRAO;
    renderSeletorCorGrupo(g.cor || CORES_GRUPO_PADRAO);
    document.getElementById('modal-grupo-titulo').innerText = 'Editar Grupo';
    toggleModal('modal-grupo');
}

// ─── Autor ───────────────────────────────────────────────────
// Cadastro central (db.autores: { id, nome, sobre }), à parte do de
// Pessoas — quem tem responsabilidade autoral sobre um texto (ver
// migrarAutoria em db.js e AUTORIA_PAPEIS em utils.js). Sem grupos:
// diferente de Pessoa, Autor não tem uma taxonomia própria pra
// agrupar — só nome e uma nota livre ("sobre").

export function initFormAutor() {
    const form = document.getElementById('form-autor');
    if (!form) return;

    form.onsubmit = (e) => {
        e.preventDefault();
        const id = document.getElementById('au-edit-id').value;

        const dados = {
            id: id ? parseInt(id) : gerarId(),
            nome: document.getElementById('au-nome').value.trim(),
            isni: document.getElementById('au-isni').value.trim(),
            sobre: document.getElementById('au-sobre').value.trim(),
        };

        if (id) db.autores[db.autores.findIndex((x) => x.id == id)] = dados;
        else db.autores.push(dados);

        save();
        toggleModal('modal-autor');
    };
}

export async function editarAutor(id) {
    const a = db.autores.find((x) => x.id == id);
    if (!a) return;
    await garantirModal('modal-autor');
    document.getElementById('au-edit-id').value = a.id;
    document.getElementById('au-nome').value = a.nome;
    document.getElementById('au-isni').value = a.isni || '';
    document.getElementById('au-sobre').value = a.sobre || '';
    document.getElementById('modal-autor-titulo').innerText = 'Editar Autor';
    toggleModal('modal-autor');
}

// ─── Época ───────────────────────────────────────────────────
// Cadastro central (db.epocas: { id, nome, contextoRelacao, notas }),
// item 3 do plano de schema — a que período um poema se refere (ver
// migrarEpocas em db.js). Mesmo espírito de Autor acima: sem grupos,
// só um cadastro simples referenciado por epocaId. O modal de Poema
// não abre este modal diretamente — resolve/cria por nome no submit
// (ver obterOuCriarEpocaPorNome em db.js); este modal serve pra edição
// posterior (contextoRelacao/notas) e exclusão, na aba de gestão.

export function initFormEpoca() {
    const form = document.getElementById('form-epoca');
    if (!form) return;

    form.onsubmit = (e) => {
        e.preventDefault();
        const id = document.getElementById('ep-edit-id').value;
        const nome = document.getElementById('ep-nome').value.trim();
        const contextoRelacao = document.getElementById('ep-contexto').value.trim();
        const notas = document.getElementById('ep-notas').value.trim();

        // Mesmo raciocínio de initFormPessoa acima: grava primeiro (cria
        // se `id` vazio, atualiza no lugar se não), pra existir em
        // `db.epocas` antes de virar `origemId` de mesclarEpocas se for
        // esse o caminho escolhido.
        const gravar = () => {
            const dados = { id: id ? parseInt(id) : gerarId(), nome, contextoRelacao, notas };
            if (id) db.epocas[db.epocas.findIndex((x) => x.id == id)] = dados;
            else db.epocas.push(dados);
            return dados.id;
        };

        // Nome duplicado (mesmo critério de dedup exato de
        // obterOuCriarEpocaPorNome/migrarEpocas) — mesma pergunta de
        // Pessoa acima: pode ser a mesma Época cadastrada duas vezes, ou
        // duas Épocas diferentes de propósito, mesmo nome (ex.: o
        // relacionamento muda, mas o período recebeu o mesmo apelido).
        const duplicata = db.epocas.find((x) => x.nome === nome && x.id != id);

        if (!duplicata) {
            gravar();
            save();
            toggleModal('modal-epoca');
            return;
        }

        abrirModalConfirmacao({
            titulo: `Já existe uma Época chamada "${duplicata.nome}"`,
            rotulo: 'Nome duplicado',
            mensagem:
                'Pode ser a mesma Época cadastrada duas vezes, ou duas Épocas diferentes de propósito, mesmo nome (ex.: o relacionamento mudou, mas o período ganhou o mesmo apelido). O que você quer fazer?',
            textoConfirmar: 'Mesclar agora',
            corConfirmar: '#d97706',
            acaoSecundaria: {
                texto: 'Salvar mesmo assim',
                onClick: () => {
                    gravar();
                    save();
                    toggleModal('modal-epoca');
                },
            },
            onConfirmar: () => {
                const origemId = gravar();
                mesclarEpocas(db, origemId, duplicata.id);
                save();
                toggleModal('modal-epoca');
                renderEpocas();
                mostrarAviso(`Mesclado com "${duplicata.nome}"`, 'sucesso');
            },
        });
    };
}

export async function editarEpoca(id) {
    const ep = db.epocas.find((x) => x.id == id);
    if (!ep) return;
    await garantirModal('modal-epoca');
    document.getElementById('ep-edit-id').value = ep.id;
    document.getElementById('ep-nome').value = ep.nome;
    document.getElementById('ep-contexto').value = ep.contextoRelacao || '';
    document.getElementById('ep-notas').value = ep.notas || '';
    document.getElementById('modal-epoca-titulo').innerText = 'Editar Época';
    toggleModal('modal-epoca');
}

// ─── Mesclar (Pessoa/Época) ────────────────────────────────────
// Modal genérico (modal-mesclar.html), reaproveitado pelas duas abas de
// gestão que têm o mesmo risco de duplicata por nome — renomear uma
// Pessoa/Época pra igual a outra não mescla nada sozinho (ver
// mesclarPessoas/mesclarEpocas em db.js pra detalhe da mecânica e da
// conversa que motivou isso). `RENDER_MESCLAR` isola a única parte que
// muda entre os dois tipos (rótulo, como calcular impacto, qual função
// de mesclagem chamar, qual lista re-renderizar depois) — o fluxo do
// modal em si (abrir, escolher destino, confirmar, executar) é idêntico.
const RENDER_MESCLAR = {
    pessoas: {
        rotulo: 'Pessoa',
        impacto: (id) => calcularImpactoExclusaoPessoa(db, id),
        mesclar: (origemId, destinoId) => mesclarPessoas(db, origemId, destinoId),
        rerender: renderPessoas,
    },
    epocas: {
        rotulo: 'Época',
        impacto: (id) => calcularImpactoExclusaoEpoca(db, id),
        mesclar: (origemId, destinoId) => mesclarEpocas(db, origemId, destinoId),
        rerender: renderEpocas,
    },
};

export function initFormMesclar() {
    const form = document.getElementById('form-mesclar');
    if (!form) return;

    form.onsubmit = (e) => {
        e.preventDefault();
        const tipo = document.getElementById('ms-tipo').value;
        const origemId = parseInt(document.getElementById('ms-origem-id').value);
        const destinoId = parseInt(document.getElementById('ms-destino-id').value);
        const cfg = RENDER_MESCLAR[tipo];
        if (!cfg || !destinoId) return;

        const origem = db[tipo].find((x) => x.id == origemId);
        const destino = db[tipo].find((x) => x.id == destinoId);
        if (!origem || !destino) return;

        const { poemasIds, prosasIds } = cfg.impacto(origemId);
        const total = poemasIds.length + prosasIds.length;

        // Fecha o modal de escolha antes de abrir o de confirmação — os
        // dois usam a mesma tecla Esc/foco-trap (ver modais.js), então
        // empilhar os dois ao mesmo tempo confundiria qual fecha primeiro.
        toggleModal('modal-mesclar');
        abrirModalConfirmacao({
            titulo: `${origem.nome} → ${destino.nome}`,
            rotulo: `Mesclar ${cfg.rotulo}`,
            mensagem:
                total > 0
                    ? `${total} texto${total !== 1 ? 's' : ''} que ${total !== 1 ? 'referenciam' : 'referencia'} "${origem.nome}" ${total !== 1 ? 'passam' : 'passa'} a referenciar "${destino.nome}". "${origem.nome}" será removido(a) do cadastro. Essa ação não pode ser desfeita.`
                    : `"${origem.nome}" será removido(a) do cadastro. Essa ação não pode ser desfeita.`,
            textoConfirmar: 'Mesclar',
            corConfirmar: '#d97706',
            onConfirmar: () => {
                cfg.mesclar(origemId, destinoId);
                save();
                cfg.rerender();
                mostrarAviso(`Mesclado: "${origem.nome}" → "${destino.nome}"`, 'sucesso');
            },
        });
    };
}

// ─── Sonoridade (Escansão) ──────────────────────────────────────
// Bloco 1 (dados + tabela) e Bloco 2 completo — a grade em si (grade
// silábica, Modo Sílaba Tônica, Mapeamento de Rimas) mora em
// js/editor-sonoridade.js; este arquivo só decide QUANDO carregá-la
// (carregarGradeSonoridade) e lê o resultado final na hora de salvar
// (obterLinhasSonoridade/obterRimasSonoridade).
function popularSelectOpcoes(id, opcoes, valorAtual = '') {
    const sel = document.getElementById(id);
    if (!sel) return;
    const placeholder = sel.options[0]; // "-- Não classificado --" / "-- Presença --" etc.
    sel.innerHTML = '';
    sel.appendChild(placeholder);
    opcoes.forEach((op) => {
        const opt = document.createElement('option');
        opt.value = op;
        opt.textContent = op;
        sel.appendChild(opt);
    });
    // Se o valor atual não está (mais) na lista — típico de repopular
    // com uma lista filtrada pela cascata do Bloco 3 depois de trocar
    // formaPoema — cai pro placeholder em vez de deixar o <select>
    // sem nenhuma opção selecionada (valor "fantasma").
    sel.value = valorAtual && opcoes.includes(valorAtual) ? valorAtual : '';
}

// Bloco 3 (Matriz de Validação em Cascata) — relê os 3 campos que
// disparam restrição (formaPoema/regularidadeMetrica/
// esquemaRimasPresenca já escolhidos) e repopula os 5 selects em
// cascata com a lista filtrada de calcularOpcoesCascataSonoridade,
// preservando o valor de cada um se ele ainda for válido (senão volta
// pro placeholder — ver popularSelectOpcoes). Chamada tanto ao abrir o
// modal (popularCamposSonoridade, pra uma escansão já salva abrir já
// filtrada) quanto a cada troca de formaPoema/regularidadeMetrica/
// esquemaRimasPresenca (ver initFormSonoridade).
function aplicarCascataSonoridade() {
    const formaPoema = document.getElementById('son-forma-poema')?.value || '';
    const regularidadeMetrica = document.getElementById('son-regularidade-metrica')?.value || '';
    const esquemaRimasPresenca = document.getElementById('son-esquema-rimas-presenca')?.value || '';

    const opcoes = calcularOpcoesCascataSonoridade({
        formaPoema,
        regularidadeMetrica,
        esquemaRimasPresenca,
    });

    popularSelectOpcoes(
        'son-regularidade-metrica',
        opcoes.regularidadeMetrica,
        regularidadeMetrica,
    );
    popularSelectOpcoes(
        'son-tamanho-verso',
        opcoes.tamanhoVerso,
        document.getElementById('son-tamanho-verso')?.value,
    );
    popularSelectOpcoes(
        'son-esquema-rimas-presenca',
        opcoes.esquemaRimasPresenca,
        esquemaRimasPresenca,
    );
    popularSelectOpcoes(
        'son-esquema-rimas-padrao',
        opcoes.esquemaRimasPadrao,
        document.getElementById('son-esquema-rimas-padrao')?.value,
    );
    popularSelectOpcoes(
        'son-origem-tradicao',
        opcoes.origemTradicao,
        document.getElementById('son-origem-tradicao')?.value,
    );
}

// junto com um aviso (não bloqueante) se o poema escolhido já tiver
// uma escansão cadastrada (edição em cima dela substitui; cadastro novo
// nesse poema criaria uma segunda, o que getEscansaoDoPoema não prevê
// — ver comentário em db.js: no máximo uma por poema).
function popularSelectPoemasSonoridade(poemaIdAtual = '') {
    const sel = document.getElementById('son-poema-id');
    if (!sel) return;
    const ordenados = [...db.poemas].sort((a, b) =>
        (a.titulo || '').localeCompare(b.titulo || '', 'pt-BR'),
    );
    sel.innerHTML = '<option value="">-- Escolha um poema --</option>';
    ordenados.forEach((p) => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.titulo || `#${p.id}`;
        sel.appendChild(opt);
    });
    sel.value = poemaIdAtual || '';
}

function atualizarAvisoPoemaSonoridade() {
    const sel = document.getElementById('son-poema-id');
    const aviso = document.getElementById('son-poema-aviso');
    const idEmEdicao = document.getElementById('son-edit-id')?.value;
    if (!sel || !aviso) return;
    const existente = sel.value ? getEscansaoDoPoema(parseInt(sel.value)) : null;
    if (existente && String(existente.id) !== String(idEmEdicao)) {
        aviso.textContent =
            'Esse poema já tem uma escansão cadastrada — salvar aqui substitui a existente.';
        aviso.classList.remove('hidden');
    } else {
        aviso.classList.add('hidden');
    }
}

// Carrega a grade do editor visual (js/editor-sonoridade.js) a partir do
// estado atual do <select> de poema + do id em edição:
// - sem poema escolhido → grade vazia;
// - editando uma escansão já existente E o poema no select ainda é o
//   mesmo dela → recarrega a grade salva (`es.escansaoLinhas`), preservando
//   a divisão silábica já feita;
// - poema novo OU trocado (edição apontando pra outro poema agora) →
//   reconstrói do zero a partir do texto do poema (construirLinhasIniciais)
//   — troca de poema no meio de uma edição existente perde a grade
//   anterior, decisão aceita (ver conversa do Bloco 2).
function carregarGradeSonoridade() {
    const container = document.getElementById('son-grade-container');
    if (!container) return;
    const poemaId = parseInt(document.getElementById('son-poema-id')?.value);
    if (!poemaId) {
        inicializarGradeSonoridade(container, []);
        return;
    }
    const poema = db.poemas.find((p) => p.id === poemaId);
    if (!poema) {
        inicializarGradeSonoridade(container, []);
        return;
    }
    const idEmEdicao = document.getElementById('son-edit-id')?.value;
    const es = idEmEdicao ? db.escansoes.find((x) => String(x.id) === idEmEdicao) : null;
    const linhas =
        es && String(es.poemaId) === String(poemaId) && es.escansaoLinhas?.length
            ? es.escansaoLinhas
            : construirLinhasIniciais(poema.texto);
    const rimas = es && String(es.poemaId) === String(poemaId) ? es.rimas || [] : [];
    inicializarGradeSonoridade(container, linhas, rimas);
}

// Repopula os 7 selects (poema + 6 campos de classificação) do zero —
// chamada tanto ao abrir "Adicionar Escansão" quanto ao editar, nunca
// só uma vez no registrarModal(): ao contrário do onsubmit (que pode
// ser wireado uma única vez, ver initFormSonoridade), a lista de poemas
// muda ao longo do uso, então precisa recarregar toda vez que o modal
// abre — mesmo raciocínio de renderDropdowns() em ui.js, chamado por
// prepararNovo a cada abertura.
function popularCamposSonoridade(valores = {}) {
    popularSelectPoemasSonoridade(valores.poemaId || '');
    popularSelectOpcoes('son-forma-poema', FORMAS_POEMA, valores.formaPoema);
    popularSelectOpcoes(
        'son-regularidade-metrica',
        REGULARIDADES_METRICAS,
        valores.regularidadeMetrica,
    );
    popularSelectOpcoes('son-tamanho-verso', TAMANHOS_VERSO, valores.tamanhoVerso);
    popularSelectOpcoes(
        'son-esquema-rimas-presenca',
        ESQUEMA_RIMAS_PRESENCA,
        valores.esquemaRimasPresenca,
    );
    popularSelectOpcoes(
        'son-esquema-rimas-padrao',
        ESQUEMA_RIMAS_PADRAO,
        valores.esquemaRimasPadrao,
    );
    popularSelectOpcoes('son-origem-tradicao', ORIGENS_TRADICAO_SONORIDADE, valores.origemTradicao);
    popularSelectOpcoes('son-registro', REGISTROS_SONORIDADE, valores.registro);
    popularSelectOpcoes('son-tom', TONS_SONORIDADE, valores.tom);
    // Bloco 3: estreita os 5 selects em cascata pro que já está salvo em
    // formaPoema/regularidadeMetrica/esquemaRimasPresenca — feito depois
    // de popular tudo com a lista cheia (acima), não antes, senão os
    // valores.* ainda não estariam no DOM pra aplicarCascataSonoridade ler.
    aplicarCascataSonoridade();
    atualizarAvisoPoemaSonoridade();
    carregarGradeSonoridade();
}

// Aplica só os 7 selects de classificação (sem mexer no <select> de
// Poema nem na grade) — subconjunto de popularCamposSonoridade(),
// reaproveitado pela importação de JSON abaixo, que resolve poema e
// grade separadamente (poema pode já estar selecionado antes do
// upload; a grade vem sanitizada de validarJsonSonoridade, não de
// construirLinhasIniciais/es.escansaoLinhas).
function aplicarClassificacaoSonoridade(valores) {
    popularSelectOpcoes('son-forma-poema', FORMAS_POEMA, valores.formaPoema);
    popularSelectOpcoes(
        'son-regularidade-metrica',
        REGULARIDADES_METRICAS,
        valores.regularidadeMetrica,
    );
    popularSelectOpcoes('son-tamanho-verso', TAMANHOS_VERSO, valores.tamanhoVerso);
    popularSelectOpcoes(
        'son-esquema-rimas-presenca',
        ESQUEMA_RIMAS_PRESENCA,
        valores.esquemaRimasPresenca,
    );
    popularSelectOpcoes(
        'son-esquema-rimas-padrao',
        ESQUEMA_RIMAS_PADRAO,
        valores.esquemaRimasPadrao,
    );
    popularSelectOpcoes('son-origem-tradicao', ORIGENS_TRADICAO_SONORIDADE, valores.origemTradicao);
    popularSelectOpcoes('son-registro', REGISTROS_SONORIDADE, valores.registro);
    popularSelectOpcoes('son-tom', TONS_SONORIDADE, valores.tom);
    aplicarCascataSonoridade();
}

// Botão "Importar JSON" do modal de Sonoridade — lê um .json no mesmo
// formato do baixado por baixarEscansaoJson (exportar-sonoridade.js) e
// preenche poema/classificação/grade a partir dele, em vez de tudo
// manual. A validação/sanitização em si mora em importar-sonoridade.js
// (módulo puro, sem DOM); esta função só lê o arquivo e aplica o
// resultado no formulário já aberto.
export function importarSonoridadeDeArquivo(event) {
    const arquivo = event.target?.files?.[0];
    if (!arquivo) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        let dados;
        try {
            dados = JSON.parse(e.target.result);
        } catch {
            mostrarAviso('Erro ao ler o arquivo — confira se é um .json válido.');
            event.target.value = '';
            return;
        }

        const poemaSelecionadoId = document.getElementById('son-poema-id')?.value;
        const resultado = validarJsonSonoridade(dados, db.poemas, poemaSelecionadoId);
        if (resultado.erro) {
            mostrarAviso(resultado.erro);
            event.target.value = '';
            return;
        }

        const { poema, valores, linhas, rimas, avisos } = resultado;

        const selPoema = document.getElementById('son-poema-id');
        if (selPoema) selPoema.value = poema.id;
        atualizarAvisoPoemaSonoridade();

        aplicarClassificacaoSonoridade(valores);

        const container = document.getElementById('son-grade-container');
        if (container) inicializarGradeSonoridade(container, linhas, rimas);

        if (avisos.length) avisos.forEach((msg) => mostrarAviso(msg));
        else mostrarAviso('JSON importado.', 'sucesso');

        event.target.value = '';
    };
    reader.readAsText(arquivo);
}

// Abre o modal pra uma escansão NOVA (botão "Adicionar Escansão") — a
// contraparte de editarSonoridade abaixo. Função própria (em vez de
// reaproveitar prepararNovo(tipo) de ui.js) porque o reset desse modal
// precisa repopular os selects a cada abertura, não só uma vez — mesmo
// padrão já usado por prepararNovaParte/prepararNovoItem em
// coletaneas.js pro mesmo tipo de necessidade.
export async function prepararNovaSonoridade() {
    await garantirModal('modal-sonoridade');
    const form = document.getElementById('form-sonoridade');
    if (!form) return;
    form.reset();
    document.getElementById('son-edit-id').value = '';
    document.getElementById('modal-sonoridade-titulo').innerText = 'Adicionar Escansão';
    popularCamposSonoridade();
    toggleModal('modal-sonoridade');
}

export function initFormSonoridade() {
    const selPoema = document.getElementById('son-poema-id');
    if (selPoema) {
        selPoema.onchange = () => {
            atualizarAvisoPoemaSonoridade();
            carregarGradeSonoridade();
        };
    }

    // Bloco 3 — os 3 campos que disparam restrição/correção nos outros:
    // formaPoema e regularidadeMetrica recalculam a cascata inteira (um
    // muda quem trava o quê, o outro decide se o caso composto Forma
    // Livre + Versos Livres se aplica); esquemaRimasPresenca primeiro
    // corrige o próprio valor (regra 1 — Versos Brancos) e só depois
    // recalcula (o Padrão depende do valor já corrigido de Presença).
    document.getElementById('son-forma-poema')?.addEventListener('change', () => {
        aplicarCascataSonoridade();
    });
    document.getElementById('son-regularidade-metrica')?.addEventListener('change', () => {
        aplicarCascataSonoridade();
    });
    document.getElementById('son-esquema-rimas-presenca')?.addEventListener('change', (e) => {
        const regularidadeMetrica = document.getElementById('son-regularidade-metrica')?.value;
        const corrigido = corrigirPresencaRimaSeVersoBranco(e.target.value, regularidadeMetrica);
        if (corrigido !== e.target.value) e.target.value = corrigido;
        aplicarCascataSonoridade();
    });
    // Regra adicional 2 — sugestão, não trava: só preenche Origem/
    // Tradição se o campo ainda estiver vazio, pra não sobrescrever uma
    // escolha manual já feita.
    document.getElementById('son-tamanho-verso')?.addEventListener('change', (e) => {
        const selOrigem = document.getElementById('son-origem-tradicao');
        if (!selOrigem || selOrigem.value) return;
        const sugestao = sugerirOrigemTradicaoPorTamanho(e.target.value);
        if (sugestao && Array.from(selOrigem.options).some((o) => o.value === sugestao)) {
            selOrigem.value = sugestao;
        }
    });

    const form = document.getElementById('form-sonoridade');
    if (!form) return;

    form.onsubmit = (e) => {
        e.preventDefault();
        const id = document.getElementById('son-edit-id').value;
        const poemaId = parseInt(document.getElementById('son-poema-id').value);
        if (!poemaId) return;

        // Substitui a escansão existente do poema (se houver e não for a
        // que já está em edição), em vez de criar uma segunda — mesmo
        // aviso não bloqueante mostrado em atualizarAvisoPoemaSonoridade.
        const existente = getEscansaoDoPoema(poemaId);
        const idAlvo = id ? parseInt(id) : existente ? existente.id : gerarId();

        const dados = {
            id: idAlvo,
            poemaId,
            formaPoema: document.getElementById('son-forma-poema').value || null,
            regularidadeMetrica: document.getElementById('son-regularidade-metrica').value || null,
            tamanhoVerso: document.getElementById('son-tamanho-verso').value || null,
            esquemaRimasPresenca:
                document.getElementById('son-esquema-rimas-presenca').value || null,
            esquemaRimasPadrao: document.getElementById('son-esquema-rimas-padrao').value || null,
            origemTradicao: document.getElementById('son-origem-tradicao').value || null,
            registro: document.getElementById('son-registro').value || null,
            tom: document.getElementById('son-tom').value || null,
            escansaoLinhas: obterLinhasSonoridade(),
            rimas: obterRimasSonoridade(),
        };

        // Regra adicional 3 (avisos não-bloqueantes) — não impedem o
        // salvamento, só avisam depois pra revisão. Monorrima atípica
        // primeiro (mais específico); divergência de sílabas só faz
        // sentido em poema Isométrico (ver calcularDivergenciaSilabas).
        const avisoMonorrima = avisoMonorrimaAtipica(dados.formaPoema, dados.esquemaRimasPadrao);
        if (avisoMonorrima) mostrarAviso(avisoMonorrima);
        if (dados.regularidadeMetrica === 'Isométrico') {
            const divergentes = calcularDivergenciaSilabas(
                dados.escansaoLinhas,
                dados.tamanhoVerso,
            );
            if (divergentes.length) {
                mostrarAviso(
                    `Verso${divergentes.length > 1 ? 's' : ''} ${divergentes.join(', ')} ${
                        divergentes.length > 1 ? 'não batem' : 'não bate'
                    } com ${dados.tamanhoVerso} — confira a escansão.`,
                );
            }
        }

        const anterior = db.escansoes.find((x) => x.id == idAlvo);
        if (anterior) {
            const idx = db.escansoes.findIndex((x) => x.id == idAlvo);
            db.escansoes[idx] = dados;
        } else {
            db.escansoes.push(dados);
        }

        save();
        toggleModal('modal-sonoridade');
    };
}

export async function editarSonoridade(id) {
    const es = db.escansoes.find((x) => x.id == id);
    if (!es) return;
    await garantirModal('modal-sonoridade');

    document.getElementById('son-edit-id').value = es.id;
    popularCamposSonoridade(es);
    document.getElementById('modal-sonoridade-titulo').innerText = 'Editar Escansão';
    toggleModal('modal-sonoridade');
}

export async function abrirModalMesclar(tipo, origemId) {
    const cfg = RENDER_MESCLAR[tipo];
    if (!cfg) return;
    const origem = db[tipo]?.find((x) => x.id == origemId);
    if (!origem) return;

    const outras = (db[tipo] || [])
        .filter((x) => x.id != origemId)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    if (outras.length === 0) {
        mostrarAviso(`Não há outra ${cfg.rotulo.toLowerCase()} cadastrada pra mesclar.`);
        return;
    }

    await garantirModal('modal-mesclar');
    document.getElementById('modal-mesclar-titulo').innerText = `Mesclar ${cfg.rotulo}`;
    document.getElementById('ms-tipo').value = tipo;
    document.getElementById('ms-origem-id').value = origemId;
    document.getElementById('ms-origem-nome').innerText = origem.nome;
    document.getElementById('ms-destino-id').innerHTML = outras
        .map((x) => `<option value="${x.id}">${escapeHtml(x.nome)}</option>`)
        .join('');
    toggleModal('modal-mesclar');
}

// ─── Parte ───────────────────────────────────────────────────

export function initFormParte() {
    const form = document.getElementById('form-parte');
    if (!form) return;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('part-edit-id').value;
        const capaFile = document.getElementById('part-capa').files[0];
        const removerCapa = document.getElementById('part-remover-capa').checked;
        const capaAtual = id ? db.partes.find((x) => x.id == id)?.capa : null;
        let capaFinal;
        if (removerCapa) {
            await deletarCapa(capaAtual);
            capaFinal = null;
        } else {
            const novoCapaId = capaFile ? await salvarCapa(capaFile, capaAtual) : null;
            capaFinal = novoCapaId ?? capaAtual;
        }

        const dados = {
            id: id ? parseInt(id) : gerarId(),
            titulo: document.getElementById('part-titulo').value,
            livroId: document.getElementById('part-livro').value,
            sequencia: seqOuNull(document.getElementById('part-sequencia').value),
            capaDesc: document.getElementById('part-capa-desc').value,
            abertura: document.getElementById('part-abertura').value,
            capa: capaFinal,
        };

        const anterior = id ? db.partes.find((x) => x.id == id) : null;
        const posicaoAntiga =
            anterior && String(anterior.livroId) === String(dados.livroId)
                ? (anterior.sequencia ?? null)
                : null;

        if (id) db.partes[db.partes.findIndex((x) => x.id == id)] = dados;
        else db.partes.push(dados);

        // Se mudou de livro, fecha o buraco que deixou no livro antigo
        if (anterior && String(anterior.livroId) !== String(dados.livroId)) {
            fecharEspaco(getIrmaosTopoLivro(db, anterior.livroId), anterior.sequencia ?? null);
        }

        reordenarPosicao(
            getIrmaosTopoLivro(db, dados.livroId),
            dados,
            dados.sequencia,
            posicaoAntiga,
        );

        save();
        toggleModal('modal-parte');
    };
}

const MAPA_PARTE = {
    id: 'part-edit-id',
    titulo: 'part-titulo',
    livroId: 'part-livro',
    sequencia: 'part-sequencia',
    capaDesc: 'part-capa-desc',
    abertura: 'part-abertura',
};

export async function editarParte(id) {
    const p = db.partes.find((x) => x.id == id);
    if (!p) return;
    await garantirModal('modal-parte');
    renderDropdowns();

    preencherCampos(p, MAPA_PARTE);
    document.getElementById('part-capa').value = ''; // limpa seleção anterior — sem arquivo novo, preserva capa atual
    document.getElementById('part-remover-capa').checked = false;
    document.getElementById('modal-parte-titulo').innerText = 'Editar Parte';
    toggleModal('modal-parte');
}

// ─── Seção ───────────────────────────────────────────────────

export function initFormSecao() {
    const form = document.getElementById('form-secao');
    if (!form) return;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const idInput = document.getElementById('sec-edit-id').value;
        const vinculo = document.getElementById('sec-vinculo').value;
        if (!vinculo) return mostrarAviso('Selecione um vínculo para a seção!');

        const [tipo, idPai] = vinculo.split(':');
        const id = idInput ? parseInt(idInput) : gerarId();
        const capaFile = document.getElementById('sec-capa').files[0];
        const removerCapa = document.getElementById('sec-remover-capa').checked;
        const capaAtual = idInput ? db.secoes.find((x) => x.id == id)?.capa : null;
        let capaFinal;
        if (removerCapa) {
            await deletarCapa(capaAtual);
            capaFinal = null;
        } else {
            const novoCapaId = capaFile ? await salvarCapa(capaFile, capaAtual) : null;
            capaFinal = novoCapaId ?? capaAtual;
        }

        const dados = {
            id,
            titulo: document.getElementById('sec-titulo').value,
            paiTipo: tipo,
            paiId: idPai,
            abertura: document.getElementById('sec-abertura').value,
            sequencia: seqOuNull(document.getElementById('sec-sequencia')?.value),
            capaDesc: document.getElementById('sec-capa-desc').value,
            capa: capaFinal,
        };

        const anterior = idInput ? db.secoes.find((x) => x.id == id) : null;
        const mesmoEscopo =
            anterior &&
            anterior.paiTipo === dados.paiTipo &&
            String(anterior.paiId) === String(dados.paiId);
        const posicaoAntiga = mesmoEscopo ? (anterior.sequencia ?? null) : null;

        if (idInput) {
            const idx = db.secoes.findIndex((x) => x.id == id);
            if (idx !== -1) db.secoes[idx] = dados;
        } else {
            db.secoes.push(dados);
        }

        if (anterior && !mesmoEscopo) {
            fecharEspaco(
                getIrmaosPorEscopo(db, anterior.paiTipo, anterior.paiId),
                anterior.sequencia ?? null,
            );
        }
        reordenarPosicao(
            getIrmaosPorEscopo(db, dados.paiTipo, dados.paiId),
            dados,
            dados.sequencia,
            posicaoAntiga,
        );

        save();
        toggleModal('modal-secao');
    };
}

const MAPA_SECAO = {
    id: 'sec-edit-id',
    titulo: 'sec-titulo',
    sequencia: 'sec-sequencia',
    abertura: 'sec-abertura',
    capaDesc: 'sec-capa-desc',
};

export async function editarSecao(id) {
    const s = db.secoes.find((x) => x.id == id);
    if (!s) return;
    await garantirModal('modal-secao');
    renderDropdowns();

    preencherCampos(s, MAPA_SECAO);
    document.getElementById('sec-vinculo').value = `${s.paiTipo}:${s.paiId}`;
    document.getElementById('sec-capa').value = '';
    document.getElementById('sec-remover-capa').checked = false;
    document.getElementById('modal-secao-titulo').innerText = 'Editar Seção';
    toggleModal('modal-secao');
}

// ─── Poema ───────────────────────────────────────────────────

// Desliga/liga visualmente os campos De/Até de Época Retratada quando o
// checkbox N/A é marcado/desmarcado — os valores digitados neles são
// ignorados no submit se N/A estiver marcado (ver initFormPoema), então
// desabilitar é só pra deixar isso claro em tela, não uma trava de dados.
export function toggleCamposEpocaNa() {
    const na = document.getElementById('p-epoca-na')?.checked;
    ['p-epoca-ini', 'p-epoca-fim'].forEach((prefixo) => {
        ['dia', 'mes', 'ano'].forEach((parte) => {
            const el = document.getElementById(`${prefixo}-${parte}`);
            if (el) el.disabled = !!na;
        });
    });
}

// Aplica a sugestão automática de datas/contexto ao repetir um nome de
// período já usado (ver p-epoca-nome em modal-poema.html) — só entra
// nos campos que estiverem vazios (De/Até de Época Retratada e Contexto
// Histórico/Pessoal), nunca sobrescrevendo o que já foi digitado. O
// nome digitado só dispara sugestão se já existir uma Época cadastrada
// com esse nome exato (db.epocas) — nome novo não tem histórico ainda
// pra sugerir. Ver obterSugestaoEpocaPorId em utils.js pra critério de
// "mais recente".
export function aplicarSugestaoEpoca() {
    const nome = (document.getElementById('p-epoca-nome')?.value || '').trim();
    if (!nome) return;
    const epoca = db.epocas.find((e) => e.nome === nome);
    if (!epoca) return;
    // Item 4: Época é cadastro central compartilhado (item 3) — busca no
    // texto mais recente com esse epocaId em Poemas E Prosas, não só
    // Poemas, já que uma prosa pode ter documentado o período primeiro.
    const sugestao = obterSugestaoEpocaPorId([...db.poemas, ...(db.prosas || [])], epoca.id);
    if (!sugestao) return;
    preencherDataParcialSeVazio('p-epoca-ini', sugestao.inicio);
    preencherDataParcialSeVazio('p-epoca-fim', sugestao.fim);
    const contextoEl = document.getElementById('p-contexto');
    if (contextoEl && !contextoEl.value.trim() && sugestao.contextoHistorico) {
        contextoEl.value = sugestao.contextoHistorico;
    }
}

export function initFormPoema() {
    const form = document.getElementById('form-poema');
    if (!form) return;

    rastreadorPoema.observar(form);

    form.onsubmit = (e) => {
        e.preventDefault();

        const idInput = document.getElementById('p-edit-id').value;
        const id = idInput ? parseInt(idInput) : gerarId();
        const destino = document.getElementById('p-destino').value;

        let paiTipo = null,
            paiId = null;
        if (destino) {
            const partes = destino.split(':');
            paiTipo = partes[0];
            paiId = parseInt(partes[1]);
        }

        const dataEscrita = lerDataParcial('p-data-esc');
        const dataPublicacao = lerDataParcial('p-data-pub');
        // Metadados de arquivo (Word etc.) frequentemente dão só uma data
        // aproximada, ou selecionada por contexto — a maioria do acervo
        // é assim, por isso o padrão é "não exata" (ver colunas.js/render-listas.js).
        if (dataEscrita) dataEscrita.exata = document.getElementById('p-data-esc-exata').checked;

        if (violaOrdemDeDatas(dataEscrita, dataPublicacao)) {
            return mostrarAviso(
                'A Data de Primeira Publicação não pode ser anterior à Data de Escrita.',
            );
        }

        // Época Retratada é um intervalo (não um ponto no tempo), com um
        // terceiro estado além de "preenchido"/"vazio": N/A marcado é uma
        // exclusão deliberada, distinta de "ainda não categorizado" (o
        // campo inteiro fica null). O nome digitado é resolvido/criado no
        // cadastro central db.epocas (mesmo caminho de
        // obterOuCriarAutorPorNome) — ver formatarEpocaRetratada em
        // utils.js.
        const epocaNa = document.getElementById('p-epoca-na').checked;
        const epocaNome = (document.getElementById('p-epoca-nome')?.value || '').trim();
        const epocaRecorte = document.getElementById('p-epoca-recorte')?.value || null;
        const epocaInicio = lerDataParcial('p-epoca-ini');
        const epocaFim = lerDataParcial('p-epoca-fim');

        if (violaOrdemDeDatas(epocaInicio, epocaFim)) {
            return mostrarAviso('O "Até" da Época Retratada não pode ser anterior ao "De".');
        }

        const epocaCadastrada = epocaNome ? obterOuCriarEpocaPorNome(epocaNome) : null;

        const epocaRetratada =
            epocaNa || epocaInicio || epocaFim || epocaCadastrada
                ? {
                      epocaId: epocaCadastrada?.id ?? null,
                      inicio: epocaInicio,
                      fim: epocaFim,
                      recorte: epocaRecorte,
                      na: epocaNa,
                  }
                : null;

        const dados = {
            id,
            titulo: document.getElementById('p-titulo').value,
            texto: document.getElementById('p-texto').value,
            paiTipo,
            paiId,
            sequencia: seqOuNull(document.getElementById('p-sequencia').value),
            idioma: document.getElementById('p-idioma').value.trim() || 'pt-BR',
            dataEscrita,
            dataPublicacao,
            ano: dataEscrita?.ano || '', // mantido por compatibilidade (ordenação/estatísticas/exportação)
            livrosIds: Array.from(document.getElementById('p-livros').selectedOptions).map((o) =>
                parseInt(o.value),
            ),
            conceitos: {
                elos: obterElos('poemas'),
                ecos: obterEcos('poemas'),
            },
            notas: document.getElementById('p-notas').value,
            sinalizacoesTradicao: document.getElementById('p-sinal-tradicao').value,
            sinalizacoesEstilo: document.getElementById('p-sinal-estilo').value,
            sinalizacoesTema: document.getElementById('p-sinal-tema').value,
            sinalizacoesRelacao: document.getElementById('p-sinal-relacao').value,
            sinalizacoesSensibilidade: document.getElementById('p-sinal-sensibilidade').value,
            sinalizacoesTom: document.getElementById('p-sinal-tom').value,
            sinalizacoesDominioImagetico: document.getElementById('p-sinal-dominioImagetico').value,
            sinalizacoesOutros: document.getElementById('p-sinal-outros').value,
            pessoas: obterPessoas('poemas'),
            gruposDiretos: obterGruposDiretos('poemas'),
            autoria: obterAutoria('poemas'),
            envios: obterEnvios('poemas'),
            reconhecimentos: obterReconhecimentos('poemas'),
            autoavaliacao: document.getElementById('p-autoavaliacao').value,
            status: document.getElementById('p-status').value,
            epocaRetratada,
            intertextualidade: obterIntertextualidade('poemas'),
            referenciasExternas: obterReferenciasExternas('poemas'),
            anexos: obterAnexos('poemas'),
            anexosNotaGeral: document.getElementById('p-anexos-nota-geral').value,
            anotacoesMarginais: obterAnotacoes(),
            descricaoVisual: document.getElementById('p-visual').value,
            contextoHistorico: document.getElementById('p-contexto').value,
            ocultacao: document.getElementById('p-ocultacao').value,
            conteudoSensivel: document.getElementById('p-sensivel').value,
            vocabularioHiperacionante: document.getElementById('p-hiperacionante').value,
            cortadoDe: lerLivroSecao('p-cortado-livro', 'p-cortado-secao'),
            lancadoEm: lerLivroSecao('p-lancado-livro', 'p-lancado-secao'),
            justificativaMigracao: document.getElementById('p-migracao-justificativa').value,
            descarte: document.getElementById('p-descarte').value,
            pendencia: document.getElementById('p-pendencia').value,
        };

        // Aviso não-bloqueante: os campos de Migração e Descarte só fazem
        // sentido junto do status correspondente. Não impede salvar — só
        // avisa, pra não travar o fluxo caso o texto seja escrito antes de
        // trocar o status, ou o status mude sem que o campo seja limpo.
        if (
            (dados.cortadoDe || dados.lancadoEm || dados.justificativaMigracao.trim()) &&
            dados.status !== 'migrado'
        ) {
            mostrarAvisoComAcao(
                'Migração entre livros preenchida, mas o status não é "Migrado".',
                'Reabrir',
                () => editarPoema(dados.id),
            );
        }
        if (dados.descarte.trim() && dados.status !== 'descartado') {
            mostrarAvisoComAcao(
                'Descarte preenchido, mas o status não é "Descartado".',
                'Reabrir',
                () => editarPoema(dados.id),
            );
        }

        const anterior = idInput ? db.poemas.find((x) => x.id == id) : null;
        const mesmoEscopo =
            anterior &&
            anterior.paiTipo === dados.paiTipo &&
            String(anterior.paiId) === String(dados.paiId);
        const posicaoAntiga = mesmoEscopo ? (anterior.sequencia ?? null) : null;

        if (idInput) {
            const idx = db.poemas.findIndex((x) => x.id == id);
            if (idx !== -1) db.poemas[idx] = dados;
        } else {
            db.poemas.push(dados);
        }

        // Poema avulso (sem destino) não disputa posição com nada
        if (anterior && !mesmoEscopo && anterior.paiTipo && anterior.paiId) {
            fecharEspaco(
                getIrmaosPorEscopo(db, anterior.paiTipo, anterior.paiId),
                anterior.sequencia ?? null,
            );
        }
        if (dados.paiTipo && dados.paiId) {
            reordenarPosicao(
                getIrmaosPorEscopo(db, dados.paiTipo, dados.paiId),
                dados,
                dados.sequencia,
                posicaoAntiga,
            );
        }

        save();
        rastreadorPoema.marcarLimpo();
        toggleModal('modal-poema');
        resetSinalizacoes('poemas');
        resetPessoas('poemas');
        resetGruposDiretos('poemas');
        resetAutoria('poemas');
        resetEnvios('poemas');
        resetReconhecimentos('poemas');
        form.reset();
    };
}

const MAPA_POEMA = {
    id: 'p-edit-id',
    titulo: 'p-titulo',
    texto: 'p-texto',
    sequencia: 'p-sequencia',
    idioma: ['p-idioma', 'pt-BR'],
    notas: 'p-notas',
    autoavaliacao: 'p-autoavaliacao',
    anexosNotaGeral: 'p-anexos-nota-geral',
    status: 'p-status', // select — preencherCampos seta .value por já não ser checkbox
    descricaoVisual: 'p-visual',
    contextoHistorico: 'p-contexto',
    ocultacao: 'p-ocultacao',
    conteudoSensivel: 'p-sensivel',
    vocabularioHiperacionante: 'p-hiperacionante',
    descarte: 'p-descarte',
    pendencia: 'p-pendencia',
};

export async function editarPoema(id) {
    const p = db.poemas.find((x) => x.id == id);
    if (!p) return;
    await garantirModal('modal-poema');

    renderDropdowns();
    atualizarDatalist();

    preencherCampos(p, MAPA_POEMA);
    preencherDataParcial('p-data-esc', p.dataEscrita);
    preencherDataParcial('p-data-pub', p.dataPublicacao);
    document.getElementById('p-data-esc-exata').checked = !!p.dataEscrita?.exata;
    preencherDataParcial('p-epoca-ini', p.epocaRetratada?.inicio);
    preencherDataParcial('p-epoca-fim', p.epocaRetratada?.fim);
    document.getElementById('p-epoca-na').checked = !!p.epocaRetratada?.na;
    document.getElementById('p-epoca-nome').value = nomeEpoca(p.epocaRetratada, db.epocas);
    document.getElementById('p-epoca-recorte').value = p.epocaRetratada?.recorte || '';
    toggleCamposEpocaNa();
    document.getElementById('p-intertexto-tipo').value = '';
    document.getElementById('p-intertexto-texto').value = '';
    carregarIntertextualidade('poemas', p.intertextualidade || []);
    document.getElementById('p-refext-tipo').value = '';
    document.getElementById('p-refext-texto').value = '';
    carregarReferenciasExternas('poemas', p.referenciasExternas || []);
    carregarElos('poemas', p.conceitos?.elos || []);
    carregarEcos('poemas', p.conceitos?.ecos || []);
    renderPainelElosDerivados(p.id);
    document.getElementById('p-anexo-tipo').value = '';
    document.getElementById('p-anexo-link').value = '';
    carregarAnexos('poemas', p.anexos || p.ilustracoes || []);
    document.getElementById('p-anotacao-trecho').value = '';
    document.getElementById('p-anotacao-posicao').value = '';
    document.getElementById('p-anotacao-fonte').value = '';
    carregarAnotacoes(p.anotacoesMarginais || []);
    document.getElementById('p-cortado-livro').value = p.cortadoDe?.livro || '';
    document.getElementById('p-cortado-secao').value = p.cortadoDe?.secao || '';
    document.getElementById('p-lancado-livro').value = p.lancadoEm?.livro || '';
    document.getElementById('p-lancado-secao').value = p.lancadoEm?.secao || '';
    document.getElementById('p-migracao-justificativa').value = p.justificativaMigracao || '';
    // .value= direto não dispara 'input' — reaplica o filtro de Seção
    // manualmente pros 4 campos que acabaram de ser preenchidos.
    atualizarFiltroSecoesMigracao();
    sincronizarFiltroDestino(
        'p-destino-filtro',
        'p-destino',
        p.paiTipo && p.paiId ? `${p.paiTipo}:${p.paiId}` : '',
    );

    const setM = (elId, vals) => {
        const el = document.getElementById(elId);
        if (!el) return;
        const arr = Array.isArray(vals) ? vals.map(String) : [];
        Array.from(el.options).forEach((opt) => {
            opt.selected = arr.includes(String(opt.value));
        });
    };

    setM('p-livros', p.livrosIds || []);

    carregarSinalizacoes('poemas', p);
    carregarPessoas('poemas', p.pessoas);
    carregarGruposDiretos('poemas', p.gruposDiretos);
    carregarAutoria('poemas', p.autoria);
    carregarEnvios('poemas', p.envios);
    carregarReconhecimentos('poemas', p.reconhecimentos);
    renderColetaneasInfo('p-coletaneas-info', 'poema', p.id);
    document.getElementById('modal-poema-titulo').innerText = 'Editar Poema';
    toggleModal('modal-poema');
}

// ─── Prosa ───────────────────────────────────────────────────
// Item 4: Prosa ganha os mesmos campos de Poema — ver toggleCamposEpocaNa/
// aplicarSugestaoEpoca acima pro comentário completo, mesma lógica aqui.

export function toggleCamposEpocaNaProsa() {
    const na = document.getElementById('pr-epoca-na')?.checked;
    ['pr-epoca-ini', 'pr-epoca-fim'].forEach((prefixo) => {
        ['dia', 'mes', 'ano'].forEach((parte) => {
            const el = document.getElementById(`${prefixo}-${parte}`);
            if (el) el.disabled = !!na;
        });
    });
}

export function aplicarSugestaoEpocaProsa() {
    const nome = (document.getElementById('pr-epoca-nome')?.value || '').trim();
    if (!nome) return;
    const epoca = db.epocas.find((e) => e.nome === nome);
    if (!epoca) return;
    // Época é cadastro central compartilhado (item 3) — a sugestão de
    // datas/contexto busca no texto mais recente com esse epocaId em
    // QUALQUER um dos dois arrays (não só Prosa), já que um poema pode
    // ter documentado o período primeiro. `obterSugestaoEpocaPorId`
    // ordena por id, e ids nunca colidem entre os dois tipos.
    const sugestao = obterSugestaoEpocaPorId([...db.poemas, ...(db.prosas || [])], epoca.id);
    if (!sugestao) return;
    preencherDataParcialSeVazio('pr-epoca-ini', sugestao.inicio);
    preencherDataParcialSeVazio('pr-epoca-fim', sugestao.fim);
    const contextoEl = document.getElementById('pr-contexto');
    if (contextoEl && !contextoEl.value.trim() && sugestao.contextoHistorico) {
        contextoEl.value = sugestao.contextoHistorico;
    }
}

export function initFormProsa() {
    const form = document.getElementById('form-prosa');
    if (!form) return;

    rastreadorProsa.observar(form);

    form.onsubmit = (e) => {
        e.preventDefault();

        const idInput = document.getElementById('pr-edit-id').value;
        const id = idInput ? parseInt(idInput) : gerarId();
        const destino = document.getElementById('pr-destino').value;

        let paiTipo = null,
            paiId = null;
        if (destino && destino.includes(':')) {
            const partes = destino.split(':');
            paiTipo = partes[0];
            paiId = parseInt(partes[1]);
        }

        const dataEscrita = lerDataParcial('pr-data-esc');
        const dataPublicacao = lerDataParcial('pr-data-pub');
        if (dataEscrita) dataEscrita.exata = document.getElementById('pr-data-esc-exata').checked;

        if (violaOrdemDeDatas(dataEscrita, dataPublicacao)) {
            return mostrarAviso(
                'A Data de Primeira Publicação não pode ser anterior à Data de Escrita.',
            );
        }

        // Época Retratada — mesmo formato de Poema (ver initFormPoema
        // acima pro comentário completo).
        const epocaNa = document.getElementById('pr-epoca-na').checked;
        const epocaNome = (document.getElementById('pr-epoca-nome')?.value || '').trim();
        const epocaRecorte = document.getElementById('pr-epoca-recorte')?.value || null;
        const epocaInicio = lerDataParcial('pr-epoca-ini');
        const epocaFim = lerDataParcial('pr-epoca-fim');

        if (violaOrdemDeDatas(epocaInicio, epocaFim)) {
            return mostrarAviso('O "Até" da Época Retratada não pode ser anterior ao "De".');
        }

        const epocaCadastrada = epocaNome ? obterOuCriarEpocaPorNome(epocaNome) : null;

        const epocaRetratada =
            epocaNa || epocaInicio || epocaFim || epocaCadastrada
                ? {
                      epocaId: epocaCadastrada?.id ?? null,
                      inicio: epocaInicio,
                      fim: epocaFim,
                      recorte: epocaRecorte,
                      na: epocaNa,
                  }
                : null;

        const dados = {
            id,
            titulo: document.getElementById('pr-titulo').value,
            texto: document.getElementById('pr-texto').value,
            sequencia: seqOuNull(document.getElementById('pr-sequencia').value),
            idioma: document.getElementById('pr-idioma').value.trim() || 'pt-BR',
            dataEscrita,
            dataPublicacao,
            ano: dataEscrita?.ano || '', // mantido por compatibilidade (ordenação/estatísticas/exportação)
            paiTipo,
            paiId,
            livrosIds: Array.from(document.getElementById('pr-livros').selectedOptions).map((o) =>
                parseInt(o.value),
            ),
            conceitos: {
                elos: obterElos('prosas'),
                ecos: obterEcos('prosas'),
            },
            notas: document.getElementById('pr-notas').value,
            sinalizacoesTradicao: document.getElementById('pr-sinal-tradicao').value,
            sinalizacoesEstilo: document.getElementById('pr-sinal-estilo').value,
            sinalizacoesTema: document.getElementById('pr-sinal-tema').value,
            sinalizacoesRelacao: document.getElementById('pr-sinal-relacao').value,
            sinalizacoesSensibilidade: document.getElementById('pr-sinal-sensibilidade').value,
            sinalizacoesTom: document.getElementById('pr-sinal-tom').value,
            sinalizacoesDominioImagetico: document.getElementById('pr-sinal-dominioImagetico')
                .value,
            sinalizacoesOutros: document.getElementById('pr-sinal-outros').value,
            pessoas: obterPessoas('prosas'),
            gruposDiretos: obterGruposDiretos('prosas'),
            autoria: obterAutoria('prosas'),
            envios: obterEnvios('prosas'),
            reconhecimentos: obterReconhecimentos('prosas'),
            autoavaliacao: document.getElementById('pr-autoavaliacao').value,
            genero: document.getElementById('pr-genero').value,
            publicado: document.getElementById('pr-pub').checked,
            status: document.getElementById('pr-status').value,
            epocaRetratada,
            intertextualidade: obterIntertextualidade('prosas'),
            referenciasExternas: obterReferenciasExternas('prosas'),
            anexos: obterAnexos('prosas'),
            anexosNotaGeral: document.getElementById('pr-anexos-nota-geral').value,
            contextoHistorico: document.getElementById('pr-contexto').value,
            ocultacao: document.getElementById('pr-ocultacao').value,
            conteudoSensivel: document.getElementById('pr-sensivel').value,
            vocabularioHiperacionante: document.getElementById('pr-hiperacionante').value,
            cortadoDe: lerLivroSecao('pr-cortado-livro', 'pr-cortado-secao'),
            lancadoEm: lerLivroSecao('pr-lancado-livro', 'pr-lancado-secao'),
            justificativaMigracao: document.getElementById('pr-migracao-justificativa').value,
            descarte: document.getElementById('pr-descarte').value,
            pendencia: document.getElementById('pr-pendencia').value,
        };

        // Avisos não-bloqueantes — mesmo critério de initFormPoema.
        if (
            (dados.cortadoDe || dados.lancadoEm || dados.justificativaMigracao.trim()) &&
            dados.status !== 'migrado'
        ) {
            mostrarAvisoComAcao(
                'Migração entre livros preenchida, mas o status não é "Migrado".',
                'Reabrir',
                () => editarProsa(dados.id),
            );
        }
        if (dados.descarte.trim() && dados.status !== 'descartado') {
            mostrarAvisoComAcao(
                'Descarte preenchido, mas o status não é "Descartado".',
                'Reabrir',
                () => editarProsa(dados.id),
            );
        }

        const anterior = idInput ? db.prosas.find((x) => x.id == id) : null;
        const mesmoEscopo =
            anterior &&
            anterior.paiTipo === dados.paiTipo &&
            String(anterior.paiId) === String(dados.paiId);
        const posicaoAntiga = mesmoEscopo ? (anterior.sequencia ?? null) : null;

        if (idInput) {
            const idx = db.prosas.findIndex((x) => x.id == id);
            if (idx !== -1) db.prosas[idx] = dados;
            else db.prosas.push(dados);
        } else {
            db.prosas.push(dados);
        }

        if (anterior && !mesmoEscopo && anterior.paiTipo && anterior.paiId) {
            fecharEspaco(
                getIrmaosPorEscopo(db, anterior.paiTipo, anterior.paiId),
                anterior.sequencia ?? null,
            );
        }
        if (dados.paiTipo && dados.paiId) {
            reordenarPosicao(
                getIrmaosPorEscopo(db, dados.paiTipo, dados.paiId),
                dados,
                dados.sequencia,
                posicaoAntiga,
            );
        }

        save();
        rastreadorProsa.marcarLimpo();
        toggleModal('modal-prosa');
        resetSinalizacoes('prosas');
        resetPessoas('prosas');
        resetGruposDiretos('prosas');
        resetAutoria('prosas');
        resetEnvios('prosas');
        resetReconhecimentos('prosas');
        resetGeneroProsa();
        resetIntertextualidade('prosas');
        resetReferenciasExternas('prosas');
        resetAnexos('prosas');
        resetElos('prosas');
        resetEcos('prosas');
        form.reset();
    };
}

const MAPA_PROSA = {
    id: 'pr-edit-id',
    titulo: 'pr-titulo',
    texto: 'pr-texto',
    sequencia: ['pr-sequencia', 0],
    idioma: ['pr-idioma', 'pt-BR'],
    notas: 'pr-notas',
    autoavaliacao: 'pr-autoavaliacao',
    publicado: 'pr-pub',
    anexosNotaGeral: 'pr-anexos-nota-geral',
    contextoHistorico: 'pr-contexto',
    ocultacao: 'pr-ocultacao',
    conteudoSensivel: 'pr-sensivel',
    vocabularioHiperacionante: 'pr-hiperacionante',
    descarte: 'pr-descarte',
    pendencia: 'pr-pendencia',
};

export async function editarProsa(id) {
    const pr = db.prosas.find((x) => x.id == id);
    if (!pr) return;
    await garantirModal('modal-prosa');
    renderDropdowns();

    preencherCampos(pr, MAPA_PROSA);
    preencherDataParcial('pr-data-esc', pr.dataEscrita);
    preencherDataParcial('pr-data-pub', pr.dataPublicacao);
    document.getElementById('pr-data-esc-exata').checked = !!pr.dataEscrita?.exata;
    preencherDataParcial('pr-epoca-ini', pr.epocaRetratada?.inicio);
    preencherDataParcial('pr-epoca-fim', pr.epocaRetratada?.fim);
    document.getElementById('pr-epoca-na').checked = !!pr.epocaRetratada?.na;
    document.getElementById('pr-epoca-nome').value = nomeEpoca(pr.epocaRetratada, db.epocas);
    document.getElementById('pr-epoca-recorte').value = pr.epocaRetratada?.recorte || '';
    toggleCamposEpocaNaProsa();
    document.getElementById('pr-intertexto-tipo').value = '';
    document.getElementById('pr-intertexto-texto').value = '';
    carregarIntertextualidade('prosas', pr.intertextualidade || []);
    document.getElementById('pr-refext-tipo').value = '';
    document.getElementById('pr-refext-texto').value = '';
    carregarReferenciasExternas('prosas', pr.referenciasExternas || []);
    carregarElos('prosas', pr.conceitos?.elos || []);
    carregarEcos('prosas', pr.conceitos?.ecos || []);
    renderPainelElosDerivadosProsa(pr.id);
    document.getElementById('pr-anexo-tipo').value = '';
    document.getElementById('pr-anexo-link').value = '';
    carregarAnexos('prosas', pr.anexos || []);
    document.getElementById('pr-cortado-livro').value = pr.cortadoDe?.livro || '';
    document.getElementById('pr-cortado-secao').value = pr.cortadoDe?.secao || '';
    document.getElementById('pr-lancado-livro').value = pr.lancadoEm?.livro || '';
    document.getElementById('pr-lancado-secao').value = pr.lancadoEm?.secao || '';
    document.getElementById('pr-migracao-justificativa').value = pr.justificativaMigracao || '';
    // .value= direto não dispara 'input' — reaplica o filtro de Seção
    // manualmente pros 4 campos que acabaram de ser preenchidos (mesmo
    // motivo de atualizarFiltroSecoesMigracao em editarPoema).
    atualizarFiltroSecoesMigracao();

    // Status: campo novo (item 4) — prosas existentes só tinham o
    // checkbox `publicado`, sem noção de Incompleto/Migrado/Descartado.
    // Default inteligente no carregamento pra não perder essa distinção
    // ao reabrir uma prosa antiga pra editar — sem migração de dado (só
    // afeta o que aparece pré-selecionado no `<select>`; se a pessoa não
    // mexer nele, o valor gravado no submit passa a ser explícito).
    document.getElementById('pr-status').value =
        pr.status || (pr.publicado ? 'publicado' : 'completo');

    const setM = (elId, vals) => {
        const el = document.getElementById(elId);
        if (!el) return;
        const arr = Array.isArray(vals) ? vals.map(String) : [];
        Array.from(el.options).forEach((opt) => {
            opt.selected = arr.includes(String(opt.value));
        });
    };
    setM('pr-livros', pr.livrosIds || []);

    const destinoStr =
        pr.paiTipo && pr.paiId
            ? `${pr.paiTipo}:${pr.paiId}`
            : pr.secaoId
              ? `secao:${pr.secaoId}`
              : ''; // compatibilidade: prosas salvas antes da remoção do campo legado
    sincronizarFiltroDestino('pr-destino-filtro', 'pr-destino', destinoStr);

    carregarSinalizacoes('prosas', pr);
    carregarPessoas('prosas', pr.pessoas);
    carregarGruposDiretos('prosas', pr.gruposDiretos);
    carregarAutoria('prosas', pr.autoria);
    carregarEnvios('prosas', pr.envios);
    carregarReconhecimentos('prosas', pr.reconhecimentos);
    carregarGeneroProsa(pr.genero);
    atualizarDatalistProsa();
    renderColetaneasInfo('pr-coletaneas-info', 'prosa', pr.id);
    document.getElementById('modal-prosa-titulo').innerText = 'Editar Prosa';
    toggleModal('modal-prosa');
}

// ─── Elemento ────────────────────────────────────────────────

export function initFormElemento() {
    const form = document.getElementById('form-elemento');
    if (!form) return;

    form.onsubmit = async (e) => {
        e.preventDefault();

        const idInput = document.getElementById('el-edit-id').value;
        const id = idInput ? parseInt(idInput) : gerarId();
        const vinculo = document.getElementById('el-vinculo').value;
        if (!vinculo) return mostrarAviso('Selecione um vínculo.');

        const [tipoPai, idPaiStr] = vinculo.split(':');
        const idPai = parseInt(idPaiStr);
        const fileEl = document.getElementById('el-img');
        const capaFile = fileEl && fileEl.files.length > 0 ? fileEl.files[0] : null;
        const removerImagem = document.getElementById('el-remover-imagem').checked;
        const capaAtual = idInput ? db.elementos.find((x) => x.id == id)?.imagem : null;
        let imagemFinal;
        if (removerImagem) {
            await deletarCapa(capaAtual);
            imagemFinal = null;
        } else {
            const novaImagemId = capaFile ? await salvarCapa(capaFile, capaAtual) : null;
            imagemFinal = novaImagemId ?? capaAtual;
        }

        const dados = {
            id,
            tipo: document.getElementById('el-tipo').value,
            titulo: document.getElementById('el-titulo')?.value || '',
            texto: document.getElementById('el-texto').value,
            notas: document.getElementById('el-notas').value,
            paiTipo: tipoPai,
            paiId: idPai,
            sequencia: seqOuNull(document.getElementById('el-sequencia')?.value),
            avisoConteudo: document.getElementById('el-aviso').value,
            versosPosIntroducao: document.getElementById('el-pos-versos').value,
            imagem: imagemFinal,
        };

        const anterior = idInput ? db.elementos.find((x) => x.id == id) : null;
        const mesmoEscopo =
            anterior &&
            anterior.paiTipo === dados.paiTipo &&
            String(anterior.paiId) === String(dados.paiId);
        const posicaoAntiga = mesmoEscopo ? (anterior.sequencia ?? null) : null;

        if (idInput) {
            const idx = db.elementos.findIndex((x) => x.id == id);
            if (idx !== -1) db.elementos[idx] = dados;
        } else {
            db.elementos.push(dados);
        }

        if (anterior && !mesmoEscopo) {
            fecharEspaco(
                getIrmaosPorEscopo(db, anterior.paiTipo, anterior.paiId),
                anterior.sequencia ?? null,
            );
        }
        reordenarPosicao(
            getIrmaosPorEscopo(db, dados.paiTipo, dados.paiId),
            dados,
            dados.sequencia,
            posicaoAntiga,
        );

        save();
        toggleModal('modal-elemento');
        form.reset();
    };
}

const MAPA_ELEMENTO = {
    id: 'el-edit-id',
    sequencia: 'el-sequencia',
    tipo: ['el-tipo', '', (v) => (v === 'Comentário' ? 'Conteúdo Multimídia' : v)],
    titulo: 'el-titulo',
    texto: 'el-texto',
    notas: 'el-notas',
    avisoConteudo: 'el-aviso',
    versosPosIntroducao: 'el-pos-versos',
};

export async function editarElemento(id) {
    const el = db.elementos.find((x) => x.id == id);
    if (!el) return;
    await garantirModal('modal-elemento');
    renderDropdowns();

    preencherCampos(el, MAPA_ELEMENTO);
    document.getElementById('el-vinculo').value = `${el.paiTipo}:${el.paiId}`;
    document.getElementById('el-remover-imagem').checked = false;

    // Importa toggleCamposIntroducao dinamicamente para evitar circular
    import('./ui.js').then(({ toggleCamposIntroducao }) => toggleCamposIntroducao());
    document.getElementById('modal-elemento-titulo').innerText = 'Editar Elemento';
    toggleModal('modal-elemento');
}
