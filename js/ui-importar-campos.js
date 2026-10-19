// ============================================================
// ui-importar-campos.js: modal "Importar campos por .json" (aba Importação).
// Lê o arquivo (ou o JSON colado), mostra a prévia do que mudaria, aplica e
// desfaz. A lógica em si mora em importar-campos.js (módulo puro, sem DOM) e o
// modelo para baixar em modelo-importar-campos.js.
// ============================================================

import { db, save } from './db.js';
import { tirarSnapshotSeNecessario } from './autobackup.js';
import { escapeHtml, mostrarAviso, mostrarAvisoComAcao, PAPEIS_PESSOA } from './utils.js';
import { garantirModal } from './modais.js';
import { toggleModal } from './ui.js';
import { ROTULOS_ETIQUETAS } from './etiquetas.js';
import {
    lerArquivoDeCampos,
    preverImportacaoCampos,
    executarImportacaoCampos,
} from './importar-campos.js';
import {
    gerarModeloCampos,
    NOME_ARQUIVO_MODELO_CAMPOS,
    NOME_ARQUIVO_MODELO_CAMPOS_VOCABULARIO,
} from './modelo-importar-campos.js';

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const e = escapeHtml;

// Dependências trocáveis (os testes de DOM não têm IndexedDB). O snapshot é
// forçado, como na Importação Aditiva.
export const dependencias = {
    snapshot: (dbRef) => tirarSnapshotSeNecessario(dbRef, true),
};

// Entradas lidas na última conferência: o "Aplicar" usa estas, e só fica
// ligado enquanto o texto do campo não mudou desde então.
let entradasConferidas = null;
// Opções ligadas na última conferência (o Aplicar usa as mesmas).
let opcoesConferidas = {};
// Desfazer da última aplicação (a do relatório aberto). Só vale uma vez.
let desfazerAplicacao = null;

const ROTULO_PAPEL = { '': 'indefinido', principal: 'principal', secundario: 'secundário' };
const ROTULO_ACAO_ASSUNTO = {
    auto: 'volta a seguir o tema',
    principal: 'fixado como principal',
    secundario: 'fixado como secundário',
    '': 'fixado sem papel',
    excluir: 'tirado deste texto',
};

const MOTIVOS_PROBLEMA = {
    'categoria-desconhecida': (p) =>
        `categoria de etiqueta “${p.valor}” não existe (use Tradição, Estilo, Relação, Sensibilidade, Tom, Domínio Imagético ou Outros)`,
    'papel-invalido': (p) =>
        `${p.campo === 'assuntos' ? 'Assunto' : 'Tema'} “${p.valor}”: o papel “${p.detalhe}” não é aceito, então essa entrada ficou de fora`,
    'assunto-inexistente': (p) =>
        `Assunto “${p.valor}” não existe no cadastro (a importação não cria Assunto)`,
    'assunto-sem-tema-no-texto': (p) =>
        `nenhum tema deste texto pertence ao Assunto “${p.valor}” (o Assunto é derivado do tema)`,
    'formato-invalido': (p) => `${p.campo}: formato inesperado${p.valor ? ` (“${p.valor}”)` : ''}`,
    'tipo-invalido': (p) => `tipo “${p.valor}” não é poema nem prosa, então foi ignorado`,
    'papel-pessoa-invalido': (p) =>
        `Pessoa “${p.valor}”: o papel “${p.detalhe}” não está na lista (${PAPEIS_PESSOA.join(', ')}), então essa pessoa ficou de fora`,
    'valor-invalido': (p) =>
        `${p.campo === 'fonte' ? 'Fonte' : p.campo}, ${p.valor}: o valor “${p.detalhe}” não é aceito e foi ignorado`,
    'mais-de-um-local-de-escrita': (p) =>
        `o local de escrita é um só, mas o arquivo trouxe vários (“${p.valor}”), então foi ignorado`,
};

const MOTIVOS_LIGACAO = {
    'assunto-inexistente': (p) =>
        `Tema “${p.tema}”: o Assunto “${p.assunto}” não existe no cadastro (a importação não cria Assunto), então a ligação ficou de fora`,
    'tema-inexistente': (p) =>
        `Assunto “${p.assunto}”: o Tema “${p.tema}” não existe no cadastro nem em nenhum texto achado do arquivo, então a ligação ficou de fora`,
    'formato-invalido': (p) =>
        `ligação sem Tema ou sem Assunto${p.tema || p.assunto ? ` (“${p.tema}”, “${p.assunto}”)` : ''}, então ficou de fora`,
};

const MOTIVOS_AVISO = {
    'id-nao-existe-usou-titulo':
        'o id não existe neste acervo, então o texto foi achado pelo título',
    'texto-repetido-no-arquivo': 'este texto aparece mais de uma vez no arquivo',
    'entrada-sem-campos': 'a entrada não traz nenhum campo para importar',
};

function rotuloTexto(t) {
    return t === 'prosa' ? 'Prosa' : 'Poema';
}

function descreverReferencia(i) {
    const partes = [];
    if (i.referencia.titulo) partes.push(`“${i.referencia.titulo}”`);
    if (i.referencia.id !== null && i.referencia.id !== undefined) {
        partes.push(`id ${i.referencia.id}`);
    }
    return partes.length ? partes.join(', ') : `entrada ${i.indice}`;
}

function frasesDoStatus(i) {
    const ref = e(descreverReferencia(i));
    if (i.status === 'nao-achado') {
        return `${ref}: nenhum texto com ${i.motivo === 'id-nao-existe' ? 'esse id' : 'esse título'}`;
    }
    if (i.status === 'sem-referencia') return `Entrada ${i.indice}: faltou o “id” ou o “titulo”`;
    if (i.status === 'conflito') {
        const c = i.candidatos[0];
        return `${ref}: o id aponta para “${e(c.titulo)}”, que não é o título informado`;
    }
    const lista = i.candidatos.map((c) => `${rotuloTexto(c.tipo)} id ${c.id}`).join(', ');
    return `${ref}: o título existe em mais de um texto (${e(lista)}). Use o “id” ou o “tipo”`;
}

function etiquetasAgrupadas(lista) {
    const porCategoria = new Map();
    lista.forEach((x) => {
        if (!porCategoria.has(x.categoria)) porCategoria.set(x.categoria, []);
        porCategoria.get(x.categoria).push(x.nome);
    });
    return [...porCategoria.entries()].map(
        ([categoria, nomes]) => `${ROTULOS_ETIQUETAS[categoria]}: ${nomes.join(', ')}`,
    );
}

// O que muda num texto, em frases curtas (já escapadas).
function mudancasDoTexto(i) {
    const frases = [];
    etiquetasAgrupadas(i.adicionados.etiquetas).forEach((f) => frases.push(`+ ${e(f)}`));
    if (i.adicionados.temas.length) {
        const lista = i.adicionados.temas
            .map((t) => `${t.nome}${t.papel ? ` (${ROTULO_PAPEL[t.papel]})` : ''}`)
            .join(', ');
        frases.push(`+ Temas: ${e(lista)}`);
    }
    i.papeisTema.forEach((p) =>
        frases.push(`Papel do tema ${e(p.nome)}: ${ROTULO_PAPEL[p.de]} → ${ROTULO_PAPEL[p.para]}`),
    );
    i.assuntos
        .filter((a) => a.mudou)
        .forEach((a) => frases.push(`Assunto ${e(a.nome)}: ${ROTULO_ACAO_ASSUNTO[a.acao]}`));
    if (i.adicionados.locais.length) {
        frases.push(`+ Territorialidade: ${e(i.adicionados.locais.map((l) => l.nome).join(', '))}`);
    }
    if (i.adicionados.pessoas.length) {
        const pessoas = i.adicionados.pessoas
            .map((p) => `${p.nome}${p.papeis.length ? ` (${p.papeis.join(', ')})` : ''}`)
            .join(', ');
        frases.push(`+ Pessoas: ${e(pessoas)}`);
    }
    i.papeisPessoa.forEach((p) => frases.push(`Pessoa ${e(p.nome)}: + ${e(p.papeis.join(', '))}`));
    if (i.adicionados.jargaoGiria.length) {
        frases.push(
            `+ Jargão e gíria: ${e(i.adicionados.jargaoGiria.map((j) => j.nome).join(', '))}`,
        );
    }
    i.camposSimples
        .filter((c) => c.acao === 'preenchido' || c.acao === 'substituido')
        .forEach((c) =>
            frases.push(
                c.acao === 'substituido'
                    ? `${e(c.rotulo)}: ${e(rotuloValor(c.de))} → ${e(rotuloValor(c.para))}`
                    : `${e(c.rotulo)}: ${e(rotuloValor(c.para))}`,
            ),
        );
    return frases;
}

function rotuloValor(v) {
    if (v === true) return 'sim';
    if (v === false) return 'não';
    return `“${v}”`;
}

// Campos de valor único que já tinham valor e foram mantidos (a opção de
// substituir estava desligada).
function linhasMantidas(itens) {
    const linhas = [];
    itens.forEach((i) => {
        i.camposSimples
            .filter((c) => c.acao === 'mantido')
            .forEach((c) =>
                linhas.push(
                    `<strong>${e(i.titulo)}</strong>: ${e(c.rotulo)} ficou ${e(rotuloValor(c.de))} (o arquivo trazia ${e(rotuloValor(c.para))})`,
                ),
            );
    });
    return linhas;
}

function lista(titulo, linhas, { aberto = true, classe = '' } = {}) {
    if (!linhas.length) return '';
    return `<details ${aberto ? 'open' : ''} class="mt-3">
        <summary class="cursor-pointer text-xs font-bold text-gray-700 dark:text-slate-200">${titulo} <span class="font-mono text-[10px] text-gray-400 dark:text-slate-500">${linhas.length}</span></summary>
        <ul class="mt-1 text-[11px] text-gray-600 dark:text-slate-300 list-disc pl-5 space-y-0.5 max-h-64 overflow-y-auto ${classe}">${linhas
            .map((l) => `<li>${l}</li>`)
            .join('')}</ul>
    </details>`;
}

// Ligações Tema → Assunto que o arquivo fez (ou fará, na prévia).
function linhasDeLigacoes(ligacoes) {
    return ligacoes.feitas.map(
        (l) => `${e(l.tema)} → ${e(l.assunto)}${l.temaNovo ? ' (Tema novo)' : ''}`,
    );
}

function linhasDeAtencao(itens, ligacoes) {
    const linhas = [];
    ligacoes.problemas.forEach((p) =>
        linhas.push(`<strong>Ligação</strong>: ${e(MOTIVOS_LIGACAO[p.motivo](p))}`),
    );
    itens.forEach((i) => {
        if (i.status !== 'ok') linhas.push(frasesDoStatus(i));
        i.problemas.forEach((p) => {
            const texto = (MOTIVOS_PROBLEMA[p.motivo] || (() => p.motivo))(p);
            linhas.push(
                `<strong>${e(i.status === 'ok' ? i.titulo : descreverReferencia(i))}</strong>: ${e(texto)}`,
            );
        });
        i.avisos.forEach((a) => {
            linhas.push(
                `<strong>${e(i.status === 'ok' ? i.titulo : descreverReferencia(i))}</strong>: ${e(MOTIVOS_AVISO[a] || a)}`,
            );
        });
    });
    return linhas;
}

function resumoEmFrase(r, aplicado) {
    const partes = [];
    if (r.resumo.alterados || !r.resumo.ligacoesFeitas) {
        partes.push(
            plural(
                r.resumo.alterados,
                aplicado ? 'texto alterado' : 'texto será alterado',
                aplicado ? 'textos alterados' : 'textos serão alterados',
            ),
        );
    }
    if (r.resumo.ligacoesFeitas) {
        partes.push(
            plural(
                r.resumo.ligacoesFeitas,
                aplicado ? 'tema ligado a um assunto' : 'tema será ligado a um assunto',
                aplicado ? 'temas ligados a assuntos' : 'temas serão ligados a assuntos',
            ),
        );
    }
    if (r.resumo.vinculosEtiqueta) {
        partes.push(plural(r.resumo.vinculosEtiqueta, 'etiqueta somada', 'etiquetas somadas'));
    }
    if (r.resumo.vinculosTema) {
        partes.push(plural(r.resumo.vinculosTema, 'tema somado', 'temas somados'));
    }
    if (r.resumo.papeisTema) {
        partes.push(
            plural(r.resumo.papeisTema, 'papel de tema atualizado', 'papéis de tema atualizados'),
        );
    }
    if (r.resumo.assuntosAjustados) {
        partes.push(plural(r.resumo.assuntosAjustados, 'assunto ajustado', 'assuntos ajustados'));
    }
    if (r.resumo.vinculosLocal) {
        partes.push(plural(r.resumo.vinculosLocal, 'local somado', 'locais somados'));
    }
    if (r.resumo.vinculosJargaoGiria) {
        partes.push(
            plural(
                r.resumo.vinculosJargaoGiria,
                'jargão ou gíria somado',
                'jargões ou gírias somados',
            ),
        );
    }
    if (r.resumo.vinculosPessoa || r.resumo.papeisPessoa) {
        partes.push(
            plural(
                r.resumo.vinculosPessoa + r.resumo.papeisPessoa,
                'pessoa ajustada',
                'pessoas ajustadas',
            ),
        );
    }
    if (r.resumo.camposSimplesGravados) {
        partes.push(
            plural(
                r.resumo.camposSimplesGravados,
                'campo simples gravado',
                'campos simples gravados',
            ),
        );
    }
    return partes.join(' · ');
}

function relatorioHtml(r, { aplicado }) {
    const s = r.resumo;
    const fora = s.naoAchados + s.ambiguos + s.conflitos;
    const acoes = aplicado
        ? `<button type="button" data-action="desfazer-importar-campos" class="text-xs border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 px-3 py-1.5 rounded hover:bg-white dark:hover:bg-slate-800">Desfazer importação</button>`
        : '';
    const sub = [
        `${plural(s.total, 'entrada', 'entradas')} no arquivo`,
        s.semMudanca
            ? `${plural(s.semMudanca, 'texto já estava assim', 'textos já estavam assim')}`
            : '',
        fora ? `${plural(fora, 'entrada ficou de fora', 'entradas ficaram de fora')}` : '',
        s.ligacoesJaExistiam
            ? `${plural(s.ligacoesJaExistiam, 'ligação já existia', 'ligações já existiam')}`
            : '',
    ]
        .filter(Boolean)
        .join(' · ');

    const novas = [
        ...etiquetasAgrupadas(r.cadastroNovo.etiquetas).map((f) => e(f)),
        ...(r.cadastroNovo.temas.length ? [`Temas: ${e(r.cadastroNovo.temas.join(', '))}`] : []),
        ...(r.cadastroNovo.locais.length ? [`Locais: ${e(r.cadastroNovo.locais.join(', '))}`] : []),
        ...(r.cadastroNovo.pessoas.length
            ? [`Pessoas: ${e(r.cadastroNovo.pessoas.join(', '))}`]
            : []),
        ...(r.cadastroNovo.jargaoGiria.length
            ? [
                  `Jargão e gíria (termos novos, sem cadastro): ${e(r.cadastroNovo.jargaoGiria.join(', '))}`,
              ]
            : []),
    ];
    const porTexto = r.itens
        .filter((i) => i.status === 'ok' && i.mudou)
        .map(
            (i) =>
                `<strong>${e(i.titulo)}</strong> (${rotuloTexto(i.tipo)}): ${mudancasDoTexto(i).join(' · ')}`,
        );

    return `
<div class="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-4">
    <div class="flex items-center justify-between gap-3 flex-wrap">
        <div>
            <p class="text-sm font-semibold text-gray-800 dark:text-slate-100">${aplicado ? 'Importado: ' : ''}${e(resumoEmFrase(r, aplicado))}</p>
            <p class="text-[11px] text-gray-500 dark:text-slate-400">${e(sub)}</p>
        </div>
        ${acoes}
    </div>
    ${lista('Precisa de atenção', linhasDeAtencao(r.itens, r.ligacoes))}
    ${lista(aplicado ? 'Temas ligados a Assuntos' : 'Temas que serão ligados a Assuntos', linhasDeLigacoes(r.ligacoes), { aberto: r.ligacoes.feitas.length <= 12 })}
    ${lista(aplicado ? 'Entraram no cadastro (novas)' : 'Vão entrar no cadastro (novas): confira a grafia', novas, { aberto: novas.length <= 12 })}
    ${lista('Campos que já tinham valor e foram mantidos', linhasMantidas(r.itens), { aberto: true })}
    ${lista('O que muda em cada texto', porTexto, { aberto: false })}
</div>`;
}

const $ = (id) => document.getElementById(id);

function mostrarRelatorio(html) {
    const alvo = $('icp-relatorio');
    if (alvo) alvo.innerHTML = html;
}

function ligarAplicar(ligado) {
    const botao = $('icp-aplicar');
    if (botao) botao.disabled = !ligado;
}

function opcoesDaTela() {
    return { substituirCamposSimples: !!$('icp-substituir')?.checked };
}

function limparConferencia() {
    entradasConferidas = null;
    ligarAplicar(false);
}

export async function abrirImportarCampos() {
    await garantirModal('modal-importar-campos');
    $('form-importar-campos')?.reset();
    mostrarRelatorio('');
    limparConferencia();
    desfazerAplicacao = null;
    toggleModal('modal-importar-campos');
}

// Lê o texto do campo e devolve as entradas, ou null (já avisou o motivo).
function lerCampoDeTexto() {
    const texto = $('icp-texto')?.value ?? '';
    if (!texto.trim()) {
        mostrarAviso('Escolha um arquivo .json ou cole o JSON.');
        return null;
    }
    let payload;
    try {
        payload = JSON.parse(texto);
    } catch (erro) {
        mostrarRelatorio(
            `<p class="text-sm text-red-600 dark:text-red-400">O JSON não é válido: ${e(erro.message)}</p>`,
        );
        mostrarAviso('Não consegui ler o JSON. Confira se o arquivo está completo.');
        return null;
    }
    const lido = lerArquivoDeCampos(payload);
    if (!lido.ok) {
        mostrarRelatorio(
            '<p class="text-sm text-red-600 dark:text-red-400">O arquivo não tem a lista “textos” (nem a lista “ligacoes”). Baixe o modelo para ver o formato.</p>',
        );
        mostrarAviso('Não achei a lista “textos” no arquivo.');
        return null;
    }
    return lido;
}

function conferirImportacaoCampos() {
    limparConferencia();
    desfazerAplicacao = null;
    const lido = lerCampoDeTexto();
    if (!lido) return;
    const semLigacoes = lido.ligacoes.length === 0 && lido.problemasLigacoes.length === 0;
    if (lido.entradas.length === 0 && semLigacoes) {
        mostrarRelatorio(
            '<p class="text-sm text-gray-500 dark:text-slate-400">A lista “textos” está vazia. Os exemplos do modelo ficam em “exemplos” e não são importados: copie o que quiser para dentro de “textos”.</p>',
        );
        return;
    }
    const opcoes = {
        ...opcoesDaTela(),
        ligacoes: lido.ligacoes,
        problemasLigacoes: lido.problemasLigacoes,
    };
    const r = preverImportacaoCampos(db, lido.entradas, opcoes);
    mostrarRelatorio(relatorioHtml(r, { aplicado: false }));
    if (r.resumo.alterados > 0 || r.resumo.ligacoesFeitas > 0) {
        entradasConferidas = lido.entradas;
        opcoesConferidas = opcoes;
        ligarAplicar(true);
    } else {
        mostrarAviso(
            'Nada para importar: nenhum texto mudaria e nenhuma ligação seria feita.',
            'info',
        );
    }
}

export async function aplicarImportacaoCampos() {
    if (!entradasConferidas) return;
    const entradas = entradasConferidas;
    ligarAplicar(false);

    // Mesma rede de segurança da Importação Aditiva: snapshot forçado antes de
    // gravar. Sem ele, nada é importado.
    const snapshotOk = await dependencias.snapshot(db);
    if (!snapshotOk) {
        ligarAplicar(true);
        return mostrarAviso(
            'Não foi possível tirar o snapshot de segurança antes de aplicar. Nada foi importado. Tente de novo.',
        );
    }

    const r = executarImportacaoCampos(db, entradas, opcoesConferidas);
    desfazerAplicacao = r.desfazer;
    entradasConferidas = null;
    save();
    mostrarRelatorio(relatorioHtml(r, { aplicado: true }));
    const feito = [];
    if (r.resumo.alterados || !r.resumo.ligacoesFeitas) {
        feito.push(`Campos importados em ${plural(r.resumo.alterados, 'texto', 'textos')}`);
    }
    if (r.resumo.ligacoesFeitas) {
        feito.push(plural(r.resumo.ligacoesFeitas, 'tema ligado', 'temas ligados'));
    }
    mostrarAvisoComAcao(`${feito.join(' · ')}.`, 'Desfazer', () =>
        desfazerImportacaoCampos(r.desfazer),
    );
}

// Desfaz a importação (pelo toast ou pelo botão do relatório). Cada
// aplicação desfaz uma vez só.
export function desfazerImportacaoCampos(desfazer = desfazerAplicacao) {
    if (!desfazer || desfazer !== desfazerAplicacao) {
        return mostrarAviso('Essa importação já foi desfeita ou foi substituída por outra.');
    }
    desfazer();
    desfazerAplicacao = null;
    save();
    mostrarRelatorio(
        '<p class="text-sm text-gray-500 dark:text-slate-400">Importação desfeita.</p>',
    );
}

function baixarArquivo(conteudo, nomeArquivo) {
    const blob = new Blob([conteudo], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

export function baixarModeloCampos({ comVocabulario = false } = {}) {
    const modelo = gerarModeloCampos(db, { comVocabulario });
    baixarArquivo(
        JSON.stringify(modelo, null, 2),
        comVocabulario ? NOME_ARQUIVO_MODELO_CAMPOS_VOCABULARIO : NOME_ARQUIVO_MODELO_CAMPOS,
    );
}

// Liga o formulário (roda uma vez, quando o modal é carregado).
export function initFormImportarCampos() {
    const form = $('form-importar-campos');
    if (!form) return;

    form.onsubmit = (ev) => {
        ev.preventDefault();
        conferirImportacaoCampos();
    };

    // Editar o texto invalida a conferência: o Aplicar volta a pedir "Conferir".
    $('icp-texto')?.addEventListener('input', limparConferencia);
    $('icp-substituir')?.addEventListener('change', limparConferencia);

    $('icp-arquivo')?.addEventListener('change', (ev) => {
        const arquivo = ev.target?.files?.[0];
        if (!arquivo) return;
        const leitor = new FileReader();
        leitor.onload = () => {
            $('icp-texto').value = String(leitor.result ?? '');
            conferirImportacaoCampos();
        };
        leitor.onerror = () => mostrarAviso('Não consegui ler o arquivo.');
        leitor.readAsText(arquivo);
    });
}
