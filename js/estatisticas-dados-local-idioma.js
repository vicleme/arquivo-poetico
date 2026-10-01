// ============================================================
// estatisticas-dados-local-idioma.js: agregações de Local e Idioma.
// Sem DOM. Parte sempre do corpus filtrado das Estatísticas
// (textosDasEstatisticas), nunca de todo o acervo.
// ============================================================

import { db } from './db.js';
import { chaveTema, contarTextosPorAssunto, idiomasDoItem } from './utils.js';
import { textosDasEstatisticas } from './estatisticas-dados.js';
import {
    getModoLocalEstatisticas,
    getTipoLocalEstatisticas,
    getPapelIdiomaEstatisticas,
    TIPO_LOCAL_SEM_TIPO,
} from './estatisticas-filtros.js';
import {
    contarTextosPorLocal,
    contarTextosPorLocalEscrita,
    descendentesDoLocal,
    rotulosUnicosDeLocais,
} from './locais.js';

function contagemDeLocais(campo, textos) {
    return campo === 'escrita'
        ? contarTextosPorLocalEscrita(db, textos)
        : contarTextosPorLocal(db, textos);
}

function localTemTipo(local, tipo) {
    if (!tipo) return true;
    if (tipo === TIPO_LOCAL_SEM_TIPO) return !String(local.tipo ?? '').trim();
    return chaveTema(local.tipo) === chaveTema(tipo);
}

// Textos por Local. `campo`: 'territorialidade' (o que o texto cita) ou
// 'escrita' (onde foi escrito). `modo`: 'direto' (só o Local marcado) ou
// 'agregado' (também quem está dentro dele; cada texto conta uma vez por
// Local, mesmo por dois caminhos). `tipo`: '' (todos), um tipo ou
// TIPO_LOCAL_SEM_TIPO. Devolve { labels, data, ids } em paralelo, do maior
// para o menor; `ids` serve ao clique na barra (rótulo → Local).
export function agregarPorLocal({
    campo = 'territorialidade',
    modo = getModoLocalEstatisticas(campo),
    tipo = getTipoLocalEstatisticas(campo),
} = {}) {
    const contagem = contagemDeLocais(campo, textosDasEstatisticas());
    const n = (l) => {
        const c = contagem.get(String(l.id));
        return c ? (modo === 'agregado' ? c.agregados : c.diretos) : 0;
    };
    const comTexto = (db.locais || []).filter((l) => n(l) > 0);
    // Rótulos únicos sobre todos os Locais com texto, antes do corte por tipo,
    // para o rótulo de um Local não mudar quando o tipo escolhido muda.
    const rotulos = rotulosUnicosDeLocais(
        db,
        comTexto.map((l) => l.id),
    );
    const linhas = comTexto
        .filter((l) => localTemTipo(l, tipo))
        .map((l) => ({ id: l.id, label: rotulos.get(String(l.id)), n: n(l) }))
        .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label, 'pt-BR'));
    return {
        labels: linhas.map((l) => l.label),
        data: linhas.map((l) => l.n),
        ids: linhas.map((l) => l.id),
    };
}

// Tipos que aparecem no seletor de tipo: só os dos Locais que têm texto no
// recorte atual (campo, modo e corpus), com quantos Locais cada um traz.
export function tiposDeLocalComTexto(campo, modo = getModoLocalEstatisticas(campo)) {
    const contagem = contagemDeLocais(campo, textosDasEstatisticas());
    const porTipo = new Map();
    (db.locais || []).forEach((l) => {
        const c = contagem.get(String(l.id));
        const n = c ? (modo === 'agregado' ? c.agregados : c.diretos) : 0;
        if (!n) return;
        const tipo = String(l.tipo ?? '').trim();
        const chave = tipo ? chaveTema(tipo) : TIPO_LOCAL_SEM_TIPO;
        const atual = porTipo.get(chave) || {
            valor: tipo || TIPO_LOCAL_SEM_TIPO,
            rotulo: tipo || 'Sem tipo',
            locais: 0,
        };
        atual.locais += 1;
        porTipo.set(chave, atual);
    });
    return [...porTipo.values()].sort((a, b) => {
        if (a.valor === TIPO_LOCAL_SEM_TIPO) return 1;
        if (b.valor === TIPO_LOCAL_SEM_TIPO) return -1;
        return a.rotulo.localeCompare(b.rotulo, 'pt-BR');
    });
}

// Locais de escrita que podem ser escolhidos no gráfico de Assuntos: os que
// têm ao menos um texto escrito neles ou dentro deles (contagem agregada).
export function locaisDeEscritaParaSelecao() {
    const contagem = contarTextosPorLocalEscrita(db, textosDasEstatisticas());
    const ativos = (db.locais || []).filter((l) => contagem.get(String(l.id))?.agregados > 0);
    const rotulos = rotulosUnicosDeLocais(
        db,
        ativos.map((l) => l.id),
    );
    return ativos
        .map((l) => ({
            id: String(l.id),
            rotulo: rotulos.get(String(l.id)),
            n: contagem.get(String(l.id)).agregados,
        }))
        .sort((a, b) => b.n - a.n || a.rotulo.localeCompare(b.rotulo, 'pt-BR'));
}

// Assuntos dos textos escritos num Local (e dentro dele). Sem `localId`, de
// todos os textos que têm local de escrita. Usa o Assunto derivado dos Temas
// (qualquer papel), igual ao gráfico de Assuntos com "Todos". `textos` é o
// número de textos do recorte, para dizer na tela de quantos se trata.
export function agregarAssuntosPorLocalEscrita(localId = '') {
    const alvo = localId
        ? new Set([localId, ...descendentesDoLocal(db, localId)].map(String))
        : null;
    const existe = new Set((db.locais || []).map((l) => String(l.id)));
    const textos = textosDasEstatisticas().filter((t) => {
        if (t.localEscrita == null || !existe.has(String(t.localEscrita))) return false;
        return alvo ? alvo.has(String(t.localEscrita)) : true;
    });
    const contagem = contarTextosPorAssunto(textos, db.assuntos, db.temas);
    const ordenado = [...contagem.entries()]
        .map(([id, n]) => [(db.assuntos || []).find((a) => a.id === id)?.nome || '', n])
        .filter(([nome, n]) => nome && n > 0)
        .sort((a, b) => b[1] - a[1]);
    return {
        labels: ordenado.map((o) => o[0]),
        data: ordenado.map((o) => o[1]),
        textos: textos.length,
    };
}

// Grafia de exibição de cada idioma: a mais usada no corpus filtrado (em
// qualquer papel), empate pela que apareceu primeiro. Fixar a grafia pelo
// corpus todo, e não pelo recorte do papel, evita o rótulo trocar de
// "Inglês" para "ingles" quando a pessoa muda o papel.
function grafiasDeIdioma(textos) {
    const porChave = new Map();
    textos.forEach((t) => {
        idiomasDoItem(t).forEach((e) => {
            const chave = chaveTema(e.idioma);
            if (!porChave.has(chave)) porChave.set(chave, new Map());
            const grafias = porChave.get(chave);
            grafias.set(e.idioma, (grafias.get(e.idioma) || 0) + 1);
        });
    });
    const saida = new Map();
    porChave.forEach((grafias, chave) => {
        let melhor = null;
        grafias.forEach((n, grafia) => {
            if (!melhor || n > melhor.n) melhor = { grafia, n };
        });
        saida.set(chave, melhor.grafia);
    });
    return saida;
}

// Textos por idioma. `papel`: 'todos', 'principal' ou 'secundario'. Um texto
// conta uma vez em cada idioma que tem (e, em 'principal', uma vez em cada
// Principal), então a soma das barras pode passar do total. `textos` devolve
// quantos textos entraram no recorte (têm ao menos um idioma desse papel).
// Idiomas iguais sem caixa nem acento ficam juntos (ver grafiasDeIdioma).
export function agregarPorIdioma(papel = getPapelIdiomaEstatisticas()) {
    const textos = textosDasEstatisticas();
    const grafias = grafiasDeIdioma(textos);
    const contagem = new Map();
    let textosComIdioma = 0;
    textos.forEach((t) => {
        const vistos = new Set();
        idiomasDoItem(t).forEach((e) => {
            if (papel !== 'todos' && e.papel !== papel) return;
            const chave = chaveTema(e.idioma);
            if (vistos.has(chave)) return;
            vistos.add(chave);
            const atual = contagem.get(chave) || { label: grafias.get(chave), n: 0 };
            atual.n += 1;
            contagem.set(chave, atual);
        });
        if (vistos.size) textosComIdioma += 1;
    });
    const ordenado = [...contagem.values()].sort(
        (a, b) => b.n - a.n || a.label.localeCompare(b.label, 'pt-BR'),
    );
    return {
        labels: ordenado.map((o) => o.label),
        data: ordenado.map((o) => o.n),
        textos: textosComIdioma,
    };
}
