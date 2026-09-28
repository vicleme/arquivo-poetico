// ============================================================
// faq-conteudo.js — só os DADOS do bloco "Perguntas frequentes" da
// Central de Ajuda (Bloco 3). Sem seletor, sem aba: são perguntas
// conceituais ("o que é X", "por que Y funciona assim"), não
// procedimentais — essas ficam em como-faco-passos.js, apontando pra
// tela de verdade. Se uma pergunta daqui começar a pedir "onde clico
// pra fazer X", ela pertence ao outro bloco, não a este.
//
// Conteúdo adaptado dos docs/*-for-ai*.md (escritos pra uma IA entender o
// schema) e de decisões já tomadas com o Victor (ver manutencao/decisoes.md),
// reescrito num tom pra quem nunca abriu o console.
// ============================================================

export const CATEGORIAS_FAQ = [
    {
        id: 'geral',
        rotulo: 'Geral',
        perguntas: [
            {
                id: 'faq-onde-dados',
                pergunta: 'Onde ficam meus dados? Vão pra algum servidor?',
                resposta:
                    'Não há servidor: o app roda inteiro no seu navegador. Os textos e metadados ficam salvos em localStorage, e as capas de livro em IndexedDB. Baixe o JSON de vez em quando (botão "Baixar JSON"), que é o seu backup e também serve pra levar o acervo pra outro computador.',
            },
            {
                id: 'faq-perde-dado',
                pergunta: 'Posso perder meus dados limpando o navegador?',
                resposta:
                    'Sim, localStorage e IndexedDB são apagados junto se você limpar os dados de navegação do site. Como não há backend guardando uma cópia em outro lugar, o hábito de baixar o JSON periodicamente é a sua rede de segurança.',
            },
        ],
    },
    {
        id: 'poemas-prosas',
        rotulo: 'Poemas e Prosas',
        perguntas: [
            {
                id: 'faq-elo-referencia',
                pergunta: 'Qual a diferença entre Elo e Referência?',
                resposta:
                    'Elo é uma relação bilateral entre dois textos SEUS (Reescrita, Continuação, Tradução, Versão anterior/oficial, Díptico, Resposta), cadastrada, em geral, dos dois lados. Referência é unidirecional, do texto mais novo pro mais antigo (Personagem em comum, Imagem central compartilhada, Aceno, Outro), e pode citar uma obra que não é sua.',
            },
            {
                id: 'faq-anotacao-descricao-visual',
                pergunta: 'Qual a diferença entre Anotação Marginal e Descrição Visual?',
                resposta:
                    'Anotação Marginal é outra voz comentando o poema, numa fonte diferente da do texto principal, referenciando um trecho específico. Descrição Visual é o próprio poema disposto de forma incomum no espaço, na MESMA fonte, sem quebra de autoria.',
            },
            {
                id: 'faq-dominio-publico-derivado',
                pergunta: 'Por que não consigo marcar um texto como "domínio público" direto nele?',
                resposta:
                    'Porque essa situação não é gravada no texto: ela é calculada a partir do óbito do Autor vinculado. Corrigir a data de óbito no cadastro do Autor corrige automaticamente todos os textos dele, sem precisar mexer um por um.',
            },
        ],
    },
    {
        id: 'sonoridade-molde',
        rotulo: 'Sonoridade, Molde e Análise',
        perguntas: [
            {
                id: 'faq-sonoridade-molde',
                pergunta: 'Qual a diferença entre Sonoridade e Molde?',
                resposta:
                    'Sonoridade é descritiva: parte de um poema já escrito e mapeia a métrica e as rimas que já estão lá. Molde é prescritivo: você planeja a estrutura (métrica, rimas) primeiro e escreve depois, guiado por essa meta, que pode até mudar no meio do processo sem perder o que já foi escrito.',
            },
            {
                id: 'faq-morfofuncionalidade',
                pergunta: 'O que é a aba Morfofuncionalidade?',
                resposta:
                    'Mapeia como um poema se organiza por dentro: Unidades (blocos com uma função, como "apresentação" ou "virada") e Eventos (uma progressão dialética pontual). Os dois podem se sobrepor livremente, o que não é erro, é só como o texto se organiza.',
            },
            {
                id: 'faq-heteronimo-pseudonimo',
                pergunta: 'Qual a diferença entre Heterônimo e Pseudônimo?',
                resposta:
                    'Heterônimo é uma identidade literária com voz e biografia próprias (caso clássico: Fernando Pessoa e Álvaro de Campos). Pseudônimo é só um nome diferente de assinatura, sem essa identidade paralela por trás.',
            },
        ],
    },
];

// Pergunta por id, ou null se não existir — mesmo espírito de
// tarefaComoFaco em como-faco-passos.js.
export function perguntaFaq(id) {
    for (const cat of CATEGORIAS_FAQ) {
        const achada = cat.perguntas.find((p) => p.id === id);
        if (achada) return achada;
    }
    return null;
}
