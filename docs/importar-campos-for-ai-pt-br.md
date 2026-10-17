# Importar campos por .json: como montar o arquivo

Este documento explica o arquivo que a ferramenta "Importar campos" (aba Importação) lê, para que uma IA possa montá-lo depois de analisar os textos do acervo. Ele não pede nenhuma tarefa por si só. Para o critério de escolha de Temas e Assuntos, veja `temas-assuntos-for-ai-pt-br.md`.

---

## O que a importação faz

Cada item de `textos` aponta para **um Poema ou uma Prosa que já existe** e soma campos a ele. A importação **não cria texto** e **não tira nada** de um texto. O app mostra uma prévia antes de gravar, tira um snapshot de segurança e permite desfazer.

Dois arquivos de modelo podem ser baixados no modal: o modelo comum (explicação e exemplo) e o modelo **com o vocabulário** do acervo (etiquetas por categoria, temas, assuntos com seus temas, locais com caminho e pessoas não ocultas). Se o vocabulário veio junto, **use exatamente esses nomes**: uma variação de grafia cria um registro novo e duplicado.

## Forma do arquivo

```json
{
    "formato": "arquivo-poetico-campos",
    "versao": 1,
    "textos": [
        {
            "id": 1776750689996,
            "titulo": "Olhar Lírico",
            "tipo": "poema",
            "etiquetas": { "Tom": ["Esperançoso"], "Estilo": ["Metapoesia"] },
            "temas": [{ "tema": "Resiliência emocional", "papel": "principal" }],
            "assuntos": [{ "assunto": "Vida emocional", "papel": "automatico" }],
            "territorialidade": ["Brasil", "Santos"],
            "localEscrita": "Santos",
            "pessoas": [{ "pessoa": "Nome de uma pessoa", "papeis": ["Dedicatário(a)"] }],
            "pendencia": "revisar métrica",
            "fonte": { "origem": "Obra própria", "conferido": true }
        }
    ],
    "ligacoes": [{ "tema": "Efemeridade", "assunto": "Tempo, memória e perda" }]
}
```

Só as listas `textos` e `ligacoes` são lidas. Chaves como `como_usar`, `valores_aceitos`, `exemplos`, `exemplos_ligacoes` e `vocabulario`, que vêm no modelo, são explicação e podem ser apagadas.

## Como o texto é achado

- Por `id` (o mais seguro, vem na Exportação `.json`) ou por `titulo` (sem diferenciar caixa nem acento). `tipo` (`poema` ou `prosa`) só é preciso quando o mesmo título existe nos dois.
- Título que casa com mais de um texto, `id` que não bate com o título e texto inexistente **não são adivinhados**: vão para o relatório e ficam de fora.

## Campos de lista (sempre somam)

- **`etiquetas`**: objeto com a categoria como chave (Tradição, Estilo, Relação, Sensibilidade, Tom, Domínio Imagético, Outros) e uma lista de nomes. Etiqueta que não existe na categoria é criada.
- **`temas`**: lista de `{ "tema", "papel" }`, ou só o nome. Papel: `principal`, `secundario` ou `indefinido`. Sem `papel`, tema novo entra indefinido e tema que o texto já tem mantém o papel. Tema novo é criado.
- **`assuntos`**: lista de `{ "assunto", "papel" }`. O Assunto **precisa existir** e algum tema do texto precisa pertencer a ele (o Assunto é derivado do Tema). Papel: `automatico` (segue o tema e devolve um Assunto que tinha sido tirado), `principal`, `secundario`, `indefinido` (fixa sem papel) e `nao-se-aplica` (tira o Assunto deste texto). Assunto nunca é criado.
- **`territorialidade`**: lista de lugares que o **texto cita** (país, cidade, bairro, rio). Local novo é criado sem tipo e sem "pertence a"; a hierarquia se organiza depois na aba Locais. Para um homônimo (São Paulo cidade e estado), escreva o rótulo com o tipo, como "São Paulo (Cidade)".
- **`pessoas`**: lista de `{ "pessoa", "papeis" }`. `papeis` aceita os seis valores da lista fechada (Retratado(a), Inspiração para, Dedicatário(a), Mencionado(a), Aludido(a), Associado(a) retroativamente), com ou sem o "(a)". Pessoa que o texto já tem ganha só os papéis que faltam. Pessoa nova é criada, sem grupo. **Papel fora da lista deixa aquela pessoa de fora** (vai para o relatório). Lista vazia de papéis é válida ("não especificado").

## Ligações entre Tema e Assunto (`ligacoes`)

Lista no topo do arquivo, fora de `textos`: cada item é `{ "tema": "Nome", "assunto": "Nome" }`, ou `{ "tema": "Nome", "assuntos": ["Nome", "Nome"] }` para ligar um Tema a vários Assuntos. Serve para dizer a qual Assunto um Tema pertence.

- A ligação é **do Tema**, não de um texto: vale para todos os textos que têm aquele Tema, os do arquivo e os outros.
- O Assunto **precisa existir** (nunca é criado) e a ligação só soma: nada é tirado de um Assunto.
- As ligações rodam **antes** dos textos. Por isso um Tema novo, trazido por um texto do arquivo, já pode ser usado em `assuntos` no mesmo arquivo, desde que haja a ligação dele.
- Um Tema que não existe no cadastro só é criado se algum texto achado do arquivo o traz. Ligação com Tema que não existe em lugar nenhum vai para o relatório e fica de fora.
- O arquivo pode ter **só `ligacoes`** (com `textos` vazio ou ausente): é o jeito de organizar os Temas que ainda não têm Assunto.
- Ligação que já existe é ignorada e aparece no relatório como "já existia".

## Campos de valor único (só preenchem o vazio)

- **`localEscrita`**: um lugar só, onde o texto foi **redigido** (diferente de territorialidade, que é o que o texto cita).
- **`pendencia`**: texto livre.
- **`fonte`**: `{ "origem", "edicao", "link", "conferido", "grafia" }`, ou um texto simples, que vale como `origem`. `grafia` aceita `atual`, `etimológica` e `quinhentista`. `conferido` só vale como `true` (não desmarca).

Esses campos só gravam se o texto ainda estiver sem valor. Para trocar o que já existe, quem importa liga "Substituir campos simples" no modal; sem isso, o relatório lista o que foi mantido. **Valor vazio no arquivo nunca limpa nada.**

## O que a IA não deve inferir

- Não invente papel de pessoa nem local: se o texto não deixa claro, deixe o campo de fora. "Pessoas" é vínculo com alguém real (retratado, dedicado, mencionado), não um personagem.
- Não registre local de escrita sem base no texto ou na biografia; o campo é "onde foi escrito", e vazio é um estado válido.
- Não crie Assunto: use só os que o vocabulário lista, tanto em `assuntos` quanto em `ligacoes`.
- Não repita um mesmo texto em duas entradas; junte tudo numa só.
