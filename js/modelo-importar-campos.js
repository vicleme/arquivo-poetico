// modelo-importar-campos.js: gera o .json de modelo da "Importar campos".
//
// Lógica pura, sem DOM: a tela (ui-importar-campos.js) só baixa o resultado.
// O modelo serve de exemplo e de explicação, para a pessoa montar o arquivo à
// mão ou entregar a uma IA (junto com a Exportação dos textos) e pedir o
// arquivo pronto. A leitura só usa `textos` e `ligacoes`, então `como_usar`,
// `valores_aceitos`, `exemplos`, `exemplos_ligacoes` e `vocabulario` são só para
// quem lê. Por isso `textos` e `ligacoes` saem vazios: o exemplo não vira
// importação sem querer.
//
// Com `comVocabulario`, o modelo leva o que já existe no acervo (etiquetas por
// categoria, temas e assuntos com os temas de cada um), para a IA reaproveitar
// os nomes em vez de inventar sinônimos (nome novo cria etiqueta, tema, local ou
// pessoa nova). Pessoas ocultas ficam de fora do vocabulário (privacidade).

import { FORMATO_CAMPOS, VERSAO_FORMATO_CAMPOS } from './importar-campos.js';
import { ETIQUETAS_CATEGORIAS, ROTULOS_ETIQUETAS } from './etiquetas.js';
import { nomesTemasDoAssunto, PAPEIS_PESSOA, OPCOES_GRAFIA } from './utils.js';
import { rotuloCaminhoLocal } from './locais.js';

const COMO_USAR = [
    'Cada item de "textos" aponta para UM Poema ou Prosa que já existe no acervo e soma campos a ele. A importação não cria texto e não apaga nada de um texto.',
    'Identifique o texto por "id" (o mais seguro, vem na Exportação .json) ou por "titulo". "tipo" ("poema" ou "prosa") só é preciso se o mesmo título existir nos dois. Título que casa com mais de um texto, id que não bate com o título e texto que não existe ficam de fora e aparecem no relatório.',
    '"etiquetas": objeto com as categorias (Tradição, Estilo, Relação, Sensibilidade, Tom, Domínio Imagético e Outros), cada uma com uma lista de nomes. Etiqueta que ainda não existe na categoria é criada.',
    '"temas": lista de { "tema": "Nome", "papel": "principal" }. Tema que ainda não existe é criado. Sem "papel", um tema novo entra como indefinido e um tema que o texto já tem mantém o papel atual.',
    '"assuntos": lista de { "assunto": "Nome", "papel": "automatico" }. O Assunto precisa existir no cadastro e algum tema do texto precisa pertencer a ele (o Assunto é derivado do tema). Assunto nunca é criado.',
    'Papel do assunto: "automatico" segue o tema (e devolve ao texto um Assunto que tinha sido tirado), "principal", "secundario", "indefinido" fixa sem papel, "nao-se-aplica" tira o Assunto deste texto.',
    '"territorialidade": lista de lugares que o texto cita (países, cidades, bairros, rios). Soma aos que o texto já tem. Local que ainda não existe é criado, sem tipo e sem "pertence a"; organize depois na aba Locais.',
    '"localEscrita": o lugar onde o texto foi redigido, um só. Só preenche se o texto ainda não tem; com a opção "Substituir campos simples" ligada na tela, troca o que já existe.',
    '"pessoas": lista de { "pessoa": "Nome", "papeis": ["Retratado(a)"] }. Os papéis são os de "papeis_da_pessoa" (aceita sem o "(a)", como "Retratado"). Soma: pessoa que o texto já tem ganha só os papéis que faltam, e pessoa que não existe no cadastro é criada. Papel fora da lista deixa aquela pessoa de fora.',
    '"pendencia" (texto) e "fonte" ({ "origem", "edicao", "link", "conferido", "grafia" }, ou só um texto, que vale como origem): campos simples, preenchidos só onde estão vazios (ou trocados, com a opção ligada). Valor vazio nunca limpa nada e "conferido" só vale como true.',
    '"ligacoes": lista de { "tema": "Nome", "assunto": "Nome" } (ou { "tema": "Nome", "assuntos": ["Nome", "Nome"] }). Liga um Tema a um Assunto que JÁ existe, para todos os textos que têm o Tema (o Assunto lista Temas). Não cria Assunto. Um Tema novo só é criado se algum texto do arquivo o traz. As ligações valem antes dos "assuntos" dos textos, então um Tema novo já pode ser usado em "assuntos" no mesmo arquivo. O arquivo pode ter só "ligacoes" (com "textos" vazio) para organizar Temas que ainda não têm Assunto.',
    'Use os nomes que já existem no acervo sempre que houver um equivalente: nome novo cria etiqueta, tema, local ou pessoa nova, e uma variação de grafia vira duplicata.',
    'Só o que está em "textos" e "ligacoes" é lido. As chaves "como_usar", "valores_aceitos", "exemplos", "exemplos_ligacoes" e "vocabulario" são só explicação e podem ser apagadas.',
];

const EXEMPLOS = [
    {
        titulo: 'Título de um poema do seu acervo',
        etiquetas: {
            Tom: ['Esperançoso'],
            Estilo: ['Metapoesia'],
            'Domínio Imagético': ['Astrologia'],
        },
        temas: [
            { tema: 'Resiliência emocional', papel: 'principal' },
            { tema: 'Aceitação da imperfeição', papel: 'secundario' },
            'Função social da arte',
        ],
        assuntos: [
            { assunto: 'Vida emocional', papel: 'automatico' },
            { assunto: 'Arte, cultura e escrita', papel: 'secundario' },
            { assunto: 'Sociedade e política', papel: 'nao-se-aplica' },
        ],
        territorialidade: ['Brasil', 'Santos'],
        localEscrita: 'Santos',
        pessoas: [{ pessoa: 'Nome de uma pessoa', papeis: ['Dedicatário(a)', 'Mencionado(a)'] }],
        pendencia: 'revisar métrica',
        fonte: { origem: 'Obra própria', conferido: true },
    },
    {
        id: 1776750689996,
        tipo: 'prosa',
        etiquetas: { Tom: ['Irônico'], Outros: ['Rascunho'] },
    },
];

const EXEMPLOS_LIGACOES = [
    { tema: 'Efemeridade', assunto: 'Tempo, memória e perda' },
    { tema: 'Memória', assuntos: ['Tempo, memória e perda', 'Identidade e Autoconhecimento'] },
];

function vocabularioDoAcervo(dbRef) {
    const etiquetas = {};
    Object.keys(ETIQUETAS_CATEGORIAS).forEach((categoria) => {
        const nomes = (dbRef.etiquetas || [])
            .filter((e) => e.categoria === categoria)
            .map((e) => e.nome)
            .sort((a, b) => a.localeCompare(b, 'pt-BR'));
        if (nomes.length) etiquetas[ROTULOS_ETIQUETAS[categoria]] = nomes;
    });
    return {
        etiquetas,
        temas: (dbRef.temas || []).map((t) => t.nome).sort((a, b) => a.localeCompare(b, 'pt-BR')),
        assuntos: (dbRef.assuntos || [])
            .map((a) => ({
                assunto: a.nome,
                temas: nomesTemasDoAssunto(a, dbRef.temas).sort((x, y) =>
                    x.localeCompare(y, 'pt-BR'),
                ),
            }))
            .sort((a, b) => a.assunto.localeCompare(b.assunto, 'pt-BR')),
        locais: (dbRef.locais || [])
            .map((l) => rotuloCaminhoLocal(dbRef, l.id))
            .sort((a, b) => a.localeCompare(b, 'pt-BR')),
        pessoas: (dbRef.pessoas || [])
            .filter((p) => !p.oculto)
            .map((p) => p.nome)
            .sort((a, b) => a.localeCompare(b, 'pt-BR')),
    };
}

// Objeto do modelo (a tela faz o JSON.stringify). `dbRef` só é lido com
// `comVocabulario`.
export function gerarModeloCampos(dbRef, { comVocabulario = false } = {}) {
    const modelo = {
        formato: FORMATO_CAMPOS,
        versao: VERSAO_FORMATO_CAMPOS,
        como_usar: COMO_USAR,
        valores_aceitos: {
            tipo: ['poema', 'prosa'],
            categorias_de_etiqueta: Object.keys(ETIQUETAS_CATEGORIAS).map(
                (c) => ROTULOS_ETIQUETAS[c],
            ),
            papel_do_tema: ['principal', 'secundario', 'indefinido'],
            papel_do_assunto: [
                'automatico',
                'principal',
                'secundario',
                'indefinido',
                'nao-se-aplica',
            ],
            papeis_da_pessoa: PAPEIS_PESSOA,
            grafia_da_fonte: OPCOES_GRAFIA.filter((o) => o.valor).map((o) => o.valor),
        },
        exemplos: EXEMPLOS,
        exemplos_ligacoes: EXEMPLOS_LIGACOES,
    };
    if (comVocabulario) modelo.vocabulario = vocabularioDoAcervo(dbRef || {});
    modelo.ligacoes = [];
    modelo.textos = [];
    return modelo;
}

export const NOME_ARQUIVO_MODELO_CAMPOS = 'arquivo-poetico-modelo-campos.json';
export const NOME_ARQUIVO_MODELO_CAMPOS_VOCABULARIO =
    'arquivo-poetico-modelo-campos-com-vocabulario.json';
