// temas.js — Cadastro central de Tema (db.temas = [{ id, nome, notas }]).
//
// Fase 1 (aba Temas): cadastro pra renomear, anotar e triar; o Assunto
// lista os Temas por nome (`assunto.temas`) e renomear propaga o novo
// nome aos Assuntos.
//
// Fase 2 (este arquivo, seção "Tema por id no texto"): o texto guarda
// `temas: [{ temaId, papel }]` como fonte da verdade e mantém
// `sinalizacoesTema` como ESPELHO derivado (nomes separados por vírgula).
// `reconciliarTemasDoTexto` roda a cada sincronizarTemas (load, importar,
// save) e cobre também quem ainda escreve só o espelho (edição em massa,
// Localizar e Substituir, JSON antigo): se o espelho não bate com os
// `temas`, ele vence e os `temas` são refeitos a partir dele.
//
// Fase 3 (Assunto por id + mesclagem): `assunto.temaIds` guarda ids do
// cadastro (o nome mora só em `db.temas`), então renomear um Tema não
// precisa mais reescrever nenhum Assunto. Assunto no formato antigo
// (`assunto.temas`, lista de nomes) é convertido em `sincronizarTemas`.
// `mesclarTemas` junta dois Temas (textos e Assuntos passam ao destino).
//
// Tudo aqui é função pura sobre o objeto `dbRef` passado (sem DOM, sem
// save()), pra ser testável e reaproveitável no load, no importarDB e
// nas telas. Comparação de nomes sempre por `chaveTema` (sem caixa/acento).

import {
    chaveTema,
    temasDoTexto,
    resumoTemas,
    gerarId,
    normalizarPapelTema,
    espelhoDeTemas,
    PAPEIS_TEMA,
} from './utils.js';

function todosOsTextos(dbRef) {
    return [...(dbRef.poemas || []), ...(dbRef.prosas || [])];
}

// Vírgula é o separador do espelho `sinalizacoesTema`, então não pode
// existir dentro do nome de um Tema.
export function limparNomeTema(nome) {
    return String(nome ?? '')
        .replace(/,/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// Id do Tema de nome `nome` (sem caixa/acento), criando o registro se
// ainda não existe. Devolve null para nome vazio.
export function garantirTema(dbRef, nome) {
    const limpo = limparNomeTema(nome);
    const chave = chaveTema(limpo);
    if (!chave) return null;
    if (!Array.isArray(dbRef.temas)) dbRef.temas = [];
    const existente = dbRef.temas.find((t) => chaveTema(t.nome) === chave);
    if (existente) return existente.id;
    const id = gerarId();
    dbRef.temas.push({ id, nome: limpo, notas: '' });
    return id;
}

// Garante que todo Tema em uso (nos textos ou listado por algum Assunto)
// tenha registro em `dbRef.temas`. Nunca apaga nem renomeia registro
// existente; a grafia de um Tema novo é a mais frequente nos textos (ou a
// do Assunto, se nenhum texto o usa). Idempotente. Devolve quantos
// registros criou.
export function sincronizarTemas(dbRef) {
    if (!Array.isArray(dbRef.temas)) dbRef.temas = [];
    dbRef.temas.forEach((t) => {
        t.nome = String(t.nome ?? '').trim();
        t.notas = typeof t.notas === 'string' ? t.notas : '';
    });
    const conhecidos = new Set(dbRef.temas.map((t) => chaveTema(t.nome)));
    let criados = 0;
    const registrar = (nome) => {
        const chave = chaveTema(nome);
        if (!chave || conhecidos.has(chave)) return;
        conhecidos.add(chave);
        dbRef.temas.push({ id: gerarId(), nome, notas: '' });
        criados += 1;
    };
    resumoTemas(todosOsTextos(dbRef), [], dbRef.temas).forEach((t) => registrar(t.nome));
    // Assunto no formato antigo (nomes em `temas`): o nome ainda sem
    // registro ganha um, e o Assunto passa a guardar ids.
    (dbRef.assuntos || []).forEach((a) => {
        if (Array.isArray(a.temas)) a.temas.forEach(registrar);
    });
    migrarAssuntosParaIds(dbRef);
    // Fase 2: cada texto ganha/mantém `temas` (por id) + o espelho.
    todosOsTextos(dbRef).forEach((t) => reconciliarTemasDoTexto(dbRef, t));
    return criados;
}

// Assunto por id (fase 3): converte `assunto.temas` (nomes) em
// `assunto.temaIds` e descarta ids que não existem mais no cadastro, sem
// repetição. Se o Assunto tem os dois formatos (backup misto), une os dois.
// Idempotente; o campo antigo `temas` é apagado do Assunto.
export function migrarAssuntosParaIds(dbRef) {
    const porChave = new Map((dbRef.temas || []).map((t) => [chaveTema(t.nome), t.id]));
    const existentes = new Set((dbRef.temas || []).map((t) => String(t.id)));
    (dbRef.assuntos || []).forEach((a) => {
        const ids = [];
        const vistos = new Set();
        const empurrar = (id) => {
            const chave = String(id);
            if (id == null || !existentes.has(chave) || vistos.has(chave)) return;
            vistos.add(chave);
            ids.push(id);
        };
        (Array.isArray(a.temaIds) ? a.temaIds : []).forEach(empurrar);
        (Array.isArray(a.temas) ? a.temas : []).forEach((nome) => {
            empurrar(porChave.get(chaveTema(nome)));
        });
        a.temaIds = ids;
        delete a.temas;
    });
}

// ─── Tema por id no texto (fase 2) ─────────────────────────────────────

function nomeDoTemaPorId(dbRef, id) {
    return (dbRef.temas || []).find((t) => t.id == id)?.nome ?? '';
}

// Entradas [{ nome, papel }] vindas do editor → `{ temas, espelho }` prontos
// pra gravar no texto. Cria no cadastro o Tema que ainda não existe.
export function resolverTemasEditados(dbRef, entradas) {
    const vistos = new Set();
    const temas = [];
    (entradas || []).forEach((e) => {
        const id = garantirTema(dbRef, e?.nome);
        if (id == null || vistos.has(String(id))) return;
        vistos.add(String(id));
        temas.push({ temaId: id, papel: normalizarPapelTema(e?.papel) });
    });
    const espelho = espelhoDeTemas(
        temas.map((t) => ({ nome: nomeDoTemaPorId(dbRef, t.temaId), papel: t.papel })),
    );
    return { temas, espelho };
}

// Temas de um texto como [{ temaId, nome, papel }] (só ids que existem
// no cadastro), na ordem gravada.
export function temasDoTextoResolvidos(dbRef, item) {
    return (Array.isArray(item?.temas) ? item.temas : [])
        .map((e) => ({
            temaId: e?.temaId,
            nome: nomeDoTemaPorId(dbRef, e?.temaId),
            papel: normalizarPapelTema(e?.papel),
        }))
        .filter((e) => e.nome);
}

// Deixa `item.temas` e o espelho `item.sinalizacoesTema` coerentes entre
// si e com o cadastro. Casos: (1) texto sem `temas` (dado antigo) → migra
// do espelho, papel "sem papel definido"; (2) `temas` e espelho falam dos
// mesmos Temas → mantém os `temas` (com papéis) e só normaliza o espelho;
// (3) divergem (alguém editou só o espelho) → o espelho vence: refaz os
// `temas`, guardando o papel de quem já estava. Devolve true se mudou algo.
export function reconciliarTemasDoTexto(dbRef, item) {
    if (!item) return false;
    const nomesEspelho = temasDoTexto(item);
    const chavesEspelho = new Set(nomesEspelho.map(chaveTema));
    const anteriores = Array.isArray(item.temas) ? item.temas : null;

    let temas = null;
    if (anteriores) {
        const vistos = new Set();
        const validos = [];
        anteriores.forEach((e) => {
            const key = String(e?.temaId);
            const tema = (dbRef.temas || []).find((t) => String(t.id) === key);
            if (!tema || vistos.has(key)) return;
            vistos.add(key);
            validos.push({ temaId: tema.id, papel: normalizarPapelTema(e.papel) });
        });
        const chavesBase = new Set(validos.map((e) => chaveTema(nomeDoTemaPorId(dbRef, e.temaId))));
        const igual =
            chavesBase.size === chavesEspelho.size &&
            [...chavesBase].every((c) => chavesEspelho.has(c));
        if (igual) temas = validos;
    }
    if (!temas) {
        const papelAnterior = new Map(
            (anteriores || []).map((e) => [String(e?.temaId), normalizarPapelTema(e?.papel)]),
        );
        const vistos = new Set();
        temas = [];
        nomesEspelho.forEach((nome) => {
            const id = garantirTema(dbRef, nome);
            if (id == null || vistos.has(String(id))) return;
            vistos.add(String(id));
            temas.push({ temaId: id, papel: papelAnterior.get(String(id)) || '' });
        });
    }
    const espelho = espelhoDeTemas(
        temas.map((e) => ({ nome: nomeDoTemaPorId(dbRef, e.temaId), papel: e.papel })),
    );
    const mudou =
        JSON.stringify(item.temas) !== JSON.stringify(temas) || item.sinalizacoesTema !== espelho;
    item.temas = temas;
    item.sinalizacoesTema = espelho;
    return mudou;
}

// ─── Temas em lote (barra de seleção de Poemas e Prosas) ───────────────
// Lógica pura do botão "Temas" da edição em massa: adiciona/remove vários
// Temas de uma vez nos textos selecionados, pela fonte da verdade
// (`item.temas`, por id) e já regrava o espelho `sinalizacoesTema`. Entra
// com papel "indefinido" (como Pessoa entra sem papéis na edição em massa);
// quem quiser principal/secundário ajusta no modal do texto. Não pede
// confirmação nem salva: quem chama decide.

// "amor, Saudade ,, amor" → ['amor', 'Saudade']: nomes limpos, sem
// repetição (por chave, sem caixa/acento), na ordem digitada.
export function nomesDeTemasDigitados(texto) {
    const vistos = new Set();
    const saida = [];
    String(texto ?? '')
        .split(',')
        .forEach((parte) => {
            const nome = limparNomeTema(parte);
            const chave = chaveTema(nome);
            if (!chave || vistos.has(chave)) return;
            vistos.add(chave);
            saida.push(nome);
        });
    return saida;
}

export function gravarTemasNoTexto(dbRef, item, temas) {
    item.temas = temas;
    item.sinalizacoesTema = espelhoDeTemas(
        temas.map((e) => ({ nome: nomeDoTemaPorId(dbRef, e.temaId), papel: e.papel })),
    );
}

// Nomes de `nomes` que ainda não têm registro no cadastro (por chave).
export function temasInexistentes(dbRef, nomes) {
    const conhecidos = new Set((dbRef.temas || []).map((t) => chaveTema(t.nome)));
    return (nomes || []).filter((n) => !conhecidos.has(chaveTema(n)));
}

// Adiciona os Temas `nomes` a cada item de `itens` (criando no cadastro o
// que ainda não existe). Quem já tinha o Tema não muda (papel preservado).
// Devolve `{ textos, vinculos, criados }`: textos alterados, vínculos novos
// e Temas novos no cadastro.
export function adicionarTemasAosTextos(dbRef, itens, nomes) {
    const antes = (dbRef.temas || []).length;
    const ids = [];
    (nomes || []).forEach((nome) => {
        const id = garantirTema(dbRef, nome);
        if (id != null) ids.push(id);
    });
    const criados = (dbRef.temas || []).length - antes;
    let textos = 0;
    let vinculos = 0;
    (itens || []).forEach((item) => {
        reconciliarTemasDoTexto(dbRef, item);
        const temas = [...item.temas];
        let novos = 0;
        ids.forEach((id) => {
            if (temas.some((e) => String(e.temaId) === String(id))) return;
            temas.push({ temaId: id, papel: '' });
            novos += 1;
        });
        if (!novos) return;
        gravarTemasNoTexto(dbRef, item, temas);
        textos += 1;
        vinculos += novos;
    });
    return { textos, vinculos, criados };
}

// Tira os Temas `nomes` de cada item de `itens`. Nunca cria Tema e nunca o
// exclui do cadastro (isso é na aba Temas). Devolve `{ textos, vinculos,
// desconhecidos }`: `desconhecidos` são os nomes sem registro no cadastro.
export function removerTemasDosTextos(dbRef, itens, nomes) {
    const desconhecidos = temasInexistentes(dbRef, nomes);
    const chaves = new Set((nomes || []).map(chaveTema));
    const ids = new Set(
        (dbRef.temas || []).filter((t) => chaves.has(chaveTema(t.nome))).map((t) => String(t.id)),
    );
    let textos = 0;
    let vinculos = 0;
    if (ids.size) {
        (itens || []).forEach((item) => {
            reconciliarTemasDoTexto(dbRef, item);
            const temas = item.temas.filter((e) => !ids.has(String(e.temaId)));
            const tirados = item.temas.length - temas.length;
            if (!tirados) return;
            gravarTemasNoTexto(dbRef, item, temas);
            textos += 1;
            vinculos += tirados;
        });
    }
    return { textos, vinculos, desconhecidos };
}

// ─── Assunto do Tema, pelo modal do texto ───────────────────────────────
// No modal de Poema/Prosa a pessoa pode ligar um Tema a um Assunto (existente
// ou novo) sem sair do texto. A ligação é do TEMA no cadastro (vale para
// todos os textos com esse Tema), não do texto. Fica como lista de
// pendências `[{ temaChave, assuntoId, nome }]` (`assuntoId` null = Assunto
// novo) e só vira cadastro ao salvar o texto (`aplicarAssuntosPendentes`),
// então cancelar o modal não suja nada. Funções puras, sem DOM nem save().

export const PREFIXO_TEMA_TEMPORARIO = 'tmp:';
export const PREFIXO_ASSUNTO_NOVO = 'novo:';

// Id de um Assunto que ainda não existe no cadastro (só vive no modal).
export function assuntoEhNovo(id) {
    return String(id).startsWith(PREFIXO_ASSUNTO_NOVO);
}

export function limparNomeAssunto(nome) {
    return String(nome ?? '')
        .replace(/\s+/g, ' ')
        .trim();
}

function acharTemaPorChave(dbRef, chave) {
    return (dbRef.temas || []).find((t) => chaveTema(t.nome) === chave);
}

// Tenta ligar o Tema `temaNome` ao Assunto `nomeAssunto`. Nome que já existe no
// cadastro (sem caixa/acento) liga ao existente; senão marca um Assunto novo.
// Devolve `{ resultado, pendentes, assunto? }`; `resultado`: 'ok' | 'vazio' |
// 'ja-esta' (o cadastro já tem a ligação) | 'repetido' (já está pendente).
// Não altera `pendentes`: devolve a lista nova.
export function adicionarAssuntoPendente(dbRef, pendentes, temaNome, nomeAssunto) {
    const lista = Array.isArray(pendentes) ? pendentes : [];
    const nome = limparNomeAssunto(nomeAssunto);
    const temaChave = chaveTema(temaNome);
    if (!nome || !temaChave) return { resultado: 'vazio', pendentes: lista };
    const existente = (dbRef.assuntos || []).find((a) => chaveTema(a.nome) === chaveTema(nome));
    const tema = acharTemaPorChave(dbRef, temaChave);
    if (
        existente &&
        tema &&
        (existente.temaIds || []).some((id) => String(id) === String(tema.id))
    ) {
        return { resultado: 'ja-esta', pendentes: lista, assunto: existente };
    }
    const assuntoId = existente ? existente.id : null;
    const nomeFinal = existente ? existente.nome : nome;
    const chaveAssunto = chaveTema(nomeFinal);
    const repetido = lista.some(
        (p) => p.temaChave === temaChave && chaveTema(p.nome) === chaveAssunto,
    );
    if (repetido) return { resultado: 'repetido', pendentes: lista };
    return {
        resultado: 'ok',
        pendentes: [...lista, { temaChave, assuntoId, nome: nomeFinal }],
        assunto: { id: assuntoId, nome: nomeFinal },
    };
}

// Mantém só as pendências de Temas que ainda estão na lista do texto
// (`entradas`: [{ nome, papel }]): tirar o Tema do texto descarta as dele.
export function podarAssuntosPendentes(entradas, pendentes) {
    const chaves = new Set((entradas || []).map((e) => chaveTema(e.nome)));
    return (Array.isArray(pendentes) ? pendentes : []).filter((p) => chaves.has(p.temaChave));
}

// Cadastro "como ficará depois de salvar", só para o modal exibir: devolve
// cópias de `assuntos` e `temas` com as pendências aplicadas. Tema que ainda
// não existe ganha id temporário (`tmp:`) e Assunto novo ganha id `novo:`;
// nenhum dos dois vai para o cadastro de verdade.
export function sobreporAssuntosPendentes(dbRef, entradas, pendentes) {
    const temas = (dbRef.temas || []).map((t) => ({ ...t }));
    const assuntos = (dbRef.assuntos || []).map((a) => ({
        ...a,
        temaIds: Array.isArray(a.temaIds) ? [...a.temaIds] : a.temaIds,
    }));
    const idDoTema = (chave, nome) => {
        const achado = temas.find((t) => chaveTema(t.nome) === chave);
        if (achado) return achado.id;
        const id = `${PREFIXO_TEMA_TEMPORARIO}${chave}`;
        temas.push({ id, nome, notas: '' });
        return id;
    };
    const nomeDaEntrada = new Map((entradas || []).map((e) => [chaveTema(e.nome), e.nome]));
    podarAssuntosPendentes(entradas, pendentes).forEach((p) => {
        const temaId = idDoTema(p.temaChave, nomeDaEntrada.get(p.temaChave));
        let assunto =
            p.assuntoId != null
                ? assuntos.find((a) => String(a.id) === String(p.assuntoId))
                : assuntos.find((a) => chaveTema(a.nome) === chaveTema(p.nome));
        if (!assunto && p.assuntoId != null) return; // Assunto excluído nesse meio tempo
        if (!assunto) {
            assunto = {
                id: `${PREFIXO_ASSUNTO_NOVO}${chaveTema(p.nome)}`,
                nome: p.nome,
                notas: '',
                temaIds: [],
            };
            assuntos.push(assunto);
        }
        if (!assunto.temaIds.some((id) => String(id) === String(temaId)))
            assunto.temaIds.push(temaId);
    });
    return { assuntos, temas };
}

// Grava as pendências no cadastro. Chamar DEPOIS de `resolverTemasEditados`
// (o Tema já existe). Assunto novo é criado (ou reaproveitado, se o nome
// passou a existir); Assunto existente que sumiu do cadastro é ignorado.
// Devolve `{ criados, vinculos }`.
export function aplicarAssuntosPendentes(dbRef, entradas, pendentes) {
    if (!Array.isArray(dbRef.assuntos)) dbRef.assuntos = [];
    let criados = 0;
    let vinculos = 0;
    podarAssuntosPendentes(entradas, pendentes).forEach((p) => {
        const tema = acharTemaPorChave(dbRef, p.temaChave);
        if (!tema) return;
        let assunto =
            p.assuntoId != null
                ? dbRef.assuntos.find((a) => String(a.id) === String(p.assuntoId))
                : dbRef.assuntos.find((a) => chaveTema(a.nome) === chaveTema(p.nome));
        if (!assunto && p.assuntoId != null) return;
        if (!assunto) {
            assunto = { id: gerarId(), nome: p.nome, notas: '', temaIds: [] };
            dbRef.assuntos.push(assunto);
            criados += 1;
        }
        if (!Array.isArray(assunto.temaIds)) assunto.temaIds = [];
        if (assunto.temaIds.some((id) => String(id) === String(tema.id))) return;
        assunto.temaIds.push(tema.id);
        vinculos += 1;
    });
    return { criados, vinculos };
}

// Nº de textos (Poemas + Prosas) que têm o Tema, por `chaveTema`.
export function contarTextosPorTema(dbRef) {
    const contagem = new Map();
    todosOsTextos(dbRef).forEach((t) => {
        temasDoTexto(t).forEach((nome) => {
            const chave = chaveTema(nome);
            contagem.set(chave, (contagem.get(chave) || 0) + 1);
        });
    });
    return contagem;
}

// Ids de Poemas e Prosas que têm o Tema (comparação exata por chave).
export function textosDoTema(dbRef, nome) {
    const chave = chaveTema(nome);
    const tem = (t) => temasDoTexto(t).some((n) => chaveTema(n) === chave);
    return {
        poemasIds: (dbRef.poemas || []).filter(tem).map((t) => t.id),
        prosasIds: (dbRef.prosas || []).filter(tem).map((t) => t.id),
    };
}

// Assuntos (objetos) que listam o Tema `nome` (pelo id dele no cadastro).
export function assuntosDoTema(dbRef, nome) {
    const chave = chaveTema(nome);
    const tema = (dbRef.temas || []).find((t) => chaveTema(t.nome) === chave);
    if (!tema) return [];
    return (dbRef.assuntos || []).filter((a) =>
        (a.temaIds || []).some((id) => String(id) === String(tema.id)),
    );
}

// Cadastro de Temas que nenhum Assunto lista (inclui Tema que nenhum
// texto usa) — é o mesmo recorte do filtro "só sem assunto" da aba Temas.
export function temasCadastradosSemAssunto(dbRef) {
    const emAssunto = new Set();
    (dbRef.assuntos || []).forEach((a) =>
        (a.temaIds || []).forEach((id) => emAssunto.add(String(id))),
    );
    return (dbRef.temas || []).filter((t) => !emAssunto.has(String(t.id)));
}

// Troca `antigo` por `novo` numa lista de nomes preservando a ordem e sem
// deixar repetição (por chave) caso `novo` já estivesse na lista.
function trocarNaLista(nomes, chaveAntiga, novo) {
    const vistos = new Set();
    const saida = [];
    nomes.forEach((n) => {
        const nome = chaveTema(n) === chaveAntiga ? novo : n;
        const chave = chaveTema(nome);
        if (!chave || vistos.has(chave)) return;
        vistos.add(chave);
        saida.push(nome);
    });
    return saida;
}

// Renomeia o Tema `id`. O nome novo é propagado ao espelho
// `sinalizacoesTema` dos textos (os `temas` por id não mudam); os
// Assuntos guardam ids e não precisam de nada. Recusa (sem mudar nada)
// nome vazio ou que já pertença a OUTRO Tema (nesse caso o caminho é
// mesclar: `mesclarTemas`). Mudar só caixa/acentuação do próprio nome é
// permitido. Devolve `{ ok, motivo?, textos, assuntos }` (`assuntos` = quantos
// Assuntos listam o Tema, só informativo).
export function renomearTema(dbRef, id, novoNome) {
    const tema = (dbRef.temas || []).find((t) => t.id == id);
    const nome = limparNomeTema(novoNome);
    if (!tema) return { ok: false, motivo: 'inexistente' };
    if (!nome) return { ok: false, motivo: 'vazio' };
    const chaveAntiga = chaveTema(tema.nome);
    const duplicado = dbRef.temas.find((t) => t.id != id && chaveTema(t.nome) === chaveTema(nome));
    if (duplicado) return { ok: false, motivo: 'duplicado', existente: duplicado };

    let textos = 0;
    todosOsTextos(dbRef).forEach((t) => {
        const atuais = temasDoTexto(t);
        if (!atuais.some((n) => chaveTema(n) === chaveAntiga)) return;
        t.sinalizacoesTema = trocarNaLista(atuais, chaveAntiga, nome).join(', ');
        textos += 1;
    });
    const assuntos = assuntosDoTema(dbRef, tema.nome).length;
    tema.nome = nome;
    return { ok: true, textos, assuntos };
}

// O que uma mesclagem (ou exclusão) do Tema `id` alcança: ids de Poemas,
// Prosas e Assuntos que o usam. Mesmo formato dos `calcularImpacto*` de db.js.
export function impactoDoTema(dbRef, id) {
    const tema = (dbRef.temas || []).find((t) => t.id == id);
    if (!tema) return { poemasIds: [], prosasIds: [], assuntosIds: [] };
    const { poemasIds, prosasIds } = textosDoTema(dbRef, tema.nome);
    return {
        poemasIds,
        prosasIds,
        assuntosIds: assuntosDoTema(dbRef, tema.nome).map((a) => a.id),
    };
}

// Entre dois papéis, o mais forte: principal > secundário > sem papel.
function papelMaisForte(a, b) {
    const forca = (p) => {
        const i = PAPEIS_TEMA.indexOf(normalizarPapelTema(p));
        return i === -1 ? PAPEIS_TEMA.length : i;
    };
    return forca(a) <= forca(b) ? normalizarPapelTema(a) : normalizarPapelTema(b);
}

// Mescla o Tema `origemId` no Tema `destinoId`: todo texto que tinha a
// origem passa a ter o destino (se já tinha os dois, fica uma entrada só,
// com o papel mais forte dos dois), todo Assunto que listava a origem
// passa a listar o destino (sem repetir), a nota da origem é somada à do
// destino e a origem sai do cadastro. Não pede confirmação nem salva
// (quem chama decide). Devolve `{ ok, motivo?, textos, assuntos }`.
export function mesclarTemas(dbRef, origemId, destinoId) {
    if (origemId == destinoId) return { ok: false, motivo: 'igual' };
    const origem = (dbRef.temas || []).find((t) => t.id == origemId);
    const destino = (dbRef.temas || []).find((t) => t.id == destinoId);
    if (!origem || !destino) return { ok: false, motivo: 'inexistente' };

    // Retrato do que a mesclagem pode mudar, pro `desfazer`: só os textos
    // que tinham a origem, os Assuntos que a listavam, a nota do destino,
    // a posição da origem e as marcas "não são iguais" de todos os Temas.
    const indiceOrigem = dbRef.temas.findIndex((t) => t.id == origemId);
    const notasDestinoAntes = destino.notas;
    const marcasAntes = dbRef.temas.map((t) => ({
        tema: t,
        tinha: Object.prototype.hasOwnProperty.call(t, 'naoIguais'),
        naoIguais: Array.isArray(t.naoIguais) ? [...t.naoIguais] : undefined,
    }));
    const textosAntes = [];
    const assuntosAntes = [];

    let textos = 0;
    todosOsTextos(dbRef).forEach((t) => {
        if (!Array.isArray(t.temas)) reconciliarTemasDoTexto(dbRef, t);
        const daOrigem = t.temas.find((e) => e.temaId == origemId);
        if (!daOrigem) return;
        textosAntes.push({
            texto: t,
            temas: t.temas.map((e) => ({ ...e })),
            espelho: t.sinalizacoesTema,
        });
        const doDestino = t.temas.find((e) => e.temaId == destinoId);
        if (doDestino) {
            doDestino.papel = papelMaisForte(doDestino.papel, daOrigem.papel);
            t.temas = t.temas.filter((e) => e !== daOrigem);
        } else {
            daOrigem.temaId = destino.id;
        }
        t.sinalizacoesTema = espelhoDeTemas(
            t.temas.map((e) => ({ nome: nomeDoTemaPorId(dbRef, e.temaId), papel: e.papel })),
        );
        textos += 1;
    });

    let assuntos = 0;
    (dbRef.assuntos || []).forEach((a) => {
        if (!Array.isArray(a.temaIds) || !a.temaIds.some((id) => id == origemId)) return;
        assuntosAntes.push({ assunto: a, temaIds: [...a.temaIds] });
        const ids = [];
        a.temaIds.forEach((id) => {
            const novo = id == origemId ? destino.id : id;
            if (!ids.some((x) => x == novo)) ids.push(novo);
        });
        a.temaIds = ids;
        assuntos += 1;
    });

    const notaOrigem = String(origem.notas || '').trim();
    const notaDestino = String(destino.notas || '').trim();
    if (notaOrigem && notaOrigem !== notaDestino) {
        destino.notas = notaDestino ? `${notaDestino}\n\n${notaOrigem}` : notaOrigem;
    }

    // "Não são iguais" que apontavam para a origem passam a apontar para o
    // destino, e o destino herda as marcas da origem (sem apontar para si).
    const marcasOrigem = Array.isArray(origem.naoIguais) ? origem.naoIguais : [];
    dbRef.temas.forEach((t) => {
        if (t === origem || t === destino || !Array.isArray(t.naoIguais)) return;
        if (!t.naoIguais.some((id) => id == origemId)) return;
        const ids = t.naoIguais.map((id) => (id == origemId ? destino.id : id));
        t.naoIguais = ids.filter((id, i) => ids.findIndex((x) => x == id) === i);
    });
    const herdadas = [
        ...(Array.isArray(destino.naoIguais) ? destino.naoIguais : []),
        ...marcasOrigem,
    ]
        .filter((id) => id != destino.id && id != origemId)
        .filter((id, i, lista) => lista.findIndex((x) => x == id) === i);
    if (herdadas.length > 0) destino.naoIguais = herdadas;
    else delete destino.naoIguais;

    dbRef.temas = dbRef.temas.filter((t) => t.id != origemId);

    // Devolve tudo como estava: a origem volta à posição de antes, os textos
    // e os Assuntos recuperam a lista de antes, e a nota do destino também.
    const desfazer = () => {
        textosAntes.forEach(({ texto, temas, espelho }) => {
            texto.temas = temas;
            texto.sinalizacoesTema = espelho;
        });
        assuntosAntes.forEach(({ assunto, temaIds }) => {
            assunto.temaIds = temaIds;
        });
        destino.notas = notasDestinoAntes;
        if (!dbRef.temas.some((t) => t.id == origem.id)) {
            dbRef.temas.splice(Math.min(indiceOrigem, dbRef.temas.length), 0, origem);
        }
        marcasAntes.forEach(({ tema, tinha, naoIguais }) => {
            if (tinha) tema.naoIguais = naoIguais;
            else delete tema.naoIguais;
        });
    };
    return { ok: true, textos, assuntos, desfazer };
}

// Um Tema só pode ser excluído do cadastro se nenhum texto o usa (senão
// a sincronização o traria de volta e o texto ficaria com etiqueta
// órfã). Ao excluir, ele também sai da lista de cada Assunto.
export function podeExcluirTema(dbRef, id) {
    const tema = (dbRef.temas || []).find((t) => t.id == id);
    if (!tema) return { ok: false, motivo: 'inexistente', textos: 0 };
    const textos = contarTextosPorTema(dbRef).get(chaveTema(tema.nome)) || 0;
    return textos > 0 ? { ok: false, motivo: 'em-uso', textos } : { ok: true, textos: 0 };
}

export function excluirTemaDoCadastro(dbRef, id) {
    const pode = podeExcluirTema(dbRef, id);
    if (!pode.ok) return pode;
    const idx = dbRef.temas.findIndex((t) => t.id == id);
    const [removido] = dbRef.temas.splice(idx, 1);
    (dbRef.assuntos || []).forEach((a) => {
        a.temaIds = (a.temaIds || []).filter((tid) => String(tid) !== String(removido.id));
    });
    return { ok: true, removido };
}

// ─── Exclusão em lote (aba Temas e aba Assuntos) ───────────────────────

// Temas do cadastro que nenhum texto usa (a mesma regra de
// `podeExcluirTema`, aplicada ao cadastro inteiro).
export function temasSemTexto(dbRef) {
    const uso = contarTextosPorTema(dbRef);
    return (dbRef.temas || []).filter((t) => !uso.get(chaveTema(t.nome)));
}

// Números pra confirmação antes de "Excluir temas sem texto":
// `excluir` = quantos saem, `manter` = quantos ficam porque algum texto
// os usa.
export function resumoExclusaoTemasSemTexto(dbRef) {
    const excluir = temasSemTexto(dbRef).length;
    return { excluir, manter: (dbRef.temas || []).length - excluir };
}

// Exclui do cadastro todo Tema que nenhum texto usa e o tira da lista de
// cada Assunto. Nunca mexe em Tema em uso nem em texto. Não confirma nem
// salva (quem chama decide). Devolve um `desfazer` que devolve os Temas
// às posições de origem e às listas dos Assuntos, e a contagem.
export function excluirTemasSemTexto(dbRef) {
    const candidatos = new Set(temasSemTexto(dbRef).map((t) => String(t.id)));
    const removidos = [];
    (dbRef.temas || []).forEach((tema, indice) => {
        if (candidatos.has(String(tema.id))) removidos.push({ tema, indice });
    });
    if (removidos.length === 0) return { ok: true, excluidos: 0, manter: dbRef.temas.length };

    const listasAntes = [];
    (dbRef.assuntos || []).forEach((a) => {
        const antes = Array.isArray(a.temaIds) ? [...a.temaIds] : [];
        if (antes.some((id) => candidatos.has(String(id)))) {
            listasAntes.push({ assuntoId: a.id, temaIds: antes });
            a.temaIds = antes.filter((id) => !candidatos.has(String(id)));
        }
    });
    for (let i = dbRef.temas.length - 1; i >= 0; i -= 1) {
        if (candidatos.has(String(dbRef.temas[i].id))) dbRef.temas.splice(i, 1);
    }

    const desfazer = () => {
        removidos.forEach(({ tema, indice }) => {
            dbRef.temas.splice(Math.min(indice, dbRef.temas.length), 0, tema);
        });
        listasAntes.forEach(({ assuntoId, temaIds }) => {
            const assunto = (dbRef.assuntos || []).find((a) => a.id == assuntoId);
            if (!assunto) return;
            const atuais = Array.isArray(assunto.temaIds) ? assunto.temaIds : [];
            const jaEstavam = new Set(temaIds.map(String));
            assunto.temaIds = [...temaIds, ...atuais.filter((id) => !jaEstavam.has(String(id)))];
        });
    };
    return { ok: true, excluidos: removidos.length, manter: dbRef.temas.length, desfazer };
}

// Remove o cadastro inteiro de Assuntos. Os textos não são tocados (o
// Assunto de um texto é sempre derivado dos Temas dele, e as sobrescritas
// de papel `assuntosPapel` ficam guardadas, ignoradas enquanto o Assunto
// não existir). Os Temas também ficam, só passam a "sem assunto". Não
// confirma nem salva. Devolve um `desfazer` que devolve os Assuntos.
export function excluirTodosAssuntos(dbRef) {
    if (!Array.isArray(dbRef.assuntos) || dbRef.assuntos.length === 0) {
        return { ok: true, excluidos: 0 };
    }
    const removidos = dbRef.assuntos.splice(0, dbRef.assuntos.length);
    const desfazer = () => {
        dbRef.assuntos.unshift(...removidos);
    };
    return { ok: true, excluidos: removidos.length, desfazer };
}

// ─── Sugestão de Temas duplicados ───────────────────────────────────────
//
// Só o que se pode afirmar sem errar: dois Temas com a MESMA FORMA escrita.
// `formaTema` vai além de `chaveTema` (caixa e acento): ignora hífen,
// espaço e pontuação ("Auto-acolhimento" = "Autoacolhimento") e trata o
// plural palavra a palavra ("Desigualdades sociais" = "Desigualdade
// social"). Não detecta erro de digitação, sinônimo nem nome contido em
// outro ("Luto" e "Luto/Finitude" não são duplicatas). Nada é mesclado
// sozinho: quem chama mostra o par e a pessoa decide.

// Singular de uma palavra já normalizada (sem caixa nem acento). Palavras
// com menos de 5 letras ficam como estão, pra "país" e "pais" não virarem
// "pai" e "caos" não virar "cao".
function singularPalavraTema(p) {
    if (p.length < 5) return p;
    if (/(oes|aes|aos)$/.test(p)) return `${p.slice(0, -3)}ao`;
    if (/ns$/.test(p)) return `${p.slice(0, -2)}m`;
    if (/(ais|eis)$/.test(p)) return `${p.slice(0, -2)}l`;
    if (/(res|zes)$/.test(p) && p.length >= 6) return p.slice(0, -2);
    if (/ss$/.test(p)) return p;
    if (/s$/.test(p)) return p.slice(0, -1);
    return p;
}

export function formaTema(nome) {
    return chaveTema(nome)
        .split(/[^a-z0-9]+/)
        .filter(Boolean)
        .map(singularPalavraTema)
        .join('');
}

function marcadosComoDiferentes(a, b) {
    return (
        (Array.isArray(a.naoIguais) && a.naoIguais.some((id) => id == b.id)) ||
        (Array.isArray(b.naoIguais) && b.naoIguais.some((id) => id == a.id))
    );
}

// Pares de Temas com a mesma forma escrita que a pessoa ainda não marcou
// como "não são iguais". Em cada par, `a` é o mais usado (empate: ordem
// alfabética). Um grupo de três ou mais gera todos os pares.
export function sugerirTemasDuplicados(dbRef) {
    const porForma = new Map();
    (dbRef.temas || []).forEach((t) => {
        const forma = formaTema(t.nome);
        if (!forma) return;
        if (!porForma.has(forma)) porForma.set(forma, []);
        porForma.get(forma).push(t);
    });
    const uso = contarTextosPorTema(dbRef);
    const textosDe = (t) => uso.get(chaveTema(t.nome)) || 0;
    const pares = [];
    porForma.forEach((grupo) => {
        for (let i = 0; i < grupo.length; i += 1) {
            for (let j = i + 1; j < grupo.length; j += 1) {
                if (marcadosComoDiferentes(grupo[i], grupo[j])) continue;
                const [a, b] = [grupo[i], grupo[j]].sort(
                    (x, y) => textosDe(y) - textosDe(x) || x.nome.localeCompare(y.nome, 'pt-BR'),
                );
                pares.push({ a, b, textosA: textosDe(a), textosB: textosDe(b) });
            }
        }
    });
    return pares.sort((p, q) => p.a.nome.localeCompare(q.a.nome, 'pt-BR'));
}

// "Não são iguais": guarda a marca no registro dos dois Temas
// (`naoIguais: [id, ...]`) e o par deixa de ser sugerido. Devolve um
// `desfazer`. Não salva (quem chama decide).
export function marcarTemasNaoIguais(dbRef, idA, idB) {
    if (idA == idB) return { ok: false, motivo: 'igual' };
    const a = (dbRef.temas || []).find((t) => t.id == idA);
    const b = (dbRef.temas || []).find((t) => t.id == idB);
    if (!a || !b) return { ok: false, motivo: 'inexistente' };
    const antes = [a, b].map((t) => ({
        tema: t,
        tinha: Object.prototype.hasOwnProperty.call(t, 'naoIguais'),
        naoIguais: Array.isArray(t.naoIguais) ? [...t.naoIguais] : undefined,
    }));
    const marcar = (t, outro) => {
        const lista = Array.isArray(t.naoIguais) ? t.naoIguais : [];
        if (!lista.some((id) => id == outro.id)) lista.push(outro.id);
        t.naoIguais = lista;
    };
    marcar(a, b);
    marcar(b, a);
    const desfazer = () => {
        antes.forEach(({ tema, tinha, naoIguais }) => {
            if (tinha) tema.naoIguais = naoIguais;
            else delete tema.naoIguais;
        });
    };
    return { ok: true, desfazer };
}
