// ============================================================
// campo-data-obra.js: o campo de "Data da obra ou do fato" dos modais de
// Poema e Prosa (T9, entrega 6 de 13), em um componente só. Os formulários de
// Intertextualidade, Hipertextualidade e Referências o usam (seis contêineres,
// três por modal); "Corrigir obra" e o Modo revisão o usarão na entrega 7.
//
// O que a tela mostra, por ponta (começo e fim):
//   [nível ▾] [número] [mês ▾] [dia]  [a.C.] [aprox.]
// O nível manda no que aparece: século pede só o número (20 ou XX); década,
// o ano terminado em zero; ano, o ano; mês, o ano e o mês; dia, o ano, o mês
// e o dia. "Sem data" esconde o resto. O componente não guarda estado: lê o
// DOM a cada `obter`, e a lógica (validação, intervalo, texto) é toda de
// data-da-obra.js.
//
// Os elementos são procurados pelo id do contêiner a cada uso, porque os
// modais são carregados sob demanda; sem o contêiner, `obter` devolve "sem
// data" e nada quebra (os testes antigos montam só parte do DOM).
//
// Os rótulos mudam por tipo (`rotulosDaData`): Referência de Marco histórico
// fala em Início e Fim, de Pessoa pública em Nascimento e Óbito.
// ============================================================

import {
    NIVEIS_DATA_OBRA,
    MENSAGENS_ERRO_DATA_OBRA,
    criarDataObra,
    lerDataObra,
    numeroParaRomano,
    validarIntervaloDaData,
    formatarIntervaloDataObra,
} from './data-da-obra.js';
import { ehPessoaPublica } from './conhecido-como.js';

// ─── Rótulos por tipo (lógica pura) ──────────────────────────

const ROTULOS_OBRA = { inicio: 'Data da obra', fim: 'Até' };

const semAcento = (t) =>
    String(t || '')
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .trim()
        .toLowerCase();

// Os rótulos das duas pontas e a dica de cada uma. Sem tipo (Intertextualidade
// e Hipertextualidade), é a data da obra e o "até". Só a Referência varia.
export function rotulosDaData(tipoReferencia) {
    if (tipoReferencia === undefined || tipoReferencia === null) {
        return { ...ROTULOS_OBRA, dicaFim: 'Opcional: só quando a obra cobre um período.' };
    }
    if (ehPessoaPublica(tipoReferencia)) {
        return {
            inicio: 'Nascimento',
            fim: 'Óbito',
            dicaFim: 'Deixe sem data para quem está viva.',
        };
    }
    if (semAcento(tipoReferencia) === 'marco historico') {
        return {
            inicio: 'Início',
            fim: 'Fim',
            dicaFim: 'Opcional: fatos de um dia só não têm fim.',
        };
    }
    if (semAcento(tipoReferencia) === 'noticia') {
        return {
            inicio: 'Data da notícia',
            fim: 'Até',
            dicaFim: 'Opcional: só quando a notícia cobre um período.',
        };
    }
    return { inicio: 'Data', fim: 'Até', dicaFim: 'Opcional.' };
}

// A mensagem que o formulário mostra quando a data não vale, com o rótulo da
// ponta na frente ("Nascimento: O ano precisa ser..."). '' sem erro.
export function mensagemDeErroDaData(codigo, rotulo = '') {
    if (!codigo) return '';
    const texto = MENSAGENS_ERRO_DATA_OBRA[codigo] || 'A data não vale.';
    return rotulo && codigo !== 'fim-antes-do-inicio' ? `${rotulo}: ${texto}` : texto;
}

// Só as chaves da data que existem, prontas para espalhar na entrada
// (`{ dataObra?, dataObraAte? }`), na mesma forma gravada por
// `definirDatasDaEntrada`. Ponta sem data não ganha chave.
export function camposDeData({ inicio, fim } = {}) {
    const campos = {};
    const a = lerDataObra(inicio);
    const b = lerDataObra(fim);
    if (a) campos.dataObra = a;
    if (b) campos.dataObraAte = b;
    return campos;
}

// ─── Nomes e textos da tela ──────────────────────────────────

const NOMES_NIVEL = {
    seculo: 'Século',
    decada: 'Década',
    ano: 'Ano',
    mes: 'Mês',
    dia: 'Dia',
};

const NOMES_MES = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
];

const DICA_NUMERO = {
    seculo: {
        texto: 'XX ou 20',
        largura: 'w-20',
        titulo: 'Século, em romanos ou número (XX ou 20)',
    },
    decada: { texto: '1920', largura: 'w-20', titulo: 'Década: o ano terminado em zero (1920)' },
    ano: { texto: 'Ano', largura: 'w-20', titulo: 'Ano (1 a 9999)' },
    mes: { texto: 'Ano', largura: 'w-20', titulo: 'Ano (1 a 9999)' },
    dia: { texto: 'Ano', largura: 'w-20', titulo: 'Ano (1 a 9999)' },
};

const CLASSE_LINHA = 'flex flex-wrap items-center gap-1.5';
const CLASSE_ROTULO =
    'w-24 flex-shrink-0 text-[10px] font-semibold uppercase text-gray-400 dark:text-slate-500';
const CLASSE_MARCA = 'flex items-center gap-1 text-[11px] text-gray-500 dark:text-slate-400';
const CLASSE_SUGESTAO =
    'px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] hover:bg-slate-200 dark:hover:bg-slate-600';

function criar(tag, atributos = {}, filhos = []) {
    const el = document.createElement(tag);
    Object.entries(atributos).forEach(([chave, valor]) => {
        if (chave === 'class') el.className = valor;
        else if (chave === 'texto') el.textContent = valor;
        else el.setAttribute(chave, valor);
    });
    filhos.forEach((f) => el.append(f));
    return el;
}

function montarPonta(ponta) {
    const nivel = criar('select', {
        'data-campo': 'nivel',
        class: 'text-xs',
        'aria-label': 'Nível da data',
    });
    nivel.append(criar('option', { value: '', texto: 'Sem data' }));
    NIVEIS_DATA_OBRA.forEach((n) =>
        nivel.append(criar('option', { value: n, texto: NOMES_NIVEL[n] })),
    );

    const numero = criar('input', {
        type: 'text',
        inputmode: 'numeric',
        'data-campo': 'numero',
        class: 'text-xs hidden w-20',
    });
    const mes = criar('select', {
        'data-campo': 'mes',
        class: 'text-xs hidden',
        'aria-label': 'Mês',
    });
    mes.append(criar('option', { value: '', texto: 'Mês...' }));
    NOMES_MES.forEach((nome, i) =>
        mes.append(criar('option', { value: String(i + 1), texto: nome })),
    );
    const dia = criar('input', {
        type: 'text',
        inputmode: 'numeric',
        'data-campo': 'dia',
        class: 'text-xs hidden w-14',
        placeholder: 'Dia',
        'aria-label': 'Dia',
    });
    const aC = criar('input', { type: 'checkbox', 'data-campo': 'aC' });
    const aprox = criar('input', { type: 'checkbox', 'data-campo': 'aprox' });
    const marcaAC = criar('label', { class: `${CLASSE_MARCA} hidden`, 'data-marca': 'aC' }, [
        aC,
        document.createTextNode('a.C.'),
    ]);
    const marcaAprox = criar('label', { class: `${CLASSE_MARCA} hidden`, 'data-marca': 'aprox' }, [
        aprox,
        document.createTextNode('aprox.'),
    ]);
    const rotulo = criar('span', { class: CLASSE_ROTULO, 'data-campo': 'rotulo' });
    return criar('div', { class: CLASSE_LINHA, 'data-ponta': ponta }, [
        rotulo,
        nivel,
        numero,
        mes,
        dia,
        marcaAC,
        marcaAprox,
    ]);
}

// ─── O componente ────────────────────────────────────────────

// `idContainer`: o elemento onde o campo é desenhado. `rotulos`: os rótulos
// iniciais (`rotulosDaData`). `aoMudar`: chamado quando o usuário mexe na data
// (não em `definir` nem em `limpar`).
export function criarCampoDataObra({ idContainer, rotulos = rotulosDaData(), aoMudar = () => {} }) {
    let rotulosAtuais = rotulos;
    let sugestoes = [];
    let todasAsSugestoes = [];

    const container = () => document.getElementById(idContainer);
    const ponta = (nome) => container()?.querySelector(`[data-ponta="${nome}"]`) || null;
    const campo = (nomePonta, nomeCampo) =>
        ponta(nomePonta)?.querySelector(`[data-campo="${nomeCampo}"]`) || null;

    // Mostra só o que o nível pede e ajusta a dica do número.
    function atualizarPonta(nomePonta) {
        const linha = ponta(nomePonta);
        if (!linha) return;
        const nivel = campo(nomePonta, 'nivel').value;
        const numero = campo(nomePonta, 'numero');
        const mes = campo(nomePonta, 'mes');
        const dia = campo(nomePonta, 'dia');
        const dica = DICA_NUMERO[nivel];
        numero.classList.toggle('hidden', !dica);
        if (dica) {
            numero.placeholder = dica.texto;
            numero.title = dica.titulo;
            numero.setAttribute('aria-label', dica.titulo);
        }
        mes.classList.toggle('hidden', nivel !== 'mes' && nivel !== 'dia');
        dia.classList.toggle('hidden', nivel !== 'dia');
        linha.querySelector('[data-marca="aC"]').classList.toggle('hidden', !nivel);
        linha.querySelector('[data-marca="aprox"]').classList.toggle('hidden', !nivel);
    }

    function desenharRotulos() {
        const { inicio, fim, dicaFim } = rotulosAtuais;
        [
            ['inicio', inicio],
            ['fim', fim],
        ].forEach(([nome, texto]) => {
            const el = campo(nome, 'rotulo');
            if (el) el.textContent = texto;
        });
        const rotuloFim = campo('fim', 'rotulo');
        if (rotuloFim) rotuloFim.title = dicaFim || '';
    }

    function desenharSugestoes() {
        const area = container()?.querySelector('[data-sugestoes]');
        if (!area) return;
        area.replaceChildren();
        if (!sugestoes.length) {
            area.classList.add('hidden');
            return;
        }
        area.classList.remove('hidden');
        area.append(
            criar('span', {
                class: 'text-[10px] text-gray-400 dark:text-slate-500',
                texto: 'Já usadas para esta obra:',
            }),
        );
        sugestoes.forEach((par, i) => {
            area.append(
                criar('button', {
                    type: 'button',
                    class: CLASSE_SUGESTAO,
                    'data-sugestao': String(i),
                    title: 'Usar esta data',
                    texto: par.texto,
                }),
            );
        });
    }

    // O valor de uma ponta: `{ data }`, `{ vazia: true }` ou `{ erro }`.
    function lerPonta(nomePonta) {
        const nivel = campo(nomePonta, 'nivel')?.value || '';
        if (!nivel) return { vazia: true };
        const numero = (campo(nomePonta, 'numero')?.value || '').trim();
        const entrada = {
            nivel,
            aC: !!campo(nomePonta, 'aC')?.checked,
            aprox: !!campo(nomePonta, 'aprox')?.checked,
            mes: campo(nomePonta, 'mes')?.value || '',
            dia: (campo(nomePonta, 'dia')?.value || '').trim(),
        };
        if (nivel === 'seculo') entrada.seculo = numero;
        else if (nivel === 'decada') entrada.decada = numero;
        else entrada.ano = numero;
        return criarDataObra(entrada);
    }

    function escreverPonta(nomePonta, valor) {
        const nivelEl = campo(nomePonta, 'nivel');
        if (!nivelEl) return;
        const d = lerDataObra(valor);
        nivelEl.value = d ? d.nivel : '';
        const numero = d ? (d.seculo ?? d.decada ?? d.ano) : '';
        campo(nomePonta, 'numero').value = d
            ? String(d.nivel === 'seculo' ? numeroParaRomano(numero) : numero)
            : '';
        campo(nomePonta, 'mes').value = d?.mes ? String(d.mes) : '';
        campo(nomePonta, 'dia').value = d?.dia ? String(d.dia) : '';
        campo(nomePonta, 'aC').checked = !!d?.aC;
        campo(nomePonta, 'aprox').checked = !!d?.aprox;
        atualizarPonta(nomePonta);
    }

    // O começo e o fim digitados. `erro` é o código do primeiro problema
    // ('' quando a data vale ou está vazia) e `mensagem` o texto para o
    // usuário (já com o rótulo da ponta). Sem o contêiner, "sem data".
    function obter() {
        const a = lerPonta('inicio');
        const b = lerPonta('fim');
        const resultado = { inicio: a.data || null, fim: b.data || null, erro: '', mensagem: '' };
        const falha = (codigo, rotulo) => {
            resultado.erro = codigo;
            resultado.mensagem = mensagemDeErroDaData(codigo, rotulo);
            return resultado;
        };
        if (a.erro) return falha(a.erro, rotulosAtuais.inicio);
        if (b.erro) return falha(b.erro, rotulosAtuais.fim);
        const intervalo = validarIntervaloDaData(resultado.inicio, resultado.fim);
        if (intervalo) return falha(intervalo, '');
        return resultado;
    }

    function estaVazio() {
        return lerPonta('inicio').vazia === true && lerPonta('fim').vazia === true;
    }

    function definir({ inicio, fim } = {}) {
        escreverPonta('inicio', inicio);
        escreverPonta('fim', fim);
    }

    function limpar() {
        definir({});
        mostrarSugestoes([]);
    }

    function definirRotulos(novos) {
        rotulosAtuais = novos;
        desenharRotulos();
    }

    // Os pares já usados para a obra (de `extrairDatasDaObra` ou
    // `extrairDatasDaReferencia`), menos o que já está no campo.
    function mostrarSugestoes(pares) {
        todasAsSugestoes = pares || [];
        const atual = obter();
        const textoAtual = formatarIntervaloDataObra(atual.inicio, atual.fim);
        sugestoes = todasAsSugestoes.filter((p) => p.texto && p.texto !== textoAtual);
        desenharSugestoes();
    }

    // Desenha o campo uma vez por contêiner (o modal pode ser religado ao ser
    // aberto de novo) e liga os eventos.
    function ligar() {
        const area = container();
        if (!area || area.dataset.campoDataLigado) return;
        area.dataset.campoDataLigado = '1';
        area.append(
            montarPonta('inicio'),
            montarPonta('fim'),
            criar('div', { class: `${CLASSE_LINHA} hidden`, 'data-sugestoes': '' }),
        );
        desenharRotulos();
        atualizarPonta('inicio');
        atualizarPonta('fim');
        area.addEventListener('change', (e) => {
            const linha = e.target?.closest?.('[data-ponta]');
            if (!linha) return;
            atualizarPonta(linha.dataset.ponta);
            aoMudar();
        });
        area.addEventListener('input', (e) => {
            if (e.target?.closest?.('[data-ponta]')) aoMudar();
        });
        area.addEventListener('click', (e) => {
            const botao = e.target?.closest?.('[data-sugestao]');
            if (!botao) return;
            const par = sugestoes[Number(botao.dataset.sugestao)];
            if (!par) return;
            definir({ inicio: par.inicio, fim: par.fim });
            mostrarSugestoes(todasAsSugestoes);
            aoMudar();
        });
    }

    return {
        ligar,
        obter,
        definir,
        limpar,
        estaVazio,
        definirRotulos,
        mostrarSugestoes,
    };
}
