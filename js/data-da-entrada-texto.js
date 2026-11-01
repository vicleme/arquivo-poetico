// ============================================================
// data-da-entrada-texto.js: a data da obra (ou do fato) de uma entrada de
// Intertextualidade, Hipertextualidade ou Referências como texto puro, para o
// Ver, o `.md` e o `.csv` (T9, entrega 8 de 13). Lógica pura; cada saída
// escapa ou monta a linha do seu jeito.
//
// Obra e Notícia: "1972" ou "1920 até 1935". Pessoa pública: "nasc. 1900" e
// "óbito 1980" (quem está viva só tem o nascimento). Marco histórico: o
// intervalo, como a obra. Sem data nenhuma, devolve ''.
// ============================================================

import { datasDaEntrada, formatarDataObra, formatarIntervaloDataObra } from './data-da-obra.js';
import { ehPessoaPublica } from './conhecido-como.js';

// `entrada` é a entrada inteira. Só a Referência tem `tipo` de pessoa pública
// (Intertextualidade e Hipertextualidade usam `tipoObra`).
export function textoDaDataDaEntrada(entrada) {
    const { inicio, fim } = datasDaEntrada(entrada);
    if (!inicio && !fim) return '';
    if (ehPessoaPublica(entrada?.tipo)) {
        return [
            inicio ? `nasc. ${formatarDataObra(inicio)}` : '',
            fim ? `óbito ${formatarDataObra(fim)}` : '',
        ]
            .filter(Boolean)
            .join(', ');
    }
    return formatarIntervaloDataObra(inicio, fim);
}

// Só o começo e só o fim, cada um em texto (colunas paralelas do `.csv`).
export function textosDasPontasDaEntrada(entrada) {
    const { inicio, fim } = datasDaEntrada(entrada);
    return { inicio: formatarDataObra(inicio), fim: formatarDataObra(fim) };
}
