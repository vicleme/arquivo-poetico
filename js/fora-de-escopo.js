// ============================================================
// fora-de-escopo.js — "Fora de escopo" de um livro: os textos que NÃO fazem
// parte dele agora, mas que o livro já teve ou deveria ter tido. Só lógica
// pura, sem DOM, no molde de estrutura-livro.js (os dados vêm por `dbRef`).
//
// Dois grupos, sem duplicar nada:
//   - Descartados: texto com status "descartado" cujo `cortadoDe.livro` é este
//     livro. O lugar de onde ele saiu é o "Cortado de" do próprio texto (livro,
//     "Parte / Seção" e posição de origem), gravado quando ele foi descartado,
//     igual ao dos migrados: uma foto de onde ele estava, que não se mexe quando
//     a fila muda. O vínculo que o texto ainda guarda (destino) não conta: com o
//     status Descartado o destino fica travado no modal e é ignorado aqui. Sem
//     livro em "Cortado de", ou com um livro que não está no cadastro, o texto não
//     entra em livro algum e é listado pelo aviso (`descartadosSemOrigem`). Sai da
//     árvore e dos vinculados do livro (ver `semDescartados` em estrutura-livro.js)
//     e aparece só aqui.
//   - Migrados: texto com status "migrado" cujo `cortadoDe.livro` é este livro e
//     que hoje está em OUTRO livro. Fica na árvore do livro de destino e
//     aparece aqui só no livro de origem, com "agora em Livro › Seção · posição N".
//     O "agora em" vem do lugar REAL do texto (árvore ou vínculo com um livro
//     cadastrado), com os títulos de hoje; o "Lançado em" digitado só entra como
//     reserva, quando o destino não está no cadastro.
//     Migrado que continua no mesmo livro (de uma seção para outra) não entra:
//     fica só na árvore, com o selo "veio de Seção X · era a nº N na época".
//
// O livro de origem em `cortadoDe` é texto livre (pode nem estar cadastrado).
// O casamento com o cadastro ignora caixa, acento e espaços nas pontas e no meio.
// Coletânea não tem Fora de escopo (os itens dela apontam para textos que não
// mudam de status por causa dela).
// ============================================================

import { montarArvoreDoLivro } from './estrutura-livro.js';
import { chaveDeNomeDeLivro, origemCitaLivro, origemTemLivroCadastrado } from './origem-livro.js';

// Reexportada: os testes e outros módulos importam daqui.
export { chaveDeNomeDeLivro };

const lista = (dbRef, nome) => dbRef[nome] || [];

const mesmoId = (a, b) => a != null && b != null && String(a) === String(b);

// Posição válida: inteiro positivo; 0, vazio e lixo ficam "sem posição".
function posicaoValida(valor) {
    const n = parseInt(valor);
    return n > 0 ? n : null;
}

// Sobe a cadeia de pais (Seção → Parte → Livro) e devolve o livro em que o
// texto está pela árvore e os títulos de Parte e Seção, do topo para baixo.
// Sem lugar na árvore (ou cadeia quebrada), `livroId` é null.
function lugarNaArvore(dbRef, texto) {
    let paiTipo = texto.paiTipo;
    let paiId = texto.paiId;
    // Prosa antiga com `secaoId` e sem pai (mesma regra de filhosDaSecao).
    if (!paiTipo && texto.secaoId != null) {
        paiTipo = 'secao';
        paiId = texto.secaoId;
    }
    const caminho = [];
    for (let passo = 0; paiTipo && passo < 6; passo++) {
        if (paiTipo === 'livro') return { livroId: paiId, caminho };
        if (paiTipo === 'secao') {
            const secao = lista(dbRef, 'secoes').find((s) => mesmoId(s.id, paiId));
            if (!secao) return { livroId: null, caminho };
            caminho.unshift(secao.titulo || '(sem título)');
            paiTipo = secao.paiTipo;
            paiId = secao.paiId;
        } else if (paiTipo === 'parte') {
            const parte = lista(dbRef, 'partes').find((p) => mesmoId(p.id, paiId));
            if (!parte) return { livroId: null, caminho };
            caminho.unshift(parte.titulo || '(sem título)');
            return { livroId: parte.livroId, caminho };
        } else {
            break;
        }
    }
    return { livroId: null, caminho };
}

// Em quais livros o texto está AGORA: o da árvore e os de `livrosIds`.
function livrosDoTexto(dbRef, texto) {
    const ids = new Set();
    const { livroId } = lugarNaArvore(dbRef, texto);
    if (livroId != null) ids.add(String(livroId));
    (Array.isArray(texto.livrosIds) ? texto.livrosIds : []).forEach((id) => ids.add(String(id)));
    return ids;
}

// Texto de um lugar: "Livro › Seção · posição N", o mesmo desenho da Localização
// (o "›" dos caminhos do app entre os níveis, "·" antes da posição). Com `{ origem: true }` a posição
// é a de antigamente (foto do passado, não um lugar na fila de hoje) e sai como
// "era a nº N na época", para ninguém confundir com a numeração atual. `secao`
// pode vir como "Parte / Seção" (o jeito que o Cortado de grava), e a barra vira
// "›" aqui; só a exibição muda, o dado segue com " / ".
export function textoDeLugar({ livro, caminho, secao, posicao } = {}, { origem = false } = {}) {
    const nomes = [
        livro,
        ...(caminho || []),
        ...String(secao || '')
            .split(' / ')
            .map((peca) => peca.trim()),
    ].filter(Boolean);
    const base = nomes.join(' › ');
    const n = posicaoValida(posicao);
    const pos = n ? (origem ? `era a nº ${n} na época` : `posição ${n}`) : '';
    return [base, pos].filter(Boolean).join(' · ');
}

// Ordem em que as Partes e Seções aparecem no livro (a da aba Estrutura): chave
// do nome → índice. A origem de um migrado é texto livre; se o nome casar com uma
// Parte ou Seção do livro, herda a ordem dela.
function ordemDosLugares(dbRef, livroId) {
    const ordem = new Map();
    const visitar = (nos) =>
        nos.forEach((no) => {
            if (no.tipo === 'parte' || no.tipo === 'secao') {
                const chave = chaveDeNomeDeLivro(no.dados.titulo);
                if (!ordem.has(chave)) ordem.set(chave, ordem.size);
            }
            if (no.filhos) visitar(no.filhos);
        });
    visitar(montarArvoreDoLivro(dbRef, livroId).arvore);
    return ordem;
}

// Ordem de leitura: lugar de origem na ordem do livro (o que não casa com nenhuma
// Parte ou Seção vai por último), depois posição (sem posição por último), depois
// nome do lugar e título.
function comparadorDeEntradas(ordem) {
    const rank = (e) => {
        const ultimo = (e.origem.caminho || []).at(-1);
        return ultimo ? (ordem.get(chaveDeNomeDeLivro(ultimo)) ?? Infinity) : Infinity;
    };
    const nome = (e) => (e.origem.caminho || []).join(' / ');
    return (a, b) => {
        const ra = rank(a);
        const rb = rank(b);
        if (ra !== rb) return ra < rb ? -1 : 1;
        const c = nome(a).localeCompare(nome(b), 'pt-BR', { numeric: true });
        if (c) return c;
        const pa = a.origem.posicao ?? Infinity;
        const pb = b.origem.posicao ?? Infinity;
        if (pa !== pb) return pa < pb ? -1 : 1;
        return String(a.titulo).localeCompare(String(b.titulo), 'pt-BR');
    };
}

function textosComStatus(dbRef, status) {
    return ['poema', 'prosa'].flatMap((tipo) =>
        lista(dbRef, tipo + 's')
            .filter((t) => t.status === status)
            .map((t) => ({ tipo, dados: t })),
    );
}

// Lugar atual do migrado, para o "agora em". Duas fontes:
//   - o lugar REAL: o livro cadastrado em que o texto está (pela árvore ou, na
//     falta dela, por `livrosIds`), com os títulos de hoje do cadastro. Sempre
//     verdadeiro, então renomear livro ou seção não deixa nome velho aqui;
//   - o `lancadoEm` digitado (livro e seção em texto livre): só reserva, para
//     quando o destino não existe no cadastro (livro nunca cadastrado).
// A posição é a `sequencia` do texto e só vale com lugar real na árvore: sem
// ele não há fila, e um número solto contradiria o nome mostrado.
function destinoDoMigrado(dbRef, texto) {
    const declarado = texto.lancadoEm || {};
    const livros = lista(dbRef, 'livros');
    const real = lugarNaArvore(dbRef, texto);

    let livroReal = livros.find((l) => mesmoId(l.id, real.livroId));
    const naArvore = Boolean(livroReal);
    if (!livroReal) {
        const ids = Array.isArray(texto.livrosIds) ? texto.livrosIds : [];
        for (const id of ids) {
            livroReal = livros.find((l) => mesmoId(l.id, id));
            if (livroReal) break;
        }
    }

    if (livroReal) {
        const titulo = String(livroReal.titulo || '').trim();
        if (naArvore) {
            return {
                livro: titulo,
                secao: real.caminho.join(' / '),
                posicao: posicaoValida(texto.sequencia),
            };
        }
        // Só vinculado: não há seção real, então a declarada ainda ajuda, desde
        // que seja do mesmo livro (ou não diga de qual é).
        const semLivroDeclarado = !chaveDeNomeDeLivro(declarado.livro) && declarado.livroId == null;
        const doMesmoLivro = semLivroDeclarado || origemCitaLivro(dbRef, declarado, livroReal);
        return {
            livro: titulo,
            secao: doMesmoLivro ? String(declarado.secao || '').trim() : '',
            posicao: null,
        };
    }

    return {
        livro: String(declarado.livro || '').trim(),
        secao: String(declarado.secao || '').trim(),
        posicao: null,
    };
}

// Origem de um descartado: o "Cortado de" gravado no descarte (foto do passado). A
// Parte/Seção vem em uma peça só, "Parte / Seção", e é separada aqui para a ordem
// do livro conseguir casar a última peça com a Seção de verdade. O livro não entra
// na origem: o descartado só aparece no livro de onde saiu.
function origemDoDescartado(texto) {
    const gravada = texto.cortadoDe || {};
    return {
        caminho: String(gravada.secao || '')
            .split(' / ')
            .map((peca) => peca.trim())
            .filter(Boolean),
        posicao: posicaoValida(gravada.posicao),
    };
}

// Origem a gravar em "Cortado de" quando um texto é descartado: onde ele está
// agora, na forma do campo ({ livro, secao, posicao }), com Parte e Seção juntas
// em `secao` ("Parte / Seção"). `paiTipo`/`paiId` é o lugar na árvore e
// `sequencia` a posição nele; sem lugar (texto avulso) devolve null. Só inclui a
// posição quando há uma (sem o 0).
export function origemParaDescarte(dbRef, paiTipo, paiId, sequencia) {
    if (!paiTipo || paiId == null || paiId === '') return null;
    const { livroId, caminho } = lugarNaArvore(dbRef, { paiTipo, paiId });
    const livro = lista(dbRef, 'livros').find((l) => mesmoId(l.id, livroId));
    if (!livro) return null;
    // O id vai junto: renomear o livro depois não solta o descartado do Fora de escopo.
    const saida = {
        livro: String(livro.titulo || '').trim(),
        livroId: livro.id,
        secao: caminho.join(' / '),
    };
    const posicao = posicaoValida(sequencia);
    if (posicao !== null) saida.posicao = posicao;
    return saida;
}

// Fora de escopo do livro: { descartados: [...], migrados: [...] }, cada
// entrada { tipo, id, titulo, status, origem: { caminho, posicao }, destino? }.
// `origem.caminho` é a lista de títulos (Parte, Seção) do topo para baixo; no
// migrado, vem de `cortadoDe.secao` (texto livre, uma só peça).
export function foraDeEscopoDoLivro(dbRef, livroId) {
    const vazio = { descartados: [], migrados: [] };
    const livro = lista(dbRef, 'livros').find((l) => mesmoId(l.id, livroId));
    if (!livro || livro.tipo === 'Coletânea') return vazio;

    const comparar = comparadorDeEntradas(ordemDosLugares(dbRef, livro.id));
    const descartados = textosComStatus(dbRef, 'descartado')
        .filter(({ dados }) => origemCitaLivro(dbRef, dados.cortadoDe, livro))
        .map(({ tipo, dados }) => ({
            tipo,
            id: dados.id,
            titulo: dados.titulo || '(sem título)',
            status: 'descartado',
            origem: origemDoDescartado(dados),
        }))
        .sort(comparar);

    const migrados = textosComStatus(dbRef, 'migrado')
        .filter(({ dados }) => {
            if (!origemCitaLivro(dbRef, dados.cortadoDe, livro)) return false;
            // Continua neste livro (mudou só de seção): fica na árvore, com selo.
            return !livrosDoTexto(dbRef, dados).has(String(livro.id));
        })
        .map(({ tipo, dados }) => ({
            tipo,
            id: dados.id,
            titulo: dados.titulo || '(sem título)',
            status: 'migrado',
            origem: {
                caminho: dados.cortadoDe.secao ? [dados.cortadoDe.secao] : [],
                posicao: posicaoValida(dados.cortadoDe.posicao),
            },
            destino: destinoDoMigrado(dbRef, dados),
        }))
        .sort(comparar);

    return { descartados, migrados };
}

export function totalForaDeEscopo(fora) {
    return (fora?.descartados?.length || 0) + (fora?.migrados?.length || 0);
}

// O que aconteceu com o texto e de onde saiu, sem o rótulo do status:
// "de Livro › Seção · era a nº 4 na época → agora em Livro › Seção · posição 2".
// O "›" separa os níveis do caminho e a seta "→" separa a origem do destino.
// Descartado sem origem devolve ''. Migrado sem nada conhecido devolve "migrado".
export function detalheDaEntradaForaDeEscopo(entrada) {
    const origem = textoDeLugar(entrada.origem, { origem: true });
    if (entrada.status === 'descartado') return origem ? `de ${origem}` : '';
    const destino = textoDeLugar(entrada.destino);
    const partes = [];
    if (origem) partes.push(`de ${origem}`);
    partes.push(destino ? `agora em ${destino}` : 'migrado');
    return partes.join(' → ');
}

// Uma linha legível por entrada, a mesma para o Ver, a aba e as saídas.
export function textoDaEntradaForaDeEscopo(entrada) {
    const detalhe = detalheDaEntradaForaDeEscopo(entrada);
    if (entrada.status === 'descartado') return detalhe ? `Descartado (${detalhe})` : 'Descartado';
    return `Migrado (${detalhe})`;
}

// Selos da árvore para os migrados que estão neste livro: Map `tipo-id` →
// { mesmoLivro, de: { livro, secao, posicao }, texto }.
//   - veio de outro livro: "veio de Livro X › Seção Y · era a nº N na época";
//   - veio de outra seção do mesmo livro (ou sem livro informado): "veio de
//     Seção X · era a nº N na época", sem repetir o livro.
// Migrado sem Seção nem posição de origem e do mesmo livro não ganha selo.
export function selosDeMigracaoDoLivro(dbRef, livroId) {
    const selos = new Map();
    const livro = lista(dbRef, 'livros').find((l) => mesmoId(l.id, livroId));
    if (!livro || livro.tipo === 'Coletânea') return selos;

    for (const { tipo, dados } of textosComStatus(dbRef, 'migrado')) {
        const origem = dados.cortadoDe;
        if (!origem || !livrosDoTexto(dbRef, dados).has(String(livro.id))) continue;
        const semLivro = !chaveDeNomeDeLivro(origem.livro) && origem.livroId == null;
        const mesmoLivro = semLivro || origemCitaLivro(dbRef, origem, livro);
        const de = {
            livro: mesmoLivro ? '' : origem.livro,
            secao: origem.secao || '',
            posicao: posicaoValida(origem.posicao),
        };
        const texto = textoDeLugar(
            { livro: de.livro, secao: de.secao, posicao: de.posicao },
            { origem: true },
        );
        if (!texto) continue;
        selos.set(`${tipo}-${dados.id}`, { mesmoLivro, de, texto: `veio de ${texto}` });
    }
    return selos;
}

// Migrados cujo livro de origem não casa com nenhum livro cadastrado: não
// aparecem no Fora de escopo de livro algum. Serve para avisar de grafia
// diferente ("vol 1." × "vol. 1"). Ordenado por título.
export function migradosSemLivroDeOrigem(dbRef) {
    return textosComStatus(dbRef, 'migrado')
        .filter(({ dados }) => {
            const origem = chaveDeNomeDeLivro(dados.cortadoDe?.livro);
            return origem && !origemTemLivroCadastrado(dbRef, dados.cortadoDe);
        })
        .map(({ tipo, dados }) => ({
            tipo,
            id: dados.id,
            titulo: dados.titulo || '(sem título)',
            livroDeOrigem: dados.cortadoDe.livro,
        }))
        .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
}

// Migrados sem livro de origem no cadastro, agrupados pelo nome citado (o que
// o Victor corrige é o nome). Cada grupo: { livro, titulos }, em ordem alfabética
// do nome e dos títulos; nomes que só diferem em caixa, acento ou espaços ficam
// num grupo só, com a grafia do primeiro.
export function agruparMigradosSemLivro(migrados = []) {
    const grupos = new Map();
    for (const m of migrados) {
        const chave = chaveDeNomeDeLivro(m.livroDeOrigem);
        if (!grupos.has(chave)) {
            grupos.set(chave, { livro: String(m.livroDeOrigem).trim(), titulos: [] });
        }
        grupos.get(chave).titulos.push(m.titulo);
    }
    return [...grupos.values()]
        .map((g) => ({ ...g, titulos: g.titulos.sort((a, b) => a.localeCompare(b, 'pt-BR')) }))
        .sort((a, b) => a.livro.localeCompare(b.livro, 'pt-BR'));
}

// Descartados que não entram no Fora de escopo de livro algum, em dois grupos:
//   - `foraDoCadastro`: o "Cortado de" cita um livro que não está no cadastro
//     (mesma forma de `migradosSemLivroDeOrigem`, com `livroDeOrigem`);
//   - `semOrigem`: o "Cortado de" está sem livro (descartado antigo, ou feito por
//     importação). Aqui falta preencher, e só o título ajuda a achar o texto.
// Cada grupo ordenado por título.
export function descartadosSemLivroDeOrigem(dbRef) {
    const foraDoCadastro = [];
    const semOrigem = [];
    for (const { tipo, dados } of textosComStatus(dbRef, 'descartado')) {
        const titulo = dados.titulo || '(sem título)';
        const origem = chaveDeNomeDeLivro(dados.cortadoDe?.livro);
        if (!origem) semOrigem.push({ tipo, id: dados.id, titulo });
        else if (!origemTemLivroCadastrado(dbRef, dados.cortadoDe)) {
            foraDoCadastro.push({
                tipo,
                id: dados.id,
                titulo,
                livroDeOrigem: dados.cortadoDe.livro,
            });
        }
    }
    const porTitulo = (a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR');
    return { foraDoCadastro: foraDoCadastro.sort(porTitulo), semOrigem: semOrigem.sort(porTitulo) };
}

const MAX_LIVROS_AVISO = 5;
const MAX_TITULOS_AVISO = 4;

// Até 4 títulos, o resto vira "e mais N".
function listaDeTitulosAviso(titulos) {
    const vistos = titulos.slice(0, MAX_TITULOS_AVISO).join(', ');
    const resto = titulos.length - MAX_TITULOS_AVISO;
    return `${vistos}${resto > 0 ? ` e mais ${resto}` : ''}`;
}

// "N <varios> citam M livros que não estão no cadastro: “Livro” (títulos)." para
// migrados e descartados. Mostra até 5 livros; o resto vira "e mais N livros".
function avisoDeLivrosForaDoCadastro(entradas, { um, varios }) {
    if (!entradas.length) return '';
    const grupos = agruparMigradosSemLivro(entradas);
    const n = entradas.length;
    const g = grupos.length;
    const partes = grupos
        .slice(0, MAX_LIVROS_AVISO)
        .map((gr) => `\u201c${gr.livro}\u201d (${listaDeTitulosAviso(gr.titulos)})`);
    const maisLivros = g - MAX_LIVROS_AVISO;
    const corpo =
        partes.join('; ') +
        (maisLivros > 0 ? `; e mais ${maisLivros} livro${maisLivros > 1 ? 's' : ''}` : '');
    const sujeito = n === 1 ? `1 ${um} cita` : `${n} ${varios} citam`;
    const livros = g === 1 ? 'um livro' : `${g} livros`;
    const verbo = g === 1 ? 'não está' : 'não estão';
    return `${sujeito} ${livros} que ${verbo} no cadastro: ${corpo}.`;
}

// Aviso de uma linha, o mesmo no Ver do livro e na aba Estrutura. Vazio quando
// não há o que avisar.
export function textoAvisoMigradosSemLivro(migrados = []) {
    return avisoDeLivrosForaDoCadastro(migrados, { um: 'migrado', varios: 'migrados' });
}

// Aviso dos descartados que não aparecem em livro algum: livro citado fora do
// cadastro e "Cortado de" sem livro, em frases separadas. Vazio sem nada a avisar.
export function textoAvisoDescartadosSemOrigem(sem = {}) {
    const fora = avisoDeLivrosForaDoCadastro(sem.foraDoCadastro || [], {
        um: 'descartado',
        varios: 'descartados',
    });
    const vazios = sem.semOrigem || [];
    let semLivro = '';
    if (vazios.length) {
        const sujeito =
            vazios.length === 1 ? '1 descartado está' : `${vazios.length} descartados estão`;
        semLivro = `${sujeito} sem o livro em Cortado de e não aparece${vazios.length === 1 ? '' : 'm'} em livro algum: ${listaDeTitulosAviso(vazios.map((v) => v.titulo))}.`;
    }
    return [fora, semLivro].filter(Boolean).join(' ');
}

// Tudo o que as telas (aba Estrutura e Ver do livro) precisam do Fora de escopo
// de um livro, numa chamada só: a lista (`fora`), os selos "veio de" dos migrados
// que estão na árvore (`selos`, Map `tipo-id` → { texto }) e o aviso de uma linha
// dos migrados cujo livro de origem não está no cadastro (`aviso`, '' quando não
// há). O aviso vale para o acervo todo, não para este livro. Coletânea não tem
// nada disso.
export function dadosForaDeEscopoDaTela(dbRef, livroId) {
    const livro = lista(dbRef, 'livros').find((l) => mesmoId(l.id, livroId));
    if (!livro || livro.tipo === 'Coletânea') {
        return { fora: { descartados: [], migrados: [] }, selos: new Map(), aviso: '' };
    }
    return {
        fora: foraDeEscopoDoLivro(dbRef, livro.id),
        selos: selosDeMigracaoDoLivro(dbRef, livro.id),
        aviso: [
            textoAvisoMigradosSemLivro(migradosSemLivroDeOrigem(dbRef)),
            textoAvisoDescartadosSemOrigem(descartadosSemLivroDeOrigem(dbRef)),
        ]
            .filter(Boolean)
            .join(' '),
    };
}
