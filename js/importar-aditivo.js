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

import { gerarId, CORES_GRUPO_PADRAO, TIPOS_NOME_LITERARIO } from './utils.js';

// Referência (campo do relatório) → coleção de `db` que ela resolve.
const COLECAO_POR_CAMPO = {
    pessoas: 'pessoas',
    grupos: 'grupos',
    autores: 'autores',
    'epocaRetratada.epocaId': 'epocas',
    livroId: 'livros',
};

function normalizarTexto(s) {
    return String(s ?? '').trim();
}

// Candidatos por nome (case-insensitive). Match exato tem prioridade —
// só cai pra aproximado (substring num sentido ou noutro) se não houver
// nenhum exato, e nesse caso pode haver mais de um candidato.
function candidatosPorNome(lista, nome) {
    const alvo = normalizarTexto(nome).toLowerCase();
    if (!alvo || !Array.isArray(lista)) return [];

    const nomeDe = (x) => normalizarTexto(x.nome ?? x.titulo);

    const exatos = lista
        .filter((x) => nomeDe(x).toLowerCase() === alvo)
        .map((x) => ({ id: x.id, nome: nomeDe(x), match: 'exato' }));
    if (exatos.length) return exatos;

    return lista
        .filter((x) => {
            const n = nomeDe(x).toLowerCase();
            return n && (n.includes(alvo) || alvo.includes(n));
        })
        .map((x) => ({ id: x.id, nome: nomeDe(x), match: 'aproximado' }));
}

// Regras de classificação (ver docs): sem candidato → 'criar'
// automático; um candidato exato → 'casar' pré-marcado (trocável);
// candidato aproximado ou mais de um → ambíguo, decisão manual.
function classificarReferencia(campo, idOrigem, nome, lista) {
    const candidatos = candidatosPorNome(lista, nome);
    const exatoUnico = candidatos.length === 1 && candidatos[0].match === 'exato';
    return {
        campo,
        valorOrigem: { idOrigem: idOrigem ?? null, nome: normalizarTexto(nome) },
        candidatos,
        decisao: candidatos.length === 0 ? 'criar' : exatoUnico ? 'casar' : null,
        entidadeDestinoId: exatoUnico ? candidatos[0].id : null,
    };
}

// Extrai as referências de um item exportado (formato montarRegistro,
// já com os nomes denormalizados: pessoas[].nome, autoria[].nome,
// gruposDiretosResolvidos, livrosResolvidos, epocaRetratada.nomeEpoca).
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

    if (item.epocaRetratada?.epocaId != null) {
        refs.push(
            classificarReferencia(
                'epocaRetratada.epocaId',
                item.epocaRetratada.epocaId,
                item.epocaRetratada.nomeEpoca,
                dbRef.epocas,
            ),
        );
    }

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
function metadadosAutorDoPayload(payload, idOrigem, nome) {
    const lista = Array.isArray(payload?.autores) ? payload.autores : [];
    const alvo = normalizarTexto(nome).toLowerCase();
    return (
        lista.find((a) => a?.id != null && a.id === idOrigem) ||
        lista.find((a) => normalizarTexto(a?.nome).toLowerCase() === alvo) ||
        null
    );
}

function criarEntidade(campo, nome, dbRef, extra = null) {
    const id = gerarId();
    if (campo === 'pessoas') dbRef.pessoas.push({ id, nome, grupoIds: [] });
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
    }
    else if (campo === 'epocaRetratada.epocaId')
        dbRef.epocas.push({ id, nome, contextoRelacao: '', notas: '' });
    else if (campo === 'livroId')
        dbRef.livros.push({ id, titulo: nome, sequencia: null, tipo: '', fase: '' });
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

    if (itemOrigem.epocaRetratada?.epocaId != null) {
        const { nomeEpoca, ...resto } = itemOrigem.epocaRetratada;
        void nomeEpoca; // só existia pra resolução de referência, não persiste
        novo.epocaRetratada = {
            ...resto,
            epocaId: destinoDe('epocaRetratada.epocaId', itemOrigem.epocaRetratada.epocaId),
        };
    }

    novo.livrosIds = (itemOrigem.livrosResolvidos || [])
        .map((l) => destinoDe('livroId', l.id))
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
    const mapaCriados = { pessoas: {}, grupos: {}, autores: {}, epocas: {}, livros: {} };

    const novosPoemas = [];
    const novasProsas = [];
    const novasEscansoes = [];
    const novasEstruturasTextuais = [];
    let duplicatasPuladas = 0;

    relatorio.itensOrigem.forEach((rel) => {
        if (rel.status === 'erro') return; // já não entra no lote

        const dupRef = rel.referencias.find((r) => r.campo === 'duplicataTitulo');
        if (dupRef && dupRef.decisao === 'casar') {
            duplicatasPuladas++; // tratado como duplicata — não cria nada
            return;
        }

        rel.referencias.forEach((r) => {
            if (r.campo === 'duplicataTitulo') return;
            const colecao = COLECAO_POR_CAMPO[r.campo];
            if (r.decisao === 'casar') {
                r._destinoFinal = r.entidadeDestinoId;
                return;
            }
            let destinoId = mapaCriados[colecao][r.valorOrigem.idOrigem];
            if (destinoId === undefined) {
                const extra =
                    r.campo === 'autores'
                        ? metadadosAutorDoPayload(payload, r.valorOrigem.idOrigem, r.valorOrigem.nome)
                        : null;
                destinoId = criarEntidade(r.campo, r.valorOrigem.nome, dbRef, extra);
                mapaCriados[colecao][r.valorOrigem.idOrigem] = destinoId;
            }
            r._destinoFinal = destinoId;
        });

        const itemOrigem = porIdOrigem.get(rel.idOrigem);
        if (!itemOrigem) return;
        const novoId = gerarId();
        const novoItem = remontarItem(itemOrigem, novoId, rel.referencias);
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
    };
}
