// ============================================================
// estatisticas-tela-datas-obras.js: aba "Obras citadas" (antes "Datas das obras") das Estatísticas
// (T9, entrega 9b de 13). Textos por século, por década e a distância temporal
// entre obra e texto (com zoom pelo rótulo do eixo). Os números vêm de estatisticas-dados-data-obra.js. Clicar
// numa barra abre a lista de Poemas (ou Prosas) filtrada pela busca
// `dataobra:`, `datareferencia:`, `distanciaobra:` ou `distanciareferencia:`
// (ver busca-data-obra.js), que usa a mesma regra da barra.
// ============================================================

import { escaparAspasBusca } from './utils.js';
import { textosDasEstatisticas } from './estatisticas-dados.js';
import {
    FONTES_DATA_OBRA,
    MODOS_OBRA_PESSOAL,
    contarEntradasPessoais,
    agregarTextosPorSeculo,
    agregarTextosPorDecada,
    agregarDistanciaDaObra,
    agregarTextosPorOrigem,
    faixaPermiteZoom,
    intervaloDoSeculo,
    intervaloDaDecada,
    consultaDeDataDaBarra,
    consultaDeDistanciaDaFaixa,
} from './estatisticas-dados-data-obra.js';
import {
    criarBarChart,
    renderFiltrosCompartilhados,
    bindDrillDownBarra,
    navegarParaLista,
    tipoDestino,
} from './estatisticas-tela-comum.js';
import { carregarMapaMundi, montarMapaOrigens } from './mapa-tela.js';
import { montarDadosDoMapa } from './mapa-origens.js';
import { baixarMapaOrigensPdf, baixarMapaOrigensPng } from './exportar-mapa-origens-acoes.js';

const COR_SECULO = '#0d9488';
const COR_DECADA = '#0891b2';
const COR_DISTANCIA = '#d97706';
const COR_ORIGEM = '#7c3aed';
// Quantas origens o gráfico desenha (as mais citadas); o resto fica no resumo.
const MAXIMO_ORIGENS = 20;

const ROTULOS_FONTE = {
    obras: 'Obras',
    referencias: 'Referências',
    todas: 'Todas',
};

const DESCRICAO_FONTE = {
    obras: 'Obras: as entradas de Intertextualidade e de Hipertextualidade.',
    referencias:
        'Referências: Marco histórico, Notícia e Pessoa pública (a Pessoa pública entra pelo nascimento).',
    todas: 'Todas: Intertextualidade, Hipertextualidade e Referências juntas.',
};

const ROTULOS_MODO = {
    todas: 'Todas as obras',
    sem: 'Sem as pessoais',
    so: 'Só as pessoais',
};

let fonteAtual = 'obras';
let modoAtual = 'todas';
// Zoom do gráfico de distância: pilha de faixas `{ min, max }`; a última é o
// recorte de agora. Vazia = o gráfico inteiro.
let zoomDistancia = [];

export const getFonteDatasObras = () => fonteAtual;
export const getModoDatasObras = () => modoAtual;

export const getZoomDistancia = () => zoomDistancia.map((z) => ({ ...z }));
const recorteAtual = () => zoomDistancia[zoomDistancia.length - 1] || null;

// Trocar a fonte ou o modo muda as barras: o zoom antigo apontaria para uma
// faixa que pode nem existir mais, então volta ao gráfico inteiro.
export function definirModoDatasObras(modo) {
    if (!MODOS_OBRA_PESSOAL.includes(modo)) return;
    modoAtual = modo;
    zoomDistancia = [];
    renderDatasObras();
}

export function definirFonteDatasObras(fonte) {
    if (!FONTES_DATA_OBRA.includes(fonte)) return;
    fonteAtual = fonte;
    zoomDistancia = [];
    renderDatasObras();
}

// Zoom na faixa de um rótulo do eixo ("0 a 249 anos"). Só faixas de mais de um
// ano (a "Depois do texto" e as de um ano só não dão zoom).
export function aproximarDistancia(faixa) {
    if (!faixaPermiteZoom(faixa)) return false;
    zoomDistancia.push({ min: faixa.min, max: faixa.max });
    renderDatasObras();
    return true;
}

export function voltarZoomDistancia() {
    if (!zoomDistancia.length) return;
    zoomDistancia.pop();
    renderDatasObras();
}

export function verTudoDistancia() {
    if (!zoomDistancia.length) return;
    zoomDistancia = [];
    renderDatasObras();
}

const textoDaFaixa = (z) => (z.min === z.max ? `${z.min} anos` : `${z.min} a ${z.max} anos`);

// A linha acima do gráfico de distância: o caminho do zoom e os botões. Vazia
// quando o gráfico está inteiro.
export function htmlZoomDistancia(pilha) {
    if (!pilha.length) return '';
    const caminho = ['Tudo', ...pilha.map(textoDaFaixa)].join(' › ');
    const botao = (acao, rotulo) =>
        `<button type="button" onclick="${acao}()" class="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600">${rotulo}</button>`;
    return `<span class="text-[11px] text-gray-500 dark:text-slate-400">Zoom: ${caminho}</span>${botao('voltarZoomDistancia', 'Voltar')}${pilha.length > 1 ? botao('verTudoDistancia', 'Ver tudo') : ''}`;
}

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// Aviso de recorte vazio; no filtro "só as pessoais" diz que falta a marca.
function textoSemEntradas(modo) {
    return modo === 'so'
        ? 'Nenhum texto deste recorte tem entrada marcada como obra pessoal.'
        : 'Nenhum texto deste recorte tem entradas dessa fonte.';
}

// Texto de apoio do gráfico por século ou por década: o denominador, o que
// fica fora e por que a soma das barras pode passar do total.
export function resumoDosTextosPorData(dados, modo = 'todas') {
    if (dados.comEntradas === 0) return textoSemEntradas(modo);
    const partes = [
        `${plural(dados.comData, 'texto entra', 'textos entram')} nas barras, de ${plural(dados.comEntradas, 'texto com entradas', 'textos com entradas')} dessa fonte neste recorte.`,
    ];
    if (dados.semData) {
        partes.push(
            `Ficam fora ${plural(dados.semData, 'texto', 'textos')} sem nenhuma data da obra.`,
        );
    }
    const soma = dados.itens.reduce((a, i) => a + i.textos, 0);
    if (soma > dados.comData) {
        partes.push(
            `A soma das barras (${soma}) passa do total porque um texto com obras de épocas diferentes conta em cada uma.`,
        );
    }
    return partes.join(' ');
}

export function resumoDaDistancia(dados, modo = 'todas') {
    if (dados.textosComEntradas === 0) return textoSemEntradas(modo);
    if (dados.entradasComDistancia === 0 && dados.entradasSemAnoDoTexto === 0) {
        return 'Nenhuma entrada tem data da obra neste recorte.';
    }
    const partes = [];
    if (dados.recorte) {
        partes.push(
            `Zoom na faixa de ${textoDaFaixa(dados.recorte)}: só as entradas dela entram nas barras.`,
        );
    }
    partes.push(
        `${plural(dados.entradasComDistancia, 'entrada entra', 'entradas entram')} nas barras (ano do texto menos ano da obra).`,
    );
    if (dados.entradasSemAnoDoTexto) {
        partes.push(
            `Ficam fora ${plural(dados.entradasSemAnoDoTexto, 'entrada datada', 'entradas datadas')} de textos sem ano de escrita.`,
        );
    }
    if (dados.passo) {
        partes.push(
            `As faixas se ajustam ao recorte: de ${dados.menor} a ${dados.maior} anos, ${dados.passo === 1 ? 'de ano em ano' : `de ${dados.passo} em ${dados.passo} anos`}.`,
        );
    }
    const depois = dados.itens.find((i) => i.chave === 'depois');
    if (depois?.entradas) {
        partes.push(
            `${plural(depois.entradas, 'entrada tem', 'entradas têm')} data depois do texto: vale conferir se não é engano.`,
        );
    }
    return partes.join(' ');
}

function seletorFonte() {
    return FONTES_DATA_OBRA.map(
        (v) =>
            `<button type="button" onclick="definirFonteDatasObras('${v}')" aria-pressed="${fonteAtual === v}" class="px-2 py-0.5 rounded text-[11px] font-semibold ${fonteAtual === v ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400'}">${ROTULOS_FONTE[v]}</button>`,
    ).join('');
}

function seletorModo() {
    const semEfeito = fonteAtual === 'referencias';
    return MODOS_OBRA_PESSOAL.map(
        (v) =>
            `<button type="button" onclick="definirModoDatasObras('${v}')" aria-pressed="${modoAtual === v}"${semEfeito ? ' disabled' : ''} class="px-2 py-0.5 rounded text-[11px] font-semibold ${modoAtual === v ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400'}${semEfeito ? ' opacity-50 cursor-not-allowed' : ''}">${ROTULOS_MODO[v]}</button>`,
    ).join('');
}

// O que o filtro faz agora e quantas entradas ele deixa de fora. `contagem` é o
// que contarEntradasPessoais devolve para o recorte.
export function descricaoDoModo(modo, fonte, contagem) {
    if (fonte === 'referencias') {
        return 'As Referências não têm a marca de obra pessoal: o filtro vale para as fontes Obras e Todas.';
    }
    const { total, pessoais } = contagem;
    if (pessoais === 0) {
        return 'Nenhuma entrada de obra está marcada como obra pessoal neste recorte. Marque no cadastro de Intertextualidade ou em Conexões › Fora do acervo › Corrigir obra.';
    }
    const de = `${plural(pessoais, 'entrada', 'entradas')} de ${plural(total, 'entrada de obra', 'entradas de obras')}`;
    if (modo === 'sem') {
        return `Sem as pessoais: ${de} ${pessoais === 1 ? 'marcada fica' : 'marcadas ficam'} de fora.`;
    }
    if (modo === 'so') {
        return `Só as pessoais: ${de} ${pessoais === 1 ? 'marcada entra' : 'marcadas entram'}${
            fonte === 'todas' ? '; as Referências ficam de fora' : ''
        }.`;
    }
    return `${de} ${pessoais === 1 ? 'está marcada' : 'estão marcadas'} como obra pessoal.`;
}

// A consulta de busca da barra clicada, ou null quando o rótulo não é de nenhuma
// barra. `grafico` é 'seculo', 'decada' ou 'distancia'; `dados` é o que o
// gráfico desenhou (`itens` com `rotulo` e, nos de data, `chave`).
export function consultaDoCliqueNaBarra(grafico, fonte, label, dados, modo = 'todas') {
    if (grafico === 'distancia') {
        const faixa = dados?.itens?.find((i) => i.rotulo === label);
        return faixa ? consultaDeDistanciaDaFaixa(fonte, faixa, modo) : null;
    }
    const barra = dados?.itens?.find((i) => i.rotulo === label);
    if (!barra) return null;
    const intervalo =
        grafico === 'seculo' ? intervaloDoSeculo(barra.chave) : intervaloDaDecada(barra.chave);
    return consultaDeDataDaBarra(fonte, intervalo, modo);
}

// A consulta já vem inteira (com o prefixo e, na fonte "Todas", o `ou`), como
// em Personagens: vai como prefixo, sem valor.
function abrirListaDaBarra(consulta) {
    if (consulta) navegarParaLista(consulta, '', tipoDestino());
}

// O resumo do gráfico de origens.
export function resumoDasOrigens(dados, fonte = 'obras', modo = 'todas') {
    if (fonte === 'referencias') {
        return 'As Referências não têm origem: troque a fonte para Obras ou Todas.';
    }
    if (dados.comEntradas === 0) {
        return modo === 'so'
            ? 'Nenhum texto deste recorte tem entrada marcada como obra pessoal.'
            : 'Nenhum texto do recorte tem entradas de Obras.';
    }
    if (!dados.itens.length) {
        return `Nenhuma das ${plural(dados.comEntradas, 'entrada', 'entradas')} de Obras do recorte tem origem preenchida.`;
    }
    const partes = [
        `${plural(dados.comOrigem, 'texto entra', 'textos entram')} nas barras, de ${plural(dados.comEntradas, 'texto com entradas', 'textos com entradas')} de Obras neste recorte.`,
    ];
    if (dados.semOrigem) {
        partes.push(`Ficam fora ${plural(dados.semOrigem, 'texto', 'textos')} sem nenhuma origem.`);
    }
    if (dados.itens.length > MAXIMO_ORIGENS) {
        partes.push(
            `São ${dados.itens.length} origens; o gráfico mostra as ${MAXIMO_ORIGENS} mais citadas.`,
        );
    }
    return partes.join(' ');
}

// A consulta da barra clicada (o rótulo é a primeira grafia da origem), ou null.
export function consultaDoCliqueNaOrigem(label, dados, modo = 'todas') {
    const barra = dados?.itens?.find((i) => i.rotulo === label);
    if (!barra) return null;
    const prefixo = { sem: 'origempublica', so: 'origempessoal' }[modo] || 'origem';
    return `${prefixo}:"${escaparAspasBusca(barra.rotulo)}"`;
}

function escreverTexto(id, texto) {
    const el = document.getElementById(id);
    if (el) el.textContent = texto;
}

// Colunas ou mapa no gráfico de origens (a escolha vale até recarregar a página).
let visaoOrigem = 'colunas';

export function definirVisaoOrigem(visao) {
    visaoOrigem = visao === 'mapa' ? 'mapa' : 'colunas';
    renderDatasObras();
}

function abrirOrigemPeloMapa(rotulo, origens, modo) {
    abrirListaDaBarra(consultaDoCliqueNaOrigem(rotulo, origens, modo));
}

const DESCRICAO_FILTRO_MODO = { so: 'só obra pessoal', sem: 'sem obra pessoal' };

// Botões "Baixar .png" e "Baixar .pdf" do mapa. A caixa escolhe entre o mundo
// todo (padrão) e o enquadramento que a tela mostra agora.
function barraDeDownloadDoMapa(telaMapa, mapa, dados, modo) {
    const barra = document.createElement('div');
    barra.className = 'flex items-center gap-2 mt-2 text-[11px] text-gray-500 dark:text-slate-400';
    const caixa = document.createElement('input');
    caixa.type = 'checkbox';
    caixa.id = 'mapa-origem-enquadramento';
    const rotulo = document.createElement('label');
    rotulo.htmlFor = caixa.id;
    rotulo.textContent = 'Só o enquadramento atual';
    const contexto = () => ({
        mapa,
        dados,
        vista: caixa.checked ? telaMapa.obterVista() : null,
        filtro: DESCRICAO_FILTRO_MODO[modo] || '',
    });
    const botao = (nome, acao) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = nome;
        b.className =
            'px-2 py-0.5 rounded border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300';
        b.addEventListener('click', () => acao(contexto()));
        return b;
    };
    barra.append(
        botao('Baixar .png', baixarMapaOrigensPng),
        botao('Baixar .pdf', baixarMapaOrigensPdf),
        caixa,
        rotulo,
    );
    return barra;
}

function renderVisaoDasOrigens(origens, modo) {
    const seletor = document.getElementById('est-datas-origem-visao');
    const canvas = document.getElementById('grafico-datas-origem');
    const palco = document.getElementById('mapa-datas-origem');
    if (!seletor || !canvas || !palco) return;
    const classe = (ativo) =>
        `px-2 py-0.5 rounded border ${ativo ? 'bg-violet-600 text-white border-violet-600' : 'border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-300'}`;
    seletor.innerHTML = ['colunas', 'mapa']
        .map(
            (v) =>
                `<button type="button" class="${classe(visaoOrigem === v)}" onclick="definirVisaoOrigem('${v}')">${v === 'mapa' ? 'Mapa' : 'Colunas'}</button>`,
        )
        .join('');
    const mostrarMapa = visaoOrigem === 'mapa' && origens.itens.length > 0;
    canvas.classList.toggle('hidden', mostrarMapa);
    palco.classList.toggle('hidden', !mostrarMapa);
    if (!mostrarMapa) {
        palco.innerHTML = '';
        return;
    }
    const escuro = document.documentElement.classList.contains('dark');
    carregarMapaMundi()
        .then((mapa) => {
            const dados = montarDadosDoMapa(origens);
            const telaMapa = montarMapaOrigens(mapa, dados, {
                escuro,
                aoAbrirOrigem: (rotulo) => abrirOrigemPeloMapa(rotulo, origens, modo),
            });
            palco.replaceChildren(telaMapa, barraDeDownloadDoMapa(telaMapa, mapa, dados, modo));
        })
        .catch(() => {
            palco.textContent = 'Não foi possível carregar o mapa. Use a visão em colunas.';
        });
}

export function renderDatasObras() {
    if (!document.getElementById('estatisticas-datas-obras')) return;
    renderFiltrosCompartilhados();
    const painel = document.getElementById('painel-fonte-datas-obras');
    if (painel) painel.innerHTML = seletorFonte();
    escreverTexto('est-datas-fonte-descricao', DESCRICAO_FONTE[fonteAtual]);
    const painelModo = document.getElementById('painel-modo-datas-obras');
    if (painelModo) painelModo.innerHTML = seletorModo();
    escreverTexto(
        'est-datas-modo-descricao',
        descricaoDoModo(modoAtual, fonteAtual, contarEntradasPessoais(textosDasEstatisticas())),
    );
    // Numa fonte só de Referências a marca não existe: o modo não vale.
    const modo = fonteAtual === 'referencias' ? 'todas' : modoAtual;

    const seculos = agregarTextosPorSeculo(fonteAtual, textosDasEstatisticas(), modo);
    escreverTexto('est-datas-seculo-contexto', resumoDosTextosPorData(seculos, modo));
    criarBarChart(
        'grafico-datas-seculo',
        seculos.itens.map((i) => i.rotulo),
        seculos.itens.map((i) => i.textos),
        COR_SECULO,
        seculos.comData,
    );
    bindDrillDownBarra('grafico-datas-seculo', (label) =>
        abrirListaDaBarra(consultaDoCliqueNaBarra('seculo', fonteAtual, label, seculos, modo)),
    );

    const decadas = agregarTextosPorDecada(fonteAtual, textosDasEstatisticas(), modo);
    escreverTexto('est-datas-decada-contexto', resumoDosTextosPorData(decadas, modo));
    criarBarChart(
        'grafico-datas-decada',
        decadas.itens.map((i) => i.rotulo),
        decadas.itens.map((i) => i.textos),
        COR_DECADA,
        decadas.comData,
    );
    bindDrillDownBarra('grafico-datas-decada', (label) =>
        abrirListaDaBarra(consultaDoCliqueNaBarra('decada', fonteAtual, label, decadas, modo)),
    );

    const distancia = agregarDistanciaDaObra(
        fonteAtual,
        textosDasEstatisticas(),
        modo,
        recorteAtual(),
    );
    escreverTexto('est-datas-distancia-contexto', resumoDaDistancia(distancia, modo));
    const zoomEl = document.getElementById('est-datas-distancia-zoom');
    if (zoomEl) {
        zoomEl.innerHTML = htmlZoomDistancia(zoomDistancia);
        zoomEl.classList.toggle('hidden', !zoomDistancia.length);
    }
    const faixaDoRotulo = (rotulo) => distancia.itens.find((i) => i.rotulo === rotulo) || null;
    const opcoesZoom = {
        rotuloClicavel: (rotulo) => faixaPermiteZoom(faixaDoRotulo(rotulo)),
        dica: 'Ver só esta faixa',
    };
    criarBarChart(
        'grafico-datas-distancia',
        distancia.itens.map((i) => i.rotulo),
        distancia.itens.map((i) => i.entradas),
        COR_DISTANCIA,
        distancia.entradasComDistancia,
        null,
        opcoesZoom,
    );
    const origens = agregarTextosPorOrigem(textosDasEstatisticas(), fonteAtual, modo);
    const origensNoGrafico = origens.itens.slice(0, MAXIMO_ORIGENS);
    escreverTexto('est-datas-origem-contexto', resumoDasOrigens(origens, fonteAtual, modo));
    criarBarChart(
        'grafico-datas-origem',
        origensNoGrafico.map((i) => i.rotulo),
        origensNoGrafico.map((i) => i.textos),
        COR_ORIGEM,
        origens.comOrigem,
    );
    bindDrillDownBarra('grafico-datas-origem', (label) =>
        abrirListaDaBarra(consultaDoCliqueNaOrigem(label, origens, modo)),
    );
    renderVisaoDasOrigens(origens, modo);
    bindDrillDownBarra(
        'grafico-datas-distancia',
        (label) =>
            abrirListaDaBarra(
                consultaDoCliqueNaBarra('distancia', fonteAtual, label, distancia, modo),
            ),
        (rotulo) => aproximarDistancia(faixaDoRotulo(rotulo)),
        opcoesZoom,
    );
}

window.definirVisaoOrigem = definirVisaoOrigem;
window.definirFonteDatasObras = definirFonteDatasObras;
window.definirModoDatasObras = definirModoDatasObras;
window.voltarZoomDistancia = voltarZoomDistancia;
window.verTudoDistancia = verTudoDistancia;
