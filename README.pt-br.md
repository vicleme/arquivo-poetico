# Arquivo Poético

🌐 **Idioma:** [English](README.md) | **Português** (você está aqui)

Aplicativo local (sem backend) para organizar, editar e exportar um acervo de
poemas, prosas, livros e coletâneas. Tudo roda no navegador; os dados textuais
ficam salvos em `localStorage` e as capas (imagens) em `IndexedDB`. Os arquivos
`.json` são usados para backup e troca de dados — o backup completo pode
embutir as capas como base64 (checkbox "capas" ao lado de "Baixar JSON"), mas
as exportações seletivas nunca incluem imagens.


---

## Como rodar

O app usa ES Modules, então **não funciona abrindo o `index.html` diretamente**
pelo sistema de arquivos (restrição de CORS do navegador). É preciso um servidor
local estático:

- **VS Code:** instale a extensão [Five Server](https://marketplace.visualstudio.com/items?itemName=yandeu.five-server) ou Live Server e clique em "Go Live"
- **Python:** `python -m http.server` na pasta do projeto, depois acesse `http://localhost:8000`
- **Node:** `npx serve .` na pasta do projeto

Nenhuma dependência precisa ser instalada. O Tailwind CSS é carregado via CDN; Chart.js e DOMPurify são vendorizados localmente em `assets/js/`.

---

## Capturas de tela

### Livros

![Aba Livros](assets/screenshots/livros.png)

### Coletâneas

![Aba Coletâneas](assets/screenshots/coletaneas.png)

### Partes

![Aba Partes](assets/screenshots/partes.png)

### Seções

![Aba Seções](assets/screenshots/secoes.png)

### Poemas

![Aba Poemas](assets/screenshots/poemas.png)

### Prosas

![Aba Prosas](assets/screenshots/prosas.png)

### Elementos

![Aba Elementos](assets/screenshots/elementos.png)

### Estrutura

![Aba Estrutura](assets/screenshots/estrutura.png)

### Exportar

![Aba Exportar](assets/screenshots/exportar.png)

### Estatísticas

![Aba Estatísticas](assets/screenshots/estatisticas.png)

---

## Estrutura de pastas

```
/
├── index.html               → Esqueleto do app: header, nav, abas e #modais-container
├── filtrar.html              → Ferramenta separada para cadastrar versões alternativas
│                                de textos sensíveis antes de exportar para uma IA
│                                (ver seção "Versões Alternativas" abaixo)
├── README.md
│
├── assets/
│   ├── css/
│   │   └── style.css        → Estilos complementares ao Tailwind (CDN)
│   ├── icons/
│   │   └── favicon.svg, favicon-32.png, favicon-180.png
│   ├── logo/
│   │   └── Logo.png, Logo.ai, Logo (variacoes).png, Logo (com margem).png
│   └── screenshots/         → Capturas de tela para o README
│
├── js/                       → Toda a lógica do app (ES Modules)
│   ├── main.js               → Ponto de entrada; liga os onclick="" do HTML às
│   │                           funções e registra cada modal (id, arquivo, init)
│   ├── db.js                 → Estado central + persistência (localStorage)
│   ├── capas.js              → Armazenamento de imagens de capa via IndexedDB;
│   │                           redimensiona e comprime automaticamente no upload
│   ├── modais.js             → Carregamento lazy dos modais via fetch, com cache
│   ├── ui.js                 → Abas, dropdowns, auto-preenchimento (reexporta
│   │                           toggleModal/garantirModal de modais.js)
│   ├── render.js             → Orquestrador: chama, em ordem, os renderers
│   │                           de cada aba a cada 'db:saved' (ver os 3
│   │                           módulos abaixo pra lógica de cada um)
│   ├── render-listas.js      → Renderização de Livros/Partes/Seções/
│   │                           Poemas (+ seleção múltipla)/Prosas/Elementos
│   ├── render-estrutura.js   → Árvore da aba "Estrutura": seleção em
│   │                           cascata, mover ▲▼, mover entre níveis
│   ├── render-lightbox.js    → Carrega capas do IndexedDB de forma
│   │                           assíncrona e exibe lightbox navegável
│   ├── autobackup.js         → Snapshots automáticos do acervo no
│   │                           IndexedDB (rede de segurança além do
│   │                           "Baixar JSON" manual — não substitui)
│   ├── forms.js              → Submit/edição de Livro, Parte, Seção, Poema,
│   │                           Prosa, Elemento
│   ├── editor.js             → Toolbar de formatação do texto + tags/pessoas
│   ├── coletaneas.js         → Lógica da aba de Coletâneas
│   ├── estatisticas.js       → Painel de estatísticas (Chart.js)
│   ├── exportar.js           → Exportação seletiva (por atributos) + exportação
│   │                           da seleção nas listagens de Poemas/Prosas +
│   │                           exportações aninhadas completas
│   ├── nesting.js            → Lógica de encadeamento hierárquico (usada por
│   │                           exportar.js)
│   └── utils.js              → Funções puras sem dependências internas;
│                               inclui modal de confirmação de exclusão,
│                               geração de ID (gerarId) e escaping de HTML
│                               (escapeHtml)
│
├── modais/                    → HTML de cada modal, carregado sob demanda
│   ├── modal-livro.html
│   ├── modal-parte.html
│   ├── modal-secao.html
│   ├── modal-poema.html
│   ├── modal-prosa.html
│   ├── modal-elemento.html
│   ├── modal-col-parte.html
│   └── modal-col-item.html
│
└── data/
    └── arquivo_poetico_backup.json   → Exemplo/backup de dados (não é lido automaticamente)
```

---

## Funcionalidades principais

- **Cadastro hierárquico**: Livros → Partes → Seções, com Poemas, Prosas e
  Elementos Textuais (introdução, multimídia, comentário, respiro, posfácio)
  podendo se vincular a qualquer um desses três níveis.
- **Coletâneas**: aba separada para montar curadorias. Uma Coletânea é um
  registro em `db.livros` com `tipo: "Coletânea"`; ela tem Partes (mesma
  coleção `db.partes` das Partes normais, distinguidas pelo `livroId`) e cada
  Parte tem Itens em `db.itensColetanea` (vinculados por `parteId`), que
  referenciam poemas/prosas já existentes (`refId`/`refTipo`) ou são textos
  exclusivos da coletânea (`textoOverride`). Excluir uma coletânea remove em
  cascata suas partes e itens, sem afetar os textos originais.
- **Capas**: Livros, Partes e Seções aceitam uma imagem de capa. As imagens
  são armazenadas em `IndexedDB` e nunca entram no JSON de backup. O lightbox
  de visualização suporta navegação entre capas com ◀ ▶ e teclas ← →.
- **Datas parciais**: Data de Escrita e Data de Primeira Publicação aceitam
  dia/mês/ano/hora/minuto parciais — preencha só o que souber.
- **Editor de texto rico**: negrito, itálico, sublinhado, alinhamento, cor,
  fonte e tamanho aplicados inline ao texto do poema.
- **Tags e pessoas**: sinalizações (temas) e "dedicado a / sobre quem" como
  etiquetas reutilizáveis, com sugestão por `<datalist>`.
- **Status do Poema**: 🟡 Incompleto, ⚪ Completo, 🟢 Publicado, 🔵 Migrado
  (texto movido de um livro/seção para outro) e 🔴 Descartado.
- **Migração entre livros** (Poema): campos "Cortado de" e "Lançado em"
  (Livro + Parte/Seção), texto livre com sugestão por `<datalist>` dos
  livros/partes/seções já cadastrados — pensados para poemas com status
  Migrado, mas preenchíveis a qualquer momento (o livro de origem pode nem
  existir mais como registro no arquivo). Escolher uma Seção já cadastrada
  preenche o Livro correspondente sozinho; digitar/escolher o Livro filtra
  as sugestões de Seção só às daquele livro.
- **Intertextualidade** (Poema): lista de referências externas (música,
  livro, filme/série, vídeo, citação...), cada uma com tipo + texto — um
  poema pode dialogar com várias referências de tipos diferentes ao mesmo
  tempo. Cada item pode ser editado in-place (clique em ✎ pra reabrir um
  item já salvo antes de excluí-lo).
- **Anexos** (Poema): lista de itens que acompanham o texto — Ilustração,
  Foto, Lettering, Declamação em vídeo, Comentários em vídeo ou Outro —,
  cada um com tipo + descrição, e um link (obrigatório para os tipos de
  vídeo, opcional para os demais). Um poema pode ter um ou vários anexos
  de tipos diferentes ao mesmo tempo, cada um editável in-place como
  Intertextualidade. Um campo de texto livre — **Nota Anexos** — cobre
  observações sobre o conjunto (quando os anexos se relacionam entre si —
  tema, estilo, unidade — e não cada um isoladamente).
- **Anotações Marginais** (Poema): lista de comentários de outra "voz"
  escritos por cima do texto — em geral numa fonte cursiva diferente da
  do poema —, associados a um verso ou trecho específico. Cada item tem
  trecho de referência + posição + fonte + texto; posição e fonte são
  texto livre com sugestão por `<datalist>` (não um select fechado), já
  que a posição pode ser composta (ex.: "abaixo e à esquerda") e a fonte,
  embora costume se repetir, pode variar. Diferente de Intertextualidade
  (diálogo com algo externo ao arquivo) e de Descrição Visual (o próprio
  poema disposto de forma incomum no espaço, na mesma fonte do texto).
- **Ocultação** (Poema): campo de notas livres sobre ocultação de dados.
- **Conteúdo Sensível e Vocabulário Hiperacionante** (Poema): dois campos
  dedicados para notas sobre o próprio texto. Preencher qualquer um dos dois
  marca automaticamente o poema para revisão em Versões Alternativas
  (`filtrar.html`) — ver seção própria abaixo.
- **Estrutura**: árvore navegável de um livro inteiro, com seleção múltipla
  para exportação parcial e botões ▲▼ para reordenação inline.
- **Estatísticas**: resumo geral, distribuição por ano/livro/tema/pessoa
  (Chart.js) e palavras mais frequentes (com stopwords em português).
- **Exportação seletiva**: por tipo, pessoa, tema, intervalo de datas, status
  e livros/coletâneas específicos — além da opção de exportar tudo aninhado
  (Livro → Parte → Seção → Poema) de uma vez. Cada item exportado carrega
  todos os seus campos (`notas`, `pessoas`, `sinalizacoes`, `conceitos` etc.)
  mais o contexto (Livro/Parte/Seção) já resolvido em texto, sem necessidade
  de cruzar IDs. Disponível tanto em JSON (formato de trabalho, reimportável)
  quanto em Markdown (formato de leitura — ver seção própria abaixo).
- **Exportação pela seleção da tabela** (Poemas/Prosas): marque itens pelas
  caixas de seleção da própria listagem e exporte só esses, em JSON ou
  Markdown, pela barra de ações em massa ("⬇ JSON" / "⬇ MD") — complementa
  a Exportação seletiva (que filtra por atributo) e a exportação pontual da
  aba Estrutura ("Exportar selecionados", que filtra pela árvore mas só sai
  em JSON estrutural, sem contexto resolvido nem opção de Markdown).
- **Versões Alternativas (`filtrar.html`)**: ferramenta separada (acessível
  pelo grupo "Ferramentas" na nav do app) para revisar poemas/prosas
  marcados com tags sensíveis e cadastrar versões alternativas do texto
  antes de exportar para uma IA.
  Aceita tanto o backup completo quanto o JSON gerado pela Exportação seletiva.
  As versões cadastradas ficam salvas por título no navegador (banco próprio,
  separado do `localStorage` do app principal) e são reaplicadas
  automaticamente em uploads futuros.
- **Import/export de JSON** para backup completo do acervo (dados textuais).

---

## Formatos de JSON exportados

O app gera cinco tipos distintos de JSON, cada um com um campo `export_format`
que identifica o formato:

| `export_format`       | Gerado por                              | Estrutura                                                                                                      |
| --------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| _(ausente)_           | "Baixar JSON" no header                 | Backup completo: `{ livros, partes, secoes, poemas, prosas, ... }`                                             |
| `exportacao_seletiva` | Aba Exportação → "Baixar JSON seletivo" | Flat enriquecido: `{ export_format, itens: [...], coletaneas: [...] }` — cada item já tem `contexto` resolvido |
| `selecao`             | Listagem de Poemas/Prosas → seleção → "⬇ JSON" | Flat: `{ export_format, itens: [...] }` — mesmo item da Exportação seletiva (contexto resolvido), só com os marcados na tabela |
| `deep_nesting`        | "Exportar tudo aninhado"                | Árvore completa: `{ export_format, data: [livros aninhados], avulsos, coletaneas }`                            |
| _(livro individual)_  | "Baixar este livro completo"            | Objeto único de livro com toda a árvore aninhada                                                               |

---

## Modelo de dados

Os dados vivem em dois lugares distintos no navegador:

### localStorage (`arquivoPoetico_v3`)

| Campo            | Descrição                                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `livros`         | Livros e Coletâneas (distinguidos por `tipo`). O campo `capa` é um ID de referência ao IndexedDB, não base64.             |
| `partes`         | Partes de Livros e de Coletâneas (distinguidas por `livroId`).                                                            |
| `secoes`         | Seções vinculadas a um Livro ou Parte (`paiTipo`/`paiId`).                                                                |
| `poemas`         | Poemas, com vínculo opcional a Livro/Parte/Seção (`paiTipo`/`paiId`).                                                     |
| `prosas`         | Prosas, mesma estrutura dos Poemas.                                                                                       |
| `elementos`      | Elementos Textuais (introdução, multimídia, respiro, posfácio…).                                                          |
| `itensColetanea` | Itens de Coletânea: referenciam um Poema/Prosa existente (`refId`/`refTipo`) ou trazem texto exclusivo (`textoOverride`). |
| `coletaneas`     | **Legado** — não é preenchido pela aba atual; mantido só para compatibilidade ao importar backups antigos.                |

### IndexedDB (`arquivoPoetico_capas`)

Object store `capas`: `{ id: string, blob: Blob }`. Os IDs são referenciados
pelos campos `capa` em `livros`, `partes` e `secoes`. Ao excluir um item, a
capa correspondente é removida automaticamente.

> **Portabilidade**: ao copiar o backup `.json` para outra máquina, os dados
> textuais sempre chegam completos. As capas só acompanham se o checkbox
> "capas" estava marcado na hora de gerar o arquivo (embutidas como base64);
> caso contrário, o campo `capa` no JSON fica como ID órfão e a imagem
> simplesmente não aparece.

---

## Versões Alternativas (`filtrar.html`)

Página separada (fora do SPA de `index.html`, acessada pelo botão "Versões
Alternativas" no header) para revisar textos marcados com tags sensíveis e
cadastrar uma versão alternativa de cada um antes de exportar o acervo para
uma IA. As versões cadastradas (`tituloFiltrado`, `textoFiltrado`, `nota`)
ficam salvas por título num banco próprio no `localStorage`, separado do
banco principal do app — sobrevivem a novos uploads e podem ser
exportadas/importadas independentemente (botões "Exportar banco" / "Importar
banco"). A nota interna de cada versão alternativa é salva apenas nesse banco
e **nunca sai no JSON exportado**.

### Como um texto é considerado sensível

Um poema/prosa entra na lista de revisão quando **qualquer uma** das
condições abaixo é verdadeira:

1. Tem, em Sinalizações, alguma das tags configuráveis em "Tags de filtro" —
   a lista já vem com `Conteúdo sensível` como única tag padrão (cobre
   Prosa, que não tem os campos dedicados abaixo). É totalmente editável:
   pode adicionar, remover ou até esvaziar, e a escolha fica salva no
   navegador, mesmo que seja para tirar o default;
2. Tem o campo dedicado **Conteúdo Sensível** preenchido (campo do Poema,
   ver seção "Funcionalidades principais" acima); ou
3. Tem o campo dedicado **Vocabulário Hiperacionante** preenchido (campo do
   Poema).

Os dois campos dedicados existem hoje só em Poema — Prosa depende só das
tags de "Tags de filtro".

### Distinção de nomenclatura

O app usa dois mecanismos diferentes que poderiam ser confundidos:

- **Exportação seletiva** (aba Exportação): filtra _quais_ itens entram no
  JSON, por pessoa, tema, data, status ou livro. Não altera nenhum texto.
- **Versões Alternativas** (`filtrar.html`): substitui o _conteúdo_ de textos
  sensíveis por versões limpas. Não filtra quais itens aparecem.

### Formatos de JSON aceitos no upload

`filtrar.html` reconhece dois formatos diferentes de arquivo:

1. **Backup completo** (`exportarJSON()`, botão "Baixar JSON" no header) —
   `{ livros, partes, secoes, poemas, prosas, ... }`. Os textos vêm com
   `paiTipo`/`paiId`, e o nome do livro/parte/seção é resolvido consultando
   `db.livros`/`db.partes`/`db.secoes` dentro do próprio `filtrar.html`.
2. **Exportação seletiva** (aba Exportação → "Baixar JSON seletivo") —
   `{ export_format: 'exportacao_seletiva', itens: [...], coletaneas: [...] }`.
   Cada item já vem com `tipo` (`'poema'` ou `'prosa'`) e um campo
   `contexto: { livro, parte, secao }` já resolvido como texto.

`filtrar.html` detecta o formato pela presença do campo `itens` e ajusta a
leitura do contexto de acordo.

> **Limitação conhecida**: itens de Coletânea presentes na exportação seletiva
> (`coletaneas`) não passam pela varredura de tags sensíveis — o registro de
> `itensColetanea` não carrega `sinalizacoes`/`pessoas` próprias (esses campos
> pertencem ao poema/prosa original referenciado por `refId`). Um aviso aparece
> na tela quando o JSON carregado contiver coletâneas.

---

## Licença

O código-fonte da aplicação está sob licença MIT — veja [LICENSE](LICENSE).
O conteúdo literário em `data/` (poemas, prosas e qualquer outro texto
criativo original) **não** está coberto por essa licença e permanece com
todos os direitos reservados ao autor; essa pasta também é excluída do
controle de versão (ver `.gitignore`).

Este projeto vendoriza duas bibliotecas de terceiros em `assets/js/`, cada
uma distribuída com seu cabeçalho de licença original intacto:

- [DOMPurify](https://github.com/cure53/DOMPurify) — Apache License 2.0 / Mozilla Public License 2.0
- [Chart.js](https://www.chartjs.org) — MIT License

O Tailwind CSS é carregado via CDN em tempo de execução (MIT License) e não
é vendorizado neste repositório.
