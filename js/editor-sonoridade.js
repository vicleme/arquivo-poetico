// Editor visual da Aba Sonoridade (Aba_Sonoridade.md, seção 3.1 e 3.2) —
// Bloco 2 completo:
// - passos 1-2: grade de sílabas com numeração de linha, régua no topo,
//   divisão silábica direto no texto por meio de `/`, e Modo Sílaba
//   Tônica (clicar numa célula de sílaba real pra marcar/desmarcar o
//   acento — `linha.tonicas`, array de índices de sílaba, um por linha
//   de verso).
// - passo 3 (Mapeamento de Rimas, seção 3.2), sub-passo 1 (estrutura do
//   par + atribuição automática de letras): Modo Rima, mutuamente
//   exclusivo com Modo Tônica. Gesto (alinhado com o Victor): clicar
//   numa sílaba abre o lado A do par; shift-clique estende o lado A pra
//   mais de uma sílaba (rima rica); clicar numa sílaba de outro verso
//   abre o lado B; shift-clique estende o lado B do mesmo jeito; nada se
//   fecha sozinho — precisa do botão "Confirmar par" (ou "Cancelar
//   seleção" pra desistir). Cada par confirmado vira uma entrada em
//   `rimasAtuais` (`{ id, a: { linha, silabas }, b: { linha, silabas } }`,
//   índices 0-based de linha/sílaba); a letra (A, B, C...) no fim de
//   cada verso é sempre derivada dos pares na hora de renderizar
//   (calcularLetrasRima), nunca salva — um verso só ganha letra se
//   participar de pelo menos um par, e versos transitivamente ligados
//   (ex.: verso 1↔2 e 2↔3) compartilham a mesma letra, cobrindo
//   monorrima (AAAA) sem precisar de um conceito de "grupo" separado de
//   par. Estilização visual (sub-passo 2, spec 3.2): cada sílaba que
//   participa de um par confirmado ganha um contorno colorido (ring),
//   uma cor por LETRA do esquema — não por par — pra grupos transitivos
//   (monorrima) saírem com a mesma cor; a coluna "Rima" no fim do verso
//   usa a mesma cor no texto da letra (ver PALETA_RIMA/corDaLetra). O
//   destaque de seleção em curso (azul/lado A, roxo/lado B) tem
//   prioridade visual sobre a cor de um par já confirmado na mesma
//   célula. Sub-passo 3 (Classificação de cada par, 4 eixos — Posição
//   derivada automaticamente do próprio par, sem input nem campo
//   salvo; Acentuação/Tonalidade/Riqueza por select fechado, ver
//   ACENTUACOES_RIMA/TONALIDADES_RIMA/RIQUEZAS_RIMA em utils.js) e o
//   esqueleto do painel consolidado (sub-passo 4 — seção "Pares de
//   Rima", lista de cartões logo abaixo da grade) também já estão
//   implementados: a lista já absorve remoção (com "Desfazer" em
//   toast, ver removerParRima) e correção/reatribuição de lado (reabre
//   o par em selecaoRima, ver iniciarCorrecaoPar), cobrindo de uma vez
//   os itens que estavam na fila como "remoção rápida" e "painel
//   consolidado" separados. O painel pode crescer mais adiante com
//   outros dados ainda não desenhados, a partir dessa mesma lista.
//   Sub-passo 5 (Proximidade — Vizinha/Distante, mesmo espírito de
//   Posição: nunca selecionado nem salvo, sempre derivado do próprio
//   par via calcularDistanciaPar/calcularProximidadePar, distância em
//   DISTANCIA_VIZINHO_MAXIMA/utils.js) e o resumo em renderResumoPares
//   (contagem final Vizinhas/Distantes com o rótulo do poema, mais uma
//   linha de contagem por valor pra cada um dos outros 3 eixos —
//   Acentuação/Tonalidade/Riqueza — e também pra Posição, ver
//   EIXOS_CLASSIFICACAO_PAR/calcularTalyPorEixo) também já estão
//   implementados, no cabeçalho da seção "Pares de Rima".
//
// Estado (`linhasAtuais`, `rimasAtuais`) mora neste módulo, não em
// forms.js — é mutado a cada tecla digitada (ver onInputTexto) ou clique
// de sílaba (ver onCliqueCelula), não só ao abrir/salvar o modal.
// forms.js só lê o resultado final via obterLinhasSonoridade() e
// obterRimasSonoridade() na hora de salvar. `containerEl` guarda o
// container passado a inicializarGradeSonoridade() pra
// reconstruirColunas() não precisar recebê-lo em toda chamada (ela roda
// a cada tecla). `modoTonico`/`modoRima`/`selecaoRima` também moram
// aqui, não em linhasAtuais/rimasAtuais — são estado de edição da sessão
// do modal, não dado salvo.

import {
    escapeHtml,
    gerarId,
    mostrarAvisoComAcao,
    ACENTUACOES_RIMA,
    TONALIDADES_RIMA,
    RIQUEZAS_RIMA,
    DISTANCIA_VIZINHO_MAXIMA,
    TIPOS_ECO_SONORO,
    PES_METRICOS,
    parseListaIntervalos,
    limparElementosHtmlLinha,
    classificarTonicidade,
    SILABAS_APOS_TONICA,
} from './utils.js';
import { db } from './db.js';

let linhasAtuais = [];
let rimasAtuais = [];
// Ecos Sonoros — "quase-rima intencional" (Aba_Sonoridade.md não previa
// isso; adicionado a pedido do Victor): mesma forma de par de
// rimasAtuais (`{ id, a: { linha, silabas }, b: { linha, silabas },
// tipo }`), reaproveitando calcularPosicaoPar/calcularDistanciaPar/
// calcularProximidadePar (genéricas, não dependem de ser rima "de
// verdade"). Sem esquema de letras (A/B/C...) — eco não é rima
// estrutural, então não faz sentido "grupo" nenhum aqui; todo eco usa a
// mesma marcação visual neutra (contorno tracejado, ver PALETA_ECO
// abaixo). `tipo` é campo livre (não select fechado — ver TIPOS_ECO_SONORO em
// utils.js), mesmo padrão das Anotações Marginais/Intertextualidade.
let ecosAtuais = [];
let containerEl = null;
let modoTonico = false;
// Pé Métrico selecionado na Meta Estrutural do modal (fora do estado
// salvo em rimasAtuais/ecosAtuais — não pertence à escansão em si, só
// entra aqui pra alimentar celulasDivergentesPeMetrico ao desenhar a
// grade). Atualizado ao vivo por atualizarPeMetricoSonoridade(), mesmo
// padrão de atualizarAlvoGradeMolde() em editor-molde.js — não exige
// reabrir o modal quando o Victor troca o Pé Métrico no meio da
// escansão.
let peMetricoAtual = '';
// Mesmo padrão de peMetricoAtual acima, agora pro Tamanho do Verso: fora
// do estado salvo em linhasAtuais (não é campo da escansão em si), só
// entra aqui pra alimentar extrairAlvo/calcularDivergenciaSilabas ao
// desenhar a coluna "Cont." (ver reconstruirColunas). Atualizado ao vivo
// por atualizarTamanhoVersoSonoridade() — mesma complementaridade que
// editor-molde.js já tinha (atualizarAlvoGradeMolde/tamanhoVersoAtual),
// trazida agora pra Sonoridade.
let tamanhoVersoAtual = '';
let modoRima = false;
let modoEco = false;
// Par de rima em construção: { ladoA: { linhaIdx, silabas: [...] },
// ladoB: { linhaIdx, silabas: [...] } | null }. null enquanto não há
// seleção nenhuma (nem o primeiro clique do lado A ainda).
let selecaoRima = null;
// Mesma forma de selecaoRima, só que para o Modo Eco — os dois nunca
// coexistem (Modo Tônica/Modo Rima/Modo Eco são mutuamente exclusivos,
// só um ligado por vez).
let selecaoEco = null;
// Estado (aberto/fechado) dos grupos colapsáveis "Grade Silábica" (modos +
// quadro), "Pares de Rima" e "Ecos Sonoros" dentro da grade — como
// renderGrade() recria o innerHTML inteiro a cada ação (confirmar/remover
// par ou eco, alternar modo...), sem isso o <details> voltaria a abrir a
// cada re-render, mesmo que o usuário tivesse acabado de fechar pra pular
// direto pra seção seguinte (ver os listeners de 'toggle' logo depois do
// innerHTML, dentro da própria renderGrade()). Vive só na sessão do
// modal, não persiste entre poemas — cada abertura começa com os três
// abertos.
let abertoGrade = true;
let abertoParesRima = true;
let abertoEcosSonoros = true;

// ─── Ecos Sonoros — preferência persistida "Mostrar Ecos Sonoros" ────
// Um único boolean (localStorage, não estado de sessão do modal) lido
// nos três lugares que precisam saber se a marcação de eco deve
// aparecer: grade do editor, grade de leitura (renderGradeLeituraHtml)
// e exportação (exportar-sonoridade.js) — decisão confirmada com o
// Victor: dois controles separados (visualização x impressão) podiam
// ficar dessincronizados, um boolean só é mais simples e previsível.
// Começa LIGADO por padrão (decisão confirmada: "aparece assim que eu
// marcar ecos"). Guardado com try/catch porque testes (Node/happy-dom)
// podem rodar sem localStorage disponível — nesse caso, sempre "ligado".
const CHAVE_MOSTRAR_ECOS = 'arquivo-poetico:mostrar-ecos-sonoros';

export function mostrarEcosAtivo() {
    try {
        const valor = window.localStorage?.getItem(CHAVE_MOSTRAR_ECOS);
        return valor === null || valor === undefined ? true : valor === '1';
    } catch {
        return true;
    }
}

export function definirMostrarEcos(ativo) {
    try {
        window.localStorage?.setItem(CHAVE_MOSTRAR_ECOS, ativo ? '1' : '0');
    } catch {
        // sem localStorage disponível (ex. alguns ambientes de teste) — a
        // preferência simplesmente não persiste entre sessões, mas não
        // quebra a marcação/desmarcação dentro da sessão atual.
    }
}

// Remove só a marcação de ênfase (**negrito**/_itálico_) do texto do poema
// — a escansão trabalha com o conteúdo fonético do verso, não com os
// símbolos de formatação (ver realcarEnfaseMarkdown em visualizar.js pro
// correspondente do lado da exibição/leitura).
function removerMarcacaoMarkdown(texto) {
    return (texto || '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/_(.+?)_/g, '$1');
}

// A partir do texto bruto de um poema (db.poemas), monta a estrutura
// inicial de linhas: uma entrada por linha do texto, numerando só os
// versos — linhas vazias/quebras de estrofe ficam sem número, mas
// continuam ocupando uma linha na grade (spec 3.1: "Numeração de Linhas
// ... ignorando linhas vazias/quebras de estrofe").
// `linhasIgnoradasStr` (opcional): string do campo "Linhas a ignorar"
// (ver parseListaIntervalos em utils.js) — linhas listadas ali (ex.:
// título digitado no campo Texto só pra registrar recurso gráfico) são
// removidas ANTES de tudo, como se não existissem no poema; não geram
// nem linha 'vazia' na grade. Numeração de verso segue contígua sobre
// o que sobrou. Cada linha também passa por limparElementosHtmlLinha
// antes da remoção de marcação markdown, pra comentário HTML não
// entrar e <div>/outra tag sumir sem levar o conteúdo junto.
export function construirLinhasIniciais(textoPoema, linhasIgnoradasStr = '') {
    const linhasIgnoradas = parseListaIntervalos(linhasIgnoradasStr);
    const brutas = (textoPoema || '').split('\n');
    let numero = 0;
    const resultado = [];
    brutas.forEach((linhaBruta, idx) => {
        if (linhasIgnoradas.has(idx + 1)) return;
        const semHtml = limparElementosHtmlLinha(linhaBruta);
        const semMarcacao = removerMarcacaoMarkdown(semHtml).trim();
        if (semMarcacao === '') {
            resultado.push({ tipo: 'vazia' });
            return;
        }
        numero += 1;
        // Qualquer barra já presente no texto original do poema (marcação
        // gráfica, ex. "pós-p/a/r/t/i/d/a") é escapada aqui, na entrada —
        // sem isso o verso nasceria "pré-dividido" pela pontuação do
        // próprio poema, em vez de virar célula única como o resto desta
        // função documenta. Ver dividirSilabas() logo abaixo pro outro
        // lado do mesmo escape (`\/` não divide, só `/` divide).
        resultado.push({ tipo: 'verso', numero, texto: semMarcacao.replace(/\//g, '\\/') });
    });
    return resultado;
}

// Divide um verso em sílabas pela barra `/` digitada pelo usuário — sem
// barra nenhuma, o verso inteiro vira uma "sílaba" só (célula única), até
// o usuário começar a dividir.
//
// Barra escapada `\/` NÃO divide — é barra de conteúdo do poema (recurso
// gráfico, ex. "pós-p/a/r/t/i/d/a"), preservada como caractere normal
// dentro da sílaba. construirLinhasIniciais() já escapa automaticamente
// toda barra que vem do texto original do poema; a partir daí, qualquer
// `/` sem escape que aparecer no campo é divisão real (digitada pelo
// usuário na própria grade, ou colada de novo sem querer). Pra incluir
// à mão uma barra literal numa sílaba editada depois, digite `\/`.
//
// Hífen ortográfico (ênclise/mesóclise, palavras compostas — ex.:
// "dize-me", "guarda-chuva") não tem peso métrico, igual espaço: o
// caractere é apagado de cada segmento, não só normalizado nas pontas.
// Isso vale em qualquer posição dentro da sílaba ("ze-", "-me", "ze-me"
// todos viram "ze"/"me" sem hífen) — inclusive quando o hífen fica
// isolado entre duas barras (`ze/-/me`), caso em que o segmento sobra
// vazio e a célula passa a ser tratada como não-real pelo `ehReal` de
// reconstruirColunas(), mesmo caminho já usado pra barra dupla (`//`).
// Exportada — reaproveitada tanto pela visualização somente-leitura
// (renderGradeLeituraHtml, abaixo) quanto pelos exportadores md/pdf/docx
// (exportar-sonoridade.js), que precisam da mesma divisão silábica pra
// não divergir do que a grade de edição mostra.
export function dividirSilabas(texto) {
    return (texto || '')
        .split(/(?<!\\)\//)
        .map((s) => s.replace(/\\\//g, '/').replace(/-/g, '').trim());
}

// ─── Contagem MÉTRICA (corte na última sílaba tônica) ────────────────
// Contraparte de dividirSilabas() acima: NÃO muda a divisão gramatical
// (o array continua com todas as sílabas, inclusive átonas finais —
// ver comentário de dividirSilabas) — só conta até a última sílaba
// TÔNICA do verso, inclusive, que é o número que vale pra métrica em
// português. classificarTonicidade (utils.js) resolve isso pela última
// palavra do verso, via regras de acentuação — não pela divisão manual
// da grade (ver limitações documentadas lá). Exportada com `texto`
// como parâmetro, mesmo motivo de calcularMaxSilabas/
// calcularDivergenciaSilabas: testável sem montar DOM.
export function calcularContagemMetrica(texto) {
    const silabas = dividirSilabas(texto).filter((s) => s !== '');
    if (!silabas.length) return 0;
    // As barras de divisão são só marcação da grade — pra achar a
    // ÚLTIMA PALAVRA de verdade do verso, primeiro remonta o texto sem
    // elas (barra real, não a escapada `\/`, que é conteúdo literal).
    const textoSemBarras = (texto || '').replace(/(?<!\\)\//g, '');
    const match = /[A-Za-zÀ-ÖØ-öø-ÿ]+$/.exec(textoSemBarras.trim());
    const ultimaPalavra = match ? match[0] : '';
    const tonicidade = classificarTonicidade(ultimaPalavra);
    const aposTonica = tonicidade ? SILABAS_APOS_TONICA[tonicidade] : 0;
    return Math.max(1, silabas.length - aposTonica);
}

// Exportada separada de maxSilabas() (que lê o estado do módulo) pra dar
// pra testar com um array de linhas qualquer, sem precisar montar DOM.
export function calcularMaxSilabas(linhas) {
    const contagens = linhas
        .filter((l) => l.tipo === 'verso')
        .map((l) => dividirSilabas(l.texto).length);
    return Math.max(1, ...contagens, 0);
}

function maxSilabas() {
    return calcularMaxSilabas(linhasAtuais);
}

// Extrai o número-alvo de sílabas do rótulo de Tamanho do Verso (ex.:
// "Decassílabo (10)" → 10), ou null pra rótulo sem número fixo
// (Bárbaro, Múltiplos Metros, Variável, ou nenhum tamanho escolhido
// ainda). Movida de editor-molde.js (onde era função interna,
// não-exportada) pra cá e exportada, porque calcularDivergenciaSilabas
// logo abaixo fazia a MESMA extração duplicada inline em vez de chamar
// esta função — as duas vivem no mesmo módulo agora, sem motivo pra
// repetir a regex. editor-molde.js importa esta função em vez de
// definir a própria.
export function extrairAlvo(tamanhoVerso) {
    const match = /\((\d+)\)/.exec(tamanhoVerso || '');
    return match ? parseInt(match[1], 10) : null;
}

// Regra adicional 3 do Bloco 3 (Aba_Sonoridade.md, seção 5) — segunda
// metade, "divergência de sílabas": só faz sentido quando o poema é
// Isométrico (regularidadeMetrica), caso em que TODO verso deveria ter
// o mesmo número de sílabas MÉTRICAS — daí compara contra um único
// valor esperado (extrairAlvo, acima) em vez de against um intervalo.
// Usa calcularContagemMetrica (corte na última tônica), não a contagem
// gramatical bruta — sem isso, versos terminados em palavra paroxítona/
// proparoxítona disparavam falso positivo aqui, com 1-2 sílabas
// "sobrando" que gramaticalmente existem mas não contam pra métrica.
// Retorna a lista de números de linha (1-based, o mesmo `numero` salvo
// em cada linha) que divergem, ou array vazio se não há divergência/o
// rótulo não tem número fixo. Pura (recebe `linhas`, não lê o estado do
// módulo) pelo mesmo motivo de calcularMaxSilabas/calcularPosicaoPar:
// testável sem montar DOM.
export function calcularDivergenciaSilabas(linhas, tamanhoVerso) {
    const esperado = extrairAlvo(tamanhoVerso);
    if (esperado === null) return [];
    return linhas
        .filter((l) => l.tipo === 'verso')
        .filter((l) => calcularContagemMetrica(l.texto) !== esperado)
        .map((l) => l.numero);
}

// ─── Aviso não-bloqueante + correção assistida: dígrafo dividido ─────
// (-rr-/-ss-). Na convenção métrica de escansão, "rr" e "ss" não se
// separam em sílabas diferentes (diferente da separação gramatical de
// escola, que SEPARA — "car-ro", não "ca-rro"). Nada impede o usuário
// de colocar uma barra `/` bem no meio de um desses dígrafos ao dividir
// a grade. Correção de curso (pedido do Victor depois de usar a
// primeira versão só-aviso-ao-salvar: contraintuitivo ter que decorar/
// anotar quais versos corrigir depois) — revoga a decisão original de
// "nunca autocorrige" (ver manutencao/decisoes.md): agora a célula
// errada é destacada AO VIVO na própria grade (reconstruirColunas,
// mesmo padrão de celulasDivergentesPeMetrico) e um clique nela (ou no
// botão "Corrigir todos") mescla a divisão de volta automaticamente.
// O aviso ao salvar (calcularVersosComDigrafoDividido, forms.js)
// continua existindo — pega o que passar batido sem ter sido corrigido
// na grade.
//
// indicesDigrafoDivididoNoTexto: olha o TEXTO original (antes de
// dividirSilabas), procurando toda barra REAL (não escapada por `\/`,
// ver dividirSilabas acima) com a mesma letra "r" ou "s" dos dois lados
// — adjacência direta já garante que estão dentro da mesma palavra (um
// limite de palavra real teria espaço ou pontuação entre as letras,
// nunca a letra repetida colada). Devolve os ÍNDICES (0-based, contando
// só barras reais) de cada ocorrência — não só se existe ou não — pra
// dar pra apontar exatamente qual barra remover na hora de mesclar.
export function indicesDigrafoDivididoNoTexto(texto) {
    const t = texto || '';
    const indices = [];
    let indiceBarra = -1;
    for (let i = 0; i < t.length; i++) {
        if (t[i] !== '/' || t[i - 1] === '\\') continue;
        indiceBarra++;
        const antes = t[i - 1]?.toLowerCase();
        const depois = t[i + 1]?.toLowerCase();
        if (antes && antes === depois && (antes === 'r' || antes === 's')) {
            indices.push(indiceBarra);
        }
    }
    return indices;
}

// Exportada separada de indicesDigrafoDivididoNoTexto pelo mesmo motivo
// de sempre: testável direto, sem montar DOM. Mantida (não só o array)
// porque é a forma mais simples de usar num `.filter()`.
export function digrafoDivididoNoTexto(texto) {
    return indicesDigrafoDivididoNoTexto(texto).length > 0;
}

// Contraparte de calcularDivergenciaSilabas em formato (lista de
// `linha.numero`), pro mesmo consumo em forms.js (aviso não-bloqueante
// ao salvar) — ver salvarSonoridade.
export function calcularVersosComDigrafoDividido(linhas) {
    return linhas
        .filter((l) => l.tipo === 'verso')
        .filter((l) => digrafoDivididoNoTexto(l.texto))
        .map((l) => l.numero);
}

// Remove a N-ésima barra REAL (0-based) do texto, deixando escapadas
// (`\/`) e o resto do texto intocados.
export function removerBarraDivisoria(texto, indiceBarra) {
    const t = texto || '';
    let contador = -1;
    for (let i = 0; i < t.length; i++) {
        if (t[i] !== '/' || t[i - 1] === '\\') continue;
        contador++;
        if (contador === indiceBarra) return t.slice(0, i) + t.slice(i + 1);
    }
    return t;
}

// Corrige um dígrafo dividido DESLOCANDO a barra pra ANTES da letra
// repetida, em vez de apagá-la (o que fundiria as duas sílabas
// inteiras numa só — ERRADO, era o bug: "Sor/ri/so" virava "Sorri/so").
// Só a letra do dígrafo que está na sílaba anterior avança pra sílaba
// seguinte; é essa letra (repetida do outro lado da barra) que forma
// o dígrafo, não a sílaba inteira. Ex.: "Sor/ri/so" -> "So/rri/so".
// Usada por mesclarDigrafoSemRender no lugar de removerBarraDivisoria.
export function deslocarBarraDigrafo(texto, indiceBarra) {
    const t = texto || '';
    let contador = -1;
    for (let i = 0; i < t.length; i++) {
        if (t[i] !== '/' || t[i - 1] === '\\') continue;
        contador++;
        if (contador === indiceBarra) {
            // t[i-1] é a letra do dígrafo do lado da sílaba anterior —
            // move ela pra depois da barra, deixando a barra uma
            // posição antes de onde estava.
            return t.slice(0, i - 1) + '/' + t[i - 1] + t.slice(i + 1);
        }
    }
    return t;
}

// Mapa `${linhaIdx}:${silabaIdx}` → índice da barra (o mesmo consumido
// por deslocarBarraDigrafo) pras DUAS células vizinhas de cada
// dígrafo dividido (a de antes e a de depois da barra) — mesmo formato
// de celulasDivergentesPeMetrico/celulasComEco, consumido por
// reconstruirColunas pra destacar e tornar clicável.
export function celulasComDigrafoDividido(linhas) {
    const mapa = new Map();
    linhas.forEach((linha, idx) => {
        if (linha.tipo !== 'verso') return;
        indicesDigrafoDivididoNoTexto(linha.texto).forEach((barraIdx) => {
            mapa.set(`${idx}:${barraIdx}`, barraIdx);
            mapa.set(`${idx}:${barraIdx + 1}`, barraIdx);
        });
    });
    return mapa;
}

// Total de ocorrências (não de linhas — uma linha pode ter mais de uma)
// no poema inteiro, pro aviso em lote na barra de ferramentas.
export function contarDigrafosDivididos(linhas) {
    return linhas
        .filter((l) => l.tipo === 'verso')
        .reduce((soma, l) => soma + indicesDigrafoDivididoNoTexto(l.texto).length, 0);
}

// Mutação pura (sem tocar DOM) — reaproveitada tanto por
// mesclarDigrafoDividido (uma ocorrência, clique na célula) quanto por
// mesclarTodosDigrafosDivididos (todas de uma vez, botão da barra).
// Mesmo tratamento de tonicas que onInputTexto já dá a uma edição
// manual de texto que encolhe o verso (trunca em vez de remapear —
// consistente com o resto do editor, não é limitação nova só daqui).
function mesclarDigrafoSemRender(linha, indiceBarra) {
    linha.texto = deslocarBarraDigrafo(linha.texto, indiceBarra);
    if (Array.isArray(linha.tonicas)) {
        const totalSilabas = dividirSilabas(linha.texto).length;
        linha.tonicas = linha.tonicas.filter((i) => i < totalSilabas);
    }
}

// Sincroniza de volta o <div contenteditable> daquela linha (que
// reconstruirColunas() nunca toca, ver comentário dela) — sem isso, o
// texto exibido no campo editável ficaria com a barra antiga enquanto
// as células de sílaba já mostrariam a versão mesclada.
function sincronizarCampoTexto(linhaIdx, texto) {
    const el = containerEl?.querySelector(`.son-linha-texto[data-idx="${linhaIdx}"]`);
    if (!el) return;
    el.textContent = texto;
    realcarBarras(el);
}

// Mescla UMA ocorrência (clique na célula destacada em rosa) — ver
// onCliqueCelula, ramo de prioridade no topo.
export function mesclarDigrafoDividido(linhaIdx, indiceBarra) {
    const linha = linhasAtuais[linhaIdx];
    if (!linha) return;
    mesclarDigrafoSemRender(linha, indiceBarra);
    sincronizarCampoTexto(linhaIdx, linha.texto);
    reconstruirColunas();
    renderizarListaRimas();
}

// Mescla TODAS as ocorrências do poema inteiro de uma vez (botão
// "Corrigir todos" no aviso em lote). Reprocessa índices a cada
// remoção — remover uma barra desloca os índices das barras seguintes
// da mesma linha, então reler é mais simples e mais seguro do que
// tentar calcular o deslocamento na mão.
export function mesclarTodosDigrafosDivididos() {
    linhasAtuais.forEach((linha, idx) => {
        if (linha.tipo !== 'verso') return;
        let indices = indicesDigrafoDivididoNoTexto(linha.texto);
        while (indices.length) {
            mesclarDigrafoSemRender(linha, indices[0]);
            indices = indicesDigrafoDivididoNoTexto(linha.texto);
        }
        sincronizarCampoTexto(idx, linha.texto);
    });
    reconstruirColunas();
    renderizarListaRimas();
}

// `linha.tonicas` só existe depois do primeiro clique numa sílaba —
// linhas vindas de construirLinhasIniciais() ou de uma escansão salva
// antes deste passo não têm o campo. Cria na hora, não antecipadamente,
// pra não sujar o schema de toda linha só por existir a feature.
function garantirTonicas(linha) {
    if (!Array.isArray(linha.tonicas)) linha.tonicas = [];
    return linha.tonicas;
}

// ─── Mapeamento de Rimas — atribuição automática de letras ─────────
// Union-Find simples sobre índice de linha (verso): cada par confirmado
// une os dois versos num mesmo grupo, então uma monorrima (verso 1↔2,
// 2↔3, 3↔4) cai no mesmo grupo mesmo sem um par direto 1↔4. Grupos
// ganham letra A/B/C... na ordem de qual verso mais cedo no poema
// pertence a cada grupo — não na ordem em que os pares foram criados,
// pra não depender de o Victor ter mapeado o poema de cima pra baixo.
// Exportada (não lida do estado do módulo) pelo mesmo motivo de
// calcularMaxSilabas: testável com um array de rimas qualquer.
export function calcularLetrasRima(rimas) {
    const pai = new Map();
    function raiz(x) {
        if (!pai.has(x)) pai.set(x, x);
        let atual = x;
        while (pai.get(atual) !== atual) atual = pai.get(atual);
        pai.set(x, atual);
        return atual;
    }
    function unir(a, b) {
        const ra = raiz(a);
        const rb = raiz(b);
        if (ra !== rb) pai.set(ra, rb);
    }
    rimas.forEach((r) => unir(r.a.linha, r.b.linha));

    const grupos = new Map(); // raiz final -> [linhaIdx, ...]
    for (const linha of pai.keys()) {
        const r = raiz(linha);
        if (!grupos.has(r)) grupos.set(r, []);
        grupos.get(r).push(linha);
    }
    const gruposEmOrdem = [...grupos.values()].sort((g1, g2) => Math.min(...g1) - Math.min(...g2));

    const letraPorLinha = new Map();
    gruposEmOrdem.forEach((grupo, i) => {
        const letra = String.fromCharCode(65 + i); // A, B, C... (>26 grupos rimados não é cenário realista pra um poema)
        grupo.forEach((linha) => letraPorLinha.set(linha, letra));
    });
    return letraPorLinha;
}

// ─── Mapeamento de Rimas — estilização visual (spec 3.2) ────────────
// "O contorno (borda) das células mapeadas ganha uma cor destacada
// (diferente da cor de fundo usada nas sílabas tônicas, evitando
// conflito visual)" — por isso ring (borda), nunca background, nas
// células de rima. Uma cor por LETRA do esquema (não por par), pra
// pares que compartilham grupo por transitividade (monorrima) saírem
// com a mesma cor — reforça visualmente a mesma leitura que a coluna
// "Rima" já dá em texto. Paleta deliberadamente sem azul/roxo (usados
// pelo destaque de seleção em curso, ver emLadoA/emLadoB em
// reconstruirColunas) nem âmbar (fundo da tônica), pra nunca colidir
// com os dois.
const PALETA_RIMA = ['rose', 'emerald', 'cyan', 'fuchsia', 'lime', 'teal', 'orange', 'indigo'];

// Exportada pelo mesmo motivo de dividirSilabas acima — a visualização
// somente-leitura e os exportadores precisam da mesma cor por letra de
// esquema que a grade de edição usa, pra não divergir visualmente.
export function corDaLetra(letra) {
    // Inverso de letraEsperadaDeIndice (bijective base-26): decodifica a
    // letra inteira, não só o 1º caractere — 'A' -> 0, 'Z' -> 25,
    // 'AA' -> 26, 'AB' -> 27... Ler só charCodeAt(0) (versão antiga)
    // faria 'A' e 'AA' caírem na mesma cor, o que reintroduziria a
    // confusão entre ciclos que letraEsperadaDeIndice foi criada pra
    // evitar.
    let n = 0;
    for (const c of letra) {
        n = n * 26 + (c.charCodeAt(0) - 65 + 1);
    }
    const indice = n - 1;
    return PALETA_RIMA[((indice % PALETA_RIMA.length) + PALETA_RIMA.length) % PALETA_RIMA.length];
}

// ─── Molde — letra de rima ESPERADA (derivada do esquema, sem pares
// confirmados) ───────────────────────────────────────────────────────
// Contraparte de calcularLetrasRima acima, só que pro sentido inverso do
// Molde: lá a letra vem de pares que o Victor clicou (o texto já existe,
// a letra é constatação); aqui não existe nenhum par ainda — a letra é
// só o rótulo de posição que o esquema declarado (esquemaRimasPresenca +
// esquemaRimasPadrao) preveria pra cada verso, recalculada ao vivo, nunca
// salva (mesmo espírito não-salvo de tamanhoVerso/peMetrico no Molde —
// ver manutencao/criacao-molde.md, Bloco 2). Mora aqui, não em utils.js,
// pelo mesmo motivo de calcularLetrasRima/corDaLetra: reaproveita a
// mesma paleta/leitura visual de letra, então fica junto.
//
// Cada padrão vira um "template" de posições relativas (0-based) dentro
// de UM ciclo — ex. Alternada/Cruzada (ABAB) = [0,1,0,1], 2 letras
// distintas por ciclo. Posições que aparecem só 1 vez dentro do ciclo
// são "soltas" (não têm com quem rimar dentro do próprio padrão, ex. o
// 1º e 3º verso da Quadra ABCB) — ficam SEM letra, mesmo espírito
// não-punitivo do resto do sistema: melhor não mostrar nada do que
// inventar uma expectativa que o próprio nome do padrão não sustenta.
const TEMPLATES_RIMA_ESPERADA = {
    'Emparelhada (AABB)': [0, 0, 1, 1],
    'Alternada / Cruzada (ABAB)': [0, 1, 0, 1],
    'Oposta / Interpolada (ABBA)': [0, 1, 1, 0],
    'Sextilha Aberta (ABCBDB)': [0, 1, 2, 1, 3, 1],
    'Décima Espinela (ABBAACCDDC)': [0, 1, 1, 0, 0, 2, 2, 3, 3, 2],
    'Limerick (AABBA)': [0, 0, 1, 1, 0],
    'Quadra / Rima Simples (ABCB)': [0, 1, 2, 1],
};

// Índice 0-based -> letra, estilo colunas de planilha (bijective base-26):
// A, B, ..., Z, AA, AB, ..., AZ, BA, ..., ZZ, AAA, ... Ao contrário de
// calcularLetrasRima (que assume <=26 grupos rimados como cenário
// realista de um poema), aqui a letra é DECISÃO explícita de nunca
// reiniciar em A (ver item 6, criacao-molde.md) — um wrap silencioso
// pra A depois de Z contradiria essa decisão pra um poema longo o
// bastante (26+ ciclos). Não é base-26 comum porque não há dígito
// "zero": depois de Z (25) o próximo é AA (26), não A0 — por isso o
// "-1"/"+1" abaixo, igual à conversão de coluna do Excel/Sheets.
function letraEsperadaDeIndice(i) {
    let n = i + 1;
    let letra = '';
    while (n > 0) {
        const resto = (n - 1) % 26;
        letra = String.fromCharCode(65 + resto) + letra;
        n = Math.floor((n - 1) / 26);
    }
    return letra;
}

// Decisão do Victor (conversa de planejamento): cada quebra de estrofe
// força um ciclo novo do padrão, com letras SEMPRE avançando (nunca
// reiniciando em A) — mesmo se o ciclo em curso não tiver terminado.
// Motivo: a letra aqui não promete que dois versos vão soar parecido
// (como calcularLetrasRima faria a partir de pares reais confirmados) —
// é só o rótulo de "quais versos, dentro do MESMO bloco, esperam a
// mesma sonoridade entre si". Reiniciar em A a cada estrofe sugeriria
// que a 2ª estrofe deveria soar igual à 1ª, o que não é verdade pra
// nenhum desses padrões — avançar deixa isso explícito. Sem quebra
// nenhuma marcada ainda, o padrão também se repete sozinho a cada N
// versos (N = tamanho do template) — decisão confirmada pelo Victor.
export function calcularLetraRimaEsperada(linhas, esquemaRimasPresenca, esquemaRimasPadrao) {
    const resultado = new Map();
    if (esquemaRimasPresenca !== 'Rimado') return resultado;

    if (esquemaRimasPadrao === 'Monorrima Absoluta (AAAA)') {
        linhas.forEach((linha, idx) => {
            if (linha.tipo === 'verso') resultado.set(idx, 'A');
        });
        return resultado;
    }

    // "AAAA BBBB CCCC" — um bloco = uma estrofe (não um N fixo, já que o
    // próprio nome do padrão não define tamanho de bloco); só quebra de
    // estrofe avança a letra, nunca uma contagem de versos.
    if (esquemaRimasPadrao === 'Monorrima por Blocos / Continuada (AAAA BBBB CCCC)') {
        let bloco = 0;
        linhas.forEach((linha, idx) => {
            if (linha.tipo === 'vazia') {
                bloco += 1;
                return;
            }
            resultado.set(idx, letraEsperadaDeIndice(bloco));
        });
        return resultado;
    }

    // Terza Rima (ABA BCB CDC...) — a rima do meio de um terceto vira a
    // rima externa do próximo (o "encadeamento" que dá nome ao padrão),
    // por isso tem regra própria: avança 1 letra por terceto (não pela
    // contagem de letras distintas do ciclo, que quebraria a cadeia), e
    // ignora quebra de estrofe (o encadeamento é o ponto do padrão —
    // continua mesmo se o Victor separar os tercetos visualmente).
    if (esquemaRimasPadrao === 'Encadeada / Terza Rima (ABA BCB)') {
        let numeroVerso = 0;
        let baseLetra = 0;
        linhas.forEach((linha, idx) => {
            if (linha.tipo !== 'verso') return;
            const posNoTerceto = numeroVerso % 3;
            if (posNoTerceto === 0 && numeroVerso > 0) baseLetra += 1;
            const indiceLetra = posNoTerceto === 1 ? baseLetra + 1 : baseLetra;
            resultado.set(idx, letraEsperadaDeIndice(indiceLetra));
            numeroVerso += 1;
        });
        return resultado;
    }

    const template = TEMPLATES_RIMA_ESPERADA[esquemaRimasPadrao];
    // Sem template fixo (Mista/Completa, Não Aplicável, ou nenhum Padrão
    // ainda escolhido) — não dá pra derivar nada, mapa fica vazio.
    if (!template) return resultado;

    const contagemPorPosicao = new Map();
    template.forEach((i) => contagemPorPosicao.set(i, (contagemPorPosicao.get(i) || 0) + 1));
    const letrasDistintas = Math.max(...template) + 1;

    let posNoCiclo = 0;
    let baseLetra = 0;
    linhas.forEach((linha, idx) => {
        if (linha.tipo === 'vazia') {
            if (posNoCiclo > 0) baseLetra += letrasDistintas;
            posNoCiclo = 0;
            return;
        }
        const relativo = template[posNoCiclo];
        if (contagemPorPosicao.get(relativo) > 1) {
            resultado.set(idx, letraEsperadaDeIndice(baseLetra + relativo));
        }
        posNoCiclo += 1;
        if (posNoCiclo >= template.length) {
            baseLetra += letrasDistintas;
            posNoCiclo = 0;
        }
    });
    return resultado;
}

// Mapa "linhaIdx:silabaIdx" -> letra do esquema, só pras sílabas que de
// fato entram em algum par CONFIRMADO (`rimasAtuais`) — não inclui a
// seleção em curso (essa tem destaque próprio, ver emLadoA/emLadoB).
// `letras` já vem calculada (calcularLetrasRima) pra não recalcular por
// chamada — os dois lados de um par sempre caem no mesmo grupo/letra
// por construção (união no union-find), então usar `r.a.linha` já
// resolve a letra certa pros dois lados.
// Exportada pelo mesmo motivo de dividirSilabas/corDaLetra/trechoLado
// acima — os exportadores em tabela real (.docx/.pdf) precisam do
// mesmo mapa célula→letra que a grade de leitura usa, pra colorir a
// mesma sílaba (não só o verso inteiro) igual à tela.
export function celulasRimadas(rimas, letras) {
    const mapa = new Map();
    rimas.forEach((r) => {
        const letra = letras.get(r.a.linha);
        if (!letra) return;
        r.a.silabas.forEach((s) => mapa.set(`${r.a.linha}:${s}`, letra));
        r.b.silabas.forEach((s) => mapa.set(`${r.b.linha}:${s}`, letra));
    });
    return mapa;
}

// ─── Ecos Sonoros — marcação visual (contorno tracejado) ────────────
// Mapa "linhaIdx:silabaIdx" -> true, só pras sílabas que participam de
// algum eco CONFIRMADO — mesmo espírito de celulasRimadas, mas sem
// letra/cor nenhuma associada (não é grupo, é presença). Exportada pelo
// mesmo motivo de celulasRimadas: os exportadores em tabela real
// (.docx/.pdf) precisam do mesmo mapa célula→eco que a grade usa, pra
// desenhar o mesmo contorno tracejado que a tela mostra.
export function celulasComEco(ecos) {
    const mapa = new Map();
    ecos.forEach((eco) => {
        eco.a.silabas.forEach((s) => mapa.set(`${eco.a.linha}:${s}`, true));
        eco.b.silabas.forEach((s) => mapa.set(`${eco.b.linha}:${s}`, true));
    });
    return mapa;
}

// ─── Pé Métrico — divergência da tônica esperada (Bloco 2 sub-passo 2
// da feature descrita em manutencao/criacao-molde.md) ────────────────
// Gera as posições (1-based, mesma convenção de PES_METRICOS/utils.js)
// que a fórmula de um pé contínuo ocupa dentro de um verso de `total`
// sílabas reais — a fórmula se repete até onde o verso alcança, sem
// depender de nenhum Tamanho do Verso fixo.
function gerarPosicoesContinuas(posicaoInicial, intervalo, total) {
    const posicoes = [];
    for (let p = posicaoInicial; p <= total; p += intervalo) posicoes.push(p);
    return posicoes;
}

// Mapa "linhaIdx:silabaIdx" -> true pras sílabas onde o Pé Métrico
// selecionado esperava tônica e o verso não tem uma marcada ali — mesmo
// formato de celulasRimadas/celulasComEco acima, pra reconstruirColunas()
// consumir do mesmo jeito. Só sinaliza FALTA de tônica esperada; sobrar
// tônica numa posição fora do padrão nunca gera aviso (mesmo espírito
// não-punitivo de calcularDivergenciaSilabas — nenhum destaque impede
// salvar ou digitar). Pé contínuo usa o total de sílabas REAIS de cada
// verso pra repetir a fórmula até onde o verso já alcança (um verso
// ainda curto, no meio da escrita, não é cobrado por uma posição que
// ele ainda nem tem); pé fixo usa só as posições obrigatórias que já
// cabem nesse total, pelo mesmo motivo. `linha.tonicas` ausente conta
// como nenhuma tônica marcada ainda — todo o padrão diverge nesse caso.
// Pura (recebe `linhas` e `peMetrico`, não lê estado do módulo) pelo
// mesmo motivo de calcularMaxSilabas/calcularDivergenciaSilabas: testável
// sem montar DOM.
export function celulasDivergentesPeMetrico(linhas, peMetrico) {
    const mapa = new Map();
    const pe = PES_METRICOS.find((p) => p.rotulo === peMetrico);
    if (!pe) return mapa;
    linhas.forEach((linha, idx) => {
        if (linha.tipo !== 'verso') return;
        const total = dividirSilabas(linha.texto).filter((s) => s !== '').length;
        const tonicas = linha.tonicas || [];
        const esperadas =
            pe.tipo === 'continuo'
                ? gerarPosicoesContinuas(pe.posicaoInicial, pe.intervalo, total)
                : pe.posicoesObrigatorias.filter((p) => p <= total);
        esperadas.forEach((p1based) => {
            const i = p1based - 1;
            if (!tonicas.includes(i)) mapa.set(`${idx}:${i}`, true);
        });
    });
    return mapa;
}

// ─── Mapeamento de Rimas — classificação de cada par (sub-passo 3) ──
// Posição (Externa/Interna) nunca é selecionada nem salva — é sempre
// recalculada a partir do próprio par, mesmo espírito de
// calcularLetrasRima. Um lado é "externo" quando a maior sílaba
// marcada nele é a última sílaba REAL do verso (mesmo critério de
// "real" usado em reconstruirColunas — ehReal: ignora célula de
// preenchimento até a régua do maior verso e sílaba vazia de barra
// dupla/hífen isolado). O par só é Externo se os dois lados forem; um
// único lado interno (ex.: rima de fim de verso ecoando numa palavra
// no meio de outro) já torna o par Interno. Exportada com `linhas`
// como parâmetro (não lida do estado do módulo) pelo mesmo motivo de
// calcularLetrasRima/calcularMaxSilabas: testável com um array
// qualquer, sem precisar montar DOM.
export function calcularPosicaoPar(par, linhas) {
    function ultimaSilabaReal(linhaIdx) {
        const linha = linhas[linhaIdx];
        if (!linha || linha.tipo !== 'verso') return -1;
        const silabas = dividirSilabas(linha.texto);
        for (let i = silabas.length - 1; i >= 0; i--) {
            if (silabas[i] !== '') return i;
        }
        return -1;
    }
    function ladoEhExterno(lado) {
        const ultima = ultimaSilabaReal(lado.linha);
        return ultima !== -1 && Math.max(...lado.silabas) === ultima;
    }
    return ladoEhExterno(par.a) && ladoEhExterno(par.b) ? 'Externa' : 'Interna';
}

// Distância entre os dois versos de um par, em nº de verso (`linha.numero`
// — ignora linhas em branco de quebra de estrofe, então uma estrofe nova
// no meio não infla a distância). Base de calcularProximidadePar logo
// abaixo. Exportada com `linhas` como parâmetro, mesmo motivo de
// calcularPosicaoPar: testável com um array qualquer, sem montar DOM.
export function calcularDistanciaPar(par, linhas) {
    const numA = linhas[par.a.linha]?.numero;
    const numB = linhas[par.b.linha]?.numero;
    if (numA == null || numB == null) return null;
    return Math.abs(numA - numB);
}

// "Vizinha" até DISTANCIA_VIZINHO_MAXIMA versos de distância, "Distante"
// depois disso (ver a constante em utils.js pro porquê do corte) — mesmo
// espírito de calcularPosicaoPar: rótulo sempre derivado na hora de
// renderizar, nunca escolhido nem salvo.
export function calcularProximidadePar(distancia) {
    if (distancia == null) return null;
    return distancia <= DISTANCIA_VIZINHO_MAXIMA ? 'Vizinha' : 'Distante';
}

// Contagem final de pares Vizinhos/Distantes e caracterização do poema
// como um todo a partir dela. Empate (mesmo nº dos dois lados) cai numa
// 3ª categoria ("Com Rimas Equilibradas") em vez de forçar um rótulo pra
// um lado só — nem todo poema tem uma predominância real de proximidade.
// Poema sem par nenhum não recebe rótulo (`rotulo: null`), mesmo espírito
// de um par que ainda não existe não ter Posição. Exportada com `rimas`/
// `linhas` como parâmetros, mesmo motivo das funções acima.
export function calcularClassificacaoSonora(rimas, linhas) {
    let vizinhas = 0;
    let distantes = 0;
    rimas.forEach((par) => {
        const proximidade = calcularProximidadePar(calcularDistanciaPar(par, linhas));
        if (proximidade === 'Vizinha') vizinhas += 1;
        else if (proximidade === 'Distante') distantes += 1;
    });
    let rotulo = null;
    if (vizinhas + distantes > 0) {
        if (vizinhas > distantes) rotulo = 'Com Rimas mais Próximas';
        else if (distantes > vizinhas) rotulo = 'Com Rimas mais Distantes';
        else rotulo = 'Com Rimas Equilibradas';
    }
    return { vizinhas, distantes, rotulo };
}

// Tally por eixo — quantos pares confirmados caem em cada valor de
// Posição/Acentuação/Tonalidade/Riqueza, pro resumo no cabeçalho de
// "Pares de Rima" (renderResumoEixos) e pras colunas de contagem por
// valor em colunas-contagem.js (ex. "Rimas Ricas"). Posição é sempre
// preenchida (calculada, nunca fica vazia); Acentuação/Tonalidade/
// Riqueza são opcionais por par — pares sem valor entram em
// `semClassificar`, não em `valores`, pra não inflar nenhuma contagem
// com um "vazio" disfarçado de categoria.
export function calcularTalyPorEixo(rimas, linhas, extrairValor) {
    const valores = {};
    let semClassificar = 0;
    rimas.forEach((par) => {
        const valor = extrairValor(par, linhas);
        if (!valor) {
            semClassificar += 1;
            return;
        }
        valores[valor] = (valores[valor] || 0) + 1;
    });
    return { valores, semClassificar, total: rimas.length };
}

// Os 4 extratores de valor usados por calcularTalyPorEixo — Posição é
// sempre calculada (calcularPosicaoPar já nunca retorna vazio pra um par
// válido); Acentuação/Tonalidade/Riqueza são o valor salvo no próprio
// par (podem ser undefined). Reunidos aqui pra colunas-contagem.js
// (contagem por valor específico, ex. "quantas rimas são Ricas") usar o
// mesmo extrator do resumo visual, sem duplicar a leitura do campo.
export const EIXOS_CLASSIFICACAO_PAR = {
    posicao: { label: 'Posição', extrairValor: (par, linhas) => calcularPosicaoPar(par, linhas) },
    acentuacao: { label: 'Acentuação', extrairValor: (par) => par.acentuacao },
    tonalidade: { label: 'Tonalidade', extrairValor: (par) => par.tonalidade },
    riqueza: { label: 'Riqueza', extrairValor: (par) => par.riqueza },
};

// Forma curta de um valor de eixo pro resumo/tally (ex. "Pobre (mesma
// classe gramatical)" -> "Pobre"; "Aguda / Oxítona" -> "Aguda"): corta
// no primeiro " (" ou " /", o que vier primeiro — cobre o padrão das 4
// listas fechadas (ACENTUACOES_RIMA/TONALIDADES_RIMA/RIQUEZAS_RIMA, e
// "Externa"/"Interna" que não tem nem um nem outro, então fica como
// está). Puramente de exibição — nunca usada pra comparar/salvar.
export function rotuloCurtoValor(valor) {
    if (!valor) return valor;
    const indices = [valor.indexOf(' ('), valor.indexOf(' /')].filter((i) => i !== -1);
    if (!indices.length) return valor;
    return valor.slice(0, Math.min(...indices));
}

function contarVersos(linhas) {
    return (Array.isArray(linhas) ? linhas : []).filter((l) => l.tipo === 'verso').length;
}

// ASCII sem acento/espaço, só pra montar uma key de objeto/valor de
// <option> estável — puramente mecânico, nunca exibido (ver `label` em
// vez disso).
function chaveSlug(texto) {
    return texto.normalize('NFD').replace(/[^\w]/g, '');
}

// Um campo contável por valor de uma lista fechada (ex. cada item de
// RIQUEZAS_RIMA vira um campo "Rimas <Valor>") — usado por
// CAMPOS_CONTAVEIS_RIMA logo abaixo, pra não escrever os ~12 campos de
// Acentuação/Tonalidade/Riqueza um por um: gera a partir da própria
// lista fechada, então uma opção nova (ex. Idêntica/Homônima que
// acabaram de entrar em RIQUEZAS_RIMA) já aparece automaticamente, sem
// precisar lembrar de atualizar este arquivo também. Todo valor das 3
// listas termina em vogal (Pobre, Rica, Aguda, Soante...), então "+s"
// pluraliza certo pro rótulo em todos os casos — não é uma regra
// genérica de português, só cobre o vocabulário fechado dessas listas.
function camposContaveisPorValor(grupo, lista, campo) {
    return Object.fromEntries(
        lista.map((valor) => {
            const curto = rotuloCurtoValor(valor);
            const chave = `rimas${chaveSlug(grupo)}${chaveSlug(curto)}`;
            return [
                chave,
                {
                    label: `Rimas ${curto}s`,
                    // Subgrupo FINO (Acentuação/Tonalidade/Riqueza), pra
                    // achar rápido em meio às ~18 opções de Rima — o
                    // próprio select de Rima já é separado do de Eco (dois
                    // selects distintos, ver "Contagem de Rimas" x
                    // "Contagem de Ecos" em colunas-contagem.js), então
                    // este `grupo` só precisa diferenciar DENTRO da rima.
                    grupo,
                    contar: (item) =>
                        (item.rimas || []).filter((par) => par[campo] === valor).length,
                },
            ];
        }),
    );
}

// ─── Rima — registro ESTÁTICO (mesmo espírito de CAMPOS_CONTAVEIS em
// utils.js, pra colunas de contagem — ver colunas-contagem.js — mas
// aqui `contar` deriva de `rimas`/`escansaoLinhas` do próprio registro
// de Sonoridade, reaproveitando as mesmas funções do resumo em tela
// (calcularPosicaoPar/calcularProximidadePar/calcularDistanciaPar) pra
// nunca divergir do que a pessoa vê no modal. Vive aqui, não em
// utils.js, pelo mesmo motivo de sempre — utils.js não importa de
// nenhum outro módulo do projeto). Só depende de listas FECHADAS
// (ACENTUACOES_RIMA/TONALIDADES_RIMA/RIQUEZAS_RIMA), por isso pode ser
// uma constante — ao contrário do de Eco logo abaixo, que depende dos
// dados. `grupo` agrupa o seletor de Rima em <optgroup> (Geral/
// Posição/Proximidade/Acentuação/Tonalidade/Riqueza) — preservado à
// parte (pedido do Victor), já que são ~18 opções nesse select sozinho.
export const CAMPOS_CONTAVEIS_RIMA = {
    rimasTotal: {
        label: 'Contagem de Rimas',
        grupo: 'Geral',
        contar: (item) => (item.rimas || []).length,
    },
    rimasProporcao: {
        label: 'Rimas (por verso)',
        grupo: 'Geral',
        contar: (item) => {
            const versos = contarVersos(item.escansaoLinhas);
            // Arredondado a 2 casas — sem isso, a razão de dois inteiros
            // quase sempre vira dízima, e o filtro numérico (>=, <=...)
            // ficaria comparando um valor que a pessoa nunca vê exibido
            // igual na coluna.
            return versos ? Math.round(((item.rimas || []).length / versos) * 100) / 100 : 0;
        },
    },
    rimasExternas: {
        label: 'Rimas Externas',
        grupo: 'Posição',
        contar: (item) =>
            (item.rimas || []).filter(
                (par) => calcularPosicaoPar(par, item.escansaoLinhas) === 'Externa',
            ).length,
    },
    rimasInternas: {
        label: 'Rimas Internas',
        grupo: 'Posição',
        contar: (item) =>
            (item.rimas || []).filter(
                (par) => calcularPosicaoPar(par, item.escansaoLinhas) === 'Interna',
            ).length,
    },
    rimasVizinhas: {
        label: 'Rimas Vizinhas',
        grupo: 'Proximidade',
        contar: (item) =>
            (item.rimas || []).filter(
                (par) =>
                    calcularProximidadePar(calcularDistanciaPar(par, item.escansaoLinhas)) ===
                    'Vizinha',
            ).length,
    },
    rimasDistantes: {
        label: 'Rimas Distantes',
        grupo: 'Proximidade',
        contar: (item) =>
            (item.rimas || []).filter(
                (par) =>
                    calcularProximidadePar(calcularDistanciaPar(par, item.escansaoLinhas)) ===
                    'Distante',
            ).length,
    },
    ...camposContaveisPorValor('Acentuação', ACENTUACOES_RIMA, 'acentuacao'),
    ...camposContaveisPorValor('Tonalidade', TONALIDADES_RIMA, 'tonalidade'),
    ...camposContaveisPorValor('Riqueza', RIQUEZAS_RIMA, 'riqueza'),
};

// ─── Eco — campo por TIPO REALMENTE PRESENTE nos dados ───────────────
// Diferente de Acentuação/Tonalidade/Riqueza (listas FECHADAS — todo
// valor possível já é conhecido de antemão), `tipo` de Eco é campo
// LIVRE (ver TIPOS_ECO_SONORO em utils.js): um eco com um tipo digitado
// fora das 5 sugestões padrão (ex. "eco disperso e tal") precisava
// aparecer como coluna selecionável assim que existir em algum
// registro — senão fica invisível pra quem quer contar/filtrar por ele
// (bug relatado pelo Victor: eco personalizado não ia parar no select
// de Contagem). `escansoes` é o db.escansoes INTEIRO (não só o item
// aberto no modal), pra achar tipos usados em QUALQUER poema, não só
// no que está sendo editado agora. As 5 sugestões de TIPOS_ECO_SONORO
// sempre entram primeiro (mesmo sem uso ainda, pra nunca sumirem do
// seletor); tipos extras vêm depois, em ordem alfabética.
function tiposEcoPresentes(escansoes) {
    const extras = new Set();
    (Array.isArray(escansoes) ? escansoes : []).forEach((es) => {
        (es.ecos || []).forEach((eco) => {
            if (eco.tipo && !TIPOS_ECO_SONORO.includes(eco.tipo)) extras.add(eco.tipo);
        });
    });
    return [...TIPOS_ECO_SONORO, ...[...extras].sort((a, b) => a.localeCompare(b, 'pt-BR'))];
}

function camposContaveisEcoPorTipo(escansoes) {
    return Object.fromEntries(
        tiposEcoPresentes(escansoes).map((valor) => {
            const chave = `ecosTipo${chaveSlug(valor)}`;
            return [
                chave,
                {
                    label: valor,
                    contar: (item) => (item.ecos || []).filter((eco) => eco.tipo === valor).length,
                },
            ];
        }),
    );
}

// ─── Eco — registro DINÂMICO — por isso é função, não constante: quem
// usa (registroContavel('sonoridade') em colunas-contagem.js) chama de
// novo a cada abertura do seletor, passando o db.escansoes atual, pra
// sempre refletir os tipos personalizados já usados na coleção. ~7
// opções no total (Total, por verso, + tipos) — poucas o bastante pra
// não precisar de subgrupo <optgroup> dentro do próprio select de Eco,
// ao contrário de Rima.
export function camposContaveisEco(escansoes = []) {
    return {
        ecosTotal: {
            label: 'Contagem de Ecos',
            contar: (item) => (item.ecos || []).length,
        },
        ecosProporcao: {
            label: 'Ecos (por verso)',
            contar: (item) => {
                const versos = contarVersos(item.escansaoLinhas);
                return versos ? Math.round(((item.ecos || []).length / versos) * 100) / 100 : 0;
            },
        },
        ...camposContaveisEcoPorTipo(escansoes),
    };
}

// ─── Registro combinado (Rima + Eco) — usado por itemBateFiltrosContagem/
// definirCampoColunaContagem (colunas-contagem.js), que precisam de UM
// registro só pra validar/calcular qualquer coluna ativa, seja ela de
// rima ou de eco. A separação em DOIS SELECTS ("Contagem de Rimas" /
// "Contagem de Ecos") é só na camada de UI — ali embaixo continua tudo
// junto, senão validação/filtro/ordenação também precisariam saber de
// família.
export function construirCamposContaveisSonoridade(escansoes = []) {
    return { ...CAMPOS_CONTAVEIS_RIMA, ...camposContaveisEco(escansoes) };
}

// Trecho de exibição de um lado do par na lista de classificação —
// junta só as sílabas marcadas (não o verso inteiro), pra mostrar
// exatamente o fragmento que foi pareado (ex.: "mun-do"), o mesmo
// dado usado por calcularPosicaoPar/celulasRimadas.
// Exportada pelo mesmo motivo de dividirSilabas/corDaLetra acima.
export function trechoLado(lado, linhas) {
    const linha = linhas[lado.linha];
    if (!linha || linha.tipo !== 'verso') return '';
    const silabas = dividirSilabas(linha.texto);
    return lado.silabas.map((i) => silabas[i] || '').join('-');
}

// Cria/substitui um lado do par com uma única sílaba (clique simples) —
// tanto pro primeiro clique do lado quanto pra "recomeçar" esse lado se
// o usuário clicar de novo sem segurar shift.
function novoLadoRima(linhaIdx, silabaIdx) {
    return { linhaIdx, silabas: [silabaIdx] };
}

// Shift-clique alterna a sílaba no lado (adiciona se não tava, remove se
// já tava) — mesmo padrão de alternância usado no Modo Sílaba Tônica,
// permite corrigir um clique errado sem precisar cancelar o par inteiro.
function alternarSilabaLado(lado, silabaIdx) {
    const pos = lado.silabas.indexOf(silabaIdx);
    if (pos === -1) lado.silabas.push(silabaIdx);
    else lado.silabas.splice(pos, 1);
    lado.silabas.sort((a, b) => a - b);
}

// ─── Realce das barras enquanto o usuário digita ───────────────────
// Reconstrói o innerHTML do contenteditable envolvendo cada `/` num <span>
// laranja/negrito (spec 3.1: "Estilização das barras: destaque visual em
// negrito e cor laranja") e restaura o cursor no mesmo ponto do texto
// puro — sem isso, toda vez que re-renderizasse o realce o cursor pularia
// pro fim do campo, tornando o campo inutilizável pra digitar no meio do
// verso.
function offsetDoCursor(el) {
    const sel = window.getSelection?.();
    if (!sel || !sel.rangeCount) return el.textContent.length;
    const range = sel.getRangeAt(0);
    const pre = range.cloneRange();
    pre.selectNodeContents(el);
    pre.setEnd(range.endContainer, range.endOffset);
    return pre.toString().length;
}

function restaurarCursor(el, offset) {
    const sel = window.getSelection?.();
    if (!sel) return;
    const range = document.createRange();
    let restante = offset;
    let achou = false;

    function percorrer(node) {
        if (achou) return;
        if (node.nodeType === Node.TEXT_NODE) {
            if (restante <= node.textContent.length) {
                range.setStart(node, Math.max(0, restante));
                range.collapse(true);
                achou = true;
            } else {
                restante -= node.textContent.length;
            }
        } else {
            for (const filho of node.childNodes) {
                percorrer(filho);
                if (achou) return;
            }
        }
    }
    percorrer(el);
    if (!achou) {
        range.selectNodeContents(el);
        range.collapse(false);
    }
    sel.removeAllRanges();
    sel.addRange(range);
}

// Realça só as barras que realmente dividem sílaba (laranja); `\/` fica
// esmaecida — é conteúdo protegido, não divisão — pra deixar visível de
// cara qual barra é qual dentro do texto editável. Mesmo escape lido por
// dividirSilabas() acima.
function realceHtml(texto) {
    return escapeHtml(texto).replace(/\\\/|\//g, (m) =>
        m === '\\/'
            ? '<span class="text-gray-400 dark:text-slate-600" title="Barra gráfica do poema — não divide sílaba">\\/</span>'
            : '<span class="text-orange-500 font-bold">/</span>',
    );
}

function realcarBarras(el) {
    const offset = offsetDoCursor(el);
    el.innerHTML = realceHtml(el.textContent);
    restaurarCursor(el, offset);
}

// ─── Renderização ────────────────────────────────────────────────
// Botões da barra de ferramentas + legenda contextual — ficam dentro do
// mesmo innerHTML montado por renderGrade() (não em modal-sonoridade.html)
// porque só existem junto com a grade: sem poema escolhido não há o que
// marcar. Isso também evita ter que registrar mais um `window.x` em
// main.js só pra esses botões (ver tests/wiring-onclick.test.js) — o
// clique é wireado direto aqui via addEventListener, como o resto do
// editor.
function renderBarraFerramentas() {
    const classesTonico = modoTonico
        ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'
        : 'bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700';
    const classesRima = modoRima
        ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700'
        : 'bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700';
    const classesEco = modoEco
        ? 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-200 border-gray-400 dark:border-slate-500'
        : 'bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700';

    const emCorrecaoRima = Boolean(selecaoRima?.parOriginal);
    const emCorrecaoEco = Boolean(selecaoEco?.parOriginal);
    let legenda = 'Ative um dos modos acima pra marcar sílabas tônicas, rimas ou ecos sonoros.';
    if (modoTonico) legenda = 'Clique numa sílaba pra marcar/desmarcar o acento.';
    if (modoRima) {
        if (!selecaoRima)
            legenda = 'Clique na 1ª sílaba de um par de rima (shift-clique pra estender).';
        else if (!selecaoRima.ladoB)
            legenda = 'Agora clique na sílaba do outro verso que rima (shift-clique pra estender).';
        else if (emCorrecaoRima)
            legenda = 'Corrigindo este par — ajuste os lados, salve a alteração ou cancele.';
        else legenda = 'Shift-clique pra ajustar os dois lados, ou confirme o par.';
    }
    if (modoEco) {
        if (!selecaoEco)
            legenda =
                'Clique na 1ª sílaba de um eco sonoro (quase-rima) — shift-clique pra estender.';
        else if (!selecaoEco.ladoB)
            legenda = 'Agora clique na sílaba do outro verso que ecoa (shift-clique pra estender).';
        else if (emCorrecaoEco)
            legenda = 'Corrigindo este eco — ajuste os lados, salve a alteração ou cancele.';
        else legenda = 'Shift-clique pra ajustar os dois lados, ou confirme o eco.';
    }

    const podeConfirmarRima = Boolean(
        selecaoRima?.ladoA?.silabas.length && selecaoRima?.ladoB?.silabas.length,
    );
    const podeConfirmarEco = Boolean(
        selecaoEco?.ladoA?.silabas.length && selecaoEco?.ladoB?.silabas.length,
    );

    let controlesRima = '';
    if (modoRima && selecaoRima) {
        controlesRima = `
            <button
                type="button"
                id="son-btn-confirmar-rima"
                ${podeConfirmarRima ? '' : 'disabled'}
                class="text-[11px] font-bold px-3 py-1 rounded-full border transition-colors ${
                    podeConfirmarRima
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                        : 'bg-gray-50 dark:bg-slate-800 text-gray-300 dark:text-slate-600 border-gray-200 dark:border-slate-700 cursor-not-allowed'
                }"
            >
                ${emCorrecaoRima ? 'Salvar alteração' : 'Confirmar par'}
            </button>
            <button
                type="button"
                id="son-btn-cancelar-rima"
                class="text-[11px] font-bold px-3 py-1 rounded-full border transition-colors bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700"
            >
                ${emCorrecaoRima ? 'Cancelar correção' : 'Cancelar seleção'}
            </button>`;
    }

    let controlesEco = '';
    if (modoEco && selecaoEco) {
        controlesEco = `
            <button
                type="button"
                id="son-btn-confirmar-eco"
                ${podeConfirmarEco ? '' : 'disabled'}
                class="text-[11px] font-bold px-3 py-1 rounded-full border transition-colors ${
                    podeConfirmarEco
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                        : 'bg-gray-50 dark:bg-slate-800 text-gray-300 dark:text-slate-600 border-gray-200 dark:border-slate-700 cursor-not-allowed'
                }"
            >
                ${emCorrecaoEco ? 'Salvar alteração' : 'Confirmar eco'}
            </button>
            <button
                type="button"
                id="son-btn-cancelar-eco"
                class="text-[11px] font-bold px-3 py-1 rounded-full border transition-colors bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700"
            >
                ${emCorrecaoEco ? 'Cancelar correção' : 'Cancelar seleção'}
            </button>`;
    }

    const mostrarEcos = mostrarEcosAtivo();

    return `
        <div class="flex items-center flex-wrap gap-2 mb-2">
            <button
                type="button"
                id="son-btn-modo-tonico"
                aria-pressed="${modoTonico}"
                class="text-[11px] font-bold px-3 py-1 rounded-full border transition-colors ${classesTonico}"
            >
                Modo Sílaba Tônica${modoTonico ? ': Ligado' : ''}
            </button>
            <button
                type="button"
                id="son-btn-modo-rima"
                aria-pressed="${modoRima}"
                class="text-[11px] font-bold px-3 py-1 rounded-full border transition-colors ${classesRima}"
            >
                Modo Rima${modoRima ? ': Ligado' : ''}
            </button>
            <button
                type="button"
                id="son-btn-modo-eco"
                aria-pressed="${modoEco}"
                class="text-[11px] font-bold px-3 py-1 rounded-full border transition-colors ${classesEco}"
            >
                Modo Eco${modoEco ? ': Ligado' : ''}
            </button>
            ${controlesRima}
            ${controlesEco}
            <label class="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-slate-400 ml-auto">
                <input type="checkbox" id="son-toggle-mostrar-ecos" ${mostrarEcos ? 'checked' : ''} />
                Mostrar Ecos Sonoros
            </label>
            <p id="son-grade-rotulo-alvo" class="text-[10px] text-gray-400 dark:text-slate-500 w-full sm:w-auto"></p>
            <p class="text-[10px] text-gray-400 dark:text-slate-500 w-full sm:w-auto">${legenda}</p>
        </div>`;
}

function renderReguaHeader(n) {
    let ths = '';
    for (let i = 1; i <= n; i++) {
        ths += `<th class="px-1 py-2 text-center text-[10px] font-mono text-gray-400 dark:text-slate-500 border-b border-gray-200 dark:border-slate-700">${i}</th>`;
    }
    return ths;
}

function montarLinhaHtml(linha, idx) {
    if (linha.tipo === 'vazia') {
        return `<tr data-idx="${idx}" class="son-linha-vazia"><td colspan="2"></td></tr>`;
    }
    return `
        <tr data-idx="${idx}">
            <td class="px-2 py-1.5 text-[10px] font-mono text-gray-400 dark:text-slate-500 text-right align-top border-b border-gray-100 dark:border-slate-800">${linha.numero}</td>
            <td class="px-2 py-1.5 border-b border-gray-100 dark:border-slate-800 align-top">
                <div
                    class="son-linha-texto outline-none text-sm whitespace-pre-wrap"
                    contenteditable="true"
                    data-idx="${idx}"
                    spellcheck="false"
                >${realceHtml(linha.texto)}</div>
            </td>
        </tr>`;
}

// Reconstrói só a régua (colgroup + cabeçalho), as células de sílaba e a
// coluna de letra de rima de cada linha — NUNCA o <div contenteditable>
// em si (coluna 2), que fica intacto em qualquer <tr> mesmo quando essa
// função roda a cada tecla digitada em outra linha (ou na mesma, depois
// de realcarBarras já ter resolvido o cursor). Sem essa separação,
// digitar a 2ª sílaba de um verso perderia o foco/cursor a cada letra.
function reconstruirColunas() {
    if (!containerEl) return;
    const n = maxSilabas();
    const letras = calcularLetrasRima(rimasAtuais);
    const rimadas = celulasRimadas(rimasAtuais, letras);
    const ecoadas = mostrarEcosAtivo() ? celulasComEco(ecosAtuais) : new Map();
    const divergentesPe = celulasDivergentesPeMetrico(linhasAtuais, peMetricoAtual);
    const digrafos = celulasComDigrafoDividido(linhasAtuais);
    // Alvo/divergência da coluna "Cont." — mesma complementaridade que
    // editor-molde.js já tinha (atualizarColunaAlvo/tamanhoVersoAtual),
    // trazida agora pra Sonoridade. linhasAtuais já carrega `numero`
    // sempre atualizado (ao contrário do Molde, onde a numeração muda
    // ao adicionar/remover linha e precisa de numerarLinhas antes de
    // chamar calcularDivergenciaSilabas), então passa direto.
    const alvo = extrairAlvo(tamanhoVersoAtual);
    const divergentesAlvo = new Set(calcularDivergenciaSilabas(linhasAtuais, tamanhoVersoAtual));

    const rotuloAlvo = containerEl.querySelector('#son-grade-rotulo-alvo');
    if (rotuloAlvo) {
        rotuloAlvo.textContent = alvo
            ? `Alvo: ${alvo} sílaba${alvo === 1 ? '' : 's'} por verso`
            : '';
    }

    const totalDigrafos = contarDigrafosDivididos(linhasAtuais);
    const avisoDigrafosEl = containerEl.querySelector('#son-aviso-digrafos');
    if (avisoDigrafosEl) {
        avisoDigrafosEl.innerHTML =
            totalDigrafos > 0
                ? `<div class="mb-2 flex items-center gap-2 flex-wrap text-[11px] bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded px-2 py-1.5">
                    <span>${totalDigrafos} dígrafo${totalDigrafos > 1 ? 's' : ''} dividido${totalDigrafos > 1 ? 's' : ''} (rr/ss) na escansão — clique numa célula em vermelho pra mesclar, ou corrija tud${totalDigrafos > 1 ? 'as' : 'o'} de uma vez.</span>
                    <button type="button" id="son-btn-corrigir-digrafos" class="ml-auto shrink-0 font-bold underline">Corrigir tod${totalDigrafos > 1 ? 'os' : 'o'}</button>
                </div>`
                : '';
    }

    const colgroup = containerEl.querySelector('#son-grade-colgroup');
    if (colgroup) {
        colgroup.innerHTML =
            '<col style="width:36px"><col style="width:230px">' +
            '<col style="width:42px">'.repeat(n) +
            '<col style="width:50px"><col style="width:40px">';
    }

    const headerRow = containerEl.querySelector('#son-grade-header-row');
    if (headerRow) {
        headerRow.innerHTML = `
            <th class="px-2 py-2 text-[10px] font-bold text-gray-500 dark:text-slate-400 text-right border-b border-gray-200 dark:border-slate-700">Nº</th>
            <th class="px-2 py-2 text-[10px] font-bold text-gray-500 dark:text-slate-400 text-left border-b border-gray-200 dark:border-slate-700">Verso — separe sílabas com /</th>
            ${renderReguaHeader(n)}
            <th class="px-1 py-2 text-center text-[10px] font-bold text-gray-500 dark:text-slate-400 border-b border-gray-200 dark:border-slate-700">Cont.</th>
            <th class="px-1 py-2 text-center text-[10px] font-bold text-gray-500 dark:text-slate-400 border-b border-gray-200 dark:border-slate-700">Rima</th>`;
    }

    linhasAtuais.forEach((linha, idx) => {
        const tr = containerEl.querySelector(`#son-grade-body tr[data-idx="${idx}"]`);
        if (!tr) return;
        tr.querySelectorAll(
            'td.son-cel-silaba, td.son-cel-contagem, td.son-cel-rima-letra',
        ).forEach((td) => td.remove());
        const silabas = linha.tipo === 'verso' ? dividirSilabas(linha.texto) : [];
        // Células montadas via createElement/appendChild, não via
        // innerHTML/insertAdjacentHTML: strings HTML com <td> soltos fora de
        // um <table> passam pelo algoritmo de "fragment parsing" sensível a
        // contexto, que nem toda engine implementa igual pra insertAdjacentHTML
        // num <tr> já existente (achado rodando os testes — os <td> simplesmente
        // não apareciam, virava texto solto). appendChild não depende disso.
        const tonicas = linha.tipo === 'verso' ? garantirTonicas(linha) : [];
        for (let i = 0; i < n; i++) {
            const td = document.createElement('td');
            // Célula "real" = existe sílaba de fato nessa posição pra esse
            // verso (não é preenchimento até a régua bater no maior verso
            // do poema, nem uma sílaba vazia por barra dupla `//`) — só
            // células reais respondem a clique no Modo Sílaba Tônica/Rima.
            const ehReal = i < silabas.length && silabas[i] !== '';
            const ehTonica = ehReal && tonicas.includes(i);
            const emLadoA =
                ehReal &&
                (modoRima || modoEco) &&
                (modoRima ? selecaoRima : selecaoEco)?.ladoA.linhaIdx === idx &&
                (modoRima ? selecaoRima : selecaoEco).ladoA.silabas.includes(i);
            const emLadoB =
                ehReal &&
                (modoRima || modoEco) &&
                (modoRima ? selecaoRima : selecaoEco)?.ladoB?.linhaIdx === idx &&
                (modoRima ? selecaoRima : selecaoEco).ladoB.silabas.includes(i);
            let classes =
                'son-cel-silaba px-1 py-1.5 text-center text-sm border-b border-gray-100 dark:border-slate-800 align-top';
            if (ehReal && (modoTonico || modoRima || modoEco))
                classes += ' cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800';
            if (ehTonica) classes += ' bg-amber-200 dark:bg-amber-900/60 font-bold rounded';
            // Destaque de seleção em curso (Modo Rima/Modo Eco, ainda não
            // confirmado) — ring em vez de background, pra não colidir
            // visualmente com o fundo da tônica quando a mesma sílaba é
            // as duas coisas ao mesmo tempo. Tem prioridade sobre a cor
            // de par já confirmado (abaixo): o que o usuário está
            // ajustando agora importa mais que o estado salvo.
            if (emLadoA) classes += ' ring-2 ring-inset ring-blue-400 rounded';
            if (emLadoB) classes += ' ring-2 ring-inset ring-purple-400 rounded';
            if (!emLadoA && !emLadoB) {
                const letraRimada = ehReal ? rimadas.get(`${idx}:${i}`) : undefined;
                if (letraRimada) {
                    const cor = corDaLetra(letraRimada);
                    classes += ` ring-2 ring-inset ring-${cor}-400 dark:ring-${cor}-600 rounded`;
                }
            }
            // Eco sonoro confirmado — outline (não ring/box-shadow, que
            // não suporta traço pontilhado) tracejado, cor neutra única
            // pra TODO eco (sem esquema de letras — não é rima
            // estrutural). Convive sem conflito com o ring de rima acima
            // (propriedades CSS diferentes, a mesma sílaba pode ser as
            // duas coisas ao mesmo tempo e mostrar as duas marcações).
            if (!emLadoA && !emLadoB && ehReal && ecoadas.get(`${idx}:${i}`)) {
                classes +=
                    ' outline outline-2 outline-dashed outline-gray-400 dark:outline-gray-500 rounded';
            }
            // Tônica esperada pelo Pé Métrico, ainda não marcada — border
            // (não outline, que o eco acima já usa; as duas propriedades
            // convivem sem conflito na mesma célula) tracejado âmbar, aviso
            // não-bloqueante de celulasDivergentesPeMetrico. Só aparece
            // quando não há tônica ali (a própria função já exclui
            // posições marcadas do mapa).
            const divergePe = ehReal && divergentesPe.get(`${idx}:${i}`);
            const barraDigrafo = ehReal ? digrafos.get(`${idx}:${i}`) : undefined;
            if (barraDigrafo !== undefined) {
                // Dígrafo dividido — sempre tem prioridade visual sobre o
                // tracejado âmbar de Pé Métrico (ambos usam border-2
                // border-dashed; não dá pra mostrar os dois ao mesmo
                // tempo na mesma borda) porque é um erro de escansão
                // concreto e corrigível com um clique, não uma sugestão.
                classes +=
                    ' border-2 border-dashed border-rose-500 dark:border-rose-500 rounded cursor-pointer';
            } else if (divergePe) {
                classes += ' border-2 border-dashed border-amber-400 dark:border-amber-600 rounded';
            }
            td.className = classes;
            td.textContent = silabas[i] || '';
            if (ehReal) {
                td.dataset.linhaIdx = String(idx);
                td.dataset.silabaIdx = String(i);
                if (barraDigrafo !== undefined) {
                    td.dataset.digrafoBarra = String(barraDigrafo);
                    td.title = 'Dígrafo dividido (rr/ss) — clique para mesclar';
                } else if (divergePe) {
                    td.title = 'Pé Métrico esperava tônica aqui';
                }
                if (ecoadas.get(`${idx}:${i}`)) {
                    const tiposAqui = ecosAtuais
                        .filter(
                            (eco) =>
                                (eco.a.linha === idx && eco.a.silabas.includes(i)) ||
                                (eco.b.linha === idx && eco.b.silabas.includes(i)),
                        )
                        .map((eco) => eco.tipo)
                        .filter(Boolean);
                    td.title = tiposAqui.length ? tiposAqui.join(' · ') : 'Eco sonoro';
                }
            }
            tr.appendChild(td);
        }
        const tdContagem = document.createElement('td');
        const contagem = linha.tipo === 'verso' ? calcularContagemMetrica(linha.texto) : null;
        const divergeAlvo =
            linha.tipo === 'verso' && alvo !== null && divergentesAlvo.has(linha.numero);
        let classesContagem =
            'son-cel-contagem px-1 py-1.5 text-center text-[11px] font-mono border-b border-gray-100 dark:border-slate-800 align-top';
        classesContagem += divergeAlvo
            ? ' text-amber-600 dark:text-amber-400 font-bold'
            : ' text-gray-400 dark:text-slate-500';
        tdContagem.className = classesContagem;
        tdContagem.textContent =
            contagem === null ? '' : alvo !== null ? `${contagem}/${alvo}` : `${contagem}`;
        if (divergeAlvo) tdContagem.title = `Tamanho do Verso esperava ${alvo} sílabas aqui`;
        tr.appendChild(tdContagem);
        const tdRima = document.createElement('td');
        const letraDaLinha = linha.tipo === 'verso' ? letras.get(idx) : undefined;
        let classesRima =
            'son-cel-rima-letra px-1 py-1.5 text-center text-xs font-bold border-b border-gray-100 dark:border-slate-800 align-top';
        classesRima += letraDaLinha
            ? ` text-${corDaLetra(letraDaLinha)}-600 dark:text-${corDaLetra(letraDaLinha)}-400`
            : ' text-gray-300 dark:text-slate-600';
        tdRima.className = classesRima;
        tdRima.textContent = letraDaLinha || '';
        tr.appendChild(tdRima);
    });
}

function onInputTexto(e) {
    const el = e.target;
    const idx = parseInt(el.dataset.idx, 10);
    const linha = linhasAtuais[idx];
    if (!linha) return;
    linha.texto = el.textContent;
    // Reeditar a divisão silábica pode encolher o verso (menos barras) —
    // sem isso, uma sílaba marcada como tônica na posição 4 continuaria
    // "tônica" numa posição que não existe mais depois de tirar uma barra.
    if (Array.isArray(linha.tonicas)) {
        const totalSilabas = dividirSilabas(linha.texto).length;
        linha.tonicas = linha.tonicas.filter((i) => i < totalSilabas);
    }
    realcarBarras(el);
    reconstruirColunas();
    renderizarListaRimas();
}

// Delegado no <tbody> (não uma célula por vez) porque reconstruirColunas()
// recria as células de sílaba a cada tecla — um listener por célula seria
// perdido no primeiro re-render. Só age quando um dos dois modos está
// ligado e o clique caiu numa célula "real" (marcada com data-linha-idx
// em reconstruirColunas). Os dois modos são mutuamente exclusivos (ver
// os toggles em renderGrade), então só um dos ifs roda por clique.
function onCliqueCelula(e) {
    const td = e.target.closest('td.son-cel-silaba');
    if (!td) return;
    // Prioridade sobre qualquer modo ativo (Tônica/Rima/Eco) — um
    // dígrafo dividido é um erro de escansão concreto; faz mais sentido
    // corrigi-lo na hora do que exigir sair do modo atual primeiro.
    if (td.dataset.digrafoBarra !== undefined) {
        mesclarDigrafoDividido(
            parseInt(td.dataset.linhaIdx, 10),
            parseInt(td.dataset.digrafoBarra, 10),
        );
        return;
    }
    if (td.dataset.linhaIdx === undefined) return;
    const linhaIdx = parseInt(td.dataset.linhaIdx, 10);
    const silabaIdx = parseInt(td.dataset.silabaIdx, 10);

    if (modoTonico) {
        const linha = linhasAtuais[linhaIdx];
        if (!linha) return;
        const tonicas = garantirTonicas(linha);
        const pos = tonicas.indexOf(silabaIdx);
        if (pos === -1) tonicas.push(silabaIdx);
        else tonicas.splice(pos, 1);
        reconstruirColunas();
        return;
    }

    if (modoRima) {
        onCliqueCelulaRima(linhaIdx, silabaIdx, e.shiftKey);
        return;
    }

    if (modoEco) {
        onCliqueCelulaEco(linhaIdx, silabaIdx, e.shiftKey);
    }
}

// Mesmo gesto de onCliqueCelulaRima (clique abre/reinicia lado, shift-
// clique estende, clicar noutro verso abre o outro lado, 3ª linha
// distinta recomeça a seleção) — reaproveita novoLadoRima/
// alternarSilabaLado, que já são genéricas (não dependem de ser rima),
// só o array de destino (`selecaoEco` em vez de `selecaoRima`) muda.
function onCliqueCelulaEco(linhaIdx, silabaIdx, comShift) {
    if (!selecaoEco) {
        selecaoEco = { ladoA: novoLadoRima(linhaIdx, silabaIdx), ladoB: null };
        renderGrade();
        return;
    }
    const { ladoA, ladoB } = selecaoEco;

    if (!ladoB) {
        if (linhaIdx === ladoA.linhaIdx) {
            if (comShift) alternarSilabaLado(ladoA, silabaIdx);
            else selecaoEco.ladoA = novoLadoRima(linhaIdx, silabaIdx);
        } else {
            selecaoEco.ladoB = novoLadoRima(linhaIdx, silabaIdx);
        }
        renderGrade();
        return;
    }

    if (linhaIdx === ladoB.linhaIdx) {
        if (comShift) alternarSilabaLado(ladoB, silabaIdx);
        else selecaoEco.ladoB = novoLadoRima(linhaIdx, silabaIdx);
    } else if (linhaIdx === ladoA.linhaIdx) {
        if (comShift) alternarSilabaLado(ladoA, silabaIdx);
        else selecaoEco.ladoA = novoLadoRima(linhaIdx, silabaIdx);
    } else {
        selecaoEco = { ladoA: novoLadoRima(linhaIdx, silabaIdx), ladoB: null };
    }
    renderGrade();
}

// Mesma lógica de confirmarParRima/cancelarSelecaoRima/removerParRima/
// iniciarCorrecaoPar, sobre ecosAtuais/selecaoEco em vez de
// rimasAtuais/selecaoRima — `tipo` (campo livre) é preservado do
// parOriginal na correção, igual acentuacao/tonalidade/riqueza da rima.
function confirmarParEco() {
    if (!selecaoEco?.ladoA.silabas.length || !selecaoEco?.ladoB?.silabas.length) return;
    const { ladoA, ladoB, parOriginal } = selecaoEco;
    ecosAtuais.push({
        ...(parOriginal || {}),
        id: parOriginal?.id ?? gerarId(),
        a: { linha: ladoA.linhaIdx, silabas: [...ladoA.silabas] },
        b: { linha: ladoB.linhaIdx, silabas: [...ladoB.silabas] },
    });
    selecaoEco = null;
    renderGrade();
}

function cancelarSelecaoEco() {
    if (selecaoEco?.parOriginal) ecosAtuais.push(selecaoEco.parOriginal);
    selecaoEco = null;
    renderGrade();
}

function removerParEco(id) {
    const idx = ecosAtuais.findIndex((e) => String(e.id) === String(id));
    if (idx === -1) return;
    const [removido] = ecosAtuais.splice(idx, 1);
    renderGrade();
    mostrarAvisoComAcao('Eco sonoro removido.', 'Desfazer', () => {
        ecosAtuais.splice(idx, 0, removido);
        renderGrade();
    });
}

function iniciarCorrecaoParEco(id) {
    const idx = ecosAtuais.findIndex((e) => String(e.id) === String(id));
    if (idx === -1) return;
    const [eco] = ecosAtuais.splice(idx, 1);
    modoEco = true;
    modoTonico = false;
    modoRima = false;
    selecaoRima = null;
    selecaoEco = {
        parOriginal: eco,
        ladoA: { linhaIdx: eco.a.linha, silabas: [...eco.a.silabas] },
        ladoB: { linhaIdx: eco.b.linha, silabas: [...eco.b.silabas] },
    };
    renderGrade();
}

// Gesto alinhado com o Victor: clique simples numa sílaba abre/reinicia
// o lado em que caiu (lado A se não houver seleção, ou se cair na mesma
// linha do lado já em edição); shift-clique alterna a sílaba no lado
// atual em vez de reiniciar (pra rima rica, mais de uma sílaba por
// lado). Clicar numa linha diferente da que já está em edição abre (ou
// reabre) o outro lado. Nada fecha o par sozinho — só o botão
// "Confirmar par" (ver confirmarParRima).
function onCliqueCelulaRima(linhaIdx, silabaIdx, comShift) {
    if (!selecaoRima) {
        selecaoRima = { ladoA: novoLadoRima(linhaIdx, silabaIdx), ladoB: null };
        renderGrade();
        return;
    }
    const { ladoA, ladoB } = selecaoRima;

    if (!ladoB) {
        if (linhaIdx === ladoA.linhaIdx) {
            if (comShift) alternarSilabaLado(ladoA, silabaIdx);
            else selecaoRima.ladoA = novoLadoRima(linhaIdx, silabaIdx);
        } else {
            selecaoRima.ladoB = novoLadoRima(linhaIdx, silabaIdx);
        }
        renderGrade();
        return;
    }

    if (linhaIdx === ladoB.linhaIdx) {
        if (comShift) alternarSilabaLado(ladoB, silabaIdx);
        else selecaoRima.ladoB = novoLadoRima(linhaIdx, silabaIdx);
    } else if (linhaIdx === ladoA.linhaIdx) {
        // volta pro lado A pra corrigir/estender, sem perder o lado B
        // já iniciado.
        if (comShift) alternarSilabaLado(ladoA, silabaIdx);
        else selecaoRima.ladoA = novoLadoRima(linhaIdx, silabaIdx);
    } else {
        // 3ª linha distinta, sem ter confirmado o par ainda — recomeça a
        // seleção a partir daqui, mais previsível do que ignorar o
        // clique ou tentar adivinhar em qual lado ele deveria entrar.
        selecaoRima = { ladoA: novoLadoRima(linhaIdx, silabaIdx), ladoB: null };
    }
    renderGrade();
}

// Corrigindo um par existente (ver iniciarCorrecaoPar), `selecaoRima`
// carrega `parOriginal` — o par inteiro como estava antes, classificação
// incluída. Confirmar reaproveita o mesmo `id` (pra não perder a
// classificação já feita) por cima dos lados ajustados; sem edição em
// curso, gera um id novo como sempre.
function confirmarParRima() {
    if (!selecaoRima?.ladoA.silabas.length || !selecaoRima?.ladoB?.silabas.length) return;
    const { ladoA, ladoB, parOriginal } = selecaoRima;
    rimasAtuais.push({
        ...(parOriginal || {}),
        id: parOriginal?.id ?? gerarId(),
        a: { linha: ladoA.linhaIdx, silabas: [...ladoA.silabas] },
        b: { linha: ladoB.linhaIdx, silabas: [...ladoB.silabas] },
    });
    selecaoRima = null;
    renderGrade();
}

// Cancelar uma correção em curso devolve o par original pra lista intacto
// (ele tinha sido retirado em iniciarCorrecaoPar pra não duplicar
// enquanto os lados eram reajustados na grade) — sem isso, "Cancelar"
// no meio de uma correção apagaria o par em vez de só descartar o
// ajuste.
function cancelarSelecaoRima() {
    if (selecaoRima?.parOriginal) rimasAtuais.push(selecaoRima.parOriginal);
    selecaoRima = null;
    renderGrade();
}

// Remove um par confirmado (lista de classificação, botão "Remover").
// Recalcula letras/cores na hora (renderGrade), e oferece "Desfazer" no
// mesmo padrão usado pelo resto do app pra exclusões (ver deleteItem em
// db.js) — o toast some sozinho depois de um tempo, momento em que a
// remoção passa a valer de fato (não tem nada a "efetivar" aqui além de
// já ter tirado do array, então o próprio timeout do toast já basta).
function removerParRima(id) {
    const idx = rimasAtuais.findIndex((r) => String(r.id) === String(id));
    if (idx === -1) return;
    const [removido] = rimasAtuais.splice(idx, 1);
    renderGrade();
    mostrarAvisoComAcao('Par de rima removido.', 'Desfazer', () => {
        rimasAtuais.splice(idx, 0, removido);
        renderGrade();
    });
}

// Reabre um par confirmado pra correção (lista de classificação, botão
// "Corrigir"). Tira o par da lista de confirmados e recarrega os dois
// lados em `selecaoRima`, como se o usuário tivesse acabado de clicá-los
// agora — reaproveita o gesto normal de ajuste (clique reinicia o lado,
// shift-clique alterna sílaba, clicar noutra linha reabre o lado B) em
// vez de um modo de edição à parte. Liga o Modo Rima automaticamente
// (desligando o Modo Tônico) caso não estivesse ligado.
function iniciarCorrecaoPar(id) {
    const idx = rimasAtuais.findIndex((r) => String(r.id) === String(id));
    if (idx === -1) return;
    const [par] = rimasAtuais.splice(idx, 1);
    modoRima = true;
    modoTonico = false;
    selecaoRima = {
        parOriginal: par,
        ladoA: { linhaIdx: par.a.linha, silabas: [...par.a.silabas] },
        ladoB: { linhaIdx: par.b.linha, silabas: [...par.b.silabas] },
    };
    renderGrade();
}

// ─── Mapeamento de Rimas — painel de classificação (sub-passo 3) ────
// Esqueleto do painel consolidado (sub-passo 4, ainda por desenhar por
// completo): uma lista de cartões, um por par confirmado, com os 3
// selects de classificação e as ações Corrigir/Remover. Vive dentro do
// próprio containerEl (não um container à parte no modal), logo depois
// da grade — mesmo padrão de container único que o resto do módulo já
// usa. Select de opção fechada monta as <option> na mão (em vez de
// popularSelectOpcoes de forms.js) porque esse helper lê um id fixo do
// DOM global; aqui o id é dinâmico por par.
function montarOpcoesSelect(opcoes, atual) {
    return (
        `<option value="">-- Não classificado --</option>` +
        opcoes
            .map(
                (op) =>
                    `<option value="${escapeHtml(op)}" ${op === atual ? 'selected' : ''}>${escapeHtml(op)}</option>`,
            )
            .join('')
    );
}

function montarItemRimaHtml(par, letras) {
    const letra = letras.get(par.a.linha) || '';
    const cor = letra ? corDaLetra(letra) : 'gray';
    const numA = linhasAtuais[par.a.linha]?.numero ?? '?';
    const numB = linhasAtuais[par.b.linha]?.numero ?? '?';
    const posicao = calcularPosicaoPar(par, linhasAtuais);
    const proximidade = calcularProximidadePar(calcularDistanciaPar(par, linhasAtuais));

    return `
        <div class="border border-gray-200 dark:border-slate-700 rounded p-2 sm:p-3">
            <div class="flex items-start justify-between gap-2 flex-wrap">
                <div class="flex items-center gap-2 text-xs flex-wrap">
                    <span class="font-bold text-${cor}-600 dark:text-${cor}-400">${letra || '·'}</span>
                    <span class="text-gray-600 dark:text-slate-300">
                        v.${numA} <span class="text-gray-400 dark:text-slate-500">"${escapeHtml(trechoLado(par.a, linhasAtuais))}"</span>
                        <span class="text-gray-300 dark:text-slate-600">↔</span>
                        v.${numB} <span class="text-gray-400 dark:text-slate-500">"${escapeHtml(trechoLado(par.b, linhasAtuais))}"</span>
                    </span>
                    <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400">${posicao}</span>
                    ${proximidade ? `<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400">${proximidade}</span>` : ''}
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                    <button type="button" class="son-btn-corrigir-par text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline" data-rima-id="${par.id}">Corrigir</button>
                    <button type="button" class="son-btn-remover-par text-[10px] font-bold text-red-600 dark:text-red-400 hover:underline" data-rima-id="${par.id}">Remover</button>
                </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                <div>
                    <label class="form-label text-[10px]">Acentuação</label>
                    <select class="son-select-classificacao text-xs" data-rima-id="${par.id}" data-campo="acentuacao">
                        ${montarOpcoesSelect(ACENTUACOES_RIMA, par.acentuacao)}
                    </select>
                </div>
                <div>
                    <label class="form-label text-[10px]">Tonalidade</label>
                    <select class="son-select-classificacao text-xs" data-rima-id="${par.id}" data-campo="tonalidade">
                        ${montarOpcoesSelect(TONALIDADES_RIMA, par.tonalidade)}
                    </select>
                </div>
                <div>
                    <label class="form-label text-[10px]">Riqueza</label>
                    <select class="son-select-classificacao text-xs" data-rima-id="${par.id}" data-campo="riqueza">
                        ${montarOpcoesSelect(RIQUEZAS_RIMA, par.riqueza)}
                    </select>
                </div>
            </div>
        </div>`;
}

// ─── Ecos Sonoros — item da lista + resumo ──────────────────────────
// Mesmo esqueleto de montarItemRimaHtml, sem letra/cor de esquema
// (marcador neutro "·"); Posição/Proximidade reaproveitadas das mesmas
// funções da rima (genéricas — ver comentário em ecosAtuais acima); o
// campo Acentuação/Tonalidade/Riqueza vira um único campo livre `tipo`
// (input + datalist, ver TIPOS_ECO_SONORO em utils.js), não 3 selects fechados.
function montarItemEcoHtml(eco) {
    const numA = linhasAtuais[eco.a.linha]?.numero ?? '?';
    const numB = linhasAtuais[eco.b.linha]?.numero ?? '?';
    const posicao = calcularPosicaoPar(eco, linhasAtuais);
    const proximidade = calcularProximidadePar(calcularDistanciaPar(eco, linhasAtuais));

    return `
        <div class="border border-gray-200 dark:border-slate-700 rounded p-2 sm:p-3">
            <div class="flex items-start justify-between gap-2 flex-wrap">
                <div class="flex items-center gap-2 text-xs flex-wrap">
                    <span class="font-bold text-gray-400 dark:text-slate-500">·</span>
                    <span class="text-gray-600 dark:text-slate-300">
                        v.${numA} <span class="text-gray-400 dark:text-slate-500">"${escapeHtml(trechoLado(eco.a, linhasAtuais))}"</span>
                        <span class="text-gray-300 dark:text-slate-600">↔</span>
                        v.${numB} <span class="text-gray-400 dark:text-slate-500">"${escapeHtml(trechoLado(eco.b, linhasAtuais))}"</span>
                    </span>
                    <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400">${posicao}</span>
                    ${proximidade ? `<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400">${proximidade}</span>` : ''}
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                    <button type="button" class="son-btn-corrigir-eco text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline" data-eco-id="${eco.id}">Corrigir</button>
                    <button type="button" class="son-btn-remover-eco text-[10px] font-bold text-red-600 dark:text-red-400 hover:underline" data-eco-id="${eco.id}">Remover</button>
                </div>
            </div>
            <div class="mt-2">
                <label class="form-label text-[10px]">Tipo (opcional — campo livre)</label>
                <input
                    type="text"
                    class="son-input-tipo-eco text-xs"
                    data-eco-id="${eco.id}"
                    value="${escapeHtml(eco.tipo || '')}"
                    list="son-sugestoes-tipo-eco"
                    placeholder="ex.: Assonância, Aliteração..."
                />
            </div>
        </div>`;
}

function renderizarListaEcos() {
    if (!containerEl) return;
    const lista = containerEl.querySelector('#son-lista-ecos');
    if (!lista) return;

    if (ecosAtuais.length === 0) {
        lista.innerHTML = `<p class="text-[11px] text-gray-400 dark:text-slate-500">Nenhum eco sonoro confirmado ainda — use o Modo Eco acima.</p>`;
        return;
    }

    const emOrdem = [...ecosAtuais].sort((e1, e2) => e1.a.linha - e2.a.linha);
    lista.innerHTML = emOrdem.map((eco) => montarItemEcoHtml(eco)).join('');

    lista.querySelectorAll('.son-input-tipo-eco').forEach((input) => {
        input.addEventListener('input', () => {
            const eco = ecosAtuais.find((e) => String(e.id) === String(input.dataset.ecoId));
            if (eco) eco.tipo = input.value || null;
        });
    });
    lista.querySelectorAll('.son-btn-remover-eco').forEach((btn) => {
        btn.addEventListener('click', () => removerParEco(btn.dataset.ecoId));
    });
    lista.querySelectorAll('.son-btn-corrigir-eco').forEach((btn) => {
        btn.addEventListener('click', () => iniciarCorrecaoParEco(btn.dataset.ecoId));
    });
}

// Resumo acima da lista "Ecos Sonoros" — só a contagem total + tally por
// `tipo` de fato presente (não travado nas 5 sugestões — ver
// camposContaveisEcoPorTipo pro porquê disso ser diferente lá).
// Some sozinho sem eco nenhum, mesmo padrão de renderResumoPares.
function renderResumoEcos(ecos) {
    if (!ecos.length) return '';
    const semTipo = ecos.filter((e) => !e.tipo).length;
    const porTipo = new Map();
    ecos.forEach((e) => {
        if (!e.tipo) return;
        porTipo.set(e.tipo, (porTipo.get(e.tipo) || 0) + 1);
    });
    const partes = [...porTipo.entries()].map(([tipo, n]) => `${n} ${tipo}`);
    const aviso =
        semTipo > 0
            ? ` <span class="text-gray-400 dark:text-slate-500">(${semTipo} sem tipo)</span>`
            : '';
    return `<p class="text-[11px] text-gray-500 dark:text-slate-400 mb-2">
        ${ecos.length} eco${ecos.length === 1 ? '' : 's'} sonoro${ecos.length === 1 ? '' : 's'}${
            partes.length ? ` — ${partes.join(' · ')}` : ''
        }${aviso}
    </p>`;
}

// Mesmo espírito de montarItemRimaLeituraHtml — versão somente-texto
// pra visualização/exportação em .md, sem inputs nem botões.
function montarItemEcoLeituraHtml(eco, linhas) {
    const numA = linhas[eco.a.linha]?.numero ?? '?';
    const numB = linhas[eco.b.linha]?.numero ?? '?';
    const posicao = calcularPosicaoPar(eco, linhas);
    const proximidade = calcularProximidadePar(calcularDistanciaPar(eco, linhas));

    return `
        <div class="border border-gray-200 dark:border-slate-700 rounded p-2 sm:p-3 text-xs">
            <div class="flex items-center gap-2 flex-wrap">
                <span class="font-bold text-gray-400 dark:text-slate-500">·</span>
                <span class="text-gray-600 dark:text-slate-300">
                    v.${numA} <span class="text-gray-400 dark:text-slate-500">"${escapeHtml(trechoLado(eco.a, linhas))}"</span>
                    <span class="text-gray-300 dark:text-slate-600">↔</span>
                    v.${numB} <span class="text-gray-400 dark:text-slate-500">"${escapeHtml(trechoLado(eco.b, linhas))}"</span>
                </span>
                <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400">${posicao}</span>
                ${proximidade ? `<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400">${proximidade}</span>` : ''}
            </div>
            ${eco.tipo ? `<p class="text-gray-400 dark:text-slate-500 mt-1">${escapeHtml(eco.tipo)}</p>` : ''}
        </div>`;
}

// ─── Visualização somente-leitura (botão "Ver" da tabela, ver
// visualizar-sonoridade.js) ──────────────────────────────────────────
// Mesmo resultado visual de renderGrade()/reconstruirColunas() acima
// (mesmas cores de tônica/rima, mesma régua), mas como uma função pura
// que devolve uma string HTML — sem containerEl, sem contenteditable,
// sem os dois Modos nem os botões de edição do painel de rimas
// (Corrigir/Remover/selects de classificação viram texto simples).
// Não reconstrói célula por célula como reconstruirColunas() porque não
// precisa preservar cursor/foco de edição nenhum — o modal é recriado
// do zero a cada abertura (ver abrirVisualizacaoSonoridade).
function montarItemRimaLeituraHtml(par, letras, linhas) {
    const letra = letras.get(par.a.linha) || '';
    const cor = letra ? corDaLetra(letra) : 'gray';
    const numA = linhas[par.a.linha]?.numero ?? '?';
    const numB = linhas[par.b.linha]?.numero ?? '?';
    const posicao = calcularPosicaoPar(par, linhas);
    const proximidade = calcularProximidadePar(calcularDistanciaPar(par, linhas));
    const classificacao = [par.acentuacao, par.tonalidade, par.riqueza].filter(Boolean).join(' · ');

    return `
        <div class="border border-gray-200 dark:border-slate-700 rounded p-2 sm:p-3 text-xs">
            <div class="flex items-center gap-2 flex-wrap">
                <span class="font-bold text-${cor}-600 dark:text-${cor}-400">${letra || '·'}</span>
                <span class="text-gray-600 dark:text-slate-300">
                    v.${numA} <span class="text-gray-400 dark:text-slate-500">"${escapeHtml(trechoLado(par.a, linhas))}"</span>
                    <span class="text-gray-300 dark:text-slate-600">↔</span>
                    v.${numB} <span class="text-gray-400 dark:text-slate-500">"${escapeHtml(trechoLado(par.b, linhas))}"</span>
                </span>
                <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400">${posicao}</span>
                ${proximidade ? `<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400">${proximidade}</span>` : ''}
            </div>
            ${classificacao ? `<p class="text-gray-400 dark:text-slate-500 mt-1">${escapeHtml(classificacao)}</p>` : ''}
        </div>`;
}

// Ponto de entrada usado por visualizar-sonoridade.js e (pra manter a
// grade textual idêntica entre "ver na tela" e "baixar em md/pdf/docx")
// indiretamente pelos exportadores de exportar-sonoridade.js, que leem
// os mesmos `linhas`/`rimas` mas montam saída própria pro formato
// (esta função aqui é só HTML de tela).
// Bloco de resumo acima da lista "Pares de Rima" (editor e leitura) —
// linha de Proximidade com o rótulo do poema (calcularClassificacaoSonora,
// igual antes) seguida de uma linha de contagem por valor pra cada um
// dos outros eixos (Posição/Acentuação/Tonalidade/Riqueza — ver
// EIXOS_CLASSIFICACAO_PAR/calcularTalyPorEixo). Cada linha de eixo some
// sozinha se nenhum par tiver aquele eixo preenchido (Acentuação/
// Tonalidade/Riqueza são opcionais por par — Posição nunca some, é
// sempre calculada). Quando há pares sem aquele eixo classificado, um
// aviso "(N sem <Eixo> definida)" fecha a linha, pra contagem nunca
// parecer maior do que realmente é. Retorna string vazia sem par nenhum
// (mesmo padrão de listaRimas/renderGrade — a seção inteira não
// aparece).
function renderResumoPares(rimas, linhas) {
    const { vizinhas, distantes, rotulo } = calcularClassificacaoSonora(rimas, linhas);
    const linhaProximidade = rotulo
        ? `<p class="text-[11px] font-semibold text-gray-600 dark:text-slate-300">
            ${rotulo}
            <span class="text-gray-400 dark:text-slate-500 font-normal">(${vizinhas} vizinha${vizinhas === 1 ? '' : 's'} · ${distantes} distante${distantes === 1 ? '' : 's'})</span>
        </p>`
        : '';
    const linhasEixos = ['posicao', 'acentuacao', 'tonalidade', 'riqueza']
        .map((chave) => {
            const { label, extrairValor } = EIXOS_CLASSIFICACAO_PAR[chave];
            const { valores, semClassificar } = calcularTalyPorEixo(rimas, linhas, extrairValor);
            const partes = Object.entries(valores).map(
                ([valor, n]) => `${n} ${rotuloCurtoValor(valor)}`,
            );
            if (!partes.length) return '';
            const aviso =
                semClassificar > 0
                    ? ` <span class="text-gray-400 dark:text-slate-500">(${semClassificar} sem ${label} definida)</span>`
                    : '';
            return `<p class="text-[11px] text-gray-500 dark:text-slate-400">${label}: ${partes.join(' · ')}${aviso}</p>`;
        })
        .join('');
    if (!linhaProximidade && !linhasEixos) return '';
    return `<div class="mb-2 flex flex-col gap-0.5">${linhaProximidade}${linhasEixos}</div>`;
}

export function renderGradeLeituraHtml(linhas, rimas, ecos, tamanhoVerso) {
    const linhasSeguras = Array.isArray(linhas) ? linhas : [];
    const rimasSeguras = Array.isArray(rimas) ? rimas : [];
    const ecosSeguros = Array.isArray(ecos) ? ecos : [];
    if (linhasSeguras.length === 0) {
        return `<p class="text-xs text-gray-400 dark:text-slate-500 py-4 text-center">Sem grade de escansão.</p>`;
    }

    const n = calcularMaxSilabas(linhasSeguras);
    const letras = calcularLetrasRima(rimasSeguras);
    const rimadas = celulasRimadas(rimasSeguras, letras);
    const mostrarEcos = mostrarEcosAtivo();
    const ecoadas = mostrarEcos ? celulasComEco(ecosSeguros) : new Map();
    // Coluna "Cont." (contagem métrica de sílabas) — mesma complementaridade
    // Alvo/divergência que a grade de edição (reconstruirColunas, acima) já
    // tem, trazida agora também pra leitura somente-visualização (modal de
    // Visualizar + exportações), que até aqui só mostrava a régua/tônica/
    // rima sem esse número. `tamanhoVerso` é opcional — chamadas antigas/
    // testes que não passam o 4º argumento continuam funcionando, só sem
    // divergência marcada (alvo null).
    const alvo = extrairAlvo(tamanhoVerso);
    const divergentesAlvo = new Set(calcularDivergenciaSilabas(linhasSeguras, tamanhoVerso));

    const linhasHtml = linhasSeguras
        .map((linha, idx) => {
            if (linha.tipo !== 'verso') {
                return `<tr><td colspan="${n + 3}" class="h-3"></td></tr>`;
            }
            const silabas = dividirSilabas(linha.texto);
            const tonicas = Array.isArray(linha.tonicas) ? linha.tonicas : [];
            let celulas = '';
            for (let i = 0; i < n; i++) {
                const ehReal = i < silabas.length && silabas[i] !== '';
                const ehTonica = ehReal && tonicas.includes(i);
                let classes =
                    'px-1 py-1.5 text-center text-sm border-b border-gray-100 dark:border-slate-800';
                if (ehTonica) classes += ' bg-amber-200 dark:bg-amber-900/60 font-bold rounded';
                const letraRimada = ehReal ? rimadas.get(`${idx}:${i}`) : undefined;
                if (letraRimada) {
                    const cor = corDaLetra(letraRimada);
                    classes += ` ring-2 ring-inset ring-${cor}-400 dark:ring-${cor}-600 rounded`;
                }
                if (ehReal && ecoadas.get(`${idx}:${i}`)) {
                    classes +=
                        ' outline outline-2 outline-dashed outline-gray-400 dark:outline-gray-500 rounded';
                }
                celulas += `<td class="${classes}">${escapeHtml(silabas[i] || '')}</td>`;
            }
            const contagem = calcularContagemMetrica(linha.texto);
            const divergeAlvo = alvo !== null && divergentesAlvo.has(linha.numero);
            const celulaContagem = `<td class="px-1 py-1.5 text-center text-[11px] font-mono border-b border-gray-100 dark:border-slate-800 ${
                divergeAlvo
                    ? 'text-amber-600 dark:text-amber-400 font-bold'
                    : 'text-gray-400 dark:text-slate-500'
            }"${divergeAlvo ? ` title="Tamanho do Verso esperava ${alvo} sílabas aqui"` : ''}>${
                alvo !== null ? `${contagem}/${alvo}` : `${contagem}`
            }</td>`;
            const letraDaLinha = letras.get(idx);
            const corLinha = letraDaLinha ? corDaLetra(letraDaLinha) : null;
            const celulaRima = `<td class="px-1 py-1.5 text-center text-xs font-bold border-b border-gray-100 dark:border-slate-800 ${
                corLinha
                    ? `text-${corLinha}-600 dark:text-${corLinha}-400`
                    : 'text-gray-300 dark:text-slate-600'
            }">${letraDaLinha || ''}</td>`;
            return `<tr>
                <td class="px-2 py-1.5 text-[10px] font-mono text-gray-400 dark:text-slate-500 text-right border-b border-gray-100 dark:border-slate-800">${linha.numero}</td>
                ${celulas}
                ${celulaContagem}
                ${celulaRima}
            </tr>`;
        })
        .join('');

    const listaRimas = rimasSeguras.length
        ? `<div class="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800">
            <p class="text-xs font-bold text-gray-500 dark:text-slate-400 mb-2">Pares de Rima</p>
            ${renderResumoPares(rimasSeguras, linhasSeguras)}
            <div class="flex flex-col gap-2">
                ${[...rimasSeguras]
                    .sort((r1, r2) => r1.a.linha - r2.a.linha)
                    .map((par) => montarItemRimaLeituraHtml(par, letras, linhasSeguras))
                    .join('')}
            </div>
        </div>`
        : '';

    // Some sozinha quando o toggle "Mostrar Ecos Sonoros" está desligado
    // — mesma preferência que já escondeu a marcação tracejada na grade
    // acima, pro toggle valer os dois lugares junto (ver mostrarEcosAtivo).
    const listaEcos =
        mostrarEcos && ecosSeguros.length
            ? `<div class="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800">
            <p class="text-xs font-bold text-gray-500 dark:text-slate-400 mb-2">Ecos Sonoros</p>
            ${renderResumoEcos(ecosSeguros)}
            <div class="flex flex-col gap-2">
                ${[...ecosSeguros]
                    .sort((e1, e2) => e1.a.linha - e2.a.linha)
                    .map((eco) => montarItemEcoLeituraHtml(eco, linhasSeguras))
                    .join('')}
            </div>
        </div>`
            : '';

    const toggleEcosLeitura = ecosSeguros.length
        ? `<label class="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-slate-400 mb-2">
            <input type="checkbox" id="son-toggle-mostrar-ecos-leitura" ${mostrarEcos ? 'checked' : ''} />
            Mostrar Ecos Sonoros
        </label>`
        : '';

    return `
        ${toggleEcosLeitura}
        <div class="overflow-x-auto border border-gray-200 dark:border-slate-700 rounded">
            <table class="border-collapse w-full" style="table-layout:fixed;">
                <colgroup>
                    <col style="width:36px" />
                    ${'<col style="width:32px" />'.repeat(n)}
                    <col style="width:44px" />
                    <col style="width:40px" />
                </colgroup>
                <thead class="bg-gray-50 dark:bg-slate-800">
                    <tr>
                        <th class="px-2 py-2 text-[10px] font-bold text-gray-500 dark:text-slate-400 text-right border-b border-gray-200 dark:border-slate-700">Nº</th>
                        ${renderReguaHeader(n)}
                        <th class="px-1 py-2 text-center text-[10px] font-bold text-gray-500 dark:text-slate-400 border-b border-gray-200 dark:border-slate-700">Cont.</th>
                        <th class="px-1 py-2 text-center text-[10px] font-bold text-gray-500 dark:text-slate-400 border-b border-gray-200 dark:border-slate-700">Rima</th>
                    </tr>
                </thead>
                <tbody>${linhasHtml}</tbody>
            </table>
        </div>${listaRimas}${listaEcos}`;
}

// Chamada tanto por renderGrade() quanto por onInputTexto() — o texto do
// verso pode mudar o trecho exibido em cada lado sem mexer em
// `rimasAtuais`, então precisa recalcular mesmo fora de um
// confirmar/remover/corrigir. Reconstrói o innerHTML inteiro da lista a
// cada chamada (rebind dos listeners incluído) — lista curta, custo
// desprezível, mesmo padrão de reconstruirColunas().
function renderizarListaRimas() {
    if (!containerEl) return;
    const lista = containerEl.querySelector('#son-lista-rimas');
    if (!lista) return;

    if (rimasAtuais.length === 0) {
        lista.innerHTML = `<p class="text-[11px] text-gray-400 dark:text-slate-500">Nenhum par de rima confirmado ainda — use o Modo Rima acima.</p>`;
        return;
    }

    const letras = calcularLetrasRima(rimasAtuais);
    // Ordem de leitura do poema (pelo verso do lado A), não a ordem em
    // que os pares foram criados/confirmados.
    const emOrdem = [...rimasAtuais].sort((r1, r2) => r1.a.linha - r2.a.linha);
    lista.innerHTML = emOrdem.map((par) => montarItemRimaHtml(par, letras)).join('');

    lista.querySelectorAll('.son-select-classificacao').forEach((sel) => {
        sel.addEventListener('change', () => {
            const par = rimasAtuais.find((r) => String(r.id) === String(sel.dataset.rimaId));
            if (par) par[sel.dataset.campo] = sel.value || null;
        });
    });
    lista.querySelectorAll('.son-btn-remover-par').forEach((btn) => {
        btn.addEventListener('click', () => removerParRima(btn.dataset.rimaId));
    });
    lista.querySelectorAll('.son-btn-corrigir-par').forEach((btn) => {
        btn.addEventListener('click', () => iniciarCorrecaoPar(btn.dataset.rimaId));
    });
}

function renderGrade() {
    if (!containerEl) return;
    if (linhasAtuais.length === 0) {
        containerEl.innerHTML = `<p class="text-xs text-gray-400 dark:text-slate-500 py-6 text-center">Escolha um poema acima pra carregar o texto aqui.</p>`;
        return;
    }
    containerEl.innerHTML = `
        <details class="campo-grupo" id="son-grupo-grade" ${abertoGrade ? 'open' : ''}>
            <summary>Grade Silábica</summary>
            <div class="campo-grupo-corpo">
                ${renderBarraFerramentas()}
                <div id="son-aviso-digrafos"></div>
                <div class="overflow-x-auto border border-gray-200 dark:border-slate-700 rounded">
                    <table class="border-collapse w-full" style="table-layout:fixed;">
                        <colgroup id="son-grade-colgroup"></colgroup>
                        <thead class="bg-gray-50 dark:bg-slate-800">
                            <tr id="son-grade-header-row"></tr>
                        </thead>
                        <tbody id="son-grade-body">
                            ${linhasAtuais.map((linha, idx) => montarLinhaHtml(linha, idx)).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </details>
        <details class="campo-grupo mt-4" id="son-grupo-pares-rima" ${abertoParesRima ? 'open' : ''}>
            <summary>Pares de Rima</summary>
            <div class="campo-grupo-corpo">
                ${renderResumoPares(rimasAtuais, linhasAtuais)}
                <p class="text-[10px] text-gray-400 dark:text-slate-500 mb-3">
                    Classifique cada par confirmado (Acentuação/Tonalidade/Riqueza). Posição
                    (Externa/Interna) e Proximidade (Vizinha/Distante) são calculadas
                    automaticamente a partir do próprio par.
                </p>
                <div id="son-lista-rimas" class="flex flex-col gap-2"></div>
            </div>
        </details>
        <details class="campo-grupo" id="son-grupo-ecos-sonoros" ${abertoEcosSonoros ? 'open' : ''}>
            <summary>Ecos Sonoros</summary>
            <div class="campo-grupo-corpo">
                <p class="text-[10px] text-gray-400 dark:text-slate-500 mb-2">
                    Quase-rimas intencionais — ecos sonoros de fim/meio de verso que não chegam a
                    rimar pela teoria (útil em verso livre). Tipo é campo livre; use as sugestões ou
                    digite o seu — um tipo digitado aqui uma vez fica disponível como sugestão dali
                    pra frente, em qualquer poema/prosa.
                </p>
                <datalist id="son-sugestoes-tipo-eco">
                    ${tiposEcoPresentes(db.escansoes)
                        .map((t) => `<option value="${escapeHtml(t)}"></option>`)
                        .join('')}
                </datalist>
                ${renderResumoEcos(ecosAtuais)}
                <div id="son-lista-ecos" class="flex flex-col gap-2"></div>
            </div>
        </details>`;
    reconstruirColunas();
    renderizarListaRimas();
    renderizarListaEcos();
    containerEl.querySelectorAll('.son-linha-texto').forEach((el) => {
        el.addEventListener('input', onInputTexto);
    });
    containerEl.querySelector('#son-grupo-grade')?.addEventListener('toggle', (e) => {
        abertoGrade = e.target.open;
    });
    containerEl.querySelector('#son-grupo-pares-rima')?.addEventListener('toggle', (e) => {
        abertoParesRima = e.target.open;
    });
    containerEl.querySelector('#son-grupo-ecos-sonoros')?.addEventListener('toggle', (e) => {
        abertoEcosSonoros = e.target.open;
    });
    containerEl.querySelector('#son-grade-body')?.addEventListener('click', onCliqueCelula);
    containerEl.querySelector('#son-aviso-digrafos')?.addEventListener('click', (e) => {
        if (e.target.closest('#son-btn-corrigir-digrafos')) mesclarTodosDigrafosDivididos();
    });
    containerEl.querySelector('#son-btn-modo-tonico')?.addEventListener('click', () => {
        modoTonico = !modoTonico;
        // Os 3 modos são mutuamente exclusivos — ligar um desliga os
        // outros e descarta qualquer seleção de rima/eco em curso (não dá
        // pra deixar um par "pela metade" persistindo escondido).
        if (modoTonico) {
            modoRima = false;
            modoEco = false;
            selecaoRima = null;
            selecaoEco = null;
        }
        renderGrade();
    });
    containerEl.querySelector('#son-btn-modo-rima')?.addEventListener('click', () => {
        modoRima = !modoRima;
        if (modoRima) {
            modoTonico = false;
            modoEco = false;
            selecaoEco = null;
        } else selecaoRima = null;
        renderGrade();
    });
    containerEl.querySelector('#son-btn-modo-eco')?.addEventListener('click', () => {
        modoEco = !modoEco;
        if (modoEco) {
            modoTonico = false;
            modoRima = false;
            selecaoRima = null;
        } else selecaoEco = null;
        renderGrade();
    });
    containerEl
        .querySelector('#son-btn-confirmar-rima')
        ?.addEventListener('click', confirmarParRima);
    containerEl
        .querySelector('#son-btn-cancelar-rima')
        ?.addEventListener('click', cancelarSelecaoRima);
    containerEl.querySelector('#son-btn-confirmar-eco')?.addEventListener('click', confirmarParEco);
    containerEl
        .querySelector('#son-btn-cancelar-eco')
        ?.addEventListener('click', cancelarSelecaoEco);
    containerEl.querySelector('#son-toggle-mostrar-ecos')?.addEventListener('change', (e) => {
        definirMostrarEcos(e.target.checked);
        renderGrade();
    });
}

// Ponto de entrada chamado por forms.js sempre que o modal abre (nova
// escansão ou edição) — `linhas` vem de construirLinhasIniciais(texto do
// poema) pra uma escansão nova/sem grade ainda, ou de
// es.escansaoLinhas já salvo pra uma edição. `rimas` idem, a partir de
// es.rimas (ou [] pra escansão nova).
export function inicializarGradeSonoridade(
    container,
    linhas,
    rimas,
    ecos,
    peMetrico = '',
    tamanhoVerso = '',
) {
    containerEl = container;
    linhasAtuais = Array.isArray(linhas) ? linhas : [];
    rimasAtuais = Array.isArray(rimas) ? rimas : [];
    ecosAtuais = Array.isArray(ecos) ? ecos : [];
    peMetricoAtual = peMetrico || '';
    tamanhoVersoAtual = tamanhoVerso || '';
    // Modo Sílaba Tônica/Modo Rima/Modo Eco são da sessão do modal, não
    // da escansão salva — sempre começam desligados, tanto abrindo uma
    // escansão nova quanto reabrindo/trocando de poema numa já existente.
    modoTonico = false;
    modoRima = false;
    modoEco = false;
    selecaoRima = null;
    selecaoEco = null;
    // Mesma lógica: "Grade Silábica", "Pares de Rima" e "Ecos Sonoros"
    // sempre começam abertos numa abertura/troca de poema, mesmo que o
    // usuário tivesse fechado algum na sessão anterior do modal.
    abertoGrade = true;
    abertoParesRima = true;
    abertoEcosSonoros = true;
    renderGrade();
}

// Chamada pelo listener `change` do select de Pé Métrico (forms.js) —
// só reconstrói as colunas de sílaba pra recalcular
// celulasDivergentesPeMetrico com o novo valor, mesmo padrão de
// atualizarAlvoGradeMolde() em editor-molde.js. Não perde nem
// modoTonico/seleção de rima em curso nem o cursor de quem estiver
// digitando (reconstruirColunas nunca toca o contenteditable da coluna
// de texto — ver comentário logo acima dela).
export function atualizarPeMetricoSonoridade(peMetrico) {
    peMetricoAtual = peMetrico || '';
    reconstruirColunas();
}

// Chamada pelo listener `change` do select de Tamanho do Verso
// (forms.js) — mesmo padrão de atualizarPeMetricoSonoridade logo acima
// e de atualizarAlvoGradeMolde() em editor-molde.js: só reconstrói as
// colunas (célula "Cont." + rótulo "Alvo") pra recalcular contra o novo
// valor, sem perder modoTonico/seleção de rima em curso nem o cursor de
// quem estiver digitando.
export function atualizarTamanhoVersoSonoridade(tamanhoVerso) {
    tamanhoVersoAtual = tamanhoVerso || '';
    reconstruirColunas();
}

// Lidos por forms.js na hora de salvar, pra gravar em db.escansoes.
export function obterLinhasSonoridade() {
    return linhasAtuais;
}

export function obterRimasSonoridade() {
    return rimasAtuais;
}

export function obterEcosSonoridade() {
    return ecosAtuais;
}
