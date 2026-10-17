// Padrões de colunas de fábrica (16/10/2026). São semeados uma vez na lista
// de padrões da própria pessoa (`db.padroesColunas`), não ficam fixos no
// código: assim ela pode renomear, atualizar e excluir, e o que excluir não
// volta. Módulo puro (sem import), para db.js poder usá-lo sem ciclo.
//
// ID/Título e Ações não entram nas listas: são colunas fixas, sempre ligadas.
// Status é uma coluna comum, então só entra onde faz sentido (Revisão).
// Chaves que não existirem numa tabela saem na normalização de colunas.js.

// Cada entrada vale para Poemas e Prosas (as chaves são as mesmas nas duas,
// salvo as de `extras`, que acrescentam colunas só de uma das abas).
// `desde` é a versão em que o padrão passou a existir: acervo que já aplicou
// a versão N só recebe os padrões com `desde` maior que N, então um padrão
// de fábrica excluído de propósito nunca é recriado.
export const PADROES_COLUNAS_FABRICA = Object.freeze([
    {
        nome: 'Tags & Temas',
        desde: 1,
        colunas: ['etiquetas', 'temas', 'assuntos'],
    },
    {
        nome: 'Ondes & Quandos (Produção)',
        desde: 1,
        colunas: ['dataEscrita', 'localEscrita'],
    },
    {
        nome: 'Ondes & Quandos (Retrato)',
        desde: 1,
        colunas: [
            'territorialidade',
            'epocaRetratada',
            'periodoHistoricoId',
            'eventosBiograficos',
            'eventosHistoricos',
        ],
    },
    {
        nome: 'Revisão',
        desde: 1,
        colunas: [
            'status',
            'cortadoDe',
            'lancadoEm',
            'autoavaliacao',
            'autoclassificacao',
            'notas',
        ],
    },
    {
        nome: 'Intertexto',
        desde: 1,
        colunas: ['elos', 'ecos', 'intertextualidade', 'hipertextualidade', 'referenciasExternas'],
    },
    // Versão 2 (16/10/2026). Circulação: o que aconteceu com o texto depois de
    // escrito. A coluna estrutural tem chave diferente em cada aba (Estrutura
    // em Poemas, Vínculo em Prosas), por isso o `extras`.
    {
        nome: 'Circulação',
        desde: 2,
        colunas: ['dataPublicacao', 'envios', 'reconhecimentos', 'fonte'],
        extras: { poemas: ['estrutura'], prosas: ['vinculo'] },
    },
    {
        nome: 'Correntes',
        desde: 2,
        colunas: ['movimentosEscolas', 'divisoesCorrentes', 'posturaEstetica', 'programa'],
    },
    {
        nome: 'Pessoas & Personagens',
        desde: 2,
        colunas: ['pessoas', 'grupos', 'personagens'],
    },
]);

export const TABELAS_PADROES_COLUNAS_FABRICA = Object.freeze(['poemas', 'prosas']);
export const VERSAO_PADROES_COLUNAS_FABRICA = Math.max(
    ...PADROES_COLUNAS_FABRICA.map((p) => p.desde),
);

const mesmoNome = (a, b) =>
    String(a).trim().toLocaleLowerCase('pt-BR') === String(b).trim().toLocaleLowerCase('pt-BR');

// Acrescenta ao fim da lista de cada tabela os padrões de fábrica que ainda
// não foram aplicados a este acervo (`banco.padroesColunasFabricaVersao`,
// ausente = 0). Padrão cujo nome a pessoa já usa não é tocado nem duplicado.
// Idempotente: depois de rodar, a versão fica gravada e nada mais é recriado.
export function aplicarPadroesColunasDeFabrica(banco) {
    const aplicada = Number(banco.padroesColunasFabricaVersao) || 0;
    if (aplicada >= VERSAO_PADROES_COLUNAS_FABRICA) return;
    const novos = PADROES_COLUNAS_FABRICA.filter((p) => p.desde > aplicada);
    const atuais =
        banco.padroesColunas && typeof banco.padroesColunas === 'object'
            ? banco.padroesColunas
            : {};
    const saida = { ...atuais };
    for (const tabela of TABELAS_PADROES_COLUNAS_FABRICA) {
        const lista = Array.isArray(saida[tabela]) ? [...saida[tabela]] : [];
        for (const p of novos) {
            if (lista.some((x) => x && typeof x.nome === 'string' && mesmoNome(x.nome, p.nome))) {
                continue;
            }
            lista.push({ nome: p.nome, colunas: [...p.colunas, ...(p.extras?.[tabela] ?? [])] });
        }
        saida[tabela] = lista;
    }
    banco.padroesColunas = saida;
    banco.padroesColunasFabricaVersao = VERSAO_PADROES_COLUNAS_FABRICA;
}
