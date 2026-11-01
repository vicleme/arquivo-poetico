// ============================================================
// sugestoes-busca-livros.js: sugestões enquanto se digita na busca da
// aba Livros (Fase 19, etapa 3, filtros reformulados, extra opcional).
// Lógica pura, sem DOM: recebe o texto da caixa e os dados e devolve o
// que oferecer para o ÚLTIMO termo (o que está sendo digitado).
//
//   "au"             → autor:
//   "autor:ma"       → nomes de Autor que constam em algum livro
//   "autor:maria"    → (se só uma pessoa casa) também Maria@Tradutor etc.
//   "autor:"Maria Silva@tr" → papéis dessa pessoa que começam com "tr"
//   "papel:tra"      → papéis de autoria em uso
//   "-equipe:an"     → o "-" é mantido
//
// Só oferece nomes e papéis que existem em algum livro, para a sugestão
// nunca levar a uma lista vazia por engano. A ligação com a caixa mora em
// ui-sugestoes-busca-livros.js.
// ============================================================

import { escaparAspasBusca, normalizarBusca } from './utils.js';
import {
    CAMPOS_ATRIBUTO_LIVRO,
    PREFIXOS_CANONICOS_LIVRO,
    separarNomeEPapel,
} from './busca-livros.js';
import { PAPEIS_AUTORIA_LIVRO, autoriaDoLivro, chavePapel } from './autoria-livro.js';
import { equipeDoLivro, papeisEquipeNosLivros } from './colaboradores-livro.js';

export const LIMITE_SUGESTOES_BUSCA_LIVROS = 8;

const DESCRICAO_PREFIXO = {
    autor: 'quem assina o livro',
    papel: 'papel na autoria',
    equipe: 'pessoa da equipe e créditos',
    papelequipe: 'papel na equipe',
};

// Posição onde começa o último termo: depois do último espaço que não está
// dentro de aspas (uma aspa precedida de barra é literal).
export function inicioDoUltimoTermo(query) {
    let inicio = 0;
    let dentro = false;
    for (let i = 0; i < query.length; i++) {
        const c = query[i];
        if (c === '"' && query[i - 1] !== '\\') dentro = !dentro;
        else if (/\s/.test(c) && !dentro) inicio = i + 1;
    }
    return inicio;
}

export function comAspasSePrecisar(valor) {
    return /[\s"]/.test(valor) ? `"${escaparAspasBusca(valor)}"` : valor;
}

function nomesEPapeisDeAutoria(livros, autores) {
    const porId = new Map((autores || []).map((a) => [String(a.id), a]));
    const pessoas = new Map();
    (livros || []).forEach((l) =>
        autoriaDoLivro(l).forEach((v) => {
            const cadastro = porId.get(String(v.autorId));
            if (!cadastro) return;
            const p = pessoas.get(String(cadastro.id)) || {
                nome: cadastro.nome,
                papeis: new Map(),
            };
            v.papeis.forEach((papel) => {
                if (!p.papeis.has(chavePapel(papel))) p.papeis.set(chavePapel(papel), papel);
            });
            pessoas.set(String(cadastro.id), p);
        }),
    );
    return Array.from(pessoas.values());
}

function nomesEPapeisDeEquipe(livros, colaboradores) {
    const porId = new Map((colaboradores || []).map((c) => [String(c.id), c]));
    const pessoas = new Map();
    (livros || []).forEach((l) =>
        equipeDoLivro(l).forEach((v) => {
            const cadastro = porId.get(String(v.colaboradorId));
            if (!cadastro) return;
            const p = pessoas.get(String(cadastro.id)) || {
                nome: cadastro.nome,
                papeis: new Map(),
            };
            v.papeis.forEach(({ papel }) => {
                if (!p.papeis.has(chavePapel(papel))) p.papeis.set(chavePapel(papel), papel);
            });
            pessoas.set(String(cadastro.id), p);
        }),
    );
    return Array.from(pessoas.values());
}

const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR');

function papeisDeAutoriaEmUso(pessoas) {
    const vistos = new Map();
    pessoas.forEach((p) => p.papeis.forEach((papel, chave) => vistos.set(chave, papel)));
    const daLista = PAPEIS_AUTORIA_LIVRO.filter((p) => vistos.has(chavePapel(p)));
    const listaChaves = new Set(PAPEIS_AUTORIA_LIVRO.map(chavePapel));
    const livres = Array.from(vistos.entries())
        .filter(([chave]) => !listaChaves.has(chave))
        .map(([, papel]) => papel)
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return [...daLista, ...livres];
}

function contem(texto, parcial) {
    return normalizarBusca(texto).includes(normalizarBusca(parcial));
}

// Devolve `null` (nada a oferecer) ou
// `{ inicio, itens: [{ rotulo, detalhe, texto, completo }] }`: `texto` substitui
// o último termo (de `inicio` até o fim da caixa); `completo` diz se o termo
// ficou pronto (a tela põe um espaço depois) ou ainda espera mais digitação.
export function sugerirBuscaLivros(
    query,
    livros = [],
    autoresCadastro = [],
    colaboradoresCadastro = [],
    limite = LIMITE_SUGESTOES_BUSCA_LIVROS,
) {
    const texto = String(query ?? '');
    const inicio = inicioDoUltimoTermo(texto);
    const termo = texto.slice(inicio);
    if (!termo) return null;

    const m = termo.match(/^(-?)([a-zA-Zà-úÀ-Ú]+):([\s\S]*)$/);
    const campo = m ? CAMPOS_ATRIBUTO_LIVRO[normalizarBusca(m[2])] : undefined;

    // Ainda sem prefixo completo: oferece os prefixos que começam como o digitado.
    if (!campo) {
        if (m || termo.includes('"') || termo.includes(':')) return null;
        const sinal = termo.startsWith('-') ? '-' : '';
        const digitado = normalizarBusca(termo.slice(sinal.length));
        if (!digitado) return null;
        const itens = PREFIXOS_CANONICOS_LIVRO.filter((p) => p.startsWith(digitado)).map((p) => ({
            rotulo: `${p}:`,
            detalhe: DESCRICAO_PREFIXO[p],
            texto: `${sinal}${p}:`,
            completo: false,
        }));
        return itens.length ? { inicio, itens: itens.slice(0, limite) } : null;
    }

    const sinal = m[1];
    const prefixo = `${sinal}${m[2]}:`;
    let valor = m[3];
    // `"Maria Silva"@Trad` vale como `Maria Silva@Trad`.
    const comAspasNoNome = valor.match(/^"([\s\S]*)"@([\s\S]*)$/);
    if (comAspasNoNome) valor = `${comAspasNoNome[1]}@${comAspasNoNome[2].replace(/^"|"$/g, '')}`;
    else {
        if (valor.startsWith('"')) valor = valor.slice(1);
        if (valor.endsWith('"') && !valor.endsWith('\\"')) valor = valor.slice(0, -1);
    }

    // "campo:*" já é um termo completo.
    if (valor === '*') return null;

    const ehPessoa = campo === 'autor' || campo === 'equipe';
    const pessoas = (
        campo === 'autor' || campo === 'papelAutoria'
            ? nomesEPapeisDeAutoria(livros, autoresCadastro)
            : nomesEPapeisDeEquipe(livros, colaboradoresCadastro)
    ).sort(porNome);

    const itens = [];
    const montar = (conteudo, rotulo, detalhe = '') =>
        itens.push({
            rotulo,
            detalhe,
            texto: `${prefixo}${comAspasSePrecisar(conteudo)}`,
            completo: true,
        });

    if (ehPessoa) {
        const { nome, papel } = separarNomeEPapel(valor);
        if (valor.includes('@')) {
            // nome@papel em andamento: papéis das pessoas que casam com o nome.
            pessoas
                .filter((p) => !nome || contem(p.nome, nome))
                .forEach((p) =>
                    Array.from(p.papeis.values())
                        .filter((pp) => !papel || contem(pp, papel))
                        .forEach((pp) =>
                            montar(`${p.nome}@${pp}`, `${p.nome} @ ${pp}`, 'nesse livro'),
                        ),
                );
        } else {
            if (!valor) {
                itens.push({
                    rotulo: '*',
                    detalhe: campo === 'autor' ? 'tem autoria' : 'tem equipe',
                    texto: `${prefixo}*`,
                    completo: true,
                });
            }
            const casam = pessoas.filter((p) => !valor || contem(p.nome, valor));
            casam.forEach((p) => montar(p.nome, p.nome));
            // Uma pessoa só: mostra já as combinações com o papel dela.
            if (valor && casam.length === 1) {
                Array.from(casam[0].papeis.values()).forEach((pp) =>
                    montar(`${casam[0].nome}@${pp}`, `${casam[0].nome} @ ${pp}`, 'nesse livro'),
                );
            }
        }
    } else {
        const papeis =
            campo === 'papelAutoria'
                ? papeisDeAutoriaEmUso(pessoas)
                : papeisEquipeNosLivros(livros);
        if (!valor) {
            itens.push({
                rotulo: '*',
                detalhe: 'tem algum papel',
                texto: `${prefixo}*`,
                completo: true,
            });
        }
        papeis.filter((p) => !valor || contem(p, valor)).forEach((p) => montar(p, p));
    }

    // Já está exatamente digitado (ex.: "autor:*" ou o nome inteiro, sem mais nada a
    // completar): não repete a mesma coisa como sugestão.
    const unicos = itens.filter(
        (it, i) => itens.findIndex((o) => o.texto === it.texto) === i && it.texto !== termo,
    );
    return unicos.length ? { inicio, itens: unicos.slice(0, limite) } : null;
}

// Aplica a sugestão à caixa: devolve o texto novo. Termo completo ganha um espaço
// depois, para a pessoa seguir digitando.
export function aplicarSugestaoBuscaLivros(query, inicio, item) {
    return `${String(query ?? '').slice(0, inicio)}${item.texto}${item.completo ? ' ' : ''}`;
}
