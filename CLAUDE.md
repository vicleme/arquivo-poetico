# Arquivo Poético: instruções para o Claude

Leia este arquivo inteiro antes de qualquer outra coisa. Depois leia **só** a seção "Estado atual" de `manutencao/status.md` (o começo do arquivo, até o título "Roteiros de conferência"). Os demais arquivos de `manutencao/` e `planejamento/` só se abrem quando a tarefa pedir (mapa abaixo). Conferir sempre contra o código de verdade, nunca só contra o resumo de uma sessão anterior.

## Como trabalhar

**Testes**

- Não rodar `npm test` (a suíte completa). O Victor roda na máquina dele (cerca de 40 s) e manda o resumo (`# pass` e `# fail`) ou o nome do teste que falhou.
- Rodar só testes direcionados (os arquivos criados ou alterados e os vizinhos óbvios), e só se levarem segundos. Se algum demorar, parar e avisar.
- eslint e prettier nos arquivos tocados podem rodar.
- Nunca esperar com `sleep` um processo em segundo plano sem checar se ele existe e se o log avança.
- O zip não traz `node_modules/`. Para rodar eslint, prettier ou um teste, `npm install` antes. O Victor só roda `npm install` uma vez por pasta, ou quando `package.json` mudar; se uma dependência mudar, avisar.

**Entrega**

- Zip só com os arquivos que mudaram, para colar por cima do projeto. Arquivo apagado não viaja no zip: listar à parte o que o Victor deve apagar.
- Dizer na entrega o que foi rodado e o que ficou por conta dele, para o zip nunca parecer mais verificado do que está.
- Se vier um `.md` solto mais recente que o do zip, ele é a base para editar.
- Terminar a sessão reescrevendo o "Estado atual" do `manutencao/status.md`.

**Estilo**

- Sem travessão em texto de interface, exportação, ajuda, documentação e nas respostas. Nos textos antigos, não reescrever.
- Commits em inglês, no formato de `CONTRIBUTING.md`.
- Nomes de arquivos novos em minúsculas e sem acento.
- Botão com `onclick` inline exige `window.x` (rodar `tests/wiring-onclick.test.js`).
- Responder em português, tratando o Victor no masculino. Ele prefere o mais fácil primeiro e o difícil depois.

## Tarefas grandes: entregar em partes

O limite de uso pode acabar no meio da sessão, e o que não virou zip se perde. Por isso, trabalho grande se divide antes de começar.

- **Quando dividir:** a tarefa mexe em mais de uns 5 arquivos, ou cria módulo, modal e ligação no `main.js` ao mesmo tempo, ou inclui mais de uma função independente (por exemplo `.md` e `.pdf`). Na dúvida, dividir.
- **Primeiro, o plano:** antes de escrever código, dizer ao Victor em poucas linhas as entregas e o que cada uma contém. Só depois começar a primeira.
- **Cada entrega fecha sozinha:** o app continua funcionando sem as próximas, os testes direcionados passam e sai um zip só com o que mudou. Ordem preferida: lógica pura e testes, depois tela e ligação, depois extras (PDF e semelhantes), por último a documentação completa.
- **Zip cedo:** gerar o zip assim que a entrega passar nos testes e no lint. Não gastar chamadas em verificações a mais antes de entregar. Verificação extra vem na entrega seguinte.
- **Documentação em duas camadas:** em toda entrega, só reescrever o "Estado atual" do `status.md`, dizendo o que falta. `decisoes.md`, planos e `plano-central.md` ficam para a última entrega da tarefa.
- **Sinal de alerta:** se a sessão já fez muitas chamadas sem entregar nada, ou se o Victor avisar que o limite está perto, parar o que estiver fazendo, zipar o que já funciona e listar o que falta.
- **Retomada:** a entrega seguinte começa lendo o "Estado atual" e conferindo o código do zip contra ele, sem refazer o que já foi entregue.

## Onde mora cada coisa

Cada fato mora em um lugar só. Ao fechar uma etapa, o detalhe vai para um destes arquivos e os outros, no máximo, apontam para ele. Não criar arquivo novo de "próxima sessão", "resumo" ou "instruções": atualizar o "Estado atual".

- `manutencao/status.md`: o que foi feito, o que falta conferir no navegador e o próximo passo. O topo é o "Estado atual".
- `manutencao/decisoes.md`: porquês das decisões e escolhas do Claude a confirmar.
- `manutencao/schema.md`: forma atual dos dados.
- `manutencao/licoes-de-sessao.md`: erros de coordenação entre sessões. Ler antes de mexer em schema, migração ou na cadeia de um campo.
- `manutencao/criacao-molde.md` e `manutencao/progressao-morfofuncional.md`: desenho dessas duas funções. Ler só ao mexer nelas.
- `planejamento/plano-central.md`: o índice, com uma linha por fase ainda por fazer, a sequência recomendada, os pontos que cruzam fases, o "Do lado do Victor" e o Registro. Sem limite de fases. Resumo, etapas e decisões em aberto de cada fase moram no arquivo dela em `planejamento/` (por exemplo `fase-19-livros.md`); fase ainda sem detalhe fica só com a linha na tabela.
- `planejamento/plano-concluido.md`: uma linha por fase concluída, com o detalhe antigo preservado. Ao terminar uma fase, na última entrega dela, a fase sai do painel e vira linha aqui (o passo a passo está no próprio arquivo). Não ler no começo da sessão.
- `docs/`: guias para IAs externas (do uso do app, não do desenvolvimento).

## Antes de dar uma etapa por pronta

A cadeia de um campo novo tem sete elos: dado, migração, lógica do editor, modal, salvar (`forms.js`), busca e coluna, exportação (`.md`, `.csv`, `.json`, Visualização), mais os docs `for-ai`. Ao mudar o formato de um campo, procurar o nome antigo em todo `js/`, não só nos arquivos que a sessão lembra de ter tocado.
