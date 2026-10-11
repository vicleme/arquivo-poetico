// ============================================================
// pessoas-acoes.js — Estado e ações da aba Pessoas: filtro por Autor,
// seleção (checkbox por card) e atribuição em massa de Grupo/Autor.
//
// Mesmo espírito de autores-acoes.js (lista de cards, sem paginação),
// com duas diferenças por causa do formato de Pessoa ({ grupoIds,
// autorIds }, ver db.js):
//   - o filtro aqui é por Autor (N:N via `autorIds` — uma Pessoa pode
//     estar associada a mais de um Autor, diferente de Grupo, que
//     pertence a um único Autor via `g.autorId`; ver filtroAutorGrupos
//     em render-listas.js), não busca por texto;
//   - além de seleção, tem duas ações em massa aditivas (não substituem
//     grupoIds/autorIds já existentes, só somam).
// Pedido do Victor, 27/09/2026.
//
// Import circular com render-listas.js é o mesmo do par
// selecao-massa.js/render-listas.js (ver header de lá) e do de
// autores-acoes.js: renderPessoas() lê `selecaoPessoas`/
// `getFiltroAutorPessoas`/`getListaVisivelPessoas` daqui, e este módulo
// chama renderPessoas() depois de cada ação. Seguro porque nenhum dos
// dois lados usa o import do outro no topo do módulo, só dentro de
// funções.
// ============================================================

import { db, save } from './db.js';
import {
    mostrarAviso,
    mostrarAvisoComAcao,
    formaOcultadoPorGenero,
    formaReexibidoPorGenero,
    normalizarBusca,
    IDENTIDADES_CIS_TRANS,
    CORES_RACA_AUTOR,
} from './utils.js';
import { renderPessoas } from './render-listas.js';

export const selecaoPessoas = new Set();

let filtroAutorPessoas = '';
// Filtro por Grupo — mesmo espírito do filtro por Autor acima, só que
// via `grupoIds` (N:N também: uma Pessoa pode estar em mais de um
// grupo). Os dois filtros se combinam por E (ver getListaVisivelPessoas
// abaixo), então dá pra recortar "pessoas do Autor X que também
// pertencem ao Grupo Y". Principal motivo de existir: selecionar todo
// mundo de um grupo de uma vez (via "selecionar todos visíveis") pra
// ocultar em massa. Pedido do Victor, 27/09/2026.
let filtroGrupoPessoas = '';
// Busca por nome — texto livre, substring, sem diferenciar caixa nem
// acento (mesmo critério padrão de normalizarBusca). Combina por E com os
// filtros de Autor/Grupo acima, dentro de _porFiltrosAtuais.
let filtroNomePessoas = '';
// "Ocultar" (ver migrarPessoasOculto em db.js) recolhe a Pessoa da
// lista por padrão sem excluir nem desfazer nenhum vínculo — pra quem
// só aparece uma vez, num texto antigo, e não precisa mais ficar entre
// as ativas. Eixo ortogonal aos filtros por Autor/Grupo acima: eles
// reduzem "de quem", este reduz "importa ver agora ou não" — todos se
// combinam (ver getListaVisivelPessoas abaixo).
//
// Três estados em vez de um checkbox (mesmo espírito do "Só pendentes"
// de statusPoemas em render-listas.js): 'ativas' (padrão, esconde as
// ocultas), 'todas' (mostra tudo junto, ocultas marcadas com opacidade +
// badge) e 'ocultas' (mostra só as ocultas — pra gerenciar/recuperar
// sem precisar procurar entre as ativas). Pedido do Victor, 27/09/2026.
let visibilidadePessoas = 'ativas';

export function getFiltroAutorPessoas() {
    return filtroAutorPessoas;
}

export function getFiltroNomePessoas() {
    return filtroNomePessoas;
}

export function setFiltroNomePessoas(valor) {
    filtroNomePessoas = valor || '';
    renderPessoas();
}

export function getFiltroGrupoPessoas() {
    return filtroGrupoPessoas;
}

export function setFiltroGrupoPessoas(valor) {
    filtroGrupoPessoas = valor || '';
    renderPessoas();
}

export function setFiltroAutorPessoas(valor) {
    filtroAutorPessoas = valor || '';
    renderPessoas();
}

export function getVisibilidadePessoas() {
    return visibilidadePessoas;
}

export function setVisibilidadePessoas(valor) {
    visibilidadePessoas = ['ativas', 'todas', 'ocultas'].includes(valor) ? valor : 'ativas';
    renderPessoas();
}

// Recorta pelos filtros de Autor e Grupo (ambos opcionais, combinados
// por E) — usada tanto pela lista visível quanto pela contagem de
// ocultas abaixo, pra manter as duas em sincronia.
function _porFiltrosAtuais(lista) {
    const porAutor = filtroAutorPessoas
        ? lista.filter((p) =>
              (p.autorIds || []).some((id) => String(id) === String(filtroAutorPessoas)),
          )
        : lista;
    const porGrupo = filtroGrupoPessoas
        ? porAutor.filter((p) =>
              (p.grupoIds || []).some((id) => String(id) === String(filtroGrupoPessoas)),
          )
        : porAutor;
    const termo = normalizarBusca(filtroNomePessoas.trim());
    return termo ? porGrupo.filter((p) => normalizarBusca(p.nome).includes(termo)) : porGrupo;
}

// Pessoas na ordem alfabética da lista, recortadas pelos filtros de
// Autor/Grupo escolhidos (quando houver — ambos N:N, então basta a
// Pessoa estar associada, sem precisar ser exclusiva) e, depois, pela
// visibilidade escolhida (ver visibilidadePessoas acima: 'ativas' fora
// as ocultas, 'todas' mostra tudo, 'ocultas' mostra só as ocultas).
export function getListaVisivelPessoas() {
    const ordenadas = [...db.pessoas].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const filtradas = _porFiltrosAtuais(ordenadas);
    if (visibilidadePessoas === 'ocultas') return filtradas.filter((p) => p.oculto);
    if (visibilidadePessoas === 'todas') return filtradas;
    return filtradas.filter((p) => !p.oculto);
}

// Contagem de quantas pessoas estão ocultas dentro do recorte de
// Autor/Grupo atual — usada só pra rotular o toggle "Mostrar ocultas"
// (ver renderPessoas), não interfere na lista em si.
export function getQtdOcultasPessoas() {
    return _porFiltrosAtuais(db.pessoas).filter((p) => p.oculto).length;
}

// Âncora do último checkbox clicado — usada pelo shift-click pra estender
// a seleção ao intervalo entre ele e o anterior (mesmo padrão de
// toggleSelecao em selecao-massa.js, Poemas e Prosas). O intervalo é o
// que está entre as duas linhas na lista visível (ordem alfabética,
// já recortada pelos filtros e pela visibilidade). null = nenhum clique
// ainda; se a âncora saiu da lista visível (filtro mudou), cai pro
// clique simples.
let ultimoCheckPessoa = null;

export function toggleSelecaoPessoa(id, checked, shiftKey = false) {
    if (shiftKey && ultimoCheckPessoa !== null && ultimoCheckPessoa !== id) {
        const visiveis = getListaVisivelPessoas().map((p) => p.id);
        const iAncora = visiveis.indexOf(ultimoCheckPessoa);
        const iAtual = visiveis.indexOf(id);
        if (iAncora !== -1 && iAtual !== -1) {
            const [ini, fim] = iAncora < iAtual ? [iAncora, iAtual] : [iAtual, iAncora];
            visiveis.slice(ini, fim + 1).forEach((pid) => {
                if (checked) selecaoPessoas.add(pid);
                else selecaoPessoas.delete(pid);
            });
            ultimoCheckPessoa = id;
            renderPessoas();
            return;
        }
    }
    if (checked) selecaoPessoas.add(id);
    else selecaoPessoas.delete(id);
    ultimoCheckPessoa = id;
    renderPessoas();
}

// Marca/desmarca todas as que a busca atual mostra (não só as que cabem
// na tela — aqui não há paginação).
export function toggleSelecaoTodosPessoas(checked) {
    getListaVisivelPessoas().forEach((p) => {
        if (checked) selecaoPessoas.add(p.id);
        else selecaoPessoas.delete(p.id);
    });
    renderPessoas();
}

export function limparSelecaoPessoas() {
    selecaoPessoas.clear();
    renderPessoas();
}

// Inverte a seleção das pessoas que a tela mostra agora (busca, filtros e
// ocultas já recortados); quem está fora da lista visível não é tocado.
export function inverterSelecaoPessoas() {
    getListaVisivelPessoas().forEach(({ id }) => {
        if (selecaoPessoas.has(id)) selecaoPessoas.delete(id);
        else selecaoPessoas.add(id);
    });
    renderPessoas();
}

// Tira da seleção ids de Pessoas que já não existem (excluídas/mescladas
// depois de marcadas) — chamado a cada render, pra o contador nunca
// contar fantasma.
export function podarSelecaoPessoas() {
    const existentes = new Set(db.pessoas.map((p) => p.id));
    [...selecaoPessoas].forEach((id) => {
        if (!existentes.has(id)) selecaoPessoas.delete(id);
    });
}

export function atualizarBarraSelecaoPessoas() {
    const barra = document.getElementById('barra-acoes-pessoas');
    const contador = document.getElementById('contador-selecao-pessoas');
    if (!barra) return;
    const n = selecaoPessoas.size;
    barra.classList.toggle('hidden', n === 0);
    if (contador) {
        contador.innerText = `${n} pessoa${n !== 1 ? 's' : ''} selecionada${n !== 1 ? 's' : ''}`;
    }
}

// Adiciona `grupoId` ao select "Adicionar ao grupo" a todas as Pessoas
// selecionadas — aditivo (não mexe em quem já tem o grupo, nem remove
// nenhum outro). Avisa quantas de fato ganharam o grupo (quem já tinha
// não conta), pra não passar a impressão de que aplicou em todas as N
// selecionadas quando parte já estava assim.
export function aplicarGrupoEmMassaPessoas() {
    const sel = document.getElementById('pessoas-massa-grupo');
    const grupoId = sel?.value ? Number(sel.value) : null;
    if (!grupoId || selecaoPessoas.size === 0) return;

    let alteradas = 0;
    db.pessoas.forEach((p) => {
        if (!selecaoPessoas.has(p.id)) return;
        if (!Array.isArray(p.grupoIds)) p.grupoIds = [];
        if (!p.grupoIds.includes(grupoId)) {
            p.grupoIds.push(grupoId);
            alteradas++;
        }
    });

    if (alteradas === 0) {
        mostrarAviso('Todas as pessoas selecionadas já tinham esse grupo.', 'info');
        return;
    }
    if (sel) sel.value = '';
    save(); // dispara re-render via evento db:saved
    mostrarAviso(`Grupo adicionado a ${alteradas} pessoa${alteradas !== 1 ? 's' : ''}.`, 'sucesso');
}

// Mesma lógica de aplicarGrupoEmMassaPessoas, pro select "Vincular ao
// autor" — soma `autorId` a `autorIds` (N:N, não substitui os que já
// existem).
export function aplicarAutorEmMassaPessoas() {
    const sel = document.getElementById('pessoas-massa-autor');
    const autorId = sel?.value ? Number(sel.value) : null;
    if (!autorId || selecaoPessoas.size === 0) return;

    let alteradas = 0;
    db.pessoas.forEach((p) => {
        if (!selecaoPessoas.has(p.id)) return;
        if (!Array.isArray(p.autorIds)) p.autorIds = [];
        if (!p.autorIds.includes(autorId)) {
            p.autorIds.push(autorId);
            alteradas++;
        }
    });

    if (alteradas === 0) {
        mostrarAviso('Todas as pessoas selecionadas já estavam vinculadas a esse autor.', 'info');
        return;
    }
    if (sel) sel.value = '';
    save();
    mostrarAviso(`Autor vinculado a ${alteradas} pessoa${alteradas !== 1 ? 's' : ''}.`, 'sucesso');
}

// Diferente de aplicarGrupoEmMassaPessoas/aplicarAutorEmMassaPessoas
// acima (campos N:N, aditivos): Gênero é um único valor por Pessoa
// (`p.genero`, texto livre — ver extrairGenerosPessoasUnicos em
// utils.js), então aplicar em massa SUBSTITUI o valor de cada
// selecionada em vez de somar. Guarda o valor anterior de cada uma
// alterada pra oferecer "Desfazer" do lote inteiro (mesmo padrão de
// ocultarSelecaoPessoas abaixo) — precisa do valor anterior aqui
// porque, ao contrário de "oculto" (booleano, sempre volta pro estado
// oposto), o texto anterior de Gênero pode ser qualquer coisa.
// Campo em branco não faz nada (mesma guarda das outras duas ações);
// pra apagar o Gênero de várias pessoas de uma vez, ver
// limparGeneroEmMassaPessoas.
export function aplicarGeneroEmMassaPessoas() {
    const input = document.getElementById('pessoas-massa-genero');
    const genero = input?.value.trim() || '';
    if (!genero || selecaoPessoas.size === 0) return;

    const anteriores = [];
    db.pessoas.forEach((p) => {
        if (!selecaoPessoas.has(p.id)) return;
        if ((p.genero || '').trim() === genero) return;
        anteriores.push({ id: p.id, genero: p.genero || '' });
        p.genero = genero;
    });

    if (anteriores.length === 0) {
        mostrarAviso('Todas as pessoas selecionadas já tinham esse Gênero.', 'info');
        return;
    }
    if (input) input.value = '';
    save();
    const n = anteriores.length;
    mostrarAvisoComAcao(
        `Gênero definido como "${genero}" em ${n} pessoa${n !== 1 ? 's' : ''}.`,
        'Desfazer',
        () => {
            anteriores.forEach(({ id, genero: generoAnterior }) => {
                const alvo = db.pessoas.find((x) => x.id === id);
                if (alvo) alvo.genero = generoAnterior;
            });
            save();
        },
    );
}

// Identidade cis/trans e Cor/Raça são listas fechadas (ver
// IDENTIDADES_CIS_TRANS e CORES_RACA_AUTOR em utils.js) e valor único por
// Pessoa, então aplicar em massa SUBSTITUI o valor (como o Gênero acima)
// e guarda o anterior de cada alterada pra "Desfazer" do lote. A opção
// "Não documentado (apagar)" do select (valor LIMPAR_CAMPO_MASSA) apaga o
// campo: vazio quer dizer "não documentado", nunca um valor padrão. Select
// em branco não faz nada. `rotulo` entra nas mensagens.
const LIMPAR_CAMPO_MASSA = '__limpar__';

function aplicarCampoListaFechadaEmMassaPessoas(campo, idSelect, validos, rotulo) {
    const sel = document.getElementById(idSelect);
    const escolha = sel?.value || '';
    if (!escolha || selecaoPessoas.size === 0) return;
    const limpar = escolha === LIMPAR_CAMPO_MASSA;
    if (!limpar && !validos.includes(escolha)) return;
    const novo = limpar ? '' : escolha;

    const anteriores = [];
    db.pessoas.forEach((p) => {
        if (!selecaoPessoas.has(p.id)) return;
        if ((p[campo] || '') === novo) return;
        anteriores.push({ id: p.id, valor: p[campo] || '' });
        p[campo] = novo;
    });

    if (anteriores.length === 0) {
        mostrarAviso(
            limpar
                ? `Nenhuma das pessoas selecionadas tinha ${rotulo} definido.`
                : `Todas as pessoas selecionadas já tinham ${rotulo} "${novo}".`,
            'info',
        );
        return;
    }
    if (sel) sel.value = '';
    save();
    const n = anteriores.length;
    const pessoas = `${n} pessoa${n !== 1 ? 's' : ''}`;
    mostrarAvisoComAcao(
        limpar
            ? `${rotulo} apagado de ${pessoas}.`
            : `${rotulo} definido como "${novo}" em ${pessoas}.`,
        'Desfazer',
        () => {
            anteriores.forEach(({ id, valor }) => {
                const alvo = db.pessoas.find((x) => x.id === id);
                if (alvo) alvo[campo] = valor;
            });
            save();
        },
    );
}

export function aplicarIdentidadeCisTransEmMassaPessoas() {
    aplicarCampoListaFechadaEmMassaPessoas(
        'identidadeCisTrans',
        'pessoas-massa-identidade-cis-trans',
        IDENTIDADES_CIS_TRANS,
        'Identidade cis/trans',
    );
}

export function aplicarCorRacaEmMassaPessoas() {
    aplicarCampoListaFechadaEmMassaPessoas(
        'corRaca',
        'pessoas-massa-cor-raca',
        CORES_RACA_AUTOR,
        'Cor/Raça',
    );
}

// Orientação é texto livre com sugestão (como o Gênero), então aplicar em
// massa SUBSTITUI o valor de cada selecionada e guarda o anterior pra
// "Desfazer". Campo em branco não faz nada; limparOrientacaoEmMassaPessoas
// apaga o campo (vazio = "não documentado").
export function aplicarOrientacaoEmMassaPessoas() {
    const input = document.getElementById('pessoas-massa-orientacao');
    const orientacao = input?.value.trim() || '';
    if (!orientacao || selecaoPessoas.size === 0) return;
    trocarOrientacaoEmMassaPessoas(orientacao, input);
}

export function limparOrientacaoEmMassaPessoas() {
    if (selecaoPessoas.size === 0) return;
    trocarOrientacaoEmMassaPessoas('', document.getElementById('pessoas-massa-orientacao'));
}

function trocarOrientacaoEmMassaPessoas(novo, input) {
    const anteriores = [];
    db.pessoas.forEach((p) => {
        if (!selecaoPessoas.has(p.id)) return;
        if ((p.orientacao || '').trim() === novo) return;
        anteriores.push({ id: p.id, valor: p.orientacao || '' });
        p.orientacao = novo;
    });

    if (anteriores.length === 0) {
        mostrarAviso(
            novo
                ? 'Todas as pessoas selecionadas já tinham essa Orientação.'
                : 'Nenhuma das pessoas selecionadas tinha Orientação definida.',
            'info',
        );
        return;
    }
    if (input) input.value = '';
    save();
    const n = anteriores.length;
    const pessoas = `${n} pessoa${n !== 1 ? 's' : ''}`;
    mostrarAvisoComAcao(
        novo
            ? `Orientação definida como "${novo}" em ${pessoas}.`
            : `Orientação apagada de ${pessoas}.`,
        'Desfazer',
        () => {
            anteriores.forEach(({ id, valor }) => {
                const alvo = db.pessoas.find((x) => x.id === id);
                if (alvo) alvo.orientacao = valor;
            });
            save();
        },
    );
}

// Apaga o Gênero (`p.genero = ''`) de todas as selecionadas de uma vez
// — separado de aplicarGeneroEmMassaPessoas acima porque limpar é uma
// intenção diferente de definir (não dá pra "digitar vazio" com o
// mesmo peso de digitar um valor real), mesmo padrão de botão dedicado
// que ocultar/reexibir já usam em vez de um único toggle.
export function limparGeneroEmMassaPessoas() {
    if (selecaoPessoas.size === 0) return;
    const anteriores = [];
    db.pessoas.forEach((p) => {
        if (!selecaoPessoas.has(p.id)) return;
        if (!p.genero) return;
        anteriores.push({ id: p.id, genero: p.genero });
        p.genero = '';
    });

    if (anteriores.length === 0) {
        mostrarAviso('Nenhuma das pessoas selecionadas tinha Gênero definido.', 'info');
        return;
    }
    save();
    const n = anteriores.length;
    mostrarAvisoComAcao(`Gênero apagado de ${n} pessoa${n !== 1 ? 's' : ''}.`, 'Desfazer', () => {
        anteriores.forEach(({ id, genero }) => {
            const alvo = db.pessoas.find((x) => x.id === id);
            if (alvo) alvo.genero = genero;
        });
        save();
    });
}

// Botão "Ocultar"/"Reexibir" de um card individual — inverte só aquela
// Pessoa, sem depender da seleção múltipla. Ocultar oferece "Desfazer"
// (toast com ação, ver mostrarAvisoComAcao em utils.js — mesma peça que
// deleteItem usa em db.js): diferente de excluir, ocultar não precisa de
// exclusão pendente pra isso, já que a Pessoa nunca sai do banco — o
// desfazer só reverte `oculto` de volta, buscando pelo id de novo (não
// pela referência `p` capturada aqui) pra não reexibir a pessoa errada
// caso ela tenha sido excluída ou mesclada nesse meio-tempo. Reexibir
// não precisa do mesmo tratamento: mesmo que seja acidental, um clique
// a mais no mesmo botão já resolve.
export function toggleOcultarPessoa(id) {
    const p = db.pessoas.find((x) => x.id === id);
    if (!p) return;
    p.oculto = !p.oculto;
    save();
    if (p.oculto) {
        mostrarAvisoComAcao(`"${p.nome}" ${formaOcultadoPorGenero(p.genero)}.`, 'Desfazer', () => {
            const alvo = db.pessoas.find((x) => x.id === id);
            if (!alvo) return;
            alvo.oculto = false;
            save();
        });
    } else {
        mostrarAviso(`"${p.nome}" ${formaReexibidoPorGenero(p.genero)}.`, 'sucesso');
    }
}

// Ocultar/reexibir em massa, mesmo padrão de aplicarGrupoEmMassaPessoas/
// aplicarAutorEmMassaPessoas acima: aplica só em quem falta (não conta
// quem já estava naquele estado) e avisa quantas mudaram de fato. Não
// limpa a seleção depois (mesmo motivo das outras duas: pode-se querer
// aplicar mais de uma ação em massa seguida na mesma seleção).
//
// ocultarSelecaoPessoas guarda os ids que de fato mudaram pra oferecer
// "Desfazer" do lote inteiro (mesma lógica do desfazer individual em
// toggleOcultarPessoa acima — busca pelo id de novo, não por referência
// guardada). reexibirSelecaoPessoas não precisa disso pelo mesmo motivo
// do botão individual.
export function ocultarSelecaoPessoas() {
    if (selecaoPessoas.size === 0) return;
    const idsAlterados = [];
    db.pessoas.forEach((p) => {
        if (selecaoPessoas.has(p.id) && !p.oculto) {
            p.oculto = true;
            idsAlterados.push(p.id);
        }
    });
    if (idsAlterados.length === 0) {
        mostrarAviso('Todas as pessoas selecionadas já estavam ocultas.', 'info');
        return;
    }
    save();
    const n = idsAlterados.length;
    mostrarAvisoComAcao(
        `${n} pessoa${n !== 1 ? 's' : ''} oculta${n !== 1 ? 's' : ''}.`,
        'Desfazer',
        () => {
            db.pessoas.forEach((p) => {
                if (idsAlterados.includes(p.id)) p.oculto = false;
            });
            save();
        },
    );
}

export function reexibirSelecaoPessoas() {
    if (selecaoPessoas.size === 0) return;
    let alteradas = 0;
    db.pessoas.forEach((p) => {
        if (selecaoPessoas.has(p.id) && p.oculto) {
            p.oculto = false;
            alteradas++;
        }
    });
    if (alteradas === 0) {
        mostrarAviso('Nenhuma das pessoas selecionadas estava oculta.', 'info');
        return;
    }
    save();
    mostrarAviso(
        `${alteradas} pessoa${alteradas !== 1 ? 's' : ''} reexibida${alteradas !== 1 ? 's' : ''}.`,
        'sucesso',
    );
}
