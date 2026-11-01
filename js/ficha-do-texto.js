// ficha-do-texto.js: a ficha curta de um texto, para a tela do sorteio (31/10/2026).
//
// Lógica pura, sem DOM e sem o `db` global: recebe o acervo (`dbRef`) lido do
// navegador. Devolve as linhas `[{ rotulo, valor }]` que o Ver já mostra, com o
// mesmo texto e os mesmos rótulos, para as duas telas nunca divergirem:
//   - Localização (ou "Cortado de", para descartado, que o sorteio não traz);
//   - Coletâneas (só quando o texto está em alguma);
//   - Aparece em (só quando está em dois ou mais livros comuns);
//   - Idioma, Jargão e gíria e Gênero (só quando preenchidos);
//   - Status;
//   - Primeira publicação (só quando a data existe);
//   - Autoria;
//   - Fonte, Edição e Grafia (só quando o texto não é obra própria: obra própria
//     é o caso comum e não diz nada ao leitor).
// Linha sem valor não entra (como no Ver e no `.md`): texto avulso não ganha
// "Localização", texto sem data não ganha "Primeira publicação". De propósito
// não entra a data de escrita: ela pode identificar de quem ou do que o texto fala.

import { apareceEmDoTexto, caminhoDoDestino, textosApareceEm } from './aparicoes-do-texto.js';
import { titulosDeColetaneasDoTexto } from './coletaneas-do-texto.js';
import {
    INFO_STATUS,
    ehObraPropria,
    estaPublicado,
    formatarDataParcial,
    jargaoGiriaDoItem,
    linhasFonteTexto,
    rotuloLocalizacaoDoTexto,
    textoIdiomasComPapel,
    textoLocalizacaoDoTexto,
} from './utils.js';
import { textoAutoriaPublica } from './autoria-publica.js';

const mesmoId = (a, b) => a != null && b != null && String(a) === String(b);

// O `contexto` que o Ver e as exportações montam (`resolverContexto`, exportar.js),
// reduzido ao que a Localização lê: título do Livro, da Parte e da Seção do
// Destino do texto. Fica só aqui, nunca é gravado no acervo.
export function contextoDoTexto(dbRef, tipo, item) {
    const caminho = caminhoDoDestino(item, dbRef);
    const achar = (nome, id) =>
        id == null ? null : (dbRef?.[nome] || []).find((x) => mesmoId(x.id, id)) || null;
    return {
        livro: achar('livros', caminho?.livroId)?.titulo || null,
        parte: achar('partes', caminho?.parteId)?.titulo || null,
        secao: achar('secoes', caminho?.secaoId)?.titulo || null,
        aparece_em: apareceEmDoTexto(dbRef, tipo, item),
    };
}

// Status como o Ver mostra ("🟢 Publicado"). Texto antigo, sem `status`, cai em
// "Publicado: Sim" ou "Publicado: Não (rascunho)".
function linhaDoStatus(item) {
    if (item.status) {
        const info = INFO_STATUS[item.status] || { emoji: '⚪', titulo: item.status };
        return { rotulo: 'Status', valor: `${info.emoji} ${info.titulo}` };
    }
    return { rotulo: 'Publicado', valor: estaPublicado(item) ? 'Sim' : 'Não (rascunho)' };
}

// `tipo` é 'poema' ou 'prosa'.
export function fichaDoTexto(dbRef, tipo, item) {
    const comContexto = { ...item, contexto: contextoDoTexto(dbRef, tipo, item) };
    const linhas = [];
    const poe = (rotulo, valor) => {
        if (valor) linhas.push({ rotulo, valor });
    };

    poe(rotuloLocalizacaoDoTexto(comContexto), textoLocalizacaoDoTexto(comContexto));
    // Mesma ordem e mesmos textos do Ver: Coletâneas separadas por vírgula,
    // "Aparece em" por ponto e vírgula.
    poe('Coletâneas', titulosDeColetaneasDoTexto(dbRef || {}, tipo, item.id).join(', '));
    poe('Aparece em', textosApareceEm(comContexto).join('; '));
    poe('Idioma', textoIdiomasComPapel(item));
    poe('Jargão e gíria', jargaoGiriaDoItem(item).join(', '));
    poe('Gênero', typeof item.genero === 'string' ? item.genero.trim() : '');
    linhas.push(linhaDoStatus(item));
    if (item.dataPublicacao) {
        const data = formatarDataParcial(item.dataPublicacao);
        poe('Primeira publicação', data === '—' ? null : data);
    }
    // Autoria como o leitor vê: respeita "Autor sigiloso" (autoria-publica.js).
    poe('Autoria', textoAutoriaPublica(item, dbRef?.autores || []));
    // Só a origem do texto. O link da fonte, o "Texto conferido" e o domínio
    // público são de trabalho do autor.
    if (!ehObraPropria(item.fonteTexto)) {
        linhasFonteTexto(item, [])
            .filter(({ rotulo }) => ['Fonte', 'Edição', 'Grafia'].includes(rotulo))
            .forEach(({ rotulo, valor }) => poe(rotulo, valor));
    }
    return linhas;
}
