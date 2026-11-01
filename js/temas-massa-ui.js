// temas-massa-ui.js: tela da edição em massa da Valência (aba Temas).
// A lógica pura está em temas-massa.js.

import { db, save } from './db.js';
import { escapeHtml, mostrarAviso, mostrarAvisoComAcao } from './utils.js';
import { renderTemas } from './render-listas.js';
import {
    selecaoTemas,
    alternarSelecaoTema,
    alternarSelecaoTodosTemas,
    limparSelecaoTemas,
    aplicarValenciaEmMassa,
    aplicarValenciasSugeridas,
    adicionarTemasAoAssuntoEmMassa,
} from './temas-massa.js';
import { ROTULOS_VALENCIA_TEMA, definirValenciaDoTema } from './temas.js';
import { planejarLista, aplicarLista } from './temas-lista.js';
import { adicionarTemasAoUniversal } from './temas-universais.js';

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

export function aoMarcarTema(id, marcado, shift) {
    alternarSelecaoTema(id, marcado, shift);
    renderTemas();
}

export function aoMarcarTodosTemas(marcado) {
    alternarSelecaoTodosTemas(marcado);
    renderTemas();
}

export function aoLimparSelecaoTemas() {
    limparSelecaoTemas();
    renderTemas();
}

// Seletor de valência do próprio cartão (aba Temas): grava na hora.
export function definirValenciaDoCard(select) {
    const tema = db.temas.find((t) => String(t.id) === String(select?.dataset?.temaId));
    if (!tema) return;
    definirValenciaDoTema(tema, select.value);
    save();
    renderTemas();
}

// Seletor "Adicionar à vitrine…" do cartão: junta o Tema ao convite escolhido
// e grava na hora, com Desfazer.
export function adicionarTemaAVitrineDoCard(select) {
    const universalId = select?.value;
    const tema = db.temas.find((t) => String(t.id) === String(select?.dataset?.temaId));
    if (!universalId || !tema) return;
    const r = adicionarTemasAoUniversal(db, universalId, [tema.id]);
    if (!r.ok) {
        select.value = '';
        return mostrarAviso('Esse convite não existe mais.');
    }
    save();
    renderTemas();
    mostrarAvisoComAcao(
        `“${tema.nome}” agora está no convite “${r.universal.nome}”`,
        'Desfazer',
        () => {
            r.desfazer();
            save();
            renderTemas();
        },
    );
}

// Barra em massa: junta todos os Temas selecionados ao Assunto escolhido.
export function aoAdicionarTemasAoAssunto() {
    const assuntoId = document.getElementById('temas-massa-assunto')?.value ?? '';
    if (!assuntoId) return mostrarAviso('Escolha um assunto.');
    const r = adicionarTemasAoAssuntoEmMassa(db, assuntoId, [...selecaoTemas]);
    if (!r.ok) {
        return mostrarAviso(
            r.motivo === 'assunto-inexistente'
                ? 'Esse assunto não existe mais.'
                : 'Selecione ao menos um tema.',
        );
    }
    if (r.adicionados === 0) {
        return mostrarAviso(
            'Nenhum tema entrou: os selecionados já estavam nesse assunto.',
            'info',
        );
    }
    save();
    renderTemas();
    const iguais = r.jaTinham ? ` (${plural(r.jaTinham, 'já estava', 'já estavam')} lá)` : '';
    mostrarAvisoComAcao(
        `${plural(r.adicionados, 'tema entrou', 'temas entraram')} no assunto “${r.assunto.nome}”${iguais}`,
        'Desfazer',
        () => {
            r.desfazer();
            save();
            renderTemas();
        },
    );
}

// Barra em massa: junta todos os Temas selecionados ao convite escolhido.
export function aoAdicionarTemasAVitrine() {
    const universalId = document.getElementById('temas-massa-vitrine')?.value ?? '';
    if (!universalId) return mostrarAviso('Escolha um convite da vitrine.');
    const r = adicionarTemasAoUniversal(db, universalId, [...selecaoTemas]);
    if (!r.ok) {
        return mostrarAviso(
            r.motivo === 'inexistente'
                ? 'Esse convite não existe mais.'
                : 'Selecione ao menos um tema.',
        );
    }
    if (r.adicionados === 0) {
        return mostrarAviso(
            'Nenhum tema entrou: os selecionados já estavam nesse convite.',
            'info',
        );
    }
    save();
    renderTemas();
    const iguais = r.jaTinham ? ` (${plural(r.jaTinham, 'já estava', 'já estavam')} lá)` : '';
    mostrarAvisoComAcao(
        `${plural(r.adicionados, 'tema entrou', 'temas entraram')} no convite “${r.universal.nome}”${iguais}`,
        'Desfazer',
        () => {
            r.desfazer();
            save();
            renderTemas();
        },
    );
}

export function aoAplicarValenciaEmMassa() {
    const valor = document.getElementById('temas-massa-valencia')?.value ?? '__nenhuma__';
    if (valor === '__nenhuma__') return mostrarAviso('Escolha uma valência para aplicar.');
    const r = aplicarValenciaEmMassa(db, [...selecaoTemas], valor);
    if (!r.ok) return mostrarAviso('Selecione ao menos um tema.');
    if (r.alterados === 0) {
        return mostrarAviso(
            'Nenhum tema mudou: os selecionados já estavam com essa valência.',
            'info',
        );
    }
    save();
    renderTemas();
    const destino = r.valencia ? `“${ROTULOS_VALENCIA_TEMA[r.valencia]}”` : 'não classificado';
    const iguais = r.iguais ? ` (${plural(r.iguais, 'já estava', 'já estavam')} assim)` : '';
    mostrarAvisoComAcao(
        `${plural(r.alterados, 'tema ficou', 'temas ficaram')} ${destino}${iguais}`,
        'Desfazer',
        () => {
            r.desfazer();
            save();
            renderTemas();
        },
    );
}

// Botão "Aplicar valências sugeridas" (amostra de 44 Temas).
export function aoAplicarValenciasSugeridas() {
    const r = aplicarValenciasSugeridas(db);
    if (r.aplicados === 0) {
        return mostrarAviso(
            r.jaTinham > 0
                ? 'Nada a aplicar: os temas da amostra que você tem já têm valência.'
                : 'Nenhum tema do seu cadastro está na amostra de temas sugerida.',
            'info',
        );
    }
    save();
    renderTemas();
    mostrarAvisoComAcao(
        `${plural(r.aplicados, 'tema recebeu', 'temas receberam')} a valência sugerida${
            r.jaTinham ? ` (${plural(r.jaTinham, 'já tinha a sua', 'já tinham a sua')})` : ''
        }`,
        'Desfazer',
        () => {
            r.desfazer();
            save();
            renderTemas();
        },
        10000,
    );
}

// ─── Definir por lista (valência, assunto ou vitrine) ─────────
// A lógica está em temas-lista.js (a valência, em temas-valencia-lista.js);
// aqui ficam o campo, o relatório e o Desfazer. Os nomes das ações e dos
// campos do HTML ainda dizem "valencia-lista": vieram da primeira versão, que
// só definia a valência, e mudá-los quebraria as ligações sem ganho.

const rotuloValencia = (v) => (v ? ROTULOS_VALENCIA_TEMA[v] : 'Não classificado');
const $ = (id) => document.getElementById(id);

// Sem o seletor (ou com valor estranho) vale a valência, como antes.
function campoDaLista() {
    const v = $('temas-lista-campo')?.value;
    return v === 'assunto' || v === 'vitrine' ? v : 'valencia';
}

const TEXTOS_LISTA = {
    valencia: {
        ajuda: 'Escreva a valência, dois pontos e os temas separados por ponto e vírgula. Pode ter vários blocos, na mesma linha ou em linhas separadas. Para limpar a valência, use "Sem valência:". Só entram temas que já existem no cadastro: nenhum tema é criado.',
        exemplo: 'Desagradável: Luto; Violência simbólica\nAgradável: Cotidiano; Amizade',
        rotulo: 'Lista de valências dos temas',
    },
    assunto: {
        ajuda: 'Escreva o nome do assunto, dois pontos e os temas separados por ponto e vírgula. Pode ter vários blocos, na mesma linha ou em linhas separadas. A lista só acrescenta: o tema entra no assunto sem sair de nenhum outro. Só valem assuntos e temas que já existem: nada é criado.',
        exemplo: 'Sociedade: Machismo; Polarização\nVínculos e relações: Amizade',
        rotulo: 'Lista de temas por assunto',
    },
    vitrine: {
        ajuda: 'Escreva o nome do convite da vitrine, dois pontos e os temas separados por ponto e vírgula. Pode ter vários blocos, na mesma linha ou em linhas separadas. A lista só acrescenta: o tema entra no convite sem sair de nenhum outro. Só valem convites e temas que já existem: nada é criado.',
        exemplo: 'Quando o amor acaba: Perda; Saudade\nCidade: Trânsito',
        rotulo: 'Lista de temas por convite da vitrine',
    },
};

// Ao trocar o campo: troca a ajuda, o exemplo e o nome acessível, e esconde o
// relatório (ele era do campo anterior). O texto digitado fica.
export function aoMudarCampoLista() {
    const t = TEXTOS_LISTA[campoDaLista()];
    const ajuda = $('temas-lista-ajuda');
    if (ajuda) ajuda.textContent = t.ajuda;
    const campo = $('temas-valencia-lista-texto');
    if (campo) {
        campo.placeholder = t.exemplo;
        campo.setAttribute('aria-label', t.rotulo);
    }
    esconderRelatorioLista();
}

const NOMES_DESTINO = {
    assunto: { um: 'assunto', varios: 'assuntos', artigo: 'no assunto' },
    vitrine: { um: 'convite', varios: 'convites', artigo: 'no convite' },
};

function relatorioDaLista(plano, modo, campo = 'valencia') {
    const aplicado = modo !== 'previa';
    const partes = [];
    const resumo = plano.resumo || [];
    if (resumo.length) {
        const linhas = resumo.map((r) => {
            if (campo !== 'valencia') {
                const base = `${escapeHtml(r.destino)}: ${plural(r.encontrados, 'tema encontrado', 'temas encontrados')}`;
                const muda = aplicado
                    ? plural(r.mudam, 'entrou', 'entraram')
                    : plural(r.mudam, 'entra', 'entram');
                return `<li>${base}, ${muda}</li>`;
            }
            const base = `${escapeHtml(rotuloValencia(r.valencia))}: ${plural(r.encontrados, 'tema encontrado', 'temas encontrados')}`;
            const muda = aplicado
                ? `${plural(r.mudam, 'mudou', 'mudaram')}`
                : `${plural(r.mudam, 'muda', 'mudam')}`;
            return `<li>${base}, ${muda}</li>`;
        });
        partes.push(`<ul class="list-disc pl-4">${linhas.join('')}</ul>`);
    }
    const inexistentes = plano.inexistentes || [];
    if (inexistentes.length) {
        const nomes = inexistentes
            .map(
                (i) =>
                    `${escapeHtml(i.nome)} (${escapeHtml(campo === 'valencia' ? rotuloValencia(i.valencia) : i.destino)})`,
            )
            .join('; ');
        partes.push(`<p><b>Não existem no cadastro, nada foi criado:</b> ${nomes}</p>`);
    }
    const conflitos = plano.conflitos || [];
    if (conflitos.length) {
        const nomes = conflitos
            .map(
                (c) =>
                    `${escapeHtml(c.nome)} (${c.valencias
                        .map((v) => escapeHtml(rotuloValencia(v)))
                        .join(' e ')})`,
            )
            .join('; ');
        partes.push(`<p><b>Em mais de uma valência na lista, ficaram de fora:</b> ${nomes}</p>`);
    }
    const sem = plano.semCabecalho || [];
    if (sem.length) {
        partes.push(
            `<p><b>Antes do primeiro cabeçalho, ficaram de fora:</b> ${sem
                .map(escapeHtml)
                .join('; ')}</p>`,
        );
    }
    const titulo = {
        previa: 'Prévia: nada foi gravado.',
        aplicado: 'Aplicado.',
        igual:
            campo === 'valencia'
                ? 'Nada mudou: todos já estavam com essas valências.'
                : `Nada mudou: todos os temas já estavam ${campo === 'assunto' ? 'nesses assuntos' : 'nesses convites'}.`,
    }[modo];
    return `<p class="font-semibold mb-1">${titulo}</p>${partes.join('')}`;
}

function mostrarRelatorioLista(plano, modo, campo = campoDaLista()) {
    const el = $('temas-valencia-lista-relatorio');
    if (!el) return;
    el.innerHTML = relatorioDaLista(plano, modo, campo);
    el.classList.remove('hidden');
}

function esconderRelatorioLista() {
    const el = $('temas-valencia-lista-relatorio');
    if (!el) return;
    el.innerHTML = '';
    el.classList.add('hidden');
}

// Avisa o motivo de a lista não servir; mostra o relatório quando ele ajuda.
function avisarListaInvalida(plano, campo) {
    if (campo === 'valencia') {
        if (plano.motivo === 'vazio') return mostrarAviso('Escreva a lista de valências.');
        if (plano.motivo === 'sem-cabecalho') {
            mostrarRelatorioLista(plano, 'previa', campo);
            return mostrarAviso(
                'Não achei nenhuma valência na lista. Comece cada bloco com a valência e dois pontos, por exemplo "Agradável: Amizade".',
            );
        }
    } else {
        const nome = NOMES_DESTINO[campo];
        if (plano.motivo === 'vazio') return mostrarAviso(`Escreva a lista de ${nome.varios}.`);
        if (plano.motivo === 'sem-destinos') {
            return mostrarAviso(
                campo === 'assunto'
                    ? 'Não há nenhum assunto cadastrado. Crie um na aba Assuntos.'
                    : 'Não há nenhum convite na vitrine. Crie um no bloco "Vitrine de leitura" da aba Assuntos.',
            );
        }
        if (plano.motivo === 'sem-cabecalho') {
            mostrarRelatorioLista(plano, 'previa', campo);
            return mostrarAviso(
                `Não achei nenhum ${nome.um} cadastrado na lista. Comece cada bloco com o nome do ${nome.um} e dois pontos, por exemplo "${campo === 'assunto' ? 'Sociedade: Machismo' : 'Quando o amor acaba: Perda'}".`,
            );
        }
    }
    if (plano.motivo === 'sem-temas') {
        mostrarRelatorioLista(plano, 'previa', campo);
        return mostrarAviso('Nenhum dos temas da lista existe no cadastro.');
    }
    return mostrarAviso('Não consegui ler a lista.');
}

export function aoConferirListaValencia() {
    const campo = campoDaLista();
    const texto = $('temas-valencia-lista-texto')?.value ?? '';
    const plano = planejarLista(db, campo, texto);
    if (!plano.ok) return avisarListaInvalida(plano, campo);
    if (!plano.aplicaveis.length) {
        return avisarListaInvalida({ ...plano, motivo: 'sem-temas' }, campo);
    }
    mostrarRelatorioLista(plano, 'previa', campo);
}

export function aoAplicarListaValencia() {
    const campo = campoDaLista();
    const texto = $('temas-valencia-lista-texto')?.value ?? '';
    const r = aplicarLista(db, campo, texto);
    if (!r.ok) return avisarListaInvalida(r, campo);
    if (r.alterados === 0) {
        mostrarRelatorioLista(r, 'igual', campo);
        return mostrarAviso(
            campo === 'valencia'
                ? 'Nenhum tema mudou: todos já estavam com essas valências.'
                : `Nenhum tema entrou: todos já estavam ${campo === 'assunto' ? 'nesses assuntos' : 'nesses convites'}.`,
            'info',
        );
    }
    save();
    renderTemas();
    mostrarRelatorioLista(r, 'aplicado', campo);
    const iguais = r.iguais ? ` (${plural(r.iguais, 'já estava', 'já estavam')} assim)` : '';
    const mensagem =
        campo === 'valencia'
            ? `${plural(r.alterados, 'tema mudou', 'temas mudaram')} de valência${iguais}`
            : `${plural(r.alterados, 'tema entrou', 'temas entraram')} ${
                  campo === 'assunto' ? 'em assuntos' : 'em convites da vitrine'
              }${r.iguais ? ` (${plural(r.iguais, 'já estava', 'já estavam')} lá)` : ''}`;
    mostrarAvisoComAcao(
        mensagem,
        'Desfazer',
        () => {
            r.desfazer();
            save();
            renderTemas();
            esconderRelatorioLista();
        },
        10000,
    );
}

export function aoLimparListaValencia() {
    const campo = $('temas-valencia-lista-texto');
    if (campo) campo.value = '';
    esconderRelatorioLista();
}
