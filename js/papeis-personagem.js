// ============================================================
// papeis-personagem.js: Registro de papéis de Personagem (lógica pura)
// Sem DOM e sem db.js. Só importa os auxiliares genéricos de papeis-pessoa.js
// (chave de comparação, apelido sugerido, regras de exclusão), que recebem o
// registro como argumento. Importado por: personagens.js, db.js,
// grupo-personagens.js, celulas-tabela.js, estatisticas-dados-personagens.js,
// sugestao-ecos.js, esvaziar-acervo.js e inventario-armazenamento.js.
//
// O papel de um Personagem num texto (`item.personagens[].papeis`) continua
// sendo uma lista de NOMES. A lista de papéis possíveis deixa de ser uma
// constante e vira um registro, `db.papeisPersonagem`, no mesmo molde de
// `db.papeisPessoa`, com um objeto por papel:
//
//   { nome, apelido, descricao, grupoExclusao, exclusivoComTodos,
//     semCentralidade, fabrica }
//
//   nome               o valor gravado nos textos (único, sem caixa nem acento)
//   apelido            a abreviação mostrada na coluna (por padrão, 4 letras ou
//                      mais, terminando em consoante)
//   descricao          o que o papel quer dizer (tooltip e legenda para IA)
//   grupoExclusao      texto; dois papéis do mesmo grupo não convivem no vínculo
//   exclusivoComTodos  true: não convive com nenhum outro papel
//   semCentralidade    true: o Personagem não está de fato em cena (só é nomeado
//                      ou evocado), então a Centralidade não se aplica a quem
//                      tem só papéis assim; também conta como vínculo fraco
//                      ("superfície") na sugestão de Ecos
//   fabrica            true: papel de fábrica (nome e regras travados; apelido e
//                      descrição editáveis; não se apaga)
//
// A ORDEM DO REGISTRO é a ordem de presença no texto (Voz, Interlocutor,
// Aparição, Menção, Alusão, depois os papéis acrescentados). Diferente de
// Pessoa, a ordem dos papéis num vínculo NÃO é relevância: o sistema sempre
// reordena para a ordem do registro, não importa a sequência da marcação. A
// relevância do Personagem mora na Centralidade e no Papel narrativo.
// ============================================================

import {
    chavePapel,
    apelidoSugerido,
    apelidoDisponivel,
    papeisSeExcluem,
    conflitosDoPapel,
    marcarPapel,
    desmarcarPapel,
    violacoesDeExclusao,
    resolverConflitosMantendoOPrimeiro,
} from './papeis-pessoa.js';

// Papéis de fábrica, já na ordem de presença no texto.
const FABRICA = [
    {
        nome: 'Voz',
        apelido: 'Voz',
        descricao:
            'O Personagem fala no texto: as palavras são dele, em discurso direto ou como a voz que conduz o poema ou a prosa (narrador ou eu lírico que é uma figura criada). Presença efetiva. Não é o papel Voz de Pessoa, que é a pessoa real cujas próprias palavras o texto reproduz.',
        grupoExclusao: '',
        exclusivoComTodos: false,
        semCentralidade: false,
    },
    {
        nome: 'Interlocutor',
        apelido: 'Inter',
        descricao:
            'O texto fala com este Personagem: ele é interpelado, ouvido ou respondido por quem fala, e pode ou não responder. Se também fala, ganha Voz além deste papel. Presença efetiva.',
        grupoExclusao: '',
        exclusivoComTodos: false,
        semCentralidade: false,
    },
    {
        nome: 'Aparição',
        apelido: 'Apar',
        descricao:
            'O Personagem está em cena: age, é visto ou é descrito em ação, quer também fale, quer seja interpelado, quer não. É a linha de base de presença. Presença efetiva.',
        grupoExclusao: '',
        exclusivoComTodos: false,
        semCentralidade: false,
    },
    {
        nome: 'Menção',
        apelido: 'Menc',
        descricao:
            'O Personagem é designado no texto, de passagem ou no título, sem estar em cena: por nome, apelido ou epíteto que aponte só para ele ("o rei", "a mulher do sétimo andar"). O critério é o texto designá-lo, não ele ter nome próprio; tipo genérico ("todo rei") não conta. Não convive com Alusão: se o texto o designa, aludir não acrescenta nada. A Centralidade não se aplica.',
        grupoExclusao: 'nome-no-texto',
        exclusivoComTodos: false,
        semCentralidade: true,
    },
    {
        nome: 'Alusão',
        apelido: 'Alus',
        descricao:
            'O Personagem é evocado sem ser designado (por pronome sem antecedente, epíteto metafórico, imagem ou circunstância), de modo que quem o conhece o reconhece. É o equivalente de Menção quando a designação não aparece. Não convive com Menção. A Centralidade não se aplica.',
        grupoExclusao: 'nome-no-texto',
        exclusivoComTodos: false,
        semCentralidade: true,
    },
].map((p) => Object.freeze({ ...p, fabrica: true }));

export const NOMES_PAPEIS_PERSONAGEM_FABRICA = Object.freeze(FABRICA.map((p) => p.nome));

// Cópias novas de cada chamada: quem recebe pode editar sem sujar a fábrica.
export function papeisPersonagemDeFabrica() {
    return FABRICA.map((p) => ({ ...p }));
}

const texto = (v) => (typeof v === 'string' ? v.trim() : '');

// Descrições de fábrica antigas (da mais velha à mais recente), para migrar quem não
// as editou. Em 27/10/2026 Menção e Alusão deixaram de usar "o nome aparecer" e
// passaram a usar o texto designar ou não o Personagem (mesmo critério de Pessoa).
const DESCRICOES_ANTIGAS = {
    Menção: [
        'O Personagem é nomeado no texto, de passagem ou no título, sem estar em cena. O critério é o nome aparecer. Não convive com Alusão: se o nome aparece, aludir não acrescenta nada. A Centralidade não se aplica.',
    ],
    Alusão: [
        'O Personagem é evocado sem ser nomeado (por epíteto, imagem ou circunstância), de modo que quem o conhece o reconhece. É o equivalente de Menção quando o nome não aparece. Não convive com Menção. A Centralidade não se aplica.',
    ],
};

// Normaliza o registro: papéis de fábrica sempre presentes (nome e regras de
// fábrica; apelido e descrição da pessoa quando válidos), depois os papéis da
// própria pessoa. Nome repetido (sem caixa nem acento) conta uma vez; apelido
// repetido é trocado por um sugerido, e o primeiro a usar o apelido fica com
// ele. Nunca altera o que recebe.
export function normalizarRegistroPersonagem(entrada) {
    const lista = Array.isArray(entrada) ? entrada.filter((p) => p && typeof p === 'object') : [];
    const porChave = new Map();
    lista.forEach((p) => {
        const nome = texto(p.nome);
        if (nome && !porChave.has(chavePapel(nome))) porChave.set(chavePapel(nome), p);
    });

    const saida = [];
    const chavesNome = new Set();
    const apelidosUsados = new Set();

    const acrescentar = (papel) => {
        let apelido = texto(papel.apelido);
        if (!apelido || apelidosUsados.has(chavePapel(apelido))) {
            apelido = apelidoSugerido(papel.nome, apelidosUsados);
        }
        apelidosUsados.add(chavePapel(apelido));
        chavesNome.add(chavePapel(papel.nome));
        saida.push({ ...papel, apelido });
    };

    FABRICA.forEach((f) => {
        const dela = porChave.get(chavePapel(f.nome));
        acrescentar({
            ...f,
            apelido: texto(dela?.apelido) || f.apelido,
            descricao:
                (!DESCRICOES_ANTIGAS[f.nome]?.includes(texto(dela?.descricao)) &&
                    texto(dela?.descricao)) ||
                f.descricao,
        });
    });

    lista.forEach((p) => {
        const nome = texto(p.nome);
        if (!nome || chavesNome.has(chavePapel(nome))) return;
        acrescentar({
            nome,
            apelido: texto(p.apelido),
            descricao: texto(p.descricao),
            grupoExclusao: texto(p.grupoExclusao),
            exclusivoComTodos: p.exclusivoComTodos === true,
            semCentralidade: p.semCentralidade === true,
            fabrica: false,
        });
    });

    return saida;
}

// Migração de carga: semeia e normaliza `dbRef.papeisPersonagem`. Seguro de
// rodar de novo. Devolve true se o registro mudou. Não semeia valores soltos
// dos textos: o que não é papel cadastrado sempre foi descartado na leitura.
export function migrarRegistroPapeisPersonagem(dbRef) {
    const antes = JSON.stringify(dbRef.papeisPersonagem ?? null);
    dbRef.papeisPersonagem = normalizarRegistroPersonagem(dbRef.papeisPersonagem);
    return JSON.stringify(dbRef.papeisPersonagem) !== antes;
}

// ─── Leitura do registro vivo ────────────────────────────────
// O db.js registra de onde ler. Sem registro (testes de lógica pura, módulos
// carregados antes do db), vale a fábrica.
let _obterRegistro = () => null;

export function definirRegistroPapeisPersonagem(obter) {
    _obterRegistro = typeof obter === 'function' ? obter : () => null;
}

export function registroPapeisPersonagem() {
    const vivo = _obterRegistro();
    if (Array.isArray(vivo) && vivo.length) return vivo;
    return papeisPersonagemDeFabrica();
}

export function nomesPapeisPersonagem() {
    return registroPapeisPersonagem().map((p) => p.nome);
}

export function papelPersonagemPorNome(nome, registro = registroPapeisPersonagem()) {
    return registro.find((p) => p.nome === nome) || null;
}

// Abreviação de um papel para a coluna. Papel que o registro não conhece usa o
// apelido sugerido, sem gravar nada.
export function apelidoDoPapelPersonagem(nome, registro = registroPapeisPersonagem()) {
    return papelPersonagemPorNome(nome, registro)?.apelido || apelidoSugerido(nome);
}

// O Personagem, nesse papel, só é nomeado ou evocado (não está em cena)?
export function papelPersonagemSemCentralidade(nome, registro = registroPapeisPersonagem()) {
    return papelPersonagemPorNome(nome, registro)?.semCentralidade === true;
}

// ─── Exclusão entre papéis (mesma regra de Pessoa, com o registro de Personagem)

export function papeisPersonagemSeExcluem(a, b, registro = registroPapeisPersonagem()) {
    return papeisSeExcluem(a, b, registro);
}

export function conflitosDoPapelPersonagem(papel, atuais, registro = registroPapeisPersonagem()) {
    return conflitosDoPapel(papel, atuais, registro);
}

// Marca `papel`: sai o que conflita. Devolve { papeis, removidos } (a ordem
// final é a do registro, aplicada por normalizarPapeisPersonagem).
export function marcarPapelPersonagem(papel, atuais, registro = registroPapeisPersonagem()) {
    return marcarPapel(papel, atuais, registro);
}

export function desmarcarPapelPersonagem(papel, atuais) {
    return desmarcarPapel(papel, atuais);
}

export function violacoesDeExclusaoPersonagem(papeis, registro = registroPapeisPersonagem()) {
    return violacoesDeExclusao(papeis, registro);
}

export function resolverConflitosPersonagem(papeis, registro = registroPapeisPersonagem()) {
    return resolverConflitosMantendoOPrimeiro(papeis, registro);
}

export function apelidoPersonagemDisponivel(apelido, nome, registro = registroPapeisPersonagem()) {
    return apelidoDisponivel(apelido, nome, registro);
}
