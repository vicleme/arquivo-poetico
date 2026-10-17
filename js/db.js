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
    CORES_GRUPO_PADRAO,
    chaveTema,
    idiomasDoItem,
    espelhoDeIdiomas,
    normalizarPosturaEstetica,
    normalizarProgramaMovimento,
    POSTURAS_ESTETICAS_RENOMEADAS,
    IDENTIDADES_CIS_TRANS,
    CORES_RACA_AUTOR,
    periodosHistoricosIdsDoItem,
    periodosDaEpocaRetratada,
    periodosBiograficosDoItem,
    definirPeriodosBiograficosDoItem,
    definirCadastroEtiquetas,
} from './utils.js';
import {
    opcoesDeFabricaPeriodoBiografico,
    migrarCamposPeriodoBiografico,
    migrarOpcoesPeriodoBiografico,
    mesclarCamposDosPeriodos,
    mesclarPessoaNosPeriodos,
    removerPessoaDosPeriodos,
    restaurarPessoaNosPeriodos,
} from './periodo-biografico-campos.js';
import {
    opcoesDeFabricaPeriodoHistorico,
    migrarClassificacaoPeriodosHistoricos,
    migrarOpcoesPeriodoHistorico,
    mesclarClassificacaoDosPeriodosHistoricos,
} from './periodos-historicos-campos.js';
import { sincronizarTemas } from './temas.js';
import { sincronizarEtiquetas } from './etiquetas.js';
import { sincronizarTagClusters } from './tag-clusters.js';
import { normalizarRegiao, mesmaRegiao } from './regiao.js';
import { sincronizarLocais } from './locais.js';
import { fontesDeFabricaDaCorrente, normalizarFontes, unirFontes } from './fontes-corrente.js';
import { fontesDeFabricaDoPeriodoHistorico } from './fontes-periodo-historico.js';
import {
    sanearHierarquiaDeCorrentes,
    criaCicloCorrente,
    normalizarDivisaoCorrente,
    normalizarGeneroDivisaoCorrente,
} from './correntes-hierarquia.js';
import {
    sanearHierarquiaDePeriodos,
    mesclarHierarquiaDePeriodos,
    retirarPeriodoDaHierarquia,
    destinoDosFilhosAoExcluir,
    paisDoPeriodo,
    filhosDoPeriodo,
    descendentesDoPeriodo,
} from './periodos-historicos-hierarquia.js';
import { sincronizarPersonagens, calcularImpactoExclusaoPersonagem } from './personagens.js';
import { sincronizarParesIgnorados } from './sugestao-ecos.js';
import { normalizarPadroesColunas } from './colunas.js';
import { aplicarPadroesColunasDeFabrica } from './padroes-colunas-fabrica.js';
import {
    redirecionarAncora,
    removerAncoraDoCadastro,
    restaurarAncoras,
    sincronizarAncorasEco,
} from './ancora-eco.js';
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

// ─── Seed de Movimento/Escola ───────────────────────────────────
// Dado bruto dos 22 movimentos pré-cadastrados (eixo Brasil/Portugal +
// principais influências internacionais no Modernismo), curado em
// sessão com o Victor (27/09/2026 — ver decisoes.md; Pós-modernismo
// incluído em sessão seguinte, sem sucessor cadastrado de propósito;
// Tropicalismo incluído numa terceira sessão, preenchendo o intervalo
// entre Concretismo e Pós-modernismo; Literatura Contemporânea teve
// regiaoOrigem e ini revistos na mesma sessão).
// `ini`/`fim` usam
// a forma compacta [dia, mes, ano, seculo, decada] (todos opcionais,
// `null` onde não se aplica) só pra não repetir 5 chaves por linha
// aqui; `criarMovimentoEscola` abaixo expande pro formato de verdade
// `{ dia, mes, ano, seculo, decada }` (mesmo objeto parcial que
// periodosHistoricos usa, só que com seculo/decada a mais — granularidade
// pedida pelo Victor, já que movimento raramente tem data no dia/mês).
const DADOS_SEED_MOVIMENTOS_ESCOLAS = [
    {
        nome: 'Trovadorismo',
        ini: [null, null, null, 'XII', null],
        fim: [null, null, null, 'XIV', null],
        tipo: 'Artístico',
        posturaEstetica: 'Não se aplica',
        programa: 'Movimento',
        regiaoOrigem: ['Portugal', 'Galiza'],
        valores: ['tradição oral', 'cortesia', 'amor cortês'],
        temas: ['amor não correspondido', 'saudade', 'amizade', 'zombaria'],
        tecnicas: ['refrão', 'paralelismo', 'mote e glosa'],
        tiposComposicao: [
            'cantiga de amor',
            'cantiga de amigo',
            'cantiga de escárnio',
            'cantiga de maldizer',
        ],
        lemas: [],
        manifestos: [],
    },
    {
        nome: 'Humanismo',
        ini: [null, null, null, 'XV', null],
        fim: [null, null, null, 'XV', null],
        tipo: 'Literário',
        posturaEstetica: 'Reformista',
        programa: 'Movimento',
        regiaoOrigem: ['Portugal'],
        valores: ['racionalidade emergente', 'valorização do indivíduo'],
        temas: ['feitos régios', 'moral cortesã'],
        tecnicas: ['prosa cronística', 'diálogo doutrinário'],
        tiposComposicao: ['crônica', 'farsa', 'auto'],
        lemas: [],
        manifestos: [],
    },
    {
        nome: 'Classicismo (Quinhentismo)',
        ini: [null, null, null, 'XVI', 1550],
        fim: [null, null, null, 'XVI', null],
        tipo: 'Literário',
        posturaEstetica: 'Restauradora',
        programa: 'Escola',
        regiaoOrigem: ['Portugal'],
        valores: ['equilíbrio', 'universalismo clássico', 'heroísmo nacional'],
        temas: ['navegação/epopeia', 'amor platônico', 'mitologia'],
        tecnicas: ['métrica clássica (decassílabo)', 'alusão mitológica'],
        tiposComposicao: ['epopeia', 'soneto', 'écloga'],
        lemas: [],
        manifestos: [],
    },
    {
        nome: 'Barroco',
        ini: [null, null, null, 'XVII', 1640],
        fim: [null, null, null, 'XVII', null],
        tipo: 'Artístico',
        posturaEstetica: 'Reformista',
        programa: 'Movimento',
        regiaoOrigem: ['Brasil', 'Portugal'],
        valores: ['conflito fé×razão', 'efemeridade da vida'],
        temas: ['morte', 'pecado e salvação', 'vaidade (vanitas)'],
        tecnicas: [
            'antítese',
            'hipérbato',
            'paradoxo',
            'jogo de contrários (cultismo/conceptismo)',
        ],
        tiposComposicao: ['soneto', 'sermão', 'auto sacramental'],
        lemas: ['Vanitas vanitatum, omnia vanitas'],
        manifestos: [],
    },
    {
        nome: 'Arcadismo (Neoclassicismo)',
        ini: [null, null, null, 'XVIII', 1760],
        fim: [null, null, null, 'XVIII', null],
        tipo: 'Literário',
        posturaEstetica: 'Restauradora',
        programa: 'Escola',
        regiaoOrigem: ['Brasil', 'Portugal'],
        valores: ['simplicidade', 'racionalidade iluminista'],
        temas: ['vida bucólica', 'amor idealizado', 'fuga da cidade'],
        tecnicas: [
            'pseudônimo pastoril (arcádico)',
            'imitação de modelos clássicos (Horácio, Virgílio)',
        ],
        tiposComposicao: ['soneto', 'écloga', 'ode'],
        lemas: [
            'Fugere urbem',
            'Locus amoenus',
            'Inutilia truncat',
            'Aurea mediocritas',
            'Carpe diem',
        ],
        manifestos: [],
    },
    {
        nome: 'Romantismo',
        ini: [null, null, null, 'XIX', 1830],
        fim: [null, null, null, 'XIX', null],
        tipo: 'Artístico',
        posturaEstetica: 'Inovadora',
        programa: 'Movimento',
        regiaoOrigem: ['Brasil', 'Portugal'],
        valores: ['subjetivismo', 'nacionalismo', 'liberdade individual'],
        temas: ['amor idealizado', 'natureza', 'indianismo', 'melancolia'],
        tecnicas: ['primeira pessoa exacerbada', 'hipérbole sentimental'],
        tiposComposicao: ['romance-folhetim', 'poema lírico-narrativo', 'poema indianista'],
        lemas: [],
        manifestos: [],
    },
    {
        nome: 'Romantismo no Brasil',
        pai: 'Romantismo',
        divisao: 'Variante regional',
        ini: [null, null, 1836, 'XIX', null],
        fim: [null, null, 1881, 'XIX', null],
        tipo: 'Literário',
        posturaEstetica: '',
        programa: '',
        regiaoOrigem: ['Brasil'],
        valores: ['nacionalismo', 'identidade nacional', 'subjetivismo'],
        temas: ['natureza', 'indígena como herói', 'pátria', 'amor idealizado', 'abolicionismo'],
        tecnicas: [],
        tiposComposicao: ['poema lírico', 'romance-folhetim', 'drama'],
        lemas: [],
        manifestos: [
            'Ensaio sobre a história da literatura do Brasil (Gonçalves de Magalhães, Niterói, 1836)',
        ],
        notas: 'Marco inicial: Suspiros Poéticos e Saudades e a revista Niterói (Gonçalves de Magalhães, Paris, 1836). Marco final convencional: 1881, com Memórias Póstumas de Brás Cubas (Machado de Assis) e O Mulato (Aluísio Azevedo). As gerações valem só para a poesia; a prosa se organiza em vertentes temáticas.',
    },
    {
        nome: '1ª geração: Indianista (Brasil)',
        pai: 'Romantismo no Brasil',
        divisao: 'Fase ou geração',
        generoDivisao: 'Poesia',
        ini: [null, null, 1836, 'XIX', null],
        fim: [null, null, 1852, 'XIX', null],
        tipo: 'Literário',
        posturaEstetica: '',
        programa: '',
        regiaoOrigem: ['Brasil'],
        valores: ['nacionalismo', 'religiosidade', 'idealização do passado'],
        temas: ['pátria', 'natureza', 'indígena como herói', 'saudade do exílio'],
        tecnicas: [],
        tiposComposicao: ['poema indianista', 'poema épico', 'poema lírico'],
        lemas: [],
        manifestos: [],
        notas: 'Também chamada Nacionalista. Autores de referência: Gonçalves de Magalhães, Gonçalves Dias, Araújo Porto-Alegre.',
    },
    {
        nome: '2ª geração: Ultrarromântica (Brasil)',
        pai: 'Romantismo no Brasil',
        divisao: 'Fase ou geração',
        generoDivisao: 'Poesia',
        ini: [null, null, 1853, 'XIX', null],
        fim: [null, null, 1869, 'XIX', null],
        tipo: 'Literário',
        posturaEstetica: '',
        programa: '',
        regiaoOrigem: ['Brasil'],
        valores: ['egocentrismo', 'pessimismo', 'evasão da realidade'],
        temas: ['morte', 'melancolia', 'amor impossível', 'mulher idealizada'],
        tecnicas: [],
        tiposComposicao: ['poema lírico', 'poema narrativo', 'drama'],
        lemas: [],
        manifestos: [],
        notas: 'Também chamada Mal do Século ou Byroniana. Autores de referência: Álvares de Azevedo, Casimiro de Abreu, Fagundes Varela, Junqueira Freire.',
    },
    {
        nome: '3ª geração: Condoreira (Brasil)',
        pai: 'Romantismo no Brasil',
        divisao: 'Fase ou geração',
        generoDivisao: 'Poesia',
        ini: [null, null, 1870, 'XIX', null],
        fim: [null, null, 1880, 'XIX', null],
        tipo: 'Literário',
        posturaEstetica: '',
        programa: '',
        regiaoOrigem: ['Brasil'],
        valores: ['liberdade', 'justiça social', 'engajamento político'],
        temas: [
            'abolicionismo',
            'República',
            'denúncia social',
            'condor como símbolo de liberdade',
        ],
        tecnicas: ['grandiloquência', 'apóstrofe', 'metáfora grandiosa'],
        tiposComposicao: ['poema social', 'ode', 'poema épico-lírico'],
        lemas: [],
        manifestos: [],
        notas: 'Também chamada Social ou Hugoana (influência de Victor Hugo). Autores de referência: Castro Alves, Tobias Barreto, Pedro Luís. Sousândrade costuma entrar aqui, mas sua obra é singular e começa ultrarromântica; as datas são convenção didática e O Navio Negreiro (1868-69) é anterior a 1870.',
    },
    {
        nome: 'Romance indianista (Brasil)',
        pai: 'Romantismo no Brasil',
        divisao: 'Vertente',
        generoDivisao: 'Prosa',
        ini: [null, null, 1844, 'XIX', null],
        fim: [null, null, 1881, 'XIX', null],
        tipo: 'Literário',
        posturaEstetica: '',
        programa: '',
        regiaoOrigem: ['Brasil'],
        valores: ['nacionalismo', 'idealização do indígena'],
        temas: [
            'indígena como herói',
            'natureza exuberante',
            'encontro entre colonizador e indígena',
        ],
        tecnicas: [],
        tiposComposicao: ['romance'],
        lemas: [],
        manifestos: [],
        notas: 'Autor de referência: José de Alencar (O Guarani, Iracema, Ubirajara). O Guarani às vezes também é lido como romance histórico: as vertentes não são excludentes.',
    },
    {
        nome: 'Romance urbano (Brasil)',
        pai: 'Romantismo no Brasil',
        divisao: 'Vertente',
        generoDivisao: 'Prosa',
        ini: [null, null, 1844, 'XIX', null],
        fim: [null, null, 1881, 'XIX', null],
        tipo: 'Literário',
        posturaEstetica: '',
        programa: '',
        regiaoOrigem: ['Brasil'],
        valores: ['costumes burgueses', 'idealização amorosa'],
        temas: ['bailes', 'casamento', 'intrigas amorosas', 'vida na Corte (Rio de Janeiro)'],
        tecnicas: [],
        tiposComposicao: ['romance', 'romance-folhetim'],
        lemas: [],
        manifestos: [],
        notas: 'Também chamado romance de costumes. Autores de referência: Joaquim Manuel de Macedo (A Moreninha, 1844), José de Alencar (Lucíola, Senhora), Manuel Antônio de Almeida (Memórias de um Sargento de Milícias, que se afasta do tom idealizador).',
    },
    {
        nome: 'Romance regionalista (Brasil)',
        pai: 'Romantismo no Brasil',
        divisao: 'Vertente',
        generoDivisao: 'Prosa',
        ini: [null, null, 1844, 'XIX', null],
        fim: [null, null, 1881, 'XIX', null],
        tipo: 'Literário',
        posturaEstetica: '',
        programa: '',
        regiaoOrigem: ['Brasil'],
        valores: ['nacionalismo', 'cor local'],
        temas: ['sertão', 'costumes do interior', 'falares regionais', 'paisagem das províncias'],
        tecnicas: [],
        tiposComposicao: ['romance'],
        lemas: [],
        manifestos: [],
        notas: 'Autores de referência: José de Alencar (O Gaúcho, O Sertanejo), Bernardo Guimarães (A Escrava Isaura, O Seminarista), Visconde de Taunay (Inocência), Franklin Távora (O Cabeleira).',
    },
    {
        nome: 'Romance histórico (Brasil)',
        pai: 'Romantismo no Brasil',
        divisao: 'Vertente',
        generoDivisao: 'Prosa',
        ini: [null, null, 1844, 'XIX', null],
        fim: [null, null, 1881, 'XIX', null],
        tipo: 'Literário',
        posturaEstetica: '',
        programa: '',
        regiaoOrigem: ['Brasil'],
        valores: ['nacionalismo', 'imaginação romântica'],
        temas: ['episódios do passado nacional', 'lendas heroicas'],
        tecnicas: [],
        tiposComposicao: ['romance'],
        lemas: [],
        manifestos: [],
        notas: 'Autor de referência: José de Alencar (As Minas de Prata, Guerra dos Mascates).',
    },
    {
        nome: 'Romantismo em Portugal',
        pai: 'Romantismo',
        divisao: 'Variante regional',
        ini: [null, null, 1825, 'XIX', null],
        fim: [null, null, 1865, 'XIX', null],
        tipo: 'Literário',
        posturaEstetica: '',
        programa: '',
        regiaoOrigem: ['Portugal'],
        valores: ['liberalismo', 'nacionalismo', 'subjetivismo'],
        temas: ['história medieval portuguesa', 'identidade nacional', 'paixão', 'melancolia'],
        tecnicas: [],
        tiposComposicao: [
            'poema lírico-narrativo',
            'romance histórico',
            'drama',
            'novela passional',
        ],
        lemas: [],
        manifestos: [],
        notas: 'Marco inicial: o poema Camões, de Almeida Garrett (1825). Marco final convencional: a Questão Coimbrã (1865), que abre caminho ao Realismo.',
    },
    {
        nome: '1ª geração: Liberal e nacionalista (Portugal)',
        pai: 'Romantismo em Portugal',
        divisao: 'Fase ou geração',
        ini: [null, null, 1825, 'XIX', null],
        fim: [null, null, 1840, 'XIX', null],
        tipo: 'Literário',
        posturaEstetica: '',
        programa: '',
        regiaoOrigem: ['Portugal'],
        valores: ['liberalismo', 'nacionalismo', 'resgate do passado'],
        temas: ['história medieval', 'mitos nacionais', 'identidade portuguesa'],
        tecnicas: [],
        tiposComposicao: ['poema lírico-narrativo', 'romance histórico', 'drama histórico'],
        lemas: [],
        manifestos: [],
        notas: 'Autores de referência: Almeida Garrett (Camões; Viagens na Minha Terra), Alexandre Herculano (A Voz do Profeta; Eurico, o Presbítero). Algumas fontes fecham a fase em 1838.',
    },
    {
        nome: '2ª geração: Ultrarromântica (Portugal)',
        pai: 'Romantismo em Portugal',
        divisao: 'Fase ou geração',
        ini: [null, null, 1840, 'XIX', null],
        fim: [null, null, 1860, 'XIX', null],
        tipo: 'Literário',
        posturaEstetica: '',
        programa: '',
        regiaoOrigem: ['Portugal'],
        valores: ['sentimentalismo exagerado', 'pessimismo'],
        temas: ['morte', 'melancolia', 'paixão trágica'],
        tecnicas: [],
        tiposComposicao: ['poema lírico', 'novela passional', 'melodrama'],
        lemas: [],
        manifestos: [],
        notas: 'Também chamada Mal do Século. Autores de referência: Camilo Castelo Branco (Amor de Perdição), Soares de Passos (O Noivado do Sepulcro).',
    },
    {
        nome: '3ª geração: Renovação romântica (Portugal)',
        pai: 'Romantismo em Portugal',
        divisao: 'Fase ou geração',
        ini: [null, null, 1860, 'XIX', null],
        fim: [null, null, 1865, 'XIX', null],
        tipo: 'Literário',
        posturaEstetica: '',
        programa: '',
        regiaoOrigem: ['Portugal'],
        valores: ['equilíbrio', 'atenção à realidade social'],
        temas: ['vida campesina', 'costumes', 'realidade social'],
        tecnicas: [],
        tiposComposicao: ['romance campesino', 'poema lírico'],
        lemas: [],
        manifestos: [],
        notas: 'Fase de transição que anuncia o Realismo (também chamada Pré-Realismo). Autores de referência: Júlio Dinis (A Morgada dos Canaviais), João de Deus (Flores do Campo), Tomás Ribeiro. Muitos manuais estendem a fase até c. 1870 (Júlio Dinis morre em 1871).',
    },
    {
        nome: 'Romance histórico (Portugal)',
        pai: 'Romantismo em Portugal',
        divisao: 'Vertente',
        generoDivisao: 'Prosa',
        ini: [null, null, 1843, 'XIX', null],
        fim: [null, null, 1865, 'XIX', null],
        tipo: 'Literário',
        posturaEstetica: '',
        programa: '',
        regiaoOrigem: ['Portugal'],
        valores: ['nacionalismo', 'medievalismo', 'rigor histórico'],
        temas: ['Idade Média portuguesa', 'origens da nação', 'lendas e narrativas'],
        tecnicas: [],
        tiposComposicao: ['romance histórico', 'lenda', 'narrativa'],
        lemas: [],
        manifestos: [],
        notas: 'Introduzido por Alexandre Herculano (Eurico, o Presbítero, 1844; Lendas e Narrativas, 1851), sob influência de Walter Scott. Datas aproximadas: o recorte é o da prosa romântica portuguesa, que as fontes fazem começar em torno de 1843.',
    },
    {
        nome: 'Romance de costumes (Portugal)',
        pai: 'Romantismo em Portugal',
        divisao: 'Vertente',
        generoDivisao: 'Prosa',
        ini: [null, null, 1843, 'XIX', null],
        fim: [null, null, 1865, 'XIX', null],
        tipo: 'Literário',
        posturaEstetica: '',
        programa: '',
        regiaoOrigem: ['Portugal'],
        valores: ['subjetivismo', 'ironia', 'atualidade'],
        temas: ['viagem', 'sociedade contemporânea', 'digressão do narrador'],
        tecnicas: ['digressão', 'conversa com o leitor'],
        tiposComposicao: ['narrativa de viagem', 'romance-folhetim'],
        lemas: [],
        manifestos: [],
        notas: 'Almeida Garrett, Viagens na Minha Terra (folhetim de 1843 a 1846): narrativa de atualidade, de forma livre, que mistura viagem, digressão e ficção. Obra híbrida, também lida como marco da prosa romântica portuguesa.',
    },
    {
        nome: 'Novela passional (Portugal)',
        pai: 'Romantismo em Portugal',
        divisao: 'Vertente',
        generoDivisao: 'Prosa',
        ini: [null, null, 1843, 'XIX', null],
        fim: [null, null, 1865, 'XIX', null],
        tipo: 'Literário',
        posturaEstetica: '',
        programa: '',
        regiaoOrigem: ['Portugal'],
        valores: ['sentimentalismo', 'ultrarromantismo'],
        temas: ['amor proibido', 'paixão trágica', 'morte'],
        tecnicas: [],
        tiposComposicao: ['novela', 'melodrama'],
        lemas: [],
        manifestos: [],
        notas: 'Camilo Castelo Branco, com Amor de Perdição (1862) como obra mais famosa. Corresponde à prosa da 2ª geração (Ultrarromântica).',
    },
    {
        nome: 'Romance campesino (Portugal)',
        pai: 'Romantismo em Portugal',
        divisao: 'Vertente',
        generoDivisao: 'Prosa',
        ini: [null, null, 1843, 'XIX', null],
        fim: [null, null, 1865, 'XIX', null],
        tipo: 'Literário',
        posturaEstetica: '',
        programa: '',
        regiaoOrigem: ['Portugal'],
        valores: ['moralização dos costumes', 'bondade humana', 'equilíbrio'],
        temas: ['vida na aldeia', 'costumes rurais', 'tipos populares'],
        tecnicas: [],
        tiposComposicao: ['romance'],
        lemas: [],
        manifestos: [],
        notas: 'Júlio Dinis (As Pupilas do Senhor Reitor, 1866, em folhetim). É obra de transição para o Realismo e corresponde à prosa da 3ª geração. Como Júlio Dinis publica depois de 1865, o período do pai é só convenção; edite as datas se preferir.',
    },
    {
        nome: 'Realismo',
        ini: [null, null, null, 'XIX', 1870],
        fim: [null, null, null, 'XIX', null],
        tipo: 'Literário',
        posturaEstetica: 'Reformista',
        programa: 'Movimento',
        regiaoOrigem: ['Brasil', 'Portugal'],
        valores: ['objetividade', 'crítica social'],
        temas: ['adultério', 'hipocrisia burguesa', 'decadência moral'],
        tecnicas: ['narrador crítico/irônico', 'análise psicológica', 'digressão ensaística'],
        tiposComposicao: ['romance urbano', 'conto'],
        lemas: [],
        manifestos: [],
    },
    {
        nome: 'Naturalismo',
        ini: [null, null, null, 'XIX', 1880],
        fim: [null, null, null, 'XIX', null],
        tipo: 'Literário',
        posturaEstetica: 'Reformista',
        programa: 'Escola',
        regiaoOrigem: ['Brasil', 'Portugal'],
        valores: ['determinismo', 'cientificismo', 'denúncia social'],
        temas: ['exclusão social', 'doença/degeneração', 'instinto'],
        tecnicas: ['descrição cientificista', 'zoomorfização'],
        tiposComposicao: ['romance de tese'],
        lemas: [],
        manifestos: [],
    },
    {
        nome: 'Parnasianismo',
        ini: [null, null, null, 'XIX', 1880],
        fim: [null, null, null, 'XIX', null],
        tipo: 'Literário',
        posturaEstetica: 'Restauradora',
        programa: 'Escola',
        regiaoOrigem: ['Brasil'],
        valores: ['impessoalidade', 'culto à forma'],
        temas: ['beleza plástica', 'mitologia clássica', 'o fazer poético'],
        tecnicas: ['rigor métrico', 'rima rica', 'busca da forma fixa'],
        tiposComposicao: ['soneto'],
        lemas: ['Arte pela arte'],
        manifestos: [],
    },
    {
        nome: 'Simbolismo',
        ini: [null, null, null, 'XIX', 1890],
        fim: [null, null, null, 'XIX', null],
        tipo: 'Artístico',
        posturaEstetica: 'Reformista',
        programa: 'Movimento',
        regiaoOrigem: ['Brasil', 'Portugal'],
        valores: ['musicalidade', 'subjetividade', 'misticismo'],
        temas: ['morte', 'transcendência', 'o inefável'],
        tecnicas: ['sinestesia', 'sugestão em vez de descrição', 'musicalidade sonora'],
        tiposComposicao: ['soneto', 'poema em prosa'],
        lemas: [],
        manifestos: ['Manifesto Simbolista (Jean Moréas, 1886, França)'],
    },
    {
        nome: 'Pré-Modernismo',
        ini: [null, null, null, 'XX', 1910],
        fim: [null, null, null, 'XX', null],
        tipo: 'Literário',
        posturaEstetica: 'Reformista',
        programa: 'Tendência',
        regiaoOrigem: ['Brasil'],
        valores: ['crítica social', 'hibridismo estético'],
        temas: ['exclusão/marginalidade', 'sertão e litoral'],
        tecnicas: ['hibridismo de registro (culto/coloquial)'],
        tiposComposicao: ['romance urbano', 'conto'],
        lemas: [],
        manifestos: [],
    },
    {
        nome: 'Futurismo',
        ini: [null, null, null, 'XX', 1910],
        fim: [null, null, null, 'XX', null],
        tipo: 'Artístico',
        posturaEstetica: 'Iconoclasta',
        programa: 'Vanguarda',
        regiaoOrigem: ['Itália'],
        valores: ['culto à velocidade', 'ruptura com o passado'],
        temas: ['guerra', 'tecnologia', 'cidade moderna'],
        tecnicas: ['palavras em liberdade', 'ruptura sintática', 'tipografia expressiva'],
        tiposComposicao: ['manifesto', 'poema-cartaz'],
        lemas: ['Parole in libertà'],
        manifestos: ['Manifesto Futurista (Marinetti, 1909)'],
    },
    {
        nome: 'Expressionismo',
        ini: [null, null, null, 'XX', 1910],
        fim: [null, null, null, 'XX', null],
        tipo: 'Artístico',
        posturaEstetica: 'Iconoclasta',
        programa: 'Vanguarda',
        regiaoOrigem: ['Alemanha'],
        valores: ['subjetividade extrema', 'angústia existencial'],
        temas: ['alienação', 'guerra', 'opressão urbana'],
        tecnicas: ['distorção grotesca', 'linguagem fragmentada'],
        tiposComposicao: ['drama expressionista', 'poema em prosa'],
        lemas: [],
        manifestos: [],
    },
    {
        nome: 'Cubismo literário',
        ini: [null, null, null, 'XX', 1910],
        fim: [null, null, null, 'XX', null],
        tipo: 'Artístico',
        posturaEstetica: 'Iconoclasta',
        programa: 'Vanguarda',
        regiaoOrigem: ['França'],
        valores: ['simultaneidade', 'multiplicidade de perspectivas'],
        temas: ['vida moderna urbana', 'fragmentação da experiência'],
        tecnicas: ['simultaneísmo', 'justaposição sem conectivos'],
        tiposComposicao: ['caligrama', 'poema-colagem'],
        lemas: [],
        manifestos: [],
    },
    {
        nome: 'Dadaísmo',
        ini: [null, null, null, 'XX', 1916],
        fim: [null, null, null, 'XX', null],
        tipo: 'Artístico',
        posturaEstetica: 'Iconoclasta',
        programa: 'Vanguarda',
        regiaoOrigem: ['Suíça', 'Europa'],
        valores: ['antiarte', 'acaso', 'negação da lógica'],
        temas: ['absurdo da guerra', 'falência da razão burguesa'],
        tecnicas: ['colagem', 'acaso (cadavre exquis)', 'corte-e-recombinação de palavras'],
        tiposComposicao: ['poema-colagem', 'manifesto-dadá'],
        lemas: ['Dada não significa nada'],
        manifestos: ['Manifesto Dadá (Tristan Tzara, 1918)'],
    },
    {
        nome: 'Modernismo',
        ini: [null, null, null, 'XX', 1922],
        fim: [null, null, null, 'XX', null],
        tipo: 'Artístico',
        posturaEstetica: 'Inovadora',
        programa: 'Movimento',
        regiaoOrigem: ['Brasil'],
        valores: ['ruptura formal', 'nacionalismo crítico', 'liberdade de expressão'],
        temas: ['identidade nacional', 'cotidiano urbano', 'crítica ao passadismo'],
        tecnicas: ['verso livre', 'coloquialidade', 'paródia/humor'],
        tiposComposicao: ['manifesto', 'poema-piada', 'crônica modernista'],
        lemas: ['Tupy, or not tupy, that is the question'],
        manifestos: ['Manifesto da Poesia Pau-Brasil (1924)', 'Manifesto Antropófago (1928)'],
    },
    {
        nome: 'Surrealismo',
        ini: [null, null, null, 'XX', 1924],
        fim: [null, null, null, 'XX', null],
        tipo: 'Artístico',
        posturaEstetica: 'Iconoclasta',
        programa: 'Vanguarda',
        regiaoOrigem: ['França'],
        valores: ['automatismo psíquico', 'valorização do inconsciente'],
        temas: ['sonho', 'desejo', 'o maravilhoso cotidiano'],
        tecnicas: ['escrita automática', 'justaposição onírica', 'associação livre de imagens'],
        tiposComposicao: ['poema em prosa', 'manifesto'],
        lemas: [],
        manifestos: ['Manifesto do Surrealismo (André Breton, 1924)'],
    },
    {
        nome: 'Geração de 45',
        ini: [null, null, null, 'XX', 1945],
        fim: [null, null, null, 'XX', null],
        tipo: 'Literário',
        posturaEstetica: 'Restauradora',
        programa: 'Grupo/Círculo',
        regiaoOrigem: ['Brasil'],
        valores: ['retorno ao rigor formal', 'equilíbrio tradição/modernidade'],
        temas: ['intimismo', 'universalismo'],
        tecnicas: ['metrificação recuperada', 'economia verbal', 'precisão lexical'],
        tiposComposicao: ['soneto retomado', 'poema curto de rigor formal'],
        lemas: [],
        manifestos: [],
    },
    {
        nome: 'Concretismo',
        ini: [null, null, null, 'XX', 1956],
        fim: [null, null, null, 'XX', null],
        tipo: 'Artístico',
        posturaEstetica: 'Iconoclasta',
        programa: 'Vanguarda',
        regiaoOrigem: ['Brasil'],
        valores: ['síntese', 'economia verbal radical', 'palavra como objeto'],
        temas: ['linguagem e forma como próprio conteúdo'],
        tecnicas: [
            'disposição gráfico-espacial da palavra',
            'uso do espaço em branco como elemento sintático',
            'verbivocovisualidade',
        ],
        tiposComposicao: ['poema-objeto', 'poema visual'],
        lemas: [],
        manifestos: [
            'Plano-piloto para poesia concreta (1958, Grupo Noigandres — Haroldo de Campos, Augusto de Campos, Décio Pignatari)',
        ],
    },
    {
        // Preenchendo o intervalo entre Concretismo (1956) e Pós-modernismo
        // (1970), lacuna notada pelo Victor em 27/09/2026: entre Poesia
        // Práxis, Tropicalismo e Beat Generation, escolhido o Tropicalismo
        // por ser o mais reconhecível pra quem não é especialista em
        // vanguarda (mesmo critério de "amplamente conhecido", não "achado
        // de nicho", que orienta o resto da lista).
        nome: 'Tropicalismo',
        ini: [null, null, null, 'XX', 1967],
        fim: [null, null, null, 'XX', null],
        tipo: 'Artístico',
        posturaEstetica: 'Eclética',
        programa: 'Movimento',
        regiaoOrigem: ['Brasil'],
        valores: ['antropofagia cultural', 'mistura de erudito e popular', 'experimentalismo'],
        temas: [
            'identidade nacional',
            'consumo e modernização',
            'colagem entre tradição e vanguarda',
        ],
        tecnicas: ['colagem', 'letra-manifesto', 'justaposição de linguagens (popular/erudito)'],
        tiposComposicao: ['letra de canção-manifesto', 'poema-colagem'],
        lemas: [],
        manifestos: ['Álbum "Tropicália ou Panis et Circensis" (1968, vários artistas)'],
    },
    {
        // Sem sucessor pré-cadastrado de propósito (decisão de 27/09/2026):
        // o termo pro que vem depois (metamodernismo, pós-pós-modernismo
        // etc.) ainda está em debate acadêmico sem consenso — o Victor
        // cadastra manualmente se/quando um nome se consolidar, em vez de
        // forçar uma resposta aqui.
        nome: 'Pós-modernismo',
        ini: [null, null, null, 'XX', 1970],
        fim: [null, null, null, null, null],
        tipo: 'Literário',
        posturaEstetica: 'Eclética',
        programa: 'Tendência',
        regiaoOrigem: ['Internacional'],
        valores: ['ceticismo às metanarrativas', 'pluralidade de vozes', 'ironia'],
        temas: ['simulacro', 'crise de identidade', 'paródia da tradição'],
        tecnicas: [
            'metaficção',
            'pastiche',
            'intertextualidade paródica',
            'fragmentação narrativa',
        ],
        tiposComposicao: ['metapoema', 'poema-colagem', 'prosa fragmentária'],
        lemas: [],
        manifestos: ['A Condição Pós-Moderna (Jean-François Lyotard, 1979)'],
    },
    {
        // regiaoOrigem e ini ajustados em 27/09/2026 (decisão do Victor):
        // 'Internacional' pra ficar coerente com o Pós-modernismo (mesmo
        // tipo de rótulo amplo, não periodização lusófona) e não com o
        // eixo Brasil/Portugal que o resto da lista segue; início movido
        // de "século XX" (impreciso, incluiria até 1901) pra década de
        // 1990, âncora que já bate com o que os próprios `temas`/
        // `tiposComposicao` abaixo descrevem (cotidiano digital, poema-
        // vídeo) e evita colidir com a Geração de 45 (1945), que também
        // usa a "queda das metanarrativas do pós-guerra" como marco.
        nome: 'Literatura Contemporânea',
        ini: [null, null, null, 'XX', 1990],
        fim: [null, null, null, 'XXI', null],
        tipo: 'Literário',
        posturaEstetica: 'Não se aplica',
        programa: 'Tendência',
        regiaoOrigem: ['Internacional'],
        valores: ['pluralidade', 'hibridismo', 'ausência de escola dominante'],
        temas: ['identidade', 'memória', 'corpo', 'tecnologia e cotidiano digital'],
        tecnicas: [
            'hibridismo de linguagens/mídias',
            'intertextualidade explícita',
            'fragmentação narrativa',
        ],
        tiposComposicao: ['crônica', 'poema-vídeo', 'romance híbrido/autoficção'],
        lemas: [],
        manifestos: [],
    },
];

function _dataParcialDoSeed([dia, mes, ano, seculo, decada]) {
    return { dia, mes, ano, seculo, decada };
}

// ─── Seed de Período Histórico ──────────────────────────────────
// Diferente de Movimento/Escola (catálogo de escolas literárias),
// Período Histórico nasceu como cadastro 100% livre do usuário — sem
// seed nenhum (ver conversa-referencia.md, pedido do Victor em
// 28/09/2026). Estes 12 são eventos/períodos de relevância ampla e
// internacional pra literatura em geral, mesmo espírito educativo do
// seed de Movimento/Escola, mas sem se limitar ao eixo Brasil/Portugal
// (decisão do Victor: "mais amplo/internacional"). `ini`/`fim` usam a
// forma compacta [dia, mes, ano] (`null` onde não se aplica) — mesma
// razão de DADOS_SEED_MOVIMENTOS_ESCOLAS, só sem seculo/decada porque o
// schema de Período Histórico não tem essa granularidade (ver
// conversa-referencia.md: seria uma mudança de schema equivalente à de
// Movimento/Escola, fora de escopo aqui). Datas com só ano (sem dia/mês)
// são aproximações deliberadas de processos históricos sem um marco
// diário exato (Renascimento, Iluminismo, Guerra Fria etc.) — a nota de
// cada item deixa isso explícito. Ordem: cronológica pelo início.
// `regiao` (texto livre, mesmo vocabulário de regiaoOrigem em Movimento/
// Escola: 'Brasil', 'Europa', 'Internacional' pra o que não tem um lugar
// só) diz ONDE o período aconteceu/teve alcance — por isso não se chama
// `regiaoOrigem`: Guerra Fria e Covid-19 não têm origem, têm abrangência.
const DADOS_SEED_PERIODOS_HISTORICOS = [
    {
        nome: 'Renascimento',
        regiao: ['Europa'],
        ini: [null, null, 1400],
        iniAprox: true,
        fim: [null, null, 1600],
        fimAprox: true,
        notas: 'Movimento cultural e artístico europeu de resgate dos clássicos greco-latinos e do antropocentrismo, entre a Idade Média e a Idade Moderna — datas aproximadas (varia por região). Pano de fundo do Humanismo e do Classicismo/Quinhentismo português (Camões), já cadastrados em Correntes literárias.',
    },
    {
        nome: 'Iluminismo',
        regiao: ['Europa'],
        ini: [null, null, 1715],
        fim: [null, null, 1789],
        notas: 'Movimento filosófico europeu de valorização da razão e da crítica ao Antigo Regime, do auge no século XVIII até a Revolução Francesa. Pano de fundo do Arcadismo (Neoclassicismo), já cadastrado em Correntes literárias.',
    },
    {
        nome: 'Primeira Revolução Industrial',
        regiao: ['Inglaterra', 'Europa', 'América do Norte'],
        ini: [null, null, 1760],
        iniAprox: true,
        fim: [null, null, 1840],
        fimAprox: true,
        notas: 'Mecanização e urbanização aceleradas, a partir da Inglaterra — pano de fundo econômico e social mais amplo das tensões depois retratadas pelo Realismo/Naturalismo. As datas são as convencionais.',
    },
    {
        nome: 'Revolução Francesa',
        regiao: ['França'],
        ini: [14, 7, 1789],
        fim: [null, null, 1799],
        notas: 'Marco simbólico do fim do Antigo Regime, do 14/07 (Queda da Bastilha) ao Golpe do 18 de Brumário — alimenta o culto à liberdade individual e o nacionalismo que o Romantismo herda.',
    },
    {
        nome: 'Segunda Revolução Industrial',
        regiao: ['Europa', 'América do Norte', 'Ásia Oriental'],
        ini: [null, null, 1870],
        iniAprox: true,
        fim: [null, null, 1914],
        fimAprox: true,
        notas: 'Eletricidade, aço, química e produção em massa, com a industrialização se espalhando para além da Inglaterra (Alemanha, Estados Unidos, Japão). As datas são as convencionais.',
    },
    {
        nome: 'Belle Époque',
        regiao: ['Europa'],
        ini: [null, null, 1871],
        fim: [null, null, 1914],
        notas: 'Otimismo e efervescência cultural na Europa, entre a Guerra Franco-Prussiana e a Primeira Guerra Mundial — pano de fundo do Parnasianismo e do Simbolismo, já cadastrados em Correntes literárias.',
    },
    {
        nome: 'Primeira Guerra Mundial',
        regiao: ['Internacional'],
        ini: [28, 7, 1914],
        fim: [11, 11, 1918],
        notas: 'Encerra a Belle Époque e alimenta o desencanto e a ruptura formal que antecedem o Modernismo.',
    },
    {
        nome: 'Semana de Arte Moderna',
        regiao: ['Brasil'],
        evento: true,
        ini: [11, 2, 1922],
        fim: [18, 2, 1922],
        notas: 'Theatro Municipal de São Paulo, sessões principais em 13, 15 e 17/02 — marco do início do Modernismo brasileiro, já cadastrado em Correntes literárias com a mesma âncora de 1922.',
    },
    {
        nome: 'Segunda Guerra Mundial',
        regiao: ['Internacional'],
        ini: [1, 9, 1939],
        fim: [2, 9, 1945],
        notas: 'Reconfigura a ordem internacional — pano de fundo da literatura de testemunho e da reflexão sobre a barbárie no pós-guerra.',
    },
    {
        nome: 'Estado Novo (Portugal)',
        regiao: ['Portugal'],
        ini: [null, null, 1933],
        fim: [25, 4, 1974],
        notas: 'Ditadura salazarista/marcelista, encerrada pela Revolução dos Cravos (25/04) — pano de fundo da censura e da poesia/prosa de intervenção em Portugal.',
    },
    {
        nome: 'Ditadura Militar Brasileira',
        regiao: ['Brasil'],
        ini: [31, 3, 1964],
        fim: [null, null, 1985],
        notas: 'Regime militar no Brasil — pano de fundo da poesia marginal, da MPB de protesto e da literatura de resistência e censura.',
    },
    {
        nome: 'Guerra Fria',
        regiao: ['Internacional'],
        ini: [null, null, 1947],
        fim: [null, null, 1991],
        notas: 'Disputa geopolítica EUA–URSS que atravessa boa parte do século XX — pano de fundo mais amplo das ditaduras latino-americanas, da Guerra Colonial Portuguesa e do "boom" da literatura latino-americana.',
    },
    {
        nome: 'Terceira Revolução Industrial (Era da Informação)',
        regiao: ['Internacional'],
        ini: [null, null, 1950],
        iniAprox: true,
        fim: [null, null, 2000],
        fimAprox: true,
        notas: 'Eletrônica, computação, telecomunicações e automação, dos transistores e computadores do pós-guerra à popularização da internet — pano de fundo da cultura digital e das novas formas de circulação da escrita. As datas são as convencionais e variam conforme o autor; a passagem para a Quarta Revolução Industrial não tem marco único.',
    },
    {
        nome: 'Nova República',
        regiao: ['Brasil'],
        ini: [15, 3, 1985],
        fim: [null, null, null],
        notas: 'Período democrático brasileiro que sucede a ditadura militar, iniciado com a posse de José Sarney em 15/03/1985 e ainda em curso.',
    },
    {
        nome: 'Quarta Revolução Industrial (Indústria 4.0)',
        regiao: ['Internacional'],
        ini: [null, null, 2011],
        iniAprox: true,
        fim: [null, null, null],
        notas: 'Integração de sistemas ciberfísicos, internet das coisas, inteligência artificial e dados em larga escala — o termo "Indústria 4.0" surge em 2011 (feira de Hannover) e "Quarta Revolução Industrial" foi popularizado por Klaus Schwab, em 2016. Ainda em curso; o início é convencional.',
    },
    {
        nome: 'Pandemia de Covid-19',
        regiao: ['Internacional'],
        ini: [11, 3, 2020],
        fim: [5, 5, 2023],
        notas: 'Emergência sanitária global — a OMS caracteriza como pandemia em 11/03/2020 e declara o fim da emergência em 05/05/2023. Pano de fundo de uma leva recente de literatura de isolamento e luto coletivo.',
    },
];

// Só os subcampos de fato preenchidos (mesmo contrato de retorno de
// lerDataParcial em utils.js: undefined vira ausente, nunca `null`
// explícito por chave) — diferente de _dataParcialDoSeed (Movimento/
// Escola), que sempre grava as 5 chaves porque esse schema tem
// seculo/decada. Período Histórico não tem essas duas, então uma data
// só-ano fica `{ ano }`, não `{ dia: null, mes: null, ano }` — bate com
// o que um cadastro feito à mão pelo próprio usuário produziria.
function _dataParcialPeriodoHistoricoDoSeed([dia, mes, ano], aprox = false) {
    const obj = {};
    if (dia != null) obj.dia = dia;
    if (mes != null) obj.mes = mes;
    if (ano != null) obj.ano = ano;
    if (!Object.keys(obj).length) return null;
    // `aprox` ("c."): marca da data, não do ano — o número segue exato.
    if (aprox) obj.aprox = true;
    return obj;
}

// Mesmo espírito de SEED_MOVIMENTOS_ESCOLAS logo acima — chamada só no
// momento de semear, nunca guardada pronta, pra cada instalação ganhar
// ids próprios.
function SEED_PERIODOS_HISTORICOS() {
    return DADOS_SEED_PERIODOS_HISTORICOS.map((p) => ({
        id: gerarId(),
        nome: p.nome,
        embutido: true,
        notas: p.notas,
        regiao: normalizarRegiao(p.regiao),
        inicio: _dataParcialPeriodoHistoricoDoSeed(p.ini, p.iniAprox),
        fim: _dataParcialPeriodoHistoricoDoSeed(p.fim, p.fimAprox),
        fontes: fontesDeFabricaDoPeriodoHistorico(p.nome),
        ...(p.evento ? { evento: true } : {}),
    }));
}

// Expande DADOS_SEED_MOVIMENTOS_ESCOLAS pro formato de registro de
// verdade, com id gerado e todos os campos array garantidos (nunca
// undefined) — chamada só no momento de semear (primeiro load ou
// import de backup antigo sem o campo), nunca guardada como constante
// pronta, pra cada instalação ganhar ids próprios (mesmo espírito de
// qualquer outro dado que passa por gerarId()).
const POSTURA_ESTETICA_DO_SEED = new Map(
    DADOS_SEED_MOVIMENTOS_ESCOLAS.map((m) => [m.nome, m.posturaEstetica || '']),
);

const PROGRAMA_DO_SEED = new Map(
    DADOS_SEED_MOVIMENTOS_ESCOLAS.map((m) => [m.nome, m.programa || '']),
);

// Registro de verdade a partir de uma linha do seed. `pai` (nome, só nas
// divisões) é resolvido contra `lista`: o pai precisa já estar nela. Sem pai
// achado (excluído de propósito, por exemplo) a divisão vira corrente de topo.
function _registroDeMovimentoDoSeed(modelo, lista) {
    const pai = modelo.pai ? lista.find((m) => m.nome === modelo.pai) : null;
    return {
        id: gerarId(),
        nome: modelo.nome,
        embutido: true,
        notas: modelo.notas || '',
        inicio: _dataParcialDoSeed(modelo.ini),
        fim: _dataParcialDoSeed(modelo.fim),
        tipo: modelo.tipo,
        posturaEstetica: normalizarPosturaEstetica(modelo.posturaEstetica),
        programa: normalizarProgramaMovimento(modelo.programa),
        paiId: pai ? pai.id : null,
        divisao: pai ? normalizarDivisaoCorrente(modelo.divisao) : '',
        generoDivisao: pai ? normalizarGeneroDivisaoCorrente(modelo.generoDivisao) : '',
        regiaoOrigem: normalizarRegiao(modelo.regiaoOrigem),
        valores: [...modelo.valores],
        temas: [...modelo.temas],
        tecnicas: [...modelo.tecnicas],
        tiposComposicao: [...modelo.tiposComposicao],
        lemas: [...modelo.lemas],
        manifestos: [...modelo.manifestos],
        fontes: fontesDeFabricaDaCorrente(modelo.nome),
    };
}

function SEED_MOVIMENTOS_ESCOLAS() {
    const lista = [];
    DADOS_SEED_MOVIMENTOS_ESCOLAS.forEach((m) => lista.push(_registroDeMovimentoDoSeed(m, lista)));
    return lista;
}

// ─── Seed de Temas e Assuntos ───────────────────────────────────
// Amostra pra quem abre o app pela primeira vez ver e entender a proposta
// (pedido do Victor, 30/09/2026): 9 Assuntos amplos agrupando ~44 Temas
// de alcance geral (recorte da lista do próprio Victor, tirando o que é
// pessoal ou de contexto/geração). "Machismo" está em dois Assuntos de
// propósito, pra mostrar o N:N. Lugares ficam de fora: são da
// Territorialidade (Sinalizações), não do Tema.
//
// Diferente de Movimento/Escola e Períodos Históricos, aqui NÃO há flag
// `embutido` nem migração aditiva: os registros são comuns (renomear,
// editar e excluir valem, e o que a pessoa exclui não volta). O seed só
// roda em instalação nova (sem nada salvo no navegador); instalação
// existente e backup importado nunca o recebem.
const DADOS_SEED_ASSUNTOS_E_TEMAS = [
    [
        'Identidade e Autoconhecimento',
        [
            'Autorrepresentação',
            'Mudança pessoal',
            'Pertencimento',
            'Multiplicidade identitária',
            'Busca pela verdade/autenticidade',
        ],
    ],
    [
        'Vida emocional',
        [
            'Resiliência emocional',
            'Aceitação da imperfeição',
            'Autoacolhimento',
            'Esgotamento/burnout',
            'Escapismo',
            'Ruminação mental',
        ],
    ],
    [
        'Relações e vínculos',
        [
            'Confiança interpessoal',
            'Empatia social',
            'Cuidado interpessoal',
            'Isolamento',
            'Paixão/desejo romântico',
            'Impermanência amorosa',
        ],
    ],
    [
        'Tempo, memória e perda',
        ['Luto/Finitude', 'Saudade', 'Despedida', 'Memória', 'Efemeridade', 'Cotidiano'],
    ],
    [
        'Sociedade e política',
        [
            'Crítica político-social',
            'Desigualdade social/Pobreza',
            'Violência',
            'Polarização',
            'Sistema educacional',
        ],
    ],
    [
        'Corpo, gênero e sexualidade',
        ['Machismo', 'Pressão estética', 'Autonomia corporal', 'Corporeidade', 'Objetificação'],
    ],
    ['Discriminação', ['Machismo', 'LGBTfobia', 'Culpabilização da vítima']],
    [
        'Modernidade, tecnologia e consumo',
        [
            'Modernidade líquida',
            'Tecnologia',
            'Descartabilidade/Consumismo',
            'Crítica ao materialismo',
            'Infodemia',
        ],
    ],
    [
        'Arte, cultura e escrita',
        [
            'Crítica Cultural',
            'Literatura/Escrita terapêutica',
            'Função social da arte',
            'Contracultura',
        ],
    ],
];

// Expande os dados acima em `{ temas, assuntos }` com ids gerados na hora
// (cada instalação ganha ids próprios). Um Tema em vários Assuntos vira um
// só registro, casado por `chaveTema` (sem caixa/acento).
export function semearTemasEAssuntos() {
    const temas = [];
    const idPorChave = new Map();
    const assuntos = DADOS_SEED_ASSUNTOS_E_TEMAS.map(([nome, nomesTemas]) => ({
        id: gerarId(),
        nome,
        notas: '',
        temaIds: nomesTemas.map((nomeTema) => {
            const chave = chaveTema(nomeTema);
            if (!idPorChave.has(chave)) {
                const id = gerarId();
                idPorChave.set(chave, id);
                temas.push({ id, nome: nomeTema, notas: '' });
            }
            return idPorChave.get(chave);
        }),
    }));
    return { temas, assuntos };
}

// Instalação nova = nada salvo ainda no navegador (ver semearTemasEAssuntos).
const _instalacaoNova = !JSON.parse(localStorage.getItem(DB_KEY));

export let db = JSON.parse(localStorage.getItem(DB_KEY)) || {
    livros: [],
    partes: [],
    secoes: [],
    poemas: [],
    prosas: [],
    elementos: [],
    coletaneas: [], // legado, não usado pela aba Coletâneas atual — mantido só por compatibilidade na importação de backups antigos
    itensColetanea: [], // itens de Coletânea de fato (ver coletaneas.js); cada item referencia uma Parte via parteId
    pessoas: [], // cadastro central de Pessoas ({ id, nome, grupoIds, autorIds, oculto }) — ver migrarPessoasParaCadastro/migrarPessoasAutorIds/migrarPessoasOculto
    grupos: [], // cadastro central de Grupos ({ id, nome, oculto }) — quem uma Pessoa é na vida de quem escreve, constante entre poemas
    autores: [], // cadastro central de Autores ({ id, nome, sobre }) — quem escreveu o item, ver migrarAutoria
    epocas: [], // cadastro central de Período Biográfico (rótulo na interface; nome interno "epocas" mantido por compatibilidade — { id, nome, notas }) — a que período pessoal um poema se refere, ver migrarEpocas
    // cadastro central de Período Histórico ({ id, nome, notas, regiao,
    // inicio, fim, embutido? }) — período histórico (não pessoal) que um poema
    // retrata; referenciado por Poema/Prosa via periodoHistoricoId (link
    // simples, sem recorte por texto — ver decisoes.md). `inicio`/`fim`
    // são datas parciais { dia, mes, ano } (cada campo opcional, mesmo
    // formato de epocaRetratada) e vivem no cadastro, não por texto,
    // porque a data é do período em si (ver migrarDatasPeriodoHistorico).
    // Vem pré-populado com 16 períodos de relevância ampla/internacional
    // pra literatura (Renascimento, Iluminismo, Guerras Mundiais, Semana
    // de Arte Moderna etc. — ver SEED_PERIODOS_HISTORICOS), semeado só na
    // primeira vez que o app roda e migrado aditivamente depois (mesmo
    // mecanismo de Movimento/Escola, ver migrarPeriodosHistoricosEmbutidos)
    periodosHistoricos: SEED_PERIODOS_HISTORICOS(),
    // cadastro central de Movimento/Escola ({ id, nome, notas, inicio, fim,
    // tipo, valores, temas, tecnicas, tiposComposicao, lemas, manifestos,
    // fontes, regiaoOrigem }) — diferente de Período Histórico, a relação aqui é
    // N:N dos dois lados: Autor.movimentosEscolasIds e
    // Poema/Prosa.movimentosEscolasIds são arrays de id (um Autor pode não
    // se enquadrar em nenhum movimento, ou pertencer a vários; um texto
    // idem — ver decisoes.md). `inicio`/`fim` são datas parciais no mesmo
    // formato de periodosHistoricos, mas com `seculo` (número romano,
    // string) e `decada` (número, ex. 1920) somados, porque um movimento
    // literário raramente tem data conhecida no dia/mês. Vem pré-populado
    // com os principais movimentos de língua portuguesa + influências
    // internacionais (ver SEED_MOVIMENTOS_ESCOLAS) — só semeado na
    // primeira vez que o app roda (chave ausente), nunca recriado depois
    // que a pessoa mexe no cadastro (mesmo raciocínio de qualquer
    // migração idempotente aqui)
    movimentosEscolas: SEED_MOVIMENTOS_ESCOLAS(),
    // cadastro central de Assunto ({ id, nome, notas, temaIds: [id, ...] }) —
    // agrupa Temas do cadastro `db.temas` por ID (o nome mora só lá), e um
    // Tema pode estar em mais de um Assunto (N:N). O Assunto de um texto
    // não é gravado nele, é derivado dos Temas dele (assuntosDoTexto em
    // utils.js), então o cadastro não tem vínculo a limpar na exclusão.
    // Instalação nova recebe uma amostra (semearTemasEAssuntos, logo após
    // este objeto); instalação existente e backup importado, nunca.
    assuntos: [],
    // cadastro central de Tema ({ id, nome, notas }) — ver temas.js. O
    // texto guarda `temas: [{ temaId, papel }]` (fonte da verdade) e o
    // espelho `sinalizacoesTema`; o cadastro é mantido em sincronia
    // (sincronizarTemas), que também migra Assunto de nomes para ids.
    temas: [],
    // cadastro central de Local ({ id, nome, tipo, pertenceA: [id, ...],
    // notas }), ver locais.js. `pertenceA` é uma lista (vários pais; o
    // primeiro é o principal). O texto guarda `territorialidade: [id]`
    // (lugares citados; o espelho `sinalizacoesTerritorialidade` continua)
    // e `localEscrita: id | null`. Mantido em sincronia por
    // `sincronizarLocais`, que migra as etiquetas antigas de Territorialidade.
    locais: [],
    // cadastro central de Personagem ({ id, nome, origem, notas }), ver
    // personagens.js. Só o que o autor criou ou reinterpretou. O texto guarda
    // `personagens: [{ personagemId, papeis, centralidade }]`. Mantido em
    // sincronia por `sincronizarPersonagens` (solta vínculo órfão).
    personagens: [],
    // Pares de textos que a pessoa mandou ignorar na sugestão de Ecos
    // faltantes: [{ especie: 'pessoa'|'personagem', id, chave }], ver
    // sugestao-ecos.js. Mantido em sincronia por `sincronizarParesIgnorados`.
    ecosIgnorados: [],
    // Padrões de colunas que a pessoa salvou nas tabelas (seletor "Colunas"):
    // { [tabela]: [{ nome, colunas: [chaves, na ordem da tela] }] }. Mora no
    // db (e não no localStorage, como a escolha atual de colunas) pra ir junto
    // no backup JSON, nos snapshots e na restauração. Ver colunas.js.
    padroesColunas: {},
    // Versão dos padrões de colunas de fábrica já semeados em `padroesColunas`
    // (ver padroes-colunas-fabrica.js); ausente = nenhum ainda.
    padroesColunasFabricaVersao: 0,
    // Bloco 3: valores de Esfera, Natureza e Vínculo do Período Biográfico
    // (mais a Natureza sugerida de cada Vínculo), editáveis pela pessoa
    // (começam com os de fábrica). Ver periodo-biografico-campos.js.
    opcoesPeriodoBiografico: opcoesDeFabricaPeriodoBiografico(),
    // Esfera e Categoria do Período Histórico (15/10/2026): vocabulário
    // próprio, separado do biográfico, editável pelo "Gerenciar". Ver
    // periodos-historicos-campos.js.
    opcoesPeriodoHistorico: opcoesDeFabricaPeriodoHistorico(),
    // Análise de escansão/métrica/rimas de um poema (aba Sonoridade).
    // Um poema pode ter no máximo uma escansão vinculada (não é histórico
    // de versões) — ver getEscansaoDoPoema. Bloco 1 (dados + tabela) cobre
    // os 7 campos de classificação; escansaoLinhas (grade silábica, cada
    // linha com `tonicas`: array de índices de sílaba marcados no Modo
    // Sílaba Tônica) e rimas (pares de sílabas que rimam entre versos,
    // `{ id, a: { linha, silabas }, b: { linha, silabas } }` — a letra
    // A/B/C... do esquema é sempre derivada dos pares, nunca salva; ver
    // calcularLetrasRima em editor-sonoridade.js) são do Bloco 2
    // (js/editor-sonoridade.js) — passos 1-2 (grade + tônica) e o
    // sub-passo 1 do Mapeamento de Rimas (estrutura do par + letras)
    // prontos. Estilização visual do par (contorno colorido, spec 3.2)
    // já tem um destaque provisório (ring azul/roxo na seleção em
    // curso); classificação de cada rima (posição/acentuação/
    // tonalidade/riqueza) e o painel consolidado ainda não têm editor —
    // próximos sub-passos.
    // { id, poemaId, formaPoema, regularidadeMetrica, tamanhoVerso,
    //   esquemaRimasPresenca, esquemaRimasPadrao, origemTradicao,
    //   peMetrico, registro, tom, escansaoLinhas: [], rimas: [] }
    // registro/tom eram um único campo (tomRegistro) — ver
    // migrarRegistroTomSonoridade. peMetrico é campo novo (ver
    // PES_METRICOS em utils.js) — trava bidirecional com tamanhoVerso,
    // por enquanto sem cálculo de divergência (isso é o sub-passo 2 do
    // Molde, replicado aqui por simetria).
    escansoes: [],
    // Análise de Progressão Morfofuncional (menu "Morfofuncionalidade") —
    // Unidades (forma+função de uma seção do texto: unidadeEstrofica +
    // unidadeDiscursiva) e Eventos (movimento pontual: progressaoDialetica)
    // são entidades separadas desde o cadastro, sem herdar campo uma da
    // outra, mas convivem no mesmo registro por poema (no máximo um por
    // poema, mesmo espírito de escansoes — ver getEstruturaDoPoema).
    // `posicao` ({ estrofes: [n,...], versos: 'todos' | [n,...] }) é
    // sempre opcional — item sem estrofe nenhuma marcada fica
    // "não posicionado" (ver itemPosicionado em estrutura-textual.js);
    // seleção fina de verso só é válida quando estrofes.length === 1,
    // com mais de uma estrofe versos é sempre 'todos'. Sobreposição
    // entre quaisquer dois itens (Unidade×Unidade, Evento×Evento,
    // Unidade×Evento) é esperada, não é erro — ver detectarSobrepostos.
    // { id, poemaId, unidades: [{ id, unidadeEstrofica, unidadeDiscursiva, posicao }],
    //   eventos: [{ id, progressaoDialetica, posicao }] }
    estruturasTextuais: [],
    // Templates de Progressão Morfofuncional — salvam só a classificação
    // (unidadeEstrofica/unidadeDiscursiva/progressaoDialetica), nunca a
    // posição; aplicar um template instancia Unidades/Eventos
    // "não posicionados" no poema. `embutido: true` = template de
    // fábrica (editável e excluível como qualquer outro — ver
    // TEMPLATES_ESTRUTURA_EMBUTIDOS/migrarTemplatesEstruturaEmbutidos —
    // só sinaliza origem, mostrando "(padrão)" e ordenando primeiro na
    // lista).
    // { id, nome, embutido, unidades: [{ unidadeEstrofica, unidadeDiscursiva }],
    //   eventos: [{ progressaoDialetica }] }
    templatesEstrutura: [],
    // Nomes de templates embutidos que o usuário excluiu de propósito —
    // migrarTemplatesEstruturaEmbutidos consulta essa lista pra nunca
    // recriar um embutido que já foi excluído (senão a exclusão nunca
    // "pegaria": o item voltaria sozinho no próximo carregamento). Não
    // entra aqui por renomear um embutido (isso vira fork — ver
    // salvarTemplateEstrutura em forms.js), só por excluir mesmo.
    templatesEstruturaOcultos: [],
    // Moldes (aba Criação) — rascunho estruturado, o inverso de
    // escansoes: aqui a classificação vem ANTES do texto, como meta a
    // cumprir, não como constatação sobre um poema já escrito. Bloco 1
    // (dados + tabela) cobre só título + os mesmos 6 campos de
    // classificação da Sonoridade (reaproveita FORMAS_POEMA/
    // REGULARIDADES_METRICAS/etc. e calcularOpcoesCascataSonoridade —
    // mesma taxonomia, mesma matriz de validação em cascata; ver
    // utils.js). Sem vínculo com poemaId nem grade de versos ainda —
    // isso é Bloco 2 (editor de escrita orientado pela meta) e Bloco 3
    // (pareamento de rima + promoção a Poema), que vão estender este
    // objeto com moldeLinhas/paresRima/poemaId/status quando chegarem,
    // mesmo espírito incremental de escansoes (ver comentário acima).
    // { id, titulo, formaPoema, regularidadeMetrica, tamanhoVerso,
    //   esquemaRimasPresenca, esquemaRimasPadrao, origemTradicao,
    //   peMetrico, registro, tom, moldeLinhas: [], paresRima: [],
    //   poemaId, status }
    // Bloco 3 (Pareamento de Rima + Promoção a Poema, ver
    // manutencao/criacao-molde.md): `paresRima` no mesmo formato de
    // escansoes.rimas (`{ id, a: { linha, silabas }, b: { linha,
    // silabas } }`); `poemaId` (nulo até a promoção) e `status`
    // ('em andamento' / 'promovido') controlam a "Promover a Poema" —
    // o Molde original nunca é apagado na promoção, fica arquivado
    // como origem/processo do Poema (ver migrarCamposBloco3Molde,
    // abaixo, pra Moldes salvos antes desses três campos existirem).
    moldes: [],
};

if (_instalacaoNova) Object.assign(db, semearTemasEAssuntos());

// Garante que dados importados de versões antigas tenham os campos novos
if (!db.coletaneas) db.coletaneas = [];
if (!db.pessoas) db.pessoas = [];
if (!db.grupos) db.grupos = [];
if (!db.autores) db.autores = [];
if (!db.epocas) db.epocas = [];
if (!db.periodosHistoricos) db.periodosHistoricos = [];
if (!db.periodosHistoricosOcultos) db.periodosHistoricosOcultos = [];
// Instalação já existente (localStorage anterior a este item do
// roadmap) não passa pelo objeto padrão lá em cima — chave ausente aqui
// significa "nunca teve Movimento/Escola", então semeia agora, uma
// única vez (idempotente: só entra quando a chave nem existe).
if (!db.movimentosEscolas) db.movimentosEscolas = SEED_MOVIMENTOS_ESCOLAS();
if (!db.movimentosEscolasOcultos) db.movimentosEscolasOcultos = [];
if (!db.assuntos) db.assuntos = [];
if (!db.temas) db.temas = [];
// cadastro central de Etiqueta ({ id, nome, categoria, notas }), ver
// etiquetas.js. Tradição, Estilo, Relação, Sensibilidade, Tom, Domínio
// Imagético e Outros guardam, no Poema e na Prosa, listas de ids deste
// cadastro (sem espelho de texto). Mantido em sincronia por
// `sincronizarEtiquetas`, que migra o texto antigo separado por vírgula.
if (!db.etiquetas) db.etiquetas = [];
// Tag clusters (Fase 17): agrupam etiquetas de uma categoria ({ id, nome,
// categoria, notas }, ver tag-clusters.js); a etiqueta guarda `clusterId`.
if (!db.tagClusters) db.tagClusters = [];
// utils.js traduz id em nome (textoDeEtiquetas) lendo o db atual; o getter
// precisa ler `db` a cada chamada porque importarDB e esvaziar trocam campos.
definirCadastroEtiquetas(() => db.etiquetas);
if (!db.locais) db.locais = [];
if (!db.personagens) db.personagens = [];
if (!db.ecosIgnorados) db.ecosIgnorados = [];
if (!db.padroesColunas || typeof db.padroesColunas !== 'object') db.padroesColunas = {};
aplicarPadroesColunasDeFabrica(db);
if (!db.escansoes) db.escansoes = [];
if (!db.estruturasTextuais) db.estruturasTextuais = [];
if (!db.templatesEstrutura) db.templatesEstrutura = [];
if (!db.templatesEstruturaOcultos) db.templatesEstruturaOcultos = [];
if (!db.moldes) db.moldes = [];

// Moldes salvos antes do Bloco 3 (Pareamento de Rima + Promoção a
// Poema) não tinham `paresRima`/`poemaId`/`status` — preenche os
// valores padrão sem mexer em Molde que já tiver algum dos três (ex.:
// reimportação de um backup já migrado). Idempotente, mesmo espírito
// de migrarRegistroTomSonoridade logo abaixo.
export function migrarCamposBloco3Molde(moldes) {
    moldes.forEach((m) => {
        if (m.paresRima === undefined) m.paresRima = [];
        if (m.status === undefined) m.status = 'em andamento';
        if (m.poemaId === undefined) m.poemaId = null;
    });
}
migrarCamposBloco3Molde(db.moldes);

// Migração: `tomRegistro` (Tom/Registro, 3 opções) virou dois campos
// independentes — `registro` (formalidade da linguagem, 5 opções) e
// `tom` (atitude/disposição poética, 7 opções) — ver
// REGISTROS_SONORIDADE/TONS_SONORIDADE em utils.js. Mapeamento
// best-effort do valor antigo pra `registro`; `tom` fica vazio (não dá
// pra inferir tom a partir de, por exemplo, "Misto / Irônico" com
// segurança — melhor o usuário reclassificar do que herdar um tom
// errado). Idempotente: escansão que já tem `registro` (ou nunca teve
// `tomRegistro`) passa intacta.
const MAPA_MIGRACAO_TOM_REGISTRO = {
    'Erudito / Culto': 'Culto / Erudito',
    'Coloquial / Popular': 'Coloquial / Popular',
    'Misto / Irônico': 'Misto / Híbrido',
};
export function migrarRegistroTomSonoridade(escansoes) {
    escansoes.forEach((es) => {
        if (es.tomRegistro === undefined) return;
        if (es.registro === undefined) {
            es.registro = MAPA_MIGRACAO_TOM_REGISTRO[es.tomRegistro] || null;
        }
        if (es.tom === undefined) es.tom = null;
        delete es.tomRegistro;
    });
}
migrarRegistroTomSonoridade(db.escansoes);

// Templates de fábrica de Progressão Morfofuncional — 2 variantes de
// Soneto (Petrarquiano/Camoniano e Shakespeariano; ver FORMAS_POEMA em
// utils.js pro lado da Sonoridade, que mantém um terceiro valor,
// `Soneto (Genérico)`, sem equivalente aqui). `embutido: true` impede
// edição direta (só duplicar — ver forms.js); reseeda se faltar (ex.:
// db zerado, ou template embutido apagado por engano em alguma versão
// antiga), sem duplicar se já existir (checa por nome+embutido).
//
// Não existe `Soneto (Genérico)` aqui de propósito: um template é
// sempre um chute concreto de forma estrófica (quantas estrofes,
// quantos versos, que função discursiva cada uma carrega), e não há
// uma "forma genérica de soneto" que seja estruturalmente diferente de
// Petrarquiano ou Shakespeariano — só uma das duas, ou nenhuma (poema
// montado à mão, sem template). Um template genérico repetindo o
// conteúdo do Petrarquiano não define nada de diferente, então não
// estava fazendo o trabalho de um template (ver decisoes.md). Os
// campos Forma do Poema (Sonoridade) e Progressão Morfofuncional não
// são amarrados um ao outro no código — um poema classificado como
// `Soneto (Genérico)` na Sonoridade pode receber o template
// Petrarquiano/Camoniano ou Shakespeariano aqui (o que bater com a
// estrofação real), ou nenhum.
export const TEMPLATES_ESTRUTURA_EMBUTIDOS = [
    // Octeto (2 Quartetos) = Proposição, sexteto (2 Tercetos) =
    // Resolução — a volta clássica cai exatamente na virada
    // octeto→sexteto (verso 9), daí o evento `Volta` entre `Tensão`
    // (construção ao longo do octeto) e `Síntese` (resolução no
    // sexteto).
    {
        nome: 'Soneto Petrarquiano / Camoniano',
        unidades: [
            { unidadeEstrofica: 'Quartetos', unidadeDiscursiva: 'Proposição' },
            { unidadeEstrofica: 'Tercetos', unidadeDiscursiva: 'Resolução' },
        ],
        eventos: [
            { progressaoDialetica: 'Tensão' },
            { progressaoDialetica: 'Volta' },
            { progressaoDialetica: 'Síntese' },
        ],
    },
    // Estrutura bem diferente da petrarquiana/camoniana — 3 Quartetos
    // (não 2) seguidos de um Dístico (não 2 Tercetos), refletindo o
    // ABAB ABAB ABAB GG do original inglês. Rótulos discursivos dos 3
    // quartetos seguem a leitura crítica corrente da forma: 1º expõe o
    // tema, 2º desenvolve, 3º intensifica/complica antes da virada; o
    // Dístico final concentra Volta (o "turno" característico do
    // soneto shakespeariano cai só nos 2 últimos versos, não entre
    // estrofes maiores como na forma petrarquiana) e Síntese num só
    // par de versos — por isso um único evento `Volta` faz as vezes
    // dos dois no template (a distinção entre "virada" e "síntese"
    // dentro do dístico fica pra classificação manual, caso o poema em
    // questão realmente separe as duas coisas em versos diferentes).
    // `Dístico` já constava como sugestão-base em
    // atualizarDatalistsEstruturaTextual (forms.js) antes mesmo dessa
    // mudança — sinal de que já era esperado precisar dele aqui.
    {
        nome: 'Soneto Shakespeariano',
        unidades: [
            { unidadeEstrofica: 'Quarteto I', unidadeDiscursiva: 'Proposição' },
            { unidadeEstrofica: 'Quarteto II', unidadeDiscursiva: 'Desenvolvimento' },
            { unidadeEstrofica: 'Quarteto III', unidadeDiscursiva: 'Intensificação' },
            { unidadeEstrofica: 'Dístico', unidadeDiscursiva: 'Resolução' },
        ],
        eventos: [{ progressaoDialetica: 'Tensão' }, { progressaoDialetica: 'Volta' }],
    },
];
// `ocultos` (nomes excluídos de propósito pelo usuário — ver
// db.templatesEstruturaOcultos acima): pulados de propósito, nunca
// recriados. Sem essa checagem, excluir um template embutido não
// "pegaria" de vez — ele voltaria sozinho no próximo carregamento,
// igual ao "Soneto" órfão que sobrou de uma versão antiga desta mesma
// lista (ver manutencao/decisoes.md).
export function migrarTemplatesEstruturaEmbutidos(templatesEstrutura, ocultos = []) {
    TEMPLATES_ESTRUTURA_EMBUTIDOS.forEach((modelo) => {
        if (ocultos.includes(modelo.nome)) return;
        const jaExiste = templatesEstrutura.some((t) => t.embutido && t.nome === modelo.nome);
        if (jaExiste) return;
        templatesEstrutura.push({
            id: gerarId(),
            nome: modelo.nome,
            embutido: true,
            unidades: modelo.unidades.map((u) => ({ ...u })),
            eventos: modelo.eventos.map((e) => ({ ...e })),
        });
    });
}
migrarTemplatesEstruturaEmbutidos(db.templatesEstrutura, db.templatesEstruturaOcultos);

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

// Migração: o grupo "Elos, Referências e Intertextualidade" virou
// "Intratextualidade" (só Elos e Ecos). O que era `conceitos.referencias`
// (a relação de um texto evocar outro do acervo) passa a se chamar
// `conceitos.ecos` — mesma forma de dado, só a chave muda. Precisa
// rodar ANTES de qualquer coisa que leia/normalize `conceitos.ecos`
// (migrarElosReferencias logo abaixo, e antes do campo novo
// `referenciasExternas` nascer — ver migrarReferenciasExternas), pra
// não deixar vestígio da chave antiga nem misturar os dois momentos.
// Idempotente: poema cujo `conceitos.ecos` já existe (rodada anterior,
// ou item que nunca teve `referencias`) passa intacto; `referencias` é
// sempre removida quando presente, mesmo sem nada pra migrar.
function migrarReferenciasParaEcos(poemas) {
    poemas.forEach((p) => {
        if (!p.conceitos || p.conceitos.referencias === undefined) return;
        if (p.conceitos.ecos === undefined) p.conceitos.ecos = p.conceitos.referencias;
        delete p.conceitos.referencias;
    });
}
migrarReferenciasParaEcos(db.poemas);

// Migração: Elos e Ecos eram arrays de ID cru apontando pra outro poema
// (ex.: [1776745104803]). Passam a ser arrays de objeto
// { id, tipo, texto } — um elo/eco pode ter um tipo específico
// (Reescrita de / Tradução de / Personagem em comum / etc., ver
// TIPOS_ELO/TIPOS_ECO em utils.js) e uma nota livre opcional. Só se
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
        p.conceitos.ecos = migrarLista(p.conceitos.ecos);
    });
}
migrarElosReferencias(db.poemas);

// Normalização: `referenciasExternas` é campo novo (grupo
// "Intertextualidade e Referências", par de Intertextualidade) — sem
// dado legado pra migrar, só precisa nascer `[]` em vez de `undefined`
// pra quem lê o campo direto sem fallback (mesmo papel de
// migrarIntertextualidadePoemas acima, sobre um campo que também é
// top-level, não dentro de `conceitos`). Aplica a Poema e Prosa
// (paridade, como Intertextualidade já tem hoje).
// Idempotente: item cujo `referenciasExternas` já é array passa intacto.
function migrarReferenciasExternas(itens) {
    itens.forEach((item) => {
        if (!Array.isArray(item.referenciasExternas)) item.referenciasExternas = [];
    });
}
migrarReferenciasExternas(db.poemas);
migrarReferenciasExternas(db.prosas);

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
// PAPEIS_PESSOA (Retratado(a)/Inspiração para/Dedicatário(a)/Mencionado(a)/Aludido(a)/Associado(a) retroativamente) —
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
// Inspiração para e Dedicatário(a) ao mesmo tempo — forçar escolha única
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

// Migração: os nomes de alguns valores de PAPEIS_PESSOA mudaram em duas
// sessões (ver manutencao/decisoes.md):
// (1) padronização de gênero: "Alusão" → "Aludido(a)", "Dedicatária" →
// "Dedicatário(a)", "Inspirado por" → "Inspirado(a) por";
// (2) correção de direção gramatical: "Inspirado(a) por" → "Inspiração
// para" (o papel descreve a pessoa, não o poema — "Fulano (Inspirado(a)
// por)" lia como se o poema tivesse inspirado a pessoa; "Inspiração
// para" lê na direção certa). Mapeia direto pro nome final mesmo quando
// o dado ainda está no nome mais antigo ("Inspirado por"), sem depender
// de rodar em duas passagens.
// Cada troca só mudou a constante e o código — dado já salvo com o nome
// antigo (dentro de `papeis`, array de string) não foi tocado, então
// ficava com uma string que não bate mais com nenhuma opção do <select>
// (aparecia como papel "invisível": sem marcação em nenhum item do
// dropdown, mas contando pra inicial exibida e pra iniciaisPapeisPessoa)
// e, se a pessoa marcasse o papel novo correspondente no mesmo item, os
// dois conviviam no array, gerando abreviação duplicada na coluna.
// Renomeia in-place os valores antigos pros novos; roda depois de
// migrarPapeisPessoa (precisa de `papeis` já ser array) e é seguro
// rodar de novo (só troca o que ainda está em nome antigo).
const RENOMEACOES_PAPEL = {
    Alusão: 'Aludido(a)',
    Dedicatária: 'Dedicatário(a)',
    'Inspirado por': 'Inspiração para',
    'Inspirado(a) por': 'Inspiração para',
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
// ({ id, nome, grupoIds, autorIds }), em vez de nome solto repetido em
// cada poema/prosa. `papel`/`papeis` é vínculo do texto com a pessoa
// (varia por poema) e continua em `item.pessoas`; o que muda é a chave:
// de `{ nome, papeis }` pra `{ pessoaId, papeis }` — quem a pessoa É
// (nome, grupos, autores a quem pertence) passa a morar só no cadastro
// central, uma vez.
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
            pessoa = { id: gerarId(), nome, grupoIds: [], autorIds: [] };
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
//
// Idiomas em lista (30/09/2026): `idiomas: [{ idioma, papel, dialetos }]` passou a
// ser a fonte da verdade (vários idiomas, cada um com papel Principal ou
// Secundário e dialetos opcionais, uma lista). `idioma` (string) continua como espelho
// derivado, só com os nomes. A migração cria `idiomas` a partir do `idioma`
// antigo (um idioma Principal, sem dialetos) e, onde `idiomas` já existe,
// normaliza a lista (um `dialeto` de texto único vira `dialetos: [dialeto]`)
// e refaz o espelho. Idempotente.
export function migrarIdioma(itens) {
    itens.forEach((item) => {
        if (item.idioma === undefined && !Array.isArray(item.idiomas)) item.idioma = 'pt-BR';
        item.idiomas = idiomasDoItem(item);
        item.idioma = espelhoDeIdiomas(item.idiomas);
    });
}
migrarIdioma(db.poemas);
migrarIdioma(db.prosas);

// Migração: `ano` legado → `dataEscrita`. Antes de `dataEscrita` existir, o
// ano de escrita morava só em `item.ano`; hoje `ano` é uma cópia derivada de
// `dataEscrita.ano` (ver forms.js), mas os textos antigos ficaram com `ano`
// e sem data de escrita — a coluna Escrita mostrava o ano, o filtro De/Até e
// `-dataescrita:*` os tratavam como "sem data", e salvar o texto sem preencher
// a data apagava o `ano` (ano: dataEscrita?.ano || ''). Aqui o ano vira
// `dataEscrita: { ano, exata: false }` (só o ano é sabido, então aproximada —
// mesmo formato que o formulário grava com "exata" desmarcado).
// Só toca item sem nenhuma parte (dia/mês/ano) em `dataEscrita` e com `ano`
// inteiro entre 1 e 2100 (mesma faixa do formulário); `ano` com texto ou
// fora da faixa fica como está. Nunca sobrescreve uma data já preenchida e
// não mexe em `item.ano`. Idempotente.
export function migrarAnoParaDataEscrita(itens) {
    itens.forEach((item) => {
        const d = item.dataEscrita;
        if (d && (d.dia || d.mes || d.ano)) return;
        const bruto = item.ano;
        const ano =
            typeof bruto === 'number'
                ? bruto
                : typeof bruto === 'string' && /^\d{1,4}$/.test(bruto.trim())
                  ? Number(bruto.trim())
                  : NaN;
        if (!Number.isInteger(ano) || ano < 1 || ano > 2100) return;
        item.dataEscrita = { ano, exata: false };
    });
}
migrarAnoParaDataEscrita(db.poemas);
migrarAnoParaDataEscrita(db.prosas);

// Bloco 2e: `periodoHistoricoId` (um só) virou `periodosHistoricosIds` (lista,
// sem período principal). Com valor vira `[valor]`, sem valor vira `[]`, e o
// campo antigo sai do objeto. Onde a lista já existe, só normaliza (sem
// repetidos, sem vazios) e tira o campo antigo se ele sobrou. Id que não
// existe mais no cadastro sai sem barulho quando `cadastro` é passado.
// Idempotente; backups antigos continuam abrindo.
export function migrarPeriodosHistoricosMultiplos(itens, cadastro = null) {
    (itens || []).forEach((item) => {
        item.periodosHistoricosIds = periodosHistoricosIdsDoItem(item, cadastro);
        delete item.periodoHistoricoId;
    });
}

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

        // Outros já em ids (Fase 16): não há nome de tag para procurar.
        const tags = (Array.isArray(item.sinalizacoesOutros) ? '' : item.sinalizacoesOutros || '')
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
// cadastro central próprio, `db.epocas` ({ id, nome,
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
            epoca = {
                id: gerarId(),
                nome,
                notas: '',
                inicio: null,
                fim: null,
                esferas: [],
                categorias: [],
                pessoasEnvolvidas: [],
                relacoes: [],
            };
            dbRef.epocas.push(epoca);
            porNome.set(nome, epoca);
        }
        return epoca.id;
    }

    (dbRef.poemas || []).forEach((p) => {
        const epoca = p.epocaRetratada;
        // vazio ou já migrado (formato com `epocaId` ou já com a lista `periodos`)
        if (!epoca || epoca.epocaId !== undefined || Array.isArray(epoca.periodos)) return;
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

// Vários Períodos Biográficos por texto: `epocaRetratada.epocaId` (um só) e
// `epocaRetratada.recorte` viram `epocaRetratada.periodos`, lista de
// `{ epocaId, recorte }` (o recorte passa a ser por período). `inicio`, `fim` e
// `na` seguem no texto. Sem período, a lista fica vazia (o objeto continua se
// houver datas ou N/A). Com `cadastro`, tira id que não existe mais.
// Idempotente; backups antigos continuam abrindo.
export function migrarPeriodosBiograficosMultiplos(itens, cadastro = null) {
    (itens || []).forEach((item) => {
        const er = item.epocaRetratada;
        if (!er) return;
        item.epocaRetratada = {
            periodos: periodosDaEpocaRetratada(er, cadastro),
            inicio: er.inicio || null,
            fim: er.fim || null,
            na: !!er.na,
        };
    });
}

// Helper compartilhado por migrarGruposAutorId/migrarEpocasAutorId
// abaixo: Victor Leme como Autor padrão de backfill (único autor com
// dado real antes de Grupo/Época passarem a pertencer a um Autor —
// decisão de 27/09/2026, ver manutencao/decisoes.md). Mesmo dedup por
// nome de migrarAutoria/obterOuCriarAutorPorNome, mas operando sobre um
// dbRef arbitrário (não o db global), pra migração continuar testável
// com dbRef isolado — mesmo raciocínio de migrarAutoria acima.
// Autor marcado "Este autor sou eu" (db.autores[].souEu, ver
// AUTOR_SOU_EU em editor.js) — usado pra pré-selecionar um valor
// sensato nos selects de Autor dos modais de Grupo/Época (a maioria dos
// grupos/períodos cadastrados hoje são do próprio Victor). Devolve
// `null` se ninguém estiver marcado (força escolha explícita no select,
// sem chute).
export function obterAutorSouEuId(dbRef) {
    return (dbRef.autores || []).find((a) => a.souEu)?.id ?? null;
}

function obterOuCriarAutorPadraoId(dbRef) {
    let victor = (dbRef.autores || []).find((a) => a.nome === 'Victor Leme');
    if (!victor) {
        victor = { id: gerarId(), nome: 'Victor Leme', sobre: '' };
        (dbRef.autores ||= []).push(victor);
    }
    return victor.id;
}

// Migração: `autorId` em Grupo (+ `paiId`, novo, pra permitir níveis de
// agrupamento — um Grupo pode ter outro Grupo do MESMO Autor como pai,
// ver obterGrupoPaiValido abaixo). Grupo deixa de ser um balde global
// único e passa a pertencer a um Autor específico — cada Autor (Victor,
// e cada autor da Biblioteca) tem seus próprios Família/Amigos/etc., em
// vez de todos compartilharem o mesmo cadastro achatado (decisão de
// 27/09/2026: "família de um autor, família de outro"). Todo grupo
// cadastrado antes dessa mudança ganha autorId de Victor Leme (único
// autor com dado real até aqui); `paiId` começa `null` pra todo mundo —
// ninguém tinha isso antes, é campo novo.
// Idempotente: só toca grupo sem `autorId`.
export function migrarGruposAutorId(dbRef) {
    (dbRef.grupos || []).forEach((g) => {
        if (g.autorId !== undefined) return;
        g.autorId = obterOuCriarAutorPadraoId(dbRef);
        if (g.paiId === undefined) g.paiId = null;
    });
}
migrarGruposAutorId(db);

// Mesmo raciocínio de migrarGruposAutorId acima, pro cadastro de Época
// (Período Biográfico) — também deixa de ser geral e passa a pertencer a
// um Autor (mesma pendência apontada por ele: "período biográfico tem
// essa mesma característica").
// Idempotente: só toca época sem `autorId`.
export function migrarEpocasAutorId(dbRef) {
    (dbRef.epocas || []).forEach((e) => {
        if (e.autorId !== undefined) return;
        e.autorId = obterOuCriarAutorPadraoId(dbRef);
    });
}
migrarEpocasAutorId(db);

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
        pessoa = { id: gerarId(), nome: nomeLimpo, grupoIds: [], autorIds: [] };
        db.pessoas.push(pessoa);
    }
    return pessoa;
}

// Resolve (nome, autorId) → Grupo no cadastro central, criando um novo
// se ainda não existir (dedup por nome DENTRO do mesmo Autor — desde a
// decisão de 27/09/2026, "família de um autor, família de outro", nome
// de Grupo só é único por Autor, não mais globalmente). Usada por
// editor.js: caminho de confirmação explícita do usuário ao digitar, no
// campo de referência direta a Grupo do poema/prosa (ver
// criarGrupoDeGruposDiretos), o nome de um grupo que ainda não está
// cadastrado — cor sai no padrão (CORES_GRUPO_PADRAO), trocável depois
// na aba Grupos, mesmo espírito de Pessoa nova entrar sem grupo e
// ganhar um depois. `paiId` sempre nasce `null` (grupo novo digitado
// vira nível 1; virar subgrupo de outro é feito depois, na aba de
// gestão, com `obterGrupoPaiValido` abaixo).
export function obterOuCriarGrupoPorNome(nome, autorId) {
    const nomeLimpo = String(nome ?? '').trim();
    let grupo = db.grupos.find((g) => g.nome === nomeLimpo && g.autorId == autorId);
    if (!grupo) {
        grupo = { id: gerarId(), nome: nomeLimpo, cor: CORES_GRUPO_PADRAO, autorId, paiId: null };
        db.grupos.push(grupo);
    }
    return grupo;
}

// Teto fixo de níveis da hierarquia de Grupo — 2 até 27/09/2026,
// destravado pro 3º no mesmo dia por um caso de uso real ("Ex-namorados"
// > "Pedro" > subgrupos do universo de Pedro, não cabia em 2), e pro 5º
// ainda no mesmo dia por decisão explícita do Victor: em vez de destravar
// só até o próximo caso concreto (que seria 4 — "Relações afetivas" >
// Namorado/Ex/Ficante > pessoa > universo de grupos dela), subir direto
// pra 5 de propósito, como gordura pra evitar destravar de novo na
// próxima necessidade imprevista. Ver decisoes.md. Único ponto de
// verdade do número — `nivelGrupo`/`obterGrupoPaiValido`/`mesclarGrupos`
// e `forms.js` (select "Grupo pai") leem daqui, nunca hardcodam o valor
// de novo.
export const NIVEL_MAXIMO_GRUPO = 5;

// Calcula em que nível da hierarquia um Grupo está (1 a NIVEL_MAXIMO_GRUPO),
// subindo a cadeia de `paiId` até achar um grupo sem pai. `guarda` evita
// loop infinito se algum dado ficar corrompido com um ciclo (não deveria
// acontecer, `obterGrupoPaiValido` abaixo impede na entrada, mas dado
// antigo importado sem passar por ali é sempre possível) — 10 fica acima
// do teto atual, só de margem extra.
export function nivelGrupo(dbRef, grupoId) {
    let nivel = 1;
    let atual = dbRef.grupos?.find((g) => g.id == grupoId);
    let guarda = 0;
    while (atual?.paiId != null && guarda < 10) {
        nivel++;
        atual = dbRef.grupos?.find((g) => g.id == atual.paiId);
        guarda++;
    }
    return nivel;
}

// Altura da subárvore abaixo de `grupoId` (0 se não tem filho, 1 se tem
// filho mas nenhum neto, e por aí vai). Usada por `mesclarGrupos` (pra
// checar se reatribuir a subárvore inteira da origem pro destino ainda
// cabe no teto) e por `obterGrupoPaiValido` logo abaixo (mesma checagem,
// mas pra reatribuir um `paiId` em vez de mesclar) — exportada pra
// `forms.js` reaproveitar no filtro do select "Grupo pai", em vez de
// deixar o usuário escolher uma opção que a validação recusaria depois
// em silêncio.
export function alturaSubarvoreGrupo(dbRef, grupoId) {
    const filhos = (dbRef.grupos || []).filter((g) => g.paiId == grupoId);
    if (filhos.length === 0) return 0;
    return 1 + Math.max(...filhos.map((f) => alturaSubarvoreGrupo(dbRef, f.id)));
}

// Cadeia de um Grupo até a raiz da árvore: [próprioId, paiId, avôId, ...],
// sempre incluindo o próprio grupoId primeiro. Usada só pelas Estatísticas
// (agregarPorPessoa/contarPorPessoa em estatisticas-dados.js) pra fazer um
// subgrupo "contar também" pro(s) grupo(s) acima dele na hierarquia — pedido
// do Victor, 27/09/2026, explicitamente restrito a Estatísticas: em todo o
// resto do app (atribuição de Grupo à Pessoa, badges/exportação do
// poema/prosa — ver paresGrupoPessoa em utils.js) o subgrupo continua
// contando só como ele mesmo, sem repique pro pai — ali é a Pessoa quem
// decide o que sinalizar, e o Victor prefere essa liberdade de marcar só o
// nível específico. Mesmo guarda-loop de nivelGrupo acima; grupoId
// inexistente devolve array vazio.
export function cadeiaAncestraisGrupo(dbRef, grupoId) {
    const cadeia = [];
    let atual = dbRef.grupos?.find((g) => g.id == grupoId);
    let guarda = 0;
    while (atual && guarda < 10) {
        cadeia.push(atual.id);
        atual = atual.paiId != null ? dbRef.grupos?.find((g) => g.id == atual.paiId) : null;
        guarda++;
    }
    return cadeia;
}

// Valida um `paiId` candidato pra um Grupo — usado pela aba de gestão de
// Grupos ao trocar o "Grupo pai" de um subgrupo, e pelo submit do modal
// de Grupo (onde o grupo filho pode ainda nem existir em `dbRef.grupos`
// se for um cadastro novo — por isso recebe `autorId` explícito, em vez
// de derivá-lo olhando o próprio grupo). O candidato precisa (1) existir,
// (2) pertencer ao MESMO Autor do grupo filho — um grupo nunca aponta pra
// pai de outro Autor — e (3) deixar a ÁRVORE INTEIRA resultante dentro de
// NIVEL_MAXIMO_GRUPO: não basta o candidato estar num nível que aceite
// filho (nivelGrupo(pai) < NIVEL_MAXIMO_GRUPO) — se o próprio `grupoId`
// já tiver descendentes (um grupo com filhos sendo reatribuído pra um
// novo pai, não só um cadastro novo), a subárvore dele inteira desce
// junto, e é o nível mais fundo dessa subárvore depois de mover que
// precisa caber, não só o do grupo movido. Bug real corrigido
// 27/09/2026: antes só olhava o nível do candidato a pai, então
// reatribuir um grupo que já tinha neto podia empurrar esse neto além do
// teto sem aviso nenhum (mesma checagem que `mesclarGrupos` já fazia do
// lado da mesclagem, só que faltava aqui do lado do "Grupo pai"). Também
// recusa o grupo apontar pra si mesmo e recusa ciclo (um grupo virar pai
// de um dos seus próprios ancestrais, o que só pode acontecer escolhendo
// como pai um descendente do próprio grupo em edição). Devolve o `paiId`
// válido ou `null` (silenciosamente recusa em vez de lançar erro, mesmo
// estilo defensivo do resto do arquivo) — quem chama decide se avisa o
// usuário.
export function obterGrupoPaiValido(dbRef, grupoId, autorId, paiIdCandidato) {
    if (paiIdCandidato == null) return null;
    if (paiIdCandidato == grupoId) return null;
    const pai = dbRef.grupos?.find((g) => g.id == paiIdCandidato);
    if (!pai) return null;
    if (pai.autorId != autorId) return null;
    if (nivelGrupo(dbRef, pai.id) + 1 + alturaSubarvoreGrupo(dbRef, grupoId) > NIVEL_MAXIMO_GRUPO) {
        return null;
    }
    let atual = pai;
    let guarda = 0;
    while (atual?.paiId != null && guarda < 10) {
        if (atual.paiId == grupoId) return null;
        atual = dbRef.grupos?.find((g) => g.id == atual.paiId);
        guarda++;
    }
    return pai.id;
}

// Resolve (nome, autorId) → Época (Período Biográfico) no cadastro
// central, criando uma nova se ainda não existir (dedup por nome DENTRO
// do mesmo Autor, mesmo raciocínio de obterOuCriarGrupoPorNome acima —
// decisão de 27/09/2026, "período biográfico tem essa mesma
// característica"). Usada por forms.js ao gravar o campo "Período
// Biográfico" do modal de Poema — texto digitado, resolvido/criado no
// submit, mesmo caminho de obterOuCriarAutorPorNome (não chip de lista,
// já que só existe uma Época por poema).
export function obterOuCriarEpocaPorNome(nome, autorId, { evento = false } = {}) {
    const nomeLimpo = String(nome ?? '').trim();
    if (!nomeLimpo) return null;
    let epoca = db.epocas.find((e) => e.nome === nomeLimpo && e.autorId == autorId);
    if (!epoca) {
        epoca = {
            id: gerarId(),
            nome: nomeLimpo,
            notas: '',
            autorId,
            inicio: null,
            fim: null,
            esferas: [],
            categorias: [],
            pessoasEnvolvidas: [],
            relacoes: [],
            pertenceA: [],
            ...(evento ? { evento: true } : {}),
        };
        db.epocas.push(epoca);
    }
    return epoca;
}

// Mesmo padrão de obterOuCriarEpocaPorNome, pro cadastro central de
// Período Histórico — mais simples (sem o texto de relacionamento, que não se
// aplica a um período histórico).
export function obterOuCriarPeriodoHistoricoPorNome(nome, { evento = false } = {}) {
    const nomeLimpo = String(nome ?? '').trim();
    if (!nomeLimpo) return null;
    let periodo = db.periodosHistoricos.find((p) => p.nome === nomeLimpo);
    if (!periodo) {
        periodo = {
            id: gerarId(),
            nome: nomeLimpo,
            notas: '',
            regiao: [],
            inicio: null,
            fim: null,
            pertenceA: [],
            fontes: [],
            esferas: [],
            categorias: [],
            ...(evento ? { evento: true } : {}),
        };
        db.periodosHistoricos.push(periodo);
    }
    return periodo;
}

// Migração: cadastros de Período Histórico criados antes de `inicio`/
// `fim` existirem (ver decisão de guardar a data no cadastro central,
// não por texto — mesmo raciocínio de mesclarPeriodosHistoricos abaixo)
// ficam sem essas chaves — preenche com `null` pra não quebrar código
// que espera `periodo.inicio`/`fim` existirem. Idempotente: só toca
// quem está com a chave ausente (`undefined`); um `fim` já gravado como
// `null` explícito (evento sem data de término) não é reescrito.
export function migrarDatasPeriodoHistorico(periodosHistoricos) {
    (periodosHistoricos || []).forEach((p) => {
        if (p.inicio === undefined) p.inicio = null;
        if (p.fim === undefined) p.fim = null;
    });
}
migrarDatasPeriodoHistorico(db.periodosHistoricos);

// Períodos de fábrica renomeados: o registro é renomeado no lugar (mesmo id,
// então textos, datas e notas continuam ligados) em vez de a migração dos
// embutidos criar um novo ao lado. A região só é trocada pela do seed se
// ainda for a antiga, sem edição da pessoa. Quem tinha excluído o período de
// propósito (nome em `ocultos`) continua sem ele sob o nome novo. Idempotente.
const PERIODOS_HISTORICOS_RENOMEADOS = [
    {
        de: 'Revolução Industrial (primeira fase)',
        para: 'Primeira Revolução Industrial',
        regiaoAntiga: ['Inglaterra', 'Europa'],
    },
];

export function renomearPeriodosHistoricosDeFabrica(periodosHistoricos, ocultos = []) {
    PERIODOS_HISTORICOS_RENOMEADOS.forEach(({ de, para, regiaoAntiga }) => {
        const modelo = DADOS_SEED_PERIODOS_HISTORICOS.find((p) => p.nome === para);
        const antigo = periodosHistoricos.find((p) => p.nome === de && p.embutido !== false);
        const novoJaExiste = periodosHistoricos.some((p) => p.nome === para);
        if (antigo && !novoJaExiste) {
            antigo.nome = para;
            antigo.embutido = true;
            if (modelo && mesmaRegiao(antigo.regiao, regiaoAntiga)) {
                antigo.regiao = normalizarRegiao(modelo.regiao);
            }
        }
        const idx = ocultos.indexOf(de);
        if (idx !== -1) {
            ocultos.splice(idx, 1);
            if (!ocultos.includes(para)) ocultos.push(para);
        }
    });
}

// Migração aditiva: mesmo raciocínio de migrarMovimentosEscolasEmbutidos
// (ver comentário lá) — instalação que já tinha `periodosHistoricos`
// (mesmo que `[]`, ou já com cadastro próprio do usuário) nunca passa
// pelo `if (!db.periodosHistoricos)` lá em cima, então os períodos de
// DADOS_SEED_PERIODOS_HISTORICOS (curados com o Victor, 28/09/2026 — ver
// decisoes.md) só chegariam sozinhos em instalação nova. Casa por nome
// contra o seed, pula quem a pessoa já excluiu de propósito (registrado
// em periodosHistoricosOcultos por _removerParaExclusao) e só cria o que
// nem chegou a existir — idempotente, e não mexe em período cadastrado
// pelo próprio usuário (nome fora do seed), inclusive se por coincidência
// tiver o mesmo nome de um item de fábrica e ainda não tiver `embutido`
// marcado (aí só ganha a chave, sem duplicar nem perder o que a pessoa
// já tinha preenchido em notas/datas).
export function migrarPeriodosHistoricosEmbutidos(periodosHistoricos, ocultos = []) {
    renomearPeriodosHistoricosDeFabrica(periodosHistoricos, ocultos);
    const nomesSeed = new Set(DADOS_SEED_PERIODOS_HISTORICOS.map((p) => p.nome));
    periodosHistoricos.forEach((p) => {
        if (p.embutido === undefined && nomesSeed.has(p.nome)) p.embutido = true;
    });

    DADOS_SEED_PERIODOS_HISTORICOS.forEach((modelo) => {
        if (ocultos.includes(modelo.nome)) return;
        const jaExiste = periodosHistoricos.some((p) => p.embutido && p.nome === modelo.nome);
        if (jaExiste) return;
        periodosHistoricos.push({
            id: gerarId(),
            nome: modelo.nome,
            embutido: true,
            notas: modelo.notas,
            regiao: normalizarRegiao(modelo.regiao),
            inicio: _dataParcialPeriodoHistoricoDoSeed(modelo.ini, modelo.iniAprox),
            fim: _dataParcialPeriodoHistoricoDoSeed(modelo.fim, modelo.fimAprox),
            fontes: fontesDeFabricaDoPeriodoHistorico(modelo.nome),
            ...(modelo.evento ? { evento: true } : {}),
        });
    });
}
migrarPeriodosHistoricosEmbutidos(db.periodosHistoricos, db.periodosHistoricosOcultos);

// Evento de fábrica, uma única vez por acervo (16/10/2026). `evento` é
// ausente quando não é evento (nunca gravado como `false`), então "só marcar
// o indefinido" remarcaria o período toda vez que a pessoa o desmarcasse. A
// marca `eventoDeFabricaAplicado` separa os dois casos: na primeira vez, o
// período de fábrica que o seed define como evento (hoje só a Semana de Arte
// Moderna) e ainda sem marca ganha `evento: true`; depois disso nada é
// tocado, nem um período desmarcado de propósito. Cadastro da própria pessoa
// (`embutido === false`) nunca é tocado. Idempotente.
export function aplicarEventoDeFabricaUmaVez(banco) {
    if (banco.eventoDeFabricaAplicado === true) return;
    const nomesEvento = new Set(
        DADOS_SEED_PERIODOS_HISTORICOS.filter((m) => m.evento).map((m) => m.nome),
    );
    (banco.periodosHistoricos || []).forEach((p) => {
        if (p.embutido !== true || !nomesEvento.has(p.nome)) return;
        if (p.evento === undefined) p.evento = true;
    });
    banco.eventoDeFabricaAplicado = true;
}
aplicarEventoDeFabricaUmaVez(db);

// Fontes (14/10/2026): campo que nunca existiu no registro de fábrica (casado
// por nome, como a região) recebe as fontes do seed uma única vez. Depois
// disso o campo existe e nada é sobrescrito, nem uma lista que a pessoa tenha
// esvaziado de propósito. Cadastro da própria pessoa (embutido === false)
// nasce sem fontes, e período com nome fora do seed fica com `[]`. Toda lista
// é saneada (lixo e repetição saem). Idempotente. Precisa rodar DEPOIS de
// migrarPeriodosHistoricosEmbutidos (é ela que renomeia os períodos de fábrica
// e marca `embutido` por nome nos itens antigos).
export function migrarFontesPeriodosHistoricos(periodosHistoricos) {
    (periodosHistoricos || []).forEach((p) => {
        if (p.fontes === undefined && p.embutido !== false) {
            p.fontes = fontesDeFabricaDoPeriodoHistorico(p.nome);
        }
        p.fontes = normalizarFontes(p.fontes);
    });
}
migrarFontesPeriodosHistoricos(db.periodosHistoricos);

// Migração: `regiao` nasceu depois do seed de Período Histórico. Só toca
// quem está com a chave ausente (`undefined`): item de fábrica ganha a
// região do seed (por nome); qualquer outro (cadastro do próprio usuário)
// ganha `''`. Um `regiao` já gravado — inclusive `''` apagado de propósito
// — nunca é reescrito, então isto é idempotente e não desfaz edição.
// Precisa rodar DEPOIS de migrarPeriodosHistoricosEmbutidos (é ela que
// marca `embutido` por nome nos itens antigos).
//
// A região é uma lista de lugares: o texto antigo com barras
// ("Inglaterra/Europa") vira array aqui, para qualquer registro.
export function migrarRegiaoPeriodoHistorico(periodosHistoricos) {
    const regiaoPorNome = new Map(DADOS_SEED_PERIODOS_HISTORICOS.map((p) => [p.nome, p.regiao]));
    (periodosHistoricos || []).forEach((p) => {
        if (p.regiao === undefined) {
            p.regiao = p.embutido && regiaoPorNome.has(p.nome) ? regiaoPorNome.get(p.nome) : [];
        }
        p.regiao = normalizarRegiao(p.regiao);
    });
}
migrarRegiaoPeriodoHistorico(db.periodosHistoricos);

// Migração: a marca "c." (`aprox`) nasceu depois do seed de Período
// Histórico. Item de fábrica cujo seed marca a data como aproximada ganha a
// marca só se a data ainda for a do seed (só o ano, igual) e sem `aprox`
// gravado. O formulário sempre grava `aprox` (true ou false) quando há data,
// então uma data que a pessoa já salvou nunca é reescrita. Idempotente.
export function migrarAproxPeriodosHistoricos(periodosHistoricos) {
    DADOS_SEED_PERIODOS_HISTORICOS.forEach((modelo) => {
        const p = (periodosHistoricos || []).find((x) => x.embutido && x.nome === modelo.nome);
        if (!p) return;
        [
            ['inicio', modelo.ini, modelo.iniAprox],
            ['fim', modelo.fim, modelo.fimAprox],
        ].forEach(([campo, seedData, aprox]) => {
            const d = p[campo];
            if (!aprox || !d || d.aprox !== undefined) return;
            if (d.ano === seedData[2] && d.dia == null && d.mes == null) {
                p[campo] = { ...d, aprox: true };
            }
        });
    });
}
migrarAproxPeriodosHistoricos(db.periodosHistoricos);

// Hierarquia: `pertenceA` é a lista de ids dos períodos pais (o primeiro é o
// principal; ver periodos-historicos-hierarquia.js). Instalação antiga não
// tem o campo; esta migração cria a lista vazia, tira id que não existe e
// desfaz ciclo de dado corrompido. Idempotente. Roda depois da migração dos
// períodos de fábrica, que cria registros sem o campo.
export function migrarHierarquiaPeriodosHistoricos(periodosHistoricos) {
    return sanearHierarquiaDePeriodos(periodosHistoricos || []);
}
migrarHierarquiaPeriodosHistoricos(db.periodosHistoricos);
// Esfera e Categoria (15/10/2026): depois dos períodos de fábrica (é a
// migração deles que cria os que faltam), porque a classificação de fábrica
// é casada por nome. Ver periodos-historicos-campos.js.
migrarClassificacaoPeriodosHistoricos(db.periodosHistoricos);
migrarOpcoesPeriodoHistorico(db);

// "Faz parte de" entre Períodos Biográficos (`db.epocas`): mesmo `pertenceA` do
// Histórico (lista de ids de pais, o primeiro é o principal). Registro antigo
// não tem o campo; a migração cria a lista vazia, tira id que não existe e
// desfaz ciclo de dado corrompido. Só estrutura: as regras de intervalo e de
// autor valem ao salvar no modal, nunca aqui (importar ou restaurar um backup
// não pode falhar por causa delas). Idempotente.
export function migrarHierarquiaPeriodosBiograficos(epocas) {
    return sanearHierarquiaDePeriodos(epocas || []);
}
// Depois dos períodos de fábrica e da hierarquia: só então dá pra saber
// quais ids de período ainda existem.
migrarPeriodosHistoricosMultiplos(db.poemas, db.periodosHistoricos);
migrarPeriodosHistoricosMultiplos(db.prosas, db.periodosHistoricos);
migrarPeriodosBiograficosMultiplos(db.poemas);
migrarPeriodosBiograficosMultiplos(db.prosas);

// Período Biográfico (`epocas`) ganhou datas oficiais no cadastro
// (`inicio`/`fim`, datas parciais { dia, mes, ano } — mesmo formato de
// Período Histórico). Independem das datas por texto (`epocaRetratada`):
// não alimentam o modal do texto nem são alimentadas por ele. Registros
// antigos ficam null, sem tentar deduzir dos textos (o texto pode retratar
// um período em data diferente da que foi escrito).
export function migrarDatasEpoca(epocas) {
    (epocas || []).forEach((e) => {
        if (e.inicio === undefined) e.inicio = null;
        if (e.fim === undefined) e.fim = null;
    });
}
migrarDatasEpoca(db.epocas);
// Bloco 3: Esfera, Categoria e Pessoas envolvidas (listas vazias nos
// períodos antigos; o `contextoRelacao` antigo é absorvido, ver o módulo).
migrarCamposPeriodoBiografico(db.epocas);
migrarOpcoesPeriodoBiografico(db);
migrarHierarquiaPeriodosBiograficos(db.epocas);

// Mesmo padrão de obterOuCriarPeriodoHistoricoPorNome acima, pro
// cadastro central de Movimento/Escola. Diferente de Época/Autor
// (vínculo único), este é chamado por um campo de chips (Autor e
// Poema/Prosa podem ter vários movimentos) — quem chama decide se
// empilha o id retornado num array já existente.
export function obterOuCriarMovimentoEscolaPorNome(nome) {
    const nomeLimpo = String(nome ?? '').trim();
    if (!nomeLimpo) return null;
    let movimento = db.movimentosEscolas.find((m) => m.nome === nomeLimpo);
    if (!movimento) {
        movimento = {
            id: gerarId(),
            nome: nomeLimpo,
            notas: '',
            inicio: { dia: null, mes: null, ano: null, seculo: null, decada: null },
            fim: { dia: null, mes: null, ano: null, seculo: null, decada: null },
            tipo: '',
            posturaEstetica: '',
            programa: '',
            paiId: null,
            divisao: '',
            generoDivisao: '',
            regiaoOrigem: [],
            valores: [],
            temas: [],
            tecnicas: [],
            tiposComposicao: [],
            lemas: [],
            manifestos: [],
            fontes: [],
        };
        db.movimentosEscolas.push(movimento);
    }
    return movimento;
}

// Migração defensiva: registros de Movimento/Escola criados antes de
// algum campo existir (ou vindos de obterOuCriarMovimentoEscolaPorNome
// numa versão anterior desta função) ficam sem essas chaves — mesmo
// raciocínio de migrarDatasPeriodoHistorico acima, só que cobrindo
// todos os campos novos de uma vez.
export function migrarMovimentosEscolas(movimentosEscolas) {
    (movimentosEscolas || []).forEach((m) => {
        if (m.inicio === undefined)
            m.inicio = { dia: null, mes: null, ano: null, seculo: null, decada: null };
        if (m.fim === undefined)
            m.fim = { dia: null, mes: null, ano: null, seculo: null, decada: null };
        if (m.notas === undefined) m.notas = '';
        if (m.tipo === undefined) m.tipo = '';
        // Campo que nunca existiu no registro: os movimentos de fábrica (casados
        // por nome, como em migrarMovimentosEscolasEmbutidos) recebem a postura do
        // seed uma única vez. Depois disso o campo existe e nada é sobrescrito,
        // nem um vazio que a pessoa tenha deixado de propósito.
        if (m.posturaEstetica === undefined && m.embutido !== false) {
            m.posturaEstetica = POSTURA_ESTETICA_DO_SEED.get(m.nome) || '';
        }
        m.posturaEstetica = normalizarPosturaEstetica(
            POSTURAS_ESTETICAS_RENOMEADAS[m.posturaEstetica] ?? m.posturaEstetica,
        );
        // Mesmo raciocínio da postura: campo que nunca existiu no registro de
        // fábrica recebe o Programa do seed uma única vez.
        if (m.programa === undefined && m.embutido !== false) {
            m.programa = PROGRAMA_DO_SEED.get(m.nome) || '';
        }
        m.programa = normalizarProgramaMovimento(m.programa);
        // Região: array de lugares. Texto antigo ("Brasil/Portugal") vira lista.
        m.regiaoOrigem = normalizarRegiao(m.regiaoOrigem);
        if (!Array.isArray(m.valores)) m.valores = [];
        if (!Array.isArray(m.temas)) m.temas = [];
        if (!Array.isArray(m.tecnicas)) m.tecnicas = [];
        if (!Array.isArray(m.tiposComposicao)) m.tiposComposicao = [];
        if (!Array.isArray(m.lemas)) m.lemas = [];
        if (!Array.isArray(m.manifestos)) m.manifestos = [];
        // Fontes (13/10/2026): campo que nunca existiu no registro de fábrica
        // (casado por nome, como a postura e o programa) recebe as fontes do
        // seed uma única vez. Depois disso o campo existe e nada é
        // sobrescrito, nem uma lista que a pessoa tenha esvaziado de propósito.
        // Cadastro da própria pessoa (embutido === false) nasce sem fontes.
        if (m.fontes === undefined && m.embutido !== false) {
            m.fontes = fontesDeFabricaDaCorrente(m.nome);
        }
        m.fontes = normalizarFontes(m.fontes);
    });
    // Hierarquia (pai, divisão, gênero): campos novos, saneados no conjunto.
    sanearHierarquiaDeCorrentes(movimentosEscolas);
}
migrarMovimentosEscolas(db.movimentosEscolas);

// Migração aditiva: instalação que já tinha `movimentosEscolas` (chave
// presente) nunca passa pelo `if (!db.movimentosEscolas)` lá em cima, então
// um movimento novo entrando em DADOS_SEED_MOVIMENTOS_ESCOLAS (ex.:
// Tropicalismo, curado com o Victor em 27/09/2026 — ver decisoes.md) nunca
// chegaria sozinho em quem já usa o app, ficando só nas instalações novas.
// Mesmo raciocínio de migrarTemplatesEstruturaEmbutidos acima: casa por
// nome contra o seed, pula quem a pessoa já excluiu de propósito (registrado
// em movimentosEscolasOcultos por _removerParaExclusao) e só cria o que
// nem chegou a existir — idempotente, então rodar de novo em quem já tem
// Tropicalismo não duplica.
export function migrarMovimentosEscolasEmbutidos(movimentosEscolas, ocultos = []) {
    // Backfill: `embutido` só passou a existir nesta sessão — a chave
    // Movimento/Escola já rodava há semanas sem esse campo, então quem já
    // usa o app tem os 21 movimentos originais sem ele. Sem isso, nenhum
    // bateria no `jaExiste` abaixo (m.embutido undefined) e a função
    // duplicaria os 21 na primeira vez que rodasse numa instalação
    // existente — casa só por nome contra o próprio seed, e só marca quem
    // ainda não tem a chave (idempotente, não pisa em renomeações manuais
    // já marcadas).
    const nomesSeed = new Set(DADOS_SEED_MOVIMENTOS_ESCOLAS.map((m) => m.nome));
    movimentosEscolas.forEach((m) => {
        if (m.embutido === undefined && nomesSeed.has(m.nome)) m.embutido = true;
    });

    DADOS_SEED_MOVIMENTOS_ESCOLAS.forEach((modelo) => {
        if (ocultos.includes(modelo.nome)) return;
        const jaExiste = movimentosEscolas.some((m) => m.embutido && m.nome === modelo.nome);
        if (jaExiste) return;
        movimentosEscolas.push(_registroDeMovimentoDoSeed(modelo, movimentosEscolas));
    });
}
migrarMovimentosEscolasEmbutidos(db.movimentosEscolas, db.movimentosEscolasOcultos);

// Programa de fábrica, uma única vez por acervo (03/10/2026). O campo já
// existia como '' em quem abriu a versão anterior (migrarMovimentosEscolas
// normaliza o ausente para ''), então "só preencher o indefinido" nunca
// alcançaria esses registros. A marca `programaDeFabricaAplicado` separa os
// dois casos: na primeira vez, os movimentos de fábrica ainda vazios recebem o
// Programa do seed; depois disso nada é sobrescrito, nem um vazio deixado de
// propósito. Cadastro da própria pessoa (nome fora do seed) nunca é tocado.
export function aplicarProgramaDeFabricaUmaVez(banco) {
    if (banco.programaDeFabricaAplicado === true) return;
    (banco.movimentosEscolas || []).forEach((m) => {
        if (m.embutido === false || m.programa) return;
        const doSeed = PROGRAMA_DO_SEED.get(m.nome);
        if (doSeed) m.programa = doSeed;
    });
    banco.programaDeFabricaAplicado = true;
}
aplicarProgramaDeFabricaUmaVez(db);

// Assunto: normaliza o formato (nome em texto, `notas` em texto e, se o
// Assunto ainda vier no formato antigo, `temas` como lista de nomes sem
// vazio nem repetição por caixa/acento) — cobre backup importado à mão,
// edição manual do JSON e qualquer versão futura que acrescente campo.
// O formato atual guarda ids em `temaIds`; a conversão dos nomes antigos
// em ids precisa do cadastro de Temas e por isso acontece em
// `sincronizarTemas` (temas.js), logo depois desta função. Idempotente;
// nunca apaga um Assunto. Roda no load e no importarDB (ver o aviso em
// manutencao/licoes-de-sessao.md sobre migração que fica só num dos dois
// lugares).
export function migrarAssuntos(assuntos) {
    (assuntos || []).forEach((a) => {
        a.nome = String(a.nome ?? '').trim();
        a.notas = typeof a.notas === 'string' ? a.notas : '';
        if (!Array.isArray(a.temas)) return;
        const vistos = new Set();
        a.temas = a.temas
            .map((t) => String(t ?? '').trim())
            .filter((t) => {
                const chave = chaveTema(t);
                if (!chave || vistos.has(chave)) return false;
                vistos.add(chave);
                return true;
            });
    });
}
migrarAssuntos(db.assuntos);
sincronizarTemas(db);
sincronizarEtiquetas(db);
sincronizarTagClusters(db);
sincronizarLocais(db);
sincronizarPersonagens(db);
sincronizarAncorasEco(db);
sincronizarParesIgnorados(db);

// Acrescenta o Tema `temaId` ao Assunto `assuntoId` (usado pela aba
// Temas). Não troca nem remove nada; devolve true só se de fato
// acrescentou — false quando o Assunto ou o Tema não existem ou o Assunto
// já tem esse Tema.
export function adicionarTemaAoAssunto(dbRef, assuntoId, temaId) {
    const assunto = (dbRef.assuntos || []).find((a) => a.id == assuntoId);
    const tema = (dbRef.temas || []).find((t) => t.id == temaId);
    if (!assunto || !tema) return false;
    if (!Array.isArray(assunto.temaIds)) assunto.temaIds = [];
    if (assunto.temaIds.some((id) => id == tema.id)) return false;
    assunto.temaIds.push(tema.id);
    return true;
}

// Migração defensiva do outro lado da relação N:N: Autor, Poema e Prosa
// criados antes deste campo existir ficam com `movimentosEscolasIds`
// undefined — mesmo raciocínio de qualquer array de referência novo já
// usado aqui (ver migrarPessoas/migrarSinalizacoes).
export function migrarMovimentosEscolasIds(itens) {
    (itens || []).forEach((it) => {
        if (!Array.isArray(it.movimentosEscolasIds)) it.movimentosEscolasIds = [];
    });
}
migrarMovimentosEscolasIds(db.autores);
migrarMovimentosEscolasIds(db.poemas);
migrarMovimentosEscolasIds(db.prosas);

// Migração: `autorIds` em Pessoa — quais Autores essa Pessoa está
// associada (pedido do Victor, 27/09/2026: "Pessoas ainda não atribui a
// autores... a ideia seria que tivesse essa atribuição, só que não
// ficasse presa a atribuir a apenas um autor"). Array (N:N), não campo
// único: a mesma Pessoa pode aparecer na vida de mais de um Autor (ex.
// um amigo em comum entre dois autores da Biblioteca), e não é
// obrigatório — diferente de Grupo/Época (que SEMPRE pertencem a um
// Autor, ver migrarGruposAutorId/migrarEpocasAutorId acima), Pessoa
// existe e funciona normalmente sem nenhum Autor atribuído. Por isso o
// backfill aqui é só garantir o array vazio, nunca um Autor padrão
// (mesmo padrão de migrarMovimentosEscolasIds acima, não o de
// migrarGruposAutorId).
// Idempotente: só toca pessoa sem `autorIds`.
export function migrarPessoasAutorIds(pessoas) {
    (pessoas || []).forEach((p) => {
        if (!Array.isArray(p.autorIds)) p.autorIds = [];
    });
}
migrarPessoasAutorIds(db.pessoas);

// `oculto` (boolean) em Pessoa/Grupo — recolhe da lista de gerenciamento
// por padrão sem excluir nem quebrar vínculo com textos/grupos/autores
// (diferente de excluir); eixo ortogonal ao filtro por Autor (ver
// filtroAutorGrupos em render-listas.js e getFiltroAutorPessoas em
// pessoas-acoes.js) — aqui é "isso importa ver agora", lá é "de quem".
// Pedido do Victor, 27/09/2026. Idempotente: só toca quem ainda não tem
// o campo (`undefined`, não `false`, pra registro já migrado com
// `oculto: false` explícito não ser tocado de novo à toa).
export function migrarPessoasOculto(pessoas) {
    (pessoas || []).forEach((p) => {
        if (p.oculto === undefined) p.oculto = false;
    });
}
migrarPessoasOculto(db.pessoas);

// `oculto` (boolean) em Período Biográfico (`db.epocas`) — mesmo eixo da
// Pessoa: esconde o período das listas, seletores, busca e exportações sem
// excluir nem desvincular nada (o texto segue ligado a ele). Útil para
// períodos que são sobre uma relação passada. Idempotente: só toca quem ainda
// não tem o campo.
export function migrarEpocasOculto(epocas) {
    (epocas || []).forEach((e) => {
        if (e.oculto === undefined) e.oculto = false;
    });
}
migrarEpocasOculto(db.epocas);

// `identidadeCisTrans` e `corRaca` na Pessoa (Fase 1, etapa 1c-0): as mesmas
// listas fechadas do Autor (`IDENTIDADES_CIS_TRANS`, `CORES_RACA_AUTOR`).
// Vazio quer dizer "não documentado", nunca "cisgênero" nem "branca".
// Idempotente; valor fora da lista vira vazio, e o resto do registro não é
// tocado.
export function migrarPessoasIdentidade(pessoas) {
    (pessoas || []).forEach((p) => {
        if (!IDENTIDADES_CIS_TRANS.includes(p.identidadeCisTrans)) p.identidadeCisTrans = '';
        if (!CORES_RACA_AUTOR.includes(p.corRaca)) p.corRaca = '';
        // `orientacao` é texto livre com sugestão (como no Autor); vazio quer
        // dizer "não documentado".
        p.orientacao = typeof p.orientacao === 'string' ? p.orientacao.trim() : '';
    });
}
migrarPessoasIdentidade(db.pessoas);

export function migrarGruposOculto(grupos) {
    (grupos || []).forEach((g) => {
        if (g.oculto === undefined) g.oculto = false;
    });
}
migrarGruposOculto(db.grupos);

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

// Núcleo comum de ordenação hierárquica (Livro → Parte → Seção → própria
// sequência), reaproveitado por sortPoemas e sortProsas — Poema e Prosa usam
// exatamente o mesmo esquema de encaixe (paiTipo/paiId nos mesmos 3 níveis,
// ver DEFINICAO_COLUNAS.prosas.vinculo em colunas.js e o comentário de
// livroDaProsa em utils.js), então a lógica de caminho não muda entre os
// dois — só a lista de itens ordenada é que difere.
function sortItensPorEstrutura(itens, livros, partes, secoes) {
    itens.sort((a, b) => {
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
    return itens;
}

export function sortPoemas(poemas, livros, partes, secoes) {
    return sortItensPorEstrutura(poemas, livros, partes, secoes);
}

// Item 1 do plano de integração Poemas/Prosas: Prosa usa o mesmo esquema de
// encaixe (paiTipo/paiId) que Poema, então merece a mesma ordenação
// hierárquica em save() — antes disso, prosas espalhadas em partes/seções
// diferentes só ficavam agrupadas por `sequencia` isolada, ignorando onde
// cada uma está encaixada (ver Prosa e Poema.md, item 4).
export function sortProsas(prosas, livros, partes, secoes) {
    return sortItensPorEstrutura(prosas, livros, partes, secoes);
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

// Trava de salvamento (Fase 13, etapa 13c). Enquanto "Esvaziar o acervo" apaga,
// e nas outras abas que recebem o aviso de que o acervo foi esvaziado, nenhum
// save() pode gravar: um salvamento atrasado regravaria o `db` antigo, que ainda
// está em memória, por cima do acervo já esvaziado. Só a recarga da página
// (ou desbloquearSalvamento, se o apagar falhar antes de mexer em algo) a tira.
let _salvamentoBloqueado = false;
export function bloquearSalvamento() {
    _salvamentoBloqueado = true;
}
export function desbloquearSalvamento() {
    _salvamentoBloqueado = false;
}
export function salvamentoBloqueado() {
    return _salvamentoBloqueado;
}

// Importar renderLists de render.js causaria dependência circular.
// save() aceiona um CustomEvent que render.js escuta.
export function save() {
    if (_salvamentoBloqueado) return;
    sortLivros(db.livros);
    sortPartes(db.partes, db.livros);
    sortSecoes(db.secoes, db.livros, db.partes);
    sortPoemas(db.poemas, db.livros, db.partes, db.secoes);
    sortProsas(db.prosas, db.livros, db.partes, db.secoes);
    sortElementos(db.elementos, db);

    sincronizarTemas(db);
    sincronizarEtiquetas(db);
    sincronizarTagClusters(db);
    sincronizarLocais(db);
    sincronizarPersonagens(db);
    sincronizarAncorasEco(db);
    sincronizarParesIgnorados(db);

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

// Padrões de colunas de um backup: só tabelas conhecidas, só listas bem formadas.
// Backup antigo (sem a chave) ou mal formado vira `{}`.
export function limparPadroesColunas(bruto) {
    const saida = {};
    if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return saida;
    for (const tabela of Object.keys(bruto)) {
        const lista = normalizarPadroesColunas(tabela, bruto[tabela]);
        if (lista.length) saida[tabela] = lista;
    }
    return saida;
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
    db.opcoesPeriodoBiografico = novoDb.opcoesPeriodoBiografico || null;
    db.opcoesPeriodoHistorico = novoDb.opcoesPeriodoHistorico || null;
    // `|| SEED_PERIODOS_HISTORICOS()` (não `|| []`) de propósito, mesmo
    // raciocínio do comentário de movimentosEscolas logo abaixo: um
    // backup tirado antes deste item do roadmap não tem a chave e deve
    // ganhar os períodos pré-cadastrados; um backup mais recente com
    // a chave já presente (mesmo `[]` esvaziado de propósito) é
    // respeitado como está.
    db.periodosHistoricos = novoDb.periodosHistoricos || SEED_PERIODOS_HISTORICOS();
    db.periodosHistoricosOcultos = novoDb.periodosHistoricosOcultos || [];
    // `|| SEED_MOVIMENTOS_ESCOLAS()` (não `|| []`) de propósito: um
    // backup tirado antes deste item do roadmap não tem a chave
    // (undefined) e deve ganhar os movimentos pré-cadastrados, igual a
    // uma instalação nova — um backup mais recente com o campo já
    // presente (mesmo que `[]`, esvaziado de propósito) é respeitado
    // como está, porque array vazio é truthy em JS.
    db.movimentosEscolas = novoDb.movimentosEscolas || SEED_MOVIMENTOS_ESCOLAS();
    db.movimentosEscolasOcultos = novoDb.movimentosEscolasOcultos || [];
    db.assuntos = novoDb.assuntos || [];
    migrarAssuntos(db.assuntos);
    db.temas = novoDb.temas || [];
    sincronizarTemas(db);
    // Só cadastro aqui; a conversão dos textos acontece depois de
    // migrarSinalizacoes e migrarReconhecimentos (mais abaixo), porque um
    // backup antigo ainda traz o campo `sinalizacoes` único.
    db.etiquetas = Array.isArray(novoDb.etiquetas) ? novoDb.etiquetas : [];
    db.tagClusters = Array.isArray(novoDb.tagClusters) ? novoDb.tagClusters : [];
    db.locais = novoDb.locais || [];
    sincronizarLocais(db);
    db.personagens = novoDb.personagens || [];
    sincronizarPersonagens(db);
    db.ecosIgnorados = novoDb.ecosIgnorados || [];
    db.padroesColunas = limparPadroesColunas(novoDb.padroesColunas);
    db.padroesColunasFabricaVersao = Number(novoDb.padroesColunasFabricaVersao) || 0;
    aplicarPadroesColunasDeFabrica(db);
    sincronizarAncorasEco(db);
    sincronizarParesIgnorados(db);
    db.escansoes = novoDb.escansoes || [];
    migrarRegistroTomSonoridade(db.escansoes);
    db.estruturasTextuais = novoDb.estruturasTextuais || [];
    db.templatesEstrutura = novoDb.templatesEstrutura || [];
    db.templatesEstruturaOcultos = novoDb.templatesEstruturaOcultos || [];
    migrarTemplatesEstruturaEmbutidos(db.templatesEstrutura, db.templatesEstruturaOcultos);
    db.moldes = novoDb.moldes || [];
    migrarCamposBloco3Molde(db.moldes);
    migrarStatusPoemas(db.poemas);
    migrarIntertextualidadePoemas(db.poemas);
    migrarReferenciasParaEcos(db.poemas);
    migrarElosReferencias(db.poemas);
    migrarReferenciasExternas(db.poemas);
    migrarReferenciasExternas(db.prosas);
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
    // fica pra trás" já documentado em manutencao/licoes-de-sessao.md; pego
    // ao mexer neste bloco pra Épocas, sem relação direta com o item 3.
    migrarReconhecimentos(db.poemas);
    migrarReconhecimentos(db.prosas);
    sincronizarEtiquetas(db);
    sincronizarTagClusters(db);
    migrarEpocas(db);
    migrarDatasPeriodoHistorico(db.periodosHistoricos);
    migrarPeriodosHistoricosEmbutidos(db.periodosHistoricos, db.periodosHistoricosOcultos);
    migrarFontesPeriodosHistoricos(db.periodosHistoricos);
    migrarRegiaoPeriodoHistorico(db.periodosHistoricos);
    migrarAproxPeriodosHistoricos(db.periodosHistoricos);
    migrarHierarquiaPeriodosHistoricos(db.periodosHistoricos);
    migrarClassificacaoPeriodosHistoricos(db.periodosHistoricos);
    migrarOpcoesPeriodoHistorico(db);
    migrarPeriodosHistoricosMultiplos(db.poemas, db.periodosHistoricos);
    migrarPeriodosHistoricosMultiplos(db.prosas, db.periodosHistoricos);
    migrarPeriodosBiograficosMultiplos(db.poemas);
    migrarPeriodosBiograficosMultiplos(db.prosas);
    migrarDatasEpoca(db.epocas);
    migrarCamposPeriodoBiografico(db.epocas);
    migrarOpcoesPeriodoBiografico(db);
    migrarHierarquiaPeriodosBiograficos(db.epocas);
    migrarMovimentosEscolas(db.movimentosEscolas);
    migrarMovimentosEscolasEmbutidos(db.movimentosEscolas, db.movimentosEscolasOcultos);
    db.programaDeFabricaAplicado = novoDb.programaDeFabricaAplicado === true;
    aplicarProgramaDeFabricaUmaVez(db);
    db.eventoDeFabricaAplicado = novoDb.eventoDeFabricaAplicado === true;
    aplicarEventoDeFabricaUmaVez(db);
    migrarMovimentosEscolasIds(db.autores);
    migrarMovimentosEscolasIds(db.poemas);
    migrarMovimentosEscolasIds(db.prosas);
    migrarPessoasAutorIds(db.pessoas);
    // migrarGruposAutorId/migrarEpocasAutorId só rodavam no load do
    // módulo (topo deste arquivo), nunca aqui em importarDB — mesmo
    // risco de "migração que fica pra trás" que migrarReconhecimentos
    // teve (ver comentário logo acima). Um backup de antes de 27/09/2026
    // restaurado por aqui traria Grupos/Épocas sem `autorId`, quebrando
    // tudo que depende dele (obterGrupoPaiValido, nivelGrupo, a própria
    // listagem por Autor). Corrigido nesta sessão, junto da migração de
    // Pessoa acima.
    migrarGruposAutorId(db);
    migrarEpocasAutorId(db);
    migrarPessoasOculto(db.pessoas);
    migrarEpocasOculto(db.epocas);
    migrarPessoasIdentidade(db.pessoas);
    migrarGruposOculto(db.grupos);

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
 * @param {string} nomeArquivo — nome do arquivo baixado (o "Backup completo"
 *   passa um nome com a data, para casar com o arquivo de extras).
 */
export async function exportarJSON(
    incluirCapas = false,
    nomeArquivo = 'arquivo_poetico_backup.json',
) {
    const payload = incluirCapas ? { ...db, _capasBase64: await exportarTodasCapasBase64() } : db;

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', nomeArquivo);
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
    epocas: 'Período Biográfico',
    periodosHistoricos: 'Período Histórico',
    movimentosEscolas: 'Corrente literária',
    assuntos: 'Assunto',
    temas: 'Tema',
    locais: 'Local',
    personagens: 'Personagem',
    escansoes: 'Escansão',
    estruturasTextuais: 'Progressão Morfofuncional',
    templatesEstrutura: 'Template de Progressão',
    moldes: 'Molde',
};

// Plural + particípio com concordância de gênero certa pro toast de
// exclusão em massa ("3 prosas excluídas", não "excluídos"). Só cobre
// poemas/prosas (única exclusão em massa que existe hoje — ver
// excluirSelecao(tabela) em selecao-massa.js);
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
 * a ele (excluir o Grupo não exclui a Pessoa, só tira ela desse grupo —
 * ela pode pertencer a vários, sobreposição é o ponto do campo),
 * poemas/prosas cujo `gruposDiretos` aponta pra ele sem passar por
 * nenhuma Pessoa (ver criarGrupoDeGruposDiretos em editor.js) e, desde a
 * hierarquia multinível (decisão de 27/09/2026, teto em NIVEL_MAXIMO_GRUPO),
 * os subgrupos que têm
 * esse Grupo como pai — excluir um Grupo NÃO exclui os filhos, só
 * promove eles um nível, herdando o `paiId` que o próprio Grupo
 * excluído tinha (ver `_removerParaExclusao`); aqui só contamos quantos
 * são, pro aviso.
 */
export function calcularImpactoExclusaoGrupo(dbRef, grupoId) {
    const pessoasIds = (dbRef.pessoas || [])
        .filter((p) => (p.grupoIds || []).includes(grupoId))
        .map((p) => p.id);
    const achaGrupoDireto = (item) => (item.gruposDiretos || []).includes(grupoId);
    const poemasIds = (dbRef.poemas || []).filter(achaGrupoDireto).map((p) => p.id);
    const prosasIds = (dbRef.prosas || []).filter(achaGrupoDireto).map((p) => p.id);
    const subgruposIds = (dbRef.grupos || []).filter((g) => g.paiId == grupoId).map((g) => g.id);
    return { pessoasIds, poemasIds, prosasIds, subgruposIds };
}

/**
 * Quem referencia o Autor `autorId` — poemas e prosas onde ele está
 * vinculado (independente do papel), e, desde a decisão de 27/09/2026
 * ("família de um autor, família de outro" / "período biográfico tem
 * essa mesma característica"), também os Grupos e Épocas (Período
 * Biográfico) que pertencem a ele — esses dois cadastros são exclusivos
 * de um Autor (não têm sentido sem ele), então excluir o Autor exclui
 * os dois EM CASCATA (decisão explícita, diferente do resto desta
 * função, que só desvincula sem apagar nada). Um Grupo de nível 1 do
 * Autor e seus subgrupos são sempre do MESMO Autor (`obterGrupoPaiValido`
 * garante isso), então não sobra filho órfão de outro Autor ao apagar
 * a lista inteira junto.
 *
 * `pessoasIds` (nova, 27/09/2026) segue o espírito OPOSTO ao de Grupo/
 * Época: Pessoa não é exclusiva de um Autor (`autorIds` é N:N, ver
 * migrarPessoasAutorIds), então excluir o Autor NÃO exclui nem esvazia
 * a Pessoa — só tira esse Autor específico do array dela, igual
 * calcularImpactoExclusaoMovimentoEscola faz com `movimentosEscolasIds`.
 */
export function calcularImpactoExclusaoAutor(dbRef, autorId) {
    const acha = (item) => (item.autoria || []).some((a) => a.autorId == autorId);
    return {
        poemasIds: (dbRef.poemas || []).filter(acha).map((p) => p.id),
        prosasIds: (dbRef.prosas || []).filter(acha).map((p) => p.id),
        gruposIds: (dbRef.grupos || []).filter((g) => g.autorId == autorId).map((g) => g.id),
        epocasIds: (dbRef.epocas || []).filter((e) => e.autorId == autorId).map((e) => e.id),
        pessoasIds: (dbRef.pessoas || [])
            .filter((p) => (p.autorIds || []).includes(autorId))
            .map((p) => p.id),
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
    const acha = (item) => periodosBiograficosDoItem(item).some((x) => x.epocaId == epocaId);
    return {
        poemasIds: (dbRef.poemas || []).filter(acha).map((p) => p.id),
        prosasIds: (dbRef.prosas || []).filter(acha).map((p) => p.id),
    };
}

/**
 * Quem referencia o Período Histórico `periodoHistoricoId` — poemas e
 * prosas com esse link direto (campo simples, sem sub-objeto de
 * recorte/datas — diferente de epocaRetratada). Mesmo espírito de
 * calcularImpactoExclusaoEpoca acima: excluir o Período Histórico não
 * exclui o texto, só desvincula.
 */
export function calcularImpactoExclusaoPeriodoHistorico(dbRef, periodoHistoricoId) {
    const acha = (item) =>
        periodosHistoricosIdsDoItem(item).some((x) => String(x) === String(periodoHistoricoId));
    return {
        poemasIds: (dbRef.poemas || []).filter(acha).map((p) => p.id),
        prosasIds: (dbRef.prosas || []).filter(acha).map((p) => p.id),
        // Períodos que estão dentro deste (não contam como "texto"; sobem
        // para os pais dele na exclusão e passam ao destino na mesclagem).
        filhosIds: filhosDoPeriodo(dbRef.periodosHistoricos || [], periodoHistoricoId),
    };
}

/**
 * Textos ligados ao Período Histórico `periodoHistoricoId` e, com
 * `comDentro`, também aos períodos que estão dentro dele (cada texto conta
 * uma vez). Serve ao "Ver textos" e à contagem do card: o texto se liga ao
 * período mais específico, e o período que o contém o alcança por aqui.
 */
export function textosDoPeriodoHistorico(dbRef, periodoHistoricoId, { comDentro = false } = {}) {
    const ids = new Set([String(periodoHistoricoId)]);
    if (comDentro) {
        descendentesDoPeriodo(dbRef.periodosHistoricos || [], periodoHistoricoId).forEach((d) =>
            ids.add(String(d)),
        );
    }
    // Qualquer um dos períodos do texto basta; cada texto entra uma só vez.
    const acha = (item) => periodosHistoricosIdsDoItem(item).some((x) => ids.has(String(x)));
    return {
        poemasIds: (dbRef.poemas || []).filter(acha).map((p) => p.id),
        prosasIds: (dbRef.prosas || []).filter(acha).map((p) => p.id),
    };
}

/**
 * Quem referencia o Movimento/Escola `movimentoEscolaId` — diferente de
 * Período Histórico (link direto), aqui a busca é em três arrays
 * (`movimentosEscolasIds`, dos dois lados da relação N:N): Autor,
 * Poema e Prosa. Excluir o Movimento/Escola não exclui ninguém nem
 * nenhum texto, só tira o id do array de quem o tinha.
 */
export function calcularImpactoExclusaoMovimentoEscola(dbRef, movimentoEscolaId) {
    const acha = (item) => (item.movimentosEscolasIds || []).includes(movimentoEscolaId);
    return {
        autoresIds: (dbRef.autores || []).filter(acha).map((a) => a.id),
        poemasIds: (dbRef.poemas || []).filter(acha).map((p) => p.id),
        prosasIds: (dbRef.prosas || []).filter(acha).map((p) => p.id),
    };
}

/**
 * Quem referencia o Poema `poemaId` do lado de Moldes — o(s) Molde(s)
 * de origem que foram promovidos a esse Poema (`status: 'promovido'`,
 * `poemaId` apontando pra ele; ver "Promover a Poema" em forms.js).
 * Mesmo espírito de calcularImpactoExclusaoPessoa/Autor/Época acima:
 * excluir o Poema não pode deixar o Molde apontando pra um id que não
 * existe mais.
 */
export function calcularImpactoExclusaoPoema(dbRef, poemaId) {
    const moldesIds = (dbRef.moldes || []).filter((m) => m.poemaId == poemaId).map((m) => m.id);
    return { moldesIds };
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
 * `origemId` (em `item.pessoas`, Poema e Prosa), une `grupoIds` e
 * `autorIds` das duas (sem duplicar) e remove a origem do cadastro. Se
 * um mesmo item já vinculava as duas pessoas (raro, mas possível — ex.
 * cadastradas separadamente antes de alguém perceber que eram a mesma),
 * os `papeis` das duas entradas são unidos numa só, em vez de deixar
 * duas entradas pra mesma pessoa (agora idêntica) no mesmo item.
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

    // A âncora de Eco que apontava para a origem passa para o destino.
    redirecionarAncora(dbRef, 'pessoa', origemId, destinoId);
    // Bloco 3: a origem também vira o destino nas Pessoas envolvidas dos períodos.
    mesclarPessoaNosPeriodos(dbRef, origemId, destinoId);

    destino.grupoIds = [...new Set([...(destino.grupoIds || []), ...(origem.grupoIds || [])])];
    destino.autorIds = [...new Set([...(destino.autorIds || []), ...(origem.autorIds || [])])];
    // Identidade e cor/raça: o destino nunca é sobrescrito; só preenche o que
    // estava vazio.
    ['orientacao', 'identidadeCisTrans', 'corRaca'].forEach((campo) => {
        if (!destino[campo] && origem[campo]) destino[campo] = origem[campo];
    });
    dbRef.pessoas = dbRef.pessoas.filter((p) => p.id != origemId);
}

/**
 * Reatribui pra `destinoId` todo `epocaRetratada.epocaId` que apontava
 * pra `origemId` (Poema e Prosa) e remove a origem do cadastro.
 * As Notas da origem preenchem o destino só se
 * o destino estiver com o campo vazio — nunca sobrescreve o que a
 * sobrevivente já tinha preenchido (mesmo critério de "só entra se
 * estiver vazio" já usado em aplicarSugestaoEpoca, forms.js).
 */
export function mesclarEpocas(dbRef, origemId, destinoId) {
    if (origemId == destinoId) return;
    const origem = dbRef.epocas?.find((e) => e.id == origemId);
    const destino = dbRef.epocas?.find((e) => e.id == destinoId);
    if (!origem || !destino) return;
    // Época pertence a um Autor específico desde 27/09/2026 — mesclar só
    // faz sentido dentro do mesmo Autor (senão o Período Biográfico
    // "herdaria" pra outro Autor, o que não tem significado).
    if (origem.autorId != destino.autorId) return;

    ['poemas', 'prosas'].forEach((col) => {
        (dbRef[col] || []).forEach((it) => {
            if (!it.epocaRetratada) return;
            const lista = periodosBiograficosDoItem(it);
            if (!lista.some((x) => x.epocaId == origemId)) return;
            // Se o texto já tinha o destino, os dois viram um só (o recorte do
            // destino vale; se ele não tinha, herda o da origem).
            const jaTemDestino = lista.some((x) => x.epocaId == destinoId);
            const novaLista = [];
            lista.forEach((x) => {
                if (x.epocaId == origemId) {
                    if (jaTemDestino) {
                        const dest = lista.find((y) => y.epocaId == destinoId);
                        if (!dest.recorte && x.recorte) dest.recorte = x.recorte;
                        return;
                    }
                    novaLista.push({ epocaId: destinoId, recorte: x.recorte });
                } else {
                    novaLista.push(x);
                }
            });
            definirPeriodosBiograficosDoItem(it, novaLista);
        });
    });

    if (!destino.notas && origem.notas) {
        destino.notas = origem.notas;
    }
    // Datas oficiais do cadastro: o destino mantém as suas; só herda da
    // origem o que estiver vazio (mesmo tratamento das notas).
    if (!destino.inicio && origem.inicio) destino.inicio = origem.inicio;
    if (!destino.fim && origem.fim) destino.fim = origem.fim;
    // Bloco 3: Esfera, Categoria e Pessoas envolvidas somam.
    mesclarCamposDosPeriodos(destino, origem);
    // "Faz parte de": os períodos de dentro da origem passam ao destino, e o
    // destino herda os pais da origem se não tinha nenhum (sem fechar ciclo).
    mesclarHierarquiaDePeriodos(dbRef.epocas, origem, destino);
    dbRef.epocas = dbRef.epocas.filter((e) => e.id != origemId);
}

/**
 * Mescla dois Grupos do MESMO Autor (recusa silenciosamente se forem de
 * Autores diferentes, mesma guarda de mesclarEpocas acima — nome de
 * Grupo só é único dentro de um Autor desde 27/09/2026). Reatribui pra
 * `destinoId` todo `grupoIds` de Pessoa e `gruposDiretos` de Poema/Prosa
 * que apontava pra `origemId` (sem duplicar), reatribui os subgrupos da
 * origem (`paiId == origemId`) pro destino, e remove a origem do
 * cadastro. Se a origem era ela mesma um subgrupo (`paiId` não-nulo) e o
 * destino também, o `paiId` do destino não muda — mesclar dois
 * subgrupos não promove nem rebaixa ninguém, só une os vínculos.
 *
 * Também recusa (silenciosamente, nada é alterado) quando reatribuir a
 * subárvore da origem pro destino ultrapassaria NIVEL_MAXIMO_GRUPO — ex.:
 * origem é nível 1 com um subgrupo que por sua vez tem os seus próprios
 * subgrupos, e destino já está fundo na hierarquia; a subárvore
 * reatribuída estouraria o teto. Sem essa checagem a mesclagem poderia
 * empurrar subgrupo pra um nível que nem o cadastro normal
 * (obterGrupoPaiValido) permitiria criar.
 */
export function mesclarGrupos(dbRef, origemId, destinoId) {
    if (origemId == destinoId) return;
    const origem = dbRef.grupos?.find((g) => g.id == origemId);
    const destino = dbRef.grupos?.find((g) => g.id == destinoId);
    if (!origem || !destino) return;
    if (origem.autorId != destino.autorId) return;
    if (nivelGrupo(dbRef, destinoId) + alturaSubarvoreGrupo(dbRef, origemId) > NIVEL_MAXIMO_GRUPO) {
        return;
    }

    (dbRef.pessoas || []).forEach((p) => {
        if (!Array.isArray(p.grupoIds) || !p.grupoIds.includes(origemId)) return;
        p.grupoIds = p.grupoIds.filter((gid) => gid != origemId);
        if (!p.grupoIds.includes(destinoId)) p.grupoIds.push(destinoId);
    });

    ['poemas', 'prosas'].forEach((col) => {
        (dbRef[col] || []).forEach((it) => {
            if (!Array.isArray(it.gruposDiretos) || !it.gruposDiretos.includes(origemId)) return;
            it.gruposDiretos = it.gruposDiretos.filter((gid) => gid != origemId);
            if (!it.gruposDiretos.includes(destinoId)) it.gruposDiretos.push(destinoId);
        });
    });

    (dbRef.grupos || []).forEach((g) => {
        if (g.paiId == origemId) g.paiId = destinoId;
    });

    dbRef.grupos = dbRef.grupos.filter((g) => g.id != origemId);
}

/**
 * Mesmo espírito de mesclarEpocas acima, pro cadastro de Período
 * Histórico — mais simples, porque o vínculo no Poema/Prosa é um
 * `periodoHistoricoId` direto (sem sub-objeto), e o cadastro só tem
 * nome/notas.
 */
export function mesclarPeriodosHistoricos(dbRef, origemId, destinoId) {
    if (origemId == destinoId) return;
    const origem = dbRef.periodosHistoricos?.find((p) => p.id == origemId);
    const destino = dbRef.periodosHistoricos?.find((p) => p.id == destinoId);
    if (!origem || !destino) return;

    ['poemas', 'prosas'].forEach((col) => {
        (dbRef[col] || []).forEach((it) => {
            const lista = periodosHistoricosIdsDoItem(it);
            if (!lista.some((x) => x == origemId)) return;
            // A vira B no mesmo lugar; se o texto já tinha B, não repete.
            const trocada = lista.map((x) => (x == origemId ? destinoId : x));
            it.periodosHistoricosIds = periodosHistoricosIdsDoItem({
                periodosHistoricosIds: trocada,
            });
            delete it.periodoHistoricoId;
        });
    });

    if (!destino.notas && origem.notas) {
        destino.notas = origem.notas;
    }
    if (!destino.inicio && origem.inicio) {
        destino.inicio = origem.inicio;
    }
    if (!destino.fim && origem.fim) {
        destino.fim = origem.fim;
    }
    if (normalizarRegiao(destino.regiao).length === 0 && normalizarRegiao(origem.regiao).length) {
        destino.regiao = normalizarRegiao(origem.regiao);
    }
    // Fontes: as duas listas, sem repetir a mesma obra do mesmo autor; o
    // destino manda (vale a nota e o ano dele).
    destino.fontes = unirFontes(destino.fontes, origem.fontes);
    // Esfera e Categoria: a soma das duas listas, sem repetir.
    mesclarClassificacaoDosPeriodosHistoricos(destino, origem);
    mesclarHierarquiaDePeriodos(dbRef.periodosHistoricos, origem, destino);
    dbRef.periodosHistoricos = dbRef.periodosHistoricos.filter((p) => p.id != origemId);
}

// Hierarquia na mesclagem: as divisões da origem passam ao destino (a não ser
// o próprio destino, que sobe para o pai da origem se era descendente dela). O
// destino herda pai, divisão e gênero da origem só se não tiver pai e se isso
// não fechar um ciclo.
function mesclarHierarquiaDeCorrentes(lista, origem, destino) {
    if (criaCicloCorrente(lista, origem.id, destino.id)) {
        destino.paiId = origem.paiId ?? null;
        if (destino.paiId == null) {
            destino.divisao = '';
            destino.generoDivisao = '';
        }
    }
    if (destino.paiId == null && origem.paiId != null && origem.paiId != destino.id) {
        const cicla = criaCicloCorrente(lista, destino.id, origem.paiId);
        if (!cicla) {
            destino.paiId = origem.paiId;
            destino.divisao = origem.divisao || '';
            destino.generoDivisao = origem.generoDivisao || '';
        }
    }
    lista.forEach((m) => {
        if (m.id != destino.id && m.paiId != null && m.paiId == origem.id) m.paiId = destino.id;
    });
}

/**
 * Mesmo espírito de mesclarPeriodosHistoricos acima, pro cadastro de
 * Movimento/Escola — mais trabalhoso porque o vínculo é um array dos
 * dois lados (Autor e Poema/Prosa), não um id único: em vez de
 * reatribuir, precisa trocar `origemId` por `destinoId` dentro de cada
 * array (sem duplicar, caso o item já referenciasse os dois
 * separadamente — mesmo cuidado de mesclarPessoas com `papeis`
 * duplicados). Campos escalares (notas/tipo/posturaEstetica/regiaoOrigem/inicio/fim)
 * só entram no destino se estiver vazio; campos de tags (valores,
 * temas, técnicas, tipos de composição, lemas, manifestos) são
 * unidos por Set, sem duplicar; as fontes são unidas por autor e obra
 * (unirFontes), com o destino mandando.
 */
export function mesclarMovimentosEscolas(dbRef, origemId, destinoId) {
    if (origemId == destinoId) return;
    const origem = dbRef.movimentosEscolas?.find((m) => m.id == origemId);
    const destino = dbRef.movimentosEscolas?.find((m) => m.id == destinoId);
    if (!origem || !destino) return;

    ['autores', 'poemas', 'prosas'].forEach((col) => {
        (dbRef[col] || []).forEach((it) => {
            if (!Array.isArray(it.movimentosEscolasIds)) return;
            if (!it.movimentosEscolasIds.includes(origemId)) return;
            it.movimentosEscolasIds = it.movimentosEscolasIds.filter((id) => id != origemId);
            if (!it.movimentosEscolasIds.includes(destinoId)) {
                it.movimentosEscolasIds.push(destinoId);
            }
        });
    });

    if (!destino.notas && origem.notas) destino.notas = origem.notas;
    if (!destino.tipo && origem.tipo) destino.tipo = origem.tipo;
    if (!destino.posturaEstetica && origem.posturaEstetica)
        destino.posturaEstetica = origem.posturaEstetica;
    if (!destino.programa && origem.programa) destino.programa = origem.programa;
    if (
        normalizarRegiao(destino.regiaoOrigem).length === 0 &&
        normalizarRegiao(origem.regiaoOrigem).length
    ) {
        destino.regiaoOrigem = normalizarRegiao(origem.regiaoOrigem);
    }
    mesclarHierarquiaDeCorrentes(dbRef.movimentosEscolas, origem, destino);
    const inicioVazio = (d) => !d || (!d.dia && !d.mes && !d.ano && !d.seculo && !d.decada);
    if (inicioVazio(destino.inicio) && !inicioVazio(origem.inicio)) destino.inicio = origem.inicio;
    if (inicioVazio(destino.fim) && !inicioVazio(origem.fim)) destino.fim = origem.fim;
    ['valores', 'temas', 'tecnicas', 'tiposComposicao', 'lemas', 'manifestos'].forEach((campo) => {
        destino[campo] = [...new Set([...(destino[campo] || []), ...(origem[campo] || [])])];
    });
    destino.fontes = unirFontes(destino.fontes, origem.fontes);

    dbRef.movimentosEscolas = dbRef.movimentosEscolas.filter((m) => m.id != origemId);
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
    // Os pais do período precisam ser lidos antes de ele sair da lista:
    // é para eles que os períodos de dentro sobem (ver abaixo).
    const paisDoPeriodoExcluido =
        col === 'periodosHistoricos'
            ? paisDoPeriodo(db.periodosHistoricos, id)
            : col === 'epocas'
              ? paisDoPeriodo(db.epocas, id)
              : [];
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

    // Excluir Pessoa (Bloco 3): ela também sai das Pessoas envolvidas dos
    // Períodos Biográficos (o período fica). Guarda onde estava, com os
    // vínculos, para o Desfazer.
    let periodosPessoaRemovidas = [];
    if (col === 'pessoas') periodosPessoaRemovidas = removerPessoaDosPeriodos(db, id);

    // Excluir Personagem: mesmo padrão de Pessoa. Guarda cada vínculo removido
    // (com papéis e centralidade) para o "Desfazer"; sem isso o save() soltaria
    // os vínculos órfãos e a restauração perderia papéis e centralidade.
    let vinculosPersonagemRemovidos = [];
    if (col === 'personagens') {
        ['poemas', 'prosas'].forEach((itemCol) => {
            (db[itemCol] || []).forEach((it) => {
                if (!Array.isArray(it.personagens)) return;
                for (let i = it.personagens.length - 1; i >= 0; i--) {
                    if (it.personagens[i].personagemId == id) {
                        vinculosPersonagemRemovidos.push({
                            itemCol,
                            itemId: it.id,
                            entrada: it.personagens[i],
                        });
                        it.personagens.splice(i, 1);
                    }
                }
            });
        });
    }

    // Excluir Pessoa ou Personagem: a âncora de Eco não pode apontar para quem
    // não existe mais, então sai de todos os Ecos (o Eco fica, F11-D6). Guarda
    // o que saiu (com a posição) para o "Desfazer" devolver.
    let ancorasEcoRemovidas = [];
    if (col === 'pessoas') ancorasEcoRemovidas = removerAncoraDoCadastro(db, 'pessoa', id);
    if (col === 'personagens') {
        ancorasEcoRemovidas = removerAncoraDoCadastro(db, 'personagem', id);
    }

    // Excluir Livro (ou Coletânea): a participação de cada Personagem nesse
    // livro (`personagem.participacoes`) deixa de apontar para ninguém. Guarda
    // cada uma para o "Desfazer" devolver com as tags.
    let participacoesPersonagemRemovidas = [];
    if (col === 'livros') {
        (db.personagens || []).forEach((p) => {
            if (!Array.isArray(p.participacoes)) return;
            for (let i = p.participacoes.length - 1; i >= 0; i--) {
                if (p.participacoes[i].livroId == id) {
                    participacoesPersonagemRemovidas.push({
                        personagemId: p.id,
                        entrada: p.participacoes[i],
                    });
                    p.participacoes.splice(i, 1);
                }
            }
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

    // Excluir Autor (continuação): tira o id de `autorIds` de toda
    // Pessoa associada a ele — Pessoa não é exclusiva de um Autor (N:N,
    // ver migrarPessoasAutorIds), então ela continua existindo, só perde
    // essa associação específica (pode continuar associada a outros
    // Autores). Mesmo espírito de vinculosAutoriaRemovidos acima (só
    // desvincula), diferente do bloco de Grupos/Épocas logo abaixo (que
    // cascade-deleta).
    let vinculosPessoaAutorRemovidos = [];
    if (col === 'autores') {
        (db.pessoas || []).forEach((p) => {
            if (!Array.isArray(p.autorIds)) return;
            const idx = p.autorIds.indexOf(id);
            if (idx !== -1) {
                vinculosPessoaAutorRemovidos.push({ pessoaId: p.id, autorId: id });
                p.autorIds.splice(idx, 1);
            }
        });
    }

    // Excluir Autor (continuação): Grupos e Épocas (Período Biográfico)
    // são exclusivos de um Autor desde a decisão de 27/09/2026, então
    // somem EM CASCATA junto com ele (diferente do resto desta função,
    // que só desvincula) — ver calcularImpactoExclusaoAutor acima. Cada
    // Grupo/Época removido carrega seus próprios vínculos (grupoIds de
    // Pessoa, gruposDiretos de Poema/Prosa, epocaRetratada.epocaId), que
    // também precisam ser desfeitos e guardados pra `_restaurar`. Como
    // subgrupo é sempre do MESMO Autor do pai (`obterGrupoPaiValido`),
    // apagar a lista inteira de uma vez nunca deixa filho órfão de outro
    // Autor pra promover — bem diferente da exclusão avulsa de UM Grupo
    // (bloco "Excluir Grupo" mais abaixo), que promove os filhos em vez
    // de apagá-los.
    let gruposAutorRemovidos = [];
    let vinculosGrupoAutorRemovidos = [];
    let vinculosGrupoDiretoAutorRemovidos = [];
    let epocasAutorRemovidas = [];
    let vinculosEpocaAutorRemovidos = [];
    if (col === 'autores') {
        const gruposDoAutor = db.grupos.filter((g) => g.autorId == id);
        gruposDoAutor.forEach((g) => {
            (db.pessoas || []).forEach((p) => {
                if (!Array.isArray(p.grupoIds)) return;
                const idx = p.grupoIds.indexOf(g.id);
                if (idx !== -1) {
                    vinculosGrupoAutorRemovidos.push({ pessoaId: p.id, grupoId: g.id });
                    p.grupoIds.splice(idx, 1);
                }
            });
            ['poemas', 'prosas'].forEach((itemCol) => {
                (db[itemCol] || []).forEach((it) => {
                    if (!Array.isArray(it.gruposDiretos)) return;
                    const idx = it.gruposDiretos.indexOf(g.id);
                    if (idx !== -1) {
                        vinculosGrupoDiretoAutorRemovidos.push({
                            itemCol,
                            itemId: it.id,
                            grupoId: g.id,
                        });
                        it.gruposDiretos.splice(idx, 1);
                    }
                });
            });
        });
        gruposAutorRemovidos = gruposDoAutor;
        const gruposDoAutorIds = gruposDoAutor.map((g) => g.id);
        db.grupos = db.grupos.filter((g) => !gruposDoAutorIds.includes(g.id));

        const epocasDoAutor = db.epocas.filter((e) => e.autorId == id);
        epocasDoAutor.forEach((e) => {
            ['poemas', 'prosas'].forEach((itemCol) => {
                (db[itemCol] || []).forEach((it) => {
                    const lista = periodosBiograficosDoItem(it);
                    const indice = lista.findIndex((x) => x.epocaId == e.id);
                    if (indice !== -1) {
                        vinculosEpocaAutorRemovidos.push({
                            itemCol,
                            itemId: it.id,
                            epocaId: e.id,
                            indice,
                            recorte: lista[indice].recorte,
                        });
                        definirPeriodosBiograficosDoItem(
                            it,
                            lista.filter((x) => x.epocaId != e.id),
                        );
                    }
                });
            });
        });
        epocasAutorRemovidas = epocasDoAutor;
        const epocasDoAutorIds = epocasDoAutor.map((e) => e.id);
        db.epocas = db.epocas.filter((e) => !epocasDoAutorIds.includes(e.id));
    }

    // Excluir Época: some do cadastro e o `epocaId` de todo poema/prosa
    // que a referenciava volta pra null — o texto continua existindo, só
    // "perde" a referência ao período (mesmo espírito de vínculos de
    // Autor/Pessoa acima). Guarda `itemCol` (poemas ou prosas) igual aos
    // dois padrões acima — corrigido junto com calcularImpactoExclusaoEpoca
    // (ver comentário lá): antes só varria `db.poemas`.
    let vinculosEpocaRemovidos = [];
    // Excluir um Período Biográfico com períodos dentro: eles sobem para os
    // pais do excluído (ou viram de topo), sem sumir. Guarda o `pertenceA`
    // anterior de cada um para o Desfazer.
    let pertenceAEpocasAlteradas = [];
    if (col === 'epocas') {
        pertenceAEpocasAlteradas = retirarPeriodoDaHierarquia(db.epocas, id, paisDoPeriodoExcluido);
        ['poemas', 'prosas'].forEach((itemCol) => {
            (db[itemCol] || []).forEach((it) => {
                const lista = periodosBiograficosDoItem(it);
                const indice = lista.findIndex((x) => x.epocaId == id);
                if (indice !== -1) {
                    vinculosEpocaRemovidos.push({
                        itemCol,
                        itemId: it.id,
                        epocaId: id,
                        indice,
                        recorte: lista[indice].recorte,
                    });
                    definirPeriodosBiograficosDoItem(
                        it,
                        lista.filter((x) => x.epocaId != id),
                    );
                }
            });
        });
    }

    // Excluir Período Histórico: some do cadastro e o `periodoHistoricoId`
    // de todo poema/prosa que o referenciava volta pra null. Mesmo
    // espírito de vinculosEpocaRemovidos acima, mas mais simples (link
    // direto, sem sub-objeto).
    let vinculosPeriodoHistoricoRemovidos = [];
    // Excluir um período com períodos dentro: eles sobem para os pais do
    // excluído (ou viram de topo), sem sumir. Guarda o `pertenceA` anterior
    // de cada um para o Desfazer.
    let pertenceAPeriodosAlterados = [];
    if (col === 'periodosHistoricos') {
        pertenceAPeriodosAlterados = retirarPeriodoDaHierarquia(
            db.periodosHistoricos,
            id,
            paisDoPeriodoExcluido,
        );
        ['poemas', 'prosas'].forEach((itemCol) => {
            (db[itemCol] || []).forEach((it) => {
                const lista = periodosHistoricosIdsDoItem(it);
                const indice = lista.findIndex((x) => x == id);
                if (indice >= 0) {
                    // Só este id sai; os outros períodos do texto ficam.
                    // `indice` devolve o id ao lugar certo no Desfazer.
                    vinculosPeriodoHistoricoRemovidos.push({
                        itemCol,
                        itemId: it.id,
                        periodoHistoricoId: id,
                        indice,
                    });
                    it.periodosHistoricosIds = lista.filter((x) => x != id);
                    delete it.periodoHistoricoId;
                }
            });
        });
    }

    // Excluir Poema: se ele era o destino da promoção de algum Molde
    // (Bloco 3 da aba Criação, ver calcularImpactoExclusaoPoema acima),
    // esse Molde volta a "em andamento" (status/poemaId limpos) — senão
    // o botão da coluna e o selo do modal continuariam apontando pra um
    // Poema que não existe mais. O Molde em si nunca é apagado, só perde
    // o vínculo — decisão do Victor. Guarda status/poemaId anteriores
    // pra restaurar no "Desfazer", mesmo padrão de vinculosEpocaRemovidos
    // acima.
    let vinculosMoldeRemovidos = [];
    if (col === 'poemas') {
        (db.moldes || []).forEach((m) => {
            if (m.poemaId == id) {
                vinculosMoldeRemovidos.push({
                    moldeId: m.id,
                    statusAnterior: m.status,
                    poemaIdAnterior: m.poemaId,
                });
                m.status = 'em andamento';
                m.poemaId = null;
            }
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

    // Excluir Grupo (continuação): some também de `gruposDiretos` de todo
    // poema/prosa que o referenciava diretamente (sem pessoa) — mesmo
    // espírito do bloco acima, só que em `item.gruposDiretos` em vez de
    // `pessoa.grupoIds`. Guarda itemCol/itemId/grupoId pra restaurar no
    // "Desfazer", mesmo padrão de vinculosEpocaRemovidos abaixo.
    let vinculosGrupoDiretoRemovidos = [];
    if (col === 'grupos') {
        ['poemas', 'prosas'].forEach((itemCol) => {
            (db[itemCol] || []).forEach((it) => {
                if (!Array.isArray(it.gruposDiretos)) return;
                const idx = it.gruposDiretos.indexOf(id);
                if (idx !== -1) {
                    vinculosGrupoDiretoRemovidos.push({ itemCol, itemId: it.id, grupoId: id });
                    it.gruposDiretos.splice(idx, 1);
                }
            });
        });
    }

    // Excluir Grupo (continuação): se ele tinha subgrupos (outros Grupos
    // do mesmo Autor com `paiId` apontando pra ele), eles são promovidos
    // um nível em vez de apagados junto — decisão de 27/09/2026. Promovido
    // significa herdar o `paiId` que o próprio grupo excluído tinha (não
    // sempre `null`): excluir um grupo do meio da cadeia promove os filhos
    // pro nível do avô, herdando o `paiId` que o excluído tinha — assim
    // ninguém pula direto pro topo só porque o do meio sumiu, e a exclusão
    // nunca aumenta a profundidade de ninguém (só reduz em 1, o do meio que
    // sumiu). Guarda o `paiId` anterior de cada um pra `_restaurar` devolver
    // a hierarquia como estava.
    let vinculosSubgrupoPromovidos = [];
    if (col === 'grupos') {
        const paiHerdado = item.paiId ?? null;
        db.grupos.forEach((g) => {
            if (g.paiId == id) {
                vinculosSubgrupoPromovidos.push({ grupoId: g.id, paiIdAnterior: g.paiId });
                g.paiId = paiHerdado;
            }
        });
    }

    // Excluir Movimento/Escola: some do cadastro e some de
    // `movimentosEscolasIds` de todo Autor/Poema/Prosa que o
    // referenciava — três coleções porque a relação é N:N dos dois
    // lados (ver decisoes.md), mesmo espírito de vinculosGrupoRemovidos/
    // vinculosGrupoDiretoRemovidos acima (splice + guarda pra desfazer),
    // só que cobrindo autores, poemas e prosas na mesma varredura.
    let vinculosMovimentoEscolaRemovidos = [];
    if (col === 'movimentosEscolas') {
        ['autores', 'poemas', 'prosas'].forEach((itemCol) => {
            (db[itemCol] || []).forEach((it) => {
                if (!Array.isArray(it.movimentosEscolasIds)) return;
                const idx = it.movimentosEscolasIds.indexOf(id);
                if (idx !== -1) {
                    vinculosMovimentoEscolaRemovidos.push({
                        itemCol,
                        itemId: it.id,
                        movimentoEscolaId: id,
                    });
                    it.movimentosEscolasIds.splice(idx, 1);
                }
            });
        });
    }

    // Excluir uma corrente com divisões: as divisões sobem para o pai da
    // excluída (ou viram correntes de topo), como em Locais. Guarda quem
    // subiu para o Desfazer.
    const filhosReligados = [];
    if (col === 'movimentosEscolas') {
        db.movimentosEscolas.forEach((m) => {
            if (m.paiId == null || m.paiId != id) return;
            filhosReligados.push({
                id: m.id,
                paiAnterior: m.paiId,
                divisaoAnterior: m.divisao || '',
                generoAnterior: m.generoDivisao || '',
            });
            m.paiId = item?.paiId ?? null;
            if (m.paiId == null) {
                m.divisao = '';
                m.generoDivisao = '';
            }
        });
    }

    // Excluir Template de Progressão: se for embutido (de fábrica),
    // registra o nome em templatesEstruturaOcultos pra
    // migrarTemplatesEstruturaEmbutidos nunca recriar (ver comentário lá) —
    // senão a exclusão não "pegaria" de vez. _restaurar desfaz isso se a
    // exclusão for desfeita a tempo.
    let ocultoAdicionado = null;
    if (
        col === 'templatesEstrutura' &&
        item?.embutido &&
        !db.templatesEstruturaOcultos.includes(item.nome)
    ) {
        db.templatesEstruturaOcultos.push(item.nome);
        ocultoAdicionado = item.nome;
    }

    // Excluir Movimento/Escola de fábrica: mesmo raciocínio de
    // templatesEstruturaOcultos logo acima, só que em
    // movimentosEscolasOcultos — sem isso, migrarMovimentosEscolasEmbutidos
    // recriaria o movimento sozinho no próximo load, e a exclusão nunca
    // "pegaria" de vez pra quem apagou um dos pré-cadastrados de propósito.
    let ocultoMovimentoAdicionado = null;
    if (
        col === 'movimentosEscolas' &&
        item?.embutido &&
        !db.movimentosEscolasOcultos.includes(item.nome)
    ) {
        db.movimentosEscolasOcultos.push(item.nome);
        ocultoMovimentoAdicionado = item.nome;
    }

    // Excluir Período Histórico de fábrica: mesmo raciocínio dos dois
    // acima, em periodosHistoricosOcultos — sem isso,
    // migrarPeriodosHistoricosEmbutidos recriaria o período sozinho no
    // próximo load.
    let ocultoPeriodoHistoricoAdicionado = null;
    if (
        col === 'periodosHistoricos' &&
        item?.embutido &&
        !db.periodosHistoricosOcultos.includes(item.nome)
    ) {
        db.periodosHistoricosOcultos.push(item.nome);
        ocultoPeriodoHistoricoAdicionado = item.nome;
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
        periodosPessoaRemovidas,
        vinculosPersonagemRemovidos,
        ancorasEcoRemovidas,
        participacoesPersonagemRemovidas,
        vinculosAutoriaRemovidos,
        vinculosPessoaAutorRemovidos,
        gruposAutorRemovidos,
        vinculosGrupoAutorRemovidos,
        vinculosGrupoDiretoAutorRemovidos,
        epocasAutorRemovidas,
        vinculosEpocaAutorRemovidos,
        vinculosGrupoRemovidos,
        vinculosGrupoDiretoRemovidos,
        vinculosSubgrupoPromovidos,
        vinculosEpocaRemovidos,
        vinculosPeriodoHistoricoRemovidos,
        pertenceAPeriodosAlterados,
        pertenceAEpocasAlteradas,
        vinculosMovimentoEscolaRemovidos,
        filhosReligados,
        vinculosMoldeRemovidos,
        capasParaDescartar,
        posicaoRemovida,
        irmaos,
        ocultoAdicionado,
        ocultoMovimentoAdicionado,
        ocultoPeriodoHistoricoAdicionado,
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
        periodosPessoaRemovidas,
        vinculosPersonagemRemovidos,
        ancorasEcoRemovidas,
        participacoesPersonagemRemovidas,
        vinculosAutoriaRemovidos,
        vinculosPessoaAutorRemovidos,
        gruposAutorRemovidos,
        vinculosGrupoAutorRemovidos,
        vinculosGrupoDiretoAutorRemovidos,
        epocasAutorRemovidas,
        vinculosEpocaAutorRemovidos,
        vinculosGrupoRemovidos,
        vinculosGrupoDiretoRemovidos,
        vinculosSubgrupoPromovidos,
        vinculosEpocaRemovidos,
        vinculosPeriodoHistoricoRemovidos,
        pertenceAPeriodosAlterados,
        pertenceAEpocasAlteradas,
        vinculosMovimentoEscolaRemovidos,
        filhosReligados,
        vinculosMoldeRemovidos,
        posicaoRemovida,
        irmaos,
        ocultoAdicionado,
        ocultoMovimentoAdicionado,
        ocultoPeriodoHistoricoAdicionado,
    } = removido;

    if (irmaos) abrirEspaco(irmaos, posicaoRemovida);

    if (ocultoAdicionado) {
        const idx = db.templatesEstruturaOcultos.indexOf(ocultoAdicionado);
        if (idx !== -1) db.templatesEstruturaOcultos.splice(idx, 1);
    }
    if (ocultoMovimentoAdicionado) {
        const idx = db.movimentosEscolasOcultos.indexOf(ocultoMovimentoAdicionado);
        if (idx !== -1) db.movimentosEscolasOcultos.splice(idx, 1);
    }
    if (ocultoPeriodoHistoricoAdicionado) {
        const idx = db.periodosHistoricosOcultos.indexOf(ocultoPeriodoHistoricoAdicionado);
        if (idx !== -1) db.periodosHistoricosOcultos.splice(idx, 1);
    }

    db[col].push(item);
    if (partesRemovidas.length) db.partes.push(...partesRemovidas);
    if (itensRemovidos.length) {
        db.itensColetanea = [...(db.itensColetanea || []), ...itensRemovidos];
    }
    (vinculosPessoaRemovidos || []).forEach(({ itemCol, itemId, entrada }) => {
        const it = db[itemCol]?.find((i) => i.id == itemId);
        if (it) (it.pessoas ||= []).push(entrada);
    });
    restaurarPessoaNosPeriodos(db, periodosPessoaRemovidas);
    (vinculosPersonagemRemovidos || []).forEach(({ itemCol, itemId, entrada }) => {
        const it = db[itemCol]?.find((i) => i.id == itemId);
        if (it) (it.personagens ||= []).push(entrada);
    });
    (participacoesPersonagemRemovidas || []).forEach(({ personagemId, entrada }) => {
        const p = db.personagens?.find((x) => x.id == personagemId);
        if (p) (p.participacoes ||= []).push(entrada);
    });
    restaurarAncoras(db, ancorasEcoRemovidas || []);
    (vinculosAutoriaRemovidos || []).forEach(({ itemCol, itemId, entrada }) => {
        const it = db[itemCol]?.find((i) => i.id == itemId);
        if (it) (it.autoria ||= []).push(entrada);
    });
    (vinculosPessoaAutorRemovidos || []).forEach(({ pessoaId, autorId }) => {
        const p = db.pessoas?.find((i) => i.id == pessoaId);
        if (p) (p.autorIds ||= []).push(autorId);
    });
    (vinculosGrupoRemovidos || []).forEach(({ pessoaId }) => {
        const p = db.pessoas?.find((i) => i.id == pessoaId);
        if (p) (p.grupoIds ||= []).push(item.id);
    });
    (vinculosGrupoDiretoRemovidos || []).forEach(({ itemCol, itemId, grupoId }) => {
        const it = db[itemCol]?.find((i) => i.id == itemId);
        if (it) (it.gruposDiretos ||= []).push(grupoId);
    });
    (vinculosSubgrupoPromovidos || []).forEach(({ grupoId, paiIdAnterior }) => {
        const g = db.grupos?.find((i) => i.id == grupoId);
        if (g) g.paiId = paiIdAnterior;
    });
    if (gruposAutorRemovidos?.length) db.grupos.push(...gruposAutorRemovidos);
    (vinculosGrupoAutorRemovidos || []).forEach(({ pessoaId, grupoId }) => {
        const p = db.pessoas?.find((i) => i.id == pessoaId);
        if (p) (p.grupoIds ||= []).push(grupoId);
    });
    (vinculosGrupoDiretoAutorRemovidos || []).forEach(({ itemCol, itemId, grupoId }) => {
        const it = db[itemCol]?.find((i) => i.id == itemId);
        if (it) (it.gruposDiretos ||= []).push(grupoId);
    });
    if (epocasAutorRemovidas?.length) db.epocas.push(...epocasAutorRemovidas);
    const devolverEpocaAoTexto = ({ itemCol, itemId, epocaId, indice, recorte }) => {
        const it = db[itemCol]?.find((i) => i.id == itemId);
        if (!it || !it.epocaRetratada) return;
        const lista = periodosBiograficosDoItem(it);
        if (lista.some((x) => x.epocaId == epocaId)) return;
        const pos = Number.isInteger(indice) ? Math.min(indice, lista.length) : lista.length;
        lista.splice(pos, 0, { epocaId, recorte: recorte || null });
        definirPeriodosBiograficosDoItem(it, lista);
    };
    (vinculosEpocaAutorRemovidos || []).forEach(devolverEpocaAoTexto);
    (vinculosEpocaRemovidos || []).forEach(devolverEpocaAoTexto);
    (vinculosPeriodoHistoricoRemovidos || []).forEach(
        ({ itemCol, itemId, periodoHistoricoId, indice }) => {
            const it = db[itemCol]?.find((i) => i.id == itemId);
            if (!it) return;
            const lista = periodosHistoricosIdsDoItem(it);
            if (lista.some((x) => x == periodoHistoricoId)) return;
            const pos = Number.isInteger(indice) ? Math.min(indice, lista.length) : lista.length;
            lista.splice(pos, 0, periodoHistoricoId);
            it.periodosHistoricosIds = lista;
            delete it.periodoHistoricoId;
        },
    );
    (pertenceAPeriodosAlterados || []).forEach(({ id, anterior }) => {
        const filho = db.periodosHistoricos?.find((p) => p.id == id);
        if (filho) filho.pertenceA = [...anterior];
    });
    (pertenceAEpocasAlteradas || []).forEach(({ id, anterior }) => {
        const filho = db.epocas?.find((p) => p.id == id);
        if (filho) filho.pertenceA = [...anterior];
    });
    (vinculosMovimentoEscolaRemovidos || []).forEach(({ itemCol, itemId, movimentoEscolaId }) => {
        const it = db[itemCol]?.find((i) => i.id == itemId);
        if (it) (it.movimentosEscolasIds ||= []).push(movimentoEscolaId);
    });
    (filhosReligados || []).forEach(({ id, paiAnterior, divisaoAnterior, generoAnterior }) => {
        const filho = db.movimentosEscolas?.find((m) => m.id == id);
        if (!filho) return;
        filho.paiId = paiAnterior;
        filho.divisao = divisaoAnterior;
        filho.generoDivisao = generoAnterior;
    });
    (vinculosMoldeRemovidos || []).forEach(({ moldeId, statusAnterior, poemaIdAnterior }) => {
        const m = db.moldes?.find((i) => i.id == moldeId);
        if (m) {
            m.status = statusAnterior;
            m.poemaId = poemaIdAnterior;
        }
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

// Resolve o título exibido no toast/modal de exclusão pra uma Escansão
// (que não tem título próprio — pertence a um poema) a partir do poema
// vinculado (`resolverTituloPoemaOuProsa`, mesma resolução usada por
// Elos/Ecos em celulas-tabela.js).
function tituloEscansao(escansao) {
    if (!escansao) return null;
    const poema = db.poemas.find((p) => p.id == escansao.poemaId);
    return poema ? poema.titulo : `#${escansao.id}`;
}

// Mesmo padrão de tituloEscansao, agora pra Progressão Morfofuncional
// (Unidades+Eventos não têm título próprio — pertencem a um poema).
function tituloEstruturaTextual(estrutura) {
    if (!estrutura) return null;
    const poema = db.poemas.find((p) => p.id == estrutura.poemaId);
    return poema ? poema.titulo : `#${estrutura.id}`;
}

// Uma Escansão por poema (não é histórico de versões — ver comentário no
// db inicial) — usado pela tabela da aba Sonoridade e pelo modal de
// cadastro/edição (pra saber se já existe uma escansão daquele poema).
export function getEscansaoDoPoema(poemaId) {
    return db.escansoes.find((e) => e.poemaId == poemaId) || null;
}

// Uma Estrutura Textual (Unidades + Eventos) por poema — mesmo espírito
// de getEscansaoDoPoema. Usada pela tabela da aba Morfofuncionalidade e
// pelo modal de cadastro/edição.
export function getEstruturaDoPoema(poemaId) {
    return db.estruturasTextuais.find((e) => e.poemaId == poemaId) || null;
}

export function deleteItem(col, id, aposConfirmar = null) {
    const item = db[col]?.find((i) => i.id == id);
    const titulo =
        col === 'escansoes'
            ? tituloEscansao(item)
            : col === 'estruturasTextuais'
              ? tituloEstruturaTextual(item)
              : item?.titulo || item?.tipo || item?.nome || `#${id}`;
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

    // Para Personagem, mesmo aviso de Pessoa (o vínculo some, o texto não).
    if (col === 'personagens') {
        const { poemasIds, prosasIds } = calcularImpactoExclusaoPersonagem(db, id);
        const total = poemasIds.length + prosasIds.length;
        rotulo =
            total > 0
                ? `Personagem · deixará de aparecer em ${total} texto${total !== 1 ? 's' : ''}`
                : 'Personagem';
    }

    // Para Corrente literária com divisões: avisa que elas sobem para o pai
    // da excluída (ou viram correntes de topo), sem sumir.
    if (col === 'movimentosEscolas') {
        const divisoes = db.movimentosEscolas.filter((m) => m.paiId != null && m.paiId == id);
        if (divisoes.length > 0) {
            const destino =
                item?.paiId != null
                    ? 'passam a fazer parte da corrente acima'
                    : 'viram correntes de topo';
            rotulo = `Corrente literária · ${divisoes.length} divisã${divisoes.length !== 1 ? 'ões' : 'o'} ${destino}`;
        }
    }

    // Para Período Histórico: avisa quantos textos perdem o vínculo e quantos
    // períodos dentro dele sobem para o pai (ou viram de topo), sem sumir.
    if (col === 'periodosHistoricos') {
        const { poemasIds, prosasIds } = calcularImpactoExclusaoPeriodoHistorico(db, id);
        const totalTextos = poemasIds.length + prosasIds.length;
        const partes = [];
        if (totalTextos > 0) {
            partes.push(
                `deixará de aparecer em ${totalTextos} texto${totalTextos !== 1 ? 's' : ''}`,
            );
        }
        const { topo, sobem, mantem } = destinoDosFilhosAoExcluir(db.periodosHistoricos, id);
        const dentro = (n) => `${n} período${n !== 1 ? 's' : ''} dentro dele`;
        if (sobem.length > 0) {
            partes.push(
                `${dentro(sobem.length)} ${sobem.length !== 1 ? 'passam' : 'passa'} a ficar ${paisDoPeriodo(db.periodosHistoricos, id).length > 1 ? 'nos períodos acima' : 'no período acima'}`,
            );
        }
        if (mantem.length > 0) {
            partes.push(
                `${dentro(mantem.length)} ${mantem.length !== 1 ? 'continuam' : 'continua'} dentro de outro período`,
            );
        }
        if (topo.length > 0) {
            partes.push(
                `${dentro(topo.length)} ${topo.length !== 1 ? 'viram períodos' : 'vira período'} de topo`,
            );
        }
        rotulo = partes.length ? `Período Histórico · ${partes.join(', ')}` : 'Período Histórico';
    }

    // Para Autor, avisa em quantos poemas/prosas ele vai deixar de
    // aparecer (o vínculo some, o texto em si não é afetado), quantas
    // Pessoas deixarão de estar associadas a ele (desvincula, sem
    // apagar a Pessoa — ver calcularImpactoExclusaoAutor) e, desde a
    // decisão de 27/09/2026, quantos Grupos/Épocas dele serão apagados
    // EM CASCATA junto (esses dois cadastros são exclusivos do Autor).
    if (col === 'autores') {
        const { poemasIds, prosasIds, gruposIds, epocasIds, pessoasIds } =
            calcularImpactoExclusaoAutor(db, id);
        const totalTextos = poemasIds.length + prosasIds.length;
        const partes = [];
        if (totalTextos > 0) {
            partes.push(
                `deixará de aparecer em ${totalTextos} texto${totalTextos !== 1 ? 's' : ''}`,
            );
        }
        if (pessoasIds.length > 0) {
            partes.push(
                `${pessoasIds.length} Pessoa${pessoasIds.length !== 1 ? 's' : ''} deixará${pessoasIds.length !== 1 ? 'ão' : ''} de estar associada${pessoasIds.length !== 1 ? 's' : ''} a ele`,
            );
        }
        if (gruposIds.length > 0) {
            partes.push(
                `${gruposIds.length} Grupo${gruposIds.length !== 1 ? 's' : ''} apagado${gruposIds.length !== 1 ? 's' : ''} junto`,
            );
        }
        if (epocasIds.length > 0) {
            partes.push(
                `${epocasIds.length} Período${epocasIds.length !== 1 ? 's' : ''} Biográfico${epocasIds.length !== 1 ? 's' : ''} apagado${epocasIds.length !== 1 ? 's' : ''} junto`,
            );
        }
        rotulo = partes.length ? `Autor · ${partes.join(', ')}` : 'Autor';
    }

    // Para Época, avisa em quantos poemas/prosas ela vai deixar de
    // aparecer (o vínculo some — epocaId volta pra null —, o texto em
    // si não é afetado). Mesmo padrão de Pessoa/Autor acima.
    if (col === 'epocas') {
        const { poemasIds, prosasIds } = calcularImpactoExclusaoEpoca(db, id);
        const total = poemasIds.length + prosasIds.length;
        const partes = [];
        if (total > 0) {
            partes.push(`deixará de aparecer em ${total} texto${total !== 1 ? 's' : ''}`);
        }
        const { topo, sobem, mantem } = destinoDosFilhosAoExcluir(db.epocas, id);
        const dentro = (n) => `${n} período${n !== 1 ? 's' : ''} dentro dele`;
        if (sobem.length > 0) {
            partes.push(
                `${dentro(sobem.length)} ${sobem.length !== 1 ? 'passam' : 'passa'} a ficar ${paisDoPeriodo(db.epocas, id).length > 1 ? 'nos períodos acima' : 'no período acima'}`,
            );
        }
        if (mantem.length > 0) {
            partes.push(
                `${dentro(mantem.length)} ${mantem.length !== 1 ? 'continuam' : 'continua'} dentro de outro período`,
            );
        }
        if (topo.length > 0) {
            partes.push(
                `${dentro(topo.length)} ${topo.length !== 1 ? 'viram períodos' : 'vira período'} de topo`,
            );
        }
        rotulo = partes.length ? `Época · ${partes.join(', ')}` : 'Época';
    }

    // Para Grupo, avisa quantas pessoas deixarão de pertencer a ele,
    // separadamente em quantos textos ele deixará de aparecer como
    // referência direta (sem pessoa), e, se ele tiver subgrupos, quantos
    // serão promovidos a nível 1 (não apagados — ver
    // vinculosSubgrupoPromovidos) — os números têm significado diferente,
    // por isso não somados num total só.
    if (col === 'grupos') {
        const { pessoasIds, poemasIds, prosasIds, subgruposIds } = calcularImpactoExclusaoGrupo(
            db,
            id,
        );
        const totalPessoas = pessoasIds.length;
        const totalTextos = poemasIds.length + prosasIds.length;
        const totalSubgrupos = subgruposIds.length;
        const partes = [];
        if (totalPessoas > 0) {
            partes.push(
                `${totalPessoas} pessoa${totalPessoas !== 1 ? 's' : ''} deixará de pertencer a ele`,
            );
        }
        if (totalTextos > 0) {
            partes.push(
                `deixará de ser referência direta em ${totalTextos} texto${totalTextos !== 1 ? 's' : ''}`,
            );
        }
        if (totalSubgrupos > 0) {
            partes.push(
                `${totalSubgrupos} subgrupo${totalSubgrupos !== 1 ? 's' : ''} será${totalSubgrupos !== 1 ? 'ão' : ''} promovido${totalSubgrupos !== 1 ? 's' : ''} a nível 1`,
            );
        }
        rotulo = partes.length ? `Grupo · ${partes.join(', ')}` : 'Grupo';
    }

    // Para Poema, avisa quando ele é a origem de algum Molde promovido
    // (Bloco 3 da aba Criação) — excluir o Poema devolve o Molde pra
    // "em andamento" (decisão do Victor, ver _removerParaExclusao),
    // então o toast já adianta isso em vez do usuário só descobrir
    // depois na aba Criação. Mesmo padrão de aviso de Pessoa/Autor/Época
    // acima.
    if (col === 'poemas') {
        const { moldesIds } = calcularImpactoExclusaoPoema(db, id);
        const total = moldesIds.length;
        rotulo =
            total > 0
                ? `Poema · ${total} Molde${total !== 1 ? 's' : ''} de origem voltará${total !== 1 ? 'ão' : ''} a "em andamento"`
                : 'Poema';
    }

    // Avisa quando o Template é um dos de fábrica: excluir aqui é
    // definitivo, não volta sozinho no próximo carregamento (ver
    // templatesEstruturaOcultos acima).
    if (col === 'templatesEstrutura' && item?.embutido) {
        rotulo =
            'Template de Progressão · é um dos templates padrão do app; excluído, não volta sozinho';
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
        aposConfirmar?.();
    });
}

// Exclusão em massa: mesma mecânica de deleteItem, mas pra vários ids de
// uma vez, com um ÚNICO save() e um único toast/"Desfazer" pro lote
// inteiro (bem diferente de chamar deleteItem em loop, que salvaria e
// mostraria um toast pra cada item). Quem chama já deve ter confirmado a
// ação com o usuário (ver excluirSelecao(tabela) em selecao-massa.js) —
// aqui só executa.
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
