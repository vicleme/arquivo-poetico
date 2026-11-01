// comentarios-publicos.js: o que o texto diz a quem o lê (31/10/2026).
//
// Dois campos em poemas e prosas, feitos para aparecer fora do cadastro (hoje,
// na página do sorteio de leitura):
//   - `comentariosPublicos` (texto; "Comentários ao leitor" na interface):
//     comentário escrito já para o leitor. Vazio
//     ou ausente vale como "sem comentário".
//   - `notasPublicas` (booleano): marca as Notas do texto como publicáveis. As
//     Notas continuam podendo guardar conteúdo privativo; só as marcadas
//     saem. Desligado por padrão, e texto antigo, sem o campo, vale como
//     desligado. Só `true` conta (como em `sorteavel.js`).
//
// Lógica pura, sem DOM e sem o `db` global.

export function ehNotaPublica(item) {
    return item?.notasPublicas === true;
}

// Liga ou desliga a marca. Devolve true se o valor mudou. Desligar grava
// `false` (em vez de apagar o campo) para a exportação ficar explícita.
export function definirNotaPublica(item, valor) {
    if (!item) return false;
    const novo = valor === true;
    if (ehNotaPublica(item) === novo && typeof item.notasPublicas === 'boolean') return false;
    const mudou = ehNotaPublica(item) !== novo;
    item.notasPublicas = novo;
    return mudou;
}

// O comentário público sem os espaços das pontas; `''` quando não há.
export function comentariosPublicosDe(item) {
    const bruto = item?.comentariosPublicos;
    return typeof bruto === 'string' ? bruto.trim() : '';
}

// As Notas só quando marcadas como públicas; `''` quando privadas ou vazias.
export function notasPublicasDe(item) {
    if (!ehNotaPublica(item)) return '';
    const bruto = item?.notas;
    return typeof bruto === 'string' ? bruto.trim() : '';
}

// Os blocos que a página do sorteio mostra ao leitor, na ordem: Comentários ao
// leitor e depois Notas. Bloco sem texto não entra. Nada além desses dois campos sai
// daqui: Notas privadas nunca chegam a esta lista.
export function blocosPublicosDoTexto(item) {
    const blocos = [];
    const comentarios = comentariosPublicosDe(item);
    if (comentarios) blocos.push({ rotulo: 'Comentários ao leitor', texto: comentarios });
    const notas = notasPublicasDe(item);
    if (notas) blocos.push({ rotulo: 'Notas', texto: notas });
    return blocos;
}
