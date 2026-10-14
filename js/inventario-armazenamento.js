// Inventário do que o app guarda no navegador (Fase 13, etapa 13-0).
//
// Módulo só de dados, sem DOM e sem importações. Existe para a futura função
// "Esvaziar o acervo" (etapas 13a em diante) saber o que cada chave é:
//
//   dado        o que a pessoa escreveu ou cadastrou (vai embora com a caixa "Dados")
//   preferencia como a pessoa configurou o app (caixa "Preferências")
//   pre-pronto  cadastro de fábrica, com lista de ocultos (caixa "Cadastros pré-prontos")
//   estado      controle interno, nem dado nem preferência
//   retrato     cópia de segurança automática (fica sempre, ver F13-D5)
//
// O teste `tests/inventario-armazenamento.test.js` lê o código-fonte e falha
// se aparecer chave `arquivoPoetico_*`, banco IndexedDB ou chave de nível
// superior do `db` sem classificação aqui. Chave nova: acrescente uma linha
// na lista certa, com a categoria e uma nota curta.

export const CATEGORIAS = Object.freeze({
    DADO: 'dado',
    PREFERENCIA: 'preferencia',
    PRE_PRONTO: 'pre-pronto',
    ESTADO: 'estado',
    RETRATO: 'retrato',
});

const VALIDAS = new Set(Object.values(CATEGORIAS));

// Chaves de dado que outros módulos precisam nomear (13a, 13b).
// Ficam aqui para o literal existir em um lugar só, que o teste não varre.
export const CHAVE_ACERVO = 'arquivoPoetico_v3';
export const CHAVE_VERSOES_FILTRADAS = 'arquivoPoetico_versoesFiltradas_v1';

// Chaves exatas do localStorage.
export const CHAVES_LOCALSTORAGE = Object.freeze([
    { chave: 'arquivoPoetico_v3', categoria: 'dado', nota: 'O acervo inteiro (db) serializado' },
    {
        chave: 'arquivoPoetico_versoesFiltradas_v1',
        categoria: 'dado',
        nota: 'Versões alternativas (filtrar.html). Texto escrito pela pessoa e FORA do JSON de backup; ver F13-D7',
    },
    {
        chave: 'arquivoPoetico_tagsFiltro_v1',
        categoria: 'preferencia',
        nota: 'Lista de tags usada pela tela filtrar.html',
    },
    {
        chave: 'arquivoPoetico_ultimoBackup',
        categoria: 'estado',
        nota: 'Data do último backup baixado (ver F13-D5)',
    },
    {
        chave: 'arquivoPoetico_tema',
        categoria: 'preferencia',
        nota: 'Modo claro, escuro ou automático',
    },
    {
        chave: 'arquivoPoetico_itensPorPagina',
        categoria: 'preferencia',
        nota: 'Itens por página nas tabelas',
    },
    {
        chave: 'arquivoPoetico_incluirCapasBackup',
        categoria: 'preferencia',
        nota: 'Caixa "capas" do Baixar JSON',
    },
    {
        chave: 'arquivoPoetico_incluirDadosPessoaisPessoas',
        categoria: 'preferencia',
        nota: 'Incluir dados pessoais das Pessoas nos JSON',
    },
    {
        chave: 'arquivoPoetico_incluirOcultosExportacao',
        categoria: 'preferencia',
        nota: 'Estado da caixa "Incluir dados ocultados" (só existe com "lembrar" ligado)',
    },
    {
        chave: 'arquivoPoetico_incluirOcultosLembrar',
        categoria: 'preferencia',
        nota: 'Escolha de guardar ou não a caixa "Incluir dados ocultados"',
    },
    {
        chave: 'arquivoPoetico_downloadAbrangente',
        categoria: 'preferencia',
        nota: 'Download abrangente ligado ou desligado',
    },
    {
        chave: 'arquivoPoetico_nomesFrequentes_v1',
        categoria: 'preferencia',
        nota: 'Nomes de arquivo frequentes nas exportações',
    },
    {
        chave: 'arquivoPoetico_exportTemplates_v1',
        categoria: 'preferencia',
        nota: 'Templates de exportação salvos',
    },
]);

// Chaves do localStorage montadas com prefixo + sufixo (tabela, aba ou nome).
export const PREFIXOS_LOCALSTORAGE = Object.freeze([
    {
        prefixo: 'arquivoPoetico_colunas_',
        categoria: 'preferencia',
        nota: 'Colunas visíveis e ordem, uma por tabela',
    },
    {
        prefixo: 'arquivoPoetico_colunasPadroes_',
        categoria: 'preferencia',
        nota: 'Padrões de colunas antigos, por tabela',
    },
    {
        prefixo: 'arquivoPoetico_colunasContagem_',
        categoria: 'preferencia',
        nota: 'Colunas de contagem, por tabela',
    },
    {
        prefixo: 'arquivoPoetico_acoesColuna_',
        categoria: 'preferencia',
        nota: 'Ações por coluna, por tabela',
    },
    {
        prefixo: 'arquivoPoetico_est_',
        categoria: 'preferencia',
        nota: 'Filtros, modos, ocultos e mínimos das Estatísticas',
    },
    {
        prefixo: 'arquivoPoetico_ma_',
        categoria: 'preferencia',
        nota: 'Modo Aprendizado: "não exibir" e perfil',
    },
]);

// Bancos do IndexedDB.
export const BANCOS_INDEXEDDB = Object.freeze([
    { nome: 'arquivoPoetico_capas', categoria: 'dado', nota: 'Imagens de capa dos livros' },
    {
        nome: 'arquivoPoetico_snapshots',
        categoria: 'retrato',
        nota: 'Últimos 10 retratos automáticos; ficam sempre (F13-D5)',
    },
]);

// Chaves de nível superior do `db`. A lista confere com o que `importarDB`
// (db.js) copia: o teste compara as duas.
export const CHAVES_DB = Object.freeze([
    ...[
        'livros',
        'partes',
        'secoes',
        'poemas',
        'prosas',
        'elementos',
        'coletaneas',
        'itensColetanea',
        'pessoas',
        'grupos',
        'autores',
        'epocas',
        'opcoesPeriodoBiografico',
        'assuntos',
        'temas',
        'locais',
        'personagens',
        'ecosIgnorados',
        'escansoes',
        'estruturasTextuais',
        'moldes',
    ].map((chave) => ({ chave, categoria: 'dado', nota: '' })),
    {
        chave: 'padroesColunas',
        categoria: 'dado',
        nota: 'Padrões de colunas salvos. Moram no db e vão no backup, apesar de parecerem preferência',
    },
    {
        chave: 'periodosHistoricos',
        categoria: 'pre-pronto',
        nota: '12 de fábrica (embutido: true) misturados aos criados pela pessoa',
    },
    {
        chave: 'periodosHistoricosOcultos',
        categoria: 'pre-pronto',
        nota: 'Registro do que a pessoa excluiu, para a migração não trazer de volta',
    },
    {
        chave: 'movimentosEscolas',
        categoria: 'pre-pronto',
        nota: '22 de fábrica (embutido: true) misturados aos criados pela pessoa',
    },
    {
        chave: 'movimentosEscolasOcultos',
        categoria: 'pre-pronto',
        nota: 'Registro do que a pessoa excluiu, para a migração não trazer de volta',
    },
    {
        chave: 'templatesEstrutura',
        categoria: 'pre-pronto',
        nota: 'Templates de estrutura de fábrica e da pessoa; NÃO estava no plano da Fase 13 (F13-D8)',
    },
    {
        chave: 'templatesEstruturaOcultos',
        categoria: 'pre-pronto',
        nota: 'Registro do que a pessoa excluiu; mesma pendência da linha acima (F13-D8)',
    },
    {
        chave: 'programaDeFabricaAplicado',
        categoria: 'estado',
        nota: 'Marca de que o Programa de fábrica dos movimentos já foi aplicado uma vez',
    },
]);

function porChave(lista, campo, valor) {
    return lista.find((e) => e[campo] === valor) || null;
}

// Categoria de uma chave do localStorage, ou null se ninguém a classificou.
export function classificarChaveLocalStorage(chave) {
    const exata = porChave(CHAVES_LOCALSTORAGE, 'chave', chave);
    if (exata) return exata.categoria;
    const prefixada = PREFIXOS_LOCALSTORAGE.find((p) => chave.startsWith(p.prefixo));
    return prefixada ? prefixada.categoria : null;
}

// Categoria de um banco do IndexedDB, ou null.
export function classificarBancoIndexedDB(nome) {
    const banco = porChave(BANCOS_INDEXEDDB, 'nome', nome);
    return banco ? banco.categoria : null;
}

// Categoria de uma chave de nível superior do db, ou null.
export function classificarChaveDb(chave) {
    const item = porChave(CHAVES_DB, 'chave', chave);
    return item ? item.categoria : null;
}

export function categoriaValida(categoria) {
    return VALIDAS.has(categoria);
}

// Chaves de uma categoria, para as etapas 13a e seguintes.
export function chavesLocalStorageDe(categoria) {
    return CHAVES_LOCALSTORAGE.filter((e) => e.categoria === categoria).map((e) => e.chave);
}

export function prefixosLocalStorageDe(categoria) {
    return PREFIXOS_LOCALSTORAGE.filter((e) => e.categoria === categoria).map((e) => e.prefixo);
}

export function chavesDbDe(categoria) {
    return CHAVES_DB.filter((e) => e.categoria === categoria).map((e) => e.chave);
}
