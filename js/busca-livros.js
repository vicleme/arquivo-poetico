// ============================================================
// busca-livros.js: busca por campo (`campo:valor`) na aba Livros
// (Fase 19, etapa 3, filtros reformulados, entrega 2).
//
// Mesma sintaxe de Poemas, Prosas e Autores (termos soltos = E; `ou`;
// "frase exata"; `-termo` exclui; `campo:*` = campo preenchido; acento
// e caixa não importam), reaproveitando o interpretador de utils.js
// (parseConsultaBusca) com um mapa de prefixos próprio da aba:
//
//   autor:Maria            livros que têm um Autor com "Maria" no nome
//   autor:Maria ou autor:João   qualquer um dos dois
//   -autor:Pedro           exclui os livros desse Autor
//   autor:*  /  -autor:*   com autoria registrada  /  sem autoria
//   papel:Tradutor         livros em que alguém tem esse papel na autoria
//   equipe:Ana             livros com um Colaborador "Ana" na equipe
//   papelequipe:Capista    livros em que alguém tem esse papel na equipe
//   equipe:*  /  -equipe:* com equipe registrada  /  sem equipe
//
// Vínculo: `autor:Maria@Tradutor` quer dizer "Maria COM o papel Tradutor
// NESTE livro" (é diferente de `autor:Maria papel:Tradutor`, em que Maria
// pode ser autora de um livro em que só outra pessoa traduz). O mesmo vale
// para `equipe:Ana@Capista`. Nome com espaço pede aspas em volta do tudo:
// `autor:"Maria Silva@Tradutor"`.
//
// Busca solta (sem prefixo): título, sigla, ISBN (13 e 10), autoria
// ("Maria (Autor, Tradutor)") e equipe ("Ana (Capista: Capa)"), a mesma
// de antes; só que agora cada palavra separada por espaço é um termo (E).
//
// Nomes casam por trecho. Papéis casam por palavra inteira, para
// `papel:Autor` não achar "Coautor".
//
// Módulo puro (sem DOM e sem `db.js`): recebe a lista de livros e os
// cadastros por parâmetro e devolve a lista filtrada.
// ============================================================

import { normalizarBusca, opcoesBuscaPadrao, parseConsultaBusca, valorBateTermo } from './utils.js';
import { separarNomeEPapel, juntarVinculosComAspas } from './vinculo-busca.js';
import { autoriaDoLivro } from './autoria-livro.js';
import { equipeDoLivro } from './colaboradores-livro.js';

// Continuam exportadas daqui (estavam neste arquivo antes de irem para o módulo comum).
export { separarNomeEPapel, juntarVinculosComAspas };

// Prefixo digitado (sem acento, minúsculo) → chave no objeto "decorado" por
// decorarLivroParaBusca.
export const CAMPOS_ATRIBUTO_LIVRO = {
    autor: 'autor',
    papel: 'papelAutoria',
    papelautor: 'papelAutoria',
    equipe: 'equipe',
    colaborador: 'equipe',
    papelequipe: 'papelEquipe',
    papelcolaborador: 'papelEquipe',
};

// Forma canônica de cada campo (um nome por campo), pra legenda de ajuda.
export const PREFIXOS_CANONICOS_LIVRO = ['autor', 'papel', 'equipe', 'papelequipe'];

function soDigitosDoIsbn(valor) {
    return String(valor ?? '')
        .replace(/[\s-]/g, '')
        .toLowerCase();
}

// Devolve o livro "achatado" para a busca: textos já normalizados e os vínculos
// de autoria e de equipe separados, com os papéis de cada um. Não altera o livro.
export function decorarLivroParaBusca(
    livro,
    autoresCadastro = [],
    colaboradoresCadastro = [],
    opts = opcoesBuscaPadrao(),
) {
    const norm = (s) => normalizarBusca(s, opts);
    const autores = new Map((autoresCadastro || []).map((a) => [String(a.id), a]));
    const colaboradores = new Map((colaboradoresCadastro || []).map((c) => [String(c.id), c]));

    // Só entra vínculo cujo cadastro existe: sem nome não há o que buscar.
    const vinculosAutoria = autoriaDoLivro(livro)
        .map((v) => ({ cadastro: autores.get(String(v.autorId)), papeis: v.papeis }))
        .filter((v) => v.cadastro)
        .map((v) => ({ nome: norm(v.cadastro.nome), papeis: v.papeis.map(norm) }));
    const vinculosEquipe = equipeDoLivro(livro)
        .map((v) => ({ cadastro: colaboradores.get(String(v.colaboradorId)), papeis: v.papeis }))
        .filter((v) => v.cadastro)
        .map((v) => ({
            nome: norm(v.cadastro.nome),
            // O escopo ("Capa") não é papel: fica de fora de `papelequipe:`.
            papeis: v.papeis.map((p) => norm(p.papel)),
        }));

    const textoAutoria = vinculosAutoria
        .map((v) => (v.papeis.length ? `${v.nome} (${v.papeis.join(', ')})` : v.nome))
        .join('; ');
    const textoEquipe = (equipeDoLivro(livro) || [])
        .map((v) => {
            const cadastro = colaboradores.get(String(v.colaboradorId));
            if (!cadastro) return '';
            const papeis = v.papeis.map((p) => (p.escopo ? `${p.papel}: ${p.escopo}` : p.papel));
            return papeis.length ? `${cadastro.nome} (${papeis.join(', ')})` : cadastro.nome;
        })
        .filter(Boolean)
        .map(norm)
        .join('; ');

    return {
        geral: [norm(livro?.titulo), norm(livro?.siglaOficial), textoAutoria, norm(textoEquipe)]
            .filter(Boolean)
            .join('\n'),
        isbns: [soDigitosDoIsbn(livro?.isbn13), soDigitosDoIsbn(livro?.isbn10)].filter(Boolean),
        vinculosAutoria,
        vinculosEquipe,
    };
}

// Algum papel da lista casa com `papel` (palavra inteira, sem caixa e acento)?
function algumPapelBate(papeis, papel, opts) {
    const alvo = normalizarBusca(papel, opts);
    return papeis.some((p) => valorBateTermo(p, alvo, true));
}

// O termo bate com os vínculos? `nome@papel` exige os dois no MESMO vínculo;
// só nome vale qualquer papel; só `@papel` vale qualquer pessoa.
function algumVinculoBate(vinculos, termo, opts) {
    const { nome, papel } = separarNomeEPapel(termo);
    const alvoNome = normalizarBusca(nome, opts);
    return vinculos.some(
        (v) =>
            (!alvoNome || valorBateTermo(v.nome, alvoNome, opts.palavraInteira)) &&
            (!papel || algumPapelBate(v.papeis, papel, opts)),
    );
}

// Só dígitos e o X final do ISBN-10: evita que a letra "x" solta case com ISBN.
function termoPareceIsbn(termo) {
    return termo !== '' && /^[0-9]+x?$/.test(termo);
}

function termoBate(decorado, t, opts) {
    if (!t.campo) {
        const alvo = normalizarBusca(t.termo, opts);
        // `Nome@Papel` sem prefixo: vale como vínculo na autoria ou na equipe.
        if (
            alvo.includes('@') &&
            (algumVinculoBate(decorado.vinculosAutoria, t.termo, opts) ||
                algumVinculoBate(decorado.vinculosEquipe, t.termo, opts))
        ) {
            return true;
        }
        if (valorBateTermo(decorado.geral, alvo, opts.palavraInteira)) return true;
        const alvoIsbn = soDigitosDoIsbn(alvo);
        return termoPareceIsbn(alvoIsbn) && decorado.isbns.some((isbn) => isbn.includes(alvoIsbn));
    }
    if (t.campo === 'autor') {
        return t.presenca
            ? decorado.vinculosAutoria.length > 0
            : algumVinculoBate(decorado.vinculosAutoria, t.termo, opts);
    }
    if (t.campo === 'equipe') {
        return t.presenca
            ? decorado.vinculosEquipe.length > 0
            : algumVinculoBate(decorado.vinculosEquipe, t.termo, opts);
    }
    const vinculos =
        t.campo === 'papelAutoria' ? decorado.vinculosAutoria : decorado.vinculosEquipe;
    if (t.presenca) return vinculos.some((v) => v.papeis.length > 0);
    return vinculos.some((v) => algumPapelBate(v.papeis, t.termo, opts));
}

// Consulta vazia (ou só espaços) não filtra nada.
export function consultaLivrosVazia(query) {
    return !String(query ?? '').trim();
}

// O livro combina com a consulta? Mesma regra de Autores: pelo menos um grupo
// de inclusão (separados por `ou`) com todos os termos batendo, e nenhum termo
// de exclusão batendo.
export function livroCombinaComConsulta(
    livro,
    query,
    autoresCadastro = [],
    colaboradoresCadastro = [],
    opts = opcoesBuscaPadrao(),
) {
    if (consultaLivrosVazia(query)) return true;
    const { gruposIncluir, termosExcluir } = parseConsultaBusca(
        juntarVinculosComAspas(query),
        CAMPOS_ATRIBUTO_LIVRO,
    );
    const decorado = decorarLivroParaBusca(livro, autoresCadastro, colaboradoresCadastro, opts);
    const bate = (t) => termoBate(decorado, t, opts);
    const incluido = gruposIncluir.length === 0 || gruposIncluir.some((g) => g.every(bate));
    return incluido && !termosExcluir.some(bate);
}

// Filtra a lista de livros pela consulta, mantendo a ordem de entrada.
export function filtrarLivrosPorConsulta(
    livros,
    query,
    autoresCadastro = [],
    colaboradoresCadastro = [],
    opts = opcoesBuscaPadrao(),
) {
    if (consultaLivrosVazia(query)) return livros || [];
    return (livros || []).filter((l) =>
        livroCombinaComConsulta(l, query, autoresCadastro, colaboradoresCadastro, opts),
    );
}
