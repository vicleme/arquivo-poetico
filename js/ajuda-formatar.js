// ============================================================
// ajuda-formatar.js: formatação leve das respostas da Central de Ajuda
// (Fase 22, entrega 5b). Lógica pura, sem tela: o desenho em DOM mora em
// central-ajuda.js.
//
// Por que existe: a resposta do FAQ era um texto corrido num único <p>, e as
// respostas longas viravam um bloco cansativo e assustador ao abrir. Agora
// `resposta` continua sendo uma string (os dados e a busca não mudam de
// forma), mas ela aceita uma marcação mínima:
//
//   linha em branco      separa parágrafos
//   "- item"             linhas seguidas viram uma lista
//   "## Título"          subtítulo curto (uma linha) dentro da resposta
//   "**negrito**"        destaque de termo
//   "_itálico_"          ênfase leve (só vale com borda de palavra, então
//                        nome_com_sublinhado nunca vira itálico)
//   "`código`"           trecho literal: nada dentro dele é interpretado
//
// Texto sem nenhuma marca vira um parágrafo só, igual a antes. Nunca
// interpreta HTML: o desenho usa textContent.
// ============================================================

// Quebra a resposta em blocos: { tipo: 'p', texto } | { tipo: 'ul', itens }
// | { tipo: 'h', texto }.
export function blocosDaResposta(texto) {
    const blocos = [];
    const partes = String(texto ?? '')
        .replace(/\r\n?/g, '\n')
        .split(/\n\s*\n/);
    for (const parte of partes) {
        let corrente = null; // lista ou parágrafo em montagem
        const fechar = () => {
            if (corrente) blocos.push(corrente);
            corrente = null;
        };
        for (const bruta of parte.split('\n')) {
            const linha = bruta.trim();
            if (!linha) continue;
            const item = /^-\s+(.*)$/.exec(linha);
            const titulo = /^##\s+(.*)$/.exec(linha);
            if (titulo) {
                fechar();
                blocos.push({ tipo: 'h', texto: titulo[1] });
            } else if (item) {
                if (corrente?.tipo !== 'ul') {
                    fechar();
                    corrente = { tipo: 'ul', itens: [] };
                }
                corrente.itens.push(item[1]);
            } else if (corrente?.tipo === 'ul') {
                // linha de continuação de um item da lista
                corrente.itens[corrente.itens.length - 1] += ` ${linha}`;
            } else {
                if (corrente?.tipo !== 'p') {
                    fechar();
                    corrente = { tipo: 'p', texto: '' };
                }
                corrente.texto += corrente.texto ? ` ${linha}` : linha;
            }
        }
        fechar();
    }
    return blocos;
}

// Quebra uma linha em trechos: { texto, estilo } com estilo 'b' (negrito),
// 'i' (itálico), 'code' ou null. O código é separado primeiro, para o que
// está entre crases nunca ser lido como negrito ou itálico.
export function trechosDaLinha(texto) {
    const trechos = [];
    const empurrar = (t, estilo) => {
        if (t) trechos.push({ texto: t, estilo });
    };
    const fora = (t) => {
        const re = /\*\*(\S(?:[^*]*?\S)?)\*\*|(?<![\w])_(\S(?:[^_]*?\S)?)_(?![\w])/g;
        let ultimo = 0;
        for (const m of t.matchAll(re)) {
            empurrar(t.slice(ultimo, m.index), null);
            if (m[1] !== undefined) empurrar(m[1], 'b');
            else empurrar(m[2], 'i');
            ultimo = m.index + m[0].length;
        }
        empurrar(t.slice(ultimo), null);
    };
    const re = /`([^`]+)`/g;
    let ultimo = 0;
    for (const m of String(texto ?? '').matchAll(re)) {
        fora(String(texto).slice(ultimo, m.index));
        empurrar(m[1], 'code');
        ultimo = m.index + m[0].length;
    }
    fora(String(texto ?? '').slice(ultimo));
    return trechos;
}

// A resposta sem marcas, em texto corrido: é o que a busca da Central lê.
// O código fica sem as crases (a busca já ignora pontuação nos termos que
// o texto traz) e o negrito e o itálico ficam sem os sinais.
export function respostaSemMarcas(texto) {
    return blocosDaResposta(texto)
        .map((b) => {
            const linhas = b.tipo === 'ul' ? b.itens : [b.texto];
            return linhas
                .map((l) =>
                    trechosDaLinha(l)
                        .map((t) => t.texto)
                        .join(''),
                )
                .join(' ');
        })
        .join(' ');
}
