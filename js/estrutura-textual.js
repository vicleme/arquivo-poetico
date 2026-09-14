// ============================================================
// estrutura-textual.js — Progressão Morfofuncional (Unidades + Eventos)
// Ver manutencao/progressao-morfofuncional.md pro requisito completo.
// Importado por: forms.js (só decide QUANDO chamar e lê o resultado
// final na hora de salvar — mesma separação de responsabilidade que já
// existe entre forms.js e editor-sonoridade.js).
// ============================================================

import { escapeHtml, gerarId, parseListaIntervalos, limparElementosHtmlLinha } from './utils.js';

// ─── Lógica pura (testável sem DOM) ─────────────────────────────

// Mesma remoção de **negrito**/_itálico_ que construirLinhasIniciais já
// faz em editor-sonoridade.js (não exportada de lá, então replicada
// aqui — função pequena o bastante pra não justificar acoplar os dois
// módulos só por isso).
function removerMarcacaoMarkdown(texto) {
    return (texto || '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/_(.+?)_/g, '$1');
}

// A partir do texto bruto de um poema, deriva a estrutura de
// estrofes+versos (regra 2 do .md: posição é sempre derivada
// automaticamente, nunca digitada). Quebra de linha em branco = nova
// estrofe (uma ou mais linhas vazias seguidas contam como uma quebra
// só); cada linha não-vazia é um verso, numerado de forma contínua ao
// longo do poema inteiro (não reinicia a cada estrofe) — mesmo
// raciocínio de numeração de construirLinhasIniciais (editor-sonoridade.js).
// `linhasIgnoradasStr` (opcional, mesmo campo/formato da Sonoridade —
// ver parseListaIntervalos em utils.js): linhas listadas ali são
// removidas ANTES de tudo, como se não existissem no texto — não
// contam nem como quebra de estrofe. Cada linha também passa por
// limparElementosHtmlLinha antes da remoção de marcação markdown.
export function construirEstrofesDoTexto(textoPoema, linhasIgnoradasStr = '') {
    const linhasIgnoradas = parseListaIntervalos(linhasIgnoradasStr);
    const linhas = (textoPoema || '').split('\n');
    const estrofes = [];
    let estrofeAberta = null;
    let numeroVerso = 0;
    linhas.forEach((linhaBruta, idx) => {
        if (linhasIgnoradas.has(idx + 1)) return;
        const semHtml = limparElementosHtmlLinha(linhaBruta);
        const texto = removerMarcacaoMarkdown(semHtml).trim();
        if (texto === '') {
            estrofeAberta = null; // a próxima linha não-vazia abre uma nova
            return;
        }
        numeroVerso += 1;
        if (!estrofeAberta) {
            estrofeAberta = { numero: estrofes.length + 1, versos: [] };
            estrofes.push(estrofeAberta);
        }
        estrofeAberta.versos.push({ numero: numeroVerso, texto });
    });
    return estrofes;
}

// Reconcilia a posição de itens já classificados com uma nova lista de
// estrofes (bug reportado pelo Victor: criar uma Unidade/Evento ANTES
// de preencher/ajustar "Linhas a ignorar" deixava a posição marcada
// presa aos números antigos de estrofe/verso — depois de ignorar uma
// linha, a estrofe N podia passar a significar um trecho diferente do
// texto, mas o item continuava "marcado" nela sem nenhuma validação.
// Só remove números que não existem mais (ou que, com uma única
// estrofe restante, apontam pra um verso que sumiu dela) — nunca
// inventa uma posição nova. Mesmo espírito de carregarGradeSonoridade
// descartar uma grade que não bate mais com o recorte atual, mas aqui
// item por item em vez de tudo de uma vez.
function reconciliarItensComEstrofes(itens, estrofesNovas) {
    const numerosValidos = new Set(estrofesNovas.map((es) => es.numero));
    const versosValidosPorEstrofe = new Map(
        estrofesNovas.map((es) => [es.numero, new Set(es.versos.map((v) => v.numero))]),
    );
    itens.forEach((item) => {
        const estrofesFiltradas = item.posicao.estrofes.filter((n) => numerosValidos.has(n));
        item.posicao.estrofes = estrofesFiltradas;
        if (estrofesFiltradas.length === 1 && Array.isArray(item.posicao.versos)) {
            const versosValidos = versosValidosPorEstrofe.get(estrofesFiltradas[0]) || new Set();
            item.posicao.versos = item.posicao.versos.filter((v) => versosValidos.has(v));
        } else if (estrofesFiltradas.length !== 1) {
            item.posicao.versos = 'todos';
        }
    });
}

// Item "não posicionado" (regra 5 do .md) = nenhuma estrofe marcada —
// é o estado inicial de qualquer item novo ou instanciado por Template.
export function itemPosicionado(posicao) {
    return !!(posicao && Array.isArray(posicao.estrofes) && posicao.estrofes.length > 0);
}

// Versos "efetivos" de uma posição já posicionada: com mais de uma
// estrofe marcada, é sempre 'todos' (regra 3 — seleção fina de verso só
// vale com exatamente uma estrofe); com uma só, respeita o que estiver
// salvo (posicao.versos 'todos' ou array de números).
function versosEfetivos(posicao) {
    if (!itemPosicionado(posicao)) return null;
    if (posicao.estrofes.length > 1) return 'todos';
    if (posicao.versos === 'todos') return 'todos';
    return Array.isArray(posicao.versos) ? posicao.versos : 'todos';
}

// Duas posições se sobrepõem quando compartilham ao menos uma célula
// (estrofe, verso) — sem diferenciar de que tipo é cada lado (regra 4:
// Unidade×Unidade, Evento×Evento e Unidade×Evento tratados igual).
export function overlapEntre(posA, posB) {
    if (!itemPosicionado(posA) || !itemPosicionado(posB)) return false;
    const estrofesComuns = posA.estrofes.filter((e) => posB.estrofes.includes(e));
    if (estrofesComuns.length === 0) return false;
    const versosA = versosEfetivos(posA);
    const versosB = versosEfetivos(posB);
    if (versosA === 'todos' || versosB === 'todos') return true;
    // Só chegam aqui os dois com array de verso — só possível quando os
    // dois têm exatamente uma estrofe (a mesma, já que estrofesComuns
    // não está vazio), então basta cruzar os números de verso.
    return versosA.some((v) => versosB.includes(v));
}

// Retorna o Set de ids (Unidades + Eventos juntos — gerarId() é um
// contador global, nunca colide entre os dois) que se sobrepõem com
// pelo menos um outro item, de qualquer combinação. Usado só pra
// destacar visualmente os cartões envolvidos (regra 4 — nunca como
// aviso bloqueante, nunca diferenciado por tipo).
export function detectarSobrepostos(unidades = [], eventos = []) {
    const todos = [...unidades, ...eventos];
    const sobrepostos = new Set();
    for (let i = 0; i < todos.length; i++) {
        for (let j = i + 1; j < todos.length; j++) {
            if (overlapEntre(todos[i].posicao, todos[j].posicao)) {
                sobrepostos.add(todos[i].id);
                sobrepostos.add(todos[j].id);
            }
        }
    }
    return sobrepostos;
}

// Chave de ordenação por posição no texto: [estrofe mínima, verso
// mínimo] — item não posicionado vai pro fim (Infinity/Infinity).
function chavePosicao(item) {
    const posicao = item.posicao;
    if (!itemPosicionado(posicao)) return [Infinity, Infinity];
    const minEstrofe = Math.min(...posicao.estrofes);
    let minVerso = 0;
    if (posicao.estrofes.length === 1 && Array.isArray(posicao.versos) && posicao.versos.length) {
        minVerso = Math.min(...posicao.versos);
    }
    return [minEstrofe, minVerso];
}

// Regra 6 do .md: quem vem primeiro no poema aparece primeiro na
// lista; não posicionados ficam agrupados ao final (nunca no início).
// Ordenação estável — dois itens com a mesma posição mantêm a ordem
// relativa em que já apareciam.
export function ordenarPorPosicao(itens) {
    return itens
        .map((item, indiceOriginal) => ({ item, indiceOriginal, chave: chavePosicao(item) }))
        .sort((a, b) => {
            if (a.chave[0] !== b.chave[0]) return a.chave[0] - b.chave[0];
            if (a.chave[1] !== b.chave[1]) return a.chave[1] - b.chave[1];
            return a.indiceOriginal - b.indiceOriginal;
        })
        .map((x) => x.item);
}

// Aplicar um Template (regra 8): instancia Unidades/Eventos novos, só
// com a classificação do template, sempre "não posicionados" — pronto
// pra ir clicando a posição de cada um no poema específico.
export function instanciarTemplateEstrutura(template) {
    const unidadesNovas = (template?.unidades || []).map((u) => ({
        id: gerarId(),
        nome: u.nome || '',
        unidadeEstrofica: u.unidadeEstrofica || '',
        unidadeDiscursiva: u.unidadeDiscursiva || '',
        posicao: { estrofes: [], versos: 'todos' },
    }));
    const eventosNovos = (template?.eventos || []).map((e) => ({
        id: gerarId(),
        progressaoDialetica: e.progressaoDialetica || '',
        posicao: { estrofes: [], versos: 'todos' },
    }));
    return { unidadesNovas, eventosNovos };
}

// Inverso — "Salvar como Template": extrai só a classificação das
// Unidades/Eventos atuais do poema, descartando id e posição.
export function extrairClassificacaoParaTemplate(unidades = [], eventos = []) {
    return {
        unidades: unidades.map((u) => ({
            unidadeEstrofica: u.unidadeEstrofica || '',
            unidadeDiscursiva: u.unidadeDiscursiva || '',
        })),
        eventos: eventos.map((e) => ({ progressaoDialetica: e.progressaoDialetica || '' })),
    };
}

// Resumo textual da posição de um item, pro cartão (ex.: "Estrofe 4" /
// "Estrofes 1-2, todos os versos" / "Estrofe 4, verso 1" / "Não posicionado").
export function resumoPosicao(posicao) {
    if (!itemPosicionado(posicao)) return 'Não posicionado';
    const estrofesTxt =
        posicao.estrofes.length === 1
            ? `Estrofe ${posicao.estrofes[0]}`
            : `Estrofes ${[...posicao.estrofes].sort((a, b) => a - b).join(', ')}`;
    if (posicao.estrofes.length > 1 || posicao.versos === 'todos') {
        return `${estrofesTxt}, todos os versos`;
    }
    if (Array.isArray(posicao.versos) && posicao.versos.length) {
        const rotuloVerso = posicao.versos.length === 1 ? 'verso' : 'versos';
        return `${estrofesTxt}, ${rotuloVerso} ${[...posicao.versos].sort((a, b) => a - b).join(', ')}`;
    }
    return `${estrofesTxt}, nenhum verso marcado`;
}

// ─── Estado de edição do modal ───────────────────────────────────
// Mesmo padrão de linhasAtuais/rimasAtuais em editor-sonoridade.js: o
// estado mora aqui (mutado a cada clique), forms.js só lê o resultado
// final na hora de salvar (obterUnidadesAtuais/obterEventosAtuais).

let unidadesAtuais = [];
let eventosAtuais = [];
let estrofesAtuais = [];
let containerUnidadesEl = null;
let containerEventosEl = null;

// ids (Unidade+Evento, gerarId() é contador global — não colide) dos
// itens com o <details> do seletor de posição aberto. renderTudo()
// reconstrói os cartões inteiros via innerHTML a cada clique (marcar
// estrofe/verso), o que por padrão fecharia o <details> de novo a
// cada clique — este Set é o que permite reabrir com o estado certo
// em vez de perder o "open" a cada re-render (ver
// montarSeletorPosicaoHtml/onToggleDetalhesPosicao abaixo).
let detalhesPosicaoAbertos = new Set();

// Mesmo padrão do Set acima, agora pro <details> "✏️ Editar" de cada
// cartão (nome/unidadeEstrofica/unidadeDiscursiva/progressaoDialetica)
// — ver montarEdicaoClassificacaoHtml/onToggleEdicaoEstrutura abaixo.
let edicaoAbertos = new Set();

function clonar(itens) {
    return itens.map((item) => ({
        ...item,
        posicao: {
            estrofes: [...(item.posicao?.estrofes || [])],
            versos: item.posicao?.versos ?? 'todos',
        },
    }));
}

// Chamada ao abrir o modal (nova Progressão ou edição) — deriva as
// estrofes do poema escolhido e carrega Unidades/Eventos já salvos (ou
// vazio, se for nova).
export function inicializarEstruturaTextual(
    containerUnidades,
    containerEventos,
    poema,
    estrutura,
    linhasIgnoradasStr = '',
) {
    containerUnidadesEl = containerUnidades;
    containerEventosEl = containerEventos;
    estrofesAtuais = poema ? construirEstrofesDoTexto(poema.texto, linhasIgnoradasStr) : [];
    unidadesAtuais = clonar(estrutura?.unidades || []);
    eventosAtuais = clonar(estrutura?.eventos || []);
    detalhesPosicaoAbertos = new Set();
    edicaoAbertos = new Set();
    renderTudo();
}

export function obterUnidadesAtuais() {
    return unidadesAtuais;
}

export function obterEventosAtuais() {
    return eventosAtuais;
}

// `nome` (opcional): rótulo livre pro par Unidade Estrófica/Discursiva
// — a "camada" ou função que aquele par representa (ex.: "Presença e
// ausência", "Corpo de aprendizados", ver conversa de referência do
// .md em manutencao/progressao-morfofuncional.md). Puramente
// descritivo, não entra em templates de classificação reaproveitável
// (ver extrairClassificacaoParaTemplate) por ser específico do poema.
export function adicionarUnidade(nome = '', unidadeEstrofica = '', unidadeDiscursiva = '') {
    if (!nome.trim() && !unidadeEstrofica.trim() && !unidadeDiscursiva.trim()) return;
    unidadesAtuais.push({
        id: gerarId(),
        nome: nome.trim(),
        unidadeEstrofica: unidadeEstrofica.trim(),
        unidadeDiscursiva: unidadeDiscursiva.trim(),
        posicao: { estrofes: [], versos: 'todos' },
    });
    renderTudo();
}

export function adicionarEvento(progressaoDialetica) {
    if (!progressaoDialetica.trim()) return;
    eventosAtuais.push({
        id: gerarId(),
        progressaoDialetica: progressaoDialetica.trim(),
        posicao: { estrofes: [], versos: 'todos' },
    });
    renderTudo();
}

export function removerUnidade(id) {
    unidadesAtuais = unidadesAtuais.filter((u) => u.id !== id);
    renderTudo();
}

export function removerEvento(id) {
    eventosAtuais = eventosAtuais.filter((e) => e.id !== id);
    renderTudo();
}

// Aplica um Template: instancia e concatena (não substitui) o que já
// existe no poema — pode aplicar mais de um template, ou aplicar um
// depois de já ter itens manuais.
export function aplicarTemplateNoEstado(template) {
    const { unidadesNovas, eventosNovos } = instanciarTemplateEstrutura(template);
    unidadesAtuais = [...unidadesAtuais, ...unidadesNovas];
    eventosAtuais = [...eventosAtuais, ...eventosNovos];
    renderTudo();
}

// Chamada só pelo listener de "Linhas a ignorar" (não pela troca de
// poema — ver comentário de carregarEstrofesDoPoemaEstrutura em
// forms.js sobre a diferença deliberada entre os dois casos).
// Recalcula estrofesAtuais pro texto/recorte atual e reconcilia a
// posição de cada Unidade/Evento já classificado contra a nova lista
// (ver reconciliarItensComEstrofes acima) — corrige o bug de posição
// presa a um número de estrofe que já não corresponde mais ao mesmo
// trecho do texto.
export function recalcularEstrofesLinhasIgnoradas(poema, linhasIgnoradasStr = '') {
    estrofesAtuais = poema ? construirEstrofesDoTexto(poema.texto, linhasIgnoradasStr) : [];
    reconciliarItensComEstrofes(unidadesAtuais, estrofesAtuais);
    reconciliarItensComEstrofes(eventosAtuais, estrofesAtuais);
    renderTudo();
}

// Só atualiza o Set (ver detalhesPosicaoAbertos acima) — nunca chama
// renderTudo(), pra não disparar o evento 'toggle' de novo em loop.
// Disparado tanto por clique do usuário no <summary> quanto pelo
// `open` que o próprio renderTudo() já escreveu no HTML — nesse
// segundo caso o valor não muda, então o Set fica igual.
export function onToggleDetalhesPosicaoEstrutura(id, aberto) {
    if (aberto) detalhesPosicaoAbertos.add(id);
    else detalhesPosicaoAbertos.delete(id);
}

// Mesmo padrão acima, agora pro <details> "✏️ Editar" de classificação
// (ver montarEdicaoClassificacaoHtml/atualizarCampoEstrutura abaixo).
export function onToggleEdicaoEstrutura(id, aberto) {
    if (aberto) edicaoAbertos.add(id);
    else edicaoAbertos.delete(id);
}

function encontrarItem(tipo, id) {
    const lista = tipo === 'unidade' ? unidadesAtuais : eventosAtuais;
    return lista.find((i) => i.id === id);
}

// Botão "✏️ Editar" do cartão (item que faltava: só a posição era
// editável depois de criado, o resto — nome/unidadeEstrofica/
// unidadeDiscursiva/progressaoDialetica — não tinha como mudar sem
// excluir e recriar o item). `campo` é um dos 4 nomes de campo válidos
// pro tipo (`nome`/`unidadeEstrofica`/`unidadeDiscursiva` pra Unidade,
// `progressaoDialetica` pra Evento) — chamada só pelo `onchange` dos
// inputs (não a cada tecla), pra não perder o foco a cada
// renderTudo().
export function atualizarCampoEstrutura(tipo, id, campo, valor) {
    const item = encontrarItem(tipo, id);
    if (!item) return;
    item[campo] = (valor || '').trim();
    renderTudo();
}

// Marca/desmarca uma estrofe na posição do item. Passar de 1 pra 2+
// estrofes força versos pra 'todos' (regra 3); passar de volta pra 1
// não reabre seleção fina sozinho — o usuário decide via
// setVersosTodosItem/toggleVersoItem depois.
export function toggleEstrofeItem(tipo, id, numeroEstrofe) {
    const item = encontrarItem(tipo, id);
    if (!item) return;
    const estrofes = item.posicao.estrofes;
    const idx = estrofes.indexOf(numeroEstrofe);
    if (idx === -1) estrofes.push(numeroEstrofe);
    else estrofes.splice(idx, 1);
    if (estrofes.length > 1) item.posicao.versos = 'todos';
    renderTudo();
}

export function setVersosTodosItem(tipo, id, todos) {
    const item = encontrarItem(tipo, id);
    if (!item) return;
    item.posicao.versos = todos ? 'todos' : [];
    renderTudo();
}

export function toggleVersoItem(tipo, id, numeroVerso) {
    const item = encontrarItem(tipo, id);
    if (!item || item.posicao.versos === 'todos') return;
    const versos = Array.isArray(item.posicao.versos) ? item.posicao.versos : [];
    const idx = versos.indexOf(numeroVerso);
    if (idx === -1) versos.push(numeroVerso);
    else versos.splice(idx, 1);
    item.posicao.versos = versos;
    renderTudo();
}

// ─── Renderização ────────────────────────────────────────────────

function montarSeletorPosicaoHtml(tipo, item) {
    if (estrofesAtuais.length === 0) {
        return `<p class="text-xs text-gray-400 dark:text-slate-500 italic mt-2">Escolha um poema com texto pra habilitar o seletor de posição.</p>`;
    }
    const estrofesMarcadas = item.posicao.estrofes;
    const linhasEstrofe = estrofesAtuais
        .map((es) => {
            const marcada = estrofesMarcadas.includes(es.numero);
            const previa = es.versos
                .slice(0, 2)
                .map((v) => escapeHtml(v.texto))
                .join(' / ');
            return `<label class="flex items-center gap-2 text-xs py-0.5">
                <input type="checkbox" ${marcada ? 'checked' : ''}
                    onchange="toggleEstrofeEstrutura('${tipo}', ${item.id}, ${es.numero})">
                Estrofe ${es.numero} <span class="text-gray-400 dark:text-slate-500 truncate">— ${previa}</span>
            </label>`;
        })
        .join('');

    let seletorVerso = '';
    if (estrofesMarcadas.length === 1) {
        const estrofe = estrofesAtuais.find((es) => es.numero === estrofesMarcadas[0]);
        const versosTodos = item.posicao.versos === 'todos';
        const versosMarcados = Array.isArray(item.posicao.versos) ? item.posicao.versos : [];
        const linhasVerso = (estrofe?.versos || [])
            .map(
                (
                    v,
                ) => `<label class="flex items-center gap-2 text-xs py-0.5 ${versosTodos ? 'opacity-40' : ''}">
                    <input type="checkbox" ${versosMarcados.includes(v.numero) ? 'checked' : ''} ${versosTodos ? 'disabled' : ''}
                        onchange="toggleVersoEstrutura('${tipo}', ${item.id}, ${v.numero})">
                    Verso ${v.numero} <span class="text-gray-400 dark:text-slate-500 truncate">— ${escapeHtml(v.texto)}</span>
                </label>`,
            )
            .join('');
        seletorVerso = `<div class="mt-2 pl-4 border-l border-gray-200 dark:border-slate-700">
            <label class="flex items-center gap-2 text-xs font-medium py-0.5">
                <input type="checkbox" ${versosTodos ? 'checked' : ''}
                    onchange="setVersosTodosEstrutura('${tipo}', ${item.id}, this.checked)">
                Todos os versos dessa estrofe
            </label>
            ${linhasVerso}
        </div>`;
    } else if (estrofesMarcadas.length > 1) {
        seletorVerso = `<p class="text-[11px] text-gray-400 dark:text-slate-500 mt-1 italic">Com mais de uma estrofe marcada, a posição cobre todos os versos delas.</p>`;
    }

    const aberto = detalhesPosicaoAbertos.has(item.id);
    return `<details class="mt-2" ${aberto ? 'open' : ''} ontoggle="onToggleDetalhesPosicaoEstrutura(${item.id}, this.open)">
        <summary class="text-xs text-blue-600 dark:text-blue-400 cursor-pointer select-none">Posição — ${resumoPosicao(item.posicao)}</summary>
        <div class="mt-1 pl-2">${linhasEstrofe}${seletorVerso}</div>
    </details>`;
}

// Botão "✏️ Editar" do cartão — mesmo esqueleto de <details> de
// montarSeletorPosicaoHtml (aberto/fechado persistido em
// edicaoAbertos), com os campos de classificação como inputs de texto
// com datalist (mesmos ids do formulário de "Nova Unidade"/"Novo
// Evento" — sugestoes-unidade-estrofica/sugestoes-unidade-discursiva/
// sugestoes-progressao-dialetica). `onchange` (não `oninput`) chamando
// atualizarCampoEstrutura — só recalcula/re-renderiza quando o campo
// perde o foco ou o Enter é confirmado, pra não perder o cursor a cada
// tecla digitada.
function montarEdicaoClassificacaoHtml(tipo, item) {
    const aberto = edicaoAbertos.has(item.id);
    const campos =
        tipo === 'unidade'
            ? `<input type="text" value="${escapeHtml(item.nome || '')}"
                    placeholder="Nome/descrição da camada (opcional)"
                    class="text-xs w-full mb-1.5"
                    onchange="atualizarCampoEstrutura('${tipo}', ${item.id}, 'nome', this.value)">
                <div class="flex gap-1.5">
                    <input type="text" value="${escapeHtml(item.unidadeEstrofica || '')}"
                        list="sugestoes-unidade-estrofica" placeholder="Unidade estrófica"
                        class="text-xs flex-1"
                        onchange="atualizarCampoEstrutura('${tipo}', ${item.id}, 'unidadeEstrofica', this.value)">
                    <input type="text" value="${escapeHtml(item.unidadeDiscursiva || '')}"
                        list="sugestoes-unidade-discursiva" placeholder="Unidade discursiva"
                        class="text-xs flex-1"
                        onchange="atualizarCampoEstrutura('${tipo}', ${item.id}, 'unidadeDiscursiva', this.value)">
                </div>`
            : `<input type="text" value="${escapeHtml(item.progressaoDialetica || '')}"
                    list="sugestoes-progressao-dialetica" placeholder="Progressão dialética"
                    class="text-xs w-full"
                    onchange="atualizarCampoEstrutura('${tipo}', ${item.id}, 'progressaoDialetica', this.value)">`;
    return `<details class="mt-1.5" ${aberto ? 'open' : ''} ontoggle="onToggleEdicaoEstrutura(${item.id}, this.open)">
        <summary class="text-xs text-blue-600 dark:text-blue-400 cursor-pointer select-none">✏️ Editar</summary>
        <div class="mt-1.5 pl-2">${campos}</div>
    </details>`;
}

function montarCartaoHtml(tipo, item, sobrepostos) {
    const sobreposto = sobrepostos.has(item.id);
    // Regra 4 do .md: sinaliza sobreposição sem julgar se é "esperada"
    // ou "atípica" (isso é leitura do Victor) e sem tom de aviso/erro —
    // por isso cinza/slate (não âmbar/vermelho) tanto no anel quanto no
    // selo, que existe só porque um anel sozinho não se explica sem
    // passar o mouse (a reclamação original).
    const destaque = sobreposto
        ? 'ring-1 ring-slate-300 dark:ring-slate-600'
        : 'border border-gray-200 dark:border-slate-700';
    const selo = sobreposto
        ? ` <span class="text-slate-400 dark:text-slate-500" title="A posição deste item se sobrepõe à de outro Unidade/Evento — sobreposição é esperada, não é erro.">⚭ sobreposto</span>`
        : '';
    const classificacao =
        tipo === 'unidade'
            ? [item.unidadeEstrofica, item.unidadeDiscursiva].filter(Boolean).join(' · ')
            : item.progressaoDialetica;
    // Nome (só Unidade) vem primeiro, em destaque — a classificação
    // (unidadeEstrofica · unidadeDiscursiva) fica como subtítulo, igual
    // ao padrão da conversa de referência (nome dado antes de definir
    // as duas unidades — ver comentário de adicionarUnidade acima).
    const nomeHtml =
        tipo === 'unidade' && item.nome
            ? `<div class="text-sm font-semibold">${escapeHtml(item.nome)}</div>`
            : '';
    const titulo = classificacao || (nomeHtml ? '' : '<em>Sem classificação</em>');
    const removerFn = tipo === 'unidade' ? 'removerUnidadeEstrutura' : 'removerEventoEstrutura';
    return `<div class="rounded-md p-2.5 ${destaque}" data-id="${item.id}">
        <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
                ${nomeHtml}
                <div class="text-sm ${nomeHtml ? 'text-gray-500 dark:text-slate-400' : 'font-medium'}">${titulo}</div>
            </div>
            <button type="button" onclick="${removerFn}(${item.id})"
                title="Remover" aria-label="Remover"
                class="text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 text-xs">✕</button>
        </div>
        <div class="text-[11px] text-gray-500 dark:text-slate-400">${resumoPosicao(item.posicao)}${selo}</div>
        ${montarEdicaoClassificacaoHtml(tipo, item)}
        ${montarSeletorPosicaoHtml(tipo, item)}
    </div>`;
}

// Regra 6: ordenado por posição no texto, não posicionados ao final
// numa sublista separada (nunca no início).
function montarListaHtml(tipo, itens, sobrepostos) {
    if (itens.length === 0) {
        const rotulo = tipo === 'unidade' ? 'Unidade' : 'Evento';
        return `<p class="text-xs text-gray-400 dark:text-slate-500 italic">Nenhum${tipo === 'unidade' ? 'a' : ''} ${rotulo.toLowerCase()} cadastrad${tipo === 'unidade' ? 'a' : 'o'} ainda.</p>`;
    }
    const ordenados = ordenarPorPosicao(itens);
    const primeiroNaoPosicionadoIdx = ordenados.findIndex((i) => !itemPosicionado(i.posicao));
    let html = '';
    ordenados.forEach((item, idx) => {
        if (idx === primeiroNaoPosicionadoIdx && idx > 0) {
            html += `<div class="text-[10px] font-bold uppercase text-gray-400 dark:text-slate-500 mt-3 mb-1">Não posicionados</div>`;
        }
        html += montarCartaoHtml(tipo, item, sobrepostos);
    });
    return `<div class="flex flex-col gap-2">${html}</div>`;
}

function renderTudo() {
    const sobrepostos = detectarSobrepostos(unidadesAtuais, eventosAtuais);
    if (containerUnidadesEl)
        containerUnidadesEl.innerHTML = montarListaHtml('unidade', unidadesAtuais, sobrepostos);
    if (containerEventosEl)
        containerEventosEl.innerHTML = montarListaHtml('evento', eventosAtuais, sobrepostos);
}
