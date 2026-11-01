// Opções de Parte/Seção para os campos "Cortado de" e "Lançado em" (Poema e
// Prosa). Lógica pura, sem DOM: o editor só pede a lista e escreve no datalist.
//
// Cada opção é o CAMINHO completo, do mesmo jeito que o app grava ao marcar um
// texto como Descartado: "Parte / Seção" (Seção dentro de Parte), só "Seção"
// (Seção direto no livro) ou só "Parte". Assim a mesma Seção em duas Partes
// diferentes vira duas opções, e o Fora de escopo, que separa o texto por " / ",
// lê qualquer uma delas sem mudança.
//
//   opcao = { valor, ultimo, tipo: 'parte' | 'secao', livroId, livroTitulo }

const lista = (dbRef, nome) => (Array.isArray(dbRef?.[nome]) ? dbRef[nome] : []);
const mesmoId = (a, b) => a != null && b != null && String(a) === String(b);

// Chave de comparação: sem caixa e com " / " normalizado, para o texto digitado
// casar com a opção mesmo com espaços a mais ou a menos em volta da barra.
export function chaveDeOrigem(texto) {
    return String(texto ?? '')
        .toLowerCase()
        .replace(/\s*\/\s*/g, ' / ')
        .replace(/\s+/g, ' ')
        .trim();
}

// Sobe a cadeia de pais de uma Seção e devolve { livroId, caminho } (títulos do
// topo para baixo, a própria Seção por último). Cadeia quebrada: livroId null.
function caminhoDaSecao(dbRef, secao) {
    const caminho = [];
    let atual = secao;
    for (let passo = 0; atual && passo < 6; passo++) {
        caminho.unshift(String(atual.titulo || '').trim());
        if (atual.paiTipo === 'livro') return { livroId: atual.paiId, caminho };
        if (atual.paiTipo === 'parte') {
            const parte = lista(dbRef, 'partes').find((p) => mesmoId(p.id, atual.paiId));
            if (!parte) return { livroId: null, caminho };
            caminho.unshift(String(parte.titulo || '').trim());
            return { livroId: parte.livroId, caminho };
        }
        if (atual.paiTipo === 'secao') {
            atual = lista(dbRef, 'secoes').find((s) => mesmoId(s.id, atual.paiId));
            continue;
        }
        break;
    }
    return { livroId: null, caminho };
}

// Todas as Partes e Seções do acervo com o caminho e o livro já resolvidos.
// Fica de fora o que não tem título ou cujo livro não existe mais.
export function opcoesDeOrigem(dbRef) {
    const livros = lista(dbRef, 'livros');
    const tituloDoLivro = (id) => livros.find((l) => mesmoId(l.id, id))?.titulo || null;
    const saida = [];

    lista(dbRef, 'partes').forEach((p) => {
        const titulo = String(p.titulo || '').trim();
        const livroTitulo = tituloDoLivro(p.livroId);
        if (titulo && livroTitulo) {
            saida.push({
                valor: titulo,
                ultimo: titulo,
                tipo: 'parte',
                livroId: p.livroId,
                livroTitulo,
            });
        }
    });

    lista(dbRef, 'secoes').forEach((s) => {
        if (!String(s.titulo || '').trim()) return;
        const { livroId, caminho } = caminhoDaSecao(dbRef, s);
        const livroTitulo = livroId != null ? tituloDoLivro(livroId) : null;
        if (!livroTitulo || caminho.some((peca) => !peca)) return;
        saida.push({
            valor: caminho.join(' / '),
            ultimo: caminho[caminho.length - 1],
            tipo: 'secao',
            livroId,
            livroTitulo,
        });
    });

    return saida;
}

// O livro digitado ao lado, se o texto bater com um livro cadastrado (ignora
// caixa). Fora do cadastro (origem antiga, nunca cadastrada aqui): null.
export function livroCadastradoDigitado(dbRef, livroDigitado) {
    const chave = String(livroDigitado ?? '')
        .trim()
        .toLowerCase();
    if (!chave) return null;
    return (
        lista(dbRef, 'livros').find(
            (l) =>
                String(l.titulo || '')
                    .trim()
                    .toLowerCase() === chave,
        ) || null
    );
}

// Valores a oferecer no datalist: só os do livro digitado, ou todos quando o
// livro está vazio ou não existe no cadastro. Sem repetição, em ordem alfabética.
export function valoresSugeridos(opcoes, livro) {
    const base = livro ? opcoes.filter((o) => String(o.livroId) === String(livro.id)) : opcoes;
    return Array.from(new Set(base.map((o) => o.valor))).sort((a, b) =>
        a.localeCompare(b, 'pt-BR'),
    );
}

// Título do livro a preencher sozinho quando o texto digitado aponta, sem
// ambiguidade, para uma Parte/Seção cadastrada. Casa primeiro com o caminho
// inteiro; se não achar, com o último nome (quem digita só "Viagens"). Mais de um
// livro possível, ou nenhum: null (quem escolhe é a pessoa).
export function livroDaOrigemDigitada(opcoes, digitado) {
    const chave = chaveDeOrigem(digitado);
    if (!chave) return null;
    const noCaminho = opcoes.filter((o) => chaveDeOrigem(o.valor) === chave);
    const achados = noCaminho.length
        ? noCaminho
        : opcoes.filter((o) => chaveDeOrigem(o.ultimo) === chave);
    const livros = new Set(achados.map((o) => String(o.livroId)));
    return livros.size === 1 ? achados[0].livroTitulo : null;
}

// Caminho completo para um nome digitado só pela metade: se o texto é o nome de
// UMA Seção que mora dentro de uma Parte, devolve "Parte / Seção". Devolve null
// quando não há o que completar: o texto já é um caminho ou uma Parte, não casa
// com nada, ou casa com mais de uma Seção (aí quem escolhe é a pessoa). `livro`
// (opcional) restringe a busca ao livro digitado ao lado.
export function completarCaminhoDigitado(opcoes, digitado, livro = null) {
    const chave = chaveDeOrigem(digitado);
    if (!chave) return null;
    const doLivro = livro ? opcoes.filter((o) => String(o.livroId) === String(livro.id)) : opcoes;
    // Já é um caminho ou o nome de uma Parte ou de uma Seção solta no livro.
    if (doLivro.some((o) => chaveDeOrigem(o.valor) === chave)) return null;
    const candidatos = Array.from(
        new Set(doLivro.filter((o) => chaveDeOrigem(o.ultimo) === chave).map((o) => o.valor)),
    );
    return candidatos.length === 1 ? candidatos[0] : null;
}
