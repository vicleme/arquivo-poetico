// ============================================================
// exportar-frequentes.js — aba "Exportações Frequentes" (dentro do
// grupo de nav "Exportação", ao lado da Exportação Geral existente).
//
// Duas partes:
//
// 1. "Fixos" — os 7 downloads que Victor faz sempre: Backup (JSON),
//    Aninhado completo (JSON), Flat completo (JSON/MD), Filtrado
//    completo (JSON/MD — acervo com as versões alternativas de
//    filtrar.html aplicadas por cima) e o Banco de versões filtradas
//    (JSON — o cadastro bruto de filtrar.html, não o acervo já
//    aplicado; mesmo formato do exportarBanco() de lá). Cada um com
//    nome de arquivo configurável e lembrado entre sessões (LS_KEY_NOMES).
//    O fixo Backup também tem o checkbox "capas" (comCapas em FIXOS),
//    igual ao "Baixar JSON" da Exportação Geral — mesma chave de
//    localStorage (LS_KEY_CAPAS_BACKUP), pra não ter duas preferências
//    divergentes pro mesmo tipo de arquivo.
//
// 2. "Templates" — filtros salvos (Pessoa/Sinalização-por-categoria/
//    Gênero, combináveis com E lógico), cada um com formatos (JSON/MD),
//    opção de usar a versão filtrada e nome de arquivo próprio.
//    Persistidos em LS_KEY_TEMPLATES, CRUD completo.
//
// Ambos entram na mesma engrenagem de baixar: individual (um clique) ou
// em lote — .zip único (JSZip, via CDN, mesmo esquema do jsPDF/docx em
// index.html) ou downloads separados em sequência, à escolha da pessoa
// (ver #modo-lote-exportacoes-frequentes).
//
// "Filtrado" não depende de filtrar.html em tempo de execução — só
// compartilha a MESMA chave de localStorage (arquivoPoetico_versoesFiltradas_v1,
// ver LS_KEY_VERSOES ali) pro banco de versões alternativas, igual o app
// principal e filtrar.html já compartilham arquivoPoetico_v3 pro acervo
// (ver comentário equivalente em filtrar.html). A lógica de substituição
// (chaveVersao/aplicarVersaoFiltrada/clonarComSubstituicoes) é uma
// releitura fiel de chave()/substituirSeHouverVersao()/
// clonarComSubstituicoes() de lá, adaptada pra ler o banco direto do
// localStorage (sem precisar da sessão daquela ferramenta) e pra
// trabalhar em cima do `db` já carregado na memória deste app (em vez
// de um arquivo recém-lido do disco).
// ============================================================

import { db } from './db.js';
import { buildNesting } from './nesting.js';
import { exportarColetaneaResolvida } from './coletaneas.js';
import { montarRegistro, listaDeCampo } from './exportar.js';
import { gerarMarkdownExportacao } from './exportar-md.js';
import { exportarTodasCapasBase64 } from './capas.js';
import {
    gerarId,
    escapeHtml,
    mostrarAviso,
    nomesPessoas,
    SINALIZACOES_CATEGORIAS,
} from './utils.js';

const LS_KEY_VERSOES = 'arquivoPoetico_versoesFiltradas_v1';
const LS_KEY_TEMPLATES = 'arquivoPoetico_exportTemplates_v1';
const LS_KEY_NOMES = 'arquivoPoetico_nomesFrequentes_v1';
// Mesma chave do checkbox "incluir capas" da Exportação Geral (index.html,
// botão "Baixar JSON") — o backup fixo daqui é o mesmo JSON.stringify(db),
// então faz sentido compartilhar a preferência em vez de ter uma 2ª cópia
// dela só pra esta aba.
const LS_KEY_CAPAS_BACKUP = 'arquivoPoetico_incluirCapasBackup';

// ─── Nomes de arquivo configuráveis (fixos) ────────────────────────
// Guarda só o "padrão" digitado pela pessoa pra cada um dos 7 fixos —
// sem timestamp por padrão (diferente das exportações antigas de
// exportar.js, que sempre levavam Date.now() no nome): a ideia aqui é
// justamente poder substituir sempre o mesmo arquivo na pasta, então o
// padrão de fábrica de cada um é fixo. {data}/{hora} continuam
// disponíveis como token pra quem preferir um nome novo a cada vez.
const NOMES_PADRAO_FIXOS = {
    backup: 'arquivo_poetico_backup',
    aninhado: 'arquivo_poetico_aninhado',
    flatJson: 'arquivo_poetico_flat',
    flatMd: 'arquivo_poetico_flat',
    filtradoJson: 'arquivo_poetico_filtrado',
    filtradoMd: 'arquivo_poetico_filtrado',
    // Sem o prefixo "arquivo_poetico_": não é uma exportação do acervo,
    // é o cadastro bruto de versões alternativas — mesmo nome padrão
    // que o exportarBanco() de filtrar.html já usa, pra quem já baixa
    // de lá reconhecer o arquivo.
    bancoVersoes: 'versoes_filtradas_banco',
};

function lerNomesFixos() {
    try {
        const raw = localStorage.getItem(LS_KEY_NOMES);
        return raw ? { ...NOMES_PADRAO_FIXOS, ...JSON.parse(raw) } : { ...NOMES_PADRAO_FIXOS };
    } catch {
        return { ...NOMES_PADRAO_FIXOS };
    }
}

function salvarNomesFixos(nomes) {
    try {
        localStorage.setItem(LS_KEY_NOMES, JSON.stringify(nomes));
    } catch (e) {
        console.warn('[exportar-frequentes.js] Não foi possível salvar os nomes de arquivo:', e);
    }
}

// ─── Tokens de nome de arquivo ──────────────────────────────────────
// {data} = 2026-09-13, {hora} = 14h32 — o resto do padrão (incluindo
// qualquer {nome}/{tipo}/{formato} de um template) é resolvido por
// quem chama, antes de bater aqui.
function tokensData() {
    const agora = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return {
        data: `${agora.getFullYear()}-${pad(agora.getMonth() + 1)}-${pad(agora.getDate())}`,
        hora: `${pad(agora.getHours())}h${pad(agora.getMinutes())}`,
    };
}

function aplicarTokens(padrao, tokens) {
    return Object.entries(tokens).reduce(
        (acc, [chave, valor]) => acc.split(`{${chave}}`).join(valor),
        padrao,
    );
}

function nomeComExtensao(padrao, tokens, ext) {
    const resolvido = aplicarTokens(padrao || 'exportacao', tokens).trim() || 'exportacao';
    return resolvido.toLowerCase().endsWith(`.${ext}`) ? resolvido : `${resolvido}.${ext}`;
}

// ─── Banco de versões alternativas (ver filtrar.html) ──────────────
function lerBancoVersoesFiltradas() {
    try {
        const raw = localStorage.getItem(LS_KEY_VERSOES);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function chaveVersao(tipo, id) {
    return `${tipo}:${id}`;
}

// Réplica de substituirSeHouverVersao() (filtrar.html): troca título/
// texto pela versão alternativa quando existe uma cadastrada pra esse
// item, respeitando as duas flags de "incluir nota na exportação".
function aplicarVersaoFiltrada(item, tipo, banco) {
    const vf = banco[chaveVersao(tipo, item.id)];
    if (!vf) return item;
    const resultado = {
        ...item,
        titulo: vf.tituloFiltrado || item.titulo,
        texto: vf.textoFiltrado,
    };
    if (!vf.notaOriginalExportar) {
        delete resultado.nota;
        delete resultado.notas;
    }
    if (vf.nota && vf.notaExportar) resultado.notas = vf.nota;
    return resultado;
}

const CHAVES_ARRAY_POEMA = ['poemas', 'conteudo_poemas_diretos', 'conteudo_poemas'];
const CHAVES_ARRAY_PROSA = ['prosas', 'conteudo_prosas_diretas', 'conteudo_prosas'];

// Réplica de clonarComSubstituicoes() (filtrar.html) — percorre a
// árvore aninhada (mesma função usada por buildNesting) e substitui
// item a item nos arrays reconhecidos, preservando o resto como está.
function clonarComSubstituicoes(node, banco, chavePai = null) {
    if (Array.isArray(node)) {
        if (CHAVES_ARRAY_POEMA.includes(chavePai)) {
            return node.map((item) =>
                clonarComSubstituicoes(aplicarVersaoFiltrada(item, 'poema', banco), banco),
            );
        }
        if (CHAVES_ARRAY_PROSA.includes(chavePai)) {
            return node.map((item) =>
                clonarComSubstituicoes(aplicarVersaoFiltrada(item, 'prosa', banco), banco),
            );
        }
        return node.map((item) => clonarComSubstituicoes(item, banco));
    }
    if (node && typeof node === 'object') {
        const novo = {};
        for (const [k, v] of Object.entries(node)) {
            novo[k] = clonarComSubstituicoes(v, banco, k);
        }
        return novo;
    }
    return node;
}

function montarColetaneas() {
    return db.livros
        .filter((l) => l.tipo === 'Coletânea')
        .map((col) => exportarColetaneaResolvida(col.id))
        .filter(Boolean);
}

// ─── Geradores puros (blob-only, sem disparar download sozinhos) ───
// Cada um devolve { blob, extensao } — quem chama decide se baixa na
// hora (um clique) ou empilha pro lote/.zip.

// Igual ao "Baixar JSON" da Exportação Geral: se a pessoa marcar "capas",
// embute as imagens de capa (Livro/Parte/Seção) como base64 em _capasBase64
// dentro do próprio arquivo — deixa o arquivo maior, mas autocontido (sem
// isso, restaurar este backup num navegador zerado traz só o texto, sem
// capas). Sem o checkbox renderizado (ex.: chamado fora da aba, como nos
// testes), o padrão é não incluir — mesmo padrão de exportarJSON() em db.js.
//
// Sem indentação (igual ao exportarJSON() de db.js) — este é o backup "de
// verdade" pra restaurar, não um arquivo pra ler na mão, e o pretty-print
// (2 espaços por nível) chega a inflar uns 25-30% o tamanho final num banco
// com muitos poemas/prosas, sem trazer nada de útil pra troco.
async function gerarBackupBlob() {
    const chkCapas = document.getElementById('chk-capas-fixo-backup');
    const incluirCapas = chkCapas ? chkCapas.checked : false;
    const payload = incluirCapas
        ? { ...db, _capasBase64: await exportarTodasCapasBase64() }
        : db;
    return new Blob([JSON.stringify(payload)], { type: 'application/json;charset=utf-8' });
}

function gerarAninhadoBlob() {
    const nesting = buildNesting(db);
    const saida = { ...nesting, coletaneas: montarColetaneas() };
    return new Blob([JSON.stringify(saida, null, 4)], { type: 'application/json;charset=utf-8' });
}

function gerarFlatItens() {
    return [
        ...db.poemas.map((p) => montarRegistro('poema', p)),
        ...db.prosas.map((p) => montarRegistro('prosa', p)),
    ];
}

function gerarFlatJsonBlob() {
    const saida = {
        export_format: 'tudo_flat',
        itens: gerarFlatItens(),
        coletaneas: montarColetaneas(),
    };
    return new Blob([JSON.stringify(saida, null, 4)], { type: 'application/json;charset=utf-8' });
}

function gerarFlatMdBlob() {
    return new Blob([gerarMarkdownExportacao(gerarFlatItens())], {
        type: 'text/markdown;charset=utf-8',
    });
}

function gerarFiltradoJsonBlob() {
    const banco = lerBancoVersoesFiltradas();
    const nesting = buildNesting(db);
    const saida = clonarComSubstituicoes({ ...nesting, coletaneas: montarColetaneas() }, banco);
    return new Blob([JSON.stringify(saida, null, 4)], { type: 'application/json;charset=utf-8' });
}

function gerarFiltradoItens() {
    const banco = lerBancoVersoesFiltradas();
    return [
        ...db.poemas
            .map((p) => aplicarVersaoFiltrada(p, 'poema', banco))
            .map((p) => montarRegistro('poema', p)),
        ...db.prosas
            .map((p) => aplicarVersaoFiltrada(p, 'prosa', banco))
            .map((p) => montarRegistro('prosa', p)),
    ];
}

function gerarFiltradoMdBlob() {
    return new Blob([gerarMarkdownExportacao(gerarFiltradoItens())], {
        type: 'text/markdown;charset=utf-8',
    });
}

// Banco bruto de versões alternativas (filtrar.html) — mesmo formato de
// payload do exportarBanco() de lá ({ export_format, gerado_em, total,
// versoes }), pra continuar compatível com a importação existente
// daquela ferramenta. Diferente de "Filtrado completo" acima: este é o
// CADASTRO em si (o que se digita em filtrar.html), não o acervo com as
// substituições já aplicadas.
function gerarBancoVersoesBlob() {
    const banco = lerBancoVersoesFiltradas();
    const payload = {
        export_format: 'banco_versoes_filtradas',
        gerado_em: new Date().toISOString(),
        total: Object.keys(banco).length,
        versoes: banco,
    };
    return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
}

// Config declarativa dos 7 fixos — rótulo, gerador de blob e extensão.
// Uma função só (baixarFixo/baixarTodosFixos) percorre esta lista em
// vez de repetir a mesma lógica 7 vezes.
const FIXOS = [
    { id: 'backup', rotulo: 'Backup', ext: 'json', gerar: gerarBackupBlob, comCapas: true },
    { id: 'aninhado', rotulo: 'Aninhado completo', ext: 'json', gerar: gerarAninhadoBlob },
    { id: 'flatJson', rotulo: 'Flat completo', ext: 'json', gerar: gerarFlatJsonBlob },
    { id: 'flatMd', rotulo: 'Flat completo', ext: 'md', gerar: gerarFlatMdBlob },
    { id: 'filtradoJson', rotulo: 'Filtrado completo', ext: 'json', gerar: gerarFiltradoJsonBlob },
    { id: 'filtradoMd', rotulo: 'Filtrado completo', ext: 'md', gerar: gerarFiltradoMdBlob },
    {
        id: 'bancoVersoes',
        rotulo: 'Banco de versões filtradas',
        ext: 'json',
        gerar: gerarBancoVersoesBlob,
    },
];

// ─── Download (individual, lote sequencial, lote .zip) ─────────────
function baixarBlobComoArquivo(blob, nome) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

function esperar(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function modoLoteEscolhido() {
    return document.getElementById('modo-lote-exportacoes-frequentes')?.value || 'zip';
}

// arquivos: [{ nome, blob }]. modo: 'zip' | 'sequencial'.
async function baixarEmLote(arquivos, nomeZip) {
    if (arquivos.length === 0) {
        mostrarAviso('Nada selecionado pra baixar.');
        return;
    }
    const modo = modoLoteEscolhido();
    if (modo === 'zip') {
        if (!window.JSZip) {
            mostrarAviso(
                'A biblioteca de .zip não carregou (verifique a conexão com a internet) — tente de novo em alguns segundos, ou baixe em downloads separados.',
            );
            return;
        }
        const zip = new window.JSZip();
        arquivos.forEach(({ nome, blob }) => zip.file(nome, blob));
        const conteudo = await zip.generateAsync({ type: 'blob' });
        baixarBlobComoArquivo(conteudo, nomeZip);
        return;
    }
    // Sequencial: um intervalo pequeno entre cada clique pro navegador
    // não bloquear como "vários downloads automáticos" (Chrome barra a
    // partir do 2º/3º disparado no mesmo instante sem interação nova).
    for (let i = 0; i < arquivos.length; i++) {
        baixarBlobComoArquivo(arquivos[i].blob, arquivos[i].nome);
        if (i < arquivos.length - 1) await esperar(400);
    }
}

// fixo.gerar() pode ser síncrono (a maioria) ou assíncrono (backup, quando
// busca as capas no IndexedDB) — o await aqui cobre os dois casos sem
// precisar diferenciar por id.
export async function baixarFixo(id) {
    const fixo = FIXOS.find((f) => f.id === id);
    if (!fixo) return;
    const nomes = lerNomesFixos();
    const blob = await fixo.gerar();
    baixarBlobComoArquivo(blob, nomeComExtensao(nomes[id], tokensData(), fixo.ext));
}

export async function baixarTodosFixos() {
    const nomes = lerNomesFixos();
    const arquivos = await Promise.all(
        FIXOS.map(async (f) => ({
            nome: nomeComExtensao(nomes[f.id], tokensData(), f.ext),
            blob: await f.gerar(),
        })),
    );
    await baixarEmLote(
        arquivos,
        nomeComExtensao('exportacoes_frequentes_fixos-{data}', tokensData(), 'zip'),
    );
}

export function salvarNomeFixo(id, valor) {
    const nomes = lerNomesFixos();
    nomes[id] = valor;
    salvarNomesFixos(nomes);
}

// ─── Templates ───────────────────────────────────────────────────
// Campo → rótulo exibido no seletor de critério. 'pessoa' e 'genero'
// são especiais (fora de SINALIZACOES_CATEGORIAS); os demais vêm de lá
// automaticamente, então uma 8ª categoria de Sinalização não exige
// tocar neste arquivo.
function opcoesDeCampo() {
    const rotulosPorCampo = {
        tradicao: 'Tradição',
        estilo: 'Estilo',
        tema: 'Tema',
        relacao: 'Relação',
        sensibilidade: 'Sensibilidade',
        tom: 'Tom',
        dominioImagetico: 'Domínio Imagético',
        outros: 'Outros',
    };
    const sinalizacoes = Object.entries(SINALIZACOES_CATEGORIAS).map(([slug, campo]) => ({
        campo,
        rotulo: `Sinalização: ${rotulosPorCampo[slug] || slug}`,
    }));
    return [
        { campo: 'pessoa', rotulo: 'Pessoa (dedicado)' },
        ...sinalizacoes,
        { campo: 'genero', rotulo: 'Gênero (só Prosa)' },
    ];
}

function lerTemplates() {
    try {
        const raw = localStorage.getItem(LS_KEY_TEMPLATES);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function salvarTemplates(lista) {
    try {
        localStorage.setItem(LS_KEY_TEMPLATES, JSON.stringify(lista));
    } catch (e) {
        mostrarAviso('Não foi possível salvar o template — verifique o espaço do navegador.');
        console.warn('[exportar-frequentes.js] Falha ao salvar templates:', e);
    }
}

// valor do critério comparado à lista normalizada do campo daquele
// item — mesma normalização (split por vírgula, trim, minúsculo) do
// resto do sistema (ver listaDeCampo em exportar.js).
function itemAtendeCriterio(item, criterio) {
    const valor = (criterio.valor || '').trim().toLowerCase();
    if (!valor) return true;
    if (criterio.campo === 'pessoa') {
        return nomesPessoas(item, db.pessoas)
            .map((n) => n.toLowerCase())
            .includes(valor);
    }
    return listaDeCampo(item[criterio.campo]).includes(valor);
}

function itemAtendeTemplate(item, tpl) {
    return (tpl.criterios || []).every((c) => itemAtendeCriterio(item, c));
}

function itensParaTemplate(tpl) {
    const banco = tpl.usarVersaoFiltrada ? lerBancoVersoesFiltradas() : null;
    const aplicar = (item, tipo) => (banco ? aplicarVersaoFiltrada(item, tipo, banco) : item);

    const poemas = (tpl.tipos || []).includes('poema')
        ? db.poemas.filter((p) => itemAtendeTemplate(p, tpl))
        : [];
    const prosas = (tpl.tipos || []).includes('prosa')
        ? db.prosas.filter((p) => itemAtendeTemplate(p, tpl))
        : [];

    return [
        ...poemas.map((p) => montarRegistro('poema', aplicar(p, 'poema'))),
        ...prosas.map((p) => montarRegistro('prosa', aplicar(p, 'prosa'))),
    ];
}

function nomeArquivoTemplate(tpl, formato) {
    const padrao = tpl.nomeArquivo?.trim() || '{nome}-{formato}';
    const tokens = { ...tokensData(), nome: tpl.nome || 'template', formato };
    return nomeComExtensao(padrao, tokens, formato);
}

function blobsDoTemplate(tpl) {
    const itens = itensParaTemplate(tpl);
    const arquivos = [];
    if (tpl.formatos?.json) {
        const saida = { export_format: 'template_export', nome: tpl.nome, itens };
        arquivos.push({
            nome: nomeArquivoTemplate(tpl, 'json'),
            blob: new Blob([JSON.stringify(saida, null, 4)], {
                type: 'application/json;charset=utf-8',
            }),
        });
    }
    if (tpl.formatos?.md) {
        arquivos.push({
            nome: nomeArquivoTemplate(tpl, 'md'),
            blob: new Blob([gerarMarkdownExportacao(itens)], {
                type: 'text/markdown;charset=utf-8',
            }),
        });
    }
    return { arquivos, total: itens.length };
}

export function baixarTemplate(id) {
    // == (não ===): id vem de onclick="...('${tpl.id}')" — sempre string —
    // enquanto tpl.id é number (gerarId()). Mesmo padrão de comparação usado
    // em todo o resto do app pra esse mesmo descasamento (ver db.js,
    // coletaneas.js, editor.js etc.).
    const tpl = lerTemplates().find((t) => t.id == id);
    if (!tpl) return;
    const { arquivos, total } = blobsDoTemplate(tpl);
    if (total === 0) {
        mostrarAviso(`Nenhum item encontrado pros critérios de "${tpl.nome}".`);
        return;
    }
    if (arquivos.length === 0) {
        mostrarAviso('Marque ao menos um formato (JSON ou MD) nesse template.');
        return;
    }
    // Individual: mesmo com 2 formatos marcados, baixa os 2 na hora —
    // é raro alguém ter só um clique de paciência aqui, e os 2 juntos
    // não esbarram no bloqueio de "vários downloads automáticos" do
    // navegador (só entra em jogo com listas maiores, ver baixarEmLote).
    arquivos.forEach(({ nome, blob }) => baixarBlobComoArquivo(blob, nome));
}

export async function baixarTodosTemplates() {
    const templates = lerTemplates();
    const arquivos = templates.flatMap((tpl) => blobsDoTemplate(tpl).arquivos);
    await baixarEmLote(
        arquivos,
        nomeComExtensao('exportacoes_frequentes_templates-{data}', tokensData(), 'zip'),
    );
}

export function excluirTemplate(id) {
    // == (não !==): mesmo descasamento number/string de baixarTemplate acima.
    salvarTemplates(lerTemplates().filter((t) => t.id != id));
    renderExportacoesFrequentes();
}

// ─── Formulário de criação/edição ────────────────────────────────
let criteriosDoFormulario = [];
let editandoId = null;

function resetFormularioTemplate() {
    criteriosDoFormulario = [{ campo: 'pessoa', valor: '' }];
    editandoId = null;
}
resetFormularioTemplate();

function renderCriteriosFormulario() {
    const container = document.getElementById('form-criterios-template');
    if (!container) return;
    const opcoes = opcoesDeCampo();
    container.innerHTML = criteriosDoFormulario
        .map(
            (c, i) => `
        <div class="flex flex-wrap items-center gap-2">
            <select class="text-xs crit-campo" data-i="${i}" style="max-width:220px">
                ${opcoes
                    .map(
                        (o) =>
                            `<option value="${o.campo}" ${o.campo === c.campo ? 'selected' : ''}>${escapeHtml(o.rotulo)}</option>`,
                    )
                    .join('')}
            </select>
            <span class="text-xs text-gray-400">=</span>
            <input type="text" class="text-xs crit-valor flex-1 min-w-[140px] mb-0" data-i="${i}"
                value="${escapeHtml(c.valor)}" placeholder="Valor..." />
            ${
                criteriosDoFormulario.length > 1
                    ? `<button type="button" class="text-xs text-red-500 crit-remover" data-i="${i}">✕</button>`
                    : ''
            }
        </div>`,
        )
        .join('');

    container.querySelectorAll('.crit-campo').forEach((el) => {
        el.addEventListener('change', (e) => {
            criteriosDoFormulario[Number(e.target.dataset.i)].campo = e.target.value;
        });
    });
    container.querySelectorAll('.crit-valor').forEach((el) => {
        el.addEventListener('input', (e) => {
            criteriosDoFormulario[Number(e.target.dataset.i)].valor = e.target.value;
        });
    });
    container.querySelectorAll('.crit-remover').forEach((el) => {
        el.addEventListener('click', (e) => {
            criteriosDoFormulario.splice(Number(e.target.dataset.i), 1);
            renderCriteriosFormulario();
        });
    });
}

export function adicionarCriterioFormulario() {
    criteriosDoFormulario.push({ campo: 'pessoa', valor: '' });
    renderCriteriosFormulario();
}

export function abrirFormularioTemplate(id = null) {
    const painel = document.getElementById('painel-form-template');
    if (!painel) return;
    if (id) {
        // == (não ===): mesmo descasamento number/string de baixarTemplate.
        const tpl = lerTemplates().find((t) => t.id == id);
        if (!tpl) return;
        editandoId = tpl.id; // guarda o id canônico (number), não a string do onclick
        criteriosDoFormulario = tpl.criterios.length
            ? [...tpl.criterios]
            : [{ campo: 'pessoa', valor: '' }];
        document.getElementById('form-tpl-nome').value = tpl.nome;
        document.getElementById('form-tpl-nome-arquivo').value = tpl.nomeArquivo || '';
        document.getElementById('form-tpl-tipo-poema').checked = tpl.tipos.includes('poema');
        document.getElementById('form-tpl-tipo-prosa').checked = tpl.tipos.includes('prosa');
        document.getElementById('form-tpl-formato-json').checked = !!tpl.formatos?.json;
        document.getElementById('form-tpl-formato-md').checked = !!tpl.formatos?.md;
        document.getElementById('form-tpl-versao-filtrada').checked = !!tpl.usarVersaoFiltrada;
    } else {
        resetFormularioTemplate();
        document.getElementById('form-tpl-nome').value = '';
        document.getElementById('form-tpl-nome-arquivo').value = '';
        document.getElementById('form-tpl-tipo-poema').checked = true;
        document.getElementById('form-tpl-tipo-prosa').checked = true;
        document.getElementById('form-tpl-formato-json').checked = true;
        document.getElementById('form-tpl-formato-md').checked = false;
        document.getElementById('form-tpl-versao-filtrada').checked = false;
    }
    renderCriteriosFormulario();
    painel.classList.remove('hidden');
}

export function fecharFormularioTemplate() {
    document.getElementById('painel-form-template')?.classList.add('hidden');
    resetFormularioTemplate();
}

export function salvarFormularioTemplate() {
    const nome = document.getElementById('form-tpl-nome')?.value.trim();
    if (!nome) {
        mostrarAviso('Dê um nome pro template.');
        return;
    }
    const criterios = criteriosDoFormulario.filter((c) => (c.valor || '').trim());
    if (criterios.length === 0) {
        mostrarAviso('Preencha ao menos um critério (campo = valor).');
        return;
    }
    const tpl = {
        id: editandoId || gerarId(),
        nome,
        nomeArquivo: document.getElementById('form-tpl-nome-arquivo')?.value.trim() || '',
        tipos: [
            ...(document.getElementById('form-tpl-tipo-poema')?.checked ? ['poema'] : []),
            ...(document.getElementById('form-tpl-tipo-prosa')?.checked ? ['prosa'] : []),
        ],
        criterios,
        formatos: {
            json: !!document.getElementById('form-tpl-formato-json')?.checked,
            md: !!document.getElementById('form-tpl-formato-md')?.checked,
        },
        usarVersaoFiltrada: !!document.getElementById('form-tpl-versao-filtrada')?.checked,
    };

    const lista = lerTemplates();
    const idx = lista.findIndex((t) => t.id === tpl.id);
    if (idx >= 0) lista[idx] = tpl;
    else lista.push(tpl);
    salvarTemplates(lista);

    fecharFormularioTemplate();
    renderExportacoesFrequentes();
}

// ─── Renderização da aba ───────────────────────────────────────────
function contagemTemplate(tpl) {
    const poemas = (tpl.tipos || []).includes('poema')
        ? db.poemas.filter((p) => itemAtendeTemplate(p, tpl)).length
        : 0;
    const prosas = (tpl.tipos || []).includes('prosa')
        ? db.prosas.filter((p) => itemAtendeTemplate(p, tpl)).length
        : 0;
    return poemas + prosas;
}

function resumoCriterios(tpl) {
    const opcoes = opcoesDeCampo();
    return tpl.criterios
        .map((c) => {
            const rotulo = opcoes.find((o) => o.campo === c.campo)?.rotulo || c.campo;
            return `${rotulo} = "${c.valor}"`;
        })
        .join(' E ');
}

function renderListaTemplates() {
    const container = document.getElementById('lista-templates-exportacao');
    if (!container) return;
    const templates = lerTemplates();
    if (templates.length === 0) {
        container.innerHTML =
            '<p class="text-xs text-gray-400 dark:text-slate-500">Nenhum template salvo ainda.</p>';
        return;
    }
    container.innerHTML = templates
        .map(
            (tpl) => `
        <div class="flex flex-wrap items-center gap-2 p-2 border border-gray-200 dark:border-slate-700 rounded-lg">
            <div class="flex-1 min-w-[220px]">
                <div class="text-sm font-bold">${escapeHtml(tpl.nome)}</div>
                <div class="text-[11px] text-gray-500 dark:text-slate-400">
                    ${escapeHtml(resumoCriterios(tpl))} — ${contagemTemplate(tpl)} item(ns)
                    ${tpl.usarVersaoFiltrada ? ' — versão filtrada' : ''}
                </div>
            </div>
            <button onclick="baixarTemplate('${tpl.id}')"
                class="bg-teal-600 text-white px-3 py-1.5 rounded text-xs font-bold whitespace-nowrap">⬇ Baixar</button>
            <button onclick="abrirFormularioTemplate('${tpl.id}')"
                class="text-xs text-blue-600 dark:text-blue-400 underline whitespace-nowrap">Editar</button>
            <button onclick="excluirTemplate('${tpl.id}')"
                class="text-xs text-red-500 underline whitespace-nowrap">Excluir</button>
        </div>`,
        )
        .join('');
}

// Gerado a partir do array FIXOS (não hardcoded no HTML) — assim um 7º
// fixo, se um dia existir, é só uma linha nova ali em cima.
function renderListaFixos() {
    const container = document.getElementById('lista-fixos-exportacao');
    if (!container) return;
    // Preserva o valor de qualquer input com foco (a pessoa pode estar
    // digitando o nome quando outra coisa dispara um re-render).
    const focoAtual = document.activeElement?.id;
    const nomes = lerNomesFixos();
    // Mesmo padrão de main.js pro checkbox equivalente da Exportação Geral:
    // marcado por padrão (melhor pecar por incluir demais do que esquecer e
    // perder capas), a menos que a pessoa já tenha desmarcado antes.
    const prefCapas = localStorage.getItem(LS_KEY_CAPAS_BACKUP);
    const capasMarcadoPorPadrao = prefCapas === null ? true : prefCapas === 'true';
    container.innerHTML = FIXOS.map(
        (f) => `
        <div class="flex flex-wrap items-center gap-2 p-2 border border-gray-200 dark:border-slate-700 rounded-lg">
            <div class="text-sm font-bold min-w-[140px]">${escapeHtml(f.rotulo)} <span class="text-[10px] font-normal text-gray-400">.${f.ext}</span></div>
            <input type="text" id="nome-fixo-${f.id}" value="${escapeHtml(nomes[f.id])}"
                class="flex-1 min-w-[160px] mb-0 text-xs" placeholder="Nome do arquivo (sem extensão)..." />
            ${
                f.comCapas
                    ? `<label class="flex items-center gap-1 text-[10px] text-green-700 dark:text-green-200 cursor-pointer whitespace-nowrap"
                    title="Embute as imagens de capa no próprio arquivo (mesma opção da Exportação Geral). Deixa o arquivo maior, mas autocontido.">
                <input type="checkbox" id="chk-capas-fixo-${f.id}" ${capasMarcadoPorPadrao ? 'checked' : ''}
                    style="width: 12px; height: 12px; margin: 0" />
                capas
            </label>`
                    : ''
            }
            <button onclick="baixarFixo('${f.id}')"
                class="bg-teal-600 text-white px-3 py-1.5 rounded text-xs font-bold whitespace-nowrap">⬇ Baixar</button>
        </div>`,
    ).join('');

    container.querySelectorAll('input[id^="nome-fixo-"]').forEach((el) => {
        el.addEventListener('change', () =>
            salvarNomeFixo(el.id.replace('nome-fixo-', ''), el.value),
        );
    });
    container.querySelectorAll('input[id^="chk-capas-fixo-"]').forEach((el) => {
        el.addEventListener('change', () => localStorage.setItem(LS_KEY_CAPAS_BACKUP, el.checked));
    });
    if (focoAtual) document.getElementById(focoAtual)?.focus();
}

export function renderExportacoesFrequentes() {
    renderListaFixos();
    renderListaTemplates();
}
