// ============================================================
// colunas.js — Configuração de colunas visíveis (e sua ordem)
// nas tabelas de Poemas e Prosas. Cada tabela guarda sua própria
// escolha no localStorage; colunas não listadas aqui (ID/Título
// e Ações) são fixas e sempre aparecem, sempre nas pontas.
// Importado por: render-listas.js, main.js (expõe toggleColuna,
// moverColuna e filtrarColunas)
// ============================================================

import { escapeHtml } from './utils.js';

const LS_PREFIX = 'arquivoPoetico_colunas_';

// Texto de busca do seletor de colunas (ver renderSeletorColunas/
// filtrarColunas abaixo), por tabela — só em memória (não precisa
// sobreviver a um F5, diferente da ordem/ativas salvas no
// localStorage), pra reaparecer preenchido depois de ligar/desligar
// uma coluna via checkbox (o que reconstrói o HTML do painel inteiro,
// ver atualizarPainelColunas em celulas-tabela.js).
const filtrosColunas = {};

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
        {
            key: 'localEscrita',
            label: 'Local de escrita',
            default: false,
            sortType: 'alfabetico',
        },
        {
            key: 'territorialidade',
            label: 'Territorialidade',
            default: false,
            sortType: 'alfabetico',
        },
        // Data de Escrita / Publicação / Época Retratada / Contexto —
        // primeiro bloco do modal, já aberto por padrão.
        { key: 'dataEscrita', label: 'Data de escrita', default: true, sortType: 'data' },
        {
            key: 'dataPublicacao',
            label: 'Data de publicação',
            default: true,
            sortType: 'data',
        },
        {
            key: 'epocaRetratada',
            label: 'Período Biográfico Retratado',
            default: false,
            sortType: 'data',
        },
        {
            key: 'periodoHistoricoId',
            label: 'Período Histórico Retratado',
            default: false,
            sortType: 'alfabetico',
        },
        {
            key: 'movimentosEscolas',
            label: 'Corrente literária',
            default: false,
            sortType: 'alfabetico',
        },
        // Valores efetivos (com a herança do pai) das correntes ligadas ao
        // texto: não são campos gravados no texto.
        {
            key: 'posturaEstetica',
            label: 'Postura estética da corrente',
            default: false,
            sortType: 'alfabetico',
        },
        {
            key: 'programa',
            label: 'Programa da corrente',
            default: false,
            sortType: 'alfabetico',
        },
        {
            key: 'contextoHistorico',
            label: 'Inspiração',
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
        // Temas do texto (por id, com papel ★/☆) — antes só apareciam como
        // badges dentro de Etiquetas.
        { key: 'temas', label: 'Tema', default: false, sortType: 'alfabetico' },
        // Derivado dos Temas do texto (db.assuntos) — não é campo gravado.
        { key: 'assuntos', label: 'Assunto', default: false, sortType: 'alfabetico' },
        // Personagens do texto (grupo "Personagens" do modal, entre Temas e
        // Assuntos e Pessoas): nome, iniciais dos papéis e ★/☆ da centralidade.
        { key: 'personagens', label: 'Personagens', default: false, sortType: 'alfabetico' },
        { key: 'pessoas', label: 'Pessoas', default: false, sortType: 'alfabetico' },
        { key: 'grupos', label: 'Grupos', default: false, sortType: 'alfabetico' },
        // "Fonte" — último grupo do modal antes de "Status e Pendências"
        // (ver modal-poema.html). 'fonte' mostra o nome da fonte (origem),
        // virando link clicável quando o link estiver preenchido (ver
        // celulaFonte em celulas-tabela.js); 'grafia' é a grafia marcada —
        // atual (GRAFIA_ATUAL) ou uma tradição antiga (GRAFIA_ETIMOLOGICA/
        // GRAFIA_QUINHENTISTA, utils.js) — vazio = nunca definida, não
        // "atual". Mesmo critério de "default:
        // false" das colunas menos consultadas no dia a dia — grupo Fonte
        // não entra em Campos Preenchidos nem Estatísticas (ver schema.md).
        { key: 'fonte', label: 'Fonte', default: false, sortType: 'alfabetico' },
        { key: 'grafia', label: 'Grafia', default: false, sortType: 'alfabetico' },
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
        {
            key: 'localEscrita',
            label: 'Local de escrita',
            default: false,
            sortType: 'alfabetico',
        },
        {
            key: 'territorialidade',
            label: 'Territorialidade',
            default: false,
            sortType: 'alfabetico',
        },
        { key: 'dataEscrita', label: 'Data de escrita', default: true, sortType: 'data' },
        {
            key: 'dataPublicacao',
            label: 'Data de publicação',
            default: true,
            sortType: 'data',
        },
        // Item 4: mesmas colunas novas de Poemas, na ordem em que os
        // grupos aparecem no modal de Prosa (ver comentário no topo
        // do arquivo — ordem espelha o modal).
        {
            key: 'epocaRetratada',
            label: 'Período Biográfico Retratado',
            default: false,
            sortType: 'data',
        },
        {
            key: 'periodoHistoricoId',
            label: 'Período Histórico Retratado',
            default: false,
            sortType: 'alfabetico',
        },
        {
            key: 'movimentosEscolas',
            label: 'Corrente literária',
            default: false,
            sortType: 'alfabetico',
        },
        // Valores efetivos (com a herança do pai) das correntes ligadas ao
        // texto: não são campos gravados no texto.
        {
            key: 'posturaEstetica',
            label: 'Postura estética da corrente',
            default: false,
            sortType: 'alfabetico',
        },
        {
            key: 'programa',
            label: 'Programa da corrente',
            default: false,
            sortType: 'alfabetico',
        },
        {
            key: 'contextoHistorico',
            label: 'Inspiração',
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
        // Temas do texto (por id, com papel ★/☆) — antes só apareciam como
        // badges dentro de Etiquetas.
        { key: 'temas', label: 'Tema', default: false, sortType: 'alfabetico' },
        // Derivado dos Temas do texto (db.assuntos) — não é campo gravado.
        { key: 'assuntos', label: 'Assunto', default: false, sortType: 'alfabetico' },
        // Personagens do texto (grupo "Personagens" do modal, entre Temas e
        // Assuntos e Pessoas): nome, iniciais dos papéis e ★/☆ da centralidade.
        { key: 'personagens', label: 'Personagens', default: false, sortType: 'alfabetico' },
        { key: 'pessoas', label: 'Pessoas', default: false, sortType: 'alfabetico' },
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
        // "Fonte" — ver comentário equivalente em poemas[] acima.
        { key: 'fonte', label: 'Fonte', default: false, sortType: 'alfabetico' },
        { key: 'grafia', label: 'Grafia', default: false, sortType: 'alfabetico' },
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

// Ordem padrão de fábrica das colunas ligadas por padrão. Só Poemas e Prosas
// têm uma: Estrutura (Vínculo, em Prosas) vem logo depois de ID/Título, e as
// datas e o Status depois dela. O resto da lista (as colunas desligadas) segue
// a ordem de DEFINICAO_COLUNAS, que espelha o modal. Tabelas sem entrada aqui
// usam a ordem de definição inteira, como sempre.
const ORDEM_PADRAO_INICIAL = {
    poemas: ['estrutura', 'dataEscrita', 'dataPublicacao', 'status'],
    prosas: ['vinculo', 'genero', 'dataEscrita', 'dataPublicacao', 'status'],
};

function ordemPadrao(tabela) {
    const todas = DEFINICAO_COLUNAS[tabela].map((c) => c.key);
    const inicio = (ORDEM_PADRAO_INICIAL[tabela] || []).filter((k) => todas.includes(k));
    return [...inicio, ...todas.filter((k) => !inicio.includes(k))];
}

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

    if (!ordem) ordem = ordemPadrao(tabela);
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

// ─── Padrões personalizados ──────────────────────────────────────
// Cada tabela guarda uma lista de padrões nomeados: { nome, colunas }, onde
// `colunas` são as colunas ligadas na ordem em que aparecem na tabela. Aplicar
// um padrão liga exatamente essas colunas, nessa ordem, e deixa as demais
// desligadas, na ordem em que já estavam.
//
// Onde ficam: este módulo não conhece o banco. Quem o carrega registra um
// armazenamento com `usarArmazenamentoPadroes` (main.js registra o `db`, em
// `db.padroesColunas`, que vai junto no backup JSON, nos snapshots e na
// restauração). Sem registro, cai no localStorage (usado nos testes).
const LS_PREFIX_PADROES = 'arquivoPoetico_colunasPadroes_';
const TAMANHO_MAX_NOME_PADRAO = 40;

const armazenamentoLocal = {
    ler(tabela) {
        try {
            return JSON.parse(localStorage.getItem(LS_PREFIX_PADROES + tabela) || '[]');
        } catch {
            return [];
        }
    },
    gravar(tabela, lista) {
        localStorage.setItem(LS_PREFIX_PADROES + tabela, JSON.stringify(lista));
    },
};
let armazenamentoPadroes = armazenamentoLocal;

// Registra onde os padrões são guardados ({ ler(tabela) → lista, gravar(tabela,
// lista) }) e traz pra lá o que a primeira versão do recurso tinha deixado no
// localStorage do navegador (some de lá depois de copiado; nomes que o novo
// armazenamento já tem não são sobrescritos).
export function usarArmazenamentoPadroes(armazenamento) {
    armazenamentoPadroes = armazenamento || armazenamentoLocal;
    if (armazenamentoPadroes === armazenamentoLocal) return;
    for (const tabela of Object.keys(DEFINICAO_COLUNAS)) {
        let legado;
        try {
            legado = armazenamentoLocal.ler(tabela);
            if (!Array.isArray(legado) || !legado.length) continue;
        } catch {
            continue;
        }
        const atuais = listarPadroesColunas(tabela);
        const novos = legado.filter(
            (p) =>
                p &&
                typeof p.nome === 'string' &&
                Array.isArray(p.colunas) &&
                !atuais.some((a) => mesmoNomePadrao(a.nome, p.nome)),
        );
        if (novos.length) armazenamentoPadroes.gravar(tabela, [...atuais, ...novos]);
        try {
            localStorage.removeItem(LS_PREFIX_PADROES + tabela);
        } catch {
            // sem acesso ao localStorage: o legado só fica lá, sem efeito
        }
    }
}

function normalizarNomePadrao(nome) {
    return String(nome ?? '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, TAMANHO_MAX_NOME_PADRAO);
}

function mesmoNomePadrao(a, b) {
    return a.toLocaleLowerCase('pt-BR') === b.toLocaleLowerCase('pt-BR');
}

// Valida e limpa uma lista vinda de fora (db, backup antigo ou editado à mão).
// Usada também por importarDB, pra um backup mal formado não derrubar o painel.
export function normalizarPadroesColunas(tabela, lista) {
    const def = DEFINICAO_COLUNAS[tabela];
    if (!def || !Array.isArray(lista)) return [];
    const validas = new Set(def.map((c) => c.key));
    const vistos = [];
    const saida = [];
    for (const p of lista) {
        if (!p || typeof p.nome !== 'string' || !Array.isArray(p.colunas)) continue;
        const nome = normalizarNomePadrao(p.nome);
        if (!nome || vistos.some((v) => mesmoNomePadrao(v, nome))) continue;
        vistos.push(nome);
        // chaves que deixaram de existir saem sem quebrar o padrão
        saida.push({ nome, colunas: [...new Set(p.colunas)].filter((k) => validas.has(k)) });
    }
    return saida;
}

export function listarPadroesColunas(tabela) {
    if (!DEFINICAO_COLUNAS[tabela]) return [];
    try {
        return normalizarPadroesColunas(tabela, armazenamentoPadroes.ler(tabela));
    } catch {
        return [];
    }
}

function gravarPadroes(tabela, lista) {
    armazenamentoPadroes.gravar(tabela, lista);
}

// Guarda as colunas visíveis agora sob o nome dado. Mesmo nome (sem diferenciar
// caixa) substitui o padrão existente, na mesma posição da lista.
// Devolve { ok, nome, substituiu } ou { ok: false, motivo }.
export function salvarPadraoColunas(tabela, nome) {
    if (!DEFINICAO_COLUNAS[tabela]) return { ok: false, motivo: 'tabela' };
    const limpo = normalizarNomePadrao(nome);
    if (!limpo) return { ok: false, motivo: 'nome' };

    const lista = listarPadroesColunas(tabela);
    const novo = { nome: limpo, colunas: getColunasAtivas(tabela) };
    const idx = lista.findIndex((p) => mesmoNomePadrao(p.nome, limpo));
    if (idx >= 0) lista[idx] = novo;
    else lista.push(novo);

    gravarPadroes(tabela, lista);
    disparaAlteracao(tabela);
    return { ok: true, nome: limpo, substituiu: idx >= 0 };
}

export function existePadraoColunas(tabela, nome) {
    const limpo = normalizarNomePadrao(nome);
    return listarPadroesColunas(tabela).some((p) => mesmoNomePadrao(p.nome, limpo));
}

export function aplicarPadraoColunas(tabela, nome) {
    if (!DEFINICAO_COLUNAS[tabela]) return false;
    const padrao = listarPadroesColunas(tabela).find((p) => mesmoNomePadrao(p.nome, nome));
    if (!padrao) return false;

    const estado = lerEstado(tabela);
    const resto = estado.ordem.filter((k) => !padrao.colunas.includes(k));
    salvarEstado(tabela, { ordem: [...padrao.colunas, ...resto], ativas: [...padrao.colunas] });
    disparaAlteracao(tabela);
    return true;
}

export function excluirPadraoColunas(tabela, nome) {
    if (!DEFINICAO_COLUNAS[tabela]) return false;
    const lista = listarPadroesColunas(tabela);
    const restante = lista.filter((p) => !mesmoNomePadrao(p.nome, nome));
    if (restante.length === lista.length) return false;
    gravarPadroes(tabela, restante);
    disparaAlteracao(tabela);
    return true;
}

// Nome do padrão que bate com o que está na tela (mesmas colunas, mesma ordem),
// ou null. É assim que o seletor mostra qual padrão está em uso sem guardar
// "padrão atual" em lugar nenhum: mexer numa coluna já o desmarca sozinho.
export function padraoAtivoColunas(tabela) {
    const atuais = getColunasAtivas(tabela);
    const achado = listarPadroesColunas(tabela).find(
        (p) => p.colunas.length === atuais.length && p.colunas.every((k, i) => k === atuais[i]),
    );
    return achado ? achado.nome : null;
}

// Pontas de UI (chamadas pelo painel via window.*, ver main.js).
export function salvarPadraoColunasUI(tabela) {
    const nome = normalizarNomePadrao(
        prompt('Nome do padrão (as colunas e a ordem de agora serão guardadas):') || '',
    );
    if (!nome) return;
    if (
        existePadraoColunas(tabela, nome) &&
        !confirm(`Já existe um padrão chamado "${nome}". Substituir pelas colunas de agora?`)
    )
        return;
    salvarPadraoColunas(tabela, nome);
}

export function excluirPadraoColunasUI(tabela, nome) {
    if (!nome || !confirm(`Excluir o padrão "${nome}"?`)) return;
    excluirPadraoColunas(tabela, nome);
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
// próprio seletor já reflete a ordem escolhida. Tabelas com muitas
// colunas (Poemas/Prosas, hoje ~39/38 — as outras têm no máximo 9)
// ganham um campo de busca acima da lista: filtra pelo rótulo, sem
// precisar rolar pra achar a que quer ligar. `filtrarColunas` (mais
// abaixo) faz o filtro ao vivo, sem reconstruir o HTML — mas o filtro
// já sai aplicado aqui também (linha escondida com `display:none` de
// cara), porque ligar/desligar uma coluna reconstrói o painel inteiro
// (ver atualizarPainelColunas) e o texto buscado precisa continuar
// filtrando depois disso, não só até o próximo clique.
export function renderSeletorColunas(tabela) {
    const def = DEFINICAO_COLUNAS[tabela];
    if (!def) return '';

    const rotulos = Object.fromEntries(def.map((c) => [c.key, c.label]));
    const { ordem, ativas } = lerEstado(tabela);
    const setAtivas = new Set(ativas);
    const filtro = (filtrosColunas[tabela] || '').trim().toLowerCase();

    const busca =
        def.length > 10
            ? `
        <input type="text" value="${escapeHtml(filtrosColunas[tabela] || '')}"
            oninput="filtrarColunas('${tabela}', this.value)"
            placeholder="Buscar coluna…" aria-label="Buscar coluna"
            class="w-full text-[11px] border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800 dark:text-slate-200 px-2 py-1.5 mb-1.5 placeholder:text-gray-400 dark:placeholder:text-slate-500">`
            : '';

    const padroes = listarPadroesColunas(tabela);
    const padraoAtivo = padraoAtivoColunas(tabela);
    const seletorPadroes = `
            <div class="flex items-center gap-2 mt-2">
                ${
                    padroes.length
                        ? `<select aria-label="Padrões de colunas salvos"
                    onchange="aplicarPadraoColunas('${tabela}', this.value)"
                    class="min-w-0 max-w-[14rem] flex-1 text-[11px] border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800 dark:text-slate-200 px-1.5 py-1">
                    <option value="" ${padraoAtivo ? '' : 'selected'} disabled>Meus padrões…</option>
                    ${padroes
                        .map(
                            (p) =>
                                `<option value="${escapeHtml(p.nome)}" ${p.nome === padraoAtivo ? 'selected' : ''}>${escapeHtml(p.nome)}</option>`,
                        )
                        .join('')}
                </select>`
                        : `<span class="text-[10px] text-gray-400 dark:text-slate-500">Nenhum padrão salvo</span>`
                }
                <button type="button" onclick="salvarPadraoColunasUI('${tabela}')"
                    title="Guarda as colunas ligadas agora, na ordem atual, como um padrão que dá pra reaplicar depois"
                    class="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap">
                    Salvar como padrão
                </button>
                ${
                    padraoAtivo
                        ? `<button type="button" data-nome="${escapeHtml(padraoAtivo)}"
                    onclick="excluirPadraoColunasUI('${tabela}', this.dataset.nome)"
                    title="Exclui o padrão em uso (as colunas na tela não mudam)"
                    class="text-[10px] font-semibold text-red-600 dark:text-red-400 hover:underline whitespace-nowrap">
                    Excluir padrão
                </button>`
                        : ''
                }
            </div>`;

    // Cabeçalho fixo no topo do painel (busca + ações em massa + padrões) — fica
    // visível mesmo com a lista rolando por baixo, já que o painel
    // inteiro tem altura limitada (max-h-[55vh] em painel-colunas-*
    // no index.html).
    const cabecalho = `
        <div class="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 px-3 pt-3 pb-2 border-b border-gray-200 dark:border-slate-600">
            ${busca}
            <div class="flex items-center gap-3">
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
            </div>
            ${seletorPadroes}
        </div>`;

    const nenhumaEncontrada =
        !!filtro && ordem.every((key) => !rotulos[key].toLowerCase().includes(filtro));

    // `sm:grid` (não `columns-2`/CSS multi-column) de propósito: colunas
    // CSS ("magazine columns") dentro de um ancestral com altura
    // limitada + rolagem (max-h-[55vh] overflow-y-auto no painel, ver
    // index.html) calculam mal o balanceamento de altura em alguns
    // navegadores — sobra uma coluna baixa com espaço vazio embaixo
    // enquanto a outra some/estica sem previsibilidade (foi o que o
    // Victor viu no desktop). Grid não sofre desse problema: distribui
    // item a item, linha a linha, sem tentar "adivinhar" altura.
    const linhasArray = ordem.map((key, i) => {
        const rotuloBusca = rotulos[key].toLowerCase();
        const escondida = filtro && !rotuloBusca.includes(filtro);
        return `
        <div data-rotulo="${escapeHtml(rotuloBusca)}" ${escondida ? 'style="display:none"' : ''}
            class="flex items-start gap-1 text-xs py-1 px-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
            <div class="flex flex-col leading-none mr-1 pt-0.5">
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
        </div>`;
    });
    const linhas = linhasArray.join('');

    const semResultado = `
        <div id="sem-resultado-colunas-${tabela}" ${nenhumaEncontrada ? '' : 'style="display:none"'}
            class="text-[11px] text-gray-400 dark:text-slate-500 py-1 px-1">
            Nenhuma coluna encontrada.
        </div>`;

    // Lista em grid a partir de telas pequenas/médias em diante — com
    // ~39 colunas (Poemas/Prosas), uma coluna só ficava enorme e
    // obrigava a rolar bastante (pedido original do Victor). Painéis
    // com poucas colunas (def.length <= 10) continuam numa lista só.
    //
    // O painel deixou de ser um overlay largo (até 1600px, baseado em
    // vw) e virou um bloco no fluxo normal da página, com no máximo a
    // largura do `main` (max-w-6xl, ~1152px) — trade-off deliberado
    // pra empurrar a tabela em vez de cobrir ela (Victor queria ver a
    // tabela mudando em tempo real). Por isso o teto aqui é 4 colunas
    // (xl), não mais 5/6: acima disso, com a largura real disponível,
    // cada coluna ficaria estreita demais pro rótulo + checkbox.
    const classeLista =
        def.length > 10 ? 'sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-x-4' : '';

    return (
        cabecalho +
        `<div class="px-3 pt-2 pb-3">
            <div id="lista-colunas-${tabela}" class="${classeLista}">${linhas}</div>
            ${semResultado}
        </div>`
    );
}

// Filtro ao vivo do seletor de colunas (campo de busca em
// renderSeletorColunas acima): esconde/mostra cada linha pelo rótulo,
// sem reconstruir o painel — digitar não perde o scroll nem pisca a
// lista. Guarda o texto em `filtrosColunas` só pra sobreviver ao
// próximo re-render do painel (ligar/desligar uma coluna via
// checkbox), não pra persistir entre sessões.
export function filtrarColunas(tabela, valor) {
    filtrosColunas[tabela] = valor;
    const termo = valor.trim().toLowerCase();
    const lista = document.getElementById(`lista-colunas-${tabela}`);
    if (!lista) return;

    let algumaVisivel = false;
    lista.querySelectorAll('[data-rotulo]').forEach((linha) => {
        const bate = !termo || linha.dataset.rotulo.includes(termo);
        linha.style.display = bate ? '' : 'none';
        if (bate) algumaVisivel = true;
    });

    const semResultado = document.getElementById(`sem-resultado-colunas-${tabela}`);
    if (semResultado) semResultado.style.display = algumaVisivel || !termo ? 'none' : '';
}
