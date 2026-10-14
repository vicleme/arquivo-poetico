// Bloco 3 — modal "Esferas, naturezas e vínculos": gerencia as listas
// editáveis de Esfera, Natureza e Vínculo do Período Biográfico
// (db.opcoesPeriodoBiografico) e, em cada Vínculo, a Natureza sugerida, o lado
// oposto e as formas por gênero.
// Só lógica de tela; as regras (renomear propaga, só apaga o que ninguém
// usa) moram em periodo-biografico-campos.js.

import { db, save } from './db.js';
import { toggleModal, garantirModal } from './ui.js';
import { abrirModalConfirmacao, mostrarAviso } from './utils.js';
import {
    acharRotuloVinculo,
    chaveValor,
    contarUsoOpcao,
    definirNaturezaSugerida,
    definirVinculoVaria,
    definirRotuloVinculo,
    naturezaSugeridaDoVinculo,
    vinculoVariaDeNatureza,
    normalizarLista,
    notaDoVinculo,
    opcoesDoPeriodoBiografico,
    removerOpcaoPeriodoBiografico,
    renomearOpcaoPeriodoBiografico,
} from './periodo-biografico-campos.js';
import { renderEpocas } from './render-listas.js';

const TIPOS = [
    { tipo: 'esferas', singular: 'esfera' },
    { tipo: 'naturezas', singular: 'natureza' },
    { tipo: 'vinculos', singular: 'vínculo' },
];

function afterChange() {
    save();
    renderEpocas();
    renderOpcoes();
}

const CAMPOS_PAPEL = [
    { campo: 'inverso', rotulo: 'Lado oposto', exemplo: 'Filho ou filha de' },
    { campo: 'feminino', rotulo: 'Forma feminina', exemplo: 'Mãe de' },
    { campo: 'masculino', rotulo: 'Forma masculina', exemplo: 'Pai de' },
    { campo: 'inversoFeminino', rotulo: 'Lado oposto, forma feminina', exemplo: 'Filha de' },
    { campo: 'inversoMasculino', rotulo: 'Lado oposto, forma masculina', exemplo: 'Filho de' },
    {
        campo: 'pluralFeminino',
        rotulo: 'Plural feminino (só vínculo sem lado oposto)',
        exemplo: 'Amigas',
    },
    {
        campo: 'pluralMasculino',
        rotulo: 'Plural masculino',
        exemplo: 'Amigos',
    },
    {
        campo: 'pluralNeutro',
        rotulo: 'Plural neutro, para grupo misto (se vazio, usa o masculino)',
        exemplo: 'Amigues',
    },
    {
        campo: 'nota',
        rotulo: 'Nota (explica o termo; aparece ao passar o mouse e na prévia da relação)',
        exemplo: 'o que o termo quer dizer',
        multilinha: true,
    },
];

// Painel de um Vínculo: lado oposto (vínculo orientado) e formas por gênero.
function painelDePapeis(valor) {
    const atual = acharRotuloVinculo(db, valor)?.rotulo || {};
    const painel = document.createElement('div');
    painel.className =
        'hidden mt-2 ml-2 p-3 rounded border border-gray-200 dark:border-slate-700 space-y-2';
    painel.dataset.painelPapeis = valor;
    const ajuda = document.createElement('p');
    ajuda.className = 'text-[10px] text-gray-400 dark:text-slate-500';
    ajuda.textContent =
        'Sem lado oposto, o vínculo vale igual para os dois (Amizade). Com lado oposto, quem vem primeiro na relação tem o papel do nome, e o outro tem o lado oposto. As formas por gênero valem para quem tem Gênero Mulher ou Homem no cadastro; qualquer outro valor usa o nome neutro. Em vínculo sem lado oposto, os plurais montam "Ana e Mariana são amigas": duas Mulheres usam o feminino, dois Homens o masculino, e qualquer outra combinação o neutro (se estiver vazio, o masculino).';
    painel.appendChild(ajuda);
    const entradas = {};
    CAMPOS_PAPEL.forEach(({ campo, rotulo, exemplo, multilinha }) => {
        const bloco = document.createElement('label');
        bloco.className = 'block text-xs text-gray-600 dark:text-slate-300';
        bloco.textContent = rotulo;
        const input = document.createElement(multilinha ? 'textarea' : 'input');
        if (multilinha) input.rows = 3;
        else input.type = 'text';
        input.autocomplete = 'off';
        input.placeholder = `Ex: ${exemplo}`;
        input.value = atual[campo] || '';
        input.dataset.campoPapel = campo;
        input.dataset.original = input.value;
        input.style.marginBottom = '0';
        input.onkeydown = (e) => {
            if (e.key !== 'Enter') return;
            e.stopPropagation(); // Enter não pode salvar o modal inteiro
            if (!multilinha) e.preventDefault();
        };
        entradas[campo] = input;
        bloco.appendChild(input);
        painel.appendChild(bloco);
    });
    const salvar = document.createElement('button');
    salvar.type = 'button';
    salvar.className = 'text-xs text-blue-600 dark:text-blue-400 hover:underline';
    salvar.textContent = 'Salvar papéis';
    salvar.onclick = () => {
        const detalhes = Object.fromEntries(
            CAMPOS_PAPEL.map(({ campo }) => [campo, entradas[campo].value]),
        );
        const r = definirRotuloVinculo(db, valor, detalhes);
        if (!r.ok) {
            mostrarAviso(
                r.motivo === 'conflito'
                    ? 'Esse nome de lado oposto já existe como outro vínculo.'
                    : 'Não foi possível salvar os papéis.',
            );
            return;
        }
        afterChange();
    };
    painel.appendChild(salvar);
    return painel;
}

const VALOR_VARIA = '__varia__';

// "Natureza sugerida" de um Vínculo: ao escolher o vínculo numa relação, a
// Natureza vem preenchida com esta (e pode ser trocada lá).
function selectDeNaturezaSugerida(vinculo) {
    const select = document.createElement('select');
    select.style.cssText = 'margin-bottom: 0; width: auto; max-width: 9rem';
    select.dataset.naturezaSugerida = vinculo;
    select.setAttribute('aria-label', `Natureza sugerida para ${vinculo}`);
    select.title = 'Natureza sugerida ao escolher este vínculo';
    const vazio = document.createElement('option');
    vazio.value = '';
    vazio.textContent = 'Sem sugestão';
    select.appendChild(vazio);
    const varia = document.createElement('option');
    varia.value = VALOR_VARIA;
    varia.textContent = 'Varia';
    varia.title = 'Não tem uma Natureza só. Não preenche nada ao escolher o vínculo.';
    select.appendChild(varia);
    opcoesDoPeriodoBiografico(db, 'naturezas').forEach((n) => {
        const opt = document.createElement('option');
        opt.value = n;
        opt.textContent = n;
        select.appendChild(opt);
    });
    const atual = naturezaSugeridaDoVinculo(db, vinculo);
    select.value = [...select.options].some((o) => o.value === atual) ? atual : '';
    if (vinculoVariaDeNatureza(db, vinculo)) select.value = VALOR_VARIA;
    select.onchange = () => {
        if (select.value === VALOR_VARIA) definirVinculoVaria(db, vinculo);
        else definirNaturezaSugerida(db, vinculo, select.value);
        afterChange();
    };
    return select;
}

function linhaDoValor(tipo, singular, valor) {
    const uso = contarUsoOpcao(db, tipo, valor);
    const bloco = document.createElement('div');
    const linha = document.createElement('div');
    linha.className = 'flex items-center gap-2';
    linha.dataset.valor = valor;
    bloco.appendChild(linha);

    const input = document.createElement('input');
    input.type = 'text';
    input.value = valor;
    input.dataset.nomeOriginal = valor;
    input.autocomplete = 'off';
    input.style.marginBottom = '0';
    input.style.flex = '1 1 0%';
    input.style.minWidth = '0';
    input.setAttribute('aria-label', `Nome da ${singular} ${valor}`);
    if (tipo === 'vinculos') input.title = notaDoVinculo(db, valor);

    const contagem = document.createElement('span');
    contagem.className = 'text-[10px] text-gray-400 dark:text-slate-500 font-mono flex-shrink-0';
    contagem.textContent = uso === 0 ? 'sem uso' : `${uso} período${uso !== 1 ? 's' : ''}`;

    const renomear = document.createElement('button');
    renomear.type = 'button';
    renomear.className = 'text-xs text-blue-600 dark:text-blue-400 hover:underline flex-shrink-0';
    renomear.textContent = 'Renomear';
    renomear.onclick = () => renomearValor(tipo, valor, input.value);
    input.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            renomearValor(tipo, valor, input.value);
        }
    };

    const apagar = document.createElement('button');
    apagar.type = 'button';
    apagar.className = 'text-xs text-red-500 hover:underline flex-shrink-0';
    apagar.textContent = 'Apagar';
    if (uso > 0) {
        apagar.disabled = true;
        apagar.classList.add('opacity-40', 'cursor-not-allowed');
        apagar.title = 'Em uso: renomeie ou tire dos períodos antes de apagar';
    } else {
        apagar.onclick = () => {
            if (removerOpcaoPeriodoBiografico(db, tipo, valor).ok) afterChange();
        };
    }

    linha.append(input, contagem, renomear);
    if (tipo === 'vinculos') {
        linha.appendChild(selectDeNaturezaSugerida(valor));
        const rotulo = acharRotuloVinculo(db, valor)?.rotulo;
        const papeis = document.createElement('button');
        papeis.type = 'button';
        papeis.className = 'text-xs text-blue-600 dark:text-blue-400 hover:underline flex-shrink-0';
        papeis.textContent = 'Papéis';
        papeis.title = rotulo?.inverso
            ? `Lado oposto: ${rotulo.inverso}`
            : 'Lado oposto e formas por gênero';
        const painel = painelDePapeis(valor);
        papeis.onclick = () => painel.classList.toggle('hidden');
        linha.appendChild(papeis);
        bloco.appendChild(painel);
    }
    linha.appendChild(apagar);
    return bloco;
}

// ─── Salvar tudo e aviso de alterações pendentes ─────────────
// Os botões de cada linha (Renomear, Salvar papéis, Adicionar) continuam
// valendo. O check do cabeçalho aplica de uma vez tudo o que está digitado e
// ainda não foi aplicado, e o X avisa quando sobra algo assim.

function modalOpcoes() {
    return document.getElementById('modal-opcoes-periodo-biografico');
}

// Nomes digitados que diferem do original e campos de Papéis alterados.
function pendencias() {
    const modal = modalOpcoes();
    if (!modal) return { renomes: [], papeis: [], novos: [] };
    const renomes = [];
    TIPOS.forEach(({ tipo }) => {
        modal.querySelectorAll(`#opb-${tipo}-lista input[data-nome-original]`).forEach((input) => {
            const novo = input.value.replace(/\s+/g, ' ').trim();
            if (novo !== input.dataset.nomeOriginal)
                renomes.push({ tipo, de: input.dataset.nomeOriginal, para: novo });
        });
    });
    const papeis = [];
    modal.querySelectorAll('[data-painel-papeis]').forEach((painel) => {
        const campos = [...painel.querySelectorAll('[data-campo-papel]')];
        if (campos.some((c) => c.value !== c.dataset.original)) {
            papeis.push({
                valor: painel.dataset.painelPapeis,
                detalhes: Object.fromEntries(campos.map((c) => [c.dataset.campoPapel, c.value])),
            });
        }
    });
    const novos = [];
    TIPOS.forEach(({ tipo }) => {
        const valor = (document.getElementById(`opb-${tipo}-novo`)?.value || '')
            .replace(/\s+/g, ' ')
            .trim();
        if (valor) novos.push({ tipo, valor });
    });
    return { renomes, papeis, novos };
}

export const rastreadorOpcoesPeriodoBiografico = {
    estaSujo() {
        const p = pendencias();
        return p.renomes.length + p.papeis.length + p.novos.length > 0;
    },
    // Chamado ao abrir e ao descartar: some o que ficou digitado nos campos de
    // "novo" (os nomes e Papéis são refeitos do banco por renderOpcoes).
    marcarLimpo() {
        TIPOS.forEach(({ tipo }) => {
            const input = document.getElementById(`opb-${tipo}-novo`);
            if (input) input.value = '';
        });
    },
};

// Aplica tudo o que está pendente. Se algo não puder ser aplicado (nome vazio,
// nome que já existe, conflito de lado oposto), nada muda e o modal fica
// aberto com o aviso. Devolve true quando aplicou e pode fechar.
export function salvarTudoOpcoesPeriodoBiografico() {
    const { renomes, papeis, novos } = pendencias();
    for (const { tipo, de, para } of renomes) {
        const singular = TIPOS.find((t) => t.tipo === tipo).singular;
        if (!para) {
            mostrarAviso(`O nome da ${singular} "${de}" não pode ficar vazio.`);
            return false;
        }
        const existe = opcoesDoPeriodoBiografico(db, tipo).some(
            (v) => chaveValor(v) === chaveValor(para) && chaveValor(v) !== chaveValor(de),
        );
        const ehLadoOposto =
            tipo === 'vinculos' &&
            chaveValor(para) !== chaveValor(de) &&
            acharRotuloVinculo(db, para)?.lado === 'inverso';
        if (existe || ehLadoOposto) {
            mostrarAviso(
                `"${para}" já existe. Para juntar com "${de}", use o botão Renomear da linha.`,
            );
            return false;
        }
    }
    // Papéis primeiro (pelo nome ainda antigo), depois os nomes.
    for (const { valor, detalhes } of papeis) {
        const r = definirRotuloVinculo(db, valor, detalhes);
        if (!r.ok) {
            mostrarAviso(
                r.motivo === 'conflito'
                    ? `O lado oposto de "${valor}" já existe como outro vínculo.`
                    : `Não foi possível salvar os papéis de "${valor}".`,
            );
            afterChange();
            return false;
        }
    }
    for (const { tipo, de, para } of renomes) {
        // "Papéis" pode ter mudado o rótulo; o nome direto continua o mesmo.
        const r = renomearOpcaoPeriodoBiografico(db, tipo, de, para);
        if (!r.ok) {
            mostrarAviso(`Não foi possível renomear "${de}" para "${para}".`);
            afterChange();
            return false;
        }
    }
    const op = db.opcoesPeriodoBiografico;
    novos.forEach(({ tipo, valor }) => {
        op[tipo] = normalizarLista([...(op[tipo] || []), valor]);
        const input = document.getElementById(`opb-${tipo}-novo`);
        if (input) input.value = '';
    });
    afterChange();
    return true;
}

function renomearValor(tipo, de, para) {
    const novo = String(para ?? '')
        .replace(/\s+/g, ' ')
        .trim();
    const singular = TIPOS.find((t) => t.tipo === tipo).singular;
    if (!novo) {
        mostrarAviso(`O nome da ${singular} não pode ficar vazio.`);
        renderOpcoes();
        return;
    }
    if (novo === de) return;
    if (
        tipo === 'vinculos' &&
        chaveValor(novo) !== chaveValor(de) &&
        acharRotuloVinculo(db, novo)?.lado === 'inverso'
    ) {
        mostrarAviso(`"${novo}" já é o lado oposto de outro vínculo.`);
        renderOpcoes();
        return;
    }
    const jaExiste =
        chaveValor(novo) !== chaveValor(de) &&
        opcoesDoPeriodoBiografico(db, tipo).some((v) => chaveValor(v) === chaveValor(novo));
    const aplicar = () => {
        const r = renomearOpcaoPeriodoBiografico(db, tipo, de, novo);
        if (!r.ok) {
            mostrarAviso(`"${novo}" já é o lado oposto de outro vínculo.`);
            renderOpcoes();
            return;
        }
        afterChange();
    };
    if (jaExiste) {
        abrirModalConfirmacao({
            titulo: `Juntar ${singular}s`,
            rotulo: `"${de}" e "${novo}"`,
            mensagem: `Já existe "${novo}". Os períodos que usam "${de}" passam a usar "${novo}", e os dois viram um só.`,
            textoConfirmar: 'Juntar',
            corConfirmar: '#2563eb',
            onConfirmar: aplicar,
        });
        return;
    }
    aplicar();
}

function adicionarValor(tipo) {
    const input = document.getElementById(`opb-${tipo}-novo`);
    if (!input) return;
    const valor = input.value.replace(/\s+/g, ' ').trim();
    if (!valor) return;
    const op = db.opcoesPeriodoBiografico;
    op[tipo] = normalizarLista([...(op[tipo] || []), valor]);
    input.value = '';
    afterChange();
    input.focus();
}

function renderOpcoes() {
    TIPOS.forEach(({ tipo, singular }) => {
        const lista = document.getElementById(`opb-${tipo}-lista`);
        if (!lista) return;
        lista.innerHTML = '';
        let valores = opcoesDoPeriodoBiografico(db, tipo);
        // O lado oposto de um vínculo se edita no painel dele, não como linha.
        if (tipo === 'vinculos')
            valores = valores.filter((v) => acharRotuloVinculo(db, v)?.lado !== 'inverso');
        if (valores.length === 0) {
            const vazio = document.createElement('p');
            vazio.className = 'text-xs text-gray-400 dark:text-slate-500';
            vazio.textContent = `Nenhuma ${singular} cadastrada.`;
            lista.appendChild(vazio);
            return;
        }
        if (tipo === 'vinculos' && ordemDosVinculos() === 'natureza') {
            renderVinculosPorNatureza(lista, valores, singular);
            return;
        }
        valores.forEach((v) => lista.appendChild(linhaDoValor(tipo, singular, v)));
    });
}

// ─── Organização da lista de Vínculos ────────────────────────
// 'alfabetica' (padrão) ou 'natureza' (agrupa pela Natureza sugerida de cada
// vínculo; quem não tem sugestão vai para o último grupo). Só muda como a
// lista aparece, e a escolha fica lembrada neste navegador.
const CHAVE_ORDEM_VINCULOS = 'arquivo-poetico:opb-ordem-vinculos';
let _ordemVinculos = null;

function ordemDosVinculos() {
    if (_ordemVinculos) return _ordemVinculos;
    let salvo;
    try {
        salvo = localStorage.getItem(CHAVE_ORDEM_VINCULOS);
    } catch {
        salvo = null;
    }
    _ordemVinculos = salvo === 'natureza' ? 'natureza' : 'alfabetica';
    return _ordemVinculos;
}

function definirOrdemDosVinculos(ordem) {
    _ordemVinculos = ordem === 'natureza' ? 'natureza' : 'alfabetica';
    try {
        localStorage.setItem(CHAVE_ORDEM_VINCULOS, _ordemVinculos);
    } catch {
        // sem armazenamento: vale só nesta sessão
    }
}

function renderVinculosPorNatureza(lista, valores, singular) {
    const naturezas = opcoesDoPeriodoBiografico(db, 'naturezas');
    const grupos = new Map(naturezas.map((n) => [n, []]));
    const semSugestao = [];
    const variam = [];
    valores.forEach((v) => {
        if (vinculoVariaDeNatureza(db, v)) {
            variam.push(v);
            return;
        }
        const sugerida = naturezaSugeridaDoVinculo(db, v);
        const chave = naturezas.find((n) => chaveValor(n) === chaveValor(sugerida));
        if (chave) grupos.get(chave).push(v);
        else semSugestao.push(v);
    });
    const secao = (titulo, itens) => {
        if (itens.length === 0) return;
        const cabecalho = document.createElement('p');
        cabecalho.className =
            'text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500 pt-2';
        cabecalho.dataset.grupoNatureza = titulo;
        cabecalho.textContent = titulo;
        lista.appendChild(cabecalho);
        itens.forEach((v) => lista.appendChild(linhaDoValor('vinculos', singular, v)));
    };
    grupos.forEach((itens, natureza) => secao(natureza, itens));
    secao('Varia', variam);
    secao('Sem natureza sugerida', semSugestao);
}

export function initOpcoesPeriodoBiografico() {
    const ordem = document.getElementById('opb-vinculos-ordem');
    if (ordem) {
        ordem.value = ordemDosVinculos();
        ordem.addEventListener('change', () => {
            // Reorganizar refaz a lista e perderia o que está digitado e não aplicado.
            if (rastreadorOpcoesPeriodoBiografico.estaSujo()) {
                ordem.value = ordemDosVinculos();
                mostrarAviso('Salve (check) ou descarte as alterações antes de reorganizar.');
                return;
            }
            definirOrdemDosVinculos(ordem.value);
            renderOpcoes();
        });
    }
    document.getElementById('opb-salvar-tudo')?.addEventListener('click', () => {
        if (salvarTudoOpcoesPeriodoBiografico()) toggleModal('modal-opcoes-periodo-biografico');
    });
    TIPOS.forEach(({ tipo }) => {
        document
            .getElementById(`opb-${tipo}-adicionar`)
            ?.addEventListener('click', () => adicionarValor(tipo));
        document.getElementById(`opb-${tipo}-novo`)?.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            e.stopPropagation();
            adicionarValor(tipo);
        });
    });
}

export async function abrirOpcoesPeriodoBiografico() {
    await garantirModal('modal-opcoes-periodo-biografico');
    renderOpcoes();
    rastreadorOpcoesPeriodoBiografico.marcarLimpo();
    toggleModal('modal-opcoes-periodo-biografico');
}
