// ============================================================
// selecao-massa.js — Seleção múltipla e ações em massa de Poemas e
// Prosas na listagem: checkboxes (com shift-click pra intervalo),
// barra de ações, edição em massa (Pessoas/Sinalizações/Gênero/
// Datas), exclusão em massa e exportação da seleção.
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
// atualizarBarraSelecao*() daqui dentro de renderPoemas()/renderProsas().
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

// Âncora do último checkbox marcado/desmarcado em cada aba — usada pro
// shift-click estender a seleção pro intervalo entre ele e o anterior
// (ver toggleSelecaoPoema/toggleSelecaoProsa). null = nenhum clique
// ainda nesta sessão, ou o último clique não fez parte do intervalo
// visível atual (filtro/ordenação mudou no meio do caminho).
let ultimoCheckPoema = null;
let ultimoCheckProsa = null;

// shiftKey estende a seleção pro intervalo entre este checkbox e o
// último clicado (ordem da lista filtrada/ordenada atual, não a ordem
// de estrutura fixa — o intervalo é sempre "o que está entre as duas
// linhas na tela"). Marca ou desmarca o intervalo inteiro com o mesmo
// `checked` do checkbox que disparou o shift-click, replicando o
// padrão do Gmail/Finder. Se a âncora não estiver mais na lista visível
// (filtro mudou, ou é o primeiro clique da sessão), cai pro
// comportamento normal de um clique só.
export function toggleSelecaoPoema(checked, id, shiftKey) {
    if (shiftKey && ultimoCheckPoema !== null && ultimoCheckPoema !== id) {
        const visiveis = getListaVisivelPoemas().map((p) => p.id);
        const iAncora = visiveis.indexOf(ultimoCheckPoema);
        const iAtual = visiveis.indexOf(id);
        if (iAncora !== -1 && iAtual !== -1) {
            const [ini, fim] = iAncora < iAtual ? [iAncora, iAtual] : [iAtual, iAncora];
            const intervalo = visiveis.slice(ini, fim + 1);
            if (checked) intervalo.forEach((pid) => selecaoPoemas.add(pid));
            else intervalo.forEach((pid) => selecaoPoemas.delete(pid));
            ultimoCheckPoema = id;
            renderPoemas();
            return;
        }
    }
    if (checked) selecaoPoemas.add(id);
    else selecaoPoemas.delete(id);
    ultimoCheckPoema = id;
    atualizarBarraSelecao();
}

export function toggleSelecaoTodosPoemas(checked) {
    const visiveis = getListaVisivelPoemas().map((p) => p.id);
    if (checked) visiveis.forEach((id) => selecaoPoemas.add(id));
    else visiveis.forEach((id) => selecaoPoemas.delete(id));
    renderPoemas();
}

export function limparSelecaoPoemas() {
    selecaoPoemas.clear();
    renderPoemas();
}

export function atualizarBarraSelecao() {
    const barra = document.getElementById('barra-acoes-poemas');
    const contador = document.getElementById('contador-selecao-poemas');
    if (!barra) return;
    if (selecaoPoemas.size > 0) {
        barra.classList.remove('hidden');
        if (contador) contador.innerText = `${selecaoPoemas.size} selecionado(s)`;
    } else {
        barra.classList.add('hidden');
    }
}

function adicionarValorEmCampo(poema, campo, valorNovo) {
    const atuais = poema[campo]
        ? poema[campo]
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
        : [];
    if (!atuais.includes(valorNovo)) atuais.push(valorNovo);
    poema[campo] = atuais.join(', ');
}

function removerValorDeCampo(poema, campo, valor) {
    if (!poema[campo]) return;
    const atuais = poema[campo]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    poema[campo] = atuais.filter((v) => v !== valor).join(', ');
}

// Variantes pra Pessoas (array de objeto {pessoaId, papeis} desde a
// virada pro cadastro central — as duas funções genéricas acima
// continuam servindo Sinalizações e Gênero, que não mudaram de
// formato). Adicionar via edição em massa sempre entra com papeis: []
// (nenhum marcado) — o bulk-edit só pede o nome, não os papéis; quem
// quiser categorizar edita no modal do item, onde o chip já tem os
// checkboxes.
function adicionarPessoaEmCampo(item, pessoaId) {
    const atuais = Array.isArray(item.pessoas) ? item.pessoas : [];
    if (!atuais.some((p) => p.pessoaId === pessoaId)) atuais.push({ pessoaId, papeis: [] });
    item.pessoas = atuais;
}

function removerPessoaEmCampo(item, pessoaId) {
    if (!Array.isArray(item.pessoas)) return;
    item.pessoas = item.pessoas.filter((p) => p.pessoaId !== pessoaId);
}

export function aplicarPessoaEmMassa() {
    const input = document.getElementById('bulk-pessoa-input');
    const nome = (input?.value || '').trim();
    if (!nome || selecaoPoemas.size === 0) return;

    const n = selecaoPoemas.size;
    abrirModalConfirmacao({
        titulo: `Dedicar a "${nome}"`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai adicionar "${nome}" aos dedicados de ${n} poema${n !== 1 ? 's' : ''} selecionado${n !== 1 ? 's' : ''}.`,
        textoConfirmar: 'Aplicar',
        corConfirmar: '#e11d48',
        onConfirmar: () => {
            const pessoa = obterOuCriarPessoaPorNome(nome);
            db.poemas.forEach((p) => {
                if (selecaoPoemas.has(p.id)) adicionarPessoaEmCampo(p, pessoa.id);
            });
            if (input) input.value = '';
            selecaoPoemas.clear();
            save(); // dispara re-render via evento db:saved
        },
    });
}

export function removerPessoaEmMassa() {
    const input = document.getElementById('bulk-pessoa-input');
    const nome = (input?.value || '').trim();
    if (!nome || selecaoPoemas.size === 0) return;

    const pessoa = db.pessoas.find((p) => p.nome === nome);
    if (!pessoa) {
        // Nome não bate com nenhuma pessoa cadastrada — nada a remover
        // (diferente de "adicionar", aqui não faz sentido criar só pra
        // desvincular em seguida).
        if (input) input.value = '';
        return;
    }

    const n = selecaoPoemas.size;
    abrirModalConfirmacao({
        titulo: `Remover "${nome}"`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai remover "${nome}" dos dedicados de ${n} poema${n !== 1 ? 's' : ''} selecionado${n !== 1 ? 's' : ''}.`,
        textoConfirmar: 'Remover',
        corConfirmar: '#dc2626',
        onConfirmar: () => {
            db.poemas.forEach((p) => {
                if (selecaoPoemas.has(p.id)) removerPessoaEmCampo(p, pessoa.id);
            });
            if (input) input.value = '';
            selecaoPoemas.clear();
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

export function aplicarSinalEmMassa() {
    const input = document.getElementById('bulk-sinal-input');
    const campo = document.getElementById('bulk-sinal-categoria')?.value || 'sinalizacoesEstilo';
    const tag = (input?.value || '').trim();
    if (!tag || selecaoPoemas.size === 0) return;

    const n = selecaoPoemas.size;
    abrirModalConfirmacao({
        titulo: `Marcar "${tag}"`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai adicionar a sinalização "${tag}" a ${n} poema${n !== 1 ? 's' : ''} selecionado${n !== 1 ? 's' : ''}.`,
        textoConfirmar: 'Aplicar',
        corConfirmar: '#2563eb',
        onConfirmar: () => {
            db.poemas.forEach((p) => {
                if (selecaoPoemas.has(p.id)) adicionarValorEmCampo(p, campo, tag);
            });
            if (input) input.value = '';
            selecaoPoemas.clear();
            save();
        },
    });
}

export function removerSinalEmMassa() {
    const input = document.getElementById('bulk-sinal-input');
    const campo = document.getElementById('bulk-sinal-categoria')?.value || 'sinalizacoesEstilo';
    const tag = (input?.value || '').trim();
    if (!tag || selecaoPoemas.size === 0) return;

    const n = selecaoPoemas.size;
    abrirModalConfirmacao({
        titulo: `Remover "${tag}"`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai remover a sinalização "${tag}" de ${n} poema${n !== 1 ? 's' : ''} selecionado${n !== 1 ? 's' : ''}.`,
        textoConfirmar: 'Remover',
        corConfirmar: '#dc2626',
        onConfirmar: () => {
            db.poemas.forEach((p) => {
                if (selecaoPoemas.has(p.id)) removerValorDeCampo(p, campo, tag);
            });
            if (input) input.value = '';
            selecaoPoemas.clear();
            save();
        },
    });
}

// Exclusão em massa dos poemas selecionados. A remoção de fato (e o
// "Desfazer" com um único toast pro lote inteiro) fica em
// deleteItemsEmMassa (db.js) — aqui só confirma com a pessoa e limpa a
// seleção depois. Não precisa re-renderizar manualmente: deleteItemsEmMassa
// chama save(), que dispara 'db:saved' -> renderLists() -> renderPoemas(),
// que já esconde a barra de seleção sozinho (ver atualizarBarraSelecao()).
export function excluirSelecaoPoemas() {
    if (selecaoPoemas.size === 0) return;
    const n = selecaoPoemas.size;
    abrirModalConfirmacao({
        titulo: `Excluir ${n} poema${n !== 1 ? 's' : ''}`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai excluir ${n} poema${n !== 1 ? 's' : ''} selecionado${n !== 1 ? 's' : ''}. Vai aparecer um "Desfazer" logo em seguida, caso mude de ideia.`,
        textoConfirmar: 'Excluir',
        corConfirmar: '#dc2626',
        onConfirmar: () => {
            deleteItemsEmMassa('poemas', [...selecaoPoemas]);
            selecaoPoemas.clear();
        },
    });
}

// Exporta só os poemas marcados na tabela — diferente da aba Exportação,
// que filtra por atributos (pessoa/tema/data/status), aqui é exatamente
// a seleção feita na listagem. Não limpa a seleção depois: exportar não
// é destrutivo, então a pessoa pode baixar em JSON e depois em MD sem
// re-marcar tudo de novo.
export function exportarSelecaoPoemasJson() {
    exportarSelecaoJson('poema', [...selecaoPoemas]);
}
export function exportarSelecaoPoemasMarkdown() {
    exportarSelecaoMarkdown('poema', [...selecaoPoemas]);
}
export function exportarSelecaoPoemasPdf() {
    exportarSelecaoPdf('poema', [...selecaoPoemas]);
}
export function exportarSelecaoPoemasDocx() {
    exportarSelecaoDocx('poema', [...selecaoPoemas]);
}

// ─── Datas em massa (Poemas): Escrita / Publicação ─────────────
// Mesma mecânica da versão de Prosas logo abaixo — ver os comentários lá.
export function aplicarDataEmMassa() {
    if (selecaoPoemas.size === 0) return;
    const tipo = document.getElementById('bulk-data-tipo')?.value || 'escrita';
    const parcial = lerDataParcialBulk('bulk-data');
    if (!Object.keys(parcial).length) return;

    const campo = tipo === 'publicacao' ? 'dataPublicacao' : 'dataEscrita';
    const rotuloCampo = rotuloTipoData(tipo);
    const exataChecked = !!document.getElementById('bulk-data-exata')?.checked;

    const partes = ['dia', 'mes', 'ano']
        .filter((c) => parcial[c] != null)
        .map((c) => `${c === 'mes' ? 'mês' : c} ${parcial[c]}`);

    const n = selecaoPoemas.size;
    abrirModalConfirmacao({
        titulo: `Definir ${rotuloCampo.toLowerCase()}`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai definir ${partes.join(', ')} na ${rotuloCampo} de ${n} poema${n !== 1 ? 's' : ''} selecionado${n !== 1 ? 's' : ''}, mantendo os demais campos da data (se já preenchidos em cada um).`,
        textoConfirmar: 'Aplicar',
        corConfirmar: '#2563eb',
        onConfirmar: () => {
            db.poemas.forEach((p) => {
                if (!selecaoPoemas.has(p.id)) return;
                const atual = { ...(p[campo] || {}), ...parcial };
                if (campo === 'dataEscrita') atual.exata = exataChecked;
                p[campo] = atual;
                // p.ano espelha dataEscrita.ano por compatibilidade (ver forms.js)
                if (campo === 'dataEscrita') p.ano = atual.ano || '';
            });
            selecaoPoemas.clear();
            save();
        },
    });
}

export function limparDataEmMassa() {
    if (selecaoPoemas.size === 0) return;
    const tipo = document.getElementById('bulk-data-tipo')?.value || 'escrita';
    const campo = tipo === 'publicacao' ? 'dataPublicacao' : 'dataEscrita';
    const rotuloCampo = rotuloTipoData(tipo);

    const n = selecaoPoemas.size;
    abrirModalConfirmacao({
        titulo: `Limpar ${rotuloCampo.toLowerCase()}`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai apagar a ${rotuloCampo} de ${n} poema${n !== 1 ? 's' : ''} selecionado${n !== 1 ? 's' : ''}.`,
        textoConfirmar: 'Limpar',
        corConfirmar: '#dc2626',
        onConfirmar: () => {
            db.poemas.forEach((p) => {
                if (!selecaoPoemas.has(p.id)) return;
                p[campo] = null;
                if (campo === 'dataEscrita') p.ano = '';
            });
            selecaoPoemas.clear();
            save();
        },
    });
}

// ─── Seleção múltipla de Prosas (ações em massa) ──────────────
// Mesma lógica da seleção de Poemas acima, adaptada pra Prosas.

// Ver toggleSelecaoPoema — mesma lógica de shift-click, espelhada pra Prosas.
export function toggleSelecaoProsa(checked, id, shiftKey) {
    if (shiftKey && ultimoCheckProsa !== null && ultimoCheckProsa !== id) {
        const visiveis = getListaVisivelProsas().map((pr) => pr.id);
        const iAncora = visiveis.indexOf(ultimoCheckProsa);
        const iAtual = visiveis.indexOf(id);
        if (iAncora !== -1 && iAtual !== -1) {
            const [ini, fim] = iAncora < iAtual ? [iAncora, iAtual] : [iAtual, iAncora];
            const intervalo = visiveis.slice(ini, fim + 1);
            if (checked) intervalo.forEach((pid) => selecaoProsas.add(pid));
            else intervalo.forEach((pid) => selecaoProsas.delete(pid));
            ultimoCheckProsa = id;
            renderProsas();
            return;
        }
    }
    if (checked) selecaoProsas.add(id);
    else selecaoProsas.delete(id);
    ultimoCheckProsa = id;
    atualizarBarraSelecaoProsas();
}

export function toggleSelecaoTodosProsas(checked) {
    const visiveis = getListaVisivelProsas().map((pr) => pr.id);
    if (checked) visiveis.forEach((id) => selecaoProsas.add(id));
    else visiveis.forEach((id) => selecaoProsas.delete(id));
    renderProsas();
}

export function limparSelecaoProsas() {
    selecaoProsas.clear();
    renderProsas();
}

export function atualizarBarraSelecaoProsas() {
    const barra = document.getElementById('barra-acoes-prosas');
    const contador = document.getElementById('contador-selecao-prosas');
    if (!barra) return;
    if (selecaoProsas.size > 0) {
        barra.classList.remove('hidden');
        if (contador) contador.innerText = `${selecaoProsas.size} selecionada(s)`;
    } else {
        barra.classList.add('hidden');
    }
}

export function aplicarPessoaEmMassaProsa() {
    const input = document.getElementById('bulk-pessoa-input-prosa');
    const nome = (input?.value || '').trim();
    if (!nome || selecaoProsas.size === 0) return;

    const n = selecaoProsas.size;
    abrirModalConfirmacao({
        titulo: `Dedicar a "${nome}"`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai adicionar "${nome}" aos dedicados de ${n} prosa${n !== 1 ? 's' : ''} selecionada${n !== 1 ? 's' : ''}.`,
        textoConfirmar: 'Aplicar',
        corConfirmar: '#e11d48',
        onConfirmar: () => {
            const pessoa = obterOuCriarPessoaPorNome(nome);
            db.prosas.forEach((pr) => {
                if (selecaoProsas.has(pr.id)) adicionarPessoaEmCampo(pr, pessoa.id);
            });
            if (input) input.value = '';
            selecaoProsas.clear();
            save(); // dispara re-render via evento db:saved
        },
    });
}

export function removerPessoaEmMassaProsa() {
    const input = document.getElementById('bulk-pessoa-input-prosa');
    const nome = (input?.value || '').trim();
    if (!nome || selecaoProsas.size === 0) return;

    const pessoa = db.pessoas.find((p) => p.nome === nome);
    if (!pessoa) {
        if (input) input.value = '';
        return;
    }

    const n = selecaoProsas.size;
    abrirModalConfirmacao({
        titulo: `Remover "${nome}"`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai remover "${nome}" dos dedicados de ${n} prosa${n !== 1 ? 's' : ''} selecionada${n !== 1 ? 's' : ''}.`,
        textoConfirmar: 'Remover',
        corConfirmar: '#dc2626',
        onConfirmar: () => {
            db.prosas.forEach((pr) => {
                if (selecaoProsas.has(pr.id)) removerPessoaEmCampo(pr, pessoa.id);
            });
            if (input) input.value = '';
            selecaoProsas.clear();
            save();
        },
    });
}

export function aplicarSinalEmMassaProsa() {
    const input = document.getElementById('bulk-sinal-input-prosa');
    const campo =
        document.getElementById('bulk-sinal-categoria-prosa')?.value || 'sinalizacoesEstilo';
    const tag = (input?.value || '').trim();
    if (!tag || selecaoProsas.size === 0) return;

    const n = selecaoProsas.size;
    abrirModalConfirmacao({
        titulo: `Marcar "${tag}"`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai adicionar a sinalização "${tag}" a ${n} prosa${n !== 1 ? 's' : ''} selecionada${n !== 1 ? 's' : ''}.`,
        textoConfirmar: 'Aplicar',
        corConfirmar: '#2563eb',
        onConfirmar: () => {
            db.prosas.forEach((pr) => {
                if (selecaoProsas.has(pr.id)) adicionarValorEmCampo(pr, campo, tag);
            });
            if (input) input.value = '';
            selecaoProsas.clear();
            save();
        },
    });
}

export function removerSinalEmMassaProsa() {
    const input = document.getElementById('bulk-sinal-input-prosa');
    const campo =
        document.getElementById('bulk-sinal-categoria-prosa')?.value || 'sinalizacoesEstilo';
    const tag = (input?.value || '').trim();
    if (!tag || selecaoProsas.size === 0) return;

    const n = selecaoProsas.size;
    abrirModalConfirmacao({
        titulo: `Remover "${tag}"`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai remover a sinalização "${tag}" de ${n} prosa${n !== 1 ? 's' : ''} selecionada${n !== 1 ? 's' : ''}.`,
        textoConfirmar: 'Remover',
        corConfirmar: '#dc2626',
        onConfirmar: () => {
            db.prosas.forEach((pr) => {
                if (selecaoProsas.has(pr.id)) removerValorDeCampo(pr, campo, tag);
            });
            if (input) input.value = '';
            selecaoProsas.clear();
            save();
        },
    });
}

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

// ─── Datas em massa (Prosas): Escrita / Publicação ─────────────
// Diferente das tags acima, aqui o valor não é uma string "a, b, c" e
// sim um objeto parcial { dia?, mes?, ano? }. Só os subcampos
// preenchidos no formulário de massa são aplicados — os demais, em
// cada prosa, ficam como estavam (não apaga dia/mês já cadastrados
// só porque a pessoa quis fixar o ano de um lote, por exemplo).
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

export function aplicarDataEmMassaProsa() {
    if (selecaoProsas.size === 0) return;
    const tipo = document.getElementById('bulk-data-tipo-prosa')?.value || 'escrita';
    const parcial = lerDataParcialBulk('bulk-data-prosa');
    if (!Object.keys(parcial).length) return;

    const campo = tipo === 'publicacao' ? 'dataPublicacao' : 'dataEscrita';
    const rotuloCampo = rotuloTipoData(tipo);
    const exataChecked = !!document.getElementById('bulk-data-exata-prosa')?.checked;

    const partes = ['dia', 'mes', 'ano']
        .filter((c) => parcial[c] != null)
        .map((c) => `${c === 'mes' ? 'mês' : c} ${parcial[c]}`);

    const n = selecaoProsas.size;
    abrirModalConfirmacao({
        titulo: `Definir ${rotuloCampo.toLowerCase()}`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai definir ${partes.join(', ')} na ${rotuloCampo} de ${n} prosa${n !== 1 ? 's' : ''} selecionada${n !== 1 ? 's' : ''}, mantendo os demais campos da data (se já preenchidos em cada uma).`,
        textoConfirmar: 'Aplicar',
        corConfirmar: '#2563eb',
        onConfirmar: () => {
            db.prosas.forEach((pr) => {
                if (!selecaoProsas.has(pr.id)) return;
                const atual = { ...(pr[campo] || {}), ...parcial };
                if (campo === 'dataEscrita') atual.exata = exataChecked;
                pr[campo] = atual;
                // pr.ano espelha dataEscrita.ano por compatibilidade (ver forms.js)
                if (campo === 'dataEscrita') pr.ano = atual.ano || '';
            });
            selecaoProsas.clear();
            save();
        },
    });
}

export function limparDataEmMassaProsa() {
    if (selecaoProsas.size === 0) return;
    const tipo = document.getElementById('bulk-data-tipo-prosa')?.value || 'escrita';
    const campo = tipo === 'publicacao' ? 'dataPublicacao' : 'dataEscrita';
    const rotuloCampo = rotuloTipoData(tipo);

    const n = selecaoProsas.size;
    abrirModalConfirmacao({
        titulo: `Limpar ${rotuloCampo.toLowerCase()}`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai apagar a ${rotuloCampo} de ${n} prosa${n !== 1 ? 's' : ''} selecionada${n !== 1 ? 's' : ''}.`,
        textoConfirmar: 'Limpar',
        corConfirmar: '#dc2626',
        onConfirmar: () => {
            db.prosas.forEach((pr) => {
                if (!selecaoProsas.has(pr.id)) return;
                pr[campo] = null;
                if (campo === 'dataEscrita') pr.ano = '';
            });
            selecaoProsas.clear();
            save();
        },
    });
}

// Equivalente de excluirSelecaoPoemas() pra prosas — ver os comentários lá.
export function excluirSelecaoProsas() {
    if (selecaoProsas.size === 0) return;
    const n = selecaoProsas.size;
    abrirModalConfirmacao({
        titulo: `Excluir ${n} prosa${n !== 1 ? 's' : ''}`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai excluir ${n} prosa${n !== 1 ? 's' : ''} selecionada${n !== 1 ? 's' : ''}. Vai aparecer um "Desfazer" logo em seguida, caso mude de ideia.`,
        textoConfirmar: 'Excluir',
        corConfirmar: '#dc2626',
        onConfirmar: () => {
            deleteItemsEmMassa('prosas', [...selecaoProsas]);
            selecaoProsas.clear();
        },
    });
}

export function exportarSelecaoProsasJson() {
    exportarSelecaoJson('prosa', [...selecaoProsas]);
}
export function exportarSelecaoProsasMarkdown() {
    exportarSelecaoMarkdown('prosa', [...selecaoProsas]);
}
export function exportarSelecaoProsasPdf() {
    exportarSelecaoPdf('prosa', [...selecaoProsas]);
}
export function exportarSelecaoProsasDocx() {
    exportarSelecaoDocx('prosa', [...selecaoProsas]);
}

