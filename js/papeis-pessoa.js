// ============================================================
// papeis-pessoa.js: Registro de papéis de Pessoa (lógica pura)
// Sem DOM, sem db.js e sem imports. Importado por: utils.js, db.js, editor.js,
// selecao-massa.js, pessoas-papeis-massa.js, importar-campos-extras.js,
// sugestao-ecos.js e os módulos de tela que listam os papéis.
//
// O papel de uma Pessoa num texto (`item.pessoas[].papeis`) continua sendo uma
// lista de NOMES. O que muda é que a lista de papéis possíveis deixa de ser uma
// constante e vira um registro, `db.papeisPessoa`, com um objeto por papel:
//
//   { nome, apelido, descricao, grupoExclusao, exclusivoComTodos, superficie, fabrica }
//
//   nome               o valor gravado nos textos (único, sem caixa nem acento)
//   apelido            a abreviação mostrada no chip e na coluna (por padrão, 4 letras ou mais, terminando em consoante)
//   descricao          o que o papel quer dizer (tooltip e legenda para IA)
//   grupoExclusao      texto; dois papéis do mesmo grupo não convivem no mesmo vínculo
//   exclusivoComTodos  true: não convive com nenhum outro papel (Relacionado(a))
//   superficie         true: o texto só cita ou evoca a pessoa (conta como vínculo fraco
//                      na sugestão de Ecos)
//   fabrica            true: papel de fábrica (nome e regras travados; apelido e
//                      descrição editáveis; não se apaga)
//
// As regras moram no registro, não no nome, então renomear ou apagar um papel
// nunca quebra uma regra em silêncio.
// ============================================================

// Papéis de fábrica, na ordem em que aparecem nas caixas. A ordem dos sete
// primeiros é a histórica (Voz entrou por último, depois Alocutário(a) e
// Relacionado(a)); acrescentar no fim não muda a ordem de nada já gravado.
const FABRICA = [
    {
        nome: 'Retratado(a)',
        apelido: 'Retr',
        descricao:
            'A pessoa é figura do texto: aparece em cena, com ações, traços ou uma relação descrita, sem que o poema fale diretamente com ela. É a linha de base de quem está no poema, qualquer que seja a forma.',
        grupoExclusao: '',
        exclusivoComTodos: false,
        superficie: false,
    },
    {
        nome: 'Inspiração para',
        apelido: 'Insp',
        descricao:
            'A pessoa, a relação com ela ou algo vivido com ela deu origem ao texto, sem que o texto precise retratá-la. Cobre a musa e a ocasião (o poema nasceu do que aconteceu com ela). Não implica presença no texto. Não convive com Associado(a) retroativamente: o texto nasceu ligado à pessoa ou foi ligado depois.',
        grupoExclusao: 'cronologia-do-vinculo',
        exclusivoComTodos: false,
        superficie: false,
    },
    {
        nome: 'Dedicatário(a)',
        apelido: 'Dedic',
        descricao:
            'O texto tem forma de dedicação a esta pessoa: o título, o texto ou a estrutura a oferecem a ela, ou a endereçam de modo explícito (interpelação, pedido, resposta, acusação, perdão). Vale pela intenção e independe de o texto ter sido enviado ou mostrado (isso fica em Envios e Reações).',
        grupoExclusao: '',
        exclusivoComTodos: false,
        superficie: false,
    },
    {
        nome: 'Mencionado(a)',
        apelido: 'Menc',
        descricao:
            'A pessoa é designada no texto, de passagem, sem ser objeto dele: por nome, apelido ou termo de parentesco ou de relação ("meu pai", "minha mãe", "meu ex"). O critério é o texto designá-la, não ela ter nome próprio. Não convive com Aludido(a): se o texto a designa, aludir não acrescenta nada.',
        grupoExclusao: 'nome-no-texto',
        exclusivoComTodos: false,
        superficie: true,
    },
    {
        nome: 'Aludido(a)',
        apelido: 'Alud',
        descricao:
            'O texto remete à pessoa sem designá-la (por pronome sem antecedente, epíteto metafórico, imagem ou circunstância), de modo que quem a conhece a reconhece. É o equivalente de Mencionado(a) quando a designação não aparece, ou foi ocultada. Não convive com Mencionado(a).',
        grupoExclusao: 'nome-no-texto',
        exclusivoComTodos: false,
        superficie: true,
    },
    {
        nome: 'Associado(a) retroativamente',
        apelido: 'Assoc',
        descricao:
            'O texto não nasceu ligado à pessoa: a ligação foi feita depois, por afinidade, releitura ou curadoria. Só vale se houver evidência de que a associação é posterior à escrita. Não convive com Inspiração para.',
        grupoExclusao: 'cronologia-do-vinculo',
        exclusivoComTodos: false,
        superficie: false,
    },
    {
        nome: 'Voz',
        apelido: 'Voz',
        descricao:
            'Responde "quem fala neste texto?". É a pessoa real que enuncia na cena do texto: o autor, ou alguém cuja fala o texto encena e que se ouve ali como falante (um diálogo vivido, uma resposta, uma mensagem tratada como turno (vez de fala)). Trecho de obra ou de fala alheia trazido de fora, como apoio, comentário ou eco (epígrafe, letra de música, frase de livro), não é Voz: é Citação, em Intertextualidade. Aspas e itálico não decidem sozinhos, decide a função: se o trecho saísse, o texto perderia um falante (Voz) ou só um apoio (Citação). A primeira pessoa sozinha não decide: se quem fala é uma figura criada, o lugar é Personagens. Tradução fiel de texto alheio: a Voz é da outra pessoa. Em Alocutário(a) a pessoa é ouvida sem responder; aqui ela fala. Não é o papel Voz de Personagem.',
        grupoExclusao: '',
        exclusivoComTodos: false,
        superficie: false,
    },
    {
        nome: 'Alocutário(a)',
        apelido: 'Aloc',
        descricao:
            'O texto fala com esta pessoa em segunda pessoa, ainda que não seja uma dedicatória e ainda que ela não responda: é o “tu” do poema. Usar “você” só para nomear a figura não basta, é preciso que o texto se dirija a ela. Quase todo Dedicatário(a) é também Alocutário(a), mas o inverso não vale.',
        grupoExclusao: '',
        exclusivoComTodos: false,
        superficie: false,
    },
    {
        nome: 'Relacionado(a)',
        apelido: 'Relac',
        descricao:
            'A pessoa está ligada ao texto, mas quem cataloga olhou os outros papéis e nenhum coube sem forçar. É exclusivo: não convive com nenhum outro papel. É uma declaração de catalogação, não um papel fraco, e não entra na leitura por ordem de relevância. O motivo, quando for informativo, vai em Notas.',
        grupoExclusao: '',
        exclusivoComTodos: true,
        superficie: false,
    },
].map((p) => Object.freeze({ ...p, fabrica: true }));

export const NOMES_PAPEIS_PESSOA_FABRICA = Object.freeze(FABRICA.map((p) => p.nome));

// Cópias novas de cada chamada: quem recebe pode editar sem sujar a fábrica.
export function papeisPessoaDeFabrica() {
    return FABRICA.map((p) => ({ ...p }));
}

// Chave de comparação de nomes e apelidos: sem caixa, sem acento, sem espaço
// nas pontas.
export function chavePapel(texto) {
    return String(texto ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
}

// Apelido sugerido para um nome: pelo menos 4 letras e, se a última for vogal,
// segue até a próxima consoante (Inspiração → Insp, Mencionado → Menc,
// Aludido → Alud, Alocutário → Aloc, Dedicatário → Dedic); nome curto fica
// inteiro (Voz). Se o apelido já estiver em uso, estende mais uma letra por vez
// e, no último caso, acrescenta um número. `usados` é um Set de chaves
// (chavePapel) de apelidos.
const VOGAIS = 'aeiou';
export function apelidoSugerido(nome, usados = new Set()) {
    const letras = String(nome ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Za-z]/g, '');
    const base = letras || 'Papel';
    const monta = (n) => base.slice(0, n).charAt(0).toUpperCase() + base.slice(1, n).toLowerCase();
    let inicio = Math.min(4, base.length);
    while (inicio < base.length && VOGAIS.includes(base[inicio - 1].toLowerCase())) inicio++;
    for (let n = inicio; n <= base.length; n++) {
        const candidato = monta(n);
        if (!usados.has(chavePapel(candidato))) return candidato;
    }
    for (let i = 2; ; i++) {
        const candidato = `${monta(inicio)}${i}`;
        if (!usados.has(chavePapel(candidato))) return candidato;
    }
}

// Apelidos de fábrica da primeira versão (3 letras), para migrar quem não os editou.
const APELIDOS_ANTIGOS = {
    'Retratado(a)': 'Ret',
    'Inspiração para': 'Ins',
    'Dedicatário(a)': 'Ded',
    'Mencionado(a)': 'Men',
    'Aludido(a)': 'Alu',
    'Associado(a) retroativamente': 'Ass',
    Voz: 'Voz',
    'Alocutário(a)': 'Alo',
    'Relacionado(a)': 'Rel',
};

// Descrições de fábrica antigas (da mais velha à mais recente), para migrar quem
// não as editou: Voz e, desde 27/10/2026, Mencionado(a) e Aludido(a) (o critério
// deixou de ser "o nome aparecer" e passou a ser o texto designar ou não a pessoa).
const DESCRICOES_ANTIGAS = {
    'Mencionado(a)': [
        'A pessoa é nomeada no texto, de passagem, sem ser objeto dele. O critério é o nome aparecer. Não convive com Aludido(a): se o nome aparece, aludir não acrescenta nada.',
    ],
    'Aludido(a)': [
        'O texto remete à pessoa sem nomeá-la (por pronome, imagem, epíteto ou circunstância), de modo que quem a conhece a reconhece. É o equivalente de Mencionado(a) quando o nome não aparece, ou foi ocultado. Não convive com Mencionado(a).',
    ],
    Voz: [
        'A pessoa real fala no texto: sua fala aparece citada (entre aspas, em itálico, em outra fonte ou cor) ou reproduzida de forma contínua. Pode ser o próprio autor. Não se marca só porque o texto está em primeira pessoa. Em Alocutário(a) a pessoa é ouvida sem responder; aqui ela fala. Não é o papel Voz de Personagem.',
        'Responde "de quem são as palavras?". É a pessoa real cujas próprias palavras o texto reproduz, falando como ela mesma: o autor (em primeira pessoa ou não), alguém citado (entre aspas, em itálico, em outra fonte ou cor) ou reproduzido de forma contínua. A primeira pessoa sozinha não decide: se quem fala é uma figura criada, o lugar é Personagens; se as palavras são de outra pessoa (citação, tradução fiel), a Voz é dela. Em Alocutário(a) a pessoa é ouvida sem responder; aqui ela fala. Não é o papel Voz de Personagem.',
    ],
};

const texto = (v) => (typeof v === 'string' ? v.trim() : '');

// Normaliza o registro: papéis de fábrica sempre presentes (nome e regras de
// fábrica, apelido e descrição da pessoa quando válidos), depois os papéis da
// própria pessoa, depois os nomes `usados` nos textos que o registro não
// conhece (entram como papel simples, para o valor gravado nunca ficar sem
// cadastro). Nome repetido (sem caixa nem acento) conta uma vez; apelido
// repetido é trocado por um sugerido, e o primeiro a usar o apelido fica com
// ele. Nunca altera o que recebe.
export function normalizarRegistro(entrada, usados = []) {
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
        // Apelido de fábrica antigo (3 letras, da entrega 1a) que a pessoa não
        // mexeu passa para o novo padrão; o que ela editou fica como está.
        const guardado = texto(dela?.apelido);
        const eraPadraoAntigo = chavePapel(guardado) === chavePapel(APELIDOS_ANTIGOS[f.nome]);
        // Descrição de fábrica antiga que a pessoa não editou passa para a nova.
        const descGuardada = texto(dela?.descricao);
        const descEraAntiga = !!DESCRICOES_ANTIGAS[f.nome]?.includes(descGuardada);
        acrescentar({
            ...f,
            apelido: (!eraPadraoAntigo && guardado) || f.apelido,
            descricao: (!descEraAntiga && descGuardada) || f.descricao,
        });
    });

    lista.forEach((p) => {
        const nome = texto(p.nome);
        if (!nome || chavesNome.has(chavePapel(nome))) return;
        acrescentar({
            nome,
            apelido: texto(p.apelido),
            descricao: typeof p.descricao === 'string' ? p.descricao.trim() : '',
            grupoExclusao: texto(p.grupoExclusao),
            exclusivoComTodos: p.exclusivoComTodos === true,
            superficie: p.superficie === true,
            fabrica: false,
        });
    });

    (Array.isArray(usados) ? usados : []).forEach((valor) => {
        const nome = texto(valor);
        if (!nome || chavesNome.has(chavePapel(nome))) return;
        acrescentar({
            nome,
            apelido: '',
            descricao: '',
            grupoExclusao: '',
            exclusivoComTodos: false,
            superficie: false,
            fabrica: false,
        });
    });

    return saida;
}

// Nomes de papel usados nos vínculos de Pessoa dos textos (na ordem em que
// aparecem, sem repetir).
export function papeisUsadosNosTextos(dbRef) {
    const vistos = new Set();
    [...(dbRef?.poemas || []), ...(dbRef?.prosas || [])].forEach((item) => {
        (Array.isArray(item?.pessoas) ? item.pessoas : []).forEach((vinculo) => {
            (Array.isArray(vinculo?.papeis) ? vinculo.papeis : []).forEach((papel) => {
                if (typeof papel === 'string' && papel.trim()) vistos.add(papel.trim());
            });
        });
    });
    return [...vistos];
}

// Migração de carga: semeia e normaliza `dbRef.papeisPessoa`. Seguro de rodar
// de novo. Devolve true se o registro mudou.
export function migrarRegistroPapeisPessoa(dbRef) {
    const antes = JSON.stringify(dbRef.papeisPessoa ?? null);
    dbRef.papeisPessoa = normalizarRegistro(dbRef.papeisPessoa, papeisUsadosNosTextos(dbRef));
    return JSON.stringify(dbRef.papeisPessoa) !== antes;
}

// ─── Leitura do registro vivo ────────────────────────────────
// O db.js registra de onde ler (como o cadastro de etiquetas em utils.js).
// Sem registro (testes de lógica pura, módulos carregados antes do db), vale a
// fábrica. O que `obterRegistro` devolve passa por `normalizarRegistro`, então
// um registro vazio, nulo ou torto nunca deixa a lista de papéis sem os de
// fábrica.
let _obterRegistro = () => null;

export function definirRegistroPapeisPessoa(obter) {
    _obterRegistro = typeof obter === 'function' ? obter : () => null;
}

export function registroPapeisPessoa() {
    const vivo = _obterRegistro();
    if (Array.isArray(vivo) && vivo.length) return vivo;
    return papeisPessoaDeFabrica();
}

export function nomesPapeisPessoa() {
    return registroPapeisPessoa().map((p) => p.nome);
}

export function papelPessoaPorNome(nome, registro = registroPapeisPessoa()) {
    return registro.find((p) => p.nome === nome) || null;
}

// Abreviação de um papel para chip e coluna. Papel que o registro não conhece
// (dado antigo ou importado) usa o apelido sugerido, sem gravar nada.
export function apelidoDoPapel(nome, registro = registroPapeisPessoa()) {
    const achado = papelPessoaPorNome(nome, registro);
    return achado?.apelido || apelidoSugerido(nome);
}

export function papelEhSuperficie(nome, registro = registroPapeisPessoa()) {
    return papelPessoaPorNome(nome, registro)?.superficie === true;
}

// ─── Exclusão entre papéis ───────────────────────────────────

// Os dois papéis não convivem no mesmo vínculo?
export function papeisSeExcluem(a, b, registro = registroPapeisPessoa()) {
    if (a === b) return false;
    const pa = papelPessoaPorNome(a, registro);
    const pb = papelPessoaPorNome(b, registro);
    if (!pa || !pb) return false;
    if (pa.exclusivoComTodos || pb.exclusivoComTodos) return true;
    return !!pa.grupoExclusao && pa.grupoExclusao === pb.grupoExclusao;
}

// Dos papéis já marcados, os que `papel` expulsaria ao entrar.
export function conflitosDoPapel(papel, atuais, registro = registroPapeisPessoa()) {
    return (Array.isArray(atuais) ? atuais : []).filter((p) => papeisSeExcluem(papel, p, registro));
}

// Marca `papel`: sai o que conflita e o novo entra no fim (a ordem do array é a
// ordem de marcação, que a pessoa pode usar como relevância). Devolve
// { papeis, removidos }; não altera `atuais`.
export function marcarPapel(papel, atuais, registro = registroPapeisPessoa()) {
    const lista = Array.isArray(atuais) ? atuais : [];
    if (lista.includes(papel)) return { papeis: [...lista], removidos: [] };
    const removidos = conflitosDoPapel(papel, lista, registro);
    const papeis = lista.filter((p) => !removidos.includes(p));
    papeis.push(papel);
    return { papeis, removidos };
}

export function desmarcarPapel(papel, atuais) {
    return (Array.isArray(atuais) ? atuais : []).filter((p) => p !== papel);
}

// Pares de papéis de uma lista que se excluem (dado que viola uma regra).
export function violacoesDeExclusao(papeis, registro = registroPapeisPessoa()) {
    const lista = Array.isArray(papeis) ? papeis : [];
    const pares = [];
    for (let i = 0; i < lista.length; i++) {
        for (let j = i + 1; j < lista.length; j++) {
            if (papeisSeExcluem(lista[i], lista[j], registro)) pares.push([lista[i], lista[j]]);
        }
    }
    return pares;
}

// Resolve uma lista que pode violar regras (importação, edição em massa),
// mantendo o primeiro de cada conflito (a ordem é a relevância). Devolve
// { papeis, removidos }.
export function resolverConflitosMantendoOPrimeiro(papeis, registro = registroPapeisPessoa()) {
    const lista = Array.isArray(papeis) ? papeis : [];
    const mantidos = [];
    const removidos = [];
    lista.forEach((p) => {
        if (mantidos.some((m) => papeisSeExcluem(p, m, registro))) removidos.push(p);
        else mantidos.push(p);
    });
    return { papeis: mantidos, removidos };
}

// Apelido livre para o papel `nome`? (único no registro, ignorando caixa e acento)
export function apelidoDisponivel(apelido, nome, registro = registroPapeisPessoa()) {
    const chave = chavePapel(apelido);
    if (!chave) return false;
    return !registro.some((p) => p.nome !== nome && chavePapel(p.apelido) === chave);
}

// ─── Nota por vínculo (entrega 1b) ─────────────────────────────
// O vínculo de uma Pessoa com um texto é `{ pessoaId, papeis, nota }`. A nota é
// uma explicação humana sobre os papéis escolhidos (por exemplo, por que
// nenhum papel coube). Não é papel e não entra na ordem de relevância. Sem
// nota, o campo não existe no vínculo.

/** Texto da nota sem espaços nas pontas; qualquer coisa que não seja texto vira ''. */
export function normalizarNota(nota) {
    return typeof nota === 'string' ? nota.trim() : '';
}

/** Soma duas notas (ao mesclar Pessoas). Iguais não duplicam; vazias somem. */
export function somarNotas(a, b) {
    const x = normalizarNota(a);
    const y = normalizarNota(b);
    if (!x) return y;
    if (!y || x === y) return x;
    return `${x}\n${y}`;
}

/** Devolve o vínculo com `nota` só quando há texto (sem a chave quando vazia). */
export function vinculoComNota(vinculo, nota) {
    const resto = { ...(vinculo || {}) };
    delete resto.nota;
    const texto = normalizarNota(nota);
    return texto ? { ...resto, nota: texto } : resto;
}
