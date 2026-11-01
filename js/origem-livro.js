// ============================================================
// origem-livro.js — o livro citado em "Cortado de" e "Lançado em" (Poema e
// Prosa), por id. Lógica pura, sem DOM.
//
// Os dois campos guardam { livro, secao, posicao? }. O `livro` é texto livre,
// porque o livro citado pode nem estar cadastrado (origem antiga). Para o vínculo
// não depender do nome, quando o livro está no cadastro o campo guarda também
// `livroId`, e o `livro` (texto) vira o ESPELHO do título atual:
//   - o Fora de escopo casa pelo id, então renomear um livro não faz o texto sumir;
//   - tudo o que só lê `.livro` (Ver, tabelas, busca, .csv, .md) segue igual e
//     mostra o título de hoje, porque o espelho é atualizado junto;
//   - livro nunca cadastrado fica sem id, como texto livre;
//   - livro excluído deixa o texto com o último nome (o id vira ponta solta) e o
//     aviso de "fora do cadastro" volta a valer, como antes.
// ============================================================

import { normalizarBusca } from './utils.js';

const lista = (dbRef, nome) => (Array.isArray(dbRef?.[nome]) ? dbRef[nome] : []);
const mesmoId = (a, b) => a != null && b != null && String(a) === String(b);

// Chave de comparação de nomes de livro: sem caixa, sem acento e com os espaços
// juntados e aparados ("Dores do Crescimento " casa com "dores do  crescimento").
export function chaveDeNomeDeLivro(nome) {
    return normalizarBusca(nome).replace(/\s+/g, ' ').trim();
}

function livroPorId(dbRef, id) {
    if (id == null || id === '') return null;
    return lista(dbRef, 'livros').find((l) => mesmoId(l.id, id)) || null;
}

// O livro cadastrado a que `{ livro, livroId }` aponta, ou null. Vale o id; sem
// id (ou com id de livro que já não existe), vale o nome, mas só quando ele casa
// com UM livro (nome repetido é ambíguo e não liga a ninguém).
export function livroDaOrigem(dbRef, ls) {
    if (!ls) return null;
    const porId = livroPorId(dbRef, ls.livroId);
    if (porId) return porId;
    const chave = chaveDeNomeDeLivro(ls.livro);
    if (!chave) return null;
    const iguais = lista(dbRef, 'livros').filter((l) => chaveDeNomeDeLivro(l.titulo) === chave);
    return iguais.length === 1 ? iguais[0] : null;
}

// A origem cita este livro? Com id válido, só o id decide (o nome é espelho e pode
// estar desatualizado). Sem id válido, vale o nome, como era antes do id.
export function origemCitaLivro(dbRef, ls, livro) {
    if (!ls || !livro) return false;
    if (livroPorId(dbRef, ls.livroId)) return mesmoId(ls.livroId, livro.id);
    const chave = chaveDeNomeDeLivro(ls.livro);
    return Boolean(chave) && chave === chaveDeNomeDeLivro(livro.titulo);
}

// A origem cita um livro que está no cadastro (por id ou por nome)?
export function origemTemLivroCadastrado(dbRef, ls) {
    if (!ls) return false;
    if (livroPorId(dbRef, ls.livroId)) return true;
    const chave = chaveDeNomeDeLivro(ls.livro);
    return (
        Boolean(chave) && lista(dbRef, 'livros').some((l) => chaveDeNomeDeLivro(l.titulo) === chave)
    );
}

// Liga `ls` ao livro cadastrado e alinha o espelho do título. Muda o objeto no
// lugar e devolve true se algo mudou. Sem livro (nem id, nem nome) ou sem livro
// único para ligar: não mexe.
function ligarEEspelhar(dbRef, ls) {
    if (!ls || typeof ls !== 'object') return false;
    const livro = livroDaOrigem(dbRef, ls);
    if (!livro) return false;
    let mudou = false;
    if (!mesmoId(ls.livroId, livro.id)) {
        ls.livroId = livro.id;
        mudou = true;
    }
    const titulo = String(livro.titulo || '').trim();
    if (titulo && ls.livro !== titulo) {
        ls.livro = titulo;
        mudou = true;
    }
    return mudou;
}

// Passa por todos os Poemas e Prosas e, em `cortadoDe` e `lancadoEm`, liga ao
// livro cadastrado (cadastros e backups antigos ganham o id aqui) e atualiza o
// espelho do título (renomear livro). Idempotente; devolve quantos campos mudaram.
export function sincronizarOrigemComLivros(dbRef) {
    let mudados = 0;
    ['poemas', 'prosas'].forEach((col) => {
        lista(dbRef, col).forEach((texto) => {
            if (ligarEEspelhar(dbRef, texto.cortadoDe)) mudados++;
            if (ligarEEspelhar(dbRef, texto.lancadoEm)) mudados++;
        });
    });
    return mudados;
}

// Para o modal: o `{ livro, secao, posicao? }` lido do formulário, com o livroId
// quando o texto digitado é um livro cadastrado único (e o título no espelho,
// como está no cadastro). Livro não cadastrado: sem id, o texto como digitado.
//
// `anterior` (opcional) é a mesma origem como estava gravada antes de editar. Se
// ela já apontava para um livro que existe e o texto digitado ainda é o nome
// dele (o espelho ou o título de hoje), o id é mantido mesmo com dois livros de
// mesmo título, para editar o texto não soltar um vínculo que já estava certo.
export function origemComLivroId(dbRef, ls, anterior) {
    if (!ls) return ls;
    const saida = { ...ls };
    delete saida.livroId;
    const chave = chaveDeNomeDeLivro(saida.livro);
    if (!chave) return saida;
    const livroAnterior = livroPorId(dbRef, anterior?.livroId);
    if (
        livroAnterior &&
        (chave === chaveDeNomeDeLivro(livroAnterior.titulo) ||
            chave === chaveDeNomeDeLivro(anterior.livro))
    ) {
        saida.livroId = livroAnterior.id;
        const titulo = String(livroAnterior.titulo || '').trim();
        if (titulo) saida.livro = titulo;
        return saida;
    }
    const iguais = lista(dbRef, 'livros').filter((l) => chaveDeNomeDeLivro(l.titulo) === chave);
    if (iguais.length === 1) {
        saida.livroId = iguais[0].id;
        const titulo = String(iguais[0].titulo || '').trim();
        if (titulo) saida.livro = titulo;
    }
    return saida;
}
