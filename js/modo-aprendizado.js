// ============================================================
// modo-aprendizado.js — "Modo Aprendizado": o onboarding do app inteiro
// (não pertence a nenhuma aba).
//
// Bloco 1 do plano (ver manutencao/status.md): o modal em si (2 telas —
// boas-vindas + perfil, depois o convite pro tour), a persistência de
// "Não exibir novamente" e do perfil escolhido (localStorage, mesmo
// padrão já usado em estatisticas.js/colunas.js), e o botão "?" fixo
// pra reabrir a qualquer momento.
//
// Bloco 2: a tela 2 convida pro tour ("Começar" / "Agora não"). Os passos
// vivem em tour-passos.js e o motor (destaque em elementos reais da tela)
// em tour.js; aqui só a ponte entre o modal e o tour. O tour nunca começa
// sozinho depois do perfil: a escolha é da pessoa.
//
// Funções puras (localStorage) ficam separadas das de DOM pra dar pra
// testar a lógica de decisão sem precisar montar o modal inteiro —
// mesmo espírito de importar-sonoridade.js/importar-aditivo.js.
// ============================================================

import { garantirModal, toggleModal } from './modais.js';
import { iniciarTour } from './tour.js';
import { montarRoteiro, outroPerfil, passosDoPerfil, ROTULOS_PERFIL } from './tour-passos.js';

const LS_PREFIX_MA = 'arquivoPoetico_ma_';
const CHAVE_NAO_EXIBIR = 'naoExibir';
const CHAVE_PERFIL = 'perfil';

export const PERFIS_MODO_APRENDIZADO = ['escritor', 'estudioso'];

function lerLS(chave) {
    try {
        return localStorage.getItem(LS_PREFIX_MA + chave);
    } catch {
        return null; // localStorage indisponível (ex.: modo privado bloqueado) — trata como "nunca visitou"
    }
}

function salvarLS(chave, valor) {
    try {
        localStorage.setItem(LS_PREFIX_MA + chave, valor);
    } catch {
        // idem — falha silenciosa, não é dado do acervo, só preferência de UI
    }
}

// true = nunca marcou "não exibir novamente" (ou marcou e depois
// desmarcou) → o modal deve se abrir sozinho ao carregar o app.
// Cobre tanto o primeiro acesso de verdade (chave ainda não existe)
// quanto alguém que reabriu o modal e desmarcou a preferência.
export function deveAbrirAutomaticamenteModoAprendizado() {
    return lerLS(CHAVE_NAO_EXIBIR) !== '1';
}

export function lerPreferenciaNaoExibirModoAprendizado() {
    return lerLS(CHAVE_NAO_EXIBIR) === '1';
}

export function salvarPreferenciaNaoExibirModoAprendizado(marcado) {
    salvarLS(CHAVE_NAO_EXIBIR, marcado ? '1' : '0');
}

// "Não exibir novamente" nasce marcado. Como o checkbox só grava quando a
// pessoa MEXE nele, deixar o padrão só visual faria o modal reaparecer em
// toda sessão (a chave nunca existiria). Então a primeira abertura grava o
// padrão: o que o checkbox mostra é sempre o que está salvo. Só a pessoa
// desmarcando ('0') faz o modal voltar a abrir sozinho.
export function garantirPreferenciaPadraoModoAprendizado() {
    if (lerLS(CHAVE_NAO_EXIBIR) === null) salvarPreferenciaNaoExibirModoAprendizado(true);
}

// Perfil só é salvo com um dos dois valores válidos — qualquer outra
// coisa (localStorage corrompido/editado à mão) volta null, como se
// nunca tivesse sido escolhido.
export function lerPerfilModoAprendizado() {
    const valor = lerLS(CHAVE_PERFIL);
    return PERFIS_MODO_APRENDIZADO.includes(valor) ? valor : null;
}

export function salvarPerfilModoAprendizado(perfil) {
    if (!PERFIS_MODO_APRENDIZADO.includes(perfil)) return;
    salvarLS(CHAVE_PERFIL, perfil);
}

// ─── DOM ────────────────────────────────────────────────────

const ETAPAS = ['ma-etapa-perfil', 'ma-etapa-fim'];

// Botões visíveis em cada etapa (footer é compartilhado pelas duas telas,
// só o conjunto de botões muda) — id de cada botão que deve ficar visível
// nessa etapa; os demais (dentre TODOS_OS_BOTOES) somem.
const BOTOES_POR_ETAPA = {
    'ma-etapa-perfil': ['ma-btn-continuar'],
    'ma-etapa-fim': ['ma-btn-voltar', 'ma-btn-agora-nao', 'ma-btn-comecar'],
};
const TODOS_OS_BOTOES = ['ma-btn-voltar', 'ma-btn-continuar', 'ma-btn-agora-nao', 'ma-btn-comecar'];

function mostrarEtapa(idEtapa) {
    ETAPAS.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('hidden', id !== idEtapa);
    });
    const visiveis = BOTOES_POR_ETAPA[idEtapa] || [];
    TODOS_OS_BOTOES.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('hidden', !visiveis.includes(id));
    });
}

// init do registrarModal (roda uma vez, na primeira vez que o modal é
// carregado) — liga o checkbox ao localStorage e nunca mais precisa
// reancorar isso a cada abertura.
export function initModoAprendizado() {
    const chk = document.getElementById('ma-nao-exibir');
    if (chk) {
        chk.addEventListener('change', () => {
            salvarPreferenciaNaoExibirModoAprendizado(chk.checked);
        });
    }
    document.querySelectorAll('input[name="ma-perfil"]').forEach((r) => {
        r.addEventListener('change', () => mostrarErroPerfil(false));
    });
}

function mostrarErroPerfil(visivel) {
    const erro = document.getElementById('ma-perfil-erro');
    if (erro) erro.classList.toggle('hidden', !visivel);
}

// Chamado toda vez que o modal abre (primeiro acesso automático OU
// clique no "?"): sempre volta pra tela 1, com o perfil e a preferência
// já preenchidos do que foi salvo da vez anterior — reabrir não é
// "começar do zero", é "rever".
function prepararTelasModoAprendizado() {
    const perfilSalvo = lerPerfilModoAprendizado();
    document.querySelectorAll('input[name="ma-perfil"]').forEach((r) => {
        r.checked = r.value === perfilSalvo;
    });

    garantirPreferenciaPadraoModoAprendizado();
    const chk = document.getElementById('ma-nao-exibir');
    if (chk) chk.checked = lerPreferenciaNaoExibirModoAprendizado();

    mostrarErroPerfil(false);
    mostrarEtapa('ma-etapa-perfil');
}

export async function abrirModoAprendizado() {
    await garantirModal('modal-modo-aprendizado');
    const el = document.getElementById('modal-modo-aprendizado');
    // Já aberto (ex.: abriu sozinho e a pessoa clicou no "?"): não reinicia
    // as telas nem fecha — toggleModal alternaria.
    if (!el || !el.classList.contains('hidden')) return;
    prepararTelasModoAprendizado();
    // Abre pelo caminho padrão dos modais: leva o foco pra dentro e o
    // devolve ao "?" ao fechar (ver abrirEFocar/fecharEDevolverFoco).
    await toggleModal('modal-modo-aprendizado');
}

// Chamado uma vez no carregamento do app — só abre sozinho se a pessoa
// nunca marcou "não exibir novamente" (ver deveAbrirAutomaticamenteModoAprendizado).
export async function abrirModoAprendizadoSeNecessario() {
    if (deveAbrirAutomaticamenteModoAprendizado()) await abrirModoAprendizado();
}

export function avancarModoAprendizadoPerfil() {
    const escolhido = document.querySelector('input[name="ma-perfil"]:checked');
    if (!escolhido) {
        // Não há <form> aqui, então nenhuma validação nativa acontece:
        // sem esta mensagem o botão pareceria simplesmente quebrado.
        mostrarErroPerfil(true);
        return false;
    }
    mostrarErroPerfil(false);
    salvarPerfilModoAprendizado(escolhido.value);
    // O convite diz quantos passos o tour tem (o roteiro do perfil + os comuns).
    const total = document.getElementById('ma-tour-total');
    if (total) total.textContent = String(montarRoteiro(escolhido.value).length);
    mostrarEtapa('ma-etapa-fim');
    return true;
}

export function voltarModoAprendizadoPerfil() {
    mostrarEtapa('ma-etapa-perfil');
}

// "Começar" na tela 2: fecha o modal (que devolve o foco ao "?") e abre o
// tour do perfil salvo. No último passo o tour oferece o roteiro do outro
// perfil, porque quem usa o app pode ser os dois. Devolve false se não há
// perfil válido salvo (nada pra mostrar).
export async function iniciarTourModoAprendizado() {
    const perfil = lerPerfilModoAprendizado();
    const passos = montarRoteiro(perfil);
    if (passos.length === 0) return false;

    const el = document.getElementById('modal-modo-aprendizado');
    if (el && !el.classList.contains('hidden')) await toggleModal('modal-modo-aprendizado');

    const outro = outroPerfil(perfil);
    return iniciarTour({
        passos,
        extra: outro ? { rotulo: ROTULOS_PERFIL[outro], passos: passosDoPerfil(outro) } : null,
    });
}
