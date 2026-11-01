// ============================================================
// fontes-sugestoes-busca-texto.js: adaptador da caixinha de sugestões da
// busca de Poemas e Prosas (T5, entrega 2 de 3). A lógica de sugerir mora em
// sugestoes-busca-texto.js e recebe uma tabela de fontes indexada pelo
// prefixo canônico; este arquivo monta essa tabela a partir do acervo.
//
// Lógica pura (recebe o `db` por parâmetro, não toca no DOM), para testar
// sem navegador. Cada fonte é uma FUNÇÃO, para só ser calculada quando o
// prefixo é digitado, e não a cada tecla.
//
// Regras:
//  - Só entra o que a busca consegue achar: pessoa, grupo e período
//    biográfico ocultos ficam de fora, como na busca.
//  - Tema por papel e papel de Pessoa saem do que está em uso nos textos da
//    aba (o `temaprincipal:` só sugere temas que são principal em algum
//    texto), para a sugestão nunca levar a uma lista vazia.
//  - Prefixo sem fonte aqui (texto livre como `titulo:` ou `nota:`, e os
//    de papel de Personagem) não oferece valor, só o `*` quando existe.
// ============================================================

import { ETIQUETAS_CATEGORIAS, ROTULOS_ETIQUETAS } from './etiquetas.js';
import { extrairOrigensUnicas } from './intertextualidade.js';
import { programaEfetivoDaCorrente } from './correntes-hierarquia.js';
import { itensEmUsoParaBusca } from './leitura-avaliativa-busca.js';
import { nomesPapeisPessoa, papeisUsadosNosTextos } from './papeis-pessoa.js';
import {
    extrairDialetosUnicos,
    extrairGenerosUnicos,
    idiomasDoItem,
    temasComPapel,
} from './utils.js';

// Prefixo canônico → categoria de etiqueta (chave de ETIQUETAS_CATEGORIAS).
const PREFIXO_DA_CATEGORIA = {
    tradicao: 'tradicao',
    estilo: 'estilo',
    relacao: 'relacao',
    sensibilidade: 'sensibilidade',
    tom: 'tom',
    imagetico: 'dominioImagetico',
    outros: 'outros',
};

const naoOculto = (x) => x && !x.oculto;
const comNome = (x) => String(x?.nome ?? '').trim();

function nomes(lista, filtro = () => true) {
    return (Array.isArray(lista) ? lista : []).filter(filtro).map(comNome).filter(Boolean);
}

function titulos(lista) {
    return (Array.isArray(lista) ? lista : [])
        .map((x) => String(x?.titulo ?? '').trim())
        .filter(Boolean);
}

// Textos da aba: 'poemas' ou 'prosas'.
function textosDaAba(dbRef, tabela) {
    return Array.isArray(dbRef?.[tabela]) ? dbRef[tabela] : [];
}

function temasPorPapel(dbRef, tabela, papel) {
    const vistos = new Set();
    textosDaAba(dbRef, tabela).forEach((item) => {
        temasComPapel(item, dbRef.temas).forEach((t) => {
            if (papel === 'qualquer' || t.papel === papel) vistos.add(t.nome);
        });
    });
    return [...vistos];
}

// Programa efetivo (com a herança do pai) é o pedido? `programa` vem como
// texto do cadastro ('Movimento', 'Escola', ...); a função da hierarquia
// devolve `{ valor, herdadoDe }`.
function correntesDoPrograma(dbRef, programa) {
    const lista = dbRef.movimentosEscolas || [];
    return lista
        .filter((m) => programaEfetivoDaCorrente(lista, m).valor === programa)
        .map(comNome)
        .filter(Boolean);
}

// Idioma e dialeto em uso nos textos da aba (o campo é texto livre, então só
// o que já foi usado é oferecido).
function idiomasEmUso(dbRef, tabela, papel) {
    const vistos = new Set();
    textosDaAba(dbRef, tabela).forEach((item) => {
        idiomasDoItem(item).forEach((i) => {
            if (i.idioma && (!papel || i.papel === papel)) vistos.add(i.idioma);
        });
    });
    return [...vistos];
}

function dialetosEmUso(dbRef, tabela) {
    const itens = textosDaAba(dbRef, tabela);
    const vistos = new Set();
    idiomasEmUso(dbRef, tabela).forEach((idioma) => {
        extrairDialetosUnicos(itens, idioma).forEach((d) => vistos.add(d));
    });
    return [...vistos];
}

// Vínculos pessoa e papel que existem nos textos da aba, para o `pessoa:Nome@`
// oferecer só pares que a busca acha (T6). Pessoa oculta fica de fora, como na
// fonte `pessoa`. Os papéis de cada pessoa seguem a ordem do registro.
function vinculosPessoaPapel(dbRef, tabela) {
    const ordem = new Map(nomesPapeisPessoa().map((n, i) => [n, i]));
    const porPessoa = new Map();
    textosDaAba(dbRef, tabela).forEach((item) => {
        (Array.isArray(item?.pessoas) ? item.pessoas : []).forEach((v) => {
            const pessoa = (dbRef.pessoas || []).find((x) => x.id == v.pessoaId);
            const nome = pessoa && !pessoa.oculto ? comNome(pessoa) : '';
            if (!nome) return;
            if (!porPessoa.has(nome)) porPessoa.set(nome, new Set());
            (Array.isArray(v.papeis) ? v.papeis : []).forEach((p) => {
                if (typeof p === 'string' && p.trim()) porPessoa.get(nome).add(p.trim());
            });
        });
    });
    const posicao = (p) => ordem.get(p) ?? Number.MAX_SAFE_INTEGER;
    return [...porPessoa].map(([nome, papeis]) => ({
        nome,
        papeis: [...papeis].sort((a, b) => posicao(a) - posicao(b) || a.localeCompare(b, 'pt-BR')),
    }));
}

// Monta a tabela de fontes. `tabela` é 'poemas' ou 'prosas'.
export function montarFontesBuscaTexto(dbRef, tabela) {
    const fontes = {};

    // Etiquetas: uma fonte por categoria e a geral (com a categoria como detalhe).
    Object.entries(PREFIXO_DA_CATEGORIA).forEach(([prefixo, categoria]) => {
        if (!Object.hasOwn(ETIQUETAS_CATEGORIAS, categoria)) return;
        fontes[prefixo] = () =>
            (dbRef.etiquetas || []).filter((e) => e.categoria === categoria).map(comNome);
    });
    fontes.etiqueta = () =>
        (dbRef.etiquetas || [])
            .filter((e) => comNome(e))
            .map((e) => ({ valor: comNome(e), detalhe: ROTULOS_ETIQUETAS[e.categoria] || '' }));

    // Temas e Assuntos.
    fontes.tema = () => temasPorPapel(dbRef, tabela, 'qualquer');
    fontes.temaprincipal = () => temasPorPapel(dbRef, tabela, 'principal');
    fontes.temasecundario = () => temasPorPapel(dbRef, tabela, 'secundario');
    fontes.temasempapel = () => temasPorPapel(dbRef, tabela, '');
    fontes.assunto = () => nomes(dbRef.assuntos);

    // Pessoas, papéis e grupos (ocultos ficam de fora).
    fontes.pessoa = () => nomes(dbRef.pessoas, naoOculto);
    fontes.papel = () => papeisUsadosNosTextos(dbRef);
    // Não é prefixo: é a tabela de pares que a sugestão de `pessoa:Nome@Papel` lê.
    fontes.vinculospessoa = () => vinculosPessoaPapel(dbRef, tabela);
    fontes.grupo = () => nomes(dbRef.grupos, naoOculto);
    fontes.personagem = () => nomes(dbRef.personagens);
    fontes.autor = () => nomes(dbRef.autores);
    // Lugares ou culturas já usados nas obras dos textos da aba (texto livre).
    fontes.origem = () => extrairOrigensUnicas(textosDaAba(dbRef, tabela));

    // Onde está no livro.
    fontes.livro = () => titulos(dbRef.livros);
    fontes.parte = () => titulos(dbRef.partes);
    fontes.secao = () => titulos(dbRef.secoes);

    // Lugares.
    const locais = () => nomes(dbRef.locais);
    fontes.territorialidade = locais;
    fontes.territorialidadedireta = locais;
    fontes.localescrita = locais;
    fontes.localescritadireta = locais;

    // Períodos.
    fontes.epoca = () => nomes(dbRef.epocas, naoOculto);
    fontes.periodohistorico = () => nomes(dbRef.periodosHistoricos);
    fontes.periodohistoricodireto = fontes.periodohistorico;

    // Correntes literárias: `corrente:` não olha o Programa; `movimento:` e
    // `escola:` só oferecem o que o Programa efetivo permite (T4).
    const correntes = () => nomes(dbRef.movimentosEscolas);
    fontes.corrente = correntes;
    fontes.correntedireta = correntes;
    fontes.movimento = () => correntesDoPrograma(dbRef, 'Movimento');
    fontes.movimentodireto = fontes.movimento;
    fontes.escola = () => correntesDoPrograma(dbRef, 'Escola');
    fontes.escoladireta = fontes.escola;

    // Leitura avaliativa: só os itens que a leitura mais recente de algum texto da aba marcou.
    fontes.pegou = () => itensEmUsoParaBusca(dbRef, tabela, 'pegou');
    fontes.incomodou = () => itensEmUsoParaBusca(dbRef, tabela, 'incomodou');
    fontes.releria = () => itensEmUsoParaBusca(dbRef, tabela, 'releria');
    fontes.mostraria = () => itensEmUsoParaBusca(dbRef, tabela, 'mostraria');

    // Gênero só existe em Prosa (em Poemas o prefixo fica oculto).
    fontes.genero = () =>
        tabela === 'prosas' ? [...extrairGenerosUnicos(textosDaAba(dbRef, tabela))] : [];

    // Idiomas.
    fontes.idioma = () => idiomasEmUso(dbRef, tabela);
    fontes.idiomaprincipal = () => idiomasEmUso(dbRef, tabela, 'principal');
    fontes.idiomasecundario = () => idiomasEmUso(dbRef, tabela, 'secundario');
    fontes.dialeto = () => dialetosEmUso(dbRef, tabela);

    return fontes;
}

// Prefixos que a aba não tem: `genero` só existe em Prosa.
export function prefixosOcultosBuscaTexto(tabela) {
    return tabela === 'poemas' ? ['genero'] : [];
}
