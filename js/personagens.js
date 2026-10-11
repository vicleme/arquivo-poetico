// personagens.js: cadastro central de Personagem (db.personagens).
//
// Personagem: `{ id, nome, origem, notas, genero, orientacao,
// identidadeCisTrans, corRaca, nascimento, obito, caracteristicas, participacoes }`.
//
// - Personagem é um ser que o AUTOR criou ou, no máximo, reinterpretou.
//   Quem existe ou existiu de fato (Pessoa) e quem já existe fora da obra
//   (figura pública, religiosa, mítica) não entra aqui: o primeiro é Pessoa,
//   os outros vivem em Intertextualidade/Referências.
// - `origem` é `Criado`, `Reinterpretado` ou '' (não definida; nada é
//   inferido). O vínculo opcional de um Personagem reinterpretado com a
//   Referência de origem fica para uma etapa própria.
//
// - Identidade (`genero`, `orientacao`, `identidadeCisTrans`, `corRaca`):
//   mesmos vocabulários do Autor, para poder cruzar o personagem com quem
//   escreveu (ex.: as características de personagens femininas mudam
//   conforme o gênero do autor?). `genero` e `orientacao` são texto livre
//   com sugestão; `identidadeCisTrans` é a lista fechada do Autor
//   (IDENTIDADES_CIS_TRANS, importa para a história: ser trans é parte do
//   personagem); `corRaca` é a lista fechada do IBGE (CORES_RACA_AUTOR).
//   Vazio = não definido; nada é inferido.
// - Vida (`nascimento`, `obito`): data parcial `{dia?, mes?, ano?}` (mesmo
//   formato do Autor); o formulário pede só o ano. O ano é INTERNO À
//   FICÇÃO, então a idade é calculada num ano de referência dado
//   (idadeDoPersonagemEm), nunca contra a data de hoje.
// - `caracteristicas`: o que é do personagem em si, e não da relação dele
//   com um texto ou livro. Seis grupos de TAG (personalidade, valoresCrencas,
//   desejos, medos, tracosFisicos, arquetipos) mais `backstory` (tags do
//   passado, ex.: "Abandono parental") e `backstoryNota` (texto livre).
//   Tag, e não texto, para poder comparar: a comparação ignora caixa e
//   acento (chaveTema) e a primeira grafia digitada é a que fica.
//
// - `participacoes`: a relação do personagem com cada LIVRO (coletânea
//   conta, é um Livro): `[{ livroId, papelNarrativo, funcaoTematica, arco,
//   tropes }]`, um por livro, os quatro campos em tag (os mesmos da relação
//   com o texto, CAMPOS_RELACAO_PERSONAGEM). Serve ao que não cabe num texto
//   só (o arco de uma personagem se espalha por vários poemas). Edita-se no
//   modal do Personagem, nunca no do Livro. Excluir o Livro tira a
//   participação (com Desfazer, ver db.js); sincronizarPersonagens solta a
//   que aponta para um Livro que não existe.
//
// No texto (Poema/Prosa):
// - `personagens: [{ personagemId, papeis: [...], centralidade, papelNarrativo,
//   arco, tropes, funcaoTematica }]`.
// - `papeis` é uma LISTA (o mesmo personagem pode ter Aparição e
//   Interlocutor no mesmo texto), em PAPEIS_PERSONAGEM, já na ordem de
//   presença: Voz, Interlocutor, Aparição, Menção, Alusão. Lista vazia é
//   "papel não definido".
// - `centralidade` é um valor único por vínculo (texto + personagem):
//   'protagonista', 'secundario' ou '' (indefinida), igual ao papel de
//   Tema. Só se aplica a quem tem presença efetiva no texto. Se os papéis
//   do vínculo são só Menção e/ou Alusão, a centralidade não se aplica e é
//   sempre ''. Sem papéis marcados ainda, ela fica livre.
// - A relação com o texto (CAMPOS_RELACAO_PERSONAGEM: papelNarrativo, arco,
//   tropes, funcaoTematica) também mora no vínculo, cada campo uma lista de
//   tags (normalizarTagsPersonagem).
//
// Presença em dois textos NÃO cria Eco: o Eco continua sendo uma leitura
// deliberada do autor (o Personagem, mais adiante, só pode ancorá-lo).
//
// Tudo aqui é função pura sobre o `dbRef` passado (sem DOM, sem save()).
// Comparação de nomes sempre por `chaveTema` (sem caixa/acento).

import {
    chaveTema,
    gerarId,
    CORES_RACA_AUTOR,
    IDENTIDADES_CIS_TRANS,
    violaOrdemDeDatas,
} from './utils.js';

export const ORIGENS_PERSONAGEM = ['Criado', 'Reinterpretado'];

// Na ordem de presença no texto (a mesma ideia de PAPEIS_PESSOA, "já na
// ordem de hierarquia").
export const PAPEIS_PERSONAGEM = ['Voz', 'Interlocutor', 'Aparição', 'Menção', 'Alusão'];

// Papéis em que o personagem não está de fato no texto: ele é nomeado
// (Menção) ou evocado sem nome (Alusão). Para eles a centralidade não se
// aplica.
export const PAPEIS_PERSONAGEM_SEM_CENTRALIDADE = ['Menção', 'Alusão'];

export const CENTRALIDADES_PERSONAGEM = ['protagonista', 'secundario'];

// Relação do personagem com ESTE texto (e, na etapa 3a, com um livro): quatro
// campos de tag, para o vocabulário convergir e dar para comparar. Papel
// narrativo cobre o que a Centralidade não diz (antagonista, mentor,
// confidente, interesse amoroso). A ordem é a de exibição, numa grade de duas
// colunas: os dois rótulos longos na primeira linha, os dois curtos na segunda.
export const CAMPOS_RELACAO_PERSONAGEM = ['papelNarrativo', 'funcaoTematica', 'arco', 'tropes'];

export const ROTULOS_RELACAO_PERSONAGEM = {
    papelNarrativo: 'Papel narrativo',
    arco: 'Arco',
    tropes: 'Tropes',
    funcaoTematica: 'Função temática',
};

export const ROTULOS_CENTRALIDADE_PERSONAGEM = {
    protagonista: 'Protagonista',
    secundario: 'Secundário',
    '': 'Indefinido',
};

// Grupos de tag de `caracteristicas`, na ordem de exibição. `backstory`
// também é tag (o passado que não cabe nos outros grupos); a nota livre do
// passado é `backstoryNota`.
export const GRUPOS_CARACTERISTICAS_PERSONAGEM = [
    'personalidade',
    'valoresCrencas',
    'desejos',
    'medos',
    'tracosFisicos',
    'arquetipos',
    'backstory',
];

export const ROTULOS_CARACTERISTICAS_PERSONAGEM = {
    personalidade: 'Personalidade',
    valoresCrencas: 'Valores e crenças',
    desejos: 'Desejos',
    medos: 'Medos',
    tracosFisicos: 'Traços físicos',
    arquetipos: 'Arquétipos',
    backstory: 'Backstory',
};

// ─── Normalização ────────────────────────────────────────────

export function normalizarOrigemPersonagem(origem) {
    return ORIGENS_PERSONAGEM.includes(origem) ? origem : '';
}

// Mantém só papéis válidos, sem repetição, na ordem de PAPEIS_PERSONAGEM
// (não na ordem em que foram marcados).
export function normalizarPapeisPersonagem(papeis) {
    const lista = Array.isArray(papeis) ? papeis : [];
    return PAPEIS_PERSONAGEM.filter((p) => lista.includes(p));
}

// A centralidade se aplica quando o vínculo ainda não tem papel marcado ou
// quando tem ao menos um papel de presença efetiva (Voz, Interlocutor,
// Aparição).
export function centralidadeAplicavel(papeis) {
    const lista = normalizarPapeisPersonagem(papeis);
    if (lista.length === 0) return true;
    return lista.some((p) => !PAPEIS_PERSONAGEM_SEM_CENTRALIDADE.includes(p));
}

export function normalizarCentralidadePersonagem(centralidade, papeis = []) {
    if (!CENTRALIDADES_PERSONAGEM.includes(centralidade)) return '';
    return centralidadeAplicavel(papeis) ? centralidade : '';
}

// `personagens` de um texto: um vínculo por personagem (entradas repetidas
// se juntam: papéis e tags de relação em união, centralidade da primeira que
// a tem), cada um no formato `{ personagemId, papeis, centralidade,
// papelNarrativo, arco, tropes, funcaoTematica }`. Entrada sem id é
// descartada.
export function normalizarPersonagensDoTexto(lista) {
    const porId = new Map();
    (Array.isArray(lista) ? lista : []).forEach((e) => {
        if (e?.personagemId == null || e.personagemId === '') return;
        const chave = String(e.personagemId);
        const atual = porId.get(chave);
        if (!atual) {
            const novoVinculo = {
                personagemId: e.personagemId,
                papeis: Array.isArray(e.papeis) ? [...e.papeis] : [],
                centralidade: e.centralidade,
            };
            CAMPOS_RELACAO_PERSONAGEM.forEach((c) => {
                novoVinculo[c] = normalizarTagsPersonagem(e[c]);
            });
            porId.set(chave, novoVinculo);
            return;
        }
        if (Array.isArray(e.papeis)) atual.papeis.push(...e.papeis);
        if (!CENTRALIDADES_PERSONAGEM.includes(atual.centralidade)) {
            atual.centralidade = e.centralidade;
        }
        CAMPOS_RELACAO_PERSONAGEM.forEach((c) => {
            atual[c] = normalizarTagsPersonagem([...atual[c], ...normalizarTagsPersonagem(e[c])]);
        });
    });
    return [...porId.values()].map((v) => {
        const papeis = normalizarPapeisPersonagem(v.papeis);
        const saida = {
            personagemId: v.personagemId,
            papeis,
            centralidade: normalizarCentralidadePersonagem(v.centralidade, papeis),
        };
        CAMPOS_RELACAO_PERSONAGEM.forEach((c) => {
            saida[c] = v[c];
        });
        return saida;
    });
}

// Tags: texto aparado, sem vazio e sem repetição por chaveTema (a primeira
// grafia fica). Aceita array ou string "a, b, c".
export function normalizarTagsPersonagem(tags) {
    const lista = Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',') : [];
    const vistos = new Set();
    const saida = [];
    lista.forEach((t) => {
        const texto = String(t ?? '').trim();
        const chave = chaveTema(texto);
        if (!chave || vistos.has(chave)) return;
        vistos.add(chave);
        saida.push(texto);
    });
    return saida;
}

// Participações em livros: uma por livro (repetidas se juntam, tags em
// união), cada uma `{ livroId, papelNarrativo, funcaoTematica, arco, tropes }`.
// Entrada sem livroId é descartada; a ordem é a da primeira ocorrência.
export function normalizarParticipacoesPersonagem(lista) {
    const porLivro = new Map();
    (Array.isArray(lista) ? lista : []).forEach((e) => {
        if (e?.livroId == null || e.livroId === '') return;
        const chave = String(e.livroId);
        const atual = porLivro.get(chave) || { livroId: e.livroId };
        CAMPOS_RELACAO_PERSONAGEM.forEach((c) => {
            atual[c] = normalizarTagsPersonagem([
                ...(atual[c] || []),
                ...normalizarTagsPersonagem(e[c]),
            ]);
        });
        porLivro.set(chave, atual);
    });
    return [...porLivro.values()];
}

// Tags já usadas num campo de relação, em qualquer texto e em qualquer
// participação por livro: sugestão para o vocabulário convergir entre os
// dois níveis (a comparação depende disso).
export function sugestoesRelacaoPersonagem(dbRef, campo) {
    const dosTextos = ['poemas', 'prosas'].flatMap((t) =>
        (dbRef[t] || []).flatMap((it) => (it.personagens || []).flatMap((v) => v?.[campo] || [])),
    );
    const dosLivros = (dbRef.personagens || []).flatMap((p) =>
        (p.participacoes || []).flatMap((v) => v?.[campo] || []),
    );
    return normalizarTagsPersonagem([...dosTextos, ...dosLivros]);
}

export function normalizarCaracteristicasPersonagem(c) {
    const origem = c && typeof c === 'object' ? c : {};
    const saida = {};
    GRUPOS_CARACTERISTICAS_PERSONAGEM.forEach((g) => {
        saida[g] = normalizarTagsPersonagem(origem[g]);
    });
    saida.backstoryNota = typeof origem.backstoryNota === 'string' ? origem.backstoryNota : '';
    return saida;
}

export function caracteristicasVazias(c) {
    const n = normalizarCaracteristicasPersonagem(c);
    return (
        GRUPOS_CARACTERISTICAS_PERSONAGEM.every((g) => n[g].length === 0) &&
        n.backstoryNota.trim() === ''
    );
}

export function normalizarCorRacaPersonagem(valor) {
    return CORES_RACA_AUTOR.includes(valor) ? valor : '';
}

export function normalizarIdentidadeCisTransPersonagem(valor) {
    return IDENTIDADES_CIS_TRANS.includes(valor) ? valor : '';
}

function textoLivreAparado(valor) {
    return typeof valor === 'string' ? valor.trim() : '';
}

// Data parcial `{dia?, mes?, ano?}` só com inteiros positivos; null quando
// não sobra nada (e quando não é objeto).
export function normalizarDataParcialPersonagem(d) {
    if (!d || typeof d !== 'object') return null;
    const saida = {};
    ['dia', 'mes', 'ano'].forEach((k) => {
        const n = Number(d[k]);
        if (d[k] !== '' && d[k] != null && Number.isInteger(n) && n > 0) saida[k] = n;
    });
    return Object.keys(saida).length ? saida : null;
}

// ─── Vida e idade ────────────────────────────────────────────

// Anos entre nascimento e óbito; null se faltar um dos dois anos ou se o
// óbito for anterior ao nascimento.
export function duracaoDaVidaPersonagem(p) {
    const n = p?.nascimento?.ano;
    const o = p?.obito?.ano;
    if (!Number.isInteger(n) || !Number.isInteger(o) || o < n) return null;
    return o - n;
}

// Idade (em anos completos de calendário, só pelo ano) no `ano` dado. null
// quando falta o nascimento ou o ano, quando o ano é anterior ao
// nascimento e quando o personagem já tinha morrido nesse ano.
export function idadeDoPersonagemEm(p, ano) {
    const n = p?.nascimento?.ano;
    const a = Number(ano);
    if (!Number.isInteger(n) || !Number.isInteger(a) || a < n) return null;
    const o = p?.obito?.ano;
    if (Number.isInteger(o) && a > o) return null;
    return a - n;
}

// Óbito anterior ao nascimento (para o formulário recusar).
export function vidaInvalidaPersonagem(p) {
    return violaOrdemDeDatas(p?.nascimento, p?.obito);
}

// Registro do cadastro. Campos que esta versão não conhece (por exemplo a
// futura Referência de origem) atravessam intactos.
export function normalizarPersonagem(p) {
    return {
        ...p,
        nome: String(p?.nome ?? '').trim(),
        origem: normalizarOrigemPersonagem(p?.origem),
        notas: typeof p?.notas === 'string' ? p.notas : '',
        genero: textoLivreAparado(p?.genero),
        orientacao: textoLivreAparado(p?.orientacao),
        identidadeCisTrans: normalizarIdentidadeCisTransPersonagem(p?.identidadeCisTrans),
        corRaca: normalizarCorRacaPersonagem(p?.corRaca),
        nascimento: normalizarDataParcialPersonagem(p?.nascimento),
        obito: normalizarDataParcialPersonagem(p?.obito),
        caracteristicas: normalizarCaracteristicasPersonagem(p?.caracteristicas),
        participacoes: normalizarParticipacoesPersonagem(p?.participacoes),
    };
}

// ─── Migração / sincronização ────────────────────────────────

// Idempotente. Garante `dbRef.personagens`, normaliza o cadastro e o
// `personagens` de cada Poema/Prosa (instalações e backups antigos não o
// têm) e solta vínculos que apontam para um Personagem que não existe no
// cadastro. Devolve quantos vínculos órfãos soltou.
export function sincronizarPersonagens(dbRef) {
    if (!Array.isArray(dbRef.personagens)) dbRef.personagens = [];
    dbRef.personagens = dbRef.personagens
        .filter((p) => p && p.id != null)
        .map((p) => normalizarPersonagem(p));

    // Participação em livro que não existe mais é solta (só quando o db tem a
    // lista de livros, para não apagar tudo num db parcial).
    if (Array.isArray(dbRef.livros)) {
        const livros = new Set(dbRef.livros.map((l) => String(l.id)));
        dbRef.personagens.forEach((p) => {
            p.participacoes = p.participacoes.filter((v) => livros.has(String(v.livroId)));
        });
    }

    const ids = new Set(dbRef.personagens.map((p) => String(p.id)));
    let orfaos = 0;
    ['poemas', 'prosas'].forEach((col) => {
        (dbRef[col] || []).forEach((it) => {
            const normalizados = normalizarPersonagensDoTexto(it.personagens);
            const validos = normalizados.filter((e) => ids.has(String(e.personagemId)));
            orfaos += normalizados.length - validos.length;
            it.personagens = validos;
        });
    });
    return orfaos;
}

// ─── Cadastro ────────────────────────────────────────────────

export function acharPersonagemPorNome(dbRef, nome) {
    const alvo = chaveTema(nome);
    if (!alvo) return null;
    return (dbRef.personagens || []).find((p) => chaveTema(p.nome) === alvo) || null;
}

// Cria e já coloca no cadastro. Nome vazio não cria (devolve null). Não
// impede nome repetido: dois personagens de obras diferentes podem se
// chamar igual; quem cadastra (aba Personagens) é que avisa.
export function criarPersonagem(dbRef, { nome, origem = '', notas = '', ...demais } = {}) {
    const limpo = String(nome ?? '').trim();
    if (!limpo) return null;
    if (!Array.isArray(dbRef.personagens)) dbRef.personagens = [];
    const personagem = normalizarPersonagem({
        ...demais,
        id: gerarId(),
        nome: limpo,
        origem,
        notas,
    });
    dbRef.personagens.push(personagem);
    return personagem;
}

// ─── Consulta ────────────────────────────────────────────────

function achaVinculo(item, personagemId) {
    return (item.personagens || []).some((e) => e.personagemId == personagemId);
}

/**
 * Quem referencia o Personagem `personagemId`: poemas e prosas onde ele
 * está vinculado (em qualquer papel). Serve tanto para avisar quantos
 * textos serão afetados na exclusão quanto para de fato desvincular
 * (mesmo espírito de calcularImpactoExclusaoPessoa em db.js).
 */
export function calcularImpactoExclusaoPersonagem(dbRef, personagemId) {
    return {
        poemasIds: (dbRef.poemas || [])
            .filter((p) => achaVinculo(p, personagemId))
            .map((p) => p.id),
        prosasIds: (dbRef.prosas || [])
            .filter((p) => achaVinculo(p, personagemId))
            .map((p) => p.id),
    };
}

// Vínculo de um texto com um personagem, ou null.
export function vinculoDoPersonagem(item, personagemId) {
    return (item?.personagens || []).find((e) => e.personagemId == personagemId) || null;
}

// Nomes dos personagens de um texto, na ordem do vínculo. Id que não está
// no cadastro é ignorado.
export function nomesPersonagens(item, cadastro) {
    return (item?.personagens || [])
        .map((e) => (cadastro || []).find((p) => p.id == e.personagemId)?.nome)
        .filter(Boolean);
}

// Nomes dos Personagens do texto que têm `papel` (um de PAPEIS_PERSONAGEM)
// no vínculo. Como o vínculo guarda os papéis em lista, o mesmo Personagem
// aparece em mais de um papel (Voz e Aparição, por exemplo). Alimenta os
// prefixos personagemvoz:, personageminterlocutor:, personagemaparicao:,
// personagemmencao: e personagemalusao: (`personagem:` acha em qualquer papel).
export function nomesPersonagensPorPapel(item, cadastro, papel) {
    return (item?.personagens || [])
        .filter((e) => normalizarPapeisPersonagem(e.papeis).includes(papel))
        .map((e) => (cadastro || []).find((p) => p.id == e.personagemId)?.nome)
        .filter(Boolean);
}

// Nomes dos Personagens do texto numa centralidade ('protagonista',
// 'secundario' ou '' para "ainda não preenchida"). O vazio só vale onde a
// centralidade se aplica: Personagem só com Menção e/ou Alusão não entra em
// nenhuma das três (nem em "sem centralidade"), igual às Estatísticas, que o
// contam como "não se aplica". Alimenta personagemprotagonista:,
// personagemsecundario: e personagemsemcentralidade:.
export function nomesPersonagensPorCentralidade(item, cadastro, centralidade) {
    return (item?.personagens || [])
        .filter((e) => {
            const papeis = normalizarPapeisPersonagem(e.papeis);
            if (!centralidadeAplicavel(papeis)) return false;
            return normalizarCentralidadePersonagem(e.centralidade, papeis) === centralidade;
        })
        .map((e) => (cadastro || []).find((p) => p.id == e.personagemId)?.nome)
        .filter(Boolean);
}

// Linha de texto do grupo Personagens (.md e Visualização): cada personagem do
// texto com papéis, centralidade e as tags de relação entre parênteses, por
// exemplo "Capitu (Voz, Aparição; protagonista; papel narrativo: narradora),
// Bento (Interlocutor), Escobar". Só o nome quando o vínculo está sem nada.
// Personagem sem cadastro é ignorado; devolve '' quando não sobra ninguém.
export function textoPersonagensComPapel(item, cadastro) {
    return (item?.personagens || [])
        .map((e) => {
            const nome = (cadastro || []).find((p) => p.id == e.personagemId)?.nome;
            if (!nome) return '';
            const papeis = normalizarPapeisPersonagem(e.papeis);
            const centralidade = normalizarCentralidadePersonagem(e.centralidade, papeis);
            const partes = [];
            if (papeis.length) partes.push(papeis.join(', '));
            if (centralidade)
                partes.push(ROTULOS_CENTRALIDADE_PERSONAGEM[centralidade].toLowerCase());
            CAMPOS_RELACAO_PERSONAGEM.forEach((c) => {
                const tags = normalizarTagsPersonagem(e[c]);
                if (tags.length) {
                    partes.push(
                        `${ROTULOS_RELACAO_PERSONAGEM[c].toLowerCase()}: ${tags.join(', ')}`,
                    );
                }
            });
            return partes.length ? `${nome} (${partes.join('; ')})` : nome;
        })
        .filter(Boolean)
        .join(', ');
}

// ─── Exportação ──────────────────────────────────────────────

// Identidade, vida e características do cadastro, para viajar junto do
// vínculo (o id não vale em outro acervo).
function dadosDeCadastroParaExportar(dbRef, cadastro) {
    const n = normalizarPersonagem(cadastro || {});
    return {
        genero: n.genero,
        orientacao: n.orientacao,
        identidadeCisTrans: n.identidadeCisTrans,
        corRaca: n.corRaca,
        nascimento: n.nascimento,
        obito: n.obito,
        caracteristicas: n.caracteristicas,
        participacoes: participacoesParaExportar(dbRef, n.participacoes),
    };
}

// O id do livro não vale em outro acervo: a participação viaja com o TÍTULO
// do livro (a importação casa pelo título). Livro que não existe é omitido.
function participacoesParaExportar(dbRef, participacoes) {
    return participacoes
        .map((v) => {
            const livro = (dbRef.livros || []).find((l) => l.id == v.livroId);
            if (!livro) return null;
            const saida = { livroTitulo: livro.titulo || '' };
            CAMPOS_RELACAO_PERSONAGEM.forEach((c) => {
                saida[c] = v[c];
            });
            return saida;
        })
        .filter((v) => v && chaveTema(v.livroTitulo));
}

// O id não vale em outro acervo, então cada vínculo exportado leva o nome e
// a origem junto do id; a Importação Aditiva casa/cria o Personagem pelo
// nome. Só devolve a chave `personagens` (para espalhar em montarRegistro).
export function personagensParaExportar(dbRef, item) {
    return {
        personagens: normalizarPersonagensDoTexto(item?.personagens).map((e) => {
            const cadastro = (dbRef.personagens || []).find((p) => p.id == e.personagemId);
            return {
                ...e,
                nome: cadastro?.nome || '',
                origem: cadastro?.origem || '',
                ...dadosDeCadastroParaExportar(dbRef, cadastro),
            };
        }),
    };
}

// ─── Importação entre acervos ────────────────────────────────

// Traz para `dbRef` os vínculos de Personagem de um texto exportado (ver
// personagensParaExportar): casa o Personagem pelo NOME (chaveTema) e cria
// o que falta, já com a origem, a identidade, a vida e as características
// exportadas. Um Personagem existente só tem preenchido o que estava
// vazio (origem, gênero, orientação, cis/trans, cor/raça, nascimento, óbito, cada
// grupo de tag e a nota do passado); o que já estava definido nunca é
// trocado. Devolve a lista `personagens` do texto no id do acervo de
// destino, já normalizada. Texto sem a chave `personagens` (JSON antigo)
// devolve [].
// Preenche só o que o cadastro existente tem vazio, com o que veio no
// arquivo. Altera `personagem` no lugar.
// Participações do arquivo no id dos livros do destino, casando pelo título
// (sem caixa/acento). Livro que não existe no destino é descartado: a
// importação não cria livro por causa de um personagem.
function participacoesImportadas(dbRef, lista) {
    const resolvidas = (Array.isArray(lista) ? lista : [])
        .map((v) => {
            const alvo = chaveTema(v?.livroTitulo);
            const livro = alvo
                ? (dbRef.livros || []).find((l) => chaveTema(l.titulo) === alvo)
                : null;
            return livro ? { ...v, livroId: livro.id } : null;
        })
        .filter(Boolean);
    return normalizarParticipacoesPersonagem(resolvidas);
}

function completarPersonagemComArquivo(dbRef, personagem, e) {
    const doArquivo = normalizarPersonagem({ nome: personagem.nome, ...e });
    if (!personagem.origem) personagem.origem = doArquivo.origem;
    ['genero', 'orientacao', 'identidadeCisTrans', 'corRaca'].forEach((k) => {
        if (!personagem[k]) personagem[k] = doArquivo[k];
    });
    ['nascimento', 'obito'].forEach((k) => {
        if (!personagem[k]) personagem[k] = doArquivo[k];
    });
    const atual = normalizarCaracteristicasPersonagem(personagem.caracteristicas);
    GRUPOS_CARACTERISTICAS_PERSONAGEM.forEach((g) => {
        if (atual[g].length === 0) atual[g] = doArquivo.caracteristicas[g];
    });
    if (!atual.backstoryNota.trim()) atual.backstoryNota = doArquivo.caracteristicas.backstoryNota;
    personagem.caracteristicas = atual;

    // Participação por livro: acrescenta o livro que faltava e, num livro que
    // o cadastro já tinha, só preenche o campo de tag vazio.
    const doArquivoPart = participacoesImportadas(dbRef, e.participacoes);
    const atualPart = normalizarParticipacoesPersonagem(personagem.participacoes);
    doArquivoPart.forEach((novo) => {
        const existente = atualPart.find((v) => String(v.livroId) === String(novo.livroId));
        if (!existente) {
            atualPart.push(novo);
            return;
        }
        CAMPOS_RELACAO_PERSONAGEM.forEach((c) => {
            if (existente[c].length === 0) existente[c] = novo[c];
        });
    });
    personagem.participacoes = atualPart;
}

export function importarPersonagensDoTexto(dbRef, itemOrigem) {
    if (!Array.isArray(itemOrigem?.personagens)) return [];
    const vinculos = [];
    itemOrigem.personagens.forEach((e) => {
        const nome = String(e?.nome ?? '').trim();
        if (!chaveTema(nome)) return;
        let personagem = acharPersonagemPorNome(dbRef, nome);
        if (!personagem) {
            personagem = criarPersonagem(dbRef, {
                nome,
                origem: e.origem,
                genero: e.genero,
                orientacao: e.orientacao,
                identidadeCisTrans: e.identidadeCisTrans,
                corRaca: e.corRaca,
                nascimento: e.nascimento,
                obito: e.obito,
                caracteristicas: e.caracteristicas,
                participacoes: participacoesImportadas(dbRef, e.participacoes),
            });
        } else {
            completarPersonagemComArquivo(dbRef, personagem, e);
        }
        const vinculo = {
            personagemId: personagem.id,
            papeis: e.papeis,
            centralidade: e.centralidade,
        };
        CAMPOS_RELACAO_PERSONAGEM.forEach((c) => {
            vinculo[c] = e[c];
        });
        vinculos.push(vinculo);
    });
    return normalizarPersonagensDoTexto(vinculos);
}
