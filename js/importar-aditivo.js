// ============================================================
// importar-aditivo.js — Importação Aditiva (Dados → Importação)
//
// Pega um Poema/Prosa exportado (individualmente ou num recorte com
// vários — mesmo formato flat de montarRegistro, ver exportar.js) e
// soma ao acervo atual, sem apagar nada. Diferente de:
//   - "Importar JSON" (importarDB, db.js): restaura backup inteiro,
//     substitui cada coleção por completo.
//   - Upload de JSON no modal de Sonoridade (importar-sonoridade.js):
//     preenche a classificação de UM Poema que já existe no acervo.
//
// Função pura (sem DOM) — quem mexe na tela a partir do resultado é
// forms.js (mesmo espírito de importar-sonoridade.js), pra dar pra
// testar a lógica de classificação/remapeamento isolada.
//
// Quatro fases (ver manutencao/ e docs/importacao-aditiva.md pro
// desenho completo): nenhuma escreve em `db` antes da última.
//   1. classificarImportacaoAditiva — dry-run, só leitura, monta o
//      relatório de resolução de referência.
//   2. (UI, fora daqui) preview + decisão manual de cada referência
//      ambígua — mexe nos objetos do relatório (decisao/entidadeDestinoId).
//   3+4. aplicarImportacaoAditiva — snapshot forçado, depois
//      remapeamento (mapaIds em memória) + escrita atômica.
// ============================================================

import {
    gerarId,
    CORES_GRUPO_PADRAO,
    TIPOS_NOME_LITERARIO,
    chaveTema,
    podarSobrescritasAssunto,
    podarExcecoesAssunto,
    periodosHistoricosIdsDoItem,
} from './utils.js';
import { resolverTemasEditados } from './temas.js';
import {
    ETIQUETAS_CATEGORIAS,
    nomesDeEtiquetasDaOrigem,
    resolverEtiquetasEditadas,
} from './etiquetas.js';
import { importarLocaisDoTexto } from './locais.js';
import { caminhoDoPeriodo } from './periodos-historicos-hierarquia.js';
import { normalizarLista, registrarValoresNovos } from './periodo-biografico-campos.js';
import { registrarValoresNovosPeriodoHistorico } from './periodos-historicos-campos.js';
import { exibindoOcultasDosPeriodos } from './ocultas-periodos.js';
import { importarPersonagensDoTexto } from './personagens.js';
import { completarPessoaComFicha } from './pessoas-viagem.js';
import { ecosImportados } from './ancora-eco.js';
import { montarContextoAlvos, remapearAlvosDoConceitos } from './alvos-conceitos.js';

// Sobrescritas de papel do Assunto vindas do JSON → [{ assuntoId, papel }] do
// acervo de destino (ver a chamada, em aplicarImportacaoAditiva).
function assuntosPapelImportados(dbRef, itemOrigem) {
    const porNome = new Map((dbRef.assuntos || []).map((a) => [chaveTema(a.nome), a]));
    const candidatas = (Array.isArray(itemOrigem?.assuntosPapel) ? itemOrigem.assuntosPapel : [])
        .map((e) => ({ assuntoId: porNome.get(chaveTema(e?.nome))?.id, papel: e?.papel }))
        .filter((e) => e.assuntoId != null);
    return podarSobrescritasAssunto(
        (Array.isArray(itemOrigem?.temas) ? itemOrigem.temas : []).map((t) => ({
            nome: t?.nome,
            papel: t?.papel,
        })),
        candidatas,
        dbRef.assuntos,
        dbRef.temas,
    );
}

// Assuntos tirados do texto ("não se aplica") vindos do JSON → ids do acervo
// de destino, casando pelo nome (sem caixa/acento) e podando o que não se
// aplica aos Temas do texto importado. JSON antigo (sem o campo) vira [].
function assuntosExcluidosImportados(dbRef, itemOrigem) {
    const porNome = new Map((dbRef.assuntos || []).map((a) => [chaveTema(a.nome), a]));
    const candidatos = (
        Array.isArray(itemOrigem?.assuntosExcluidos) ? itemOrigem.assuntosExcluidos : []
    )
        .map((e) => porNome.get(chaveTema(e?.nome))?.id)
        .filter((id) => id != null);
    return podarExcecoesAssunto(
        (Array.isArray(itemOrigem?.temas) ? itemOrigem.temas : []).map((t) => ({
            nome: t?.nome,
            papel: t?.papel,
        })),
        candidatos,
        dbRef.assuntos,
        dbRef.temas,
    );
}

// Referência (campo do relatório) → coleção de `db` que ela resolve.
const COLECAO_POR_CAMPO = {
    pessoas: 'pessoas',
    grupos: 'grupos',
    autores: 'autores',
    'epocaRetratada.epocaId': 'epocas',
    periodoHistoricoId: 'periodosHistoricos', // campo da referência (mantido; o item agora tem lista)
    livroId: 'livros',
    movimentosEscolas: 'movimentosEscolas',
};

function normalizarTexto(s) {
    return String(s ?? '').trim();
}

// Candidatos por nome (case-insensitive). Match exato tem prioridade —
// só cai pra aproximado (substring num sentido ou noutro) se não houver
// nenhum exato, e nesse caso pode haver mais de um candidato.
//
// `periodos: true` (Período Biográfico): um período oculto do destino ainda
// casa por nome EXATO, para o texto importado se ligar a ele em vez de criar
// um período visível duplicado. No aproximado ele fica de fora (a menos que
// "Mostrar ocultas" esteja ligado), para a lista de opções não revelar nomes
// ocultos por semelhança. O candidato oculto leva `oculto: true` e a tela
// mostra o rótulo "(período oculto)" no lugar do nome.
function candidatosPorNome(lista, nome, { periodos = false } = {}) {
    const alvo = normalizarTexto(nome).toLowerCase();
    if (!alvo || !Array.isArray(lista)) return [];

    const nomeDe = (x) => normalizarTexto(x.nome ?? x.titulo);

    const exatos = lista
        .filter((x) => nomeDe(x).toLowerCase() === alvo)
        .map((x) => ({
            id: x.id,
            nome: nomeDe(x),
            match: 'exato',
            ...(periodos && x.oculto ? { oculto: true } : {}),
        }));
    if (exatos.length) return exatos;

    return lista
        .filter((x) => {
            if (periodos && x.oculto && !exibindoOcultasDosPeriodos()) return false;
            const n = nomeDe(x).toLowerCase();
            return n && (n.includes(alvo) || alvo.includes(n));
        })
        .map((x) => ({
            id: x.id,
            nome: nomeDe(x),
            match: 'aproximado',
            ...(periodos && x.oculto ? { oculto: true } : {}),
        }));
}

// Regras de classificação (ver docs): sem candidato → 'criar'
// automático; um candidato exato → 'casar' pré-marcado (trocável);
// candidato aproximado ou mais de um → ambíguo, decisão manual.
function classificarReferencia(campo, idOrigem, nome, lista, opcoes) {
    const candidatos = candidatosPorNome(lista, nome, opcoes);
    const exatoUnico = candidatos.length === 1 && candidatos[0].match === 'exato';
    return {
        campo,
        valorOrigem: { idOrigem: idOrigem ?? null, nome: normalizarTexto(nome) },
        candidatos,
        decisao: candidatos.length === 0 ? 'criar' : exatoUnico ? 'casar' : null,
        entidadeDestinoId: exatoUnico ? candidatos[0].id : null,
    };
}

// Períodos Históricos do item exportado: `periodosHistoricosResolvidos`
// ({ id, nome, caminho }, formato novo) ou, em arquivo antigo, o
// `periodoHistoricoId` único com `periodoHistoricoNome`/`Caminho`. Entrada
// sem nome não resolve nada num acervo de destino e é ignorada.
function periodosDeOrigem(item) {
    if (Array.isArray(item.periodosHistoricosResolvidos)) {
        return item.periodosHistoricosResolvidos.filter((x) => x?.id != null);
    }
    if (item.periodoHistoricoId != null) {
        return [
            {
                id: item.periodoHistoricoId,
                nome: item.periodoHistoricoNome,
                caminho: item.periodoHistoricoCaminho,
            },
        ];
    }
    return [];
}

// Extrai as referências de um item exportado (formato montarRegistro,
// já com os nomes denormalizados: pessoas[].nome, autoria[].nome,
// gruposDiretosResolvidos, livrosResolvidos, epocaRetratada.nomeEpoca,
// periodoHistoricoNome).
// Períodos Biográficos de um item exportado. Formato novo:
// `epocaRetratada.periodos` (um item por período, com recorte, nome, Esfera e
// Categoria). Arquivo antigo: `epocaId`, `nomeEpoca` e `recorte` direto no
// objeto, que vira uma lista de um. Entrada sem id (período oculto no
// arquivo de origem) fica de fora.
function periodosEpocaDeOrigem(item) {
    const er = item?.epocaRetratada;
    if (!er) return [];
    const lista = Array.isArray(er.periodos)
        ? er.periodos
        : er.epocaId != null
          ? [
                {
                    epocaId: er.epocaId,
                    nomeEpoca: er.nomeEpoca,
                    recorte: er.recorte,
                    esferas: er.esferas,
                    categorias: er.categorias,
                },
            ]
          : [];
    const vistos = new Set();
    return lista.filter((p) => {
        if (p?.epocaId == null || vistos.has(String(p.epocaId))) return false;
        vistos.add(String(p.epocaId));
        return true;
    });
}

function extrairReferencias(item, dbRef) {
    const refs = [];

    (item.pessoas || []).forEach((p) => {
        if (p?.pessoaId == null) return;
        refs.push(classificarReferencia('pessoas', p.pessoaId, p.nome, dbRef.pessoas));
    });

    (item.gruposDiretosResolvidos || []).forEach((g) => {
        if (g?.id == null) return;
        refs.push(classificarReferencia('grupos', g.id, g.nome, dbRef.grupos));
    });

    (item.autoria || []).forEach((a) => {
        if (a?.autorId == null) return;
        refs.push(classificarReferencia('autores', a.autorId, a.nome, dbRef.autores));
    });

    // Um item de referência por período do texto.
    periodosEpocaDeOrigem(item).forEach((p) => {
        refs.push(
            classificarReferencia('epocaRetratada.epocaId', p.epocaId, p.nomeEpoca, dbRef.epocas, {
                periodos: true,
            }),
        );
    });

    // Bloco 2e: um item de referência por período do texto, com nome e
    // caminho denormalizados por montarRegistro (exportar.js). Arquivo
    // antigo (periodoHistoricoId único + periodoHistoricoNome/Caminho) vira
    // uma lista de um.
    periodosDeOrigem(item).forEach((pOrigem) => {
        const ref = classificarReferencia(
            'periodoHistoricoId',
            pOrigem.id,
            pOrigem.nome,
            dbRef.periodosHistoricos,
        );
        // Caminho de origem: o aplicador usa para religar ao pai certo ao criar.
        ref.caminhoOrigem = normalizarTexto(pOrigem.caminho);
        // Homônimos no destino: o caminho exportado desempata. Só decide
        // sozinho quando exatamente um deles tem esse mesmo caminho.
        const caminho = ref.caminhoOrigem;
        if (caminho && ref.candidatos.length > 1) {
            const iguais = ref.candidatos.filter(
                (c) =>
                    c.match === 'exato' &&
                    caminhoDoPeriodo(dbRef.periodosHistoricos, c.id) === caminho,
            );
            if (iguais.length === 1) {
                ref.decisao = 'casar';
                ref.entidadeDestinoId = iguais[0].id;
            }
        }
        refs.push(ref);
    });

    // Movimento/Escola: N:N (array), mesmo padrão de livrosResolvidos
    // logo abaixo — um item de referência por entrada do array, não um
    // campo solto como periodoHistoricoId acima.
    (item.movimentosEscolasResolvidos || []).forEach((m) => {
        if (m?.id == null) return;
        refs.push(
            classificarReferencia('movimentosEscolas', m.id, m.nome, dbRef.movimentosEscolas),
        );
    });

    // Livro: só a menção "solta" (livrosIds — associação sem posição
    // fixa). A posição estrutural (paiId/paiTipo em Partes/Seções)
    // nunca é reconstruída pelo import (decisão 4) — mesmo quando o
    // Livro casa por match exato, o item entra "não posicionado".
    (item.livrosResolvidos || []).forEach((l) => {
        if (l?.id == null) return;
        refs.push(classificarReferencia('livroId', l.id, l.titulo, dbRef.livros));
    });

    return refs;
}

// Aceita qualquer payload com `itens` (formato de montarRegistro) —
// exportação seletiva, "tudo flat", seleção por checkbox ou template.
// `coletaneas`, se vier, é ignorado (fora do escopo do Bloco 1).
export function normalizarItensPayload(payload) {
    if (!payload || !Array.isArray(payload.itens)) return [];
    return payload.itens;
}

// ─── Fase 1 — Validação (dry-run) ──────────────────────────────────
export function classificarImportacaoAditiva(payload, dbRef) {
    const itens = normalizarItensPayload(payload);

    const itensOrigem = itens.map((item) => {
        const tipo = item?.tipo === 'poema' ? 'poemas' : item?.tipo === 'prosa' ? 'prosas' : null;
        const idOrigem = item?.id ?? null;
        const titulo = normalizarTexto(item?.titulo);

        if (!tipo) {
            return {
                tipo: item?.tipo || null,
                idOrigem,
                titulo: titulo || '(sem título)',
                status: 'erro',
                erro: 'Tipo de item desconhecido — esperado "poema" ou "prosa".',
                referencias: [],
                extras: { sonoridade: false, estruturaTextual: false },
            };
        }
        if (!titulo) {
            return {
                tipo,
                idOrigem,
                titulo: '(sem título)',
                status: 'erro',
                erro: 'Título vazio.',
                referencias: [],
                extras: { sonoridade: false, estruturaTextual: false },
            };
        }

        const referencias = extrairReferencias(item, dbRef);

        // Título igual a um item já existente (mesmo tipo, IDs
        // diferentes) — tratado como referência ambígua própria:
        // pergunta se é duplicata (não importa) ou item novo, nunca
        // decide sozinho.
        const colecaoDestino = tipo === 'poemas' ? dbRef.poemas : dbRef.prosas;
        const duplicatas = candidatosPorNome(colecaoDestino, titulo).filter(
            (c) => c.match === 'exato',
        );
        if (duplicatas.length) {
            referencias.push({
                campo: 'duplicataTitulo',
                valorOrigem: { idOrigem, nome: titulo },
                candidatos: duplicatas,
                decisao: null,
                entidadeDestinoId: null,
            });
        }

        const status = referencias.some((r) => r.decisao === null) ? 'ambiguo' : 'pronto';
        // Sonoridade/Estrutura Textual (só presentes se o "download
        // abrangente" estava ligado na hora da Exportação) não são
        // referência — não têm candidato pra casar nem exigem decisão,
        // só acompanham o Poema quando existem. Sinalizado aqui pra a
        // Fase 2 (preview) poder indicar "+ Sonoridade"/"+ Estrutura
        // Textual", sem inventar isso na aplicação.
        const extras = {
            sonoridade: Boolean(item.sonoridade),
            estruturaTextual: Boolean(item.estruturaTextual),
        };
        return { tipo, idOrigem, titulo, status, erro: null, referencias, extras };
    });

    const resumo = {
        total: itensOrigem.length,
        prontos: itensOrigem.filter((i) => i.status === 'pronto').length,
        ambiguos: itensOrigem.filter((i) => i.status === 'ambiguo').length,
        comErro: itensOrigem.filter((i) => i.status === 'erro').length,
    };

    return { itensOrigem, resumo };
}

// Botão "Aplicar" só habilita quando toda referência ambígua tiver
// decisão preenchida — itens com erro já estão fora do lote, não
// bloqueiam nada.
export function relatorioProntoParaAplicar(relatorio) {
    return relatorio.itensOrigem.every(
        (rel) => rel.status === 'erro' || rel.referencias.every((r) => r.decisao !== null),
    );
}

// Metadados de Autor que um pacote da Biblioteca carrega (nacionalidade,
// nascimento, óbito, sexo, gênero, cor/raça, nomes literários — ver
// `autores` no payload, montado por
// scripts/montar-pacote.js). Casa pelo id de origem primeiro e cai pro
// nome se o id não bater; payload sem `autores` (Exportação comum)
// devolve null e o Autor nasce só com nome, como sempre foi.
// Esfera e Categoria do Período Histórico de origem (vêm em
// itens[].periodosHistoricosResolvidos). Pacote antigo não tem os campos: a
// lista sai vazia.
function camposPeriodoHistoricoDoPayload(payload, idOrigem) {
    const itens = Array.isArray(payload?.itens) ? payload.itens : [];
    let achado = null;
    itens.some((it) => {
        achado = periodosDeOrigem(it).find((p) => p.id === idOrigem) || null;
        return !!achado;
    });
    return {
        esferas: achado?.esferas,
        categorias: achado?.categorias,
        evento: achado?.evento === true,
    };
}

// Bloco 3: Esfera e Categoria do período de origem (vêm em
// itens[].epocaRetratada, ver montarRegistro em exportar.js). Pacote antigo
// não tem os campos: a lista sai vazia.
function camposEpocaDoPayload(payload, idOrigem) {
    const itens = Array.isArray(payload?.itens) ? payload.itens : [];
    let achado = null;
    itens.some((it) => {
        achado = periodosEpocaDeOrigem(it).find((p) => p.epocaId === idOrigem) || null;
        return !!achado;
    });
    return {
        esferas: achado?.esferas,
        categorias: achado?.categorias,
        evento: achado?.evento === true,
    };
}

function metadadosAutorDoPayload(payload, idOrigem, nome) {
    const lista = Array.isArray(payload?.autores) ? payload.autores : [];
    const alvo = normalizarTexto(nome).toLowerCase();
    return (
        lista.find((a) => a?.id != null && a.id === idOrigem) ||
        lista.find((a) => normalizarTexto(a?.nome).toLowerCase() === alvo) ||
        null
    );
}

// Período Histórico novo com a cadeia de pais do caminho exportado
// ("Nova República › Governo Dilma Rousseff › Segundo mandato"). Cada pai é
// achado no destino pelo caminho exato; sem isso, pelo nome quando ele é
// único; senão nasce um novo (se havia mais de um com o nome, conta em
// `homonimos` para o aviso do resultado). O último trecho é o próprio
// período, sempre criado. Sem caminho, ou com um que não termina no nome,
// o período nasce de topo, como antes.
export function criarPeriodoHistoricoComCaminho(
    dbRef,
    nome,
    caminho,
    contagem = null,
    extra = null,
) {
    const novo = (n, paiId, classificacao = null) => {
        const p = {
            id: gerarId(),
            nome: n,
            notas: '',
            regiao: [],
            inicio: null,
            fim: null,
            pertenceA: paiId != null ? [paiId] : [],
            fontes: [],
            esferas: normalizarLista(classificacao?.esferas),
            categorias: normalizarLista(classificacao?.categorias),
            ...(classificacao?.evento === true ? { evento: true } : {}),
        };
        dbRef.periodosHistoricos.push(p);
        registrarValoresNovosPeriodoHistorico(dbRef, p);
        return p.id;
    };
    const partes = normalizarTexto(caminho)
        .split('›')
        .map((x) => x.trim())
        .filter(Boolean);
    if (partes.length < 2 || partes[partes.length - 1].toLowerCase() !== nome.toLowerCase()) {
        return novo(nome, null, extra);
    }
    let paiId = null;
    partes.slice(0, -1).forEach((parte, i) => {
        const prefixo = partes.slice(0, i + 1).join(' › ');
        const lista = dbRef.periodosHistoricos;
        const porCaminho = lista.find((p) => caminhoDoPeriodo(lista, p.id) === prefixo);
        if (porCaminho) {
            paiId = porCaminho.id;
            return;
        }
        const mesmoNome = lista.filter(
            (p) => normalizarTexto(p.nome).toLowerCase() === parte.toLowerCase(),
        );
        if (mesmoNome.length === 1) {
            paiId = mesmoNome[0].id;
            return;
        }
        if (mesmoNome.length > 1 && contagem) contagem.homonimos++;
        paiId = novo(parte, paiId);
        if (contagem) contagem.paisCriados++;
    });
    return novo(nome, paiId, extra);
}

function criarEntidade(campo, nome, dbRef, extra = null) {
    const id = gerarId();
    if (campo === 'pessoas')
        dbRef.pessoas.push({
            id,
            nome,
            grupoIds: [],
            genero: '',
            identidadeCisTrans: '',
            corRaca: '',
        });
    else if (campo === 'grupos') dbRef.grupos.push({ id, nome, cor: CORES_GRUPO_PADRAO });
    else if (campo === 'autores') {
        const autor = { id, nome, sobre: extra?.sobre ?? '' };
        if (extra?.isni) autor.isni = extra.isni;
        if (extra?.nacionalidade) autor.nacionalidade = extra.nacionalidade;
        if (extra?.nascimento) autor.nascimento = extra.nascimento;
        if (extra?.obito) autor.obito = extra.obito;
        // Demografia só entra quando o pacote a declara (vazio = "não
        // documentado"); orientação, religião etc. ficam de fora de
        // propósito — não fazem parte do que um pacote público afirma.
        if (extra?.sexo) autor.sexo = extra.sexo;
        if (extra?.genero) autor.genero = extra.genero;
        if (extra?.corRaca) autor.corRaca = extra.corRaca;
        if (Array.isArray(extra?.nomesLiterarios) && extra.nomesLiterarios.length) {
            autor.nomesLiterarios = extra.nomesLiterarios.map((n) => ({
                nome: n.nome,
                tipo: n.tipo,
            }));
        }
        dbRef.autores.push(autor);
    } else if (campo === 'epocaRetratada.epocaId') {
        // Bloco 3: Esfera e Categoria vêm do pacote quando ele as declara;
        // Pessoas envolvidas não viajam (ids não valem noutro acervo).
        const epoca = {
            id,
            nome,
            notas: '',
            inicio: null,
            fim: null,
            esferas: normalizarLista(extra?.esferas),
            categorias: normalizarLista(extra?.categorias),
            pessoasEnvolvidas: [],
            relacoes: [],
            pertenceA: [],
            ...(extra?.evento === true ? { evento: true } : {}),
        };
        dbRef.epocas.push(epoca);
        registrarValoresNovos(dbRef, epoca);
    } else if (campo === 'periodoHistoricoId') {
        const periodo = {
            id,
            nome,
            notas: '',
            regiao: [],
            inicio: null,
            fim: null,
            pertenceA: [],
            fontes: [],
            esferas: normalizarLista(extra?.esferas),
            categorias: normalizarLista(extra?.categorias),
            ...(extra?.evento === true ? { evento: true } : {}),
        };
        dbRef.periodosHistoricos.push(periodo);
        registrarValoresNovosPeriodoHistorico(dbRef, periodo);
    } else if (campo === 'livroId')
        dbRef.livros.push({ id, titulo: nome, sequencia: null, tipo: '', fase: '' });
    else if (campo === 'movimentosEscolas')
        dbRef.movimentosEscolas.push({
            id,
            nome,
            notas: '',
            inicio: { dia: null, mes: null, ano: null, seculo: null, decada: null },
            fim: { dia: null, mes: null, ano: null, seculo: null, decada: null },
            tipo: '',
            posturaEstetica: '',
            programa: '',
            paiId: null,
            divisao: '',
            generoDivisao: '',
            regiaoOrigem: [],
            valores: [],
            temas: [],
            tecnicas: [],
            tiposComposicao: [],
            lemas: [],
            manifestos: [],
            fontes: [],
        });
    return id;
}

// Reescreve um item de origem com o novo id e cada referência interna
// trocada pelo id de destino já resolvido (r._destinoFinal, calculado
// em aplicarImportacaoAditiva). Nunca posiciona em Partes/Seções
// (decisão 4) — paiId/paiTipo sempre saem nulos.
function remontarItem(itemOrigem, novoId, referencias) {
    const destinoDe = (campo, idOrigem) => {
        const ref = referencias.find(
            (r) => r.campo === campo && r.valorOrigem.idOrigem === idOrigem,
        );
        return ref ? ref._destinoFinal : null;
    };

    const novo = { ...itemOrigem };
    delete novo.tipo; // campo de exportação, não faz parte do schema do item
    delete novo.contexto; // decorativo/derivado, nunca persiste no item
    delete novo.gruposDiretosResolvidos;
    delete novo.livrosResolvidos;
    delete novo.movimentosEscolasResolvidos;
    delete novo.periodoHistoricoNome; // só existia pra resolução de referência, não persiste
    delete novo.periodoHistoricoCaminho; // idem
    delete novo.periodoHistoricoId; // arquivo antigo: vira periodosHistoricosIds abaixo
    delete novo.periodosHistoricosResolvidos; // idem
    delete novo.periodosHistoricosIds; // ids de outro acervo, refeitos abaixo
    delete novo.sonoridade; // vira registro próprio em db.escansoes, ver aplicarImportacaoAditiva
    delete novo.estruturaTextual; // idem, em db.estruturasTextuais

    novo.id = novoId;
    novo.paiId = null;
    novo.paiTipo = null;

    novo.pessoas = (itemOrigem.pessoas || [])
        .map((p) => ({ pessoaId: destinoDe('pessoas', p.pessoaId), papeis: p.papeis || [] }))
        .filter((p) => p.pessoaId != null);

    novo.gruposDiretos = (itemOrigem.gruposDiretosResolvidos || [])
        .map((g) => destinoDe('grupos', g.id))
        .filter((id) => id != null);

    novo.autoria = (itemOrigem.autoria || [])
        .map((a) => ({
            autorId: destinoDe('autores', a.autorId),
            papel: a.papel,
            // Assinatura (Ortônimo/Heterônimo/Pseudônimo) e o nome literário
            // usado NESTE texto atravessam a importação; sem isso um
            // heterônimo virava Ortônimo em silêncio.
            ...(a.assinatura ? { assinatura: a.assinatura } : {}),
            ...(a.nomeLiterario ? { nomeLiterario: a.nomeLiterario } : {}),
        }))
        .filter((a) => a.autorId != null);

    if (itemOrigem.epocaRetratada) {
        // Nome, Esfera e Categoria só existiam pra resolução de referência e
        // pra criar o período novo, não persistem no texto. Período sem
        // destino (oculto no arquivo de origem) fica de fora; as datas e o N/A
        // do texto seguem.
        novo.epocaRetratada = {
            periodos: periodosEpocaDeOrigem(itemOrigem)
                .map((p) => ({
                    epocaId: destinoDe('epocaRetratada.epocaId', p.epocaId),
                    recorte: p.recorte || null,
                }))
                .filter((p) => p.epocaId != null),
            inicio: itemOrigem.epocaRetratada.inicio ?? null,
            fim: itemOrigem.epocaRetratada.fim ?? null,
            na: !!itemOrigem.epocaRetratada.na,
        };
    }

    novo.periodosHistoricosIds = periodosHistoricosIdsDoItem({
        periodosHistoricosIds: periodosDeOrigem(itemOrigem).map((pOrigem) =>
            destinoDe('periodoHistoricoId', pOrigem.id),
        ),
    });

    novo.livrosIds = (itemOrigem.livrosResolvidos || [])
        .map((l) => destinoDe('livroId', l.id))
        .filter((id) => id != null);

    novo.movimentosEscolasIds = (itemOrigem.movimentosEscolasResolvidos || [])
        .map((m) => destinoDe('movimentosEscolas', m.id))
        .filter((id) => id != null);

    return novo;
}

// Um nome literário usado por um texto importado precisa constar no
// cadastro do Autor, com o tipo da Assinatura — é a condição que o modal
// de Autoria (editor.js) exige pra manter o nome ao abrir o texto. Autor
// NOVO já nasce com os nomes do pacote (criarEntidade); aqui cobre o
// Autor que já existia: só ACRESCENTA o nome que falta, nunca altera nem
// remove nada do cadastro, e nome já cadastrado (com qualquer tipo) fica
// como está.
function registrarNomesLiterariosUsados(dbRef, item) {
    (item.autoria || []).forEach((a) => {
        if (!a.nomeLiterario || !TIPOS_NOME_LITERARIO.includes(a.assinatura)) return;
        const autor = dbRef.autores.find((x) => x.id == a.autorId);
        if (!autor) return;
        const lista = Array.isArray(autor.nomesLiterarios) ? autor.nomesLiterarios : [];
        const jaTem = lista.some((n) => (typeof n === 'string' ? n : n?.nome) === a.nomeLiterario);
        if (jaTem) return;
        autor.nomesLiterarios = [...lista, { nome: a.nomeLiterario, tipo: a.assinatura }];
    });
}

// ─── Fase 3 (rede de segurança forçada) + Fase 4 (remapeamento e
// escrita atômica) ───────────────────────────────────────────────
// `deps.tirarSnapshotSeNecessario`/`deps.save` são injetados pra dar
// pra testar o remapeamento sem IndexedDB/localStorage de verdade —
// em produção, forms.js passa as funções reais de autobackup.js/db.js.
export async function aplicarImportacaoAditiva(payload, relatorio, dbRef, deps) {
    if (!relatorioProntoParaAplicar(relatorio)) {
        return { sucesso: false, motivo: 'pendente' };
    }

    const snapshotOk = await deps.tirarSnapshotSeNecessario(dbRef, true);
    if (!snapshotOk) {
        return { sucesso: false, motivo: 'snapshot' };
    }

    const itensOrigem = normalizarItensPayload(payload);
    const porIdOrigem = new Map(itensOrigem.map((it) => [it.id, it]));

    // Uma entidade "criar" só é criada uma vez por lote, mesmo que
    // vários itens importados apontem pra ela (mesma idOrigem).
    const mapaCriados = {
        pessoas: {},
        grupos: {},
        autores: {},
        epocas: {},
        periodosHistoricos: {},
        livros: {},
        movimentosEscolas: {},
    };

    // Alvo de Elos e Ecos (F11-D9): id de origem → id novo de cada texto criado
    // no lote, preenchido no loop e usado na passada final, quando todos já
    // têm id (um texto pode ecoar outro que ainda não foi remontado).
    const mapaNovosIds = new Map();
    const contextoAlvos = montarContextoAlvos(relatorio, dbRef);

    const novosPoemas = [];
    const novasProsas = [];
    const novasEscansoes = [];
    const novasEstruturasTextuais = [];
    let duplicatasPuladas = 0;
    // Pais de período criados pelo caminho e quantos tinham homônimo no destino.
    const periodos = { paisCriados: 0, homonimos: 0 };

    relatorio.itensOrigem.forEach((rel) => {
        if (rel.status === 'erro') return; // já não entra no lote

        const dupRef = rel.referencias.find((r) => r.campo === 'duplicataTitulo');
        if (dupRef && dupRef.decisao === 'casar') {
            duplicatasPuladas++; // tratado como duplicata — não cria nada
            return;
        }

        // Ficha da Pessoa (F1-D7): o destino, criado ou casado, só preenche o
        // que estava vazio. JSON antigo (sem os campos) não muda nada.
        const itemDaRef = porIdOrigem.get(rel.idOrigem);
        const completarPessoa = (r, destinoId) => {
            if (r.campo !== 'pessoas' || !itemDaRef) return;
            const vinculo = (itemDaRef.pessoas || []).find(
                (p) => String(p?.pessoaId) === String(r.valorOrigem.idOrigem),
            );
            if (!vinculo) return;
            completarPessoaComFicha(
                dbRef.pessoas.find((p) => p.id == destinoId),
                vinculo,
            );
        };

        rel.referencias.forEach((r) => {
            if (r.campo === 'duplicataTitulo') return;
            const colecao = COLECAO_POR_CAMPO[r.campo];
            if (r.decisao === 'casar') {
                r._destinoFinal = r.entidadeDestinoId;
                completarPessoa(r, r._destinoFinal);
                return;
            }
            let destinoId = mapaCriados[colecao][r.valorOrigem.idOrigem];
            if (destinoId === undefined) {
                const extra =
                    r.campo === 'autores'
                        ? metadadosAutorDoPayload(
                              payload,
                              r.valorOrigem.idOrigem,
                              r.valorOrigem.nome,
                          )
                        : r.campo === 'epocaRetratada.epocaId'
                          ? camposEpocaDoPayload(payload, r.valorOrigem.idOrigem)
                          : r.campo === 'periodoHistoricoId'
                            ? camposPeriodoHistoricoDoPayload(payload, r.valorOrigem.idOrigem)
                            : null;
                destinoId =
                    r.campo === 'periodoHistoricoId'
                        ? criarPeriodoHistoricoComCaminho(
                              dbRef,
                              r.valorOrigem.nome,
                              r.caminhoOrigem,
                              periodos,
                              extra,
                          )
                        : criarEntidade(r.campo, r.valorOrigem.nome, dbRef, extra);
                mapaCriados[colecao][r.valorOrigem.idOrigem] = destinoId;
            }
            r._destinoFinal = destinoId;
            completarPessoa(r, destinoId);
        });

        const itemOrigem = porIdOrigem.get(rel.idOrigem);
        if (!itemOrigem) return;
        const novoId = gerarId();
        mapaNovosIds.set(String(rel.idOrigem), novoId);
        const novoItem = remontarItem(itemOrigem, novoId, rel.referencias);
        // Tema por id (fase 2): o id de origem não vale aqui; casa/cria o
        // Tema pelo NOME (a `nome` que montarRegistro grava) e mantém o
        // papel. JSON antigo (sem `temas`) cai no espelho `sinalizacoesTema`,
        // que a reconciliação de temas.js migra no save().
        if (Array.isArray(itemOrigem.temas)) {
            const { temas, espelho } = resolverTemasEditados(
                dbRef,
                itemOrigem.temas.map((t) => ({ nome: t?.nome, papel: t?.papel })),
            );
            novoItem.temas = temas;
            novoItem.sinalizacoesTema = espelho;
        }
        // Papel do Assunto fixado no texto de origem: o id de origem não vale
        // aqui, então casa o Assunto do destino pelo NOME (sem caixa/acento) e
        // descarta o que não existe. JSON antigo (sem `assuntosPapel`) vira [].
        // Sempre reescreve: `remontarItem` pode ter copiado os ids de origem.
        novoItem.assuntosPapel = assuntosPapelImportados(dbRef, itemOrigem);
        // Idem para a exceção "não se aplica a este texto": ids de origem não valem.
        novoItem.assuntosExcluidos = assuntosExcluidosImportados(dbRef, itemOrigem);
        // Etiquetas (Fase 16): os ids de origem não valem aqui. Casa/cria pelo
        // NOME na categoria (a lista de nomes vem do cadastro do próprio
        // arquivo; JSON antigo traz o texto "a, b" e cai no mesmo caminho).
        Object.entries(ETIQUETAS_CATEGORIAS).forEach(([categoria, campo]) => {
            novoItem[campo] = resolverEtiquetasEditadas(
                dbRef,
                categoria,
                nomesDeEtiquetasDaOrigem(payload, itemOrigem[campo]),
            );
        });
        // Territorialidade e local de escrita: os ids de origem não valem
        // aqui. Com a hierarquia no JSON, casa/cria os Locais por nome +
        // tipo + pai; sem ela (JSON antigo), zera os ids e o espelho
        // `sinalizacoesTerritorialidade` é migrado no save().
        const locaisImportados = importarLocaisDoTexto(dbRef, itemOrigem);
        delete novoItem.locaisHierarquia;
        novoItem.territorialidade = locaisImportados ? locaisImportados.ids : [];
        novoItem.localEscrita = locaisImportados ? locaisImportados.localEscrita : null;
        if (locaisImportados) novoItem.sinalizacoesTerritorialidade = locaisImportados.espelho;
        // Personagem: casa/cria pelo NOME (o id de origem não vale aqui). JSON
        // antigo, sem `personagens`, vira [].
        novoItem.personagens = importarPersonagensDoTexto(dbRef, itemOrigem);
        // Âncora do Eco: recasa pelo nome com o que já existe (depois dos vínculos
        // do texto acima, que são quem cria Pessoa/Personagem). Nunca cria ninguém.
        if (novoItem.conceitos && Array.isArray(novoItem.conceitos.ecos)) {
            novoItem.conceitos = {
                ...novoItem.conceitos,
                ecos: ecosImportados(dbRef, novoItem.conceitos.ecos),
            };
        }
        registrarNomesLiterariosUsados(dbRef, novoItem);
        (rel.tipo === 'poemas' ? novosPoemas : novasProsas).push(novoItem);

        // Sonoridade/Estrutura Textual (só presentes com "download
        // abrangente" ligado na Exportação) não são referência — são
        // registros próprios (db.escansoes/db.estruturasTextuais) que
        // só existem "dependurados" no id do Poema. Ganham id novo
        // (o id de origem não tem nenhum significado no acervo de
        // destino) e o poemaId trocado pro id recém-gerado acima.
        if (itemOrigem.sonoridade) {
            novasEscansoes.push({ ...itemOrigem.sonoridade, id: gerarId(), poemaId: novoId });
        }
        if (itemOrigem.estruturaTextual) {
            novasEstruturasTextuais.push({
                ...itemOrigem.estruturaTextual,
                id: gerarId(),
                poemaId: novoId,
            });
        }
    });

    // Segunda passada: com o lote inteiro já com id novo, reescreve o alvo de
    // cada Elo e Eco. Sem alvo (fora do lote, sem duplicata casada e sem título
    // igual no acervo), a entrada é solta; a prévia já avisou quantas.
    const soltos = { elos: 0, ecos: 0 };
    [...novosPoemas, ...novasProsas].forEach((novoItem) => {
        if (!novoItem.conceitos) return;
        const r = remapearAlvosDoConceitos(novoItem.conceitos, contextoAlvos, mapaNovosIds);
        novoItem.conceitos = r.conceitos;
        soltos.elos += r.soltos.elos;
        soltos.ecos += r.soltos.ecos;
    });

    // Só no fim: um único push por coleção, seguido de um único save().
    dbRef.poemas.push(...novosPoemas);
    dbRef.prosas.push(...novasProsas);
    dbRef.escansoes.push(...novasEscansoes);
    dbRef.estruturasTextuais.push(...novasEstruturasTextuais);
    deps.save();

    return {
        sucesso: true,
        criados: {
            poemas: novosPoemas.length,
            prosas: novasProsas.length,
            escansoes: novasEscansoes.length,
            estruturasTextuais: novasEstruturasTextuais.length,
        },
        duplicatasPuladas,
        soltos,
        periodos,
    };
}
