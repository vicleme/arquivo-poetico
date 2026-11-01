// ============================================================
// caracterizacao-pessoa-publica.js: lógica pura (sem DOM) dos três campos
// de caracterização das entradas de Referências (Externas) cujo Tipo é
// "Pessoa pública": gênero, orientação e cor/raça.
//
// Serve para o autor saber de que tipo de pessoa tira suas referências
// (mulheres, homens, pessoas não binárias; pessoas LGBT; brancas, pretas,
// pardas, amarelas, indígenas). Como "Conhecido(a) como", mora em cada
// entrada de `referenciasExternas`, e não num cadastro de pessoas públicas.
//
// Os três são opcionais e VAZIO QUER DIZER "NÃO INFORMADO", nunca "não é":
//
// - `genero`: 'Mulher' | 'Homem' | 'Não-binário' (mesmos valores de
//   GENEROS_SUGERIDOS, para combinar com o gênero de Pessoas). O botão do
//   Não-binário é guarda-chuva: não registra identidade mais específica
//   (Agênero, Genderfluid...).
// - `orientacao`: 'LGBT' | 'Hétero'. Três estados: LGBT (sabe-se que é),
//   Hétero (sabe-se que é) e ausente (não se sabe). Ausente nunca é lido
//   como Hétero.
// - `corRaca`: um item de CORES_RACA_AUTOR (lista do IBGE já usada em
//   Autores e Pessoas).
//
// Sem migração: entrada antiga simplesmente abre sem os campos. Cada chave
// só existe quando há valor, e só quando o Tipo é Pessoa pública (trocar
// o Tipo apaga os três). Pedido do Victor, 22/10/2026.
// ============================================================

import { CORES_RACA_AUTOR } from './utils.js';
import { ehPessoaPublica, chaveDeComparacao, conhecidoComoDaEntrada } from './conhecido-como.js';

// Rótulos dos botões. O símbolo é só o desenho do botão: o que se grava é
// o `valor`. ♀ ♂ ⚤ levam U+FE0E (apresentação de texto) para saírem do mesmo
// jeito em qualquer sistema, em vez de alguns virarem emoji colorido.
// Para trocar o símbolo de um botão, é só mudar aqui.
const TEXTO = '︎';

// Não existe símbolo Unicode específico para não binário. ⚧ é o símbolo
// trans, e trans também pode ser binário, então não serve: aqui só se
// registra a identidade (mulher, homem, não binário), não cis/trans. O botão
// usa 🜬 (alquímico, de suporte de fonte irregular) com "NB" escrito ao lado,
// para continuar legível se a fonte não o desenhar.
export const GENEROS_PESSOA_PUBLICA = [
    { valor: 'Mulher', simbolo: `♀${TEXTO}` },
    { valor: 'Homem', simbolo: `♂${TEXTO}` },
    { valor: 'Não-binário', simbolo: '🜬 NB' },
];

export const ORIENTACOES_PESSOA_PUBLICA = [
    { valor: 'LGBT', simbolo: '🏳️‍🌈', titulo: 'Pessoa LGBT' },
    { valor: 'Hétero', simbolo: `⚤${TEXTO}`, titulo: 'Pessoa hétero' },
];

export const CORES_RACA_PESSOA_PUBLICA = CORES_RACA_AUTOR;

// Devolve o item canônico da lista que casa com `valor` ignorando caixa,
// acento e espaços nas pontas, ou '' quando não casa.
function canonico(lista, valor) {
    if (typeof valor !== 'string') return '';
    const k = chaveDeComparacao(valor);
    if (!k) return '';
    return lista.find((item) => chaveDeComparacao(item) === k) || '';
}

export function normalizarGeneroPessoaPublica(valor) {
    return canonico(
        GENEROS_PESSOA_PUBLICA.map((g) => g.valor),
        valor,
    );
}

export function normalizarOrientacaoPessoaPublica(valor) {
    return canonico(
        ORIENTACOES_PESSOA_PUBLICA.map((o) => o.valor),
        valor,
    );
}

export function normalizarCorRacaPessoaPublica(valor) {
    return canonico(CORES_RACA_PESSOA_PUBLICA, valor);
}

// Lê a caracterização de uma entrada, qualquer que seja o formato em que
// chegou. Sempre devolve as três chaves; '' é "não informado".
export function caracterizacaoDaEntrada(entrada) {
    const e = entrada && typeof entrada === 'object' ? entrada : {};
    return {
        genero: normalizarGeneroPessoaPublica(e.genero),
        orientacao: normalizarOrientacaoPessoaPublica(e.orientacao),
        corRaca: normalizarCorRacaPessoaPublica(e.corRaca),
    };
}

// Campos a espalhar na entrada ao salvar: só as chaves com valor válido, e
// nada quando o Tipo não é Pessoa pública (mesmo padrão de
// `camposConhecidoComo`).
export function camposCaracterizacao(tipo, caracterizacao) {
    if (!ehPessoaPublica(tipo)) return {};
    const c = caracterizacaoDaEntrada(caracterizacao);
    const campos = {};
    if (c.genero) campos.genero = c.genero;
    if (c.orientacao) campos.orientacao = c.orientacao;
    if (c.corRaca) campos.corRaca = c.corRaca;
    return campos;
}

// Aplica um clique num botão de escolha única: clicar no valor já marcado
// desmarca (volta a "não informado"), clicar em outro troca.
export function alternarEscolha(atual, valor) {
    return atual === valor ? '' : valor;
}

// Sugestão ao citar de novo uma pessoa já registrada: procura nas entradas
// de Pessoa pública de `textos` (poemas ou prosas, com `referenciasExternas`)
// as que têm o mesmo nome (ignora caixa, acento e espaços) e devolve, campo a
// campo, o valor da citação mais recente que o tem. "Mais recente" é a
// posição na lista: o último texto, e dentro dele a última entrada. Campo que
// ninguém preencheu volta '' (não informado). Cabe ao chamador aplicar só nos
// campos que ainda estão vazios.
export function caracterizacaoDaUltimaCitacao(textos, nome) {
    const vazio = { genero: '', orientacao: '', corRaca: '' };
    const k = typeof nome === 'string' ? chaveDeComparacao(nome) : '';
    if (!k || !Array.isArray(textos)) return vazio;
    const achado = { ...vazio };
    for (let i = textos.length - 1; i >= 0; i--) {
        const refs = textos[i] && textos[i].referenciasExternas;
        if (!Array.isArray(refs)) continue;
        for (let j = refs.length - 1; j >= 0; j--) {
            const entrada = refs[j];
            if (!entrada || !ehPessoaPublica(entrada.tipo)) continue;
            if (chaveDeComparacao(entrada.texto || '') !== k) continue;
            const c = caracterizacaoDaEntrada(entrada);
            Object.keys(achado).forEach((campo) => {
                if (!achado[campo] && c[campo]) achado[campo] = c[campo];
            });
        }
    }
    return achado;
}

// Mescla uma sugestão numa caracterização em edição, só nos campos vazios.
export function completarCaracterizacao(atual, sugestao) {
    const a = caracterizacaoDaEntrada(atual);
    const s = caracterizacaoDaEntrada(sugestao);
    return {
        genero: a.genero || s.genero,
        orientacao: a.orientacao || s.orientacao,
        corRaca: a.corRaca || s.corRaca,
    };
}

// Selinhos da lista da entrada, como texto simples (a tela escapa e
// estiliza): símbolo do gênero, símbolo da orientação e a cor/raça.
export function rotulosCaracterizacao(entrada) {
    const c = caracterizacaoDaEntrada(entrada);
    const rotulos = [];
    const g = GENEROS_PESSOA_PUBLICA.find((x) => x.valor === c.genero);
    if (g) rotulos.push({ texto: g.simbolo, titulo: g.valor });
    const o = ORIENTACOES_PESSOA_PUBLICA.find((x) => x.valor === c.orientacao);
    if (o) rotulos.push({ texto: o.simbolo, titulo: o.titulo });
    if (c.corRaca) rotulos.push({ texto: c.corRaca, titulo: 'Cor/raça' });
    return rotulos;
}

// Selinhos de uma entrada de Pessoa pública para as telas: as tags de
// Conhecido(a) como e depois gênero, orientação e cor/raça. Entrada de outro
// Tipo não gera nada.
export function selinhosPessoaPublica(entrada) {
    if (!entrada || !ehPessoaPublica(entrada.tipo)) return [];
    const tags = conhecidoComoDaEntrada(entrada).map((t) => ({
        texto: t,
        titulo: 'Conhecido(a) como',
    }));
    return [...tags, ...rotulosCaracterizacao(entrada)];
}

// Descrição em texto corrido para .md, .csv, Ver e busca, por exemplo
// "conhecido(a) como Cantor(a), Escritor(a); Mulher; LGBT; Parda". Só entra o
// que foi informado (não informado nunca vira palavra), e '' quando não há
// nada. Os valores gravados são os mesmos dos botões e do select.
export function descricaoPessoaPublica(entrada) {
    if (!entrada || !ehPessoaPublica(entrada.tipo)) return '';
    const tags = conhecidoComoDaEntrada(entrada);
    const c = caracterizacaoDaEntrada(entrada);
    return [
        tags.length ? `conhecido(a) como ${tags.join(', ')}` : '',
        c.genero,
        c.orientacao,
        c.corRaca,
    ]
        .filter(Boolean)
        .join('; ');
}
