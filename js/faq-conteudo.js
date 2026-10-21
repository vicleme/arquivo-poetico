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
            {
                id: 'faq-esvaziar-acervo',
                pergunta: 'O que o recurso de esvaziar o acervo apaga?',
                resposta:
                    'Serve para recomeçar do zero, na aba Backup e recuperação (menu Dados). Você escolhe entre três caixas independentes: Dados (textos, livros e cadastros criados por você, capas, Versões Alternativas e os padrões de colunas salvos), Preferências (tema, colunas visíveis, itens por página, filtros e padrões das Estatísticas, templates de exportação e nomes de arquivo frequentes) e Cadastros pré-prontos (períodos, movimentos e templates que vêm de fábrica; os que algum texto usa só saem junto com os Dados). Nada é apagado antes da confirmação final: o app baixa um backup, tira um retrato de segurança e só libera o botão depois que você digita ESVAZIAR.',
            },
            {
                id: 'faq-esvaziar-depois',
                pergunta: 'Depois de esvaziar, dá para voltar atrás?',
                resposta:
                    'Dá, importando o backup que o app baixou na hora. Os retratos automáticos (os últimos 10, guardados no navegador) nunca são apagados e são a outra volta se o arquivo se perder, mas cada edição nova gasta uma vaga. Dois detalhes: os padrões de colunas salvos moram nos Dados e vão no backup, então só somem junto com eles, e não ao apagar só as Preferências; e, se houver outra aba do app aberta, ela avisa e recarrega sozinha para não trazer o acervo antigo de volta.',
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
                id: 'faq-conexoes-buraco',
                pergunta: 'O que é um Buraco na aba Conexões?',
                resposta:
                    'É um Elo registrado só de um lado. Como o Elo liga dois textos seus, o normal é cadastrá-lo nos dois: se o poema A diz "reescrita de B", o B deveria dizer o mesmo de volta. Quando só um dos dois tem o registro, a aba mostra o par incompleto como Buraco, para você completar. Por isso o título de um Buraco abre direto a edição do poema, e não a visualização.',
            },
            {
                id: 'faq-conexoes-relatorio',
                pergunta: 'O que vai em cada formato do relatório da aba Conexões?',
                resposta:
                    'O .md é texto simples, bom para colar numa IA: traz um resumo com as contagens, os Buracos, os Elos (um bloco por par ou por cluster, que é um grupo de três ou mais poemas ligados entre si) e os Ecos (uma linha só para uma cadeia simples, ou uma linha por Eco quando o grafo ramifica ou converge; grafo, aqui, é o desenho de textos ligados por setas). A seta vai sempre do texto mais novo para o mais antigo. O .png é uma imagem do relatório, com os Elos em cartões e os Ecos com os diagramas que a aba desenha, nas cores do tema que estiver ligado. O .pdf leva o mesmo desenho do .png, sempre em tema claro, dividido em páginas A4 com "n / total" no rodapé. Como o .pdf é uma imagem, o texto dele não pode ser selecionado nem pesquisado; para isso use o .md.',
            },
            {
                id: 'faq-conexoes-ver-editar',
                pergunta:
                    'Por que os títulos de Elos e Ecos abrem o Ver, e os Buracos abrem a edição?',
                resposta:
                    'Na aba Conexões você costuma estar lendo um panorama: quer lembrar que poema é aquele e como ele se liga aos outros, sem risco de mexer em nada. O Ver serve a isso, mostra os Elos e os Ecos do poema, e tem o botão Editar para quando você quiser corrigir um rótulo ou um Tipo. O Buraco é o caso contrário, o objetivo ali é consertar, então abre a edição direto. E, dentro do Editar de um poema já salvo, o olho no cabeçalho leva de volta ao Ver; se houver alteração não salva, o app pergunta "Salvar antes de ver?". Editar e Ver se alternam sobre o mesmo poema, nunca ficam empilhados.',
            },
            {
                id: 'faq-conexoes-selecao-some',
                pergunta: 'Por que a seleção de um Eco some depois que eu ligo outro poema a ele?',
                resposta:
                    'Cada cartão selecionado é lembrado pelos poemas que ele reúne, e não pela posição ("Grafo 2" muda de número quando entra um item novo, por isso a posição não serve). Ao ligar outro poema a um grafo de Ecos, o conjunto de poemas do cartão muda, o app o enxerga como outro cartão e a seleção do antigo se perde. É raro e fácil de notar: basta selecionar de novo. O mesmo vale se você apagar um poema ou desfizer um vínculo, o item que deixou de existir sai da seleção sozinho. A seleção vale só enquanto o modo Selecionar está ligado e não fica guardada entre sessões.',
            },
            {
                id: 'faq-livro-ver',
                pergunta: 'Como vejo um livro inteiro, sem abrir o formulário de edição?',
                resposta:
                    'Na aba Livros, clique no olho do card. O Ver mostra a capa, as datas, o ISBN, a situação editorial, a Abertura, a Sinopse, as Orelhas, a Contracapa, as lojas e os links, e no fim quantas partes, seções e textos o livro contém. No cabeçalho, Anterior e Próximo (ou as setas do teclado) andam pelos livros na ordem dos cards, e a caixa de número leva direto a um livro. Dentro do formulário de edição, o olho azul do cabeçalho abre o Ver do mesmo livro: se houver alteração não salva, ele pergunta se você quer salvar antes.',
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
            {
                id: 'faq-etiquetas-tags',
                pergunta: 'O que são Etiquetas (Tags) e como são guardadas?',
                resposta:
                    'São as marcas de Tradição, Estilo, Relação, Sensibilidade, Tom, Domínio Imagético e Outros que você põe nos textos. Cada etiqueta existe uma vez no cadastro, na aba Etiquetas (Tags), e o texto só aponta para ela. Por isso renomear lá muda o nome em todos os textos, e duas etiquetas que dizem a mesma coisa podem ser juntadas com Mesclar. O mesmo nome pode existir em duas categorias, mas não repetido dentro de uma.',
            },
            {
                id: 'faq-etiquetas-renomear-localizar',
                pergunta:
                    'Qual a diferença entre renomear uma etiqueta e trocá-la no Localizar e Substituir?',
                resposta:
                    'Renomear, na aba Etiquetas, muda a etiqueta em todos os textos de uma vez. O Localizar e Substituir mexe só nos textos que você marcar na lista: troca, naquele texto, a etiqueta pela de nome novo (criada se ainda não existe) e deixa o cadastro e os outros textos como estavam. Com o campo "Substituir por" vazio, a etiqueta sai só dos textos marcados.',
            },
            {
                id: 'faq-tag-clusters',
                pergunta: 'O que são Tag clusters (agrupamentos de etiquetas)?',
                resposta:
                    'São grupos de etiquetas que você monta à mão, na aba Tag clusters, para ler as Estatísticas por grupo em vez de por etiqueta. Um cluster pertence a uma categoria (Domínio Imagético, Tom, Tradição, Estilo, Relação ou Sensibilidade) e só aceita etiquetas dela. Uma etiqueta fica em um cluster só, ou em nenhum, e continua sendo etiqueta própria. O cluster não aparece nos modais nem é gravado nos textos: classifica a etiqueta em si. Por isso excluir um cluster só solta as etiquetas e nenhum texto muda. Um cluster pode ter subclusters (um nível só): veja a pergunta sobre subclusters.',
            },
            {
                id: 'faq-tag-clusters-subclusters',
                pergunta: 'O que é um subcluster e como mover uma etiqueta para dentro dele?',
                resposta:
                    'Um subcluster é um grupo dentro de um cluster, na mesma categoria, para dar dois níveis de detalhe (por exemplo, o cluster “Tipografia e diagramação” com os subclusters “Arranjo no espaço da página” e “Marcas de edição”). Só existe um nível: um subcluster não tem subcluster. A etiqueta fica em um lugar só, o mais específico, e pertence ao cluster pai por consequência. Ela também pode ficar direto no pai, sem subcluster. O cluster pai conta os textos dele e dos subclusters sem somar: um texto vale uma vez. Para criar, use “+ Subcluster” no cartão do pai. Para mover uma etiqueta de um lugar para outro, clique no botão ⇄ ao lado dela e escolha o destino (“Pai” ou “Pai > Sub”, ou “Sem cluster”); em tela grande também dá para arrastar o chip até o cartão. Excluir o pai não apaga os subclusters: eles sobem para o topo. O nome pode se repetir em pais diferentes, mas não pode repetir o de um cluster de topo nem o de um irmão.',
            },
            {
                id: 'faq-tag-clusters-importar',
                pergunta: 'Como importar vários tag clusters de uma vez?',
                resposta:
                    'Na aba Tag clusters, clique em Importar clusters, escolha a categoria e cole uma linha por cluster, no formato “Cluster: etiqueta, etiqueta”. Para um subcluster, escreva o caminho: “Cluster > Subcluster: etiqueta, etiqueta” (um nível só; o pai é criado se não existir). Um título como “## Tom” troca a categoria dali em diante. O app cria os clusters e põe as etiquetas, reaproveita o cluster ou subcluster que já existe e não cria etiqueta nova: o que não existir na categoria aparece no relatório. Tudo tem Desfazer.',
            },
            {
                id: 'faq-tag-clusters-baixar',
                pergunta: 'Como baixar os tag clusters em .md, .png ou .pdf, e só alguns deles?',
                resposta:
                    'Na aba Tag clusters, o primeiro menu escolhe o que entra: o que a tela mostra (respeita a busca e o filtro de categoria), todo o cadastro ou, depois de marcar, só os selecionados. O segundo menu escolhe o formato. O .md é texto simples, bom para colar numa IA. O .png é uma imagem com o mesmo visual da aba, nas cores do tema ligado. O .pdf leva o mesmo desenho do .png, sempre em tema claro, dividido em páginas A4 sem cortar cartão ao meio; como é imagem, o texto dele não pode ser selecionado nem pesquisado. Para escolher cartões, clique em Selecionar: cada tag cluster e cada bloco de etiquetas sem cluster ganha uma caixinha. Marcar um cluster marca os subclusters dele junto, e dá para desmarcar um. Um subcluster marcado sem o pai sai como cartão solto, com o nome “Pai > Subcluster”. A seleção vale por si, passa por cima da busca e do filtro, e some ao desligar o modo. Quando o arquivo não é o cadastro inteiro, o nome ganha -filtrado ou -selecao e uma linha no topo diz o recorte.',
            },
            {
                id: 'faq-importar-campos',
                pergunta:
                    'Como preencher etiquetas, temas, pessoas e outros campos de muitos textos de uma vez?',
                resposta:
                    'Na aba Importação, clique em Importar campos (.json). O arquivo aponta cada texto pelo id ou pelo título e traz etiquetas, temas e assuntos (com papel), além de ligações de Temas a Assuntos que já existem, territorialidade, local de escrita, pessoas (com papéis), pendência e fonte. Dá para montá-lo à mão ou pedir a uma IA, entregando o modelo (de preferência o que leva o seu vocabulário) e a exportação dos textos. O app mostra a prévia antes de gravar, tira um snapshot de segurança e permite desfazer.',
            },
            {
                id: 'faq-importar-campos-regras',
                pergunta: 'O que a importação de campos faz com o que o texto já tem?',
                resposta:
                    'Nunca tira nada. Listas (etiquetas, temas, territorialidade, pessoas, jargão e gíria) são somadas, e só o papel de um tema, de um assunto ou de uma pessoa é atualizado quando o arquivo traz outro. Campos de valor único (local de escrita, pendência e fonte) só preenchem o que está vazio, a menos que você ligue “Substituir campos simples” no modal. Etiqueta, tema, local e pessoa que não existem são criados e listados na prévia, para você pegar erro de digitação. Jargão e gíria não tem cadastro: o termo novo entra como está escrito e a prévia o marca como novo. Assunto nunca é criado.',
            },
            {
                id: 'faq-tag-clusters-contagem',
                pergunta: 'Por que a soma dos textos dos tag clusters passa do total de textos?',
                resposta:
                    'Porque um texto tem várias etiquetas, e elas podem estar em clusters diferentes. O texto conta uma vez em cada cluster que tem alguma etiqueta dele, mas só uma vez por cluster, mesmo que use duas etiquetas do mesmo grupo. No cluster pai, vale a união dos textos dele e dos subclusters, também sem somar.',
            },
            {
                id: 'faq-exportar-linhas-comuns',
                pergunta: 'Por que Autoria e Fonte aparecem só no topo do meu .md, .pdf ou .docx?',
                resposta:
                    'Quando você baixa mais de um texto, as linhas que são exatamente iguais em todos eles (por exemplo Autoria, Fonte e Corrente literária) saem uma vez só, no começo do arquivo, sob "Comum a todos os textos", em vez de se repetirem em cada texto. A regra é estrita: se um único texto não tem a linha ou tem outro valor, ela continua em cada texto. Para ter tudo em cada texto, desmarque "Agrupar no topo" em "Opções de download" (a escolha fica guardada). O .json e o .csv não mudam, e baixar um texto só também não.',
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
