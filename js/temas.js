// temas.js — Cadastro central de Tema (db.temas = [{ id, nome, notas, valencia? }]).
//
// Fase 1 (aba Temas): cadastro pra renomear, anotar e triar; o Assunto
// lista os Temas por nome (`assunto.temas`) e renomear propaga o novo
// nome aos Assuntos.
//
// Fase 2 (este arquivo, seção "Tema por id no texto"): o texto guarda
// `temas: [{ temaId, papel }]`, a única fonte dos Temas dele. O campo antigo
// `sinalizacoesTema` (espelho com os nomes separados por vírgula) deixou de
// existir na Etapa 5: ninguém mais o grava, e `reconciliarTemasDoTexto` o
// apaga de todo texto. Os nomes saem de `nomesTemasDoTexto` (utils.js), por
// id. `migrarEspelhoParaTemas` (Etapa 4) segue como leitura do formato
// antigo: texto que só tem o espelho (backup velho, JSON de outro acervo)
// ganha `temas`, sem papel, antes de o campo ser apagado.
// `reconciliarTemasDoTexto` roda a cada sincronizarTemas (load, importar,
// save): valida ids, tira repetição e apaga o espelho. Os `temas` mandam.
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
    nomesTemasDoTexto,
    resumoTemas,
    gerarId,
    normalizarPapelTema,
    PAPEIS_TEMA,
    SEPARADOR_SAIDA_TEMAS,
} from './utils.js';
import { remapearLigacoesDosTextos } from './ligacoes-tema-pessoa.js';
import {
    removerTemaDosUniversais,
    substituirTemaNosUniversais,
    guardarTemasDosUniversais,
} from './temas-universais.js';

// Valência do Tema (30/10/2026): o quanto o assunto do tema é agradável ou
// desagradável, no sentido do afeto (não do valor moral: "luto" é
// desagradável sem ser "ruim"). Campo opcional do cadastro; ausente quer
// dizer "não classificado". `ambivalente` é para o que pesa e alivia ao
// mesmo tempo (saudade, amor), para não cair em `neutro`.
export const VALENCIAS_TEMA = ['agradavel', 'neutro', 'desagradavel', 'ambivalente'];
export const ROTULOS_VALENCIA_TEMA = {
    agradavel: 'Agradável',
    neutro: 'Neutro',
    desagradavel: 'Desagradável',
    ambivalente: 'Ambivalente',
};

// Aceita a chave (`desagradavel`) ou o rótulo (`Desagradável`), sem caixa e
// sem acento. Devolve a chave ou '' (não classificado) para o que não bate.
export function normalizarValenciaTema(valor) {
    const chave = chaveTema(valor);
    if (!chave) return '';
    return (
        VALENCIAS_TEMA.find(
            (v) => chaveTema(v) === chave || chaveTema(ROTULOS_VALENCIA_TEMA[v]) === chave,
        ) || ''
    );
}

// Grava a valência no registro do Tema; '' (ou valor inválido) apaga o
// campo, para o cadastro não ganhar `valencia: ''` em todo Tema.
export function definirValenciaDoTema(tema, valor) {
    if (!tema) return '';
    const v = normalizarValenciaTema(valor);
    if (v) tema.valencia = v;
    else delete tema.valencia;
    return v;
}

function todosOsTextos(dbRef) {
    return [...(dbRef.poemas || []), ...(dbRef.prosas || [])];
}

// O nome do Tema pode ter vírgula (Fase 2, Etapa 7). Não pode ter `;` nem
// `|`, que são os separadores: `;` na digitação de vários Temas e `|` nas
// saídas em texto (CSV `sinal_tema`, `.md`, Visualização). Os dois viram espaço.
export const SEPARADOR_DIGITACAO_TEMAS = ';';
export { SEPARADOR_SAIDA_TEMAS };
export function limparNomeTema(nome) {
    return String(nome ?? '')
        .replace(/[;|]/g, ' ')
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
        // Valência: só a chave válida fica; qualquer outra coisa vira "não
        // classificado" (campo ausente).
        if (Object.prototype.hasOwnProperty.call(t, 'valencia')) {
            definirValenciaDoTema(t, t.valencia);
        }
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
    // Fase 2: texto de formato antigo (só o espelho) vira `temas`; depois cada
    // texto valida os seus `temas` (por id) e perde o espelho.
    migrarEspelhoParaTemas(dbRef);
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

// Entradas [{ nome, papel }] vindas do editor → `{ temas }` pronto pra
// gravar no texto. Cria no cadastro o Tema que ainda não existe.
export function resolverTemasEditados(dbRef, entradas) {
    const vistos = new Set();
    const temas = [];
    (entradas || []).forEach((e) => {
        const id = garantirTema(dbRef, e?.nome);
        if (id == null || vistos.has(String(id))) return;
        vistos.add(String(id));
        // Valência vinda de fora (Importação Aditiva): só preenche o vazio,
        // nunca troca a que o acervo de destino já tem.
        const valencia = normalizarValenciaTema(e?.valencia);
        if (valencia) {
            const registro = dbRef.temas.find((t) => t.id == id);
            if (registro && !normalizarValenciaTema(registro.valencia)) {
                registro.valencia = valencia;
            }
        }
        temas.push({ temaId: id, papel: normalizarPapelTema(e?.papel) });
    });
    return { temas };
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

// Apaga o campo antigo `sinalizacoesTema` do texto (Fase 2, Etapa 5). Só
// pode rodar depois de os `temas` terem recebido o que o espelho tinha
// (`migrarEspelhoParaTemas` ou o ramo `textoSoComEspelho` da reconciliação).
// Devolve true se o campo existia.
function apagarEspelhoDoTexto(item) {
    if (!item || !Object.prototype.hasOwnProperty.call(item, 'sinalizacoesTema')) return false;
    delete item.sinalizacoesTema;
    return true;
}

// Formato antigo na entrada de dados (Importação Aditiva, Fase 2 Etapa 3d):
// converte o espelho `sinalizacoesTema` de um texto que ainda não tem `temas`
// em `[{ temaId, papel }]` na hora, criando no cadastro o Tema que falta. O
// formato antigo não guardava papel, então todos entram como "sem papel
// definido" (D2). Não mexe no texto: quem chama grava `temas` e refaz o
// campo antigo.
export function temasDeEspelhoAntigo(dbRef, item) {
    const vistos = new Set();
    const temas = [];
    temasDoTexto(item).forEach((nome) => {
        const id = garantirTema(dbRef, nome);
        if (id == null || vistos.has(String(id))) return;
        vistos.add(String(id));
        temas.push({ temaId: id, papel: '' });
    });
    return temas;
}

// Garante que o texto tenha `temas` por id antes de um escritor mexer nele:
// texto sem `temas`, ou com `temas` vazio e só o espelho (dado ainda não
// migrado), é migrado pela reconciliação (o espelho vira `temas`, papel
// indefinido, e o campo antigo some).
// Texto que já tem `temas` não é tocado (os `temas` mandam).
function garantirTemasDoTexto(dbRef, item) {
    if (textoSoComEspelho(item) || !Array.isArray(item.temas)) reconciliarTemasDoTexto(dbRef, item);
}

// Texto de formato antigo: sem `temas` (ou com `temas` vazio) e com o
// espelho `sinalizacoesTema` preenchido. É o único caso em que o espelho
// ainda é lido como dado (JSON e backups antigos, tag solta migrada pelo
// db.js); em todo o resto os `temas` mandam.
function textoSoComEspelho(item) {
    return (!Array.isArray(item?.temas) || !item.temas.length) && temasDoTexto(item).length > 0;
}

// Migração única do formato antigo (Fase 2, Etapa 4): cada texto que só tem
// o espelho ganha `temas` por id, todos sem papel definido, criando no
// cadastro o Tema que falta. Idempotente (texto que já tem `temas` não é
// tocado) e não apaga o espelho: quem apaga é `reconciliarTemasDoTexto`, que
// roda logo depois e ainda precisa dele no caso de `temas` só com ids que
// não existem mais. Devolve quantos textos migrou.
export function migrarEspelhoParaTemas(dbRef) {
    let migrados = 0;
    todosOsTextos(dbRef).forEach((item) => {
        if (!textoSoComEspelho(item)) return;
        item.temas = temasDeEspelhoAntigo(dbRef, item);
        migrados += 1;
    });
    return migrados;
}

// Deixa `item.temas` coerente com o cadastro e apaga o campo antigo
// `item.sinalizacoesTema`. Os `temas` (por id) mandam: descarta id que não
// existe mais no cadastro, tira repetição e normaliza o papel. Único caso em
// que o espelho ainda vale como dado, antes de ser apagado: quando nada
// sobrou dos `temas` (ver `textoSoComEspelho`). Idempotente.
// Devolve true se mudou algo.
export function reconciliarTemasDoTexto(dbRef, item) {
    if (!item) return false;
    const temasAntes = JSON.stringify(item.temas);
    const vistos = new Set();
    const validos = [];
    (Array.isArray(item.temas) ? item.temas : []).forEach((e) => {
        const key = String(e?.temaId);
        const tema = (dbRef.temas || []).find((t) => String(t.id) === key);
        if (!tema || vistos.has(key)) return;
        vistos.add(key);
        validos.push({ temaId: tema.id, papel: normalizarPapelTema(e.papel) });
    });
    item.temas = validos;
    // Sobrou nada dos `temas` (formato antigo, ou só ids que não existem aqui)
    // e o espelho tem nomes: o espelho é o único dado que sobrou, então migra
    // dele em vez de apagar os Temas do texto.
    if (textoSoComEspelho(item)) item.temas = temasDeEspelhoAntigo(dbRef, item);
    const apagou = apagarEspelhoDoTexto(item);
    return apagou || JSON.stringify(item.temas) !== temasAntes;
}

// ─── Temas em lote (barra de seleção de Poemas e Prosas) ───────────────
// Lógica pura do botão "Temas" da edição em massa: adiciona/remove vários
// Temas de uma vez nos textos selecionados, pela fonte da verdade
// (`item.temas`, por id) e, se o texto ainda tinha o campo antigo, o apaga. Entra
// com papel "indefinido" (como Pessoa entra sem papéis na edição em massa);
// quem quiser principal/secundário ajusta no modal do texto. Não pede
// confirmação nem salva: quem chama decide.

// "amor; Saudade ;; amor" → ['amor', 'Saudade']: nomes limpos, sem
// repetição (por chave, sem caixa/acento), na ordem digitada. O separador é
// `;` porque a vírgula pode fazer parte do nome do Tema.
export function nomesDeTemasDigitados(texto) {
    const vistos = new Set();
    const saida = [];
    String(texto ?? '')
        .split(SEPARADOR_DIGITACAO_TEMAS)
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
    apagarEspelhoDoTexto(item);
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
        nomesTemasDoTexto(t, dbRef.temas).forEach((nome) => {
            const chave = chaveTema(nome);
            contagem.set(chave, (contagem.get(chave) || 0) + 1);
        });
    });
    return contagem;
}

// Ids de Poemas e Prosas que têm o Tema (comparação exata por chave).
export function textosDoTema(dbRef, nome) {
    const chave = chaveTema(nome);
    const tem = (t) => nomesTemasDoTexto(t, dbRef.temas).some((n) => chaveTema(n) === chave);
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

// Renomeia o Tema `id`. Os `temas` dos textos (por id) não mudam, então o
// papel de cada texto fica intacto e basta trocar o nome no cadastro; os
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

    const afetados = todosOsTextos(dbRef).filter((t) =>
        nomesTemasDoTexto(t, dbRef.temas).some((n) => chaveTema(n) === chaveAntiga),
    );
    afetados.forEach((t) => garantirTemasDoTexto(dbRef, t));
    const assuntos = assuntosDoTema(dbRef, tema.nome).length;
    tema.nome = nome;
    return { ok: true, textos: afetados.length, assuntos };
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
    const temValenciaAntes = Object.prototype.hasOwnProperty.call(destino, 'valencia');
    const valenciaDestinoAntes = destino.valencia;
    const marcasAntes = dbRef.temas.map((t) => ({
        tema: t,
        tinha: Object.prototype.hasOwnProperty.call(t, 'naoIguais'),
        naoIguais: Array.isArray(t.naoIguais) ? [...t.naoIguais] : undefined,
    }));
    const textosAntes = [];
    const assuntosAntes = [];

    let textos = 0;
    todosOsTextos(dbRef).forEach((t) => {
        garantirTemasDoTexto(dbRef, t);
        const daOrigem = t.temas.find((e) => e.temaId == origemId);
        if (!daOrigem) return;
        textosAntes.push({ texto: t, temas: t.temas.map((e) => ({ ...e })) });
        const doDestino = t.temas.find((e) => e.temaId == destinoId);
        if (doDestino) {
            doDestino.papel = papelMaisForte(doDestino.papel, daOrigem.papel);
            t.temas = t.temas.filter((e) => e !== daOrigem);
        } else {
            daOrigem.temaId = destino.id;
        }
        textos += 1;
    });

    // Ligações Tema × Pessoa já analisadas: a origem vira o destino nos pares.
    const desfazerLigacoes = remapearLigacoesDosTextos(dbRef, 'tema', origemId, destinoId);

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

    // A valência da origem só passa ao destino se o destino ainda não tem
    // uma (quem fica manda).
    if (!normalizarValenciaTema(destino.valencia)) {
        definirValenciaDoTema(destino, origem.valencia);
    }

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
    const restaurarUniversais = guardarTemasDosUniversais(dbRef);
    substituirTemaNosUniversais(dbRef, origemId, destinoId);

    // Devolve tudo como estava: a origem volta à posição de antes, os textos
    // e os Assuntos recuperam a lista de antes, e a nota do destino também.
    // A origem volta ao cadastro antes dos textos: os `temas` deles apontam
    // para o id dela.
    const desfazer = () => {
        if (!dbRef.temas.some((t) => t.id == origem.id)) {
            dbRef.temas.splice(Math.min(indiceOrigem, dbRef.temas.length), 0, origem);
        }
        textosAntes.forEach(({ texto, temas }) => {
            texto.temas = temas;
        });
        desfazerLigacoes();
        assuntosAntes.forEach(({ assunto, temaIds }) => {
            assunto.temaIds = temaIds;
        });
        destino.notas = notasDestinoAntes;
        if (temValenciaAntes) destino.valencia = valenciaDestinoAntes;
        else delete destino.valencia;
        marcasAntes.forEach(({ tema, tinha, naoIguais }) => {
            if (tinha) tema.naoIguais = naoIguais;
            else delete tema.naoIguais;
        });
        restaurarUniversais();
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
    removerTemaDosUniversais(dbRef, removido.id);
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
    const restaurarUniversais = guardarTemasDosUniversais(dbRef);
    candidatos.forEach((id) => removerTemaDosUniversais(dbRef, id));

    const desfazer = () => {
        restaurarUniversais();
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
