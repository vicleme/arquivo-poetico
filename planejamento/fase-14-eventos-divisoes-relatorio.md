# Fase 14 (número provisório): Eventos, Divisões de corrente e Relatório

Planejamento combinado em 15/10/2026, antes de implementar. Para colar no início da próxima sessão, junto com o zip do projeto.

## Em uma frase

Separar, nos modais de Poema e Prosa, o que hoje está misturado no grupo "Períodos, Movimento e Inspiração": **Eventos** deixam de ser períodos comuns e **Divisões** deixam de ser correntes comuns, cada um com campo e coluna próprios. Depois, com essa estrutura pronta, criar o **relatório em .md e .pdf** dos períodos e das correntes, em forma de linha do tempo.

## Já feito nesta conversa

- **"Em aberto"** (15/10/2026). A caixa dos três modais (Período Biográfico, Período Histórico, Corrente) virou "Sem data de fim (conta até hoje)" e ganhou o seletor "Mostrar como" (Em andamento / Em aberto). "Em aberto" grava `emAberto: true` junto de `emAndamento: true` e só troca a palavra mostrada depois da duração. Entregue em `arquivo-poetico-em-aberto.zip`, suíte 3876/3876. **Falta conferir no navegador.**
- **Esfera e Categoria dos Períodos Históricos** (15/10/2026), feitas antes desta fase de propósito (mexem nos mesmos pontos: modal do período, barra de filtros, exportações, importação, backup). Ver F14-D11.
- Antes dele: ordenação por Período Histórico, caminhos nos chips, duração entre parênteses, "Em andamento" com fuso global. Tudo já entregue.

## Termos usados aqui

- **Caminho:** a cadeia de pais de um período ou corrente, por exemplo `Romantismo › Romantismo no Brasil`.
- **Divisão de corrente:** uma corrente que tem pai (`paiId` preenchido). O campo `divisao` já diz o tipo: Variante regional, Fase ou geração, Vertente.
- **Evento:** um período marcado como evento. É algo pontual ou curto, que se cadastra como um período e segue as mesmas regras de datas, duração e "Faz parte de".
- **Derivado:** decidido na hora pelo app a partir de outro dado, sem gravar nada novo. Divisão é derivada de ter pai.
- **Recorte:** o valor por período no texto (`momento` ou `repercussão`), em `epocaRetratada.periodos`.

## Decisões tomadas (do Victor)

| Código  | Decisão                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F14-D1  | O grupo dos modais de texto "Períodos, Movimento e Inspiração" vira dois grupos: **"Períodos e Inspiração"** e **"Correntes literárias"**, nessa ordem, na posição atual do modal.                                                                                                                                                                                                                                                                                            |
| F14-D2  | Nos modais de Poema e Prosa, o grupo **Datas passa a vir antes de Região e Idioma**. A ordem das abas e do menu **não muda** (o "onde" antes do "quando" continua nelas). A diferença é de propósito: a ordem padrão das colunas já põe as datas antes. Registrar isso em `decisoes.md` e atualizar o teste que confere a ordem (`tests/regiao-idioma-dom.test.js`).                                                                                                          |
| F14-D3  | **Evento** é uma marca no cadastro do período (`evento: true`), valendo para Período Biográfico e Período Histórico.                                                                                                                                                                                                                                                                                                                                                          |
| F14-D4  | Os textos continuam guardando períodos e eventos **na mesma lista** (`epocaRetratada.periodos` e o equivalente do Período Histórico). O modal mostra dois campos, **Períodos** e **Eventos**, e a marca decide em qual deles cada chip aparece. Marcar ou desmarcar "é evento" move o chip em todos os textos sozinho, sem migração. O recorte vale igual para eventos.                                                                                                       |
| F14-D5  | **Sem aba nova.** Eventos ficam na aba de períodos, com coluna ou filtro "Período ou evento" (F14-D11) e um selo "Evento". Período e evento se aninham em qualquer direção, e o relatório precisa dos dois juntos.                                                                                                                                                                                                                                                            |
| F14-D6  | **Divisões de corrente são derivadas** (corrente com pai). Campo próprio no modal de texto, coluna própria, sem dado novo gravado.                                                                                                                                                                                                                                                                                                                                            |
| F14-D7  | **Chips de Divisão e de Evento mostram o nome**, com o **caminho completo no tooltip** (`title`), seguindo o padrão atual de caminho no `title` quando passa de 3 itens. Motivo: nomes de divisão se repetem entre correntes ("2ª geração"), e o pai nem sempre está marcado no texto.                                                                                                                                                                                        |
| F14-D8  | **Busca:** `movimento:Romantismo` já é hierárquico (acha também as divisões). **Não muda.** Buscar por uma divisão acha só aquela. Vale a mesma lógica para eventos dentro de períodos (conferir como o prefixo de período se comporta hoje).                                                                                                                                                                                                                                 |
| F14-D9  | **Gráficos e Estatísticas:** dois modos para correntes (e, se couber, períodos e eventos). **Agrupado** (padrão): o pai soma o que foi marcado nele e em todas as divisões, contando cada texto uma vez só por grupo. **Separado:** uma barra por corrente, cada uma só com o que foi marcado nela.                                                                                                                                                                           |
| F14-D10 | **Relatório:** um texto marcado numa divisão aparece **sob a divisão e também sob o pai**, e o pai conta tudo o que está abaixo dele.                                                                                                                                                                                                                                                                                                                                         |
| F14-D11 | **Evento é marca, não Categoria** (15/10/2026). Esfera e Categoria dos Períodos Históricos (feitas antes desta fase) **não têm "Evento pontual"**: Categoria diz o tipo do fenômeno, `evento: true` diz o tamanho do recorte, e as duas se combinam. O filtro "Tipo" da etapa 3 passa a se chamar **"Período ou evento"**, para não se confundir com Categoria. As estatísticas de Esfera e Categoria derivadas nos textos podem usar os modos Agrupado e Separado da F14-D9. |

## Ordem de implementação

Uma etapa por vez, cada uma terminando com suíte verde e app utilizável. O relatório vem por último porque lê a estrutura final.

### Etapa 1. Datas antes de Região e Idioma e divisão em dois grupos (só interface)

**Feita em 15/10/2026** (falta conferir no navegador). Nada citava o nome antigo além de um comentário em `js/editor.js`; os grupos `<details>` não guardam estado aberto/fechado por nome (nenhum código os endereça por nome ou posição), então renomear não perde preferência. Teste: `tests/regiao-idioma-dom.test.js`.

- `modais/modal-poema.html` e `modais/modal-prosa.html`: reordenar Datas antes de Região e Idioma; dividir o grupo "Períodos, Movimento e Inspiração" em "Períodos e Inspiração" (Período Biográfico, Período Histórico, Inspiração) e "Correntes literárias" (Movimento/Escola).
- Conferir tudo o que cita o nome antigo do grupo ou a ordem: comentários em `js/editor.js` (cerca da linha 4904), `tests/regiao-idioma-dom.test.js`, textos do Modo Aprendizado e das FAQs, `manutencao/`.
- Conferir se os grupos recolhíveis guardam estado aberto/fechado por nome (renomear não pode perder a preferência).
- Documentar em `decisoes.md` (F14-D1 e F14-D2).

### Etapa 2. Campo "Divisões" de corrente

**Feita em 16/10/2026** (falta conferir no navegador). Detalhes e escolhas em `manutencao/decisoes.md`. Diferenças em relação ao texto abaixo: a aba de Estatísticas de correntes não tinha contagem de textos por corrente, então os modos Agrupado e Separado vivem num gráfico novo, "Textos por corrente"; a coluna "Corrente literária" passou a mostrar só as de topo; nome novo no campo Divisões não cria corrente (avisa); `.json` e importação aditiva não precisaram mudar. Teste: `tests/divisoes-corrente-textos.test.js`.

- Campo no grupo "Correntes literárias" dos dois modais. O campo de Correntes continua para as correntes de topo (sem pai); Divisões recebe as que têm pai. Sugestões e criação no mesmo molde do campo atual, usando `js/correntes-hierarquia.js` (`paiDaCorrente`, `caminhoDaCorrente`).
- Os textos continuam guardando `movimentosEscolasIds` numa lista só (como hoje). A separação é só de exibição, igual à decisão F14-D4 para eventos.
- Coluna nova "Divisões" em Poemas e Prosas (`js/colunas.js`, `js/render-listas.js`), chip com nome e caminho no tooltip.
- Exportações .md, .csv e .json, modal Ver, importação aditiva. Backup antigo precisa importar normalmente.
- Estatísticas: modos Agrupado e Separado para correntes (`js/estatisticas-dados-correntes.js` e a tela correspondente). Cuidado com a contagem única por texto no modo agrupado.
- Testes novos: separação do campo, coluna, busca hierárquica (garantir que continua igual), exportações, contagem agrupada sem duplicar.

### Etapa 3. Eventos

**Feita em 16/10/2026** (falta conferir no navegador). Edição em massa feita depois (campo "Marca de evento" na aba Período Biográfico). Não feito: Estatísticas (não há gráfico de períodos; registradas na Fase 6 do `plano-central.md`). Detalhes em `manutencao/decisoes.md`. Teste: `tests/eventos-textos.test.js`.

- Caixa "É um evento" nos cadastros de Período Biográfico e Período Histórico (`modais/modal-epoca.html`, `modais/modal-periodo-historico.html`, `js/forms.js`). Só gravada quando marcada (`evento: true`), como `emAndamento`.
- Campo "Eventos" no grupo "Períodos e Inspiração" dos dois modais de texto, filtrando a mesma lista por `evento`. Períodos deixam de mostrar eventos no campo de Período.
- Colunas novas: **Eventos biográficos** e **Eventos históricos**, em Poemas e Prosas. Coluna ou filtro "Período ou evento" (F14-D11, não "Tipo") e selo "Evento" na aba de períodos. A caixa "É um evento" entra ao lado dos campos Esfera e Categoria, que já existem nos cadastros históricos.
- Duração: evento pontual (datas iguais ou uma só) não mostra duração, o que já é o comportamento atual. "Sem data de fim" continua disponível.
- Hierarquia: sem regra nova. As validações de "Faz parte de" (mesmo autor, datas que se sobrepõem, sem ciclo) valem igual, e período e evento se aninham em qualquer direção.
- Edição em massa: avaliar se vale "Marcar como evento" na barra de períodos (não é obrigatório).
- Busca (prefixos), exportações .md, .csv e .json, importação aditiva, modal Ver, Estatísticas (mesmos dois modos da etapa 2).
- Testes novos: marcar e desmarcar move o chip nos textos, colunas, exportações, importação, backup antigo sem `evento`.

### Etapa 4. Relatório em .md e .pdf dos períodos e das correntes

**Feita em 16/10/2026** em três entregas (lógica e `.md`; janela e botões; PDF e documentação). Falta conferir o PDF no navegador. Arquivos: `js/relatorio-periodos.js`, `js/relatorio-pdf.js`, `js/ui-relatorio-periodos.js`, `modais/modal-relatorio-periodos.html`, três botões em `index.html`, ligação em `js/main.js`.

- Pedido original: "Baixar .md e .pdf, em formato de relatório, dos períodos e das correntes. A organização forma uma boa linha do tempo."
- Já decidido: texto de divisão aparece sob a divisão e sob o pai (F14-D10).
- Reaproveitar o que existe: `js/exportar-md.js`, `js/exportar-pdf.js`, `js/exportar-docx.js`, `js/lista-textos-periodo.js` (lista de textos de um período), `js/ocultas-periodos.js` e `js/ocultos-exportacao.js` (regras de itens ocultos).
- Duração no .md: seguir o que foi combinado antes. Escrever com a data da exportação colada ao valor, por exemplo "(2 anos e 7 meses, até 15/10/2026)", porque a duração "até hoje" envelhece. Colocar uma linha "exportado em ..." no topo. JSON e CSV levam os dados brutos (início, fim, `emAndamento`, `emAberto`), nunca a duração calculada.
- **Decidido com o Victor (16/10/2026):** um arquivo por aba, baixado na própria aba; linha do tempo por data, em árvore ou as duas, cada uma em seu arquivo; textos ligados (nenhum, contagem ou títulos) e formato (`.md`, `.pdf` ou os dois) escolhidos na janela de download. Os campos por item, os ocultos e o modo do PDF foram escolhas do Claude, listadas em `manutencao/decisoes.md` (seção "Fase 14, etapa 4") para o Victor confirmar.

## Cuidados gerais

- Seguir `licoes-de-sessao.md`: conferir a cadeia inteira de cada etapa (dado, lógica, modal, salvar, exportar, importar, backup antigo).
- Atualizar a cada etapa `manutencao/status.md`, `manutencao/schema.md`, `manutencao/decisoes.md` e `planejamento/plano-central.md` (no `status.md`, reescrever o "Estado atual") (incluir esta fase na tabela).
- Texto de tela sem travessão, usar vírgula. Termos técnicos explicados antes de usados.
- Se um texto novo for para o repositório, escrever em inglês, com tradução de apoio em pt-BR; este documento de planejamento segue o padrão dos outros arquivos de `planejamento/`.
- Lembrar que nenhuma etapa foi aberta no navegador pelo Claude: a conferência visual é do Victor.

## Para retomar

Enviar este arquivo mais o zip atual do projeto e dizer: "Começa pela etapa 1 do plano da Fase 14".
