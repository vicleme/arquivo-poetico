// ============================================================
// legenda-papeis-pessoa.js: legenda dos papéis de Pessoa (lógica pura)
// Sem DOM e sem db.js. Importado por: exportar.js, exportar-frequentes.js,
// exportar-md.js e importar-aditivo.js.
//
// Na exportação, o papel de uma Pessoa num texto é só um NOME ("Aludido(a)").
// Quem lê o arquivo (uma IA, outra pessoa, outro acervo) não sabe o que o nome
// quer dizer nem como o acervo o abrevia. A legenda resolve isso: uma lista
// com os papéis que aparecem nos textos exportados, cada um com apelido,
// descrição e as regras de convivência.
//
//   { nome, apelido, descricao, exclusivo?: true, nao_convive_com?: [nomes] }
//
// Na importação aditiva, a mesma legenda cadastra no destino os papéis que ele
// ainda não conhece, com apelido e descrição. Papel que o destino já tem não
// é alterado.
// ============================================================

import {
    registroPapeisPessoa,
    chavePapel,
    normalizarRegistro,
    papeisSeExcluem,
    apelidoDoPapel,
    papeisUsadosNosTextos,
} from './papeis-pessoa.js';
import { resolverInfosPapel } from './infos-papel.js';

export const CHAVE_LEGENDA_PAPEIS = 'legenda_papeis_pessoa';

// Nomes de papel que aparecem nos vínculos de Pessoa de uma lista de textos,
// na ordem em que surgem, sem repetir.
export function nomesDePapeisNosItens(itens) {
    return papeisUsadosNosTextos({ poemas: Array.isArray(itens) ? itens : [], prosas: [] });
}

// Legenda dos papéis dados, na ordem do registro (papel que o registro não
// conhece vai no fim, só com o apelido sugerido). Sem papéis, lista vazia.
export function legendaPapeisPessoa(nomes, registro = registroPapeisPessoa()) {
    const pedidos = new Set((nomes || []).map(chavePapel));
    if (!pedidos.size) return [];

    const conhecidos = registro.filter((p) => pedidos.has(chavePapel(p.nome)));
    const chavesConhecidas = new Set(conhecidos.map((p) => chavePapel(p.nome)));

    const legenda = conhecidos.map((papel) => {
        const entrada = {
            nome: papel.nome,
            apelido: papel.apelido,
            descricao: papel.descricao || '',
        };
        if (papel.exclusivoComTodos) {
            entrada.exclusivo = true;
        } else {
            const nao = registro
                .filter((outro) => outro.nome !== papel.nome)
                .filter((outro) => papeisSeExcluem(papel.nome, outro.nome, registro))
                .map((outro) => outro.nome);
            if (nao.length) entrada.nao_convive_com = nao;
        }
        return entrada;
    });

    (nomes || []).forEach((nome) => {
        const chave = chavePapel(nome);
        if (!chave || chavesConhecidas.has(chave)) return;
        chavesConhecidas.add(chave);
        legenda.push({
            nome: String(nome).trim(),
            apelido: apelidoDoPapel(nome, registro),
            descricao: '',
        });
    });

    return legenda;
}

// Legenda dos papéis usados nos textos exportados.
export function legendaDosItens(itens, registro = registroPapeisPessoa()) {
    return legendaPapeisPessoa(nomesDePapeisNosItens(itens), registro);
}

// Devolve o envelope do JSON com a legenda logo depois da primeira chave
// (`export_format`), para ela vir antes dos textos. Sem papéis nos textos, o
// envelope sai como estava. Com a caixa "Infos de papel" desligada (ou
// `opcoes.infosPapel: false`), também.
export function comLegendaPapeis(saida, itens, registro = registroPapeisPessoa(), opcoes = {}) {
    if (!resolverInfosPapel(opcoes)) return saida;
    const legenda = legendaDosItens(itens, registro);
    if (!legenda.length || !saida || typeof saida !== 'object') return saida;
    const [primeira, ...resto] = Object.entries(saida);
    return Object.fromEntries([primeira, [CHAVE_LEGENDA_PAPEIS, legenda], ...resto]);
}

// Bloco de texto para o .md: uma linha por papel.
export function legendaParaMarkdown(legenda) {
    if (!Array.isArray(legenda) || !legenda.length) return '';
    let md = '## Legenda dos papéis de Pessoa\n\n';
    legenda.forEach((p) => {
        let linha = `- **${p.nome}** (${p.apelido})`;
        if (p.descricao) linha += `: ${p.descricao}`;
        if (p.exclusivo) linha += ' Não convive com nenhum outro papel.';
        else if (p.nao_convive_com?.length)
            linha += ` Não convive com: ${p.nao_convive_com.join(', ')}.`;
        md += `${linha}\n`;
    });
    return `${md}\n`;
}

// ─── Importação ──────────────────────────────────────────────

// Cadastra em `dbRef.papeisPessoa` os papéis usados pelos textos criados que o
// destino ainda não tem. Com legenda, entram com apelido e descrição dela; sem,
// entram simples (o apelido é sugerido). Papel que o destino já tem fica como
// está. Convivência da legenda não é importada: papel novo nasce sem regra,
// como os que se acrescentam à mão. Devolve os nomes cadastrados agora.
export function incorporarPapeisImportados(dbRef, legenda, itensCriados) {
    const usados = papeisUsadosNosTextos({ poemas: itensCriados || [], prosas: [] });
    if (!usados.length) return [];

    const antes = normalizarRegistro(dbRef.papeisPessoa, []);
    const chavesAntes = new Set(antes.map((p) => chavePapel(p.nome)));
    const chavesUsadas = new Set(usados.map(chavePapel));

    const daLegenda = (Array.isArray(legenda) ? legenda : [])
        .filter((p) => p && typeof p.nome === 'string')
        .filter((p) => chavesUsadas.has(chavePapel(p.nome)) && !chavesAntes.has(chavePapel(p.nome)))
        .map((p) => ({
            nome: p.nome.trim(),
            apelido: typeof p.apelido === 'string' ? p.apelido.trim() : '',
            descricao: typeof p.descricao === 'string' ? p.descricao.trim() : '',
        }));

    dbRef.papeisPessoa = normalizarRegistro([...antes, ...daLegenda], usados);

    return dbRef.papeisPessoa
        .filter((p) => !chavesAntes.has(chavePapel(p.nome)))
        .map((p) => p.nome);
}
