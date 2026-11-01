// ============================================================
// sugestoes-busca-texto.js: sugestões enquanto se digita na busca de
// Poemas e Prosas (fase própria, entrega 1 de 3: lógica pura e testes,
// sem tela). Mesmo desenho de sugestoes-busca-livros.js: recebe o texto
// da caixa e devolve o que oferecer para o ÚLTIMO termo.
//
//   "tem"                → tema:, temaprincipal:, ... (prefixos que começam assim)
//   "-pes"               → -pessoa: (o "-" é mantido)
//   "esc"                → escola:, escoladireta:
//   "tema:am"            → valores de tema que existem no acervo
//   "tema:"              → * (tem algum) e os valores
//   "-etiqueta:\"Ver"    → valores com aspas quando têm espaço
//   "pessoa:Maria@"     → papéis que Maria tem em algum texto (`pessoa:Maria@Voz`)
//   "pessoa:@ded"       → papéis em uso, para qualquer pessoa (`pessoa:@Dedicatário(a)`)
//
// Os prefixos vêm da própria tabela da busca (`CAMPOS_ATRIBUTO` e
// `PREFIXOS_CANONICOS_POR_CAMPO`, em utils.js), então prefixo novo
// entra sozinho; só a descrição é daqui (e um teste falha se faltar).
//
// Os VALORES vêm de uma tabela de fontes, indexada pelo prefixo
// canônico, montada por quem chama (a entrega 2 faz o adaptador a partir
// do acervo): `{ tema: ['Amor', 'Luto'], pessoa: () => [...] }`. Cada fonte
// é uma lista (ou função que devolve a lista) de textos ou de
// `{ valor, detalhe }`. Só se oferece o que existe na fonte, para a
// sugestão nunca levar a uma lista vazia por engano; prefixo sem fonte
// (texto livre, como `titulo:` ou `nota:`) não oferece valor nenhum.
// ============================================================

import { CAMPOS_ATRIBUTO, PREFIXOS_CANONICOS_POR_CAMPO, normalizarBusca } from './utils.js';
import {
    aplicarSugestaoBuscaLivros,
    comAspasSePrecisar,
    inicioDoUltimoTermo,
} from './sugestoes-busca-livros.js';
import { papelComVariantes, separarNomeEPapel } from './vinculo-busca.js';

export const LIMITE_SUGESTOES_BUSCA_TEXTO = 12;

// Descrição curta de cada prefixo canônico, mostrada ao lado na caixinha.
export const DESCRICAO_PREFIXO_TEXTO = {
    titulo: 'título do texto',
    texto: 'trecho do corpo do texto',
    etiqueta: 'qualquer etiqueta',
    tradicao: 'etiqueta de Tradição',
    estilo: 'etiqueta de Estilo',
    tema: 'tema, em qualquer papel',
    temaprincipal: 'tema com papel principal',
    temasecundario: 'tema com papel secundário',
    temasempapel: 'tema sem papel definido',
    territorialidade: 'local retratado, com o que está dentro dele',
    territorialidadedireta: 'local retratado, só o exato',
    localescrita: 'onde foi escrito, com o que está dentro',
    localescritadireta: 'onde foi escrito, só o exato',
    relacao: 'etiqueta de Relação',
    tom: 'etiqueta de Tom',
    sensibilidade: 'etiqueta de Sensibilidade',
    imagetico: 'domínio imagético',
    outros: 'etiquetas sem categoria própria',
    pessoa: 'pessoa do texto',
    papel: 'papel de uma pessoa no texto',
    grupo: 'grupo de quem aparece no texto',
    origem: 'lugar ou cultura de origem das obras (Intertextualidade e Hipertextualidade)',
    origempublica: 'origem das obras sem a marca de obra pessoal',
    origempessoal: 'origem das obras marcadas como obra pessoal',
    personagem: 'personagem, em qualquer papel',
    personagemvoz: 'personagem com papel de Voz',
    personageminterlocutor: 'personagem com papel de Interlocutor',
    personagemaparicao: 'personagem com papel de Aparição',
    personagemmencao: 'personagem com papel de Menção',
    personagemalusao: 'personagem com papel de Alusão',
    personagemprotagonista: 'personagem protagonista',
    personagemsecundario: 'personagem secundário',
    personagemsemcentralidade: 'personagem sem centralidade marcada',
    genero: 'gênero da prosa',
    idioma: 'idioma, em qualquer papel',
    idiomaprincipal: 'idioma principal',
    idiomasecundario: 'idioma secundário',
    dialeto: 'dialeto',
    jargao: 'jargão e gíria',
    dataescrita: 'data de escrita',
    datapublicacao: 'data de primeira publicação',
    dataobra:
        'ano das obras de Intertextualidade e Hipertextualidade (1922, 1920..1929, "séc. XX")',
    obrapessoal: 'texto com obra pessoal (Intertextualidade ou Hipertextualidade): *',
    sorteavel: 'texto marcado como sorteável para leitura: *',
    autoremsigilo: 'texto com o autor em sigilo: *',
    leitura: 'leitura autônoma (sequência, conjunto, início)',
    valencia: 'valência do texto (leve, neutro, pesado): *',
    pegou: 'o que pegou na leitura mais recente, com o peso (leve, forte, centro): *',
    incomodou: 'o que incomodou na leitura mais recente: *',
    releria: 'se releria, na leitura mais recente (sim, talvez, não): *',
    mostraria: 'se mostraria a alguém, na leitura mais recente (sim, talvez, não): *',
    notapublica: 'texto com as Notas marcadas como públicas: *',
    inspiracaopublica: 'texto com a Inspiração marcada como pública: *',
    comentarioleitor: 'comentários ao leitor',
    datareferencia: 'ano das Referências (Marco histórico, Notícia, Pessoa pública)',
    distanciaobra: 'anos entre a obra e o texto, nas Obras (500.., 10..49, ..-1)',
    distanciareferencia: 'anos entre a referência e o texto (500.., 10..49, ..-1)',
    dataobrapublica: 'ano das obras sem a marca de obra pessoal (1922, 1920..1929)',
    dataobrapessoal: 'ano das obras marcadas como obra pessoal (1922, 1920..1929)',
    distanciaobrapublica: 'anos entre a obra (sem a marca de obra pessoal) e o texto',
    distanciaobrapessoal: 'anos entre a obra pessoal e o texto',
    epoca: 'período biográfico retratado',
    eventobiografico: 'evento biográfico',
    eventohistorico: 'evento histórico',
    esfera: 'esfera do período biográfico',
    categoria: 'categoria do período biográfico',
    natureza: 'natureza das relações do período',
    vinculo: 'vínculo das relações do período',
    pessoaperiodo: 'pessoa ligada ao período',
    periodohistorico: 'período histórico, com o que está dentro',
    periodohistoricodireto: 'período histórico, só o exato',
    esferahistorica: 'esfera do período histórico',
    categoriahistorica: 'categoria do período histórico',
    corrente: 'corrente literária de qualquer Programa, com o que está dentro',
    correntedireta: 'corrente literária de qualquer Programa, só a ligada direto',
    movimento: 'corrente de Programa Movimento, com o que está dentro',
    movimentodireto: 'corrente de Programa Movimento, só a ligada direto',
    escola: 'corrente de Programa Escola, com o que está dentro',
    escoladireta: 'corrente de Programa Escola, só a ligada direto',
    postura: 'postura estética',
    programa: 'programa da corrente',
    assunto: 'assunto, em qualquer papel',
    assuntoprincipal: 'assunto com papel principal',
    assuntosecundario: 'assunto com papel secundário',
    assuntoindefinido: 'assunto sem papel definido',
    autor: 'autoria do texto',
    envio: 'envio a revista, concurso ou outro',
    nota: 'notas do texto',
    livro: 'livro em que está',
    parte: 'parte em que está',
    secao: 'seção em que está',
    coletanea: 'coletânea em que aparece',
    visual: 'descrição visual',
    contexto: 'contexto histórico',
    autoavaliacao: 'avaliação',
    autoclassificacao: 'corações, de 0,5 a 5 (4.., ..2, 3..4,5)',
    intertexto: 'intertextualidade',
    hipertexto: 'hipertextualidade',
    anexo: 'anexos',
    notaanexos: 'nota geral dos anexos',
    anotacao: 'anotações',
    ocultacao: 'ocultação',
    sensivel: 'conteúdo sensível (descrição)',
    hiperacionante: 'vocabulário hiperacionante',
    cortado: 'de onde foi cortado',
    lancado: 'onde foi lançado',
    descarte: 'motivo do descarte',
    pendencia: 'pendência',
    elo: 'elo com outro texto',
    eco: 'eco com outro texto',
    referencia: 'referências externas',
    reconhecimento: 'reconhecimentos',
    fonte: 'origem, edição e link da fonte',
    grafia: 'tradição ortográfica',
    id: 'ID do sistema',
};

// Prefixos sem fonte de valores que, ainda assim, valem com `*`
// (`dataescrita:*` tem data, `-dataescrita:*` não tem; `dataobra:*` e
// `distanciaobra:*` fazem o mesmo para a data da obra e a distância).
export const PREFIXOS_SO_ASTERISCO_TEXTO = [
    'dataescrita',
    'datapublicacao',
    'dataobra',
    'obrapessoal',
    'sorteavel',
    'autoremsigilo',
    'leitura',
    'notapublica',
    'inspiracaopublica',
    'autoclassificacao',
    'datareferencia',
    'distanciaobra',
    'distanciareferencia',
    'dataobrapublica',
    'dataobrapessoal',
    'distanciaobrapublica',
    'distanciaobrapessoal',
];

// Prefixos canônicos, na ordem da tabela da busca.
export const PREFIXOS_CANONICOS_TEXTO = Object.values(PREFIXOS_CANONICOS_POR_CAMPO);

// Apelidos: nomes aceitos pela busca que não são o canônico do campo
// (`hipertextualidade:` vale `hipertexto:`, por exemplo). Guarda o canônico de cada um.
export const APELIDOS_PREFIXO_TEXTO = Object.fromEntries(
    Object.entries(CAMPOS_ATRIBUTO)
        .map(([nome, campo]) => [nome, PREFIXOS_CANONICOS_POR_CAMPO[campo]])
        .filter(([nome, canonico]) => canonico && nome !== canonico),
);

// Prefixo digitado (com ou sem acento, qualquer caixa) → canônico.
export function prefixoCanonicoTexto(nome) {
    const campo = CAMPOS_ATRIBUTO[normalizarBusca(nome)];
    return campo ? PREFIXOS_CANONICOS_POR_CAMPO[campo] : undefined;
}

function itensDaFonte(fontes, canonico) {
    const bruta = fontes?.[canonico];
    const lista = typeof bruta === 'function' ? bruta() : bruta;
    if (!Array.isArray(lista)) return [];
    const vistos = new Set();
    const itens = [];
    lista.forEach((it) => {
        const valor = String(typeof it === 'object' && it ? (it.valor ?? '') : (it ?? '')).trim();
        const detalhe = typeof it === 'object' && it ? String(it.detalhe ?? '') : '';
        const chave = normalizarBusca(valor);
        if (!valor || vistos.has(chave)) return;
        vistos.add(chave);
        itens.push({ valor, detalhe, chave });
    });
    return itens;
}

// `pessoa:Nome@Papel` (T6): oferece os pares que existem nos textos da aba, lidos
// de `fontes.vinculospessoa` (lista de `{ nome, papeis }`). Três casos:
//  - `pessoa:Maria@` ou `pessoa:Maria@tr`: os papéis que Maria tem (filtrados pelo
//    que foi digitado depois do `@`);
//  - `pessoa:@ded`: nome vazio vale "qualquer pessoa", então só os papéis em uso;
//  - `pessoa:Maria` sem `@`, quando uma pessoa só casa: já mostra os pares dela.
// O papel digitado também casa pela forma feminina: `@dedicatária` acha
// `Dedicatário(a)`. A sugestão sempre usa o nome gravado do papel.
function sugestoesDeVinculo(fontes, prefixo, valor) {
    const bruta = fontes?.vinculospessoa;
    const vinculos = typeof bruta === 'function' ? bruta() : bruta;
    if (!Array.isArray(vinculos) || !vinculos.length) return [];

    const limpo = valor.replace(/"/g, '');
    const temArroba = limpo.includes('@');
    const { nome, papel } = separarNomeEPapel(limpo);
    const alvoNome = normalizarBusca(nome);
    const alvoPapel = normalizarBusca(papel);
    const casaPapel = (p) =>
        !alvoPapel || papelComVariantes(p).some((v) => normalizarBusca(v).includes(alvoPapel));
    const casaNome = (n) => !alvoNome || normalizarBusca(n).includes(alvoNome);

    const montar = (conteudo, rotulo, detalhe) => ({
        rotulo,
        detalhe,
        texto: `${prefixo}${comAspasSePrecisar(conteudo)}`,
        completo: true,
    });

    const pessoas = vinculos.filter((v) => v && casaNome(String(v.nome ?? '')));
    if (!pessoas.length) return [];

    if (temArroba && !alvoNome) {
        const vistos = new Set();
        const itens = [];
        pessoas.forEach((v) =>
            (v.papeis || []).filter(casaPapel).forEach((p) => {
                if (vistos.has(p)) return;
                vistos.add(p);
                itens.push(montar(`@${p}`, `@ ${p}`, 'qualquer pessoa'));
            }),
        );
        return itens;
    }

    // Sem `@`, só acrescenta os pares quando uma pessoa única casa com o nome.
    if (!temArroba && (!alvoNome || pessoas.length !== 1)) return [];

    return pessoas.flatMap((v) =>
        (v.papeis || [])
            .filter(casaPapel)
            .map((p) => montar(`${v.nome}@${p}`, `${v.nome} @ ${p}`, 'no mesmo vínculo')),
    );
}

// Devolve `null` (nada a oferecer) ou
// `{ inicio, total, itens: [{ rotulo, detalhe, texto, completo }] }`: `total` é
// quantas sugestões havia antes do corte pelo limite (a tela avisa quando é maior
// que `itens.length`); `texto` substitui
// o último termo (de `inicio` até o fim da caixa); `completo` diz se o termo
// ficou pronto (a tela põe um espaço depois) ou ainda espera mais digitação.
// `opcoes.prefixosOcultos`: prefixos canônicos que a aba não tem (ex.: `genero`
// em Poemas), que não são oferecidos.
export function sugerirBuscaTexto(query, fontes = {}, opcoes = {}) {
    const limite = opcoes.limite ?? LIMITE_SUGESTOES_BUSCA_TEXTO;
    const ocultos = new Set(opcoes.prefixosOcultos || []);
    const texto = String(query ?? '');
    const inicio = inicioDoUltimoTermo(texto);
    const termo = texto.slice(inicio);
    if (!termo) return null;

    const m = termo.match(/^(-?)([a-zA-Zà-úÀ-Ú]+):([\s\S]*)$/);
    const canonico = m ? prefixoCanonicoTexto(m[2]) : undefined;

    // Ainda sem prefixo completo: oferece os prefixos (e apelidos) que começam
    // como o digitado.
    if (!canonico) {
        if (m || termo.includes('"') || termo.includes(':')) return null;
        const sinal = termo.startsWith('-') ? '-' : '';
        const digitado = normalizarBusca(termo.slice(sinal.length));
        if (!digitado) return null;
        const doCanonico = PREFIXOS_CANONICOS_TEXTO.filter(
            (p) => !ocultos.has(p) && p.startsWith(digitado),
        ).map((p) => ({
            rotulo: `${p}:`,
            detalhe: DESCRICAO_PREFIXO_TEXTO[p] || '',
            texto: `${sinal}${p}:`,
            completo: false,
        }));
        // O apelido só entra quando o canônico do mesmo campo não combina com o digitado:
        // com "anexo" basta `anexo:`; com "anexos" aparece `anexos:`, dizendo de quem é.
        const dosApelidos = Object.entries(APELIDOS_PREFIXO_TEXTO)
            .filter(
                ([nome, c]) =>
                    !ocultos.has(c) && nome.startsWith(digitado) && !c.startsWith(digitado),
            )
            .map(([nome, c]) => ({
                rotulo: `${nome}:`,
                detalhe: `o mesmo que ${c}:`,
                texto: `${sinal}${nome}:`,
                completo: false,
            }));
        const itens = [...doCanonico, ...dosApelidos];
        return itens.length ? { inicio, itens: itens.slice(0, limite), total: itens.length } : null;
    }

    if (ocultos.has(canonico)) return null;

    const prefixo = `${m[1]}${m[2]}:`;
    let valor = m[3];
    if (valor.startsWith('"')) valor = valor.slice(1);
    if (valor.endsWith('"') && !valor.endsWith('\\"')) valor = valor.slice(0, -1);

    // "campo:*" já é um termo completo.
    if (valor === '*') return null;

    const fonte = itensDaFonte(fontes, canonico);
    const aceitaAsterisco = fonte.length > 0 || PREFIXOS_SO_ASTERISCO_TEXTO.includes(canonico);
    if (!aceitaAsterisco) return null;

    const itens = [];
    if (!valor) {
        itens.push({
            rotulo: '*',
            detalhe: `tem ${DESCRICAO_PREFIXO_TEXTO[canonico] || 'algum valor'}`,
            texto: `${prefixo}*`,
            completo: true,
        });
    }

    const digitado = normalizarBusca(valor);
    const casam = fonte
        .filter((f) => !digitado || f.chave.includes(digitado))
        .sort((a, b) => {
            const pa = digitado && a.chave.startsWith(digitado) ? 0 : 1;
            const pb = digitado && b.chave.startsWith(digitado) ? 0 : 1;
            return pa - pb || a.valor.localeCompare(b.valor, 'pt-BR');
        });
    casam.forEach((f) =>
        itens.push({
            rotulo: f.valor,
            detalhe: f.detalhe,
            texto: `${prefixo}${comAspasSePrecisar(f.valor)}`,
            completo: true,
        }),
    );

    if (canonico === 'pessoa') itens.push(...sugestoesDeVinculo(fontes, prefixo, valor));

    // Já está exatamente digitado: não repete a mesma coisa como sugestão.
    const unicos = itens.filter(
        (it, i) => itens.findIndex((o) => o.texto === it.texto) === i && it.texto !== termo,
    );
    return unicos.length ? { inicio, itens: unicos.slice(0, limite), total: unicos.length } : null;
}

// Aplica a sugestão à caixa: devolve o texto novo (termo completo ganha um
// espaço depois). É a mesma regra da busca de Livros.
export const aplicarSugestaoBuscaTexto = aplicarSugestaoBuscaLivros;
