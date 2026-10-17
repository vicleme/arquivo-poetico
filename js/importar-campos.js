// importar-campos.js: importa campos para textos que JÁ existem no acervo, a
// partir de um .json (feito à mão ou por uma IA depois de analisar os textos).
//
// Lógica pura, sem DOM e sem save(): a tela (ui-importar-campos.js) só chama.
// Diferente da Importação Aditiva (que traz textos novos), aqui nenhum texto
// é criado: cada entrada do arquivo aponta para um Poema ou Prosa existente
// e SOMA campos a ele.
//
// Formato (versão 1):
//
//   { "formato": "arquivo-poetico-campos", "versao": 1,
//     "textos": [
//       { "id": 1776750689996,            // ou "titulo"; "tipo" é opcional
//         "titulo": "Olhar Lírico",
//         "tipo": "poema",                // "poema" | "prosa"
//         "etiquetas": { "Tom": ["Esperançoso"], "Estilo": ["Metapoesia"] },
//         "temas": [{ "tema": "Resiliência emocional", "papel": "principal" }],
//         "assuntos": [{ "assunto": "Vida emocional", "papel": "automatico" }],
//         // extras (entrega 3, ver importar-campos-extras.js):
//         "territorialidade": ["Brasil", "Santos"],
//         "localEscrita": "Santos",
//         "pessoas": [{ "pessoa": "Dani", "papeis": ["Dedicatário(a)"] }],
//         "pendencia": "revisar métrica",
//         "fonte": { "origem": "Obra própria", "conferido": true }
//       } ],
//     // ligações Tema → Assunto (do cadastro, não de um texto):
//     "ligacoes": [{ "tema": "Saudade", "assunto": "Tempo, memória e perda" }]
//   }
//
// Regras (escolhas a confirmar em `manutencao/decisoes.md`):
//   - Modo soma: o arquivo nunca tira nada de um texto. Etiqueta ou Tema que o
//     texto já tem fica como está; a exceção é o PAPEL, que o arquivo atualiza
//     quando traz um papel diferente.
//   - Etiqueta e Tema que não existem no cadastro são criados (e listados no
//     relatório, para a pessoa pegar erro de digitação antes de aplicar).
//   - Assunto nunca é criado, e só vale se algum Tema do texto pertence a ele
//     (o Assunto é derivado do Tema). O "papel" do Assunto aceita:
//     automatico (volta a seguir o Tema e restaura um Assunto tirado do texto),
//     principal, secundario, indefinido (sem papel, fixado) e nao-se-aplica
//     (tira o Assunto daquele texto).
//   - Ligações (`ligacoes`): soma um Tema a um Assunto que JÁ existe (o
//     Assunto lista Temas por id). Valem para todos os textos com o Tema, não
//     só para os do arquivo. Rodam antes dos `assuntos` dos textos, então um
//     Tema novo do arquivo já pode ser usado em `assuntos`. Tema que não existe
//     no cadastro só é criado se algum texto achado do arquivo o traz; senão vai
//     para o relatório. Assunto que não existe nunca é criado. O arquivo pode
//     trazer só `ligacoes` (sem textos), para organizar Temas sem Assunto.
//   - O texto é achado pelo `id` ou pelo `titulo` (sem caixa e sem acento).
//     Título que casa com mais de um texto, id que não bate com o título e
//     texto que não existe NÃO são chutados: vão para o relatório e ficam de
//     fora.
//   - Extras: territorialidade e pessoas também são soma (Local e Pessoa
//     novos são criados e listados); local de escrita, pendência e fonte só
//     preenchem o que está vazio, a menos que a opção
//     `substituirCamposSimples` esteja ligada. Ver importar-campos-extras.js.
//   - Nada disso grava: `executarImportacaoCampos` muda o `dbRef` e devolve
//     `desfazer`; `preverImportacaoCampos` roda o mesmo caminho numa cópia.

import {
    chaveTema,
    temasComPapel,
    normalizarPapelTema,
    assuntosComPapelDeEntradas,
    podarSobrescritasAssunto,
    podarExcecoesAssunto,
    idsAssuntosExcluidos,
} from './utils.js';
import {
    garantirTema,
    limparNomeTema,
    reconciliarTemasDoTexto,
    gravarTemasNoTexto,
} from './temas.js';
import {
    ETIQUETAS_CATEGORIAS,
    ROTULOS_ETIQUETAS,
    limparNomeEtiqueta,
    nomesDeEtiquetasDigitados,
    adicionarEtiquetasAosTextos,
} from './etiquetas.js';

import {
    chaveSolta,
    chaveComEspacos,
    lerExtrasDaEntrada,
    extrasVazios,
    entradaTemExtras,
    aplicarTerritorialidade,
    aplicarLocalEscrita,
    aplicarPessoas,
    aplicarCamposSimples,
} from './importar-campos-extras.js';

export const FORMATO_CAMPOS = 'arquivo-poetico-campos';
export const VERSAO_FORMATO_CAMPOS = 1;

// ─── Leitura do arquivo ────────────────────────────────────────────────

const CATEGORIA_POR_CHAVE = new Map();
Object.keys(ETIQUETAS_CATEGORIAS).forEach((categoria) => {
    CATEGORIA_POR_CHAVE.set(chaveSolta(categoria), categoria);
    CATEGORIA_POR_CHAVE.set(chaveSolta(ROTULOS_ETIQUETAS[categoria]), categoria);
});

export function categoriaDeEtiquetaPorRotulo(rotulo) {
    return CATEGORIA_POR_CHAVE.get(chaveSolta(rotulo)) || null;
}

// Papel de um Tema: `{ ok, papel }`. `papel` é 'principal', 'secundario', ''
// (sem papel definido) ou undefined (o arquivo não disse: não mexer).
export function lerPapelDeTema(valor) {
    if (valor === undefined) return { ok: true, papel: undefined };
    if (valor === null) return { ok: true, papel: '' };
    const chave = chaveComEspacos(valor);
    if (chave === 'principal') return { ok: true, papel: 'principal' };
    if (chave === 'secundario') return { ok: true, papel: 'secundario' };
    if (['', 'indefinido', 'sem papel', 'sem papel definido', 'nenhum'].includes(chave)) {
        return { ok: true, papel: '' };
    }
    return { ok: false, papel: undefined };
}

// Ação sobre um Assunto no texto: `{ ok, acao }` com acao em 'auto',
// 'principal', 'secundario', '' (sem papel, fixado) ou 'excluir'.
export function lerAcaoDeAssunto(valor) {
    if (valor === undefined || valor === null) return { ok: true, acao: 'auto' };
    const chave = chaveComEspacos(valor);
    if (['', 'auto', 'automatico', 'automatica'].includes(chave)) return { ok: true, acao: 'auto' };
    if (chave === 'principal') return { ok: true, acao: 'principal' };
    if (chave === 'secundario') return { ok: true, acao: 'secundario' };
    if (['indefinido', 'sem papel', 'sem papel definido'].includes(chave)) {
        return { ok: true, acao: '' };
    }
    if (
        [
            'nao se aplica',
            'nao aplica',
            'nao se aplica a este texto',
            'excluir',
            'excluido',
            'tirar',
        ].includes(chave)
    ) {
        return { ok: true, acao: 'excluir' };
    }
    return { ok: false, acao: 'auto' };
}

function tipoDaEntrada(valor) {
    const chave = chaveComEspacos(valor);
    if (chave === 'poema' || chave === 'poemas') return 'poema';
    if (chave === 'prosa' || chave === 'prosas') return 'prosa';
    return null;
}

function nomesDeValor(valor, limpar) {
    if (Array.isArray(valor)) {
        return valor
            .map((v) => limpar(typeof v === 'string' ? v : (v?.nome ?? '')))
            .filter((n) => chaveTema(n));
    }
    return nomesDeEtiquetasDigitados(valor);
}

function lerEtiquetas(bruto, problemas) {
    const saida = [];
    const adicionar = (rotulo, nomes) => {
        const categoria = categoriaDeEtiquetaPorRotulo(rotulo);
        if (!categoria) {
            problemas.push({
                campo: 'etiquetas',
                valor: String(rotulo),
                motivo: 'categoria-desconhecida',
            });
            return;
        }
        nomes.forEach((nome) => saida.push({ categoria, nome }));
    };
    if (Array.isArray(bruto)) {
        bruto.forEach((e) => {
            if (!e || typeof e !== 'object') {
                problemas.push({
                    campo: 'etiquetas',
                    valor: String(e),
                    motivo: 'formato-invalido',
                });
                return;
            }
            const rotulo = e.categoria ?? e.categoriaEtiqueta ?? '';
            adicionar(
                rotulo,
                nomesDeValor(e.nome ?? e.etiqueta ?? e.etiquetas ?? '', limparNomeEtiqueta),
            );
        });
    } else if (bruto && typeof bruto === 'object') {
        Object.entries(bruto).forEach(([rotulo, valor]) =>
            adicionar(rotulo, nomesDeValor(valor, limparNomeEtiqueta)),
        );
    } else if (bruto != null) {
        problemas.push({ campo: 'etiquetas', valor: String(bruto), motivo: 'formato-invalido' });
    }
    return saida;
}

function lerTemas(bruto, problemas) {
    const saida = [];
    if (bruto == null) return saida;
    if (!Array.isArray(bruto)) {
        problemas.push({ campo: 'temas', valor: String(bruto), motivo: 'formato-invalido' });
        return saida;
    }
    bruto.forEach((e) => {
        const objeto = e && typeof e === 'object';
        const nome = limparNomeTema(objeto ? (e.tema ?? e.nome ?? '') : e);
        if (!chaveTema(nome)) return;
        const papel = lerPapelDeTema(objeto ? e.papel : undefined);
        if (!papel.ok) {
            problemas.push({
                campo: 'temas',
                valor: nome,
                motivo: 'papel-invalido',
                detalhe: String(e.papel),
            });
            return;
        }
        saida.push({ nome, papel: papel.papel });
    });
    return saida;
}

function lerAssuntos(bruto, problemas) {
    const saida = [];
    if (bruto == null) return saida;
    if (!Array.isArray(bruto)) {
        problemas.push({ campo: 'assuntos', valor: String(bruto), motivo: 'formato-invalido' });
        return saida;
    }
    bruto.forEach((e) => {
        const objeto = e && typeof e === 'object';
        const nome = String(objeto ? (e.assunto ?? e.nome ?? '') : e)
            .replace(/\s+/g, ' ')
            .trim();
        if (!chaveTema(nome)) return;
        const acao = lerAcaoDeAssunto(objeto ? e.papel : undefined);
        if (!acao.ok) {
            problemas.push({
                campo: 'assuntos',
                valor: nome,
                motivo: 'papel-invalido',
                detalhe: String(e.papel),
            });
            return;
        }
        saida.push({ nome, acao: acao.acao });
    });
    return saida;
}

// Lê `ligacoes`: `[{ tema, assunto }]`, ou `[{ tema, assuntos: [...] }]` para
// ligar um Tema a vários Assuntos de uma vez. Devolve `{ ligacoes, problemas }`.
function lerLigacoes(bruto) {
    const ligacoes = [];
    const problemas = [];
    if (bruto == null) return { ligacoes, problemas };
    if (!Array.isArray(bruto)) {
        problemas.push({ tema: '', assunto: '', motivo: 'formato-invalido' });
        return { ligacoes, problemas };
    }
    bruto.forEach((e) => {
        if (!e || typeof e !== 'object' || Array.isArray(e)) {
            problemas.push({ tema: String(e ?? ''), assunto: '', motivo: 'formato-invalido' });
            return;
        }
        const tema = limparNomeTema(e.tema ?? e.nome ?? '');
        const brutos = Array.isArray(e.assuntos) ? e.assuntos : [e.assunto];
        const assuntos = brutos
            .map((a) =>
                String(a ?? '')
                    .replace(/\s+/g, ' ')
                    .trim(),
            )
            .filter((a) => chaveTema(a));
        if (!chaveTema(tema) || !assuntos.length) {
            problemas.push({ tema, assunto: assuntos.join(', '), motivo: 'formato-invalido' });
            return;
        }
        assuntos.forEach((assunto) => ligacoes.push({ tema, assunto }));
    });
    return { ligacoes, problemas };
}

function lerEntrada(bruta, indice) {
    const problemas = [];
    if (!bruta || typeof bruta !== 'object' || Array.isArray(bruta)) {
        return {
            indice,
            id: null,
            titulo: '',
            tipo: null,
            etiquetas: [],
            temas: [],
            assuntos: [],
            ...extrasVazios(),
            problemas: [{ campo: 'entrada', valor: '', motivo: 'formato-invalido' }],
        };
    }
    const id = bruta.id === undefined || bruta.id === null || bruta.id === '' ? null : bruta.id;
    const titulo = String(bruta.titulo ?? bruta['título'] ?? '').trim();
    let tipo = null;
    if (bruta.tipo !== undefined && bruta.tipo !== null && bruta.tipo !== '') {
        tipo = tipoDaEntrada(bruta.tipo);
        if (!tipo)
            problemas.push({ campo: 'tipo', valor: String(bruta.tipo), motivo: 'tipo-invalido' });
    }
    return {
        indice,
        id,
        titulo,
        tipo,
        etiquetas: lerEtiquetas(bruta.etiquetas, problemas),
        temas: lerTemas(bruta.temas, problemas),
        assuntos: lerAssuntos(bruta.assuntos, problemas),
        ...lerExtrasDaEntrada(bruta, problemas),
        problemas,
    };
}

// Lê o JSON já parseado. Aceita o objeto `{ textos: [...] }` ou direto a lista.
// Devolve `{ ok, entradas, ligacoes, problemasLigacoes, avisos }`; `ok` é false
// quando não há lista de textos nem de ligações.
export function lerArquivoDeCampos(payload) {
    const avisos = [];
    let lista = null;
    let ligacoes = { ligacoes: [], problemas: [] };
    if (Array.isArray(payload)) lista = payload;
    else if (payload && typeof payload === 'object') {
        if (Array.isArray(payload.textos)) lista = payload.textos;
        if (payload.ligacoes != null) {
            ligacoes = lerLigacoes(payload.ligacoes);
            if (Array.isArray(payload.ligacoes)) lista = lista || [];
        }
        if (lista && payload.formato && payload.formato !== FORMATO_CAMPOS) {
            avisos.push({ motivo: 'formato-diferente', valor: String(payload.formato) });
        }
    }
    if (!lista) return { ok: false, entradas: [], ligacoes: [], problemasLigacoes: [], avisos };
    return {
        ok: true,
        entradas: lista.map((e, i) => lerEntrada(e, i + 1)),
        ligacoes: ligacoes.ligacoes,
        problemasLigacoes: ligacoes.problemas,
        avisos,
    };
}

// ─── Achar o texto de cada entrada ─────────────────────────────────────

function candidato(t) {
    return { id: t.item.id, tipo: t.tipo, titulo: t.item.titulo };
}

// `{ status, item?, tipo?, via?, candidatos?, aviso? }`; status:
// 'ok' | 'nao-achado' | 'ambiguo' | 'conflito' | 'sem-referencia'.
export function acharTextoDaEntrada(dbRef, entrada) {
    const todos = [
        ...(dbRef.poemas || []).map((item) => ({ item, tipo: 'poema' })),
        ...(dbRef.prosas || []).map((item) => ({ item, tipo: 'prosa' })),
    ].filter((t) => !entrada.tipo || t.tipo === entrada.tipo);

    const temId = entrada.id !== null && entrada.id !== undefined;
    const temTitulo = !!chaveTema(entrada.titulo);
    if (!temId && !temTitulo) return { status: 'sem-referencia' };

    let aviso = null;
    if (temId) {
        const porId = todos.filter((t) => String(t.item.id) === String(entrada.id));
        if (porId.length === 1) {
            const achado = porId[0];
            if (temTitulo && chaveTema(achado.item.titulo) !== chaveTema(entrada.titulo)) {
                return { status: 'conflito', candidatos: [candidato(achado)] };
            }
            return { status: 'ok', item: achado.item, tipo: achado.tipo, via: 'id' };
        }
        if (!temTitulo) return { status: 'nao-achado', motivo: 'id-nao-existe' };
        aviso = 'id-nao-existe-usou-titulo';
    }

    const chave = chaveTema(entrada.titulo);
    const porTitulo = todos.filter((t) => chaveTema(t.item.titulo) === chave);
    if (porTitulo.length === 1) {
        const achado = porTitulo[0];
        return { status: 'ok', item: achado.item, tipo: achado.tipo, via: 'titulo', aviso };
    }
    if (porTitulo.length === 0) return { status: 'nao-achado', motivo: 'titulo-nao-existe' };
    return { status: 'ambiguo', candidatos: porTitulo.map(candidato) };
}

// ─── Aplicar num texto ─────────────────────────────────────────────────

function aplicarEtiquetas(dbRef, item, etiquetas, rel) {
    etiquetas.forEach(({ categoria, nome }) => {
        const limpo = limparNomeEtiqueta(nome);
        const chave = chaveTema(limpo);
        if (!chave) return;
        const existente = (dbRef.etiquetas || []).find(
            (e) => e.categoria === categoria && chaveTema(e.nome) === chave,
        );
        const r = adicionarEtiquetasAosTextos(dbRef, [item], categoria, [limpo]);
        const nomeFinal = existente?.nome ?? limpo;
        if (r.vinculos > 0) {
            rel.adicionados.etiquetas.push({ categoria, nome: nomeFinal, nova: !existente });
        } else {
            rel.jaTinha.etiquetas.push({ categoria, nome: nomeFinal });
        }
    });
}

function aplicarTemas(dbRef, item, temas, rel, criadosAntes = new Set()) {
    if (!temas.length) return;
    reconciliarTemasDoTexto(dbRef, item);
    const lista = item.temas.map((e) => ({ ...e }));
    temas.forEach(({ nome, papel }) => {
        const chave = chaveTema(nome);
        const existente = (dbRef.temas || []).find((t) => chaveTema(t.nome) === chave);
        const id = garantirTema(dbRef, nome);
        if (id == null) return;
        const nomeFinal = existente?.nome ?? limparNomeTema(nome);
        // Tema que as ligações do arquivo acabaram de criar ainda conta como novo
        // na primeira vez que um texto o recebe.
        const eraNovo = !existente || criadosAntes.delete(chave);
        const atual = lista.find((e) => String(e.temaId) === String(id));
        if (!atual) {
            lista.push({ temaId: id, papel: papel ?? '' });
            rel.adicionados.temas.push({ nome: nomeFinal, papel: papel ?? '', nova: eraNovo });
        } else if (papel !== undefined && normalizarPapelTema(atual.papel) !== papel) {
            rel.papeisTema.push({
                nome: nomeFinal,
                de: normalizarPapelTema(atual.papel),
                para: papel,
            });
            atual.papel = papel;
        } else {
            rel.jaTinha.temas.push({ nome: nomeFinal });
        }
    });
    gravarTemasNoTexto(dbRef, item, lista);
}

// Estado de um Assunto no texto, para saber se o arquivo mudou algo:
// 'excluir', 'auto' ou o papel fixado ('principal', 'secundario', '').
function estadoDoAssunto(item, assuntoId) {
    const chave = String(assuntoId);
    if (idsAssuntosExcluidos(item.assuntosExcluidos).has(chave)) return 'excluir';
    const fixado = (Array.isArray(item.assuntosPapel) ? item.assuntosPapel : []).find(
        (e) => String(e?.assuntoId) === chave,
    );
    return fixado ? normalizarPapelTema(fixado.papel) : 'auto';
}

function aplicarAssuntos(dbRef, item, assuntos, rel) {
    if (!assuntos.length) return;
    const entradas = temasComPapel(item, dbRef.temas);
    const aplicaveis = new Set(
        assuntosComPapelDeEntradas(entradas, [], dbRef.assuntos, dbRef.temas).map((a) =>
            String(a.id),
        ),
    );
    let papeis = (Array.isArray(item.assuntosPapel) ? item.assuntosPapel : []).map((e) => ({
        ...e,
    }));
    let excluidos = [...idsAssuntosExcluidos(item.assuntosExcluidos)];

    assuntos.forEach(({ nome, acao }) => {
        const a = (dbRef.assuntos || []).find((x) => chaveTema(x.nome) === chaveTema(nome));
        if (!a) {
            rel.problemas.push({ campo: 'assuntos', valor: nome, motivo: 'assunto-inexistente' });
            return;
        }
        const chave = String(a.id);
        if (!aplicaveis.has(chave)) {
            rel.problemas.push({
                campo: 'assuntos',
                valor: a.nome,
                motivo: 'assunto-sem-tema-no-texto',
            });
            return;
        }
        const antes = estadoDoAssunto(
            { assuntosPapel: papeis, assuntosExcluidos: excluidos },
            a.id,
        );
        papeis = papeis.filter((e) => String(e?.assuntoId) !== chave);
        excluidos = excluidos.filter((id) => id !== chave);
        if (acao === 'excluir') excluidos.push(chave);
        else if (acao !== 'auto') papeis.push({ assuntoId: a.id, papel: acao });
        rel.assuntos.push({ nome: a.nome, acao, mudou: antes !== acao });
    });

    // Mesma poda do salvar do modal: só ficam sobrescritas e exceções que
    // ainda se aplicam aos Temas do texto.
    item.assuntosPapel = podarSobrescritasAssunto(entradas, papeis, dbRef.assuntos, dbRef.temas);
    item.assuntosExcluidos = podarExcecoesAssunto(entradas, excluidos, dbRef.assuntos, dbRef.temas);
}

// Soma Temas a Assuntos que já existem. Roda antes dos textos (ver o cabeçalho).
// `temasDoArquivo`: chaves dos Temas que algum texto achado do arquivo traz; só
// esses podem ser criados aqui. `criadosAntes` recebe a chave de cada Tema
// criado, para o relatório do texto ainda chamá-lo de novo.
function aplicarLigacoes(dbRef, ligacoes, temasDoArquivo, criadosAntes) {
    const rel = { feitas: [], jaExistiam: [], problemas: [] };
    (ligacoes || []).forEach(({ tema, assunto }) => {
        const a = (dbRef.assuntos || []).find((x) => chaveTema(x.nome) === chaveTema(assunto));
        if (!a) {
            rel.problemas.push({ tema, assunto, motivo: 'assunto-inexistente' });
            return;
        }
        const chave = chaveTema(tema);
        let registro = (dbRef.temas || []).find((t) => chaveTema(t.nome) === chave);
        let temaNovo = false;
        if (!registro) {
            if (!temasDoArquivo.has(chave)) {
                rel.problemas.push({ tema, assunto: a.nome, motivo: 'tema-inexistente' });
                return;
            }
            garantirTema(dbRef, tema);
            registro = (dbRef.temas || []).find((t) => chaveTema(t.nome) === chave);
            if (!registro) return;
            criadosAntes.add(chave);
            temaNovo = true;
        }
        if (!Array.isArray(a.temaIds)) a.temaIds = [];
        const linha = { tema: registro.nome, assunto: a.nome, temaNovo };
        if (a.temaIds.some((id) => String(id) === String(registro.id))) {
            rel.jaExistiam.push(linha);
            return;
        }
        a.temaIds.push(registro.id);
        rel.feitas.push(linha);
    });
    return rel;
}

function relatorioVazio() {
    return {
        adicionados: { etiquetas: [], temas: [], locais: [], pessoas: [] },
        jaTinha: { etiquetas: [], temas: [], locais: [], pessoas: [] },
        papeisTema: [],
        papeisPessoa: [],
        assuntos: [],
        camposSimples: [],
        problemas: [],
    };
}

// ─── Execução ──────────────────────────────────────────────────────────

const CADASTROS_DESFAZIVEIS = ['temas', 'etiquetas', 'locais', 'pessoas', 'assuntos'];

function trocarConteudo(lista, novo) {
    lista.splice(0, lista.length, ...novo);
}

// Temas que só as ligações criaram (o texto que os trouxe pode ter sido
// ignorado depois): entram no relatório de cadastro novo do mesmo jeito.
function novosPelasLigacoes(ligacoes) {
    return ligacoes.feitas.filter((l) => l.temaNovo).map((l) => l.tema);
}

// Aplica as entradas lidas (`lerArquivoDeCampos(...).entradas`) em `dbRef`.
// Muda `dbRef` (quem chama faz o save()) e devolve:
//   { resumo, itens, ligacoes, cadastroNovo, desfazer }
// `opcoes.ligacoes` e `opcoes.problemasLigacoes` vêm de `lerArquivoDeCampos`.
// `itens` tem uma linha por entrada, com o que foi/seria feito.
export function executarImportacaoCampos(dbRef, entradas, opcoes = {}) {
    const substituir = !!opcoes.substituirCamposSimples;
    const copias = new Map(); // id (string) → { lista, original }
    const cadastrosAntes = {};
    CADASTROS_DESFAZIVEIS.forEach((c) => {
        cadastrosAntes[c] = structuredClone(dbRef[c] || []);
    });

    const itens = [];
    const vistos = new Set();
    const novosEtiquetas = new Map();
    const novosTemas = new Map();
    const novosLocais = new Map();
    const novasPessoas = new Map();

    // Ligações Tema → Assunto primeiro: os `assuntos` dos textos já enxergam
    // o que elas ligaram. Só Tema trazido por um texto achado pode ser criado.
    const temasDoArquivo = new Set();
    (entradas || []).forEach((entrada) => {
        if (acharTextoDaEntrada(dbRef, entrada).status === 'ok') {
            entrada.temas.forEach((t) => temasDoArquivo.add(chaveTema(t.nome)));
        }
    });
    const criadosPelasLigacoes = new Set();
    const ligacoes = aplicarLigacoes(dbRef, opcoes.ligacoes, temasDoArquivo, criadosPelasLigacoes);
    (opcoes.problemasLigacoes || []).forEach((p) => ligacoes.problemas.push(p));

    (entradas || []).forEach((entrada) => {
        const achado = acharTextoDaEntrada(dbRef, entrada);
        const linha = {
            indice: entrada.indice,
            status: achado.status,
            referencia: { id: entrada.id, titulo: entrada.titulo, tipo: entrada.tipo },
            textoId: null,
            tipo: achado.tipo || null,
            titulo: achado.item?.titulo ?? entrada.titulo,
            via: achado.via || null,
            motivo: achado.motivo || null,
            candidatos: achado.candidatos || [],
            avisos: [],
            mudou: false,
            ...relatorioVazio(),
        };
        linha.problemas = [...entrada.problemas];
        if (achado.aviso) linha.avisos.push(achado.aviso);

        if (achado.status === 'ok') {
            const item = achado.item;
            linha.textoId = item.id;
            const chaveTexto = `${achado.tipo}:${item.id}`;
            if (vistos.has(chaveTexto)) linha.avisos.push('texto-repetido-no-arquivo');
            vistos.add(chaveTexto);
            if (
                !entrada.etiquetas.length &&
                !entrada.temas.length &&
                !entrada.assuntos.length &&
                !entradaTemExtras(entrada)
            ) {
                linha.avisos.push('entrada-sem-campos');
            }

            if (!copias.has(chaveTexto)) {
                copias.set(chaveTexto, {
                    lista: achado.tipo === 'prosa' ? 'prosas' : 'poemas',
                    id: item.id,
                    original: structuredClone(item),
                });
            }
            const antes = JSON.stringify(item);
            aplicarEtiquetas(dbRef, item, entrada.etiquetas, linha);
            aplicarTemas(dbRef, item, entrada.temas, linha, criadosPelasLigacoes);
            aplicarAssuntos(dbRef, item, entrada.assuntos, linha);
            aplicarTerritorialidade(dbRef, item, entrada.territorialidade || [], linha);
            aplicarLocalEscrita(dbRef, item, entrada.localEscrita || null, linha, { substituir });
            aplicarPessoas(dbRef, item, entrada.pessoas || [], linha);
            aplicarCamposSimples(item, entrada.simples || [], linha, { substituir });
            linha.mudou = JSON.stringify(item) !== antes;

            linha.adicionados.etiquetas.forEach((e) => {
                if (e.nova) novosEtiquetas.set(`${e.categoria}:${chaveTema(e.nome)}`, e);
            });
            linha.adicionados.temas.forEach((t) => {
                if (t.nova) novosTemas.set(chaveTema(t.nome), t.nome);
            });
            const locaisNovos = [
                ...linha.adicionados.locais,
                ...linha.camposSimples.filter((c) => c.chave === 'localEscrita' && c.nova),
            ];
            locaisNovos.forEach((l) => {
                const nome = l.nome ?? l.para;
                if (l.nova) novosLocais.set(chaveTema(nome), nome);
            });
            linha.adicionados.pessoas.forEach((p) => {
                if (p.nova) novasPessoas.set(chaveTema(p.nome), p.nome);
            });
        }
        itens.push(linha);
    });

    const achados = itens.filter((i) => i.status === 'ok');
    const resumo = {
        total: itens.length,
        achados: achados.length,
        alterados: achados.filter((i) => i.mudou).length,
        semMudanca: achados.filter((i) => !i.mudou).length,
        naoAchados: itens.filter((i) => i.status === 'nao-achado' || i.status === 'sem-referencia')
            .length,
        ambiguos: itens.filter((i) => i.status === 'ambiguo').length,
        conflitos: itens.filter((i) => i.status === 'conflito').length,
        comProblema: itens.filter((i) => i.problemas.length > 0).length,
        vinculosEtiqueta: achados.reduce((n, i) => n + i.adicionados.etiquetas.length, 0),
        vinculosTema: achados.reduce((n, i) => n + i.adicionados.temas.length, 0),
        papeisTema: achados.reduce((n, i) => n + i.papeisTema.length, 0),
        ligacoesFeitas: ligacoes.feitas.length,
        ligacoesJaExistiam: ligacoes.jaExistiam.length,
        ligacoesComProblema: ligacoes.problemas.length,
        assuntosAjustados: achados.reduce(
            (n, i) => n + i.assuntos.filter((a) => a.mudou).length,
            0,
        ),
        vinculosLocal: achados.reduce((n, i) => n + i.adicionados.locais.length, 0),
        vinculosPessoa: achados.reduce((n, i) => n + i.adicionados.pessoas.length, 0),
        papeisPessoa: achados.reduce((n, i) => n + i.papeisPessoa.length, 0),
        camposSimplesGravados: achados.reduce(
            (n, i) =>
                n +
                i.camposSimples.filter((c) => ['preenchido', 'substituido'].includes(c.acao))
                    .length,
            0,
        ),
        camposSimplesMantidos: achados.reduce(
            (n, i) => n + i.camposSimples.filter((c) => c.acao === 'mantido').length,
            0,
        ),
    };

    const desfazer = () => {
        copias.forEach(({ lista, id, original }) => {
            const arr = dbRef[lista] || [];
            const i = arr.findIndex((t) => String(t.id) === String(id));
            if (i >= 0) arr[i] = structuredClone(original);
        });
        CADASTROS_DESFAZIVEIS.forEach((c) => {
            if (!Array.isArray(dbRef[c])) dbRef[c] = [];
            trocarConteudo(dbRef[c], structuredClone(cadastrosAntes[c]));
        });
    };

    return {
        resumo,
        itens,
        ligacoes,
        cadastroNovo: {
            etiquetas: [...novosEtiquetas.values()].map((e) => ({
                categoria: e.categoria,
                nome: e.nome,
            })),
            temas: [...new Set([...novosTemas.values(), ...novosPelasLigacoes(ligacoes)])],
            locais: [...novosLocais.values()],
            pessoas: [...novasPessoas.values()],
        },
        desfazer,
    };
}

// Mesmo caminho, numa cópia só do que a importação toca: nada do `dbRef`
// muda. Serve para a prévia da tela. O `desfazer` devolvido é um no-op.
export function preverImportacaoCampos(dbRef, entradas, opcoes = {}) {
    const copia = {
        poemas: structuredClone(dbRef.poemas || []),
        prosas: structuredClone(dbRef.prosas || []),
        temas: structuredClone(dbRef.temas || []),
        etiquetas: structuredClone(dbRef.etiquetas || []),
        locais: structuredClone(dbRef.locais || []),
        pessoas: structuredClone(dbRef.pessoas || []),
        assuntos: structuredClone(dbRef.assuntos || []),
    };
    const r = executarImportacaoCampos(copia, entradas, opcoes);
    return { ...r, desfazer: () => {} };
}
