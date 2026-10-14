// Bloco 3 — interface dos campos novos do modal de Período Biográfico
// (Esfera, Categoria, Pessoas envolvidas e Relações, cada relação com
// Natureza e Vínculo). O estado fica aqui,
// em memória, enquanto o modal está aberto; forms.js lê com
// `lerCamposPeriodoBiografico()` ao salvar. Só lógica de tela: as regras
// moram em periodo-biografico-campos.js.

import { db } from './db.js';
import { escapeHtml, mostrarAviso } from './utils.js';
import { opcoesOcultasDosPeriodos } from './ocultas-periodos.js';
import {
    autoresCabemNoPai,
    caminhoDosAncestraisDoPeriodo,
    criarComparadorDeEpocas,
    opcoesDePaiBiografico,
} from './periodos-biograficos-hierarquia.js';
import {
    AUTOR,
    periodosVisiveis,
    normalizarLista,
    normalizarEnvolvidosDoPeriodo,
    opcoesDoPeriodoBiografico,
    naturezaSugeridaDoVinculo,
    notaDoVinculo,
    fraseDaRelacao,
    chaveValor,
} from './periodo-biografico-campos.js';

let _esferas = [];
let _categorias = [];
let _pessoas = []; // [{ pessoaId }]
let _relacoes = []; // [{ de, para, natureza, vinculo }]; linhas incompletas só valem em tela
let _pais = []; // ids dos períodos pais ("Faz parte de"); o primeiro é o principal
let _idEditando = null; // id do período aberto no modal (null se é novo)

const CLASSE_CHIP =
    'inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300';

function criarChip(texto, aoRemover, rotuloRemover) {
    const chip = document.createElement('span');
    chip.className = CLASSE_CHIP;
    const rotulo = document.createElement('span');
    rotulo.textContent = texto;
    const remover = document.createElement('button');
    remover.type = 'button';
    remover.textContent = '×';
    remover.title = 'Remover';
    remover.setAttribute('aria-label', rotuloRemover || `Remover ${texto}`);
    remover.onclick = aoRemover;
    chip.append(rotulo, remover);
    return chip;
}

function preencherDatalist(id, valores) {
    const lista = document.getElementById(id);
    if (!lista) return;
    lista.innerHTML = valores.map((v) => `<option value="${escapeHtml(v)}"></option>`).join('');
}

// Liga um campo de texto a uma lista de tags: Enter ou vírgula adiciona; sair
// do campo com texto também adiciona (celular não tem Enter confiável).
function ligarEntradaDeTags(inputId, aoAdicionar) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const confirmar = () => {
        const valor = input.value.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
        input.value = '';
        if (valor) aoAdicionar(valor);
    };
    input.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            e.stopPropagation(); // Enter não pode salvar o modal inteiro
            confirmar();
        }
    };
    input.onchange = confirmar;
    input.onblur = confirmar;
}

function adicionarSemRepetir(lista, valor) {
    return normalizarLista([...lista, valor]);
}

// ─── Esfera e Categoria (tags) ───────────────────────────────────────────

function renderTags(chipsId, lista, remover) {
    const chips = document.getElementById(chipsId);
    if (!chips) return;
    chips.innerHTML = '';
    lista.forEach((v) => chips.appendChild(criarChip(v, () => remover(v))));
}

function renderEsferas() {
    renderTags('ep-esferas-chips', _esferas, (v) => {
        _esferas = _esferas.filter((x) => x !== v);
        renderEsferas();
    });
    preencherDatalist(
        'sugestoes-ep-esferas',
        opcoesDoPeriodoBiografico(db, 'esferas').filter(
            (o) => !_esferas.some((e) => chaveValor(e) === chaveValor(o)),
        ),
    );
}

function renderCategorias() {
    renderTags('ep-categorias-chips', _categorias, (v) => {
        _categorias = _categorias.filter((x) => x !== v);
        renderCategorias();
    });
    preencherDatalist(
        'sugestoes-ep-categorias',
        opcoesDoPeriodoBiografico(db, 'categorias').filter(
            (o) => !_categorias.some((c) => chaveValor(c) === chaveValor(o)),
        ),
    );
}

// ─── Pessoas envolvidas e Relações ───────────────────────────────────────

// "Mostrar ocultas": só enquanto o modal está aberto. Nunca é guardado em
// lugar nenhum e volta a esconder toda vez que o modal abre (o app é mostrado
// a outras pessoas; um estado que persistisse seria um vazamento esperando).
let _mostrarOcultas = false;

const pessoaVisivel = (id) => db.pessoas.find((p) => p.id == id && (_mostrarOcultas || !p.oculto));

const rotuloPessoa = (p) => (p.oculto ? `${p.nome} (oculta)` : p.nome);

function atualizarBotaoOcultas() {
    const botao = document.getElementById('ep-mostrar-ocultas');
    if (!botao) return;
    // Sem nenhuma pessoa oculta no cadastro o botão não teria o que mostrar.
    botao.classList.toggle('hidden', !db.pessoas.some((p) => p.oculto));
    botao.setAttribute('aria-pressed', String(_mostrarOcultas));
    botao.textContent = _mostrarOcultas ? 'Esconder ocultas' : 'Mostrar ocultas';
    botao.onclick = () => {
        _mostrarOcultas = !_mostrarOcultas;
        atualizarBotaoOcultas();
        renderPessoas();
        renderRelacoes();
    };
}

function autorAtual() {
    const id = document.getElementById('ep-autor')?.value;
    const autor = id ? (db.autores || []).find((a) => a.id == id) : null;
    return { id: AUTOR, nome: autor?.nome || 'Autor', genero: autor?.genero || '' };
}

// Ponta da relação como a tela mostra: o autor ou uma pessoa visível.
function pontaParaTela(valor) {
    if (valor === AUTOR) return autorAtual();
    const pessoa = pessoaVisivel(valor);
    return pessoa
        ? { id: pessoa.id, nome: rotuloPessoa(pessoa), genero: pessoa.genero || '' }
        : null;
}

function valorDaPonta(texto) {
    if (texto === AUTOR) return AUTOR;
    const n = Number(texto);
    return texto === '' || !Number.isFinite(n) ? '' : n;
}

function textoDaPreview(relacao) {
    const de = pontaParaTela(relacao.de);
    const para = pontaParaTela(relacao.para);
    const natureza = String(relacao.natureza || '').trim();
    const vinculo = String(relacao.vinculo || '').trim();
    if (!de || !para || (!natureza && !vinculo))
        return 'Escolha as duas pontas e a Natureza ou o vínculo.';
    if (relacao.de === relacao.para) return 'As duas pontas precisam ser diferentes.';
    return fraseDaRelacao({ ...relacao, natureza, vinculo }, de, para, db);
}

// Select de Natureza: as do vocabulário e as que já estão em uso. Uma
// Natureza digitada à mão não existe aqui: ela nasce em "Esferas, naturezas e
// vínculos" ou na edição em massa.
function selectDeNatureza(selecionada) {
    const select = document.createElement('select');
    select.style.cssText = 'margin-bottom: 0';
    const vazio = document.createElement('option');
    vazio.value = '';
    vazio.textContent = 'Natureza...';
    select.appendChild(vazio);
    const opcoes = opcoesDoPeriodoBiografico(db, 'naturezas');
    const atual = String(selecionada || '').trim();
    // Valor fora da lista (relação antiga) continua escolhível.
    if (atual && !opcoes.some((o) => chaveValor(o) === chaveValor(atual))) opcoes.push(atual);
    opcoes.forEach((valor) => {
        const opt = document.createElement('option');
        opt.value = valor;
        opt.textContent = valor;
        select.appendChild(opt);
    });
    const achada = opcoes.find((o) => chaveValor(o) === chaveValor(atual));
    select.value = achada || '';
    return select;
}

function opcoesDePonta(selecionada) {
    const autor = autorAtual();
    const opcoes = [{ valor: AUTOR, rotulo: `${autor.nome} (autor)` }];
    _pessoas.forEach(({ pessoaId }) => {
        const pessoa = pessoaVisivel(pessoaId);
        if (pessoa) opcoes.push({ valor: String(pessoa.id), rotulo: rotuloPessoa(pessoa) });
    });
    const select = document.createElement('select');
    select.style.cssText = 'margin-bottom: 0';
    const vazio = document.createElement('option');
    vazio.value = '';
    vazio.textContent = 'Escolha...';
    select.appendChild(vazio);
    opcoes.forEach(({ valor, rotulo }) => {
        const opt = document.createElement('option');
        opt.value = valor;
        opt.textContent = rotulo;
        select.appendChild(opt);
    });
    select.value = selecionada === '' || selecionada == null ? '' : String(selecionada);
    return select;
}

function renderPessoas() {
    const lista = document.getElementById('ep-pessoas-lista');
    const select = document.getElementById('ep-pessoas-select');
    if (!lista || !select) return;

    lista.innerHTML = '';
    // Pessoa oculta (ou apagada) não aparece na tela de edição; a entrada
    // fica no estado e é gravada de volta sem mudança.
    _pessoas.forEach((entrada) => {
        const pessoa = pessoaVisivel(entrada.pessoaId);
        if (!pessoa) return;
        const chip = criarChip(
            rotuloPessoa(pessoa),
            () => {
                _pessoas = _pessoas.filter((p) => p.pessoaId != entrada.pessoaId);
                // Tirar a pessoa tira também as relações dela.
                _relacoes = _relacoes.filter(
                    (r) => r.de != entrada.pessoaId && r.para != entrada.pessoaId,
                );
                renderPessoas();
                renderRelacoes();
            },
            `Remover ${pessoa.nome}`,
        );
        chip.dataset.pessoaId = String(entrada.pessoaId);
        lista.appendChild(chip);
    });

    const jaNaLista = new Set(_pessoas.map((p) => Number(p.pessoaId)));
    const disponiveis = db.pessoas
        .filter((p) => (_mostrarOcultas || !p.oculto) && !jaNaLista.has(p.id))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    select.innerHTML =
        '<option value="">Adicionar pessoa...</option>' +
        disponiveis
            .map((p) => `<option value="${p.id}">${escapeHtml(rotuloPessoa(p))}</option>`)
            .join('');
    select.value = '';
    select.onchange = () => {
        if (!select.value) return;
        _pessoas.push({ pessoaId: Number(select.value) });
        renderPessoas();
        renderRelacoes();
    };
}

function renderRelacoes() {
    const lista = document.getElementById('ep-relacoes-lista');
    if (!lista) return;
    lista.innerHTML = '';
    // Relação com pessoa oculta (ou apagada) não aparece aqui e é gravada de
    // volta sem mudança. O índice é o da lista inteira.
    _relacoes.forEach((relacao, i) => {
        const deOk = relacao.de === '' || pontaParaTela(relacao.de);
        const paraOk = relacao.para === '' || pontaParaTela(relacao.para);
        if (!deOk || !paraOk) return;

        const linha = document.createElement('div');
        linha.className =
            'border border-gray-200 dark:border-slate-700 rounded p-2 flex flex-col gap-2';
        linha.dataset.relacao = String(i);

        const campos = document.createElement('div');
        campos.className = 'grid grid-cols-1 sm:grid-cols-2 gap-2 items-center';
        const de = opcoesDePonta(relacao.de);
        de.id = `ep-rel-de-${i}`;
        de.setAttribute('aria-label', 'Quem');
        const natureza = selectDeNatureza(relacao.natureza);
        natureza.id = `ep-rel-natureza-${i}`;
        natureza.setAttribute('aria-label', 'Natureza');
        const vinculo = document.createElement('input');
        vinculo.type = 'text';
        vinculo.id = `ep-rel-vinculo-${i}`;
        vinculo.setAttribute('list', 'sugestoes-ep-vinculos');
        vinculo.setAttribute('aria-label', 'Vínculo (opcional)');
        vinculo.placeholder = 'Vínculo (opcional, ex: namorados)';
        vinculo.autocomplete = 'off';
        vinculo.value = relacao.vinculo || '';
        vinculo.style.cssText = 'margin-bottom: 0';
        const para = opcoesDePonta(relacao.para);
        para.id = `ep-rel-para-${i}`;
        para.setAttribute('aria-label', 'Com quem');
        campos.append(de, para, natureza, vinculo);

        const rodape = document.createElement('div');
        rodape.className = 'flex items-center justify-between gap-2';
        const previa = document.createElement('span');
        previa.id = `ep-rel-previa-${i}`;
        previa.className = 'text-xs text-gray-500 dark:text-slate-400';
        previa.textContent = textoDaPreview(relacao);
        const remover = document.createElement('button');
        remover.type = 'button';
        remover.className = 'text-xs text-red-500 hover:underline flex-shrink-0';
        remover.textContent = 'Remover relação';
        remover.onclick = () => {
            _relacoes.splice(i, 1);
            renderRelacoes();
        };
        rodape.append(previa, remover);

        const atualizar = () => {
            previa.textContent = textoDaPreview(relacao);
            // A nota do vínculo (se ele tem uma) explica o termo ao passar o mouse.
            previa.title = notaDoVinculo(db, relacao.vinculo);
        };
        previa.title = notaDoVinculo(db, relacao.vinculo);
        de.onchange = () => {
            relacao.de = valorDaPonta(de.value);
            atualizar();
        };
        para.onchange = () => {
            relacao.para = valorDaPonta(para.value);
            atualizar();
        };
        natureza.onchange = () => {
            relacao.natureza = natureza.value;
            // Escolha da pessoa: a sugestão do vínculo não mexe mais nela,
            // a não ser que ela volte a deixar a Natureza vazia.
            relacao._sugerida = '';
            atualizar();
        };
        vinculo.oninput = () => {
            relacao.vinculo = vinculo.value;
            atualizar();
        };
        // Ao confirmar o vínculo (sair do campo ou escolher da lista), a Natureza
        // vem preenchida com a sugerida, se houver. Só preenche quando a
        // Natureza está vazia ou ainda é a que a sugestão anterior pôs:
        // uma Natureza escolhida à mão nunca é trocada sozinha.
        vinculo.onchange = () => {
            relacao.vinculo = vinculo.value;
            const sugerida = naturezaSugeridaDoVinculo(db, vinculo.value);
            const livre = !relacao.natureza || relacao.natureza === relacao._sugerida;
            if (sugerida && livre) {
                relacao.natureza = sugerida;
                relacao._sugerida = sugerida;
                // Atualiza o select no lugar (sem redesenhar a linha, para não
                // tirar o foco de quem está passando para o campo seguinte).
                if (![...natureza.options].some((o) => o.value === sugerida)) {
                    const opt = document.createElement('option');
                    opt.value = sugerida;
                    opt.textContent = sugerida;
                    natureza.appendChild(opt);
                }
                natureza.value = sugerida;
            }
            atualizar();
        };
        vinculo.onkeydown = (e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            e.stopPropagation(); // Enter não pode salvar o modal inteiro
            vinculo.onchange();
        };
        linha.append(campos, rodape);
        lista.appendChild(linha);
    });
    preencherDatalist('sugestoes-ep-vinculos', opcoesDoPeriodoBiografico(db, 'vinculos'));

    const botao = document.getElementById('ep-relacoes-adicionar');
    if (botao) {
        botao.onclick = () => {
            _relacoes.push({ de: AUTOR, para: '', natureza: '', vinculo: '' });
            renderRelacoes();
            document.getElementById(`ep-rel-vinculo-${_relacoes.length - 1}`)?.focus();
        };
    }
}

// ─── Faz parte de ────────────────────────────────────────────────────────
// Períodos pais, como chips: o primeiro é o principal (define o caminho
// mostrado) e um clique nos outros o promove. O seletor oferece, em árvore,
// só períodos do mesmo autor, menos o que está sendo editado e os de dentro
// dele. Pai oculto (sem "Exibir ocultas" ligado) não aparece nos chips nem no
// seletor, mas continua na lista e é regravado sem mudança.

function filhoEmEdicao() {
    return {
        id: _idEditando,
        autorId: parseInt(document.getElementById('ep-autor')?.value) || null,
    };
}

function rotuloDoPai(lista, p) {
    const acima = caminhoDosAncestraisDoPeriodo(lista, p.id);
    return acima ? `${p.nome} (${acima})` : p.nome;
}

function renderPais() {
    const chips = document.getElementById('ep-pais-chips');
    const select = document.getElementById('ep-pais-select');
    if (!chips || !select) return;
    // Pai que deixou de existir sai da lista sem barulho.
    _pais = _pais.filter((id) => db.epocas.some((p) => p.id == id));
    const lista = periodosVisiveis(db.epocas, opcoesOcultasDosPeriodos());

    chips.innerHTML = '';
    _pais.forEach((id, i) => {
        const reg = lista.find((p) => p.id == id);
        if (!reg) return;
        const chip = document.createElement('span');
        chip.className = CLASSE_CHIP;
        const rotulo = document.createElement('button');
        rotulo.type = 'button';
        rotulo.textContent = rotuloDoPai(lista, reg) + (i === 0 ? ' · principal' : '');
        rotulo.title = i === 0 ? 'Período principal' : 'Tornar principal';
        if (i === 0) rotulo.disabled = true;
        rotulo.onclick = () => {
            _pais = [id, ..._pais.filter((x) => x != id)];
            renderPais();
        };
        const remover = document.createElement('button');
        remover.type = 'button';
        remover.textContent = '×';
        remover.title = 'Remover';
        remover.setAttribute('aria-label', `Remover ${reg.nome}`);
        remover.onclick = () => {
            _pais = _pais.filter((x) => x != id);
            renderPais();
        };
        chip.append(rotulo, remover);
        chips.appendChild(chip);
    });

    const opcoes = opcoesDePaiBiografico(lista, filhoEmEdicao(), criarComparadorDeEpocas(lista));
    select.innerHTML =
        '<option value="">Adicionar período pai...</option>' +
        opcoes
            .map(({ m, nivel }) => {
                const jaEsta = _pais.some((x) => x == m.id);
                const recuo = '\u00a0\u00a0\u00a0\u00a0'.repeat(nivel) + (nivel ? '↳ ' : '');
                return `<option value="${m.id}" title="${escapeHtml(rotuloDoPai(lista, m))}"${jaEsta ? ' disabled' : ''}>${recuo}${escapeHtml(m.nome)}${jaEsta ? ' ✓' : ''}</option>`;
            })
            .join('');
    select.value = '';
    select.onchange = () => {
        if (!select.value) return;
        _pais.push(Number(select.value));
        renderPais();
    };
}

// Trocar o Autor: pai de outro autor não vale mais. Sai da lista, com aviso.
function aoTrocarAutor() {
    const filho = filhoEmEdicao();
    const saem = _pais.filter((id) => {
        const pai = db.epocas.find((p) => p.id == id);
        return pai && !autoresCabemNoPai(filho, pai);
    });
    if (saem.length) {
        _pais = _pais.filter((id) => !saem.includes(id));
        const nomes = saem.map((id) => `"${db.epocas.find((p) => p.id == id)?.nome}"`).join(', ');
        mostrarAviso(`${nomes} saiu de "Faz parte de": é de outro autor.`, 'info');
    }
    renderPais();
    renderRelacoes();
}

// ─── API usada por forms.js ──────────────────────────────────────────────

export function preencherCamposPeriodoBiografico(epoca = null) {
    _esferas = normalizarLista(epoca?.esferas);
    _categorias = normalizarLista(epoca?.categorias);
    const envolvidos = normalizarEnvolvidosDoPeriodo(epoca || {});
    _pessoas = envolvidos.pessoasEnvolvidas;
    _relacoes = envolvidos.relacoes.map((r) => ({ ...r }));
    _pais = Array.isArray(epoca?.pertenceA) ? [...epoca.pertenceA] : [];
    _idEditando = epoca?.id ?? null;
    _mostrarOcultas = false; // cada abertura do modal começa escondendo
    ligarEntradaDeTags('ep-esferas-input', (v) => {
        _esferas = adicionarSemRepetir(_esferas, v);
        renderEsferas();
    });
    ligarEntradaDeTags('ep-categorias-input', (v) => {
        _categorias = adicionarSemRepetir(_categorias, v);
        renderCategorias();
    });
    // Trocar o Autor muda o nome e o gênero da ponta "autor" e os pais possíveis.
    const autor = document.getElementById('ep-autor');
    if (autor) autor.onchange = aoTrocarAutor;
    renderPais();
    renderEsferas();
    renderCategorias();
    atualizarBotaoOcultas();
    renderPessoas();
    renderRelacoes();
}

// Valores digitados e ainda não confirmados (Enter/blur) também entram. Linha
// de relação incompleta (sem vínculo ou sem as duas pontas) fica de fora.
export function lerCamposPeriodoBiografico() {
    const pendente = (id) => (document.getElementById(id)?.value || '').replace(/,/g, ' ').trim();
    const esferas = normalizarLista([..._esferas, pendente('ep-esferas-input')]);
    const categorias = normalizarLista([..._categorias, pendente('ep-categorias-input')]);
    const { pessoasEnvolvidas, relacoes } = normalizarEnvolvidosDoPeriodo({
        pessoasEnvolvidas: _pessoas,
        relacoes: _relacoes,
    });
    const pertenceA = [...new Set(_pais.map(Number))];
    return { esferas, categorias, pessoasEnvolvidas, relacoes, pertenceA };
}
