// ============================================================
// db.js — Estado central e persistência
// Importado por: todos os outros módulos
// Não importa nenhum módulo interno
// ============================================================

import {
    getPosicaoElemento,
    fecharEspaco,
    abrirEspaco,
    getIrmaosTopoLivro,
    getIrmaosPorEscopo,
    abrirModalExclusao,
    mostrarAvisoComAcao,
    fecharAviso,
    gerarId,
} from './utils.js';
import {
    salvarCapa,
    deletarCapa,
    exportarTodasCapasBase64,
    importarCapasBase64,
    base64ParaBlob,
} from './capas.js';
import { tirarSnapshotSeNecessario } from './autobackup.js';

const DB_KEY = 'arquivoPoetico_v3';
// Guarda quando o último "Baixar JSON" foi de fato clicado — usado pra
// mostrar na UI há quanto tempo não se tira um backup manual (item 5
// da revisão: antes não havia nenhum indicativo disso).
const LS_KEY_ULTIMO_BACKUP = 'arquivoPoetico_ultimoBackup';

// Limite do localStorage varia por navegador (Chrome/Firefox costumam dar
// ~10 MB, Safari ~5 MB) e não tem como consultar o valor real de antemão —
// só descobrimos o teto de fato quando o QuotaExceededError dispara. Usamos
// 5 MB como estimativa conservadora só pra dar um alerta antecipado; é
// melhor "sobrar" barra do que a pessoa achar que tem folga e não ter.
const LIMITE_ESTIMADO_BYTES = 5 * 1024 * 1024;

export let db = JSON.parse(localStorage.getItem(DB_KEY)) || {
    livros: [],
    partes: [],
    secoes: [],
    poemas: [],
    prosas: [],
    elementos: [],
    coletaneas: [], // legado, não usado pela aba Coletâneas atual — mantido só por compatibilidade na importação de backups antigos
    itensColetanea: [], // itens de Coletânea de fato (ver coletaneas.js); cada item referencia uma Parte via parteId
    pessoas: [], // cadastro central de Pessoas ({ id, nome, grupoIds }) — ver migrarPessoasParaCadastro
    grupos: [], // cadastro central de Grupos ({ id, nome }) — quem uma Pessoa é na vida de quem escreve, constante entre poemas
    autores: [], // cadastro central de Autores ({ id, nome, sobre }) — quem escreveu o item, ver migrarAutoria
    epocas: [], // cadastro central de Épocas ({ id, nome, contextoRelacao, notas }) — a que período um poema se refere, ver migrarEpocas
};

// Garante que dados importados de versões antigas tenham os campos novos
if (!db.coletaneas) db.coletaneas = [];
if (!db.pessoas) db.pessoas = [];
if (!db.grupos) db.grupos = [];
if (!db.autores) db.autores = [];
if (!db.epocas) db.epocas = [];

// Migração: em Poemas, o campo `publicado` (boolean) virou `status`, com
// 3 valores — 'publicado' | 'completo' | 'incompleto' — pra diferenciar
// rascunhos prontos de rascunhos pela metade (ver render-listas.js/forms.js).
// Poemas antigos, sem `status`, ganham 'completo' por padrão quando não
// publicados (decisão consciente: evita alarde visual de "incompleto" em
// texto que já tava pronto, mesmo que ainda não publicado).
function migrarStatusPoemas(poemas) {
    poemas.forEach((p) => {
        if (!p.status) {
            p.status = p.publicado ? 'publicado' : 'completo';
            delete p.publicado;
        }
    });
}
migrarStatusPoemas(db.poemas);

// Migração: Intertextualidade era um único par { tipo, texto } por poema.
// Um texto pode dialogar com várias referências externas de tipos
// diferentes ao mesmo tempo, então virou uma lista de pares. Poemas
// antigos com o formato de objeto único são envelopados numa lista de
// 1 item; poemas sem nada viram lista vazia. Ver forms.js/modal-poema.html.
function migrarIntertextualidadePoemas(poemas) {
    poemas.forEach((p) => {
        if (!p.intertextualidade) {
            p.intertextualidade = [];
        } else if (!Array.isArray(p.intertextualidade)) {
            const { tipo, texto } = p.intertextualidade;
            p.intertextualidade = tipo || texto ? [{ tipo: tipo || '', texto: texto || '' }] : [];
        }
    });
}
migrarIntertextualidadePoemas(db.poemas);

// Migração: Sinalizações era um único campo `sinalizacoes` (string,
// separada por vírgula) misturando 4 categorias semanticamente
// diferentes — estilo, tema, relação e sensibilidade — mais um uso que
// na prática era "tom/registro" (ex.: "Muito meloso"). Isso impedia
// filtrar só por categoria (ver CAMPOS_ATRIBUTO em utils.js). Vira 5
// campos: sinalizacoesEstilo / sinalizacoesTema / sinalizacoesRelacao /
// sinalizacoesSensibilidade / sinalizacoesTom.
//
// "Conteúdo sensível" não migra pra nenhum campo novo — deixou de ser
// tag solta porque já existe o campo `conteudoSensivel` (o parágrafo
// descritivo), que é a fonte de verdade; exibir/filtrar por "tem
// conteúdo sensível" passa a checar esse campo diretamente, não uma
// tag redundante que podia dessincronizar dele.
// "Rascunho" também não migra — o que ela tentava dizer já é coberto
// pelo status 'incompleto', que já existe; manter os dois seria a mesma
// informação disputando dois lugares.
// Tags não reconhecidas (inclui, por ora, "Premiados", "Tradução" e
// "Variações" — que vão virar Reconhecimentos e Elos tipados de
// Derivação numa etapa seguinte) vão pra sinalizacoesOutros, pra não
// perder o dado enquanto esses campos não existem ainda.
const MAPA_MIGRACAO_SINALIZACOES = {
    Concretista: 'sinalizacoesEstilo',
    Brasil: 'sinalizacoesTema',
    '∞ Pedrictor': 'sinalizacoesRelacao',
    'Linguagem obscena': 'sinalizacoesSensibilidade',
    'Muito meloso ( 🍯)': 'sinalizacoesTom',
};
const TAGS_DESCARTADAS_NA_MIGRACAO = new Set(['Conteúdo sensível', 'Rascunho']);

export function migrarSinalizacoes(itens) {
    itens.forEach((item) => {
        if (item.sinalizacoes === undefined) return; // já migrado (ou nunca teve o campo)

        const tags = (item.sinalizacoes || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

        const porCategoria = {
            sinalizacoesEstilo: [],
            sinalizacoesTema: [],
            sinalizacoesRelacao: [],
            sinalizacoesSensibilidade: [],
            sinalizacoesTom: [],
            sinalizacoesOutros: [],
        };

        tags.forEach((tag) => {
            if (TAGS_DESCARTADAS_NA_MIGRACAO.has(tag)) return;
            const campo = MAPA_MIGRACAO_SINALIZACOES[tag] || 'sinalizacoesOutros';
            porCategoria[campo].push(tag);
        });

        Object.entries(porCategoria).forEach(([campo, lista]) => {
            // Só cria o campo se já não existir (não sobrescreve nada
            // preenchido manualmente numa rodada anterior de migração).
            if (item[campo] === undefined) item[campo] = lista.join(', ');
        });

        delete item.sinalizacoes;
    });
}
migrarSinalizacoes(db.poemas);
migrarSinalizacoes(db.prosas);

// Migração: Elos e Referências eram arrays de ID cru apontando pra outro
// poema (ex.: [1776745104803]). Passam a ser arrays de objeto
// { id, tipo, texto } — um elo/referência pode ter um tipo específico
// (Reescrita de / Tradução de / Personagem em comum / etc., ver
// TIPOS_ELO/TIPOS_REFERENCIA em utils.js) e uma nota livre opcional. Só se
// aplica a Poema — Prosa ainda não tem `conceitos` (item 4 do schema,
// paridade com Poema, ainda pendente).
// Idempotente: entradas que já são objeto (rodada anterior de migração,
// ou item criado depois que o item 1 já existia) passam intactas.
function migrarElosReferencias(poemas) {
    const migrarLista = (lista) => {
        if (!Array.isArray(lista)) return lista;
        return lista.map((entrada) => {
            if (entrada && typeof entrada === 'object') return entrada; // já migrado
            const id = typeof entrada === 'number' ? entrada : parseInt(entrada, 10);
            return { id, tipo: '', texto: '' };
        });
    };
    poemas.forEach((p) => {
        if (!p.conceitos) return;
        p.conceitos.elos = migrarLista(p.conceitos.elos);
        p.conceitos.referencias = migrarLista(p.conceitos.referencias);
    });
}
migrarElosReferencias(db.poemas);

// Migração: Elos tinham um `tipo` de uma lista fechada de 11 valores
// (Reescrita de, Continuação de, Tradução de, Traduzido para...) — um
// valor por rótulo possível, com só 3 pares tendo o "outro lado"
// nomeado. Passam a ter `{ relacao, direcao }`: Relação é uma das 8
// relações (ver RELACOES_ELO em utils.js), Direção é 'origem' (texto
// mais antigo/base) ou 'destino' (texto derivado/mais novo) — o rótulo
// mostrado (ver rotuloElo em utils.js) já é derivado dos dois, sem
// precisar de mapa de inverso. Referências NÃO entram nessa migração —
// continuam só com `tipo` (schema unidirecional, sem Direção).
// Idempotente: elo que já tem `relacao` (rodada anterior de migração,
// ou elo criado depois que essa migração já existia) passa intacto.
const MAPA_MIGRACAO_TIPO_ELO = {
    'Reescrita de': { relacao: 'Reescrita', direcao: 'destino' },
    'Continuação de': { relacao: 'Continuidade', direcao: 'destino' },
    'Tradução de': { relacao: 'Tradução', direcao: 'destino' },
    'Traduzido para': { relacao: 'Tradução', direcao: 'origem' },
    'Variação de': { relacao: 'Variação', direcao: 'destino' },
    'Versão anterior (descartada) de': { relacao: 'Versão', direcao: 'origem' },
    'Versão oficial de': { relacao: 'Versão', direcao: 'destino' },
    'Díptico com': { relacao: 'Díptico', direcao: '' },
    'Resposta a': { relacao: 'Resposta', direcao: 'destino' },
    'Respondido em': { relacao: 'Resposta', direcao: 'origem' },
    Outro: { relacao: 'Outro', direcao: '' },
};
export function migrarElosParaRelacaoDirecao(poemas) {
    poemas.forEach((p) => {
        const elos = p.conceitos?.elos;
        if (!Array.isArray(elos)) return;
        p.conceitos.elos = elos.map((elo) => {
            if (elo.relacao !== undefined) return elo; // já migrado
            const mapeado = MAPA_MIGRACAO_TIPO_ELO[elo.tipo];
            if (mapeado)
                return {
                    id: elo.id,
                    relacao: mapeado.relacao,
                    direcao: mapeado.direcao,
                    texto: elo.texto || '',
                };
            // tipo vazio (nunca preenchido) ou tipo desconhecido/legado:
            // sem tipo vira elo sem relação definida (mesmo estado de
            // "não preenchido" de antes); tipo desconhecido cai em Outro,
            // sem direção pra não inventar um lado que não dá pra inferir.
            return {
                id: elo.id,
                relacao: elo.tipo ? 'Outro' : '',
                direcao: '',
                texto: elo.texto || '',
            };
        });
    });
}
migrarElosParaRelacaoDirecao(db.poemas);

// Migração: pessoas era string "Pedro, Dani" (por vírgula, misturando
// nomes sem distinguir o tipo de vínculo com o texto). Passa a ser array
// de objeto { nome, papel }: `papel` é um dos 4 valores fechados de
// PAPEIS_PESSOA (Retratado(a)/Inspirado(a) por/Dedicatário(a)/Mencionado(a)/Aludido(a)) —
// ou "" (não especificado). Todo nome migrado da string antiga vira
// papel: "" (não dá pra inferir o papel a partir só do nome). Aplica a
// Poema e Prosa (mesmo campo/schema nos dois).
// Idempotente: item cujo `pessoas` já é array passa intacto.
export function migrarPessoas(itens) {
    itens.forEach((item) => {
        if (Array.isArray(item.pessoas)) return; // já migrado
        const nomes = (item.pessoas || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        item.pessoas = nomes.map((nome) => ({ nome, papel: '' }));
    });
}
migrarPessoas(db.poemas);
migrarPessoas(db.prosas);

// Migração: papel era string única fechada em PAPEIS_PESSOA — uma pessoa
// só podia ocupar um papel por texto. Na prática, boa parte do acervo
// (poemas de endereçamento direto) tem a mesma pessoa sendo Retratado(a),
// Inspirado(a) por e Dedicatário(a) ao mesmo tempo — forçar escolha única
// jogava fora essa distinção pro maior bloco de dados do acervo. Passa a
// ser `papeis`: array (0+ valores de PAPEIS_PESSOA), na ordem em que
// foram marcados no editor — não é uma hierarquia fixa por categoria,
// é o que a pessoa achou mais forte, poema a poema (ver conversa que
// definiu isso: a intensidade de cada papel varia por texto, não é
// propriedade fixa da categoria).
// Idempotente: item cuja pessoa já tem `papeis` (array) passa intacta.
export function migrarPapeisPessoa(itens) {
    itens.forEach((item) => {
        if (!Array.isArray(item.pessoas)) return; // precisa de migrarPessoas rodar antes
        item.pessoas = item.pessoas.map((p) => {
            if (Array.isArray(p.papeis)) return p; // já migrado
            const { papel, ...resto } = p;
            return { ...resto, papeis: papel ? [papel] : [] };
        });
    });
}
migrarPapeisPessoa(db.poemas);
migrarPapeisPessoa(db.prosas);

// Migração: os nomes de 3 dos 5 valores de PAPEIS_PESSOA mudaram numa
// sessão (padronização de gênero — ver status-acervo-poetico.md):
// "Alusão" → "Aludido(a)", "Dedicatária" → "Dedicatário(a)", "Inspirado
// por" → "Inspirado(a) por". A troca só mudou a constante e o código —
// dado já salvo com o nome antigo (dentro de `papeis`, array de string)
// não foi tocado, então ficava com uma string que não bate mais com
// nenhuma opção do <select> (aparecia como papel "invisível": sem
// marcação em nenhum item do dropdown, mas contando pra inicial exibida
// e pra iniciaisPapeisPessoa) e, se a pessoa marcasse o papel novo
// correspondente (ex. Aludido(a)) no mesmo item, os dois conviviam no
// array (["Alusão", "Aludido(a)"]), gerando inicial duplicada ("A·A") na
// coluna. Renomeia in-place os 3 valores antigos pros novos; roda depois
// de migrarPapeisPessoa (precisa de `papeis` já ser array) e é seguro
// rodar de novo (só troca o que ainda está no nome antigo).
const RENOMEACOES_PAPEL = {
    Alusão: 'Aludido(a)',
    Dedicatária: 'Dedicatário(a)',
    'Inspirado por': 'Inspirado(a) por',
};
export function migrarNomesDePapel(itens) {
    itens.forEach((item) => {
        if (!Array.isArray(item.pessoas)) return;
        item.pessoas.forEach((p) => {
            if (!Array.isArray(p.papeis)) return;
            p.papeis = [...new Set(p.papeis.map((papel) => RENOMEACOES_PAPEL[papel] || papel))];
        });
    });
}
migrarNomesDePapel(db.poemas);
migrarNomesDePapel(db.prosas);

// Migração: Pessoa passa a ser entidade própria em `db.pessoas`
// ({ id, nome, grupoIds }), em vez de nome solto repetido em cada
// poema/prosa. `papel`/`papeis` é vínculo do texto com a pessoa (varia
// por poema) e continua em `item.pessoas`; o que muda é a chave: de
// `{ nome, papeis }` pra `{ pessoaId, papeis }` — quem a pessoa É
// (nome, grupos) passa a morar só no cadastro central, uma vez.
//
// Dedup por nome exato (mesmo critério que extrairPessoasUnicas já
// usava) — nomes que só diferem por acento/maiúscula/espaço extra
// viram pessoas diferentes aqui. Isso é uma limitação conhecida, não
// um bug: decidir se "Dani" e "dani " são a mesma pessoa é uma escolha
// de quem usa o sistema, não algo pra migração adivinhar sozinha. Uma
// função de mesclar pessoas (mover todas as referências de um id pra
// outro e apagar o duplicado) fica pra quando o cadastro existir de
// fato — nesse momento fica fácil ver os quase-duplicados e juntar.
//
// Idempotente: item cuja entrada de pessoa já tem `pessoaId` passa
// intacta; nome que já tem pessoa cadastrada com esse nome reaproveita
// o id em vez de duplicar.
export function migrarPessoasParaCadastro(dbRef) {
    const porNome = new Map(dbRef.pessoas.map((p) => [p.nome, p]));

    function idParaNome(nome) {
        let pessoa = porNome.get(nome);
        if (!pessoa) {
            pessoa = { id: gerarId(), nome, grupoIds: [] };
            dbRef.pessoas.push(pessoa);
            porNome.set(nome, pessoa);
        }
        return pessoa.id;
    }

    [dbRef.poemas, dbRef.prosas].forEach((itens) => {
        itens.forEach((item) => {
            if (!Array.isArray(item.pessoas)) return;
            item.pessoas = item.pessoas.map((p) => {
                if (p.pessoaId !== undefined) return p; // já migrado
                return { pessoaId: idParaNome(p.nome), papeis: p.papeis || [] };
            });
        });
    });
}
migrarPessoasParaCadastro(db);

// Migração: campo `idioma` (item 9 do plano de schema) não existia antes
// — complementa a Relação "Tradução" do item 1 (sem ele não dava pra
// saber em que língua um texto traduzido está). Todo item sem o campo
// recebe "pt-BR" (o idioma majoritário do acervo até aqui), não texto
// vazio — evita ficar "sem valor" em toda a base retroativamente só
// porque o campo é novo. Aplica a Poema e Prosa desde já (mesma
// antecipação já feita em Sinalizações — Prosa ainda não tem Elos/
// Tradução do item 4, mas ganha idioma junto).
// Idempotente: só toca item sem `idioma` (não sobrescreve valor já
// preenchido, seja o padrão ou uma escolha manual).
export function migrarIdioma(itens) {
    itens.forEach((item) => {
        if (item.idioma === undefined) item.idioma = 'pt-BR';
    });
}
migrarIdioma(db.poemas);
migrarIdioma(db.prosas);

// Migração: campo `reconhecimentos` — lista de prêmios/menções que um
// texto recebeu (item 8 do plano de schema), separada de tag solta. Até
// aqui, "Premiados" era uma tag genérica dentro do balde temporário
// sinalizacoesOutros (ver MAPA_MIGRACAO_SINALIZACOES acima) — todo item
// ganha `reconhecimentos: []`, e quem já tinha a tag "Premiados" ganha
// uma entrada em branco (`{ premio: '', posicao: '', ano: null, texto: ''
// }`) pra completar manualmente depois — o texto livre da tag e de Notas
// não dá pra parsear com confiança em prêmio/posição/ano estruturados —,
// com a tag removida de sinalizacoesOutros. Aplica a Poema e Prosa desde
// já (mesma antecipação de Idioma/Autoria/Envios).
// Idempotente: só toca item sem `reconhecimentos` (undefined, não
// sobrescreve preenchimento manual de uma rodada anterior); a remoção da
// tag "Premiados" também é idempotente por natureza — rodar de novo não
// encontra mais a tag pra remover nem cria uma segunda entrada em branco.
export function migrarReconhecimentos(itens) {
    itens.forEach((item) => {
        if (item.reconhecimentos !== undefined) return; // já migrado

        const tags = (item.sinalizacoesOutros || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        const tinhaTagPremiados = tags.includes('Premiados');

        item.reconhecimentos = tinhaTagPremiados
            ? [{ premio: '', posicao: '', ano: null, texto: '' }]
            : [];

        if (tinhaTagPremiados) {
            item.sinalizacoesOutros = tags.filter((t) => t !== 'Premiados').join(', ');
        }
    });
}
migrarReconhecimentos(db.poemas);
migrarReconhecimentos(db.prosas);

// Migração: campo `autoria` — de quem é a responsabilidade autoral por
// cada item (nem tudo no acervo é necessariamente solo — coautoria
// acontece). Cadastro central de Autores (db.autores: { id, nome,
// sobre }), à parte do de Pessoas — autoria é vínculo de autoria, bem
// diferente do papel que uma Pessoa ocupa NO texto (Retratado(a)/
// Dedicatário(a)/etc.). Todo item do acervo até aqui foi escrito pelo
// Victor Leme, então a migração garante esse autor no cadastro (criando
// só se ainda não existir, e só quando de fato há item pra migrar — não
// resgata um "Victor Leme" apagado manualmente se não sobrar nenhum
// item sem `autoria`) e vincula como Autor todo item que ainda não tem
// o campo — evita 305 itens ficarem "sem autoria" retroativamente só
// porque o campo é novo (mesmo raciocínio de migrarIdioma). Aplica a
// Poema e Prosa desde já.
// Idempotente: só toca item sem `autoria` (undefined); reaproveita o
// Victor Leme já cadastrado em vez de duplicar se a função rodar de novo.
export function migrarAutoria(dbRef) {
    let victorId = null;
    function obterVictorId() {
        if (victorId !== null) return victorId;
        let victor = dbRef.autores.find((a) => a.nome === 'Victor Leme');
        if (!victor) {
            victor = { id: gerarId(), nome: 'Victor Leme', sobre: '' };
            dbRef.autores.push(victor);
        }
        victorId = victor.id;
        return victorId;
    }

    [dbRef.poemas, dbRef.prosas].forEach((itens) => {
        itens.forEach((item) => {
            if (item.autoria === undefined) {
                item.autoria = [{ autorId: obterVictorId(), papel: 'Autor' }];
            }
        });
    });
}
migrarAutoria(db);

// Migração: item 3 do plano de schema. `epocaRetratada.nome` era texto
// livre repetido em cada poema — vira referência (`epocaId`) a um
// cadastro central próprio, `db.epocas` ({ id, nome, contextoRelacao,
// notas }), mesmo padrão de Pessoas/Autores acima. O que muda é só a
// chave: de `{ nome, inicio, fim, na }` pra `{ epocaId, inicio, fim,
// recorte, na }` — as datas/N-A continuam por item (o mesmo período
// pode valer datas diferentes num poema e noutro, ver
// obterSugestaoEpocaPorId em utils.js), só o nome passa a morar uma vez
// só no cadastro; `recorte` (RECORTES_EPOCA em utils.js) é campo novo,
// sem tentativa de adivinhar a partir do nome antigo — fica null pra
// preencher manualmente (mesmo raciocínio de migrarReconhecimentos:
// texto livre não dá pra parsear com confiança).
//
// Dedup por nome exato (mesmo critério/mesma limitação conhecida de
// migrarPessoasParaCadastro) — inclusive entre nomes que hoje
// distinguem "X" de "X e Pós" como strings diferentes: cada string
// única vira uma Época própria aqui; juntar as duas manualmente (se for
// o caso) fica pra uma função de mesclar Épocas, mesma pendência já
// registrada pra Pessoas.
//
// Só se aplica a Poema — Prosa ainda não tem epocaRetratada (item 4).
// Idempotente: item cuja epocaRetratada já tem `epocaId` passa intacta;
// nome que já tem Época cadastrada com esse nome reaproveita o id.
export function migrarEpocas(dbRef) {
    const porNome = new Map(dbRef.epocas.map((e) => [e.nome, e]));

    function idParaNome(nome) {
        let epoca = porNome.get(nome);
        if (!epoca) {
            epoca = { id: gerarId(), nome, contextoRelacao: '', notas: '' };
            dbRef.epocas.push(epoca);
            porNome.set(nome, epoca);
        }
        return epoca.id;
    }

    (dbRef.poemas || []).forEach((p) => {
        const epoca = p.epocaRetratada;
        if (!epoca || epoca.epocaId !== undefined) return; // vazio ou já migrado
        const nome = (epoca.nome || '').trim();
        p.epocaRetratada = {
            epocaId: nome ? idParaNome(nome) : null,
            inicio: epoca.inicio || null,
            fim: epoca.fim || null,
            recorte: epoca.recorte ?? null,
            na: !!epoca.na,
        };
    });
}
migrarEpocas(db);

// Resolve nome → Autor no cadastro central, criando um novo se ainda
// não existir (dedup por nome exato, mesmo critério de
// obterOuCriarPessoaPorNome logo abaixo). Usado por editor.js: caminho
// de confirmação explícita do usuário ao digitar um nome novo no chip
// de Autoria (ver criarGrupoDeAutoria).
export function obterOuCriarAutorPorNome(nome) {
    const nomeLimpo = String(nome ?? '').trim();
    let autor = db.autores.find((a) => a.nome === nomeLimpo);
    if (!autor) {
        autor = { id: gerarId(), nome: nomeLimpo, sobre: '' };
        db.autores.push(autor);
    }
    return autor;
}

// Resolve nome → Pessoa no cadastro central, criando uma nova se ainda
// não existir (dedup por nome exato, mesmo critério de
// migrarPessoasParaCadastro acima). Usada por editor.js: tanto no
// caminho de confirmação explícita do usuário (criarGrupoDePessoas →
// adicionar) quanto no caminho defensivo de carregar dado ainda não
// migrado ({nome, papeis} ou string solta) pro formato {pessoaId,
// papeis} atual.
export function obterOuCriarPessoaPorNome(nome) {
    const nomeLimpo = String(nome ?? '').trim();
    let pessoa = db.pessoas.find((p) => p.nome === nomeLimpo);
    if (!pessoa) {
        pessoa = { id: gerarId(), nome: nomeLimpo, grupoIds: [] };
        db.pessoas.push(pessoa);
    }
    return pessoa;
}

// Resolve nome → Época no cadastro central, criando uma nova se ainda
// não existir (dedup por nome exato, mesmo critério de
// obterOuCriarPessoaPorNome acima). Usada por forms.js ao gravar o
// campo "Época" do modal de Poema — texto digitado, resolvido/criado no
// submit, mesmo caminho de obterOuCriarAutorPorNome (não chip de lista,
// já que só existe uma Época por poema).
export function obterOuCriarEpocaPorNome(nome) {
    const nomeLimpo = String(nome ?? '').trim();
    if (!nomeLimpo) return null;
    let epoca = db.epocas.find((e) => e.nome === nomeLimpo);
    if (!epoca) {
        epoca = { id: gerarId(), nome: nomeLimpo, contextoRelacao: '', notas: '' };
        db.epocas.push(epoca);
    }
    return epoca;
}

// ─── Ordenações ──────────────────────────────────────────────
// Recebem os arrays como parâmetro (em vez de fechar sobre o `db` do
// módulo) pra poderem ser testadas isoladamente, com dados de mentira,
// sem precisar de localStorage/DOM. Continuam ordenando in-place e
// retornam o próprio array — mesmo comportamento de antes, só exposto.

export function sortLivros(livros) {
    livros.sort(
        (a, b) => (parseInt(a.sequencia) || 9999) - (parseInt(b.sequencia) || 9999) || a.id - b.id,
    );
    return livros;
}

export function sortPartes(partes, livros) {
    partes.sort((a, b) => {
        const orderA = livros.findIndex((l) => l.id == a.livroId);
        const orderB = livros.findIndex((l) => l.id == b.livroId);
        if (orderA !== orderB) return orderA - orderB;
        return (parseInt(a.sequencia) || 9999) - (parseInt(b.sequencia) || 9999);
    });
    return partes;
}

export function sortSecoes(secoes, livros, partes) {
    secoes.sort((a, b) => {
        const getLivroId = (s) => {
            if (s.paiTipo === 'livro') return s.paiId;
            const parte = partes.find((p) => p.id == s.paiId);
            return parte ? parte.livroId : 0;
        };
        const livroA = getLivroId(a),
            livroB = getLivroId(b);
        if (livroA !== livroB)
            return (
                livros.findIndex((l) => l.id == livroA) - livros.findIndex((l) => l.id == livroB)
            );

        // Posição dentro do livro: Seção direta no Livro usa a própria sequência
        // (senão sempre ia pro fim, perdendo pra qualquer Parte numerada).
        const posA =
            a.paiTipo === 'livro'
                ? parseInt(a.sequencia) || 9999
                : parseInt(partes.find((p) => p.id == a.paiId)?.sequencia) || 9999;
        const posB =
            b.paiTipo === 'livro'
                ? parseInt(b.sequencia) || 9999
                : parseInt(partes.find((p) => p.id == b.paiId)?.sequencia) || 9999;
        if (posA !== posB) return posA - posB;

        return (parseInt(a.sequencia) || 9999) - (parseInt(b.sequencia) || 9999);
    });
    return secoes;
}

export function sortPoemas(poemas, livros, partes, secoes) {
    poemas.sort((a, b) => {
        const getPath = (p) => {
            let livroIdx = 999,
                parteIdx = 999,
                secaoIdx = 999;
            const pad = (n) => String(n + 1).padStart(3, '0');

            if (p.paiTipo === 'secao') {
                const s = secoes.find((x) => x.id == p.paiId);
                if (s) {
                    secaoIdx = secoes.findIndex((x) => x.id == s.id);
                    if (s.paiTipo === 'parte') {
                        parteIdx = partes.findIndex((x) => x.id == s.paiId);
                        const pt = partes.find((x) => x.id == s.paiId);
                        livroIdx = livros.findIndex((x) => x.id == pt?.livroId);
                    } else {
                        livroIdx = livros.findIndex((x) => x.id == s.paiId);
                    }
                }
            } else if (p.paiTipo === 'parte') {
                parteIdx = partes.findIndex((x) => x.id == p.paiId);
                const pt = partes.find((x) => x.id == p.paiId);
                livroIdx = livros.findIndex((x) => x.id == pt?.livroId);
                secaoIdx = -1;
            } else if (p.paiTipo === 'livro') {
                livroIdx = livros.findIndex((x) => x.id == p.paiId);
                parteIdx = -1;
                secaoIdx = -1;
            }

            return `${pad(livroIdx)}_${pad(parteIdx)}_${pad(secaoIdx)}`;
        };

        const pathA = getPath(a),
            pathB = getPath(b);
        if (pathA !== pathB) return pathA.localeCompare(pathB);
        return (parseInt(a.sequencia) || 9999) - (parseInt(b.sequencia) || 9999);
    });
    return poemas;
}

export function sortElementos(elementos, dbRef) {
    elementos.sort((a, b) => {
        const [lA, ppA, psA] = getPosicaoElemento(a, dbRef);
        const [lB, ppB, psB] = getPosicaoElemento(b, dbRef);
        if (lA !== lB) return lA - lB;
        if (ppA !== ppB) return ppA - ppB;
        if (psA !== psB) return psA - psB;
        return (parseInt(a.sequencia) || 9999) - (parseInt(b.sequencia) || 9999);
    });
    return elementos;
}

// ─── API pública ──────────────────────────────────────────────

// Importar renderLists de render.js causaria dependência circular.
// save() aceiona um CustomEvent que render.js escuta.
export function save() {
    sortLivros(db.livros);
    sortPartes(db.partes, db.livros);
    sortSecoes(db.secoes, db.livros, db.partes);
    sortPoemas(db.poemas, db.livros, db.partes, db.secoes);
    db.prosas.sort((a, b) => (parseInt(a.sequencia) || 9999) - (parseInt(b.sequencia) || 9999));
    sortElementos(db.elementos, db);

    try {
        localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch (err) {
        // Quota excedida (QuotaExceededError) ou modo privado sem espaço
        const isQuota =
            err.name === 'QuotaExceededError' ||
            err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || // Firefox
            (err.code && err.code === 22);

        const mensagem = isQuota
            ? '⚠️ Armazenamento cheio\n\nO navegador não conseguiu salvar os dados — o localStorage atingiu o limite (geralmente ~5 MB de texto).\n\nO que fazer:\n• Exporte um backup em JSON agora (aba Exportar)\n• Considere dividir o acervo em instâncias separadas\n• Em modo anônimo/privado o limite é menor — use uma janela normal'
            : `⚠️ Erro ao salvar\n\nNão foi possível gravar no localStorage.\n\nDetalhes técnicos: ${err.message}`;

        console.error('[db.js] Falha ao salvar no localStorage:', err);
        // setTimeout evita bloquear a call stack atual — o alert aparece
        // mesmo que o código que chamou save() ainda esteja executando.
        setTimeout(() => alert(mensagem), 0);
        return; // não dispara db:saved se não salvou de verdade
    }
    // Best-effort, em segundo plano — não bloqueia o save() principal
    // nem precisa ser esperado (ver autobackup.js).
    tirarSnapshotSeNecessario(db);
    window.dispatchEvent(new CustomEvent('db:saved'));
}

export async function importarDB(novoDb) {
    db.livros = novoDb.livros || [];
    db.partes = novoDb.partes || [];
    db.secoes = novoDb.secoes || [];
    db.poemas = novoDb.poemas || [];
    db.prosas = novoDb.prosas || [];
    db.elementos = novoDb.elementos || [];
    db.coletaneas = novoDb.coletaneas || [];
    db.itensColetanea = novoDb.itensColetanea || [];
    db.pessoas = novoDb.pessoas || [];
    db.grupos = novoDb.grupos || [];
    db.autores = novoDb.autores || [];
    db.epocas = novoDb.epocas || [];
    migrarStatusPoemas(db.poemas);
    migrarIntertextualidadePoemas(db.poemas);
    migrarSinalizacoes(db.poemas);
    migrarSinalizacoes(db.prosas);
    migrarPessoas(db.poemas);
    migrarPessoas(db.prosas);
    migrarPapeisPessoa(db.poemas);
    migrarPapeisPessoa(db.prosas);
    migrarNomesDePapel(db.poemas);
    migrarNomesDePapel(db.prosas);
    migrarPessoasParaCadastro(db);
    migrarIdioma(db.poemas);
    migrarIdioma(db.prosas);
    migrarAutoria(db);
    // migrarReconhecimentos tinha ficado de fora daqui (só rodava no
    // load do módulo) — mesmo padrão de risco de "arquivo/chamada que
    // fica pra trás" já documentado no status-acervo-poetico.md; pego
    // ao mexer neste bloco pra Épocas, sem relação direta com o item 3.
    migrarReconhecimentos(db.poemas);
    migrarReconhecimentos(db.prosas);
    migrarEpocas(db);

    // Se o backup foi gerado com "incluir capas" marcado, ele traz um
    // _capasBase64 com as imagens embutidas — restaura pro IndexedDB
    // antes de salvar, senão as capas ficam referenciando IDs vazios.
    if (novoDb._capasBase64) {
        await importarCapasBase64(novoDb._capasBase64);
    }

    await migrarImagensLegadasParaIndexedDB();
    save();
}

// Até esta correção, dois lugares guardavam imagem como base64 direto no
// `db`, em vez do ID no IndexedDB que Livro/Parte/Seção normalmente usam
// (ver capas.js):
//   • Elemento (`imagem`) — sempre foi assim, um esquecimento na migração
//     original pro IndexedDB.
//   • "Parte de Coletânea" (`partes[i].capa`, criada via modal-col-parte) —
//     usa o MESMO campo `capa` que uma Parte normal, então o campo tinha
//     dois formatos diferentes dependendo de qual modal criou o registro:
//     ID (Parte normal) ou base64 (Parte de Coletânea). Isso fazia a capa
//     de uma Parte de Coletânea nem aparecer (lerCapa procurava um ID que
//     não existia no IndexedDB).
// Base64 direto no `db` infla o localStorage a cada save(), duplica a
// imagem em cada snapshot automático, e vai sempre junto no "Baixar JSON"
// mesmo com "incluir capas" desmarcado. Esta função migra, uma vez, tudo
// que ainda estiver nesse formato antigo (string "data:...") para o
// IndexedDB, guardando só o ID no `db`. Roda no boot do app (main.js) e
// também depois de importar um backup antigo, pra não reintroduzir o
// problema.
export async function migrarImagensLegadasParaIndexedDB() {
    const legado = (valor) => typeof valor === 'string' && valor.startsWith('data:');
    const elementosPendentes = db.elementos.filter((el) => legado(el.imagem));
    const partesPendentes = db.partes.filter((p) => legado(p.capa));
    if (elementosPendentes.length === 0 && partesPendentes.length === 0) return;

    for (const el of elementosPendentes) {
        try {
            const blob = await base64ParaBlob(el.imagem);
            el.imagem = await salvarCapa(blob);
        } catch (err) {
            // Não deixa o base64 antigo preso no db — perde a imagem nesse
            // elemento específico, mas libera o espaço pros demais.
            console.warn(`[db.js] Não foi possível migrar a imagem do elemento ${el.id}:`, err);
            el.imagem = null;
        }
    }

    for (const p of partesPendentes) {
        try {
            const blob = await base64ParaBlob(p.capa);
            p.capa = await salvarCapa(blob);
        } catch (err) {
            console.warn(`[db.js] Não foi possível migrar a capa da parte ${p.id}:`, err);
            p.capa = null;
        }
    }

    // Persiste agora — sem isso a migração rodaria de novo (e de novo)
    // a cada carregamento, até algum outro save() acontecer por acaso.
    save();
}

/**
 * @param {boolean} incluirCapas — se true, embute todas as capas de
 *   Livro/Parte/Seção como base64 no próprio JSON (deixa o arquivo maior,
 *   mas o backup fica autocontido — sem isso, um backup restaurado num
 *   navegador zerado perde todas as imagens, só sobra o texto).
 */
export async function exportarJSON(incluirCapas = false) {
    const payload = incluirCapas ? { ...db, _capasBase64: await exportarTodasCapasBase64() } : db;

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', 'arquivo_poetico_backup.json');
    document.body.appendChild(a);
    a.click();
    a.remove();

    try {
        localStorage.setItem(LS_KEY_ULTIMO_BACKUP, new Date().toISOString());
    } catch (err) {
        // Se nem isso couber, o storage já está no limite — o alert de
        // quota do save() já vai avisar na próxima gravação normal.
        console.warn('[db.js] Não foi possível registrar a data do backup:', err);
    }
    window.dispatchEvent(new CustomEvent('backup:feito'));
}

// Usado pela UI (main.js) pra mostrar "Último backup: há X dias".
// Retorna null se nenhum backup foi baixado ainda nesse navegador.
export function getUltimoBackup() {
    const raw = localStorage.getItem(LS_KEY_ULTIMO_BACKUP);
    return raw ? new Date(raw) : null;
}

// ─── Indicador de uso do storage ───────────────────────────────
// Estimativa via JSON.stringify(db).length — não é o número exato de bytes
// gravados (caracteres acentuados/emoji pesam mais em UTF-16 do que 1 byte),
// mas serve como aproximação razoável pra dar um alerta ANTES do
// QuotaExceededError, e não só reagir a ele (ver try/catch em save()).
// Usado pela UI (main.js) pra desenhar a barra de uso no header.
export function getUsoStorage() {
    const bytes = JSON.stringify(db).length;
    const percentual = Math.min(100, (bytes / LIMITE_ESTIMADO_BYTES) * 100);
    return { bytes, percentual, limiteBytes: LIMITE_ESTIMADO_BYTES };
}

// ─── Exclusão de item ─────────────────────────────────────────

const ROTULOS_COL = {
    livros: 'Livro',
    partes: 'Parte',
    secoes: 'Seção',
    poemas: 'Poema',
    prosas: 'Prosa',
    elementos: 'Elemento',
    itensColetanea: 'Item de Coletânea',
    coletaneas: 'Coletânea',
    pessoas: 'Pessoa',
    grupos: 'Grupo',
    autores: 'Autor',
    epocas: 'Época',
};

// Plural + particípio com concordância de gênero certa pro toast de
// exclusão em massa ("3 prosas excluídas", não "excluídos"). Só cobre
// poemas/prosas (única exclusão em massa que existe hoje — ver
// excluirSelecaoPoemas/excluirSelecaoProsas em render-listas.js);
// deleteItemsEmMassa cai num fallback genérico (masculino) pra
// qualquer outra coluna que vier a ganhar seleção em massa no futuro.
const MASSA_COL_INFO = {
    poemas: { plural: 'poemas', participio: 'excluídos' },
    prosas: { plural: 'prosas', participio: 'excluídas' },
};

/**
 * Calcula o que seria afetado ao apagar o Livro `livroId`, SE ele for uma
 * Coletânea: as Partes exclusivas dela e os itens de Coletânea dessas Partes.
 * Função pura (só lê `dbRef`, não muda nada) — usada tanto pra montar a
 * mensagem de confirmação (deleteItem) quanto pra executar a remoção de
 * fato (_executarExclusao), garantindo que os dois nunca divirjam.
 *
 * Não toca em poemas/prosas originais — os itens só guardam refId (ponteiro),
 * e as partes de livros normais referenciadas via parte.refId também ficam intactas.
 */
export function calcularCascataColetanea(dbRef, livroId) {
    const partesIds = (dbRef.partes || []).filter((p) => p.livroId == livroId).map((p) => p.id);
    const itensIds = (dbRef.itensColetanea || [])
        .filter((i) => partesIds.includes(i.parteId))
        .map((i) => i.id);
    return { partesIds, itensIds };
}

/**
 * Quem referencia a Pessoa `pessoaId` — poemas e prosas onde ela está
 * vinculada (independente do papel). Usado tanto pra avisar quantos
 * textos serão afetados (deleteItem) quanto pra de fato desvincular na
 * exclusão (_removerParaExclusao), garantindo que os dois nunca divirjam
 * (mesmo espírito de calcularCascataColetanea acima).
 */
export function calcularImpactoExclusaoPessoa(dbRef, pessoaId) {
    const acha = (item) => (item.pessoas || []).some((p) => p.pessoaId == pessoaId);
    return {
        poemasIds: (dbRef.poemas || []).filter(acha).map((p) => p.id),
        prosasIds: (dbRef.prosas || []).filter(acha).map((p) => p.id),
    };
}

/**
 * Quem referencia o Grupo `grupoId` — pessoas do cadastro que pertencem
 * a ele. Excluir o Grupo não exclui a Pessoa, só tira ela desse grupo
 * (ela pode pertencer a vários — sobreposição é o ponto do campo).
 */
export function calcularImpactoExclusaoGrupo(dbRef, grupoId) {
    const pessoasIds = (dbRef.pessoas || [])
        .filter((p) => (p.grupoIds || []).includes(grupoId))
        .map((p) => p.id);
    return { pessoasIds };
}

/**
 * Quem referencia o Autor `autorId` — poemas e prosas onde ele está
 * vinculado (independente do papel). Mesmo espírito de
 * calcularImpactoExclusaoPessoa acima.
 */
export function calcularImpactoExclusaoAutor(dbRef, autorId) {
    const acha = (item) => (item.autoria || []).some((a) => a.autorId == autorId);
    return {
        poemasIds: (dbRef.poemas || []).filter(acha).map((p) => p.id),
        prosasIds: (dbRef.prosas || []).filter(acha).map((p) => p.id),
    };
}

/**
 * Quem referencia a Época `epocaId` — poemas e prosas cuja
 * epocaRetratada aponta pra ela. Mesmo espírito de
 * calcularImpactoExclusaoPessoa/Autor acima: excluir a Época não exclui
 * o texto, só desvincula.
 *
 * Corrigido numa sessão posterior: só checava `dbRef.poemas` — resquício
 * de comentário desatualizado (dizia "Prosa ainda não tem epocaRetratada,
 * ver item 4", mas o item 4 já deu Prosa o campo há sessões). Prosa com
 * Época vinculada não entrava na contagem de impacto nem era desvinculada
 * ao excluir/mesclar a Época — ficava com um `epocaId` órfão apontando
 * pra uma Época já removida do cadastro. Ver histórico no .md de status.
 */
export function calcularImpactoExclusaoEpoca(dbRef, epocaId) {
    const acha = (item) => item.epocaRetratada?.epocaId == epocaId;
    return {
        poemasIds: (dbRef.poemas || []).filter(acha).map((p) => p.id),
        prosasIds: (dbRef.prosas || []).filter(acha).map((p) => p.id),
    };
}

// ─── Mesclar (Pessoa/Época) ────────────────────────────────────
// Pedido do Victor: renomear uma Pessoa/Época pra igual a outra não
// mescla nada sozinho — só deixa duas entradas com nome (e, no caso de
// Época, Contexto do relacionamento) idênticos, cada uma com seu
// cadastro e vínculos próprios. A dedup automática (migrarPessoas/
// migrarEpocas, obterOuCriarPessoaPorNome/obterOuCriarEpocaPorNome) só
// cobre o momento em que o nome é criado (migração ou digitação no
// modal de Poema/Prosa) — nunca o caso de duas entradas que já existiam
// separadas e só ficaram "iguais" depois, por uma delas ser renomeada
// na aba de gestão. Mesma lacuna já registrada no .md de status como
// "mesclar Pessoas" pendente — implementada agora pra Pessoa e Época
// junto (mesma mecânica pros dois).
//
// `origemId` "morre" (some do cadastro); `destinoId` "sobrevive" e
// herda todos os vínculos da origem. Função pura (só muda `dbRef`,
// não chama save() nem toca DOM) — mesmo critério de migrarPessoas/
// migrarEpocas, quem chama decide quando persistir (ver abrirModalMesclar
// em forms.js).

/**
 * Reatribui pra `destinoId` todo vínculo de Pessoa que apontava pra
 * `origemId` (em `item.pessoas`, Poema e Prosa), une `grupoIds` das
 * duas (sem duplicar) e remove a origem do cadastro. Se um mesmo item
 * já vinculava as duas pessoas (raro, mas possível — ex. cadastradas
 * separadamente antes de alguém perceber que eram a mesma), os `papeis`
 * das duas entradas são unidos numa só, em vez de deixar duas entradas
 * pra mesma pessoa (agora idêntica) no mesmo item.
 */
export function mesclarPessoas(dbRef, origemId, destinoId) {
    if (origemId == destinoId) return;
    const origem = dbRef.pessoas?.find((p) => p.id == origemId);
    const destino = dbRef.pessoas?.find((p) => p.id == destinoId);
    if (!origem || !destino) return;

    ['poemas', 'prosas'].forEach((col) => {
        (dbRef[col] || []).forEach((it) => {
            if (!Array.isArray(it.pessoas)) return;
            const entradaOrigem = it.pessoas.find((p) => p.pessoaId == origemId);
            if (!entradaOrigem) return;
            const entradaDestino = it.pessoas.find((p) => p.pessoaId == destinoId);
            if (entradaDestino) {
                entradaDestino.papeis = [
                    ...new Set([...(entradaDestino.papeis || []), ...(entradaOrigem.papeis || [])]),
                ];
                it.pessoas = it.pessoas.filter((p) => p.pessoaId != origemId);
            } else {
                entradaOrigem.pessoaId = destinoId;
            }
        });
    });

    destino.grupoIds = [...new Set([...(destino.grupoIds || []), ...(origem.grupoIds || [])])];
    dbRef.pessoas = dbRef.pessoas.filter((p) => p.id != origemId);
}

/**
 * Reatribui pra `destinoId` todo `epocaRetratada.epocaId` que apontava
 * pra `origemId` (Poema e Prosa) e remove a origem do cadastro.
 * Contexto do relacionamento/Notas da origem preenchem o destino só se
 * o destino estiver com o campo vazio — nunca sobrescreve o que a
 * sobrevivente já tinha preenchido (mesmo critério de "só entra se
 * estiver vazio" já usado em aplicarSugestaoEpoca, forms.js).
 */
export function mesclarEpocas(dbRef, origemId, destinoId) {
    if (origemId == destinoId) return;
    const origem = dbRef.epocas?.find((e) => e.id == origemId);
    const destino = dbRef.epocas?.find((e) => e.id == destinoId);
    if (!origem || !destino) return;

    ['poemas', 'prosas'].forEach((col) => {
        (dbRef[col] || []).forEach((it) => {
            if (it.epocaRetratada?.epocaId == origemId) {
                it.epocaRetratada.epocaId = destinoId;
            }
        });
    });

    if (!destino.contextoRelacao && origem.contextoRelacao) {
        destino.contextoRelacao = origem.contextoRelacao;
    }
    if (!destino.notas && origem.notas) {
        destino.notas = origem.notas;
    }
    dbRef.epocas = dbRef.epocas.filter((e) => e.id != origemId);
}

// ─── Exclusão com "desfazer" ───────────────────────────────────
// Excluir um item some da lista na hora (e salva), mas a capa associada
// (se houver) só é apagada de verdade do IndexedDB depois de alguns
// segundos — é o único jeito de dar um "Desfazer" real sem correr o
// risco de restaurar o item com uma referência de capa apontando pro
// nada. Enquanto isso, o item removido fica guardado em memória
// (_pendingExclusao). Só existe um "desfazer" pendente por vez: uma
// nova exclusão confirma a anterior de vez (e fecha o toast dela) antes
// de seguir — senão o toast velho ficaria oferecendo um "Desfazer" que
// na prática desfaria a exclusão errada (a mais recente).
// _pendingExclusao.removidos é sempre um array — com 1 item numa
// exclusão simples (deleteItem) ou vários numa exclusão em massa
// (deleteItemsEmMassa), pra dar um único toast de "Desfazer" pro lote
// inteiro em vez de um por item.
let _pendingExclusao = null;

function _capasDoItem(item) {
    return item?.capa ? [item.capa] : [];
}

// Remove o item (e a cascata de Coletânea, se for o caso) dos arrays do
// db e fecha o buraco na numeração — mas NÃO apaga a capa do IndexedDB
// ainda, e NÃO salva (quem chama decide quando salvar — em exclusão em
// massa, várias chamadas daqui compartilham um único save() no final,
// em vez de uma gravação por item). Devolve tudo que _restaurar()
// precisa pra desfazer de verdade.
function _removerParaExclusao(col, id) {
    const index = db[col]?.findIndex((i) => i.id == id) ?? -1;
    if (index === -1) return null;

    const item = db[col][index];
    db[col].splice(index, 1);

    const capasParaDescartar = _capasDoItem(item);
    let partesRemovidas = [];
    let itensRemovidos = [];

    if (col === 'livros' && item?.tipo === 'Coletânea') {
        const { partesIds, itensIds } = calcularCascataColetanea(db, id);
        partesRemovidas = db.partes.filter((p) => partesIds.includes(p.id));
        itensRemovidos = (db.itensColetanea || []).filter((i) => itensIds.includes(i.id));
        partesRemovidas.forEach((p) => {
            if (p.capa) capasParaDescartar.push(p.capa);
        });

        db.partes = db.partes.filter((p) => !partesIds.includes(p.id));
        db.itensColetanea = (db.itensColetanea || []).filter((i) => !itensIds.includes(i.id));
    }

    // Excluir Pessoa: some do cadastro (já feito pelo splice acima) e
    // precisa deixar de aparecer em todo poema/prosa que a referenciava
    // — senão sobra um pessoaId órfão apontando pra ninguém. Guarda
    // cada vínculo removido (com o papel que tinha) pra restaurar no
    // "Desfazer"; a ordem dentro de item.pessoas não é significativa
    // (diferente de `papeis`, que preserva ordem de marcação), então
    // restaurar no fim do array é suficiente.
    let vinculosPessoaRemovidos = [];
    if (col === 'pessoas') {
        ['poemas', 'prosas'].forEach((itemCol) => {
            (db[itemCol] || []).forEach((it) => {
                if (!Array.isArray(it.pessoas)) return;
                for (let i = it.pessoas.length - 1; i >= 0; i--) {
                    if (it.pessoas[i].pessoaId == id) {
                        vinculosPessoaRemovidos.push({
                            itemCol,
                            itemId: it.id,
                            entrada: it.pessoas[i],
                        });
                        it.pessoas.splice(i, 1);
                    }
                }
            });
        });
    }

    // Excluir Autor: some do cadastro e precisa deixar de aparecer em
    // todo poema/prosa que o referenciava — senão sobra um autorId
    // órfão apontando pra ninguém. Mesmo padrão de vinculosPessoaRemovidos
    // acima, mas em `item.autoria` (vínculo { autorId, papel }).
    let vinculosAutoriaRemovidos = [];
    if (col === 'autores') {
        ['poemas', 'prosas'].forEach((itemCol) => {
            (db[itemCol] || []).forEach((it) => {
                if (!Array.isArray(it.autoria)) return;
                for (let i = it.autoria.length - 1; i >= 0; i--) {
                    if (it.autoria[i].autorId == id) {
                        vinculosAutoriaRemovidos.push({
                            itemCol,
                            itemId: it.id,
                            entrada: it.autoria[i],
                        });
                        it.autoria.splice(i, 1);
                    }
                }
            });
        });
    }

    // Excluir Época: some do cadastro e o `epocaId` de todo poema/prosa
    // que a referenciava volta pra null — o texto continua existindo, só
    // "perde" a referência ao período (mesmo espírito de vínculos de
    // Autor/Pessoa acima). Guarda `itemCol` (poemas ou prosas) igual aos
    // dois padrões acima — corrigido junto com calcularImpactoExclusaoEpoca
    // (ver comentário lá): antes só varria `db.poemas`.
    let vinculosEpocaRemovidos = [];
    if (col === 'epocas') {
        ['poemas', 'prosas'].forEach((itemCol) => {
            (db[itemCol] || []).forEach((it) => {
                if (it.epocaRetratada?.epocaId == id) {
                    vinculosEpocaRemovidos.push({ itemCol, itemId: it.id, epocaId: id });
                    it.epocaRetratada.epocaId = null;
                }
            });
        });
    }

    // Excluir Grupo: some do cadastro e some de `grupoIds` de toda
    // Pessoa que pertencia a ele — a Pessoa continua existindo, só deixa
    // de fazer parte desse grupo específico (ela pode estar em outros).
    let vinculosGrupoRemovidos = [];
    if (col === 'grupos') {
        (db.pessoas || []).forEach((p) => {
            if (!Array.isArray(p.grupoIds)) return;
            const idx = p.grupoIds.indexOf(id);
            if (idx !== -1) {
                vinculosGrupoRemovidos.push({ pessoaId: p.id });
                p.grupoIds.splice(idx, 1);
            }
        });
    }

    // Fecha o buraco deixado na numeração do grupo de onde o item saiu
    // (mesma lógica de sempre — só guardamos os "irmãos" pra poder
    // reverter com abrirEspaco() se a exclusão for desfeita).
    const posicaoRemovida = item.sequencia ?? null;
    let irmaos = null;
    if (col === 'livros') {
        irmaos = db.livros;
    } else if (col === 'partes' && item.livroId) {
        irmaos = getIrmaosTopoLivro(db, item.livroId);
    } else if (
        ['secoes', 'elementos', 'poemas', 'prosas'].includes(col) &&
        item.paiTipo &&
        item.paiId
    ) {
        irmaos = getIrmaosPorEscopo(db, item.paiTipo, item.paiId);
    }
    if (irmaos) fecharEspaco(irmaos, posicaoRemovida);

    return {
        col,
        item,
        partesRemovidas,
        itensRemovidos,
        vinculosPessoaRemovidos,
        vinculosAutoriaRemovidos,
        vinculosGrupoRemovidos,
        vinculosEpocaRemovidos,
        capasParaDescartar,
        posicaoRemovida,
        irmaos,
    };
}

// Devolve o item (e cascata) pros arrays do db, reabrindo o espaço na
// numeração que fecharEspaco tinha fechado. Não salva sozinho — ver
// comentário em _removerParaExclusao.
function _restaurar(removido) {
    const {
        col,
        item,
        partesRemovidas,
        itensRemovidos,
        vinculosPessoaRemovidos,
        vinculosAutoriaRemovidos,
        vinculosGrupoRemovidos,
        vinculosEpocaRemovidos,
        posicaoRemovida,
        irmaos,
    } = removido;

    if (irmaos) abrirEspaco(irmaos, posicaoRemovida);

    db[col].push(item);
    if (partesRemovidas.length) db.partes.push(...partesRemovidas);
    if (itensRemovidos.length) {
        db.itensColetanea = [...(db.itensColetanea || []), ...itensRemovidos];
    }
    (vinculosPessoaRemovidos || []).forEach(({ itemCol, itemId, entrada }) => {
        const it = db[itemCol]?.find((i) => i.id == itemId);
        if (it) (it.pessoas ||= []).push(entrada);
    });
    (vinculosAutoriaRemovidos || []).forEach(({ itemCol, itemId, entrada }) => {
        const it = db[itemCol]?.find((i) => i.id == itemId);
        if (it) (it.autoria ||= []).push(entrada);
    });
    (vinculosGrupoRemovidos || []).forEach(({ pessoaId }) => {
        const p = db.pessoas?.find((i) => i.id == pessoaId);
        if (p) (p.grupoIds ||= []).push(item.id);
    });
    (vinculosEpocaRemovidos || []).forEach(({ itemCol, itemId, epocaId }) => {
        const it = db[itemCol]?.find((i) => i.id == itemId);
        if (it && it.epocaRetratada) it.epocaRetratada.epocaId = epocaId;
    });
}

// Confirma a exclusão pendente de vez: apaga a(s) capa(s) do IndexedDB.
// Depois disso não tem mais volta.
function _finalizarExclusaoPendente() {
    if (!_pendingExclusao) return;
    const { removidos, timeoutId, toast } = _pendingExclusao;
    clearTimeout(timeoutId);
    // Some com o toast de "Desfazer" dessa exclusão — se ficasse na tela,
    // clicar nele agora iria desfazer a exclusão SEGUINTE (a única que
    // ainda está pendente), não a que o toast prometia. Ver comentário
    // em _pendingExclusao acima.
    if (toast) fecharAviso(toast);
    removidos.forEach((removido) => removido.capasParaDescartar.forEach((id) => deletarCapa(id)));
    _pendingExclusao = null;
}

function _desfazerExclusaoPendente() {
    if (!_pendingExclusao) return;
    const { removidos, timeoutId } = _pendingExclusao;
    clearTimeout(timeoutId);
    _pendingExclusao = null;
    // Restaura na ordem inversa da remoção — cada abrirEspaco() espera
    // encontrar os irmãos no estado logo depois daquela remoção específica,
    // então desfazer precisa "rebobinar" na ordem contrária.
    for (let i = removidos.length - 1; i >= 0; i--) {
        _restaurar(removidos[i]);
    }
    save();
}

export function deleteItem(col, id) {
    const item = db[col]?.find((i) => i.id == id);
    const titulo = item?.titulo || item?.tipo || item?.nome || `#${id}`;
    let rotulo = ROTULOS_COL[col] || col;

    // Para coletâneas, informa quantas partes e itens serão removidos em cascata
    if (col === 'livros' && item?.tipo === 'Coletânea') {
        const { partesIds, itensIds } = calcularCascataColetanea(db, id);
        const totalPartes = partesIds.length;
        const totalItens = itensIds.length;
        if (totalPartes > 0 || totalItens > 0) {
            rotulo = `Coletânea · ${totalPartes} parte${totalPartes !== 1 ? 's' : ''} e ${totalItens} iten${totalItens !== 1 ? 's' : ''} serão removidos`;
        } else {
            rotulo = 'Coletânea';
        }
    }

    // Para Pessoa, avisa em quantos poemas/prosas ela vai deixar de
    // aparecer (o vínculo some, o texto em si não é afetado).
    if (col === 'pessoas') {
        const { poemasIds, prosasIds } = calcularImpactoExclusaoPessoa(db, id);
        const total = poemasIds.length + prosasIds.length;
        rotulo =
            total > 0
                ? `Pessoa · deixará de aparecer em ${total} texto${total !== 1 ? 's' : ''}`
                : 'Pessoa';
    }

    // Para Autor, avisa em quantos poemas/prosas ele vai deixar de
    // aparecer (o vínculo some, o texto em si não é afetado).
    if (col === 'autores') {
        const { poemasIds, prosasIds } = calcularImpactoExclusaoAutor(db, id);
        const total = poemasIds.length + prosasIds.length;
        rotulo =
            total > 0
                ? `Autor · deixará de aparecer em ${total} texto${total !== 1 ? 's' : ''}`
                : 'Autor';
    }

    // Para Época, avisa em quantos poemas/prosas ela vai deixar de
    // aparecer (o vínculo some — epocaId volta pra null —, o texto em
    // si não é afetado). Mesmo padrão de Pessoa/Autor acima.
    if (col === 'epocas') {
        const { poemasIds, prosasIds } = calcularImpactoExclusaoEpoca(db, id);
        const total = poemasIds.length + prosasIds.length;
        rotulo =
            total > 0
                ? `Época · deixará de aparecer em ${total} texto${total !== 1 ? 's' : ''}`
                : 'Época';
    }

    // Para Grupo, avisa quantas pessoas deixarão de pertencer a ele.
    if (col === 'grupos') {
        const { pessoasIds } = calcularImpactoExclusaoGrupo(db, id);
        const total = pessoasIds.length;
        rotulo =
            total > 0
                ? `Grupo · ${total} pessoa${total !== 1 ? 's' : ''} deixará de pertencer a ele`
                : 'Grupo';
    }

    abrirModalExclusao(titulo, rotulo, () => {
        // Só um "desfazer" pendente por vez — uma nova exclusão confirma
        // a anterior de vez (apaga a capa dela) antes de continuar.
        _finalizarExclusaoPendente();

        const removido = _removerParaExclusao(col, id);
        if (!removido) return;
        save();

        const toast = mostrarAvisoComAcao(`Excluído: ${titulo}`, 'Desfazer', () =>
            _desfazerExclusaoPendente(),
        );
        const timeoutId = setTimeout(_finalizarExclusaoPendente, 6000);
        _pendingExclusao = { removidos: [removido], timeoutId, toast };
    });
}

// Exclusão em massa: mesma mecânica de deleteItem, mas pra vários ids de
// uma vez, com um ÚNICO save() e um único toast/"Desfazer" pro lote
// inteiro (bem diferente de chamar deleteItem em loop, que salvaria e
// mostraria um toast pra cada item). Quem chama já deve ter confirmado a
// ação com o usuário (ver excluirSelecaoPoemas/excluirSelecaoProsas em
// render-listas.js) — aqui só executa.
export function deleteItemsEmMassa(col, ids) {
    _finalizarExclusaoPendente();

    const removidos = [];
    ids.forEach((id) => {
        const removido = _removerParaExclusao(col, id);
        if (removido) removidos.push(removido);
    });
    if (!removidos.length) return;
    save();

    const n = removidos.length;
    const info = MASSA_COL_INFO[col] || {
        plural: `${(ROTULOS_COL[col] || col).toLowerCase()}s`,
        participio: 'excluídos',
    };
    const toast = mostrarAvisoComAcao(`${n} ${info.plural} ${info.participio}`, 'Desfazer', () =>
        _desfazerExclusaoPendente(),
    );
    const timeoutId = setTimeout(_finalizarExclusaoPendente, 6000);
    _pendingExclusao = { removidos, timeoutId, toast };
}
