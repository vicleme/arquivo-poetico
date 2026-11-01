// ============================================================
// papeis-pessoa-ui.js: seção "Papéis" da aba Pessoas ("Pessoas e Papéis")
// Tabela dos papéis do registro (`db.papeisPessoa`), com apelido e descrição
// editáveis, regras de exclusão por extenso, contagem de uso (que abre os
// textos filtrados por papel), e o formulário de papel novo. A lógica mora em
// gestao-papeis-pessoa.js (pura); aqui só tela, aviso e salvar.
//
// Chama renderPoemas/renderProsas de render-listas.js, que por sua vez chama
// renderPapeisPessoa: a referência circular é segura porque os dois só usam o
// que importam dentro de corpo de função (mesmo caso de selecao-massa.js).
// ============================================================

import { db, save } from './db.js';
import { escapeHtml, mostrarAviso, abrirModalConfirmacao } from './utils.js';
import { registroPapeisPessoa } from './papeis-pessoa.js';
import {
    LIMITE_APELIDO,
    LIMITE_NOME_PAPEL,
    adicionarPapel,
    apagarPapel,
    contarViolacoesDeExclusao,
    editarPapel,
    renomearPapel,
    usoDosPapeis,
} from './gestao-papeis-pessoa.js';
import { renderPoemas, renderProsas, renderPessoas, verTextosComPapel } from './render-listas.js';

const ID_SECAO = 'secao-papeis-pessoa';

// Quem lê apelido (colunas, chips) e a lista de papéis (editor) precisa ser
// redesenhado depois de qualquer mudança no registro.
function depoisDeMudar() {
    save();
    renderPessoas();
    renderPoemas();
    renderProsas();
}

// "não convive com: A, B" a partir das regras do papel.
function textoDasRegras(papel, registro) {
    if (papel.exclusivoComTodos) return 'Exclusivo: não convive com nenhum outro papel.';
    if (!papel.grupoExclusao)
        return papel.fabrica ? 'Sem regra de exclusão.' : 'Convive com todos.';
    const outros = registro
        .filter((p) => p.nome !== papel.nome && p.grupoExclusao === papel.grupoExclusao)
        .map((p) => p.nome);
    const todos = registro.filter((p) => p.exclusivoComTodos).map((p) => p.nome);
    return `Não convive com: ${[...outros, ...todos].join(', ')}.`;
}

function pluralizar(n, singular, plural) {
    return `${n} ${n === 1 ? singular : plural}`;
}

export function renderPapeisPessoa() {
    const secao = document.getElementById(ID_SECAO);
    if (!secao) return;
    const registro = registroPapeisPessoa();
    const uso = usoDosPapeis(db);
    const violacoes = contarViolacoesDeExclusao(db);

    const linhas = registro
        .map((p) => {
            const u = uso.get(p.nome) || { vinculos: 0, textos: 0 };
            const nomeAttr = escapeHtml(p.nome);
            const nomeCelula = p.fabrica
                ? `<span class="font-medium">${nomeAttr}</span> <span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300" title="Papel de fábrica: o nome e as regras não mudam; apelido e descrição sim.">fábrica</span>`
                : `<input type="text" value="${nomeAttr}" maxlength="${LIMITE_NOME_PAPEL}" data-nome="${nomeAttr}"
                        onchange="renomearPapelPessoaUI(this.dataset.nome, this.value)"
                        title="Renomear: os textos que usam o papel acompanham. Se o nome for o de outro papel, os dois se juntam."
                        style="margin-bottom: 0" />`;
            const usoCelula = u.vinculos
                ? `<button type="button" data-nome="${nomeAttr}" onclick="verTextosComPapelUI(this.dataset.nome)"
                        title="Ver os textos com este papel"
                        class="text-blue-600 dark:text-blue-400 underline">${escapeHtml(pluralizar(u.vinculos, 'vínculo', 'vínculos'))} em ${escapeHtml(pluralizar(u.textos, 'texto', 'textos'))}</button>`
                : '<span class="text-gray-400 dark:text-slate-500">sem uso</span>';
            const apagar = p.fabrica
                ? ''
                : `<button type="button" data-nome="${nomeAttr}" onclick="apagarPapelPessoaUI(this.dataset.nome)"
                        title="${u.vinculos ? 'Em uso: renomeie para juntar a outro papel ou tire dos textos antes' : 'Apagar papel'}"
                        class="text-red-500 hover:text-red-700 ${u.vinculos ? 'opacity-40' : ''}">Apagar</button>`;
            return `
            <tr class="border-t border-gray-200 dark:border-slate-700 align-top">
                <td class="py-2 pr-3 min-w-[10rem]">${nomeCelula}</td>
                <td class="py-2 pr-3">
                    <input type="text" value="${escapeHtml(p.apelido)}" maxlength="${LIMITE_APELIDO}" data-nome="${nomeAttr}"
                        onchange="editarApelidoPapelPessoaUI(this.dataset.nome, this.value)"
                        title="Como o papel aparece nas colunas e nos chips (único, até ${LIMITE_APELIDO} caracteres)"
                        style="width: 5rem; margin-bottom: 0" />
                </td>
                <td class="py-2 pr-3 w-full">
                    <textarea rows="2" data-nome="${nomeAttr}"
                        onchange="editarDescricaoPapelPessoaUI(this.dataset.nome, this.value)"
                        title="Explica a diferença entre os papéis; aparece como dica no seletor"
                        style="margin-bottom: 0">${escapeHtml(p.descricao || '')}</textarea>
                    <div class="text-[11px] text-gray-500 dark:text-slate-400 mt-1">${escapeHtml(textoDasRegras(p, registro))}</div>
                </td>
                <td class="py-2 pr-3 whitespace-nowrap text-xs">${usoCelula}</td>
                <td class="py-2 text-xs">${apagar}</td>
            </tr>`;
        })
        .join('');

    const aviso = violacoes.vinculos
        ? `<p class="text-xs text-amber-700 dark:text-amber-300 mb-3">${escapeHtml(pluralizar(violacoes.vinculos, 'vínculo tem', 'vínculos têm'))} papéis que não convivem pelas regras atuais (${escapeHtml(pluralizar(violacoes.textos, 'texto', 'textos'))}). Dado antigo não é alterado; a regra vale daqui em diante.</p>`
        : '';

    secao.innerHTML = `
        <h3 class="text-lg font-semibold mb-1">Papéis</h3>
        <p class="text-xs text-gray-500 dark:text-slate-400 mb-3">
            O papel diz como a pessoa se relaciona com um texto. O apelido é o que aparece nas colunas e nos chips.
            Papéis de fábrica têm nome e regras fixos; os que você acrescenta são livres e só se apagam sem uso.
        </p>
        ${aviso}
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead>
                    <tr class="text-left text-xs text-gray-500 dark:text-slate-400">
                        <th class="pb-1 pr-3">Papel</th>
                        <th class="pb-1 pr-3">Apelido</th>
                        <th class="pb-1 pr-3">Descrição e regras</th>
                        <th class="pb-1 pr-3">Uso</th>
                        <th class="pb-1"></th>
                    </tr>
                </thead>
                <tbody>${linhas}</tbody>
            </table>
        </div>
        <div class="mt-4 flex flex-wrap items-end gap-2">
            <div>
                <label class="form-label" for="papel-novo-nome">Papel novo</label>
                <input type="text" id="papel-novo-nome" maxlength="${LIMITE_NOME_PAPEL}" placeholder="Nome" autocomplete="off" style="margin-bottom: 0" />
            </div>
            <div>
                <label class="form-label" for="papel-novo-apelido">Apelido</label>
                <input type="text" id="papel-novo-apelido" maxlength="${LIMITE_APELIDO}" placeholder="(automático)" autocomplete="off" style="width: 6rem; margin-bottom: 0" />
            </div>
            <div class="flex-1 min-w-[12rem]">
                <label class="form-label" for="papel-novo-descricao">Descrição</label>
                <input type="text" id="papel-novo-descricao" placeholder="Opcional" autocomplete="off" style="margin-bottom: 0" />
            </div>
            <button type="button" onclick="adicionarPapelPessoaUI()"
                class="bg-blue-600 text-white px-3 py-2 rounded shadow hover:bg-blue-700 dark:hover:bg-blue-500">Adicionar</button>
        </div>`;
}

function resultado(r, mensagemOk) {
    if (!r.ok) {
        mostrarAviso(r.erro);
        renderPapeisPessoa(); // devolve o campo ao valor guardado
        return false;
    }
    if (mensagemOk) mostrarAviso(mensagemOk, 'sucesso');
    depoisDeMudar();
    return true;
}

export function editarApelidoPapelPessoaUI(nome, valor) {
    resultado(editarPapel(db, nome, { apelido: valor }));
}

export function editarDescricaoPapelPessoaUI(nome, valor) {
    resultado(editarPapel(db, nome, { descricao: valor }));
}

export function adicionarPapelPessoaUI() {
    const valor = (id) => document.getElementById(id)?.value ?? '';
    const r = adicionarPapel(db, {
        nome: valor('papel-novo-nome'),
        apelido: valor('papel-novo-apelido'),
        descricao: valor('papel-novo-descricao'),
    });
    resultado(r, r.ok ? `Papel “${r.papel.nome}” acrescentado.` : null);
}

export function renomearPapelPessoaUI(nome, novoNome) {
    const novo = (novoNome || '').trim();
    const destino = registroPapeisPessoa().find(
        (p) => p.nome !== nome && p.nome.toLowerCase() === novo.toLowerCase(),
    );
    const executar = () =>
        resultado(
            renomearPapel(db, nome, novo),
            destino ? `“${nome}” juntado a “${destino.nome}”.` : null,
        );
    if (!destino) {
        executar();
        return;
    }
    abrirModalConfirmacao({
        titulo: `Juntar “${nome}” a “${destino.nome}”?`,
        rotulo: 'Juntar papéis',
        mensagem: `Já existe o papel “${destino.nome}”. Os textos que usam “${nome}” passam a usar “${destino.nome}” e “${nome}” sai da lista.`,
        textoConfirmar: 'Juntar',
        corConfirmar: '#e11d48',
        onConfirmar: executar,
        onCancelar: renderPapeisPessoa,
    });
}

export function apagarPapelPessoaUI(nome) {
    resultado(apagarPapel(db, nome), `Papel “${nome}” apagado.`);
}

export function verTextosComPapelUI(nome) {
    verTextosComPapel(nome);
}

// Atalho do topo da aba: leva até a seção de papéis.
export function irParaPapeisPessoa() {
    document.getElementById(ID_SECAO)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
