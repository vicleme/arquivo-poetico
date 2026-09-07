# Schema — Acervo Poético

> Só a forma atual dos dados. Para o porquê de cada escolha, ver `decisoes.md`. Para histórico de implementação, o próprio código é a fonte de verdade — nenhuma "arqueologia" fica registrada aqui de propósito.

## Poema / Prosa — campos compartilhados

Prosa tem paridade quase total com Poema desde que ganhou os mesmos campos (única diferença de escopo: alvo de Elos/Referências de Prosa pode ser Poema **ou** Prosa; alvo de Elos/Referências de Poema é só Poema).

### Elos / Referências

```json
"conceitos": {
  "elos": [{ "id": 123, "poemaId": 456, "relacao": "Reescrita", "direcao": "destino", "texto": "" }],
  "referencias": [{ "id": 789, "poemaId": 111, "tipo": "Personagem em comum", "texto": "" }]
}
```

- **Elos** (bilateral): `relacao` (`RELACOES_ELO` em `utils.js` — Reescrita, Continuidade, Tradução, Variação, Versão, Resposta, Díptico, Outro) + `direcao` (`origem` = texto mais antigo/base, `destino` = texto derivado/mais novo). Rótulo exibido é dinâmico via `rotuloElo()`, não mapa fixo de inverso.
- **Referências** (sempre unidirecional, mais novo → mais antigo): só `tipo` (`TIPOS_REFERENCIA` — Personagem em comum, Imagem central compartilhada, Aceno a, Outro), sem `direcao`.
- Alvo de Prosa pode ser Poema ou Prosa (`resolverItemVinculado`/`resolverTituloPoemaOuProsa` resolvem checando os dois arrays — ids nunca colidem, contador global único).

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

### Sinalizações (6 categorias, cada uma string por vírgula)

`sinalizacoesEstilo`, `sinalizacoesTema`, `sinalizacoesRelacao`, `sinalizacoesSensibilidade`, `sinalizacoesTom`, `sinalizacoesOutros` (balde temporário pra tags sem categoria própria).

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

Visão computada pura (`render-conexoes.js`) — sem entidade própria, sem `db.relacoes[]`. Varre `db.poemas`/`db.prosas` na hora: Referências como grafo direcionado (camadas por longest-path layering), Elos como grafo não-direcionado (pares/clusters via BFS), painel de "buracos" (vínculo com só um lado cadastrado).
