// ============================================================
// colunas.js — Configuração de colunas visíveis (e sua ordem)
// nas tabelas de Poemas e Prosas. Cada tabela guarda sua própria
// escolha no localStorage; colunas não listadas aqui (ID/Título
// e Ações) são fixas e sempre aparecem, sempre nas pontas.
// Importado por: render-listas.js, main.js (expõe toggleColuna
// e moverColuna)
// ============================================================

const LS_PREFIX = 'arquivoPoetico_colunas_';

// Ordem de definição = ordem padrão de exibição (usada só até o
// usuário reordenar manualmente pelo seletor — a partir daí quem
// manda é a ordem salva no localStorage, ver lerEstado()). A ordem
// abaixo espelha a ordem dos campos no próprio modal de edição (ver
// modal-poema.html/modal-prosa.html — mesma sequência de <details>
// de cima pra baixo), pra quem já conhece o formulário reconhecer o
// mesmo fluxo no seletor de colunas, em vez de uma lista que só foi
// crescendo por ordem de chegada da feature. `default: true` são as
// colunas que já existiam antes desse recurso (mantidas ativas de
// cara); as demais começam desligadas.
// `sortType` é só documentação (a escolha do comparador em runtime é pela
// key, ver COMPARADORES_ORDENACAO em render-listas.js) — mas ajuda a saber
// de cara que critério cada coluna usa, agora que as duas tabelas têm
// cabeçalho clicável (ver thOrdenavel() em celulas-tabela.js):
//   'estrutura'  — ordem padrão (array já vem nessa ordem; desc = invertida)
//   'data'       — cronológica (ano/mês/dia, com data parcial/ausente por último)
//   'alfabetico' — texto (localeCompare pt-BR, vazio por último)
//   'status'     — pelos três estados possíveis, ver ORDEM_STATUS
//   'numero'     — numérica direta (ex.: Campos Preenchidos)
export const DEFINICAO_COLUNAS = {
    poemas: [
        // Campo simples logo abaixo de Título/Sequência no modal.
        { key: 'idioma', label: 'Idioma', default: false, sortType: 'alfabetico' },
        // Data de Escrita / Publicação / Época Retratada / Contexto —
        // primeiro bloco do modal, já aberto por padrão.
        { key: 'dataEscrita', label: 'Escrito em', default: true, sortType: 'data' },
        { key: 'dataPublicacao', label: 'Publicação', default: true, sortType: 'data' },
        { key: 'epocaRetratada', label: 'Época Retratada', default: false, sortType: 'data' },
        {
            key: 'contextoHistorico',
            label: 'Contexto Histórico/Pessoal',
            default: false,
            sortType: 'alfabetico',
        },
        // Notas — logo depois do campo Texto no modal.
        { key: 'notas', label: 'Notas', default: false, sortType: 'alfabetico' },
        // Autoria — chip logo abaixo de Notas no modal (Autor/Coautor).
        { key: 'autoria', label: 'Autoria', default: false },
        // Envios e Reações — item 7, quando/pra quem o texto foi enviado.
        { key: 'envios', label: 'Envios', default: false },
        // Reconhecimentos — item 8, prêmios/menções recebidos pelo texto.
        { key: 'reconhecimentos', label: 'Reconhecimentos', default: false },
        // Autoavaliação — grupo novo, logo depois de Reconhecimentos no modal.
        { key: 'autoavaliacao', label: 'Autoavaliação', default: false, sortType: 'alfabetico' },
        // Autoclassificação — corações (0,5 a 5), dentro do mesmo grupo do
        // modal, logo acima do campo de texto livre Autoavaliação.
        {
            key: 'autoclassificacao',
            label: 'Autoclassificação',
            default: false,
            sortType: 'numero',
        },
        // "Livros e destino" — vínculo estrutural.
        { key: 'estrutura', label: 'Estrutura', default: true, sortType: 'estrutura' },
        // "Intratextualidade" (Elos + Ecos).
        { key: 'elos', label: 'Elos', default: false, sortType: 'alfabetico' },
        { key: 'ecos', label: 'Ecos', default: false, sortType: 'alfabetico' },
        // "Intertextualidade e Referências".
        {
            key: 'intertextualidade',
            label: 'Intertextualidade',
            default: false,
            sortType: 'alfabetico',
        },
        {
            key: 'hipertextualidade',
            label: 'Hipertextualidade',
            default: false,
            sortType: 'alfabetico',
        },
        {
            key: 'referenciasExternas',
            label: 'Referências',
            default: false,
            sortType: 'alfabetico',
        },
        // "Anexos".
        { key: 'anexos', label: 'Anexos', default: false, sortType: 'alfabetico' },
        {
            key: 'anexosNotaGeral',
            label: 'Nota Anexos',
            default: false,
            sortType: 'alfabetico',
        },
        // "Anotações marginais e descrição visual".
        {
            key: 'anotacoesMarginais',
            label: 'Anotações Marginais',
            default: false,
            sortType: 'alfabetico',
        },
        {
            key: 'descricaoVisual',
            label: 'Descrição Visual',
            default: false,
            sortType: 'alfabetico',
        },
        // "Ocultação e conteúdo sensível".
        { key: 'ocultacao', label: 'Ocultação', default: false, sortType: 'alfabetico' },
        {
            key: 'conteudoSensivel',
            label: 'Conteúdo Sensível',
            default: false,
            sortType: 'alfabetico',
        },
        {
            key: 'vocabularioHiperacionante',
            label: 'Vocabulário Hiperacionante',
            default: false,
            sortType: 'alfabetico',
        },
        // "Sinalizações e dedicatória" — sinalizações + pessoas (+ Grupos,
        // que é característica da pessoa, ver criarGrupoDePessoas em
        // editor.js — não tem seção própria no modal, mas mora aqui por
        // andar sempre junto de Pessoas).
        { key: 'etiquetas', label: 'Etiquetas', default: false, sortType: 'alfabetico' },
        { key: 'pessoas', label: 'Pessoas', default: true, sortType: 'alfabetico' },
        { key: 'grupos', label: 'Grupos', default: false, sortType: 'alfabetico' },
        // "Status e Pendências".
        { key: 'status', label: 'Status', default: true, sortType: 'status' },
        { key: 'cortadoDe', label: 'Cortado de', default: false, sortType: 'alfabetico' },
        { key: 'lancadoEm', label: 'Lançado em', default: false, sortType: 'alfabetico' },
        {
            key: 'justificativaMigracao',
            label: 'Justificativa da Migração',
            default: false,
            sortType: 'alfabetico',
        },
        { key: 'pendencia', label: 'Pendência', default: false, sortType: 'alfabetico' },
        { key: 'descarte', label: 'Descarte', default: false, sortType: 'alfabetico' },
        // Não corresponde a nenhum campo do modal — é uma métrica derivada
        // (ver contarCamposPreenchidos em exportar-md.js), por isso mora no
        // fim da lista em vez de emparelhada com alguma seção do formulário.
        // Útil pra identificar rapidamente os textos com estrutura mais
        // rica/complexa (mais campos preenchidos) sem abrir cada um.
        {
            key: 'camposPreenchidos',
            label: 'Campos Preenchidos',
            default: false,
            sortType: 'numero',
        },
        // Também não corresponde a campo do modal — o id real do item no
        // banco (p.id), diferente da "sequência" que já aparece fixa na
        // coluna ID/Título (essa é posição na estrutura, reordenável, não
        // identifica o item de forma estável). Esse id nunca tinha por
        // que aparecer na UI, mas passou a "vazar" pra fora da tabela toda
        // vez que outra coisa referencia o Poema por id (ex.: selo
        // "Promovido a Poema #..." do Molde, Elos/Referências, Sonoridade)
        // — coluna opcional pra poder conferir contra esses ids sem sair
        // da tabela. Desligada por padrão, mesmo critério das colunas
        // menos consultadas no dia a dia acima.
        { key: 'idSistema', label: 'ID do Sistema', default: false, sortType: 'numero' },
        // Também não correspondem a campo do modal — duas numerações de
        // linha com regras diferentes (ver getListaVisivelPoemas em
        // render-listas.js): 'contagemTipo' conta 1..N na ordem da
        // estrutura do livro (paiTipo/paiId), sempre, mesmo ordenando a
        // tabela por outra coluna — e reinicia em 1 quando um livro é
        // selecionado no filtro, contando só os poemas daquele livro.
        // 'contagemLinha' conta 1..N na ordem de exibição atual (a que a
        // ordenação escolhida produziu) — não tem sortType porque ordenar
        // por ela não faz sentido (o valor É a posição de exibição atual).
        {
            key: 'contagemTipo',
            label: 'Contagem de Poemas',
            default: false,
            sortType: 'numero',
        },
        { key: 'contagemLinha', label: 'Contagem de Linhas', default: false },
    ],
    prosas: [
        { key: 'idioma', label: 'Idioma', default: false, sortType: 'alfabetico' },
        { key: 'dataEscrita', label: 'Data', default: true, sortType: 'data' },
        { key: 'dataPublicacao', label: 'Publicação', default: true, sortType: 'data' },
        // Item 4: mesmas colunas novas de Poemas, na ordem em que os
        // grupos aparecem no modal de Prosa (ver comentário no topo
        // do arquivo — ordem espelha o modal).
        { key: 'epocaRetratada', label: 'Época Retratada', default: false, sortType: 'data' },
        {
            key: 'contextoHistorico',
            label: 'Contexto Histórico/Pessoal',
            default: false,
            sortType: 'alfabetico',
        },
        // 'vinculo' é o mesmo dado estrutural (paiTipo/paiId nos 3 níveis
        // Livro/Parte/Seção) que 'estrutura' representa em Poemas — mesmo
        // sortType 'estrutura' (ordem já vem assim do array-base, ver
        // sortProsas em db.js; desc = invertida), só o rótulo muda.
        { key: 'vinculo', label: 'Vínculo', default: true, sortType: 'estrutura' },
        { key: 'genero', label: 'Gênero', default: true, sortType: 'alfabetico' },
        { key: 'etiquetas', label: 'Etiquetas', default: false, sortType: 'alfabetico' },
        { key: 'pessoas', label: 'Pessoas', default: true, sortType: 'alfabetico' },
        { key: 'grupos', label: 'Grupos', default: false, sortType: 'alfabetico' },
        { key: 'notas', label: 'Notas', default: false, sortType: 'alfabetico' },
        { key: 'autoria', label: 'Autoria', default: false },
        { key: 'envios', label: 'Envios', default: false },
        { key: 'reconhecimentos', label: 'Reconhecimentos', default: false },
        // Autoavaliação — grupo novo, logo depois de Reconhecimentos no modal.
        { key: 'autoavaliacao', label: 'Autoavaliação', default: false, sortType: 'alfabetico' },
        // Autoclassificação — corações (0,5 a 5), dentro do mesmo grupo do
        // modal, logo acima do campo de texto livre Autoavaliação.
        {
            key: 'autoclassificacao',
            label: 'Autoclassificação',
            default: false,
            sortType: 'numero',
        },
        // "Intratextualidade" (Elos + Ecos).
        { key: 'elos', label: 'Elos', default: false, sortType: 'alfabetico' },
        { key: 'ecos', label: 'Ecos', default: false, sortType: 'alfabetico' },
        // "Intertextualidade e Referências".
        {
            key: 'intertextualidade',
            label: 'Intertextualidade',
            default: false,
            sortType: 'alfabetico',
        },
        {
            key: 'hipertextualidade',
            label: 'Hipertextualidade',
            default: false,
            sortType: 'alfabetico',
        },
        {
            key: 'referenciasExternas',
            label: 'Referências',
            default: false,
            sortType: 'alfabetico',
        },
        // "Anexos".
        { key: 'anexos', label: 'Anexos', default: false, sortType: 'alfabetico' },
        {
            key: 'anexosNotaGeral',
            label: 'Nota Anexos',
            default: false,
            sortType: 'alfabetico',
        },
        // "Ocultação e conteúdo sensível".
        { key: 'ocultacao', label: 'Ocultação', default: false, sortType: 'alfabetico' },
        {
            key: 'conteudoSensivel',
            label: 'Conteúdo Sensível',
            default: false,
            sortType: 'alfabetico',
        },
        {
            key: 'vocabularioHiperacionante',
            label: 'Vocabulário Hiperacionante',
            default: false,
            sortType: 'alfabetico',
        },
        // "Status e Pendências".
        { key: 'status', label: 'Status', default: true, sortType: 'status' },
        { key: 'cortadoDe', label: 'Cortado de', default: false, sortType: 'alfabetico' },
        { key: 'lancadoEm', label: 'Lançado em', default: false, sortType: 'alfabetico' },
        {
            key: 'justificativaMigracao',
            label: 'Justificativa da Migração',
            default: false,
            sortType: 'alfabetico',
        },
        { key: 'pendencia', label: 'Pendência', default: false, sortType: 'alfabetico' },
        { key: 'descarte', label: 'Descarte', default: false, sortType: 'alfabetico' },
        // Ver comentário equivalente em poemas[] acima.
        {
            key: 'camposPreenchidos',
            label: 'Campos Preenchidos',
            default: false,
            sortType: 'numero',
        },
        // Ver comentário equivalente (idSistema) em poemas[] acima.
        { key: 'idSistema', label: 'ID do Sistema', default: false, sortType: 'numero' },
        // Ver comentário equivalente em poemas[] acima.
        {
            key: 'contagemTipo',
            label: 'Contagem de Prosas',
            default: false,
            sortType: 'numero',
        },
        { key: 'contagemLinha', label: 'Contagem de Linhas', default: false },
    ],
    // Aba Sonoridade — colunas dinâmicas geradas a partir dos 6 campos de
    // classificação da Escansão (ver Aba_Sonoridade.md, seção 4.2, e
    // FORMAS_POEMA/etc. em utils.js), mais Pé Métrico (campo adicionado
    // depois, ver comentário em db.js). ID/Título e Ações são fixas (não
    // entram aqui — mesmo padrão de poemas/prosas acima). Os 4 primeiros
    // (na ordem do exemplo do spec, seção 2) já vêm ligados por padrão;
    // Tamanho do Verso, Origem/Tradição e Pé Métrico começam desligados,
    // como as colunas menos consultadas no dia a dia em poemas/prosas.
    sonoridade: [
        { key: 'formaPoema', label: 'Forma', default: true, sortType: 'alfabetico' },
        {
            key: 'regularidadeMetrica',
            label: 'Regularidade Métrica',
            default: true,
            sortType: 'alfabetico',
        },
        { key: 'esquemaRimas', label: 'Esquema de Rimas', default: true, sortType: 'alfabetico' },
        { key: 'registro', label: 'Registro', default: true, sortType: 'alfabetico' },
        { key: 'tom', label: 'Tom', default: true, sortType: 'alfabetico' },
        { key: 'tamanhoVerso', label: 'Tamanho do Verso', default: false, sortType: 'alfabetico' },
        {
            key: 'origemTradicao',
            label: 'Origem e Tradição',
            default: false,
            sortType: 'alfabetico',
        },
        { key: 'peMetrico', label: 'Pé Métrico', default: false, sortType: 'alfabetico' },
    ],
    // Aba Morfofuncionalidade — só as 2 colunas de conteúdo (Unidades e
    // Eventos), as duas ligadas por padrão (mesmo comportamento de
    // sempre visíveis que a tabela já tinha antes deste seletor
    // existir). ID/Título e Ações são fixas, mesmo padrão de
    // poemas/prosas/sonoridade acima. Sem sortType — a leva anterior
    // decidiu não ter cabeçalho ordenável nesta tabela (ver
    // progressao-morfofuncional.md), então thOrdenavel não é usado
    // aqui (ver renderEstruturaTextual em render-listas.js, cabeçalho
    // montado à mão como o de Sonoridade).
    'estrutura-textual': [
        { key: 'unidades', label: 'Unidades', default: true },
        { key: 'eventos', label: 'Eventos', default: true },
    ],
    // Aba Criação (Moldes) — os mesmos 7 campos de classificação do
    // Bloco 1 (reaproveita FORMAS_POEMA/etc., ver comentário em db.js),
    // ligados por padrão: são as colunas que a tabela já tinha fixas
    // antes deste seletor existir (mesmo critério de 'estrutura-textual'
    // acima). Pé Métrico (campo adicionado depois) entra desligado por
    // padrão, mesmo critério usado em 'sonoridade' acima. Status
    // (em andamento/promovido, ver migrarCamposBloco3Molde em db.js) não
    // é campo de classificação, mas é opcional como os outros e ligado
    // por padrão — é a mesma informação que o ícone de "Promover" na
    // coluna Ações já sinaliza, só que em texto. ID/Título e Ações
    // continuam fixas.
    moldes: [
        { key: 'status', label: 'Status', default: true, sortType: 'alfabetico' },
        { key: 'formaPoema', label: 'Forma do Poema', default: true, sortType: 'alfabetico' },
        {
            key: 'regularidadeMetrica',
            label: 'Regularidade Métrica',
            default: true,
            sortType: 'alfabetico',
        },
        { key: 'tamanhoVerso', label: 'Tamanho do Verso', default: true, sortType: 'alfabetico' },
        { key: 'esquemaRimas', label: 'Esquema de Rimas', default: true, sortType: 'alfabetico' },
        {
            key: 'origemTradicao',
            label: 'Origem e Tradição',
            default: true,
            sortType: 'alfabetico',
        },
        { key: 'registro', label: 'Registro', default: true, sortType: 'alfabetico' },
        { key: 'tom', label: 'Tom', default: true, sortType: 'alfabetico' },
        { key: 'peMetrico', label: 'Pé Métrico', default: false, sortType: 'alfabetico' },
    ],
};

// Lê o estado salvo ({ ordem, ativas }) e sempre devolve algo íntegro:
// `ordem` contém TODAS as colunas definidas (ativas ou não — a ordem
// entre as desligadas importa pra quando forem religadas depois), sem
// duplicar nem faltar nenhuma; `ativas` é o subconjunto ligado.
function lerEstado(tabela) {
    const def = DEFINICAO_COLUNAS[tabela];
    if (!def) return { ordem: [], ativas: [] };

    const todasChaves = def.map((c) => c.key);
    const chavesValidas = new Set(todasChaves);

    let ordem = null,
        ativas = null;
    const raw = localStorage.getItem(LS_PREFIX + tabela);
    if (raw) {
        try {
            const salvo = JSON.parse(raw);
            if (salvo && Array.isArray(salvo.ordem) && Array.isArray(salvo.ativas)) {
                ordem = salvo.ordem.filter((k) => chavesValidas.has(k));
                ativas = salvo.ativas.filter((k) => chavesValidas.has(k));
            }
        } catch {
            // JSON inválido — cai pro padrão abaixo
        }
    }

    if (!ordem) ordem = [...todasChaves];
    if (!ativas) ativas = def.filter((c) => c.default).map((c) => c.key);

    // Colunas novas (adicionadas a DEFINICAO_COLUNAS depois de já existir
    // uma escolha salva no navegador) entram no fim da ordem, desligadas.
    todasChaves.forEach((k) => {
        if (!ordem.includes(k)) ordem.push(k);
    });

    return { ordem, ativas };
}

function salvarEstado(tabela, estado) {
    localStorage.setItem(LS_PREFIX + tabela, JSON.stringify(estado));
}

function disparaAlteracao(tabela) {
    window.dispatchEvent(new CustomEvent('colunas:alteradas', { detail: { tabela } }));
}

// Colunas ativas, na ordem escolhida pelo usuário — é essa ordem que
// vale tanto pro cabeçalho quanto pras células da tabela.
export function getColunasAtivas(tabela) {
    const { ordem, ativas } = lerEstado(tabela);
    const setAtivas = new Set(ativas);
    return ordem.filter((k) => setAtivas.has(k));
}

export function isColunaAtiva(tabela, key) {
    return getColunasAtivas(tabela).includes(key);
}

// Marca/desmarca todas as colunas de uma vez (mantendo a ordem já salva) —
// uma única escrita e um único disparo de evento, ao contrário de chamar
// toggleColuna em loop.
export function selecionarTodasColunas(tabela) {
    if (!DEFINICAO_COLUNAS[tabela]) return;

    const estado = lerEstado(tabela);
    estado.ativas = [...estado.ordem];

    salvarEstado(tabela, estado);
    disparaAlteracao(tabela);
}

export function desmarcarTodasColunas(tabela) {
    if (!DEFINICAO_COLUNAS[tabela]) return;

    const estado = lerEstado(tabela);
    estado.ativas = [];

    salvarEstado(tabela, estado);
    disparaAlteracao(tabela);
}

// Descarta a personalização salva (ordem reordenada + colunas ligadas/desligadas
// manualmente) e volta pro padrão de fábrica — mesmas colunas com default: true,
// na ordem de definição. Basta apagar a chave do localStorage: lerEstado() já
// recalcula ordem/ativas do zero a partir de DEFINICAO_COLUNAS sempre que não
// encontra nada salvo (mesmo caminho usado pra JSON ausente/corrompido).
export function resetarColunas(tabela) {
    if (!DEFINICAO_COLUNAS[tabela]) return;

    localStorage.removeItem(LS_PREFIX + tabela);
    disparaAlteracao(tabela);
}

// Alterna uma coluna e dispara 'colunas:alteradas' pra quem estiver
// escutando (render-listas.js) re-renderizar a tabela em questão.
// Não mexe na ordem — só liga/desliga dentro dela.
export function toggleColuna(tabela, key, ativo) {
    if (!DEFINICAO_COLUNAS[tabela]) return;

    const estado = lerEstado(tabela);
    const setAtivas = new Set(estado.ativas);
    if (ativo) setAtivas.add(key);
    else setAtivas.delete(key);
    estado.ativas = estado.ordem.filter((k) => setAtivas.has(k));

    salvarEstado(tabela, estado);
    disparaAlteracao(tabela);
}

// Troca a posição de uma coluna com a vizinha (acima/abaixo na ordem
// atual) — mesmo padrão de moverLivro() em render-listas.js.
export function moverColuna(tabela, key, direcao) {
    if (!DEFINICAO_COLUNAS[tabela]) return;

    const estado = lerEstado(tabela);
    const idx = estado.ordem.indexOf(key);
    if (idx === -1) return;

    const alvo = direcao === 'up' ? idx - 1 : idx + 1;
    if (alvo < 0 || alvo >= estado.ordem.length) return;

    [estado.ordem[idx], estado.ordem[alvo]] = [estado.ordem[alvo], estado.ordem[idx]];

    salvarEstado(tabela, estado);
    disparaAlteracao(tabela);
}

// Monta o HTML do painel de checkboxes + setinhas de reordenar (usado
// dentro do popover "Colunas ▾"). A ordem de exibição das linhas do
// próprio seletor já reflete a ordem escolhida.
export function renderSeletorColunas(tabela) {
    const def = DEFINICAO_COLUNAS[tabela];
    if (!def) return '';

    const rotulos = Object.fromEntries(def.map((c) => [c.key, c.label]));
    const { ordem, ativas } = lerEstado(tabela);
    const setAtivas = new Set(ativas);

    const acoesEmMassa = `
        <div class="flex gap-3 mb-1 pb-1.5 border-b border-gray-200 dark:border-slate-600">
            <button type="button" onclick="selecionarTodasColunas('${tabela}')"
                class="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                Marcar todas
            </button>
            <button type="button" onclick="desmarcarTodasColunas('${tabela}')"
                class="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                Desmarcar todas
            </button>
            <button type="button" onclick="resetarColunas('${tabela}')"
                title="Volta pras colunas e pra ordem padrão, descartando a personalização"
                class="text-[10px] font-semibold text-gray-500 dark:text-slate-400 hover:underline ml-auto">
                Restaurar padrão
            </button>
        </div>`;

    return (
        acoesEmMassa +
        ordem
            .map(
                (key, i) => `
        <div class="flex items-center gap-1 text-xs py-1 px-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 whitespace-nowrap">
            <div class="flex flex-col leading-none mr-1">
                <button type="button" onclick="moverColuna('${tabela}', '${key}', 'up')" ${i === 0 ? 'disabled' : ''}
                    class="text-[9px] text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-20 disabled:hover:text-gray-400"
                    title="Mover para cima">▲</button>
                <button type="button" onclick="moverColuna('${tabela}', '${key}', 'down')" ${i === ordem.length - 1 ? 'disabled' : ''}
                    class="text-[9px] text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-20 disabled:hover:text-gray-400"
                    title="Mover para baixo">▼</button>
            </div>
            <label class="flex items-center gap-2 py-0.5 px-1 cursor-pointer">
                <input type="checkbox" ${setAtivas.has(key) ? 'checked' : ''}
                    onchange="toggleColuna('${tabela}', '${key}', this.checked)">
                ${rotulos[key]}
            </label>
        </div>`,
            )
            .join('')
    );
}
