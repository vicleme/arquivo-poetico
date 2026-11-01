// ============================================================
// corrigir-fora-do-acervo-ui.js: a tela das correções da seção "Fora do
// acervo" (renomear ou juntar uma obra ou um autor em todos os textos). A
// lógica fica em `corrigir-fora-do-acervo.js`. Aqui ficam o diálogo, a
// confirmação, o backup forçado antes de gravar e o "Desfazer".
//
// Fluxo: o botão abre o diálogo (ou, em "Manter esta", vai direto) → o pedido
// é planejado → a confirmação mostra quantos textos mudam → ao confirmar, tira
// um snapshot (se falhar, nada é gravado), planeja de novo, aplica, salva,
// redesenha a seção e oferece "Desfazer".
// ============================================================

import { db, save } from './db.js';
import { tirarSnapshotSeNecessario } from './autobackup.js';
import {
    abrirModalConfirmacao,
    mostrarAviso,
    mostrarAvisoComAcao,
    escapeHtml,
    TIPOS_REFERENCIA_EXTERNA_SUGERIDOS,
} from './utils.js';
import {
    TIPOS_OBRA_SUGERIDOS,
    extrairAutoresUnicos,
    extrairOrigensUnicas,
} from './intertextualidade.js';
import { chaveDeAutor } from './autores-da-obra.js';
import { chaveDeOrigem, mesmaListaDeOrigens, textoDasOrigens } from './origem-da-obra.js';
import { criarCampoTagsAutor } from './campo-tags-autor.js';
import { criarCampoDataObra } from './campo-data-obra.js';
import { MENSAGENS_ERRO_DATA_OBRA, pedidoDeDatas } from './data-da-obra.js';
import {
    planejarCorrecao,
    aplicarPlano,
    descreverPlano,
    MENSAGENS_ERRO_CORRECAO,
} from './corrigir-fora-do-acervo.js';
import {
    renderForaDoAcervo,
    obterObraForaDoAcervo,
    obterAutorForaDoAcervo,
    obterReferenciaForaDoAcervo,
    obterItemQuaseDuplicata,
} from './render-fora-do-acervo.js';

const ID_DIALOGO = 'modal-corrigir-fora-do-acervo';

const entrada = () => ({ poemas: db.poemas, prosas: db.prosas });
const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;

// Aviso de origem da obra (a origem não entra na identidade da obra, então cada
// entrada guarda a sua): vazio quando todas concordam, ou quando nenhuma tem
// origem. O campo Origem do diálogo acerta todas de uma vez; o Modo revisão
// acerta entrada por entrada.
export function avisoDeOrigemDaObra(obra) {
    const listas = (obra.origens || []).map(textoDasOrigens);
    const sem = obra.entradasSemOrigem || 0;
    if (!listas.length) return '';
    const sufixo =
        ' Para igualar todas, use o campo Origem abaixo; para acertar uma a uma, o Modo revisão.';
    if (listas.length > 1) {
        const faltam = sem ? ` e ${plural(sem, 'entrada sem origem', 'entradas sem origem')}` : '';
        return ` Origem: as entradas desta obra não concordam (${listas.join(' ou ')}${faltam}).${sufixo}`;
    }
    if (sem) {
        return ` Origem ${listas[0]}: ${plural(sem, 'entrada desta obra não a tem', 'entradas desta obra não a têm')}.${sufixo}`;
    }
    return '';
}

// ─── Pedido → confirmação → gravação ─────────────────────────

function mensagemDeConfirmacao(plano) {
    const { linhas, restantes } = descreverPlano(plano);
    const exemplos =
        linhas.join('; ') +
        (restantes ? ` e mais ${plural(restantes, 'mudança', 'mudanças')}` : '');
    const junta = plano.juntaCom
        ? ` Já ${plano.juntaCom === 1 ? 'há 1 texto' : `há ${plano.juntaCom} textos`} com o resultado: eles passam a contar juntos.`
        : '';
    const sobrescritas = plano.descricoesSobrescritas
        ? ` A descrição nova substitui uma descrição diferente em ${plural(plano.descricoesSobrescritas, 'entrada', 'entradas')}.`
        : '';
    const origens = plano.origensSobrescritas
        ? ` A origem nova substitui uma origem diferente em ${plural(plano.origensSobrescritas, 'entrada', 'entradas')}.`
        : '';
    const datas = plano.datasSobrescritas
        ? ` A data nova substitui uma data diferente em ${plural(plano.datasSobrescritas, 'entrada', 'entradas')}.`
        : '';
    const tipos = plano.tiposMudados
        ? ` O tipo muda em ${plural(plano.tiposMudados, 'entrada', 'entradas')}.`
        : '';
    const pessoas = plano.caracterizacoesPerdidas
        ? ` Deixar de ser Pessoa pública apaga o Conhecido(a) como, o gênero, a orientação e a cor/raça de ${plural(plano.caracterizacoesPerdidas, 'entrada', 'entradas')}; o Desfazer devolve.`
        : '';
    const marcas = plano.marcasMudadas
        ? ` A marca de obra pessoal muda em ${plural(plano.marcasMudadas, 'entrada', 'entradas')}.`
        : '';
    return (
        `Em ${plural(plano.textos, 'texto', 'textos')} (${plural(plano.entradas, 'entrada', 'entradas')}): ${exemplos}.${junta}${sobrescritas}${origens}${datas}${tipos}${pessoas}${marcas} ` +
        'Um backup é guardado antes de gravar, e dá para desfazer logo depois.'
    );
}

// Na data que não vale, o motivo vem de `erroData`; o resto, da tabela.
export function mensagemDeErroDaCorrecao(plano) {
    if (plano?.erro === 'data-invalida' && MENSAGENS_ERRO_DATA_OBRA[plano.erroData]) {
        return MENSAGENS_ERRO_DATA_OBRA[plano.erroData];
    }
    return MENSAGENS_ERRO_CORRECAO[plano?.erro] || 'Não foi possível corrigir.';
}

const TITULOS_DA_CONFIRMACAO = {
    autor: 'Corrigir autor',
    referencia: 'Corrigir referência',
    obra: 'Corrigir obra',
};

// `deps` existe para os testes (sem IndexedDB de verdade).
export function pedirCorrecao(pedido, deps = {}) {
    const snapshot = deps.tirarSnapshot || tirarSnapshotSeNecessario;
    const plano = planejarCorrecao(entrada(), pedido);
    if (plano.erro) {
        mostrarAviso(mensagemDeErroDaCorrecao(plano));
        return false;
    }
    if (!plano.entradas) {
        mostrarAviso('Nada a alterar: já está assim.', 'info');
        return false;
    }

    abrirModalConfirmacao({
        titulo: TITULOS_DA_CONFIRMACAO[pedido.tipo] || 'Corrigir obra',
        rotulo: 'Fora do acervo',
        mensagem: mensagemDeConfirmacao(plano),
        textoConfirmar: 'Aplicar',
        corConfirmar: '#2563eb',
        focarConfirmar: true,
        onConfirmar: async () => {
            const ok = await snapshot(db, true);
            if (!ok) {
                mostrarAviso('Não foi possível guardar o backup antes. Nada foi alterado.');
                return;
            }
            // Planeja de novo: os dados podem ter mudado desde a confirmação.
            const atual = planejarCorrecao(entrada(), pedido);
            const feito = aplicarPlano(atual);
            if (!feito.entradas) return;
            save();
            fecharDialogo();
            renderForaDoAcervo();
            mostrarAvisoComAcao(
                `${plural(feito.textos, 'texto atualizado', 'textos atualizados')}`,
                'Desfazer',
                () => {
                    feito.desfazer();
                    save();
                    renderForaDoAcervo();
                },
                8000,
            );
        },
    });
    return true;
}

// ─── "Manter esta" (nos avisos de quase-duplicata) ───────────

export function manterObraDoAviso(indiceAviso, indiceItem, deps) {
    const achado = obterItemQuaseDuplicata(indiceAviso, indiceItem);
    if (!achado?.item) return false;
    const alvo = achado.item;
    const alvos = [...new Set(achado.aviso.itens.map((i) => i.chave).filter(Boolean))];
    // A lista de autores vai inteira: a frase "A, B e C" seria lida como um
    // autor só. `autor` (a frase) fica só como reserva para um item sem lista.
    const novo = Array.isArray(alvo.autores)
        ? { obra: alvo.obra, autores: alvo.autores }
        : { obra: alvo.obra, autor: alvo.autor || '' };
    return pedirCorrecao({ tipo: 'obra', alvos, novo }, deps);
}

// ─── Diálogo (Corrigir obra / Corrigir autor) ────────────────

export function fecharDialogo() {
    document.getElementById(ID_DIALOGO)?.remove();
    document.removeEventListener('keydown', aoTeclar, true);
}

function aoTeclar(e) {
    if (e.key === 'Escape' && document.getElementById(ID_DIALOGO)) {
        // A confirmação (z-index maior) tem o próprio Esc; só fechamos o diálogo
        // quando ela não está na tela.
        const conf = document.getElementById('modal-confirmar-exclusao');
        if (conf && conf.style.display !== 'none') return;
        fecharDialogo();
    }
}

const CLASSE_CAMPO =
    'w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100';

function campo(id, rotulo, valor, { lista = '', obrigatorio = false } = {}) {
    return `
    <label class="block mb-3 text-xs font-semibold text-gray-500 dark:text-slate-400" for="${id}">
        ${escapeHtml(rotulo)}${obrigatorio ? ' *' : ''}
        <input id="${id}" type="text" autocomplete="off" value="${escapeHtml(valor)}" ${lista ? `list="${lista}"` : ''} class="${CLASSE_CAMPO} mt-1 font-normal" />
    </label>`;
}

function campoLongo(id, rotulo, valor, ajuda = '') {
    return `
    <label class="block mb-3 text-xs font-semibold text-gray-500 dark:text-slate-400" for="${id}">
        ${escapeHtml(rotulo)}
        <textarea id="${id}" rows="3" class="${CLASSE_CAMPO} mt-1 font-normal">${escapeHtml(valor)}</textarea>
        ${ajuda ? `<span class="block mt-1 text-[11px] font-normal text-gray-400 dark:text-slate-500">${escapeHtml(ajuda)}</span>` : ''}
    </label>`;
}

const ID_DATA = 'corrigir-fora-data';

function campoData(ajuda) {
    return `
    <div class="mb-3">
        <span class="block text-xs font-semibold text-gray-500 dark:text-slate-400">Data da obra</span>
        <div id="${ID_DATA}" class="mt-1 flex flex-col gap-1.5"></div>
        <span class="block mt-1 text-[11px] text-gray-400 dark:text-slate-500">${escapeHtml(ajuda)}</span>
    </div>`;
}

const ID_OBRA_PESSOAL = 'corrigir-fora-obra-pessoal';

// O check "Obra pessoal" do diálogo. Com as entradas divergentes (umas
// marcadas, outras não) ele abre meio-marcado (`indeterminate`, ligado depois
// do desenho): deixado assim não muda nada, e clicar escolhe um lado para todas.
function campoObraPessoal(obra) {
    const algumas = obra.obraPessoal === 'algumas';
    const ajuda = algumas
        ? `Hoje está marcada em ${obra.entradasPessoais} de ${plural(obra.entradasTotal, 'entrada', 'entradas')} desta obra. Deixado meio-marcado, nada muda; clicar escolhe um lado para todas.`
        : 'Faz parte da vida particular de quem escreve (um diário, uma carta, uma conversa), e não é uma obra reconhecida publicamente. Só muda se você mexer no check; aí vale para todos os textos.';
    return `
    <div class="mb-3">
        <label class="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-slate-400" for="${ID_OBRA_PESSOAL}">
            <input id="${ID_OBRA_PESSOAL}" type="checkbox" ${obra.obraPessoal === 'todas' ? 'checked' : ''} />
            Obra pessoal
        </label>
        <span class="block mt-1 text-[11px] text-gray-400 dark:text-slate-500">${escapeHtml(ajuda)}</span>
    </div>`;
}

// O que o check pede: `undefined` (não mexeu), ou o valor escolhido.
function pedidoDeObraPessoal(obra) {
    const caixa = document.getElementById(ID_OBRA_PESSOAL);
    if (!caixa) return undefined;
    if (obra.obraPessoal === 'algumas') return caixa.indeterminate ? undefined : caixa.checked;
    return caixa.checked === (obra.obraPessoal === 'todas') ? undefined : caixa.checked;
}

const ID_AUTOR_TAGS = 'corrigir-fora-autor';
const ID_LISTA_AUTORES = 'corrigir-fora-lista-autores';

function campoTags(id, rotulo, ajuda, listaId = ID_LISTA_AUTORES) {
    return `
    <div class="mb-3">
        <label class="block text-xs font-semibold text-gray-500 dark:text-slate-400" for="${id}">${escapeHtml(rotulo)}</label>
        <div id="${id}-chips" class="flex flex-wrap gap-1 mt-1 empty:hidden"></div>
        <input id="${id}" type="text" autocomplete="off" list="${listaId}" placeholder="Digite e aperte Enter ou vírgula" class="${CLASSE_CAMPO} mt-1 font-normal" />
        <span class="block mt-1 text-[11px] text-gray-400 dark:text-slate-500">${escapeHtml(ajuda)}</span>
    </div>`;
}

// As sugestões de autor são os já usados no acervo, menos quem já virou tag.
function atualizarSugestoesDeAutor(tags) {
    let lista = document.getElementById(ID_LISTA_AUTORES);
    if (!lista) {
        lista = document.createElement('datalist');
        lista.id = ID_LISTA_AUTORES;
        document.body.appendChild(lista);
    }
    const escolhidos = new Set(tags.obter().map(chaveDeAutor));
    const todos = extrairAutoresUnicos([...(db.poemas || []), ...(db.prosas || [])]);
    lista.innerHTML = todos
        .filter((nome) => !escolhidos.has(chaveDeAutor(nome)))
        .map((nome) => `<option value="${escapeHtml(nome)}"></option>`)
        .join('');
}

const ID_ORIGEM_TAGS = 'corrigir-fora-origem';
const ID_LISTA_ORIGENS = 'corrigir-fora-lista-origens';

// As sugestões de origem são as já usadas no acervo, menos quem já virou tag.
function atualizarSugestoesDeOrigem(tags) {
    let lista = document.getElementById(ID_LISTA_ORIGENS);
    if (!lista) {
        lista = document.createElement('datalist');
        lista.id = ID_LISTA_ORIGENS;
        document.body.appendChild(lista);
    }
    const escolhidos = new Set(tags.obter().map(chaveDeOrigem));
    const todas = extrairOrigensUnicas([...(db.poemas || []), ...(db.prosas || [])]);
    lista.innerHTML = todas
        .filter((nome) => !escolhidos.has(chaveDeOrigem(nome)))
        .map((nome) => `<option value="${escapeHtml(nome)}"></option>`)
        .join('');
}

function abrirDialogo({ titulo, descricao, camposHtml, aoRevisar }) {
    fecharDialogo();
    const overlay = document.createElement('div');
    overlay.id = ID_DIALOGO;
    overlay.className = 'fixed inset-0 z-[9000] bg-black/50 flex items-center justify-center p-4';
    overlay.innerHTML = `
    <div role="dialog" aria-modal="true" aria-labelledby="${ID_DIALOGO}-titulo" class="bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 rounded-xl w-full max-w-md md:max-w-xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
        <div id="${ID_DIALOGO}-corpo" class="p-6 pb-3 overflow-y-auto overscroll-contain">
            <p class="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-1">Fora do acervo</p>
            <h3 id="${ID_DIALOGO}-titulo" class="text-base font-bold mb-1">${escapeHtml(titulo)}</h3>
            <p class="text-xs text-gray-500 dark:text-slate-400 mb-4">${escapeHtml(descricao)}</p>
            ${camposHtml}
        </div>
        <div class="flex justify-end gap-2 px-6 py-3 border-t border-gray-200 dark:border-slate-700 shrink-0">
            <button type="button" data-corrigir="cancelar" class="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-slate-600">Cancelar</button>
            <button type="button" data-corrigir="revisar" class="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white font-semibold">Revisar</button>
        </div>
    </div>`;
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay || e.target.closest('[data-corrigir="cancelar"]')) {
            fecharDialogo();
        } else if (e.target.closest('[data-corrigir="revisar"]')) {
            aoRevisar();
        }
    });
    // Em fase de captura, para ler o campo antes de o componente de tags o
    // esvaziar: no campo de tags, Enter com texto só cria a tag (quem trata é
    // o componente); Enter com o campo vazio revisa, como nos outros campos.
    overlay.addEventListener(
        'keydown',
        (e) => {
            if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
            if (e.target.dataset.tagsAutorLigado && e.target.value.trim()) return;
            e.preventDefault();
            aoRevisar();
        },
        true,
    );
    document.body.appendChild(overlay);
    document.addEventListener('keydown', aoTeclar, true);
    overlay.querySelector('input')?.focus();
    return overlay;
}

const valorDe = (id) => document.getElementById(id)?.value ?? '';

function garantirListaDeTipos() {
    if (document.getElementById('corrigir-fora-lista-tipos')) return;
    const lista = document.createElement('datalist');
    lista.id = 'corrigir-fora-lista-tipos';
    lista.innerHTML = (TIPOS_OBRA_SUGERIDOS || [])
        .map((t) => `<option value="${escapeHtml(t)}"></option>`)
        .join('');
    document.body.appendChild(lista);
}

export function abrirCorrecaoObra(chave, deps) {
    const obra = obterObraForaDoAcervo(chave);
    if (!obra) return false;
    garantirListaDeTipos();
    const diferentes = obra.descricoes.length;
    const ajudaDescricao =
        diferentes > 1
            ? `Hoje há ${diferentes} descrições diferentes nesta obra; aparece a mais usada. Só muda se você mexer no campo, e aí vale para todos os textos (apagar tudo limpa a descrição).`
            : 'Só muda se você mexer no campo; aí vale para todos os textos.';
    const datasDiferentes = (obra.datas || []).length;
    const ajudaData =
        datasDiferentes > 1
            ? `Hoje há ${datasDiferentes} datas diferentes nesta obra; aparece a mais usada. Só muda a ponta (começo ou "Até") em que você mexer, e aí vale para todos os textos. Deixar o nível em "Sem data" apaga a data.`
            : 'Só muda a ponta em que você mexer; aí vale para todos os textos. Deixar o nível em "Sem data" apaga a data.';
    const abertura = { inicio: obra.dataObra || null, fim: obra.dataObraAte || null };
    const origemAberta = (obra.origens || [])[0] || [];
    const aviso = obra.grafias.length > 1 ? ` Escritas hoje: ${obra.grafias.join(', ')}.` : '';
    const tags = criarCampoTagsAutor({
        idInput: ID_AUTOR_TAGS,
        idChips: `${ID_AUTOR_TAGS}-chips`,
        aoMudar: () => atualizarSugestoesDeAutor(tags),
    });
    const origem = criarCampoTagsAutor({
        idInput: ID_ORIGEM_TAGS,
        idChips: `${ID_ORIGEM_TAGS}-chips`,
        rotulo: 'origem',
        aoMudar: () => atualizarSugestoesDeOrigem(origem),
    });
    const data = criarCampoDataObra({ idContainer: ID_DATA });
    const origensDiferentes = (obra.origens || []).length;
    const ajudaOrigem =
        origensDiferentes > 1
            ? `Hoje há ${origensDiferentes} origens diferentes nesta obra; aparece a mais usada. Só muda se você mexer no campo, e aí vale para todos os textos (tirar todas as etiquetas apaga a origem).`
            : 'Lugar ou cultura de onde a obra vem (Grécia, Brasil). Só muda se você mexer no campo; aí vale para todos os textos (tirar todas as etiquetas apaga a origem).';
    abrirDialogo({
        titulo: `Corrigir obra: ${obra.obra}`,
        descricao: `Vale para ${plural(obra.totalTextos, 'texto', 'textos')} que usam esta obra (em Intertextualidade e Hipertextualidade).${aviso}${avisoDeOrigemDaObra(obra)}`,
        camposHtml:
            campo('corrigir-fora-obra', 'Nome da obra', obra.obra, { obrigatorio: true }) +
            campoTags(
                ID_AUTOR_TAGS,
                'Autores (sem nenhum, tira o autor)',
                'Enter ou vírgula cria a tag. A ordem fica guardada, mas "A e B" e "B e A" são a mesma obra.',
            ) +
            campo('corrigir-fora-tipo', 'Tipo de obra', obra.tipoObra, {
                lista: 'corrigir-fora-lista-tipos',
            }) +
            campoLongo(
                'corrigir-fora-descricao',
                'Descrição da obra',
                obra.descricao,
                ajudaDescricao,
            ) +
            campoTags(ID_ORIGEM_TAGS, 'Origem (lugar ou cultura)', ajudaOrigem, ID_LISTA_ORIGENS) +
            campoData(ajudaData) +
            campoObraPessoal(obra),
        aoRevisar: () => {
            const novo = {
                obra: valorDe('corrigir-fora-obra'),
                autores: tags.obterComPendente(),
            };
            // O tipo só muda se você mexeu nele: obras com tipos diferentes em
            // cada texto não são igualadas sem querer.
            const tipo = valorDe('corrigir-fora-tipo');
            if (tipo.trim() !== (obra.tipoObra || '')) novo.tipoObra = tipo;
            // A descrição também: tende a ser a mesma, mas há exceções, e só
            // sobrescreve quando você mexe no campo.
            const descricao = valorDe('corrigir-fora-descricao');
            if (descricao.trim() !== (obra.descricao || '')) novo.descricao = descricao;
            // A origem também: só vai no pedido quando você mexeu (a lista
            // igual à que abriu, na mesma ordem, não muda nada).
            const origens = origem.obterComPendente();
            if (!mesmaListaDeOrigens(origens, origemAberta)) novo.origens = origens;
            // A data, ponta por ponta: só a que mudou entra no pedido (ver
            // `pedidoDeDatas`). Data que não vale avisa e não segue.
            const lida = data.obter();
            if (lida.erro) {
                mostrarAviso(lida.mensagem);
                return;
            }
            Object.assign(novo, pedidoDeDatas(abertura, lida));
            // A marca de obra pessoal: só entra no pedido quando você mexeu.
            const marca = pedidoDeObraPessoal(obra);
            if (marca !== undefined) novo.obraPessoal = marca;
            pedirCorrecao({ tipo: 'obra', alvos: [chave], novo }, deps);
        },
    });
    const caixaPessoal = document.getElementById(ID_OBRA_PESSOAL);
    if (caixaPessoal) caixaPessoal.indeterminate = obra.obraPessoal === 'algumas';
    tags.ligar();
    tags.definir(obra.autores || []);
    atualizarSugestoesDeAutor(tags);
    origem.ligar();
    origem.definir(origemAberta);
    atualizarSugestoesDeOrigem(origem);
    data.ligar();
    data.definir(abertura);
    // Com duas ou mais datas diferentes nos textos, oferece as outras.
    if (datasDiferentes > 1) data.mostrarSugestoes(obra.datas);
    return true;
}

export function abrirCorrecaoAutor(chave, deps) {
    const autor = obterAutorForaDoAcervo(chave);
    if (!autor) return false;
    const origemAberta = (autor.origens || [])[0] || [];
    const origensDiferentes = (autor.origens || []).length;
    const sem = autor.entradasSemOrigem || 0;
    const ajudaOrigem =
        origensDiferentes > 1
            ? `Hoje há ${origensDiferentes} origens diferentes nas obras deste autor; aparece a mais usada. Só muda se você mexer no campo, e aí vale para todas as entradas dele (tirar todas as etiquetas apaga a origem).`
            : `Lugar ou cultura de onde vem a obra deste autor (Grécia, Brasil).${sem ? ` ${plural(sem, 'entrada dele não tem origem', 'entradas dele não têm origem')}.` : ''} Só muda se você mexer no campo; aí vale para todas as entradas em que ele é autor, inclusive em obras com mais de um autor (tirar todas as etiquetas apaga a origem).`;
    const origem = criarCampoTagsAutor({
        idInput: ID_ORIGEM_TAGS,
        idChips: `${ID_ORIGEM_TAGS}-chips`,
        rotulo: 'origem',
        aoMudar: () => atualizarSugestoesDeOrigem(origem),
    });
    abrirDialogo({
        titulo: `Corrigir autor: ${autor.autor}`,
        descricao: `Vale para ${plural(autor.totalTextos, 'texto', 'textos')} com este autor. Troca só este nome, mesmo nas obras com mais de um autor. Se o novo nome já existe, os dois passam a ser o mesmo autor.`,
        camposHtml:
            campo('corrigir-fora-autor-nome', 'Nome do autor', autor.autor, {
                obrigatorio: true,
            }) +
            campoTags(ID_ORIGEM_TAGS, 'Origem (lugar ou cultura)', ajudaOrigem, ID_LISTA_ORIGENS),
        aoRevisar: () => {
            const novo = { autor: valorDe('corrigir-fora-autor-nome') };
            // A origem só vai no pedido quando você mexeu (a lista igual à que
            // abriu, na mesma ordem, não muda nada).
            const origens = origem.obterComPendente();
            if (!mesmaListaDeOrigens(origens, origemAberta)) novo.origens = origens;
            pedirCorrecao({ tipo: 'autor', alvos: [chave], novo }, deps);
        },
    });
    origem.ligar();
    origem.definir(origemAberta);
    atualizarSugestoesDeOrigem(origem);
    return true;
}

function garantirListaDeTiposDeReferencia() {
    if (document.getElementById('corrigir-fora-lista-tipos-referencia')) return;
    const lista = document.createElement('datalist');
    lista.id = 'corrigir-fora-lista-tipos-referencia';
    lista.innerHTML = (TIPOS_REFERENCIA_EXTERNA_SUGERIDOS || [])
        .map((t) => `<option value="${escapeHtml(t)}"></option>`)
        .join('');
    document.body.appendChild(lista);
}

export function abrirCorrecaoReferencia(chave, deps) {
    const ref = obterReferenciaForaDoAcervo(chave);
    if (!ref) return false;
    garantirListaDeTiposDeReferencia();
    const datasDiferentes = (ref.datas || []).length;
    const ajudaData =
        datasDiferentes > 1
            ? `Hoje há ${datasDiferentes} datas diferentes nesta referência; aparece a mais usada. Só muda a ponta (começo ou "Até") em que você mexer, e aí vale para todos os textos. Deixar o nível em "Sem data" apaga a data.`
            : 'Só muda a ponta em que você mexer; aí vale para todos os textos. Deixar o nível em "Sem data" apaga a data.';
    const abertura = { inicio: ref.dataObra || null, fim: ref.dataObraAte || null };
    const data = criarCampoDataObra({ idContainer: ID_DATA });
    abrirDialogo({
        titulo: `Corrigir referência: ${ref.texto}`,
        descricao: `Vale para ${plural(ref.totalTextos, 'texto', 'textos')} que usam esta referência. Se o nome e o tipo novos já existem em outra referência, as duas passam a ser a mesma. A nota, o link e os campos de Pessoa pública de cada texto não mudam (só saem os de Pessoa pública se o tipo deixar de ser Pessoa pública, e a confirmação avisa).`,
        camposHtml:
            campo('corrigir-fora-referencia-texto', 'Nome da referência', ref.texto, {
                obrigatorio: true,
            }) +
            campo('corrigir-fora-referencia-tipo', 'Tipo', ref.tipo || '', {
                lista: 'corrigir-fora-lista-tipos-referencia',
            }) +
            campoData(ajudaData),
        aoRevisar: () => {
            const novo = { texto: valorDe('corrigir-fora-referencia-texto') };
            // O tipo só vai no pedido quando você mexeu nele (apagar tira o tipo).
            const tipo = valorDe('corrigir-fora-referencia-tipo');
            if (tipo.trim() !== (ref.tipo || '')) novo.tipo = tipo;
            const lida = data.obter();
            if (lida.erro) {
                mostrarAviso(lida.mensagem);
                return;
            }
            Object.assign(novo, pedidoDeDatas(abertura, lida));
            pedirCorrecao({ tipo: 'referencia', alvos: [chave], novo }, deps);
        },
    });
    data.ligar();
    data.definir(abertura);
    if (datasDiferentes > 1) data.mostrarSugestoes(ref.datas);
    return true;
}
