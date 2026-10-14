// ============================================================
// selecao-massa.js — Seleção múltipla e ações em massa de Poemas e
// Prosas na listagem: checkboxes (com shift-click pra intervalo),
// barra de ações, edição em massa (Pessoas/Sinalizações/Gênero/
// Datas/Preencher campo), exclusão em massa e exportação da seleção.
//
// Todas as ações que existem nas duas tabelas são uma função só,
// parametrizada por `tabela` ('poemas'|'prosas') — ver CONFIG_SELECAO
// logo abaixo, que reúne o que varia entre as duas (Set de seleção,
// db[tabela], render*, getListaVisivel*, ids de DOM dos campos de
// bulk-edit, e a concordância de gênero das mensagens). A única
// exceção genuína é Gênero (aplicarGeneroEmMassaProsa/
// removerGeneroEmMassaProsa), que só existe em Prosa — não tem
// equivalente em Poemas, então não entra na unificação.
//
// Extraído de render-listas.js, que continua com a orquestração de
// renderização por aba e com o estado de filtro/busca — inclusive
// `selecaoPoemas`/`selecaoProsas` (os Sets), que ficam lá porque a
// própria renderização do checkbox de cada linha depende deles. Badges/
// paginação/cabeçalho de tabela moraram em render-listas.js só até uma
// extração seguinte, que os tirou de lá pra celulas-tabela.js — ver
// header de lá. Import circular entre este arquivo e render-listas.js
// é proposital: este módulo chama renderPoemas()/renderProsas() depois
// de toggle/ação em massa, e render-listas.js chama
// atualizarBarraSelecao(tabela) daqui dentro de renderPoemas()/renderProsas().
// Como as duas pontas só acessam o que importam dentro de corpo de
// função (nunca no topo do módulo), o ciclo é seguro — ver nota
// equivalente no topo de render-listas.js e de celulas-tabela.js.
// ============================================================

import { db, save, deleteItemsEmMassa, obterOuCriarPessoaPorNome } from './db.js';
import {
    abrirModalConfirmacao,
    escapeHtml,
    mostrarAviso,
    SINALIZACOES_CATEGORIAS,
    todosSelecionados,
    rotuloSelecaoEmLote,
} from './utils.js';
import {
    nomesDeTemasDigitados,
    sugestoesDeTemasEncadeadas,
    temasInexistentes,
    adicionarTemasAosTextos,
    removerTemasDosTextos,
} from './temas.js';
import {
    CAMPOS_PREENCHIVEIS,
    obterCampoPreenchivel,
    planejarPreenchimento,
    planejarLimpeza,
    aplicarPreenchimento,
    aplicarLimpeza,
} from './campos-preenchiveis.js';
import {
    garantirLocalPorNome,
    limparNomeLocal,
    localDoTextoDigitado,
    opcoesLocaisParaCampo,
} from './locais.js';
import {
    TIPOS_PERIODO_MASSA,
    rotuloTipoPeriodoMassa,
    nomesCadastroPeriodoMassa,
    planejarAplicacaoPeriodo,
    aplicarPlanoPeriodo,
    planejarRemocaoPeriodo,
    aplicarRemocaoPeriodo,
} from './periodos-massa.js';
import {
    selecaoPoemas,
    selecaoProsas,
    getListaVisivelPoemas,
    getListaVisivelProsas,
    renderPoemas,
    renderProsas,
} from './render-listas.js';
import {
    exportarSelecaoJson,
    exportarSelecaoCsv,
    exportarSelecaoMarkdown,
    exportarSelecaoPdf,
    exportarSelecaoDocx,
} from './exportar.js';

// O que varia entre Poemas e Prosas em toda ação em massa: o Set de
// seleção, o array em db[], as funções de render/lista visível, o
// singular ('poema'/'prosa', usado como `tipo` em exportarSelecao* e
// como palavra nas mensagens), o gênero gramatical (concordância de
// "selecionado(s)"/"selecionada(s)") e o sufixo dos ids de DOM dos
// campos de edição em massa (bulk-pessoa-input vs
// bulk-pessoa-input-prosa — sufixo vazio em Poemas, '-prosa' em Prosa,
// aplicado de forma consistente a todo id de campo bulk-*).
//
// cfg() monta esse objeto sob demanda, dentro do corpo da função, em
// vez de guardá-lo pronto numa constante de topo de módulo: selecaoPoemas/
// selecaoProsas/getListaVisivel*/render* vêm de render-listas.js, que
// importa este arquivo de volta (import circular proposital, ver
// header) — uma constante de topo que referenciasse esses bindings na
// hora da avaliação do módulo quebraria com "Cannot access ... before
// initialization" dependendo de qual lado do ciclo carrega primeiro.
// Dentro de uma função, os dois módulos já estão totalmente
// inicializados quando ela roda, então é seguro.
function cfg(tabela) {
    switch (tabela) {
        case 'poemas':
            return {
                selecao: selecaoPoemas,
                getListaVisivel: getListaVisivelPoemas,
                render: renderPoemas,
                singular: 'poema',
                genero: 'o',
                sufixoDom: '',
            };
        case 'prosas':
            return {
                selecao: selecaoProsas,
                getListaVisivel: getListaVisivelProsas,
                render: renderProsas,
                singular: 'prosa',
                genero: 'a',
                sufixoDom: '-prosa',
            };
        default:
            throw new Error(`Tabela desconhecida em selecao-massa: ${tabela}`);
    }
}

// "poema(s) selecionado(s)" / "prosa(s) selecionada(s)", com a
// concordância de número e gênero certa pro `n` da seleção atual.
function rotuloSelecao(tabela, n) {
    const c = cfg(tabela);
    const plural = n !== 1 ? 's' : '';
    return `${c.singular}${plural} selecionad${c.genero}${plural}`;
}

// Âncora do último checkbox marcado/desmarcado em cada aba — usada pro
// shift-click estender a seleção pro intervalo entre ele e o anterior
// (ver toggleSelecao). null = nenhum clique ainda nesta sessão pra
// aquela tabela, ou o último clique não fez parte do intervalo visível
// atual (filtro/ordenação mudou no meio do caminho).
const ultimoCheck = { poemas: null, prosas: null };

// shiftKey estende a seleção pro intervalo entre este checkbox e o
// último clicado (ordem da lista filtrada/ordenada atual, não a ordem
// de estrutura fixa — o intervalo é sempre "o que está entre as duas
// linhas na tela"). Marca ou desmarca o intervalo inteiro com o mesmo
// `checked` do checkbox que disparou o shift-click, replicando o
// padrão do Gmail/Finder. Se a âncora não estiver mais na lista visível
// (filtro mudou, ou é o primeiro clique da sessão), cai pro
// comportamento normal de um clique só.
export function toggleSelecao(tabela, checked, id, shiftKey) {
    const c = cfg(tabela);
    const ultimo = ultimoCheck[tabela];
    if (shiftKey && ultimo !== null && ultimo !== id) {
        const visiveis = c.getListaVisivel().map((item) => item.id);
        const iAncora = visiveis.indexOf(ultimo);
        const iAtual = visiveis.indexOf(id);
        if (iAncora !== -1 && iAtual !== -1) {
            const [ini, fim] = iAncora < iAtual ? [iAncora, iAtual] : [iAtual, iAncora];
            const intervalo = visiveis.slice(ini, fim + 1);
            if (checked) intervalo.forEach((iid) => c.selecao.add(iid));
            else intervalo.forEach((iid) => c.selecao.delete(iid));
            ultimoCheck[tabela] = id;
            c.render();
            return;
        }
    }
    if (checked) c.selecao.add(id);
    else c.selecao.delete(id);
    ultimoCheck[tabela] = id;
    atualizarBarraSelecao(tabela);
}

export function toggleSelecaoTodos(tabela, checked) {
    const c = cfg(tabela);
    const visiveis = c.getListaVisivel().map((item) => item.id);
    if (checked) visiveis.forEach((id) => c.selecao.add(id));
    else visiveis.forEach((id) => c.selecao.delete(id));
    c.render();
}

export function limparSelecao(tabela) {
    const c = cfg(tabela);
    c.selecao.clear();
    c.render();
}

// Inverte a seleção da lista que a tela mostra agora (filtros e busca
// incluídos): quem estava marcado é desmarcado e quem não estava é
// marcado. O que está fora da lista visível não é tocado (mesmo recorte de
// "Selecionar todos"). Serve para aplicar uma ação aos casos de exceção e
// depois ao restante: marca-se as exceções, aplica, inverte, aplica de novo.
export function inverterSelecao(tabela) {
    const c = cfg(tabela);
    c.getListaVisivel().forEach(({ id }) => {
        if (c.selecao.has(id)) c.selecao.delete(id);
        else c.selecao.add(id);
    });
    c.render();
}

// Alterna a seleção dos ids da página atual (`idsPagina`, vindos do botão
// "Selecionar estes N" na barra de paginação — ver montarPaginacao em
// celulas-tabela.js): se a página inteira já está selecionada, desmarca só
// ela; senão soma o que falta à seleção existente (nunca tira o que veio de
// outras páginas). Pra "substituir" a seleção continua valendo Limpar seleção
// → Selecionar esta página.
export function selecionarPagina(tabela, idsPagina) {
    const c = cfg(tabela);
    if (todosSelecionados(idsPagina, c.selecao)) idsPagina.forEach((id) => c.selecao.delete(id));
    else idsPagina.forEach((id) => c.selecao.add(id));
    c.render();
}

// Ids da lista filtrada atual que não estão na página exibida (`idsPagina`).
function idsRestantesDaLista(tabela, idsPagina) {
    const naPagina = new Set(idsPagina);
    return cfg(tabela)
        .getListaVisivel()
        .map((item) => item.id)
        .filter((id) => !naPagina.has(id));
}

// "Selecionar restantes": mesma alternância de selecionarPagina, mas sobre o
// que a lista filtrada tem fora da página na tela (todas as outras páginas).
export function selecionarRestantes(tabela, idsPagina) {
    const c = cfg(tabela);
    const restantes = idsRestantesDaLista(tabela, idsPagina);
    if (todosSelecionados(restantes, c.selecao)) restantes.forEach((id) => c.selecao.delete(id));
    else restantes.forEach((id) => c.selecao.add(id));
    c.render();
}

// Reescreve o rótulo dos dois botões da paginação ("Selecionar/Desselecionar
// estes N" e "... restantes (M)") depois de marcar/desmarcar uma linha à mão,
// que não re-renderiza a tabela. Sem isso o botão diria "Selecionar" com a
// página toda já marcada, e o clique desmarcaria.
function atualizarBotoesSelecaoEmLote(tabela) {
    const c = cfg(tabela);
    document.querySelectorAll(`[data-action="selecionar-pagina-${tabela}"]`).forEach((btn) => {
        btn.textContent = rotuloSelecaoEmLote(
            'pagina',
            btn.dataset.ids.split(',').map(Number),
            c.selecao,
        );
    });
    document.querySelectorAll(`[data-action="selecionar-restantes-${tabela}"]`).forEach((btn) => {
        const restantes = idsRestantesDaLista(tabela, btn.dataset.ids.split(',').map(Number));
        btn.textContent = rotuloSelecaoEmLote('restantes', restantes, c.selecao);
    });
}

export function atualizarBarraSelecao(tabela) {
    const c = cfg(tabela);
    atualizarBotoesSelecaoEmLote(tabela);
    const barra = document.getElementById(`barra-acoes-${tabela}`);
    const contador = document.getElementById(`contador-selecao-${tabela}`);
    if (!barra) return;
    if (c.selecao.size > 0) {
        barra.classList.remove('hidden');
        if (contador)
            contador.innerText = `${c.selecao.size} ${rotuloSelecao(tabela, c.selecao.size)}`;
    } else {
        barra.classList.add('hidden');
    }
}

function adicionarValorEmCampo(item, campo, valorNovo) {
    const atuais = item[campo]
        ? item[campo]
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
        : [];
    if (!atuais.includes(valorNovo)) atuais.push(valorNovo);
    item[campo] = atuais.join(', ');
}

function removerValorDeCampo(item, campo, valor) {
    if (!item[campo]) return;
    const atuais = item[campo]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    item[campo] = atuais.filter((v) => v !== valor).join(', ');
}

// Pra Pessoas (array de objeto {pessoaId, papeis} desde a virada pro
// cadastro central — as duas funções genéricas acima continuam
// servindo Sinalizações e Gênero, que não mudaram de formato).
// Adicionar via edição em massa sempre entra com papeis: [] (nenhum
// marcado) — o bulk-edit só pede o nome, não os papéis; quem quiser
// categorizar edita no modal do item, onde o chip já tem os checkboxes.
function adicionarPessoaEmCampo(item, pessoaId) {
    const atuais = Array.isArray(item.pessoas) ? item.pessoas : [];
    if (!atuais.some((p) => p.pessoaId === pessoaId)) atuais.push({ pessoaId, papeis: [] });
    item.pessoas = atuais;
}

function removerPessoaEmCampo(item, pessoaId) {
    if (!Array.isArray(item.pessoas)) return;
    item.pessoas = item.pessoas.filter((p) => p.pessoaId !== pessoaId);
}

export function aplicarPessoaEmMassa(tabela) {
    const c = cfg(tabela);
    const input = document.getElementById(`bulk-pessoa-input${c.sufixoDom}`);
    const nome = (input?.value || '').trim();
    if (!nome || c.selecao.size === 0) return;

    const n = c.selecao.size;
    abrirModalConfirmacao({
        titulo: `Dedicar a "${nome}"`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai adicionar "${nome}" aos dedicados de ${n} ${rotuloSelecao(tabela, n)}.`,
        textoConfirmar: 'Aplicar',
        corConfirmar: '#e11d48',
        // Ação puramente aditiva (nada é removido) — foca Confirmar pra
        // Enter no campo de texto → Enter no modal encadear sem precisar
        // de Tab/shift-Tab ou mouse (ver nota em abrirModalConfirmacao).
        focarConfirmar: true,
        onConfirmar: () => {
            const pessoa = obterOuCriarPessoaPorNome(nome);
            db[tabela].forEach((item) => {
                if (c.selecao.has(item.id)) adicionarPessoaEmCampo(item, pessoa.id);
            });
            if (input) input.value = '';
            c.selecao.clear();
            save(); // dispara re-render via evento db:saved
        },
    });
}

export function removerPessoaEmMassa(tabela) {
    const c = cfg(tabela);
    const input = document.getElementById(`bulk-pessoa-input${c.sufixoDom}`);
    const nome = (input?.value || '').trim();
    if (!nome || c.selecao.size === 0) return;

    const pessoa = db.pessoas.find((p) => p.nome === nome);
    if (!pessoa) {
        // Nome não bate com nenhuma pessoa cadastrada — nada a remover
        // (diferente de "adicionar", aqui não faz sentido criar só pra
        // desvincular em seguida).
        if (input) input.value = '';
        return;
    }

    const n = c.selecao.size;
    abrirModalConfirmacao({
        titulo: `Remover "${nome}"`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai remover "${nome}" dos dedicados de ${n} ${rotuloSelecao(tabela, n)}.`,
        textoConfirmar: 'Remover',
        corConfirmar: '#dc2626',
        onConfirmar: () => {
            db[tabela].forEach((item) => {
                if (c.selecao.has(item.id)) removerPessoaEmCampo(item, pessoa.id);
            });
            if (input) input.value = '';
            c.selecao.clear();
            save();
        },
    });
}

// Mapa campo→slug de DOM, pra achar o datalist certo
// (sugestoes-sinais-{slug}-bulk[-prosa]) quando a pessoa troca a
// categoria no seletor da edição em massa — ver SINALIZACOES_CATEGORIAS
// em utils.js e SINAL_CATEGORIAS em editor.js (mesmo slug nos dois).
const SLUG_POR_CAMPO_SINAL = Object.fromEntries(
    Object.entries(SINALIZACOES_CATEGORIAS).map(([slug, campo]) => [campo, slug]),
);

export function atualizarListaSinalBulk(selectEl, inputId, sufixo = '') {
    const input = document.getElementById(inputId);
    if (!input || !selectEl) return;
    const slug = SLUG_POR_CAMPO_SINAL[selectEl.value] || 'estilo';
    input.setAttribute('list', `sugestoes-sinais-${slug}-bulk${sufixo}`);
}

export function aplicarSinalEmMassa(tabela) {
    const c = cfg(tabela);
    const input = document.getElementById(`bulk-sinal-input${c.sufixoDom}`);
    const campo =
        document.getElementById(`bulk-sinal-categoria${c.sufixoDom}`)?.value ||
        'sinalizacoesEstilo';
    const tag = (input?.value || '').trim();
    if (!tag || c.selecao.size === 0) return;

    const n = c.selecao.size;
    abrirModalConfirmacao({
        titulo: `Marcar "${tag}"`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai adicionar a etiqueta "${tag}" a ${n} ${rotuloSelecao(tabela, n)}.`,
        textoConfirmar: 'Aplicar',
        corConfirmar: '#2563eb',
        // Ação aditiva — ver nota em aplicarPessoaEmMassa/abrirModalConfirmacao.
        focarConfirmar: true,
        onConfirmar: () => {
            db[tabela].forEach((item) => {
                if (c.selecao.has(item.id)) adicionarValorEmCampo(item, campo, tag);
            });
            if (input) input.value = '';
            c.selecao.clear();
            save();
        },
    });
}

export function removerSinalEmMassa(tabela) {
    const c = cfg(tabela);
    const input = document.getElementById(`bulk-sinal-input${c.sufixoDom}`);
    const campo =
        document.getElementById(`bulk-sinal-categoria${c.sufixoDom}`)?.value ||
        'sinalizacoesEstilo';
    const tag = (input?.value || '').trim();
    if (!tag || c.selecao.size === 0) return;

    const n = c.selecao.size;
    abrirModalConfirmacao({
        titulo: `Remover "${tag}"`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai remover a etiqueta "${tag}" de ${n} ${rotuloSelecao(tabela, n)}.`,
        textoConfirmar: 'Remover',
        corConfirmar: '#dc2626',
        onConfirmar: () => {
            db[tabela].forEach((item) => {
                if (c.selecao.has(item.id)) removerValorDeCampo(item, campo, tag);
            });
            if (input) input.value = '';
            c.selecao.clear();
            save();
        },
    });
}

// ─── Temas em massa ───────────────────────────────────
// Botão "Temas ▾" da barra: painel com um campo que aceita VÁRIOS temas
// separados por vírgula, aplicados (ou removidos) numa confirmação só. A
// escrita é por id, pelo cadastro (ver adicionarTemasAosTextos em
// temas.js), então um tema novo é criado no cadastro e os papéis que o
// texto já tinha ficam como estão. Tema NÃO é mais uma categoria das
// Etiquetas aqui (ver o seletor de categoria da barra).
const idsTemas = (c) => ({
    input: `bulk-tema-input${c.sufixoDom}`,
    sugestoes: `sugestoes-temas-bulk${c.sufixoDom}`,
});

function nomesTemasCadastrados() {
    return (db.temas || []).map((t) => t.nome).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

// Refaz as sugestões do campo a cada tecla (cada opção leva o que já foi
// digitado antes da última vírgula); ver sugestoesDeTemasEncadeadas.
export function atualizarSugestoesTemasMassa(tabela) {
    const ids = idsTemas(cfg(tabela));
    const input = document.getElementById(ids.input);
    const datalist = document.getElementById(ids.sugestoes);
    if (!input || !datalist) return;
    datalist.innerHTML = sugestoesDeTemasEncadeadas(input.value, nomesTemasCadastrados())
        .map((v) => `<option value="${escapeHtml(v)}"></option>`)
        .join('');
}

// Chamado ao abrir o painel: o cadastro pode ter mudado desde a última vez.
export function prepararPainelTemasMassa(tabela) {
    atualizarSugestoesTemasMassa(tabela);
}

function listaTemasParaMensagem(nomes) {
    const entre = nomes.map((n) => `"${n}"`);
    if (entre.length <= 1) return entre.join('');
    return `${entre.slice(0, -1).join(', ')} e ${entre[entre.length - 1]}`;
}

function lerTemasDigitados(tabela) {
    const ids = idsTemas(cfg(tabela));
    const input = document.getElementById(ids.input);
    return { input, nomes: nomesDeTemasDigitados(input?.value) };
}

export function aplicarTemaEmMassa(tabela) {
    const c = cfg(tabela);
    const { input, nomes } = lerTemasDigitados(tabela);
    if (!nomes.length)
        return mostrarAviso('Digite ao menos um tema (vários, separados por vírgula).');
    if (c.selecao.size === 0) return;

    const n = c.selecao.size;
    const novos = temasInexistentes(db, nomes);
    const aviso = novos.length
        ? ` ${novos.length === 1 ? 'O tema' : 'Os temas'} ${listaTemasParaMensagem(novos)} ainda não ${novos.length === 1 ? 'existe' : 'existem'} no cadastro e ser${novos.length === 1 ? 'á criado' : 'ão criados'}.`
        : '';
    abrirModalConfirmacao({
        titulo:
            nomes.length === 1
                ? `Adicionar o tema "${nomes[0]}"`
                : `Adicionar ${nomes.length} temas`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai adicionar ${listaTemasParaMensagem(nomes)} a ${n} ${rotuloSelecao(tabela, n)}. Quem já tem o tema não muda.${aviso}`,
        textoConfirmar: 'Aplicar',
        corConfirmar: '#e11d48',
        // Ação puramente aditiva: foca Confirmar pro Enter encadear.
        focarConfirmar: true,
        onConfirmar: () => {
            const itens = db[tabela].filter((item) => c.selecao.has(item.id));
            const r = adicionarTemasAosTextos(db, itens, nomes);
            if (input) input.value = '';
            c.selecao.clear();
            save();
            mostrarAviso(
                r.vinculos
                    ? `${r.vinculos} vínculo${r.vinculos !== 1 ? 's' : ''} de tema em ${r.textos} ${r.textos !== 1 ? 'textos' : 'texto'}.`
                    : 'Todos os selecionados já tinham esses temas.',
                r.vinculos ? 'sucesso' : 'info',
            );
        },
    });
}

export function removerTemaEmMassa(tabela) {
    const c = cfg(tabela);
    const { input, nomes } = lerTemasDigitados(tabela);
    if (!nomes.length)
        return mostrarAviso('Digite ao menos um tema (vários, separados por vírgula).');
    if (c.selecao.size === 0) return;

    const conhecidos = nomes.filter((nome) => !temasInexistentes(db, [nome]).length);
    if (!conhecidos.length) {
        // Nome sem registro no cadastro: nada a remover (e remover nunca cria).
        if (input) input.value = '';
        return mostrarAviso(
            `${nomes.length === 1 ? 'Esse tema não existe' : 'Esses temas não existem'} no cadastro.`,
            'info',
        );
    }

    const n = c.selecao.size;
    abrirModalConfirmacao({
        titulo:
            conhecidos.length === 1
                ? `Remover o tema "${conhecidos[0]}"`
                : `Remover ${conhecidos.length} temas`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai remover ${listaTemasParaMensagem(conhecidos)} de ${n} ${rotuloSelecao(tabela, n)}. ${conhecidos.length === 1 ? 'O tema continua' : 'Os temas continuam'} no cadastro (aba Temas).`,
        textoConfirmar: 'Remover',
        corConfirmar: '#dc2626',
        onConfirmar: () => {
            const itens = db[tabela].filter((item) => c.selecao.has(item.id));
            const r = removerTemasDosTextos(db, itens, conhecidos);
            if (input) input.value = '';
            c.selecao.clear();
            save();
            mostrarAviso(
                r.vinculos
                    ? `${r.vinculos} vínculo${r.vinculos !== 1 ? 's' : ''} de tema removido${r.vinculos !== 1 ? 's' : ''} de ${r.textos} ${r.textos !== 1 ? 'textos' : 'texto'}.`
                    : 'Nenhum dos selecionados tinha esses temas.',
                r.vinculos ? 'sucesso' : 'info',
            );
        },
    });
}

// Exclusão em massa dos itens selecionados. A remoção de fato (e o
// "Desfazer" com um único toast pro lote inteiro) fica em
// deleteItemsEmMassa (db.js) — aqui só confirma com a pessoa e limpa a
// seleção depois. Não precisa re-renderizar manualmente: deleteItemsEmMassa
// chama save(), que dispara 'db:saved' -> renderLists() -> render*(),
// que já esconde a barra de seleção sozinho (ver atualizarBarraSelecao()).
export function excluirSelecao(tabela) {
    const c = cfg(tabela);
    if (c.selecao.size === 0) return;
    const n = c.selecao.size;
    abrirModalConfirmacao({
        titulo: `Excluir ${n} ${c.singular}${n !== 1 ? 's' : ''}`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai excluir ${n} ${rotuloSelecao(tabela, n)}. Vai aparecer um "Desfazer" logo em seguida, caso mude de ideia.`,
        textoConfirmar: 'Excluir',
        corConfirmar: '#dc2626',
        onConfirmar: () => {
            deleteItemsEmMassa(tabela, [...c.selecao]);
            c.selecao.clear();
        },
    });
}

// Exporta só os itens marcados na tabela — diferente da aba Exportação,
// que filtra por atributos (pessoa/tema/data/status), aqui é exatamente
// a seleção feita na listagem. Não limpa a seleção depois: exportar não
// é destrutivo, então a pessoa pode baixar em JSON e depois em MD sem
// re-marcar tudo de novo.
export function exportarSelecaoAtualJson(tabela) {
    const c = cfg(tabela);
    exportarSelecaoJson(c.singular, [...c.selecao]);
}
export function exportarSelecaoAtualCsv(tabela) {
    const c = cfg(tabela);
    exportarSelecaoCsv(c.singular, [...c.selecao]);
}
export function exportarSelecaoAtualMarkdown(tabela) {
    const c = cfg(tabela);
    exportarSelecaoMarkdown(c.singular, [...c.selecao]);
}
export function exportarSelecaoAtualPdf(tabela) {
    const c = cfg(tabela);
    exportarSelecaoPdf(c.singular, [...c.selecao]);
}
export function exportarSelecaoAtualDocx(tabela) {
    const c = cfg(tabela);
    exportarSelecaoDocx(c.singular, [...c.selecao]);
}

// ─── Datas em massa: Escrita / Publicação ─────────────
// Diferente das tags acima, aqui o valor não é uma string "a, b, c" e
// sim um objeto parcial { dia?, mes?, ano? }. Só os subcampos
// preenchidos no formulário de massa são aplicados — os demais, em
// cada item, ficam como estavam (não apaga dia/mês já cadastrados só
// porque a pessoa quis fixar o ano de um lote, por exemplo).
function lerDataParcialBulk(prefixo) {
    const campos = ['dia', 'mes', 'ano'];
    const obj = {};
    campos.forEach((c) => {
        const el = document.getElementById(`${prefixo}-${c}`);
        const v = el?.value;
        if (v !== '' && v != null) obj[c] = parseInt(v);
    });
    return obj;
}

function rotuloTipoData(tipo) {
    return tipo === 'publicacao' ? 'Data de Publicação' : 'Data de Escrita';
}

export function aplicarDataEmMassa(tabela) {
    const c = cfg(tabela);
    if (c.selecao.size === 0) return;
    const tipo = document.getElementById(`bulk-data-tipo${c.sufixoDom}`)?.value || 'escrita';
    const parcial = lerDataParcialBulk(`bulk-data${c.sufixoDom}`);
    if (!Object.keys(parcial).length) return;

    const campo = tipo === 'publicacao' ? 'dataPublicacao' : 'dataEscrita';
    const rotuloCampo = rotuloTipoData(tipo);
    const exataChecked = !!document.getElementById(`bulk-data-exata${c.sufixoDom}`)?.checked;

    const partes = ['dia', 'mes', 'ano']
        .filter((cp) => parcial[cp] != null)
        .map((cp) => `${cp === 'mes' ? 'mês' : cp} ${parcial[cp]}`);

    const n = c.selecao.size;
    abrirModalConfirmacao({
        titulo: `Definir ${rotuloCampo.toLowerCase()}`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai definir ${partes.join(', ')} na ${rotuloCampo} de ${n} ${rotuloSelecao(tabela, n)}, mantendo os demais campos da data (se já preenchidos em cada um).`,
        textoConfirmar: 'Aplicar',
        corConfirmar: '#2563eb',
        // Ação aditiva — ver nota em aplicarPessoaEmMassa/abrirModalConfirmacao.
        focarConfirmar: true,
        onConfirmar: () => {
            db[tabela].forEach((item) => {
                if (!c.selecao.has(item.id)) return;
                const atual = { ...(item[campo] || {}), ...parcial };
                if (campo === 'dataEscrita') atual.exata = exataChecked;
                item[campo] = atual;
                // item.ano espelha dataEscrita.ano por compatibilidade (ver forms.js)
                if (campo === 'dataEscrita') item.ano = atual.ano || '';
            });
            c.selecao.clear();
            save();
        },
    });
}

export function limparDataEmMassa(tabela) {
    const c = cfg(tabela);
    if (c.selecao.size === 0) return;
    const tipo = document.getElementById(`bulk-data-tipo${c.sufixoDom}`)?.value || 'escrita';
    const campo = tipo === 'publicacao' ? 'dataPublicacao' : 'dataEscrita';
    const rotuloCampo = rotuloTipoData(tipo);

    const n = c.selecao.size;
    abrirModalConfirmacao({
        titulo: `Limpar ${rotuloCampo.toLowerCase()}`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai apagar a ${rotuloCampo} de ${n} ${rotuloSelecao(tabela, n)}.`,
        textoConfirmar: 'Limpar',
        corConfirmar: '#dc2626',
        onConfirmar: () => {
            db[tabela].forEach((item) => {
                if (!c.selecao.has(item.id)) return;
                item[campo] = null;
                if (campo === 'dataEscrita') item.ano = '';
            });
            c.selecao.clear();
            save();
        },
    });
}

// ─── Preencher campo em massa ─────────────────────────
// Painel único no lugar de um botão por campo: a lista de campos que
// ele sabe preencher vive em campos-preenchiveis.js (lógica pura, sem
// DOM) e o painel é montado aqui a partir dela — um campo novo é uma
// entrada lá, sem HTML novo em Poemas nem em Prosas. O <div> vazio do
// painel fica no index.html (id painel-preencher-massa[-prosa]).
const idsPreencher = (c) => ({
    painel: `painel-preencher-massa${c.sufixoDom}`,
    campo: `bulk-campo${c.sufixoDom}`,
    valorArea: `bulk-campo-valor-area${c.sufixoDom}`,
    valor: `bulk-campo-valor${c.sufixoDom}`,
    sugestoes: `bulk-campo-sugestoes${c.sufixoDom}`,
    sobrescreverWrap: `bulk-campo-sobrescrever-wrap${c.sufixoDom}`,
    sobrescrever: `bulk-campo-sobrescrever${c.sufixoDom}`,
});

function campoPreencherSelecionado(tabela) {
    const ids = idsPreencher(cfg(tabela));
    return obterCampoPreenchivel(document.getElementById(ids.campo)?.value);
}

// Sugestões saem de Poemas+Prosas juntos (mesmo critério do datalist de
// Fonte no editor), pra o painel de Prosas também sugerir o que já foi
// usado nos poemas.
function opcoesSugestoes(campo) {
    if (campo.tipo === 'local') {
        return opcoesLocaisParaCampo(db)
            .map(
                (o) =>
                    `<option value="${escapeHtml(o.valor)}" label="${escapeHtml(o.caminho)}"></option>`,
            )
            .join('');
    }
    if (!campo.sugestoes) return '';
    return campo
        .sugestoes([...db.poemas, ...db.prosas])
        .map((v) => `<option value="${escapeHtml(v)}"></option>`)
        .join('');
}

// Refaz só a área do valor (e o "sobrescrever") pro campo escolhido.
function montarValorPreencher(tabela) {
    const c = cfg(tabela);
    const ids = idsPreencher(c);
    const campo = campoPreencherSelecionado(tabela);
    const area = document.getElementById(ids.valorArea);
    if (!area || !campo) return;

    const rotulo = `<label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Valor</label>`;
    if (campo.tipo === 'booleano') {
        area.innerHTML = `${rotulo}<select id="${ids.valor}" class="text-xs p-2">
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
        </select>`;
    } else if (campo.tipo === 'opcoes') {
        area.innerHTML = `${rotulo}<select id="${ids.valor}" class="text-xs p-2">
            ${campo.opcoes.map((o) => `<option value="${escapeHtml(o.valor)}">${escapeHtml(o.rotulo)}</option>`).join('')}
        </select>`;
    } else {
        const comSugestoes = !!campo.sugestoes || campo.tipo === 'local';
        area.innerHTML = `${rotulo}<input type="text" id="${ids.valor}"
            ${comSugestoes ? `list="${ids.sugestoes}"` : ''}
            placeholder="${escapeHtml(campo.placeholder || '')}"
            class="text-xs p-2 min-w-[220px] mb-0"
            onkeydown="aoEnterAplicar(event, () => aplicarPreenchimentoEmMassa('${tabela}'))" />
            ${comSugestoes ? `<datalist id="${ids.sugestoes}">${opcoesSugestoes(campo)}</datalist>` : ''}`;
    }
    // Booleano sempre define o valor em todos os selecionados, então
    // "sobrescrever" só faz sentido pra campo de texto.
    document
        .getElementById(ids.sobrescreverWrap)
        ?.classList.toggle('hidden', campo.tipo === 'booleano');
}

// Chamado ao abrir o painel: monta o esqueleto na primeira vez e, nas
// seguintes, só atualiza as sugestões (o que a pessoa digitou fica).
export function prepararPainelPreencherMassa(tabela) {
    const c = cfg(tabela);
    const ids = idsPreencher(c);
    const painel = document.getElementById(ids.painel);
    if (!painel) return;

    if (!document.getElementById(ids.campo)) {
        const rotulo = (t) =>
            `<label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">${t}</label>`;
        painel.innerHTML = `
            <div>
                ${rotulo('Campo')}
                <select id="${ids.campo}" class="text-xs p-2"
                    onchange="trocarCampoPreencherMassa('${tabela}')">
                    ${CAMPOS_PREENCHIVEIS.map((f) => `<option value="${escapeHtml(f.chave)}">${escapeHtml(f.rotulo)}</option>`).join('')}
                </select>
            </div>
            <div id="${ids.valorArea}"></div>
            <label id="${ids.sobrescreverWrap}" class="flex items-center gap-1.5 text-xs text-gray-600 dark:text-slate-300 pb-2">
                <input type="checkbox" id="${ids.sobrescrever}" style="width: auto; margin: 0" />
                Sobrescrever o que já está preenchido
            </label>
            <button type="button" onclick="aplicarPreenchimentoEmMassa('${tabela}')"
                class="bg-blue-600 text-white px-3 py-2 rounded text-xs font-bold whitespace-nowrap">
                Preencher
            </button>
            <button type="button" onclick="limparCampoEmMassa('${tabela}')"
                class="bg-white dark:bg-slate-900 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 px-3 py-2 rounded text-xs font-bold whitespace-nowrap">
                Limpar campo
            </button>`;
        montarValorPreencher(tabela);
        return;
    }
    const campo = campoPreencherSelecionado(tabela);
    const datalist = document.getElementById(ids.sugestoes);
    if (campo && datalist) datalist.innerHTML = opcoesSugestoes(campo);
}

export function trocarCampoPreencherMassa(tabela) {
    montarValorPreencher(tabela);
}

function lerValorPreencher(tabela, campo) {
    const ids = idsPreencher(cfg(tabela));
    const v = document.getElementById(ids.valor)?.value ?? '';
    return campo.tipo === 'booleano' ? v === 'sim' : v.trim();
}

function itensSelecionados(tabela) {
    const c = cfg(tabela);
    return db[tabela].filter((item) => c.selecao.has(item.id));
}

function plural(n, singular, pluralForma) {
    return n === 1 ? singular : pluralForma;
}

export function aplicarPreenchimentoEmMassa(tabela) {
    const c = cfg(tabela);
    if (c.selecao.size === 0) return;
    const campo = campoPreencherSelecionado(tabela);
    if (!campo) return;
    const valor = lerValorPreencher(tabela, campo);
    const ehLocal = campo.tipo === 'local';
    if ((campo.tipo === 'texto' || ehLocal) && !valor) {
        return mostrarAviso(`Digite o valor de "${campo.rotulo}" (ou use "Limpar campo").`);
    }
    // Local: o que foi digitado vira o id do cadastro. Nome que ainda não
    // existe só é criado ao confirmar (cancelar não suja o cadastro, como
    // no modal); até lá o plano usa null = "Local a criar".
    const nomeLocal = ehLocal ? limparNomeLocal(valor) : '';
    if (ehLocal && !nomeLocal) {
        return mostrarAviso(`Digite o valor de "${campo.rotulo}" (ou use "Limpar campo").`);
    }
    const idLocal = ehLocal ? localDoTextoDigitado(db, nomeLocal) : null;
    const localNovo = ehLocal && idLocal == null;
    const valorPlano = ehLocal ? idLocal : valor;

    const ids = idsPreencher(c);
    const sobrescrever = !!document.getElementById(ids.sobrescrever)?.checked;
    const itens = itensSelecionados(tabela);
    const { alterar, jaPreenchidos, jaIguais } = planejarPreenchimento(itens, campo, valorPlano, {
        sobrescrever,
    });

    if (alterar.length === 0) {
        const motivos = [];
        if (jaPreenchidos)
            motivos.push(`${jaPreenchidos} já ${plural(jaPreenchidos, 'tem', 'têm')} valor`);
        if (jaIguais) motivos.push(`${jaIguais} já ${plural(jaIguais, 'está', 'estão')} assim`);
        return mostrarAviso(
            `Nada a alterar em "${campo.rotulo}"${motivos.length ? ` (${motivos.join(', ')})` : ''}.`,
            'info',
        );
    }

    const n = alterar.length;
    const oQue =
        campo.tipo === 'booleano'
            ? `${valor ? 'marcar' : 'desmarcar'} "${campo.rotulo}"`
            : `definir "${ehLocal ? nomeLocal : valor}" em "${campo.rotulo}"`;
    const mantidos = [];
    if (jaPreenchidos) {
        mantidos.push(
            `${jaPreenchidos} ${plural(jaPreenchidos, 'já tinha valor e será mantido', 'já tinham valor e serão mantidos')}`,
        );
    }
    if (jaIguais) {
        mantidos.push(`${jaIguais} ${plural(jaIguais, 'já estava assim', 'já estavam assim')}`);
    }
    abrirModalConfirmacao({
        titulo: `Preencher ${campo.rotulo.toLowerCase()}`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai ${oQue} em ${n} ${c.singular}${n !== 1 ? 's' : ''}.${localNovo ? ` "${nomeLocal}" ainda não existe no cadastro de Locais e será criado (sem tipo e sem pai; dá para completar na aba Locais).` : ''}${mantidos.length ? ` Pulados: ${mantidos.join('; ')}.` : ''}`,
        textoConfirmar: 'Aplicar',
        corConfirmar: '#2563eb',
        // Sobrescrever é destrutivo: só foca o Confirmar quando a ação
        // é aditiva (mesmo critério de aplicarDataEmMassa).
        focarConfirmar: !sobrescrever || campo.tipo === 'booleano',
        onConfirmar: () => {
            aplicarPreenchimento(
                alterar,
                campo,
                ehLocal ? (localNovo ? garantirLocalPorNome(db, nomeLocal) : idLocal) : valor,
            );
            c.selecao.clear();
            save();
        },
    });
}

export function limparCampoEmMassa(tabela) {
    const c = cfg(tabela);
    if (c.selecao.size === 0) return;
    const campo = campoPreencherSelecionado(tabela);
    if (!campo) return;
    const { alterar, jaVazios } = planejarLimpeza(itensSelecionados(tabela), campo);

    if (alterar.length === 0) {
        return mostrarAviso(`Nada a limpar: "${campo.rotulo}" já está vazio na seleção.`, 'info');
    }

    const n = alterar.length;
    abrirModalConfirmacao({
        titulo: `Limpar ${campo.rotulo.toLowerCase()}`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai apagar "${campo.rotulo}" de ${n} ${c.singular}${n !== 1 ? 's' : ''}.${jaVazios ? ` ${jaVazios} ${plural(jaVazios, 'já estava vazio', 'já estavam vazios')}.` : ''}`,
        textoConfirmar: 'Limpar',
        corConfirmar: '#dc2626',
        onConfirmar: () => {
            aplicarLimpeza(alterar, campo);
            c.selecao.clear();
            save();
        },
    });
}

// ─── Gênero em massa (exclusivo de Prosa) ─────────────
// Sem equivalente em Poemas — não entra na unificação acima (ver nota
// no topo do arquivo).
export function aplicarGeneroEmMassaProsa() {
    const input = document.getElementById('bulk-genero-input-prosa');
    const genero = (input?.value || '').trim();
    if (!genero || selecaoProsas.size === 0) return;

    const n = selecaoProsas.size;
    abrirModalConfirmacao({
        titulo: `Marcar "${genero}"`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai adicionar o gênero "${genero}" a ${n} prosa${n !== 1 ? 's' : ''} selecionada${n !== 1 ? 's' : ''}.`,
        textoConfirmar: 'Aplicar',
        corConfirmar: '#d97706',
        // Ação aditiva — ver nota em aplicarPessoaEmMassa/abrirModalConfirmacao.
        focarConfirmar: true,
        onConfirmar: () => {
            db.prosas.forEach((pr) => {
                if (selecaoProsas.has(pr.id)) adicionarValorEmCampo(pr, 'genero', genero);
            });
            if (input) input.value = '';
            selecaoProsas.clear();
            save();
        },
    });
}

export function removerGeneroEmMassaProsa() {
    const input = document.getElementById('bulk-genero-input-prosa');
    const genero = (input?.value || '').trim();
    if (!genero || selecaoProsas.size === 0) return;

    const n = selecaoProsas.size;
    abrirModalConfirmacao({
        titulo: `Remover "${genero}"`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai remover o gênero "${genero}" de ${n} prosa${n !== 1 ? 's' : ''} selecionada${n !== 1 ? 's' : ''}.`,
        textoConfirmar: 'Remover',
        corConfirmar: '#dc2626',
        onConfirmar: () => {
            db.prosas.forEach((pr) => {
                if (selecaoProsas.has(pr.id)) removerValorDeCampo(pr, 'genero', genero);
            });
            if (input) input.value = '';
            selecaoProsas.clear();
            save();
        },
    });
}

// ─── Períodos e movimentos em massa ───────────────────
// Painel único (Movimento/Escola, Período Biográfico, Período
// Histórico) — a lógica de cada campo mora em periodos-massa.js (sem
// DOM); aqui só o painel e as confirmações. Mesmo esquema do painel de
// "Preencher campo": o <div> vazio fica no index.html
// (id painel-periodos-massa[-prosa]) e o conteúdo é montado aqui.
const idsPeriodos = (c) => ({
    painel: `painel-periodos-massa${c.sufixoDom}`,
    tipo: `bulk-periodo-tipo${c.sufixoDom}`,
    nome: `bulk-periodo-nome${c.sufixoDom}`,
    sugestoes: `bulk-periodo-sugestoes${c.sufixoDom}`,
    sobrescreverWrap: `bulk-periodo-sobrescrever-wrap${c.sufixoDom}`,
    sobrescrever: `bulk-periodo-sobrescrever${c.sufixoDom}`,
    dica: `bulk-periodo-dica${c.sufixoDom}`,
});

const DICAS_PERIODO = {
    movimento:
        'Aditivo: acrescenta o movimento sem tirar os que o texto já tem. "Remover" tira só este.',
    epoca: 'A Época pertence a um Autor: vale a do Autor de cada texto (se ainda não existir, é criada para o primeiro Autor do texto). Texto sem Autor é pulado. Datas e recorte que o texto já tinha são mantidos.',
    periodoHistorico:
        'Aditivo: acrescenta o período sem tirar os que o texto já tem. "Remover" tira só este.',
};

function tipoPeriodoSelecionado(tabela) {
    const ids = idsPeriodos(cfg(tabela));
    const v = document.getElementById(ids.tipo)?.value;
    return TIPOS_PERIODO_MASSA.some((t) => t.chave === v) ? v : TIPOS_PERIODO_MASSA[0].chave;
}

function opcoesPeriodo(tipo) {
    return nomesCadastroPeriodoMassa(tipo)
        .map((n) => `<option value="${escapeHtml(n)}"></option>`)
        .join('');
}

// Atualiza o que depende do tipo escolhido: sugestões, placeholder,
// dica e a caixa "substituir" (Movimento/Escola é sempre aditivo).
function atualizarCamposPeriodo(tabela) {
    const ids = idsPeriodos(cfg(tabela));
    const tipo = tipoPeriodoSelecionado(tabela);
    const datalist = document.getElementById(ids.sugestoes);
    if (datalist) datalist.innerHTML = opcoesPeriodo(tipo);
    const input = document.getElementById(ids.nome);
    if (input) input.placeholder = `Nome do ${rotuloTipoPeriodoMassa(tipo)}...`;
    const dica = document.getElementById(ids.dica);
    if (dica) dica.textContent = DICAS_PERIODO[tipo];
    // Corrente e Período Histórico são listas (aditivo); só Período Biográfico
    // (id único) tem "sobrescrever".
    document
        .getElementById(ids.sobrescreverWrap)
        ?.classList.toggle('hidden', tipo === 'movimento' || tipo === 'periodoHistorico');
}

export function prepararPainelPeriodosMassa(tabela) {
    const c = cfg(tabela);
    const ids = idsPeriodos(c);
    const painel = document.getElementById(ids.painel);
    if (!painel) return;

    if (!document.getElementById(ids.tipo)) {
        const rotulo = (t) =>
            `<label class="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">${t}</label>`;
        painel.innerHTML = `
            <div>
                ${rotulo('Campo')}
                <select id="${ids.tipo}" class="text-xs p-2"
                    onchange="trocarTipoPeriodoMassa('${tabela}')">
                    ${TIPOS_PERIODO_MASSA.map((t) => `<option value="${t.chave}">${escapeHtml(t.rotulo)}</option>`).join('')}
                </select>
            </div>
            <div>
                ${rotulo('Nome')}
                <input type="text" id="${ids.nome}" list="${ids.sugestoes}"
                    class="text-xs p-2 min-w-[220px] mb-0"
                    onkeydown="aoEnterAplicar(event, () => aplicarPeriodoEmMassa('${tabela}'))" />
                <datalist id="${ids.sugestoes}"></datalist>
            </div>
            <label id="${ids.sobrescreverWrap}" class="flex items-center gap-1.5 text-xs text-gray-600 dark:text-slate-300 pb-2">
                <input type="checkbox" id="${ids.sobrescrever}" style="width: auto; margin: 0" />
                Substituir o que já está definido
            </label>
            <button type="button" onclick="aplicarPeriodoEmMassa('${tabela}')"
                class="bg-blue-600 text-white px-3 py-2 rounded text-xs font-bold whitespace-nowrap">
                + Aplicar
            </button>
            <button type="button" onclick="removerPeriodoEmMassa('${tabela}')"
                class="bg-white dark:bg-slate-900 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 px-3 py-2 rounded text-xs font-bold whitespace-nowrap">
                − Remover
            </button>
            <p id="${ids.dica}" class="text-[10px] text-gray-400 dark:text-slate-500 w-full"></p>`;
    }
    // Sempre atualiza as sugestões: o cadastro pode ter mudado desde a
    // última vez que o painel foi aberto (o que foi digitado fica).
    atualizarCamposPeriodo(tabela);
}

export function trocarTipoPeriodoMassa(tabela) {
    atualizarCamposPeriodo(tabela);
}

function lerNomePeriodo(tabela) {
    const ids = idsPeriodos(cfg(tabela));
    return (document.getElementById(ids.nome)?.value || '').trim();
}

function limparNomePeriodo(tabela) {
    const ids = idsPeriodos(cfg(tabela));
    const input = document.getElementById(ids.nome);
    if (input) input.value = '';
}

export function aplicarPeriodoEmMassa(tabela) {
    const c = cfg(tabela);
    if (c.selecao.size === 0) return;
    const tipo = tipoPeriodoSelecionado(tabela);
    const rotuloTipo = rotuloTipoPeriodoMassa(tipo);
    const nome = lerNomePeriodo(tabela);
    if (!nome) return mostrarAviso(`Digite o nome do ${rotuloTipo}.`);

    const ids = idsPeriodos(c);
    const sobrescrever = tipo === 'epoca' && !!document.getElementById(ids.sobrescrever)?.checked;
    const plano = planejarAplicacaoPeriodo(tipo, itensSelecionados(tabela), nome, { sobrescrever });

    if (plano.alterar.length === 0) {
        const motivos = [];
        if (plano.jaIguais)
            motivos.push(`${plano.jaIguais} já ${plural(plano.jaIguais, 'está', 'estão')} assim`);
        if (plano.jaPreenchidos)
            motivos.push(
                `${plano.jaPreenchidos} já ${plural(plano.jaPreenchidos, 'tem', 'têm')} outro valor`,
            );
        if (plano.semAutor) motivos.push(`${plano.semAutor} sem Autor cadastrado no texto`);
        return mostrarAviso(
            `Nada a alterar em "${rotuloTipo}"${motivos.length ? ` (${motivos.join(', ')})` : ''}.`,
            'info',
        );
    }

    const n = plano.alterar.length;
    const avisos = [];
    if (tipo === 'epoca') {
        if (plano.epocasACriar) {
            avisos.push(
                `${plano.epocasACriar} ${plural(plano.epocasACriar, 'Período Biográfico novo será criado', 'Períodos Biográficos novos serão criados')} (um por Autor).`,
            );
        }
    } else if (plano.cadastroNovo) {
        avisos.push(`"${nome}" ainda não existe no cadastro e será criado.`);
    }
    const mantidos = [];
    if (plano.jaIguais)
        mantidos.push(
            `${plano.jaIguais} ${plural(plano.jaIguais, 'já estava assim', 'já estavam assim')}`,
        );
    if (plano.jaPreenchidos)
        mantidos.push(
            `${plano.jaPreenchidos} ${plural(plano.jaPreenchidos, 'já tinha outro valor e será mantido', 'já tinham outro valor e serão mantidos')}`,
        );
    if (plano.semAutor)
        mantidos.push(`${plano.semAutor} ${plural(plano.semAutor, 'sem Autor', 'sem Autor')}`);

    abrirModalConfirmacao({
        titulo: `${rotuloTipo}: "${nome}"`,
        rotulo: 'Ação em massa',
        mensagem:
            `Isso vai ${tipo === 'movimento' ? 'acrescentar' : 'definir'} "${nome}" em "${rotuloTipo}" de ${n} ${c.singular}${n !== 1 ? 's' : ''}.` +
            `${avisos.length ? ` ${avisos.join(' ')}` : ''}` +
            `${mantidos.length ? ` Pulados: ${mantidos.join('; ')}.` : ''}`,
        textoConfirmar: 'Aplicar',
        corConfirmar: '#2563eb',
        // Só foca Confirmar quando nada é substituído (mesmo critério de
        // aplicarPreenchimentoEmMassa).
        focarConfirmar: !sobrescrever,
        onConfirmar: () => {
            aplicarPlanoPeriodo(tipo, plano, nome);
            limparNomePeriodo(tabela);
            c.selecao.clear();
            save();
        },
    });
}

export function removerPeriodoEmMassa(tabela) {
    const c = cfg(tabela);
    if (c.selecao.size === 0) return;
    const tipo = tipoPeriodoSelecionado(tabela);
    const rotuloTipo = rotuloTipoPeriodoMassa(tipo);
    const nome = lerNomePeriodo(tabela);
    if (!nome) return mostrarAviso(`Digite o nome do ${rotuloTipo} a remover.`);

    const plano = planejarRemocaoPeriodo(tipo, itensSelecionados(tabela), nome);
    if (plano.alterar.length === 0) {
        return mostrarAviso(
            `Nada a remover: nenhum dos selecionados está com "${nome}" em "${rotuloTipo}".`,
            'info',
        );
    }

    const n = plano.alterar.length;
    abrirModalConfirmacao({
        titulo: `Remover "${nome}"`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai remover "${nome}" de "${rotuloTipo}" em ${n} ${c.singular}${n !== 1 ? 's' : ''}.${plano.naoTinham ? ` ${plano.naoTinham} ${plural(plano.naoTinham, 'não tinha', 'não tinham')} esse valor.` : ''} O cadastro em si não é apagado.`,
        textoConfirmar: 'Remover',
        corConfirmar: '#dc2626',
        onConfirmar: () => {
            aplicarRemocaoPeriodo(tipo, plano, nome);
            limparNomePeriodo(tabela);
            c.selecao.clear();
            save();
        },
    });
}
