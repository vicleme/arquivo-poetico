// pessoas-viagem.js — a ficha da Pessoa (gênero, orientação, identidade
// cis/trans e cor/raça) viaja no JSON exportado por texto e é recebida pela Importação
// Aditiva (Fase 1, F1-D7). Mesmo espírito do Personagem: o id não vale em
// outro acervo, a Pessoa é casada pelo NOME e o destino só preenche o que
// estava vazio. Vazio quer dizer "não documentado", nunca "cisgênero" nem
// "branca". Só o JSON leva esses campos; `.md`, `.csv` e Visualização ficam
// como estão.
import { IDENTIDADES_CIS_TRANS, CORES_RACA_AUTOR } from './utils.js';

export const CAMPOS_FICHA_PESSOA = ['genero', 'orientacao', 'identidadeCisTrans', 'corRaca'];

// Valor fora das listas fechadas vira vazio; gênero e orientação são texto
// livre aparado.
export function normalizarFichaPessoa(dados) {
    const d = dados || {};
    return {
        genero: typeof d.genero === 'string' ? d.genero.trim() : '',
        orientacao: typeof d.orientacao === 'string' ? d.orientacao.trim() : '',
        identidadeCisTrans: IDENTIDADES_CIS_TRANS.includes(d.identidadeCisTrans)
            ? d.identidadeCisTrans
            : '',
        corRaca: CORES_RACA_AUTOR.includes(d.corRaca) ? d.corRaca : '',
    };
}

// Chave "Incluir dados pessoais das Pessoas nos JSON" (F1-D7, parte 2):
// preferência geral guardada no navegador, padrão LIGADA (chave ausente =
// ligada). Desligada, os JSON por texto saem sem gênero, orientação,
// cis/trans e cor/raça. O backup completo (JSON.stringify do acervo) nunca passa por
// aqui e nunca omite.
const LS_KEY_DADOS_PESSOAIS = 'arquivoPoetico_incluirDadosPessoaisPessoas';

export function isIncluirDadosPessoaisAtivo() {
    try {
        return localStorage.getItem(LS_KEY_DADOS_PESSOAIS) !== '0';
    } catch {
        return true;
    }
}

function sincronizarChecksDadosPessoais(ativo) {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('.dados-pessoais-check').forEach((el) => {
        el.checked = ativo;
    });
}

export function toggleIncluirDadosPessoais(ativo) {
    try {
        localStorage.setItem(LS_KEY_DADOS_PESSOAIS, ativo ? '1' : '0');
    } catch (e) {
        console.warn('[pessoas-viagem.js] Não foi possível salvar a preferência:', e);
    }
    sincronizarChecksDadosPessoais(ativo);
}

// Aplica o estado salvo ao checkbox que já está no HTML (chamado no
// carregamento da página, em main.js).
export function sincronizarChecksDadosPessoaisComEstadoSalvo() {
    sincronizarChecksDadosPessoais(isIncluirDadosPessoaisAtivo());
}

// Os quatro campos do cadastro, para somar ao vínculo exportado. Com a chave
// desligada devolve {}: os campos saem do JSON (ausentes, não vazios).
export function fichaPessoaParaExportar(pessoa) {
    if (!isIncluirDadosPessoaisAtivo()) return {};
    return normalizarFichaPessoa(pessoa);
}

// Texto do aviso do resultado quando a chave está desligada e o arquivo tem
// algum vínculo de Pessoa; '' nos demais casos.
export function avisoDadosPessoaisOmitidos(itens) {
    if (isIncluirDadosPessoaisAtivo()) return '';
    const temPessoa = (itens || []).some((it) => Array.isArray(it?.pessoas) && it.pessoas.length);
    return temPessoa
        ? 'Dados pessoais das Pessoas (gênero, orientação, cis/trans, cor/raça) ficaram de fora do JSON.'
        : '';
}

// Preenche só o que a Pessoa do acervo ainda não tem. Devolve true se mudou algo.
export function completarPessoaComFicha(pessoa, dados) {
    if (!pessoa) return false;
    const ficha = normalizarFichaPessoa(dados);
    let mudou = false;
    CAMPOS_FICHA_PESSOA.forEach((campo) => {
        if (!pessoa[campo] && ficha[campo]) {
            pessoa[campo] = ficha[campo];
            mudou = true;
        }
        if (pessoa[campo] === undefined) pessoa[campo] = '';
    });
    return mudou;
}
