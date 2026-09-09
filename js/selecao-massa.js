// ============================================================
// selecao-massa.js — Seleção múltipla e ações em massa de Poemas e
// Prosas na listagem: checkboxes (com shift-click pra intervalo),
// barra de ações, edição em massa (Pessoas/Sinalizações/Gênero/
// Datas), exclusão em massa e exportação da seleção.
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
import { abrirModalConfirmacao, SINALIZACOES_CATEGORIAS } from './utils.js';
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

export function atualizarBarraSelecao(tabela) {
    const c = cfg(tabela);
    const barra = document.getElementById(`barra-acoes-${tabela}`);
    const contador = document.getElementById(`contador-selecao-${tabela}`);
    if (!barra) return;
    if (c.selecao.size > 0) {
        barra.classList.remove('hidden');
        if (contador) contador.innerText = `${c.selecao.size} ${rotuloSelecao(tabela, c.selecao.size)}`;
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
        document.getElementById(`bulk-sinal-categoria${c.sufixoDom}`)?.value || 'sinalizacoesEstilo';
    const tag = (input?.value || '').trim();
    if (!tag || c.selecao.size === 0) return;

    const n = c.selecao.size;
    abrirModalConfirmacao({
        titulo: `Marcar "${tag}"`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai adicionar a sinalização "${tag}" a ${n} ${rotuloSelecao(tabela, n)}.`,
        textoConfirmar: 'Aplicar',
        corConfirmar: '#2563eb',
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
        document.getElementById(`bulk-sinal-categoria${c.sufixoDom}`)?.value || 'sinalizacoesEstilo';
    const tag = (input?.value || '').trim();
    if (!tag || c.selecao.size === 0) return;

    const n = c.selecao.size;
    abrirModalConfirmacao({
        titulo: `Remover "${tag}"`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai remover a sinalização "${tag}" de ${n} ${rotuloSelecao(tabela, n)}.`,
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
