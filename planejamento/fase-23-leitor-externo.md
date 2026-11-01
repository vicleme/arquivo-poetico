# Fase 23: Leitor externo (sorteio de leitura enviado a outra pessoa)

Planejada em 01/11/2026, só planejamento, a partir de conversa com o Victor. Não depende de outra fase: reaproveita o sorteio de leitura (`sortear.html`, `js/sortear-pagina.js`, `js/sorteio.js`), os campos públicos (`comentarios-publicos.js`, `paratexto-publico.js`, `autoria-publica.js`) e o vocabulário da Leitura avaliativa da Fase 22 (`js/leitura-avaliativa.js`). A linha da fase mora no `plano-central.md`.

- **Ideia (Victor, 01/11/2026).** Enviar a alguém só a parte de sortear, puxando do acervo dele, para a pessoa conhecer o acervo sem ter o Arquivo Poético inteiro para mexer. Além de sortear, a pessoa deixa por texto um comentário (com nome e e-mail) e a avaliação em corações, favorita textos e acessa os favoritos.
- **Por que no mesmo projeto, e não em outro em paralelo.** A `sortear.html` já é a página de quem lê: tem sigilo do autor em três níveis, Comentários ao leitor, paratexto, ficha do texto e agrupamento de traduções. A única coisa que a prende ao Victor é `lerAcervoDoNavegador()`, que lê o acervo do `localStorage` do navegador onde a página abre. Um segundo projeto copiaria esse código e os dois divergiriam. A avaliação completa também já existe: é o vocabulário da Leitura avaliativa.
- **Como a pessoa recebe.** Um **link** para uma página própria (`leitor.html`), num **site do Netlify só para o leitor**, sem o app em volta. O acervo dela vem de um **pacote cifrado** que a página decifra com a senha digitada.
- **Como as respostas voltam.** Por **arquivo** (caminho A), no celular pelo compartilhamento nativo (abre a lista de apps, sem passar pela pasta Downloads), com download comum onde o aparelho não suportar. Envio automático por serviço externo fica fora desta fase e, se vier, é só um botão a mais sobre o mesmo arquivo de respostas.

## Os três blocos

1. **Pacote do leitor.** Um `.json` cifrado por pessoa, gerado pelo app, com só os textos escolhidos e os cadastros que a página usa. O sigilo e o que é privado são aplicados **ao gerar**, porque tudo o que viaja no arquivo pode ser lido no navegador de quem o recebe (esconder só na tela não protege).
2. **Página do leitor.** Variante da `sortear.html` que pede a senha, decifra o pacote e entrega o resultado como fonte de dados ao `montarSortear`, no lugar do `localStorage`. Ganha favoritar, aba Favoritos, corações, comentário e a avaliação.
3. **Volta das respostas.** O arquivo de respostas entra no app por importação aditiva, numa tabela própria (`db.retornos`), nunca em `db.leituras`, `autoclassificacao` ou `autoavaliacao`, que são a opinião do Victor.

## Pacote cifrado

- **Cifra.** WebCrypto do navegador: chave derivada da senha por PBKDF2-SHA256 (sal de 16 bytes, número alto de iterações, na ordem de 600 mil) e conteúdo em AES-GCM de 256 bits (vetor de 12 bytes). Senha errada falha na verificação do AES-GCM, sem exibir nada. Não precisa de servidor nem de biblioteca.
- **Arquivo.** `{ v, kdf, iter, sal, iv, dados }`, tudo em texto (base64). O sal, o vetor e as iterações não são segredo e viajam no próprio arquivo.
- **Onde fica.** Como o repositório do projeto no GitHub é **público**, os pacotes **nunca entram nele**: a pasta local de pacotes (sugestão: `leitor-pacotes/`) vai para o `.gitignore`, como a `data/`. Eles moram num **único repositório privado**, só do site do leitor, que alimenta um segundo site do Netlify. Cada pacote tem **nome aleatório** (não o nome da pessoa); o link é `leitor.html?p=<nome aleatório>`.
- **Fluxo.** O Victor baixa o arquivo cifrado do app e o põe em `leitor-pacotes/`. O script `scripts/montar-site-leitor.js` copia para a pasta do repositório privado o `leitor.html`, o JS e o CSS que a página usa (código público, copiado) e **todos** os pacotes. Ele faz commit e push no repositório privado, e o Netlify publica. Um repositório para todos os leitores, nunca um por leitor.
- **Alternativa, se o crédito de build pesar.** Arrastar a pasta montada direto no Netlify, sem Git (sem repositório privado). O repositório privado tem a vantagem de guardar o histórico e uma cópia dos pacotes; sem ele, qualquer pacote se regera pelo app, digitando a senha de novo.
- **Senha.** Digitada, individual por pessoa, escolhida pelo Victor (por exemplo apelido mais uma data que só os dois conhecem, **não** aniversário). Mudar a senha é gerar o pacote de novo e publicar: o arquivo antigo no site é substituído. Quem já abriu o pacote continua com o que já viu.
- **Limite honesto.** Como o arquivo cifrado fica no site do leitor, quem descobrir o endereço pode baixá-lo e testar senhas no próprio computador, sem limite de tentativas. As iterações só atrasam o teste. A proteção boa é a combinação de senha não óbvia mais endereço aleatório; o pior caso são textos que o Victor já marcou como sorteáveis, com o sigilo aplicado.
- **Senha no cadastro: não.** O cadastro de pacotes guarda só uma **dica**. A senha inteira iria para todo backup, exportação e zip, e é a chave de um arquivo que está publicado. O Victor guarda a senha no gerenciador dele; o app pede a senha de novo cada vez que gera ou regenera o pacote.

## O que entra no pacote

- **Textos.** Os escolhidos no cadastro de pacotes, desde que passem pela regra do sorteio (`sorteavel` marcado, status diferente de `descartado` e `privado`, com corpo, `leituraAutonoma` fora de `sequencia` e `conjunto`). O texto escolhido que não passa fica no cadastro como "fora do pacote", com o motivo, em vez de sumir sem explicação.
- **Cadastros que a página usa.** Os Temas e os Temas universais (Vitrine de leitura), os Autores e o que a ficha, o paratexto e a autoria pública leem. **Falta inventariar** (etapa 23-0): `montarSortear` lê `db.poemas`, `db.prosas`, `db.temas`, `db.temasUniversais` e `db.autores`, mas `ficha-do-texto.js`, `paratexto-publico.js` e `autoria-publica.js` leem outros cadastros. O pacote leva só o necessário, e um teste renderiza a página com os dados do pacote e mais nada.
- **O que nunca entra**, como já vale na página de quem lê: o vocabulário hiperacionante, Elos, Ecos, Referências, Alusão e Menção, Inspiração não pública, Notas privadas, data de escrita, Intertextualidade de obra pessoal e o nome civil onde houver sigilo (três níveis). A diferença é que no pacote isso é **removido** do arquivo, não escondido na tela.

## Cadastro de pacotes

- **O que guarda.** Nome do pacote (para quem é), dica da senha, lista de textos (`tipo` e `id`), data de criação, data da última geração, endereço (nome aleatório do arquivo). Mais, opcional, uma frase de boas-vindas para aquela pessoa.
- **Como montar (decidido com o Victor).** Seleção texto a texto, com filtro durante a seleção, de dois jeitos:
    - **Pelas tabelas de Poemas e Prosas.** Filtrar (tema, tipo, extensão, peso e os demais), marcar e escolher "Adicionar ao pacote de Fulano". Repetir com outro filtro acumula a seleção. Reaproveita os filtros e as caixas de seleção em massa que já existem.
    - **Dentro do pacote.** Uma tela com os textos do pacote e um contador, para remover texto e usar "marcar todos os filtrados" e "tirar todos os filtrados".
- **Por que um cadastro de pacotes, e não um campo "público" em cada texto.** O mesmo texto pode estar em vários pacotes sem editá-lo, e a lista de quem recebe o quê mora num lugar só.

## Página do leitor

- **Entrada.** Pede a senha (campo de senha, com "mostrar"), decifra e abre. Senha errada: mensagem simples, sem pista.
- **Sorteio.** O mesmo da `sortear.html` (convite, extensão, peso, conteúdo sensível, recentes, traduções), alimentado pelo pacote.
- **Identificação.** Nome e e-mail pedidos **uma vez** (o pacote já sabe para quem é e pré-preenche o nome), guardados no navegador de quem lê. Uma linha avisa para que serão usados e que ficam só com o Victor (LGPD).
- **Favoritos.** Coração ou estrela de favorito por texto e uma aba "Favoritos", guardados no navegador da pessoa e incluídos no arquivo de respostas.
- **Chaves de armazenamento por pacote.** Como todos os pacotes ficam na mesma origem do site, as chaves do `localStorage` (recentes, favoritos, respostas) levam o nome do pacote. Sem isso, quem abre dois pacotes misturaria os dados.

## Avaliação: um registro, duas visões (decidido com o Victor)

Um formulário só, com a parte completa recolhida. Quem começa rápido pode completar depois, e o dado é o mesmo registro com partes em branco.

- **Rápida, sempre à vista:** favoritar, corações, comentário, **Releria?** e **Mostraria a alguém?** (sim, talvez, não, ou em branco).
- **Completa, num bloco que abre:** **De que maneira te pegou** (13 itens, cada um com Pontual, Marcante ou Central), **O que incomodou** (12 itens, sem nível) e a **Avaliação** em linha livre. Os ids e os rótulos vêm de `leitura-avaliativa.js` (`ITENS_PEGOU`, `ITENS_INCOMODOU`, `PESOS`, `RESPOSTAS`), para o retorno ter a mesma forma de uma leitura do app.
- **Corações.** De 0,5 a 5, em passos de 0,5, "quanto eu gosto", nunca nota técnica. **Sem a sugestão automática** (`sugerirCoracoes`): aquela regra é do autor. Em branco é resposta válida em tudo; 0 nunca é gravado.
- **Texto da página na voz de quem lê**, sem jargão do app ("Mostraria a alguém?", e não rótulos de cadastro).

## Arquivo de respostas e `db.retornos`

```json
{
    "v": 1,
    "pacote": "k3x9...",
    "leitor": { "nome": "Fulano", "email": "fulano@exemplo.com" },
    "enviadoEm": "2026-11-20T14:03:00-03:00",
    "respostas": [
        {
            "tipo": "poema",
            "textoId": 12,
            "titulo": "Título na hora do envio",
            "favorito": true,
            "coracoes": 4,
            "comentario": "…",
            "releria": "sim",
            "mostraria": null,
            "pegou": [{ "item": "voz", "peso": "centro" }],
            "incomodou": ["cliche"],
            "avaliacao": "…",
            "atualizadoEm": "2026-11-20T14:01:00-03:00"
        }
    ]
}
```

- **Importação.** Aditiva, pelo mecanismo que já existe (`importar-aditivo.js`), com snapshot de segurança antes de aplicar. Uma resposta por pacote e texto: reenviar o arquivo não duplica, e vale a de `atualizadoEm` mais novo.
- **Texto excluído do acervo depois.** A resposta **fica**, marcada "texto removido", com o título guardado (é a palavra de outra pessoa), ao contrário de `db.leituras`, que sai junto. A ver em F23-D11.
- **Onde o Victor vê.** No Ver do texto (bloco "Retornos de leitores") e numa aba para ler os comentários por pacote e por texto. Estatísticas dos retornos ficam fora desta fase.

## Decisões

**Fechadas com o Victor (01/11/2026)**

- **F23-D1.** Mesmo projeto, página própria para o leitor; nada de projeto em paralelo nem de app inteiro enviado.
- **F23-D2.** A pessoa recebe um link.
- **F23-D3.** As respostas voltam por arquivo (caminho A) por enquanto.
- **F23-D4.** Um pacote por pessoa, com os textos escolhidos para ela.
- **F23-D5.** Pacote cifrado com senha **digitada** e individual; mudar a senha é regenerar e publicar.
- **F23-D6.** Seleção texto a texto, com filtro durante a seleção.
- **F23-D7.** O cadastro guarda só a dica da senha; a senha fica no gerenciador do Victor.
- **F23-D8.** Um registro de avaliação, com a rápida sempre à vista e a completa recolhida; Releria e Mostraria entram na rápida.
- **F23-D9.** O repositório do app é público, então os pacotes ficam **fora dele** (`.gitignore`) e o leitor tem **site próprio**, alimentado por **um** repositório privado para todos os leitores. Alternativa aceita se o crédito de build pesar: arrastar a pasta no Netlify, sem Git.

**Em aberto, com sugestão (a decisão é do Victor)**

- **F23-D10.** Reenvio de respostas: uma por pacote e texto, a mais recente vence (sugestão), ou guardar o histórico de cada texto?
- **F23-D11.** Texto excluído do acervo: a resposta fica marcada "texto removido" (sugestão) ou sai junto?
- **F23-D12.** Nome e e-mail obrigatórios? Sugestão: obrigatórios só para comentar; favoritar e dar corações funcionam sem identificar.
- **F23-D13.** O pacote leva a Vitrine de leitura inteira (convites) ou só os convites que alcançam algum texto do pacote? Sugestão: só os que alcançam algum texto.
- **F23-D14.** Onde fica o cadastro no menu: no grupo Dados, ao lado de Importação (sugestão), ou em Ferramentas, onde já está "Sortear leitura".
- **F23-D15.** Os retornos entram em `db.retornos` como tabela própria, no backup e no Baixar abrangente (sugestão: sim, e **sem** o e-mail na saída "para IA" e na `.md` pública).
- **F23-D16.** Frase de boas-vindas por pacote: entra já na etapa 23-2 ou fica para depois?

## Etapas

Cada uma fecha sozinha: o app segue funcionando sem as próximas, os testes direcionados passam e sai zip só com o que mudou (ver `CLAUDE.md`).

1. **23-0. Levantamento, sem código.** Conferir o código de verdade (não este plano): quais cadastros `ficha-do-texto.js`, `paratexto-publico.js` e `autoria-publica.js` leem; como `montarSortear` recebe o `db`; quais chaves de `localStorage` a página usa; como a cadeia de `db.leituras` está ligada (`db.js`, `exportar.js`, `download-abrangente.js`, `importar-aditivo.js`, exclusão com Desfazer). Ler `licoes-de-sessao.md` antes de mexer em schema. Fecha as decisões F23-D10 a D16.
2. **23-1. Lógica pura e testes.** `pacote-leitor.js` (montar o pacote com o sigilo aplicado e o que é privado removido), `pacote-leitor-cripto.js` (cifrar e decifrar, WebCrypto) e o formato do arquivo de respostas. Testes: o que é privado nunca entra; o sigilo dos três níveis vale; senha errada não abre; o pacote sozinho basta para renderizar a página; texto que não passa na regra do sorteio fica de fora com o motivo.
3. **23-2. Cadastro e geração no app.** `db.pacotesLeitor`, a tela de pacotes (lista, seleção, "marcar todos os filtrados"), a barra "Adicionar ao pacote" nas tabelas, a geração com pedido de senha e o download do arquivo cifrado com o link pronto para copiar. Entra no backup e na exportação. Acrescenta `leitor-pacotes/` ao `.gitignore`.
4. **23-3. Página do leitor.** `leitor.html`: senha, decifrar, sorteio com a fonte de dados do pacote, favoritos e aba Favoritos, identificação, chaves de armazenamento por pacote. Ajuste mínimo em `sortear-pagina.js` para receber a fonte de dados; a `sortear.html` do Victor segue igual. Entra também o `scripts/montar-site-leitor.js` (monta a pasta do site do leitor com o código e todos os pacotes) e o `.gitignore` da pasta montada, se ela ficar dentro do projeto.
5. **23-4. Avaliação e envio.** Formulário rápido e completo, comentário, e "Enviar minhas respostas" com o compartilhamento nativo e o download como alternativa.
6. **23-5. Importar e ler os retornos no app.** `db.retornos`, importação aditiva e idempotente, bloco no Ver do texto, aba de leitura dos comentários, cadeia do dado (backup, exclusão de texto, Desfazer).
7. **23-6. Documentação.** Central de Ajuda (como montar um pacote e o que a pessoa vê), `docs/sorteio-for-ai` (o pacote e o que entra), `schema.md`, `decisoes.md`, `status.md` e arquivar a fase em `plano-concluido.md`.

## Do lado do Victor

- Responder as decisões F23-D10 a D16.
- Uma vez só: criar o repositório **privado** do leitor no GitHub e o segundo site no Netlify ligado a ele (sem comando de build, publicando a raiz).
- Guardar a senha de cada pacote no gerenciador de senhas; o app guarda só a dica.
- A cada pacote novo ou alterado: pôr o arquivo cifrado em `leitor-pacotes/`, rodar o script que monta o site, commit e push no repositório privado (juntar vários pacotes num commit só, por causa do crédito de build; conferir no plano quanto um deploy consome) e mandar à pessoa o link e, separado, a senha.
- Testar no celular de verdade (abrir o link, digitar a senha, sortear, enviar as respostas pelo compartilhamento).

## Pontos de atenção

- **Nunca commitar pacote no repositório público.** O histórico do Git guarda para sempre: um pacote que entre por engano lá não se apaga de verdade. O `.gitignore` é a trava, e o script de montagem só escreve dentro da pasta do repositório privado.
- **Senha fraca.** O arquivo cifrado é público no site; o que o protege é a senha. Evitar aniversário e nome sozinho.
- **Dados de terceiros.** Nome e e-mail de quem lê são dado pessoal: aviso de uma linha na página, e o e-mail fica fora de exportações que o Victor possa mandar a outras pessoas ou a uma IA.
- **Opinião do Victor e opinião de quem lê não se misturam.** `db.retornos` é tabela própria; nada do leitor grava em `db.leituras`, `autoclassificacao` ou `autoavaliacao`.
- **`sorteavel` é a trava de todo pacote.** Texto não marcado nunca sai, mesmo que esteja no cadastro do pacote.
- **Cadeia do dado.** `db.pacotesLeitor` e `db.retornos` são tabelas novas: conferir os elos (dado, lógica, tela, salvar, backup, exportar, excluir, Desfazer) como em `licoes-de-sessao.md`.
