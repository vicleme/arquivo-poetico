// ============================================================
// contador-sinopse-livro.js: contador de caracteres da Sinopse curta do
// modal do Livro. Só informa, nunca trava nem corta o texto (decisão do
// Victor, 24/10/2026). Conta caracteres de verdade (emoji e letra com
// acento contam um só), não unidades internas do JavaScript.
// ============================================================

const ID_CAMPO = 'l-sinopse-curta';
const ID_CONTADOR = 'l-sinopse-curta-contador';

export function contarCaracteres(texto) {
    return Array.from(String(texto ?? '')).length;
}

export function rotuloContadorSinopseCurta(texto) {
    const n = contarCaracteres(texto);
    return `${n} ${n === 1 ? 'caractere' : 'caracteres'}`;
}

// Põe o contador em dia com o que está no campo (chamado ao abrir o modal,
// porque preencher por código não dispara 'input').
export function atualizarContadorSinopseCurta() {
    const campo = document.getElementById(ID_CAMPO);
    const contador = document.getElementById(ID_CONTADOR);
    if (!campo || !contador) return;
    contador.textContent = rotuloContadorSinopseCurta(campo.value);
}

// Uma escuta só no documento: o modal é carregado sob demanda, então o campo
// pode não existir ainda quando o app inicia.
export function initContadorSinopseCurta() {
    document.addEventListener('input', (e) => {
        if (e.target && e.target.id === ID_CAMPO) atualizarContadorSinopseCurta();
    });
}
