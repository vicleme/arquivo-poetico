// autor-sigiloso.js: o campo `sigiloso` do Autor (31/10/2026).
//
// Lógica pura (sem DOM): a decisão do que é sigiloso e do aviso do modal.
//
// `sigiloso` é uma decisão só, no cadastro do Autor, que vale para toda saída
// PÚBLICA (a página do sorteio e, no futuro, qualquer tela feita para quem lê).
// Polaridade pensada para o caso comum: desligado (padrão), o nome aparece;
// ligado, só aparece o nome literário (heterônimo ou pseudônimo) e, se o Autor
// não tem nenhum, a autoria não é exibida. Esta entrega só guarda a decisão e a
// mostra no cadastro, nas buscas e nas saídas do próprio Autor; quem passa a
// respeitá-la na página do sorteio é a entrega seguinte.
//
// O `.md`, o `.csv`, o `.json` e o Ver são do autor (para uso dele), então
// continuam com o nome real: o campo aparece neles apenas como dado.

// Dois níveis de sigilo no cadastro do Autor (o terceiro é por texto, em outra
// entrega). Basta um nível pedir sigilo para o sigilo valer; nenhum libera o
// que outro escondeu:
//   - caixa "Autor sigiloso" (`sigiloso`): vale para todos os textos do Autor;
//   - marca "Anonimizar autor" em um nome literário (`anonimizar`, no item do
//     nome): vale para os textos assinados com esse nome.
// O efeito é sempre o mesmo: o nome civil não aparece junto do texto.

export const TEXTO_AVISO_SIGILO =
    'Este autor tem nome literário sem a marca "Anonimizar autor" e a caixa "Autor sigiloso" ' +
    'está desligada: nas telas públicas o nome real aparece junto dele, como "pseudônimo de" ' +
    'ou "heterônimo de". Ligue a caixa do Autor, ou marque "Anonimizar autor" nos nomes ' +
    'literários que devem preservar a identidade.';

export function autorEhSigiloso(autor) {
    return autor?.sigiloso === true;
}

// Há ao menos um nome literário com nome preenchido.
export function temNomeLiterario(nomesLiterarios) {
    return (
        Array.isArray(nomesLiterarios) &&
        nomesLiterarios.some((n) => String(n?.nome ?? '').trim() !== '')
    );
}

// O item do nome literário (`{ nome, tipo, anonimizar? }`) anonimiza o autor.
// Só `anonimizar: true` conta; ausente e falso não.
export function nomeAnonimiza(item) {
    return item?.anonimizar === true;
}

// O modal avisa quando a caixa do Autor está desligada e há ao menos um nome
// literário sem a marca "Anonimizar autor", porque esquecer de proteger esse
// nome expõe a identidade. Com todos os nomes marcados, não há o que avisar.
export function deveAvisarSigilo(nomesLiterarios, sigiloso) {
    if (sigiloso || !Array.isArray(nomesLiterarios)) return false;
    return nomesLiterarios.some((n) => String(n?.nome ?? '').trim() !== '' && !nomeAnonimiza(n));
}

// Lê a lista de nomes literários do campo escondido do modal (JSON). Valor
// ausente, vazio ou inválido vira lista vazia.
export function nomesLiterariosDoCampo(valorBruto) {
    try {
        const lista = JSON.parse(valorBruto || '[]');
        return Array.isArray(lista) ? lista : [];
    } catch {
        return [];
    }
}
