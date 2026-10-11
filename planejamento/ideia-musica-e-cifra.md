# Ideia: Música (com letra) e Cifra

Origem: conversa do Victor de 09/10/2026. Estado: **só anotada**, registrada como **Fase 15** no painel de `plano-central.md` (depois da Fase 14, o núcleo de texto compartilhado). Ganha o arquivo `fase-15-musicas.md` quando for começar, como as outras; a Cifra ganha fase própria depois. Nada aqui foi decidido em definitivo: o que está escrito é o rumo conversado, e as perguntas abertas estão no fim.

## Em uma frase

Acolher letras de música no Arquivo Poético como uma entidade própria (Música), para poder compará-las com poemas e prosas (temas, ecos, diálogos entre textos), e deixar a Cifra como uma entidade futura, ligada à Música, no mesmo molde da Escansão em relação ao Poema.

## Por que dentro do Arquivo Poético

- A comparação entre textos é o ponto: letra e poema no mesmo acervo dividem Temas, Autores, Ecos, Locais, Idiomas, Personagens e Estatísticas. Num sistema separado de música essa intersecção se perderia.
- O diferencial do projeto seria justamente essa intersecção: o som que a letra já tem sozinha (sonoridade e escansão) e o que o instrumento acrescenta (a cifra).
- O Victor não toca nenhum instrumento por enquanto e não estudou teoria musical, mas tem um violão em casa e quer aprender em algum momento; quando começar, a versão mínima da Cifra (rótulo "simplificada") já serve. Isso pesa no tamanho: a Cifra entra só na versão mínima (abaixo), e as análises de harmonia ficam para quando houver motivo concreto.

## Fronteira (regra do Victor, para o projeto não perder o controle)

O Arquivo Poético trata de **texto**, e a música entra só como **camada do texto**. Fica de fora: player de áudio, partitura, playlist, afinador, qualquer coisa que não seja texto ou anotação sobre texto. Ideia nova que não passe por essa regra não entra.

## Desenho conversado

### Música (entidade própria)

- **Aba "Músicas"**, no plural, como Poemas, Prosas e Personagens.
- É uma entidade, e não um tipo de Poema, porque tem identidade e relações próprias: compositor e intérprete (papéis de Pessoas, que já existem em `pessoas-papeis`), álbum, ano, versões (original, cover, ao vivo) e vínculo com poemas e outras músicas por Eco.
- **A letra é um campo de texto dentro da Música**, e herda os grupos que já funcionam por `tabela` no `editor.js` (Temas, Local, Idioma, Personagens, Sinalizações), com `'musicas'` como mais um valor de `tabela`.
- Sonoridade e Escansão passam a poder apontar também para uma Música (hoje apontam só para Poema). Ver pergunta F15-D4.
- Precisa de identificador estável, como os outros tipos.

- **Letra é opcional.** Música instrumental é válida (exemplo: _Corta-Jaca_, de Chiquinha Gonzaga, composta como partitura de piano e basicamente sem letra). Por isso a Música é mais que a letra, e a letra vazia não deve fazer a Música parecer incompleta nas listas e nas Estatísticas (ver F15-D8).
- **Links, em lista com tipo.** Um campo repetível `links: [{ tipo, rotulo, url }]`, com tipos como Ouvir (Spotify, YouTube Music), Letra (Genius), Partitura, Cifra e Outro. Só o endereço fica guardado: **sem player embutido** (fica fora da fronteira do projeto) e **sem armazenar arquivos** (o app vive no `localStorage`, que é pequeno; as capas dos livros já pesam o bastante).
- **Partitura não é entidade, é um tipo de link.** Ela é uma imagem ou um PDF (notas num pentagrama), não texto, e no uso real seria só um anexo da Música, sem campos nem análise próprios. O link aponta para onde ela já está (IMSLP, Biblioteca Nacional etc.). Exibir: o padrão é abrir em nova aba; mostrar a imagem dentro do app só funciona se o site de origem permitir, e PDFs e páginas costumam bloquear isso. Se um dia o Victor aprender a ler música, a notação ABC (melodia escrita como texto puro, que um programa desenha como pentagrama) cabe na regra do texto.

### Cifra (entidade futura, ligada à Música)

- Entidade própria, como a Escansão é do Poema. O vínculo fica no registro da cifra (`musicaId`), então **nada precisa ser reservado na Música agora** e criar a Cifra depois é só uma coleção nova, sem migração.
- **Uma Música pode ter várias Cifras** (relação de um para muitos): original, simplificada, outro tom, outro arranjo. Cada Cifra pertence a uma única Música.
- **Onde aparece:** como seção dentro da tela da Música, não como aba própria. A seção "Cifras (N)" começa recolhida, e cada cifra também abre e fecha (fechada, uma linha como "Original · Am"). Reaproveitar o padrão de `togglePainel` (`js/ui.js`). Antes de implementar, conferir como o app mostra hoje a Escansão no Poema e copiar o que já funciona.
- **Versão mínima da Cifra** (a que vale a pena fazer primeiro):
    - Música a que pertence;
    - rótulo da versão ("original", "simplificada");
    - tom (texto livre e opcional, como "Am");
    - o texto da cifra, colado como vem dos sites (acordes numa linha, letra na de baixo), exibido em **fonte monoespaçada**, sem quebra de linha e com rolagem lateral;
    - fonte (de onde foi copiada, por causa de direitos autorais e dos erros comuns em cifras da internet);
    - notas.
- **Protótipo para avaliação:** `prototipos/cifra-minima.html` (página solta, fora do app) mostra a versão mínima com exemplo inventado e seis perguntas para quem toca. A avaliação da amiga do Victor, quando chegar, entra aqui e decide os campos da Cifra de verdade.
- **Fora da versão mínima:** transposição (trocar o tom), modo palco, rolagem automática, leitura dos acordes e análise de harmonia. Como a cifra é guardada como texto puro, nada disso exige migrar o que já foi guardado: um dia o app pode ler os acordes (têm padrão reconhecível) e destacá-los ou transpô-los sobre o mesmo texto.

## Pré-requisito sugerido: refatorar o que Poema e Prosa têm em comum

Antes da Música, vale uma fase de refatoração (a Fase 14 do painel), para a Música não ser o terceiro texto copiado à mão. O que foi visto no código (medição aproximada, a conferir ao começar):

- **Já está compartilhado, por `tabela`:** os grupos de Temas, Assuntos, Locais e Idiomas em `editor.js` (`adicionarTemaTexto(tabela, ...)`, `resetLocaisTexto(tabela)` etc.) e `grupo-personagens.js`. A Música entra nesses sem cópia.
- **Ainda duplicado:** `initFormPoema` e `initFormProsa`, `editarPoema` e `editarProsa` em `forms.js`, os `render...Poema` e `render...Prosa` de `editor.js`, e o HTML dos dois modais (cerca de 73% das linhas de `modal-prosa.html` equivalem às de `modal-poema.html` depois de trocar os prefixos).
- **Risco já visto:** o bug de "Novo tema" editando um tema existente nasceu de uma lista (`idFields` em `prepararNovo`) que cada tipo novo precisa lembrar de atualizar. Quanto mais código paralelo, mais lugares assim.
- **Como fazer:** sem mudar comportamento. Etapa 0 de rede de segurança (a suíte já é grande; conferir quais testes cobrem Poema e Prosa), extrair o miolo comum do formulário e do modal em módulos parametrizados por `tabela`, migrar Poema, depois Prosa, e só então acrescentar Música como terceiro consumidor. Cada etapa termina com a suíte verde e o app utilizável.
- **Quando:** depois das fases já em andamento, uma fase em andamento por vez, como diz o painel.

## Direitos autorais e domínio público

Resumo do que vale (Brasil, Lei 9.610/1998). Não é parecer jurídico: conferir cada caso.

- **Domínio público existe para letras.** A proteção dura 70 anos, contados de 1º de janeiro do ano seguinte à morte do autor. O que conta é a morte do autor, não o ano da gravação nem o quanto a música é "antiga".
- **Letra e música são obras com autores possíveis diferentes.** Para um acervo só de texto, interessa o letrista. Em parceria, há quem entenda que o prazo corre da morte do último coautor sobrevivente; na dúvida, anotar os dois e usar o mais tardio.
- **Obras de autor desconhecido** (cantigas de roda, folclore, tradição popular) são de domínio público, com ressalva para conhecimentos tradicionais.
- **Tradução e versão em português de letra estrangeira tem direito próprio** do tradutor, e pode estar protegida mesmo quando o original não está.
- **Exemplos de autores que, pelas contas, já caíram em domínio público:** Chiquinha Gonzaga (m. 1935), Noel Rosa (m. 1937), Catulo da Paixão Cearense (m. 1946). **Ainda protegidos:** Ary Barroso (m. 1964, cai em 2035), Pixinguinha (m. 1973, cai em 2044), Cartola e Vinicius de Moraes (m. 1980, caem em 2051). Conferir as datas antes de usar.
- **Uso pessoal** de letra de terceiros ainda protegida, para estudo e anotação, é uma coisa; **exportar ou distribuir** é outra. A lei também permite citar trechos curtos para estudo, com a fonte.
- **Regra proposta para o app:** letra de terceiros protegida fica só no acervo pessoal, fora de pacotes da Biblioteca e de exportações compartilhadas. Letra de domínio público pode entrar, com a fonte e a data de morte do autor anotadas (como a Biblioteca já faz com "só onde a biografia documenta"). Letras próprias não têm restrição.

## Perguntas em aberto

- **F15-D1.** As letras serão do próprio Victor (composições dele), de outros artistas, ou as duas? Muda a ligação com Autoria ("sou eu") e o cuidado com direitos autorais.
- **F15-D2.** Nome da aba: "Músicas" (sugestão, por seguir o plural das outras). Nome do campo do texto: "Letra".
- **F15-D3.** Quais campos próprios a Música terá além da Letra: álbum, ano, compositores e intérpretes como Pessoas com papel, versões (original, cover, ao vivo).
- **F15-D4.** Sonoridade e Escansão apontando também para Música, ou só para Poema por enquanto.
- **F15-D5.** A Biblioteca (pacotes de autores) terá músicas? Sugestão: não, por causa dos direitos autorais.
- **F15-D6.** Resolvida na proposta: a refatoração virou a **Fase 14**, depois das Fases 2 e 2b e antes da 10 e da 15 (F14-D1 a F14-D3 no painel).
- **F15-D7.** Estatísticas, exportação e Importação Aditiva da Música: em que etapa entram, seguindo a "cadeia inteira" de `licoes-de-sessao.md` (dado, lógica, modal ou tela, salvar, exportar).
- **F15-D8.** Como mostrar uma Música sem letra nas listas e nas Estatísticas (sugestão: coluna Letra com "Instrumental" como valor próprio, e a Completude não contar a letra como faltante quando a Música for marcada como instrumental) e se os links são uma lista com tipo (sugestão) ou campos fixos (Ouvir, Letra, Partitura).
