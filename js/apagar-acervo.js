// Apagar efetivo de "Esvaziar o acervo" (Fase 13, etapa 13c).
//
// A 13a decide O QUE sai (esvaziar-acervo.js) e a 13b cuida do modal, do backup e
// do retrato (ui-esvaziar-acervo.js). Este módulo faz o que sobra: gravar o
// acervo já esvaziado, limpar as capas, tirar as chaves do localStorage, avisar as
// outras abas e recarregar a página.
//
// Ordem, pensada para que uma falha no meio deixe o app consistente:
//   1. Trava de salvamento: nenhum save() grava daqui em diante nesta aba.
//   2. Acervo: o esvaziamento é aplicado a uma CÓPIA do `db` e a cópia é gravada
//      no localStorage. O `db` em memória não muda; se a gravação falhar, nada foi
//      apagado, a trava é solta e a pessoa continua com o acervo intacto.
//      A chave do acervo é regravada, nunca removida (F13-D9): sem a chave, o
//      próximo carregamento se veria como instalação nova e semearia de volta os
//      Assuntos e Temas de exemplo.
//   3. Capas (IndexedDB), só com Dados. Vêm depois do acervo de propósito: capa
//      que sobra sem acervo é só lixo invisível; acervo que sobra sem capa seria
//      um acervo com imagens quebradas. Falha aqui é avisada, não interrompe.
//   4. Chaves do localStorage (versões alternativas, preferências, último backup),
//      cada uma isolada: uma que falhe não impede as outras.
//   5. Aviso para as outras abas e recarga. Os retratos automáticos nunca são
//      tocados (F13-D5).

import { db, bloquearSalvamento, desbloquearSalvamento } from './db.js';
import { limparTodasCapas } from './capas.js';
import { CHAVE_ACERVO } from './inventario-armazenamento.js';
import { aplicarEsvaziamento, normalizarCaixas, planoArmazenamento } from './esvaziar-acervo.js';

// Nem o canal nem a marca abaixo são chaves de armazenamento do navegador, então
// não entram no inventário da etapa 13-0 (que vigia o armazenamento do navegador).
export const CANAL_ESVAZIAR = 'esvaziar-acervo';
// Leva o resultado até depois da recarga pelo `history.state`, que sobrevive a
// location.reload() sem guardar nada: some quando a aba é fechada ou navega.
export const CHAVE_AVISO_POS_ESVAZIAR = 'esvaziarAcervoAviso';

const mensagemDeErro = (err) => (err && err.message ? err.message : String(err));

function chavesDe(armazenamento) {
    try {
        return Object.keys(armazenamento);
    } catch {
        return [];
    }
}

function avisarOutrasAbasPadrao() {
    if (typeof BroadcastChannel === 'undefined') return;
    const canal = new BroadcastChannel(CANAL_ESVAZIAR);
    canal.postMessage({ tipo: 'esvaziado' });
    canal.close();
}

// Texto mostrado depois da recarga. Puro, para testar sem navegador.
export function textoAvisoPosEsvaziar(caixas, falhas = []) {
    const c = normalizarCaixas(caixas);
    const partes = [];
    if (c.dados) partes.push('dados');
    if (c.preferencias) partes.push('preferências');
    if (c.preProntos) partes.push('cadastros pré-prontos');
    const lista =
        partes.length > 1
            ? `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}`
            : partes[0] || '';
    let texto = `Acervo esvaziado: ${lista}.`;
    if (falhas.length) {
        texto += ` Algo não pôde ser apagado (${falhas.join(', ')}); tente de novo ou limpe pelo navegador.`;
    }
    return texto;
}

// Executa o apagar. `deps` existe para teste; em produção tudo vem do navegador.
// Devolve { apagado: true, falhas, plano } (e a página recarrega) ou
// { apagado: false, motivo } sem ter apagado nada.
export async function executarEsvaziamento(caixas, deps = {}) {
    const c = normalizarCaixas(caixas);
    if (!c.dados && !c.preferencias && !c.preProntos) {
        return { apagado: false, motivo: 'sem-caixa' };
    }

    const d = {
        db,
        armazenamento: globalThis.localStorage,
        historico: globalThis.history,
        limparCapas: limparTodasCapas,
        bloquear: bloquearSalvamento,
        desbloquear: desbloquearSalvamento,
        avisarOutrasAbas: avisarOutrasAbasPadrao,
        recarregar: () => globalThis.location.reload(),
        ...deps,
    };

    const plano = planoArmazenamento(c, chavesDe(d.armazenamento));
    const falhas = [];

    d.bloquear();

    if (plano.regravarAcervo) {
        try {
            const copia = JSON.parse(JSON.stringify(d.db));
            aplicarEsvaziamento(copia, c);
            d.armazenamento.setItem(CHAVE_ACERVO, JSON.stringify(copia));
        } catch (err) {
            console.error('[apagar-acervo.js] Falha ao gravar o acervo esvaziado:', err);
            d.desbloquear();
            return { apagado: false, motivo: 'gravacao', detalhe: mensagemDeErro(err) };
        }
    }

    if (plano.indexedDBLimpar.length) {
        try {
            await d.limparCapas();
        } catch (err) {
            console.error('[apagar-acervo.js] Falha ao limpar as capas:', err);
            falhas.push('imagens de capa');
        }
    }

    for (const chave of plano.localStorageRemover) {
        try {
            d.armazenamento.removeItem(chave);
        } catch (err) {
            console.error(`[apagar-acervo.js] Falha ao remover ${chave}:`, err);
            falhas.push(chave);
        }
    }

    try {
        const estado = { ...(d.historico?.state || {}) };
        estado[CHAVE_AVISO_POS_ESVAZIAR] = textoAvisoPosEsvaziar(c, falhas);
        d.historico?.replaceState(estado, '');
    } catch {
        // Só perde a mensagem de depois da recarga.
    }

    try {
        d.avisarOutrasAbas();
    } catch (err) {
        console.warn('[apagar-acervo.js] Não foi possível avisar as outras abas:', err);
    }

    d.recarregar();
    return { apagado: true, falhas, plano };
}

// Outra aba esvaziou o acervo: esta ainda tem o `db` antigo na memória e, se
// gravasse, traria tudo de volta. Trava o salvamento na hora e recarrega.
// Devolve o canal (ou null onde o navegador não tem BroadcastChannel).
export function ouvirEsvaziamentoDeOutraAba(deps = {}) {
    const d = {
        criarCanal: (nome) =>
            typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(nome),
        bloquear: bloquearSalvamento,
        avisar: null,
        recarregar: () => globalThis.location.reload(),
        atrasoMs: 1500,
        ...deps,
    };

    let canal;
    try {
        canal = d.criarCanal(CANAL_ESVAZIAR);
    } catch {
        return null;
    }
    if (!canal) return null;
    // Só existe no Node (testes): um canal aberto impediria o processo de terminar.
    // No navegador não há `unref` e nada muda.
    canal.unref?.();

    canal.onmessage = (evento) => {
        if (evento?.data?.tipo !== 'esvaziado') return;
        d.bloquear();
        d.avisar?.('O acervo foi esvaziado em outra aba. Esta página vai recarregar.');
        setTimeout(d.recarregar, d.atrasoMs);
    };
    return canal;
}

// Chamado na inicialização: mostra (uma vez) o resultado do esvaziamento que
// acabou de recarregar a página.
export function mostrarAvisoPosEsvaziar(mostrar, historico = globalThis.history) {
    let texto;
    try {
        const estado = historico?.state;
        texto = estado && typeof estado === 'object' ? estado[CHAVE_AVISO_POS_ESVAZIAR] : null;
        if (typeof texto === 'string') {
            const resto = { ...estado };
            delete resto[CHAVE_AVISO_POS_ESVAZIAR];
            historico.replaceState(Object.keys(resto).length ? resto : null, '');
        }
    } catch {
        return false;
    }
    if (typeof texto !== 'string' || !texto) return false;
    mostrar(texto);
    return true;
}
