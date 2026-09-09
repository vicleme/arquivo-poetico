# Schema — Acervo Poético

> Só a forma atual dos dados. Para o porquê de cada escolha, ver `decisoes.md`. Para histórico de implementação, o próprio código é a fonte de verdade — nenhuma "arqueologia" fica registrada aqui de propósito.

## Poema / Prosa — campos compartilhados

Prosa tem paridade quase total com Poema desde que ganhou os mesmos campos (única diferença de escopo: alvo de Elos/Ecos de Prosa pode ser Poema **ou** Prosa; alvo de Elos/Ecos de Poema é só Poema).

### Intratextualidade — Elos / Ecos

O que acontece entre textos do próprio acervo (vínculo por id).

```json
"conceitos": {
  "elos": [{ "id": 123, "poemaId": 456, "relacao": "Reescrita", "direcao": "destino", "texto": "" }],
  "ecos": [{ "id": 789, "poemaId": 111, "tipo": "Personagem em comum", "texto": "" }]
}
```

- **Elos** (bilateral): `relacao` (`RELACOES_ELO` em `utils.js` — Reescrita, Continuidade, Tradução, Variação, Versão, Resposta, Díptico, Outro) + `direcao` (`origem` = texto mais antigo/base, `destino` = texto derivado/mais novo). Rótulo exibido é dinâmico via `rotuloElo()`, não mapa fixo de inverso.
- **Ecos** (sempre unidirecional, mais novo → mais antigo): só `tipo` (`TIPOS_ECO` em `utils.js` — Personagem em comum, Imagem central compartilhada, Aceno a, Outro), sem `direcao`. Chamado "Referências" antes da reorganização que criou o campo `referenciasExternas` abaixo, de mesmo rótulo mas conceito distinto.
- Alvo de Prosa pode ser Poema ou Prosa (`resolverItemVinculado`/`resolverTituloPoemaOuProsa` resolvem checando os dois arrays — ids nunca colidem, contador global único).
- Migração `conceitos.referencias` → `conceitos.ecos` é feita por `migrarReferenciasParaEcos` em `db.js`, idempotente, e roda antes de qualquer coisa tocar em `referenciasExternas`.

### Intertextualidade e Referências

Diálogo com algo externo ao acervo, sem vínculo por id — dois campos irmãos, mesma forma, tipo e texto livres com datalist de sugestões (a partir do que já foi digitado antes, filtrado pelo Tipo escolhido).

```json
"intertextualidade": [
  { "tipo": "Notícia", "texto": "", "link": "https://...", "linkTexto": "G1 Pernambuco", "nota": "" }
],
"referenciasExternas": [
  { "tipo": "Marco histórico", "texto": "", "link": "", "linkTexto": "", "nota": "" }
]
```

- **Intertextualidade**: obra/autoria identificável (`TIPOS_INTERTEXTO_SUGERIDOS` — Livro, Texto, Música, Filme, Série, Vídeo, Fotografia, Pintura, Peça de teatro, Citação, Conversa, Palestra, Mitologia, Conto de fadas, Outro).
- **Referências** (`referenciasExternas` — chave interna distinta da antiga `conceitos.referencias`, deliberadamente, pra não confundir sessão futura relendo o código): fato do mundo sem autoria de obra sendo ecoada (`TIPOS_REFERENCIA_EXTERNA_SUGERIDOS` — Marco histórico, Notícia, Pessoa pública, Astrologia, Outro). Pessoa pública e Astrologia migraram de Intertextualidade pra cá quando o campo nasceu.
- `link` e `nota` são opcionais nos dois. `linkTexto` é o rótulo opcional exibido no `<a>` no lugar da URL crua — sem ele, cai pra mostrar a própria URL (com `break-all` como rede de segurança em todo lugar que renderiza o link, pra URL longa quebrar linha em vez de estourar o layout).
- Exibição/exportação agrupam por tipo (`agruparIntertextualidadePorTipo` em `utils.js`, reaproveitada pelos dois campos): grupo vira linha com vírgula, ou sub-bullet se alguma entrada tiver link/nota/vírgula no texto.

### Pessoas / Autoria / Grupos (cadastros centrais)

```json
// db.pessoas
{ "id": 1, "nome": "Pedro", "grupoIds": [10] }
// db.grupos
{ "id": 10, "nome": "Família", "cor": "rose" }
// db.autores
{ "id": 1, "nome": "Victor Leme", "sobre": "" }
```

No item:

```json
"pessoas": [{ "pessoaId": 1, "papeis": ["Retratado(a)", "Dedicatário(a)"] }],
"autoria": [{ "autorId": 1, "papel": "Autor" }],
"gruposDiretos": [10]
```

- `pessoas`: array de `{pessoaId, papeis}` — `papeis` é array (0+ valores), não hierarquia fixa por item. `PAPEIS_PESSOA` (`utils.js`, única fonte de verdade, já na ordem de hierarquia — ver `decisoes.md`): Retratado(a), Inspiração para, Dedicatário(a), Mencionado(a), Aludido(a), Associado(a) retroativamente.
- `autoria`: single-role por texto (não acumulativo). `AUTORIA_PAPEIS = ['Autor', 'Coautor']`.
- `gruposDiretos`: array simples de `grupoId`, sem papel — grupo referenciado sem citar nenhuma Pessoa dele em particular. Badge na coluna Grupos aparece junto dos grupos-via-pessoa, sem o parêntese de pessoa.

### Épocas

```json
// db.epocas
{ "id": 123, "nome": "Corte de contato", "contextoRelacao": "Pedro e Victor", "notas": "" }
```

No item:

```json
"epocaRetratada": { "epocaId": 123, "inicio": {...}, "fim": {...}, "recorte": "momento", "na": false }
```

`recorte`: `"momento"` | `"repercussão"` | `null`.

### Envios / Reações

```json
"envios": [
  { "pessoa": "Dani", "data": {"dia":12,"mes":5,"ano":2023}, "meio": "WhatsApp", "reacao": "...", "notas": "" }
]
```

`pessoa` e `meio` são texto livre com autocomplete (sem vínculo por id).

### Reconhecimentos

```json
"reconhecimentos": [
  { "premio": "2º Concurso...", "posicao": "1º lugar", "ano": 2026, "texto": "" }
]
```

### Sinalizações (8 categorias, cada uma string por vírgula)

`sinalizacoesTradicao`, `sinalizacoesEstilo`, `sinalizacoesTema`, `sinalizacoesRelacao`, `sinalizacoesSensibilidade`, `sinalizacoesTom`, `sinalizacoesDominioImagetico` (vocabulário/imagética de um domínio de conhecimento que o texto usa como registro — ex.: Astrologia, Mitologia — diferente de Intertextualidade, que é diálogo com um artefato externo específico), `sinalizacoesOutros` (balde temporário pra tags sem categoria própria).

### Status

Valores: `incompleto`, `completo`, `publicado`, `migrado`, `descartado`, `privado`. `INFO_STATUS` (emoji + título) em `render-listas.js`/`exportar-md.js`:

- 🔒 `privado` — nunca teve intenção de publicação, sempre restrito a contexto pessoal/íntimo (diferente de `descartado`).

Status editorial (Inédito/Esgotado/Domínio público/Reeditado) existe só em `db.livros`/`db.coletaneas`, nunca em Poema/Prosa.

### Outros campos simples

- `idioma`: string (padrão `"pt-BR"`), datalist de sugestão (`IDIOMAS_SUGERIDOS` + o que já está salvo).
- `conteudoSensivel`: booleano, derivado (não é mais tag em Sinalizações).

## Livros / Coletâneas / Partes / Seções

Estrutura hierárquica padrão do acervo — sem mudança de schema registrada aqui além do Status editorial (ver acima).

## Aba "Conexões"

Visão computada pura (`render-conexoes.js`) — sem entidade própria, sem `db.relacoes[]`. Varre `db.poemas`/`db.prosas` na hora: Ecos como grafo direcionado (`montarGrafosEcos`, camadas por longest-path layering), Elos como grafo não-direcionado (pares/clusters via BFS), painel de "buracos" (vínculo com só um lado cadastrado). Referências (`referenciasExternas`), sem vínculo por id, não entram no grafo — só no bloco de texto livre (visualização/exportação).
