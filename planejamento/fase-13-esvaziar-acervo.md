# Fase 13: Esvaziar o acervo

Origem: pergunta do Victor de 05/10/2026 ("não tem botão para esvaziar um acervo? Se eu quiser recomeçar do zero"). Estado: **fase concluída: etapas 13-0 a 13d prontas (13d em 08/10/2026)**; o Victor conferiu no navegador (modo escuro incluído) e deu por funcionando. Decisões F13-D1 a F13-D9 **aprovadas** pelo Victor em 07/10/2026. Nenhuma bloqueia as outras fases.

## Em uma frase

Um botão na área Dados que recomeça o app do zero, com a pessoa escolhendo o que apagar (dados, preferências, cadastros pré-prontos), baixando um backup antes e só liberando o apagar depois de digitar uma palavra.

## Ponto de partida (conferido no código em 05/10/2026)

- **Não existe** botão para esvaziar o acervo inteiro. Há exclusões por tipo (por exemplo "Excluir todos os assuntos") e o "Importar JSON" do cabeçalho, que substitui o acervo pelo conteúdo do arquivo.
- **Onde moram os dados.** O acervo (`db`) fica no `localStorage`, chave `arquivoPoetico_v3`. As imagens de capa ficam no IndexedDB `arquivoPoetico_capas`. Os retratos automáticos (últimos 10, no máximo um a cada 6 horas) ficam no IndexedDB `arquivoPoetico_snapshots`.
- **Preferências.** São várias chaves `arquivoPoetico_*` no `localStorage`, algumas com prefixo e uma por tabela ou aba: Download abrangente, incluir capas no backup, incluir dados pessoais das Pessoas nos JSON, itens por página, nomes de arquivo frequentes, templates de exportação, versões filtradas, colunas, ações por coluna, padrões de colunas e filtros das Estatísticas. `arquivoPoetico_ultimoBackup` é estado, não preferência.
- **Cadastros pré-prontos.** Períodos históricos (12) e Movimentos/Escolas (22 de fábrica) vêm de seed e têm listas de "ocultos" (`periodosHistoricosOcultos`, `movimentosEscolasOcultos`) que registram o que a pessoa excluiu de propósito, para a migração aditiva não trazer de volta. Assuntos e Temas semeados são diferentes: o seed só roda em instalação nova e, depois, são registros comuns, sem marca de origem.
- **Importar um JSON vazio** serve de atalho hoje, mas respeita as chaves do arquivo e não limpa preferências nem capas.

## Desenho proposto

- **Onde:** na área Dados, em bloco separado dos botões de backup ("Zona de risco"), para não ser clicado por engano.
- **Três caixas de escolha, independentes:**
    1. **Dados:** textos, livros e todos os cadastros criados pelo Victor, mais as imagens de capa.
    2. **Preferências:** as chaves `arquivoPoetico_*` do `localStorage` que não são dados.
    3. **Cadastros pré-prontos:** Períodos históricos e Movimentos/Escola de fábrica.
- **Resumo antes de apagar:** o modal mostra, para cada caixa marcada, o que será apagado, com contagens (por exemplo "312 poemas, 18 prosas, 9 livros..."). Sem caixa marcada, o botão fica desabilitado.
- **Backup automático:** ao confirmar, o app baixa o JSON completo (com capas, como o "Baixar JSON" do cabeçalho) e tira um retrato forçado (`tirarSnapshotSeNecessario(db, true)`) antes de apagar. O navegador não avisa se o download terminou, então a palavra digitada é a trava real.
- **Palavra de confirmação:** o botão só habilita depois de digitar a palavra exata.
- **Depois de apagar:** recarrega a página, para o app subir limpo (e outras abas abertas não regravarem dados antigos).

## Regras que o desenho precisa respeitar

- **Cadastros pré-prontos com Dados mantidos.** Textos apontam para períodos e movimentos por id. Apagar um que está em uso deixaria referência solta. Sugestão em F13-D2.
- **Pré-prontos não podem voltar sozinhos.** A migração aditiva recoloca o que falta, pulando o que está nas listas de ocultos. Apagar os de fábrica deve usar esse mesmo registro, e não só filtrar o array.
- **Dados apagados, pré-prontos mantidos** deve dar o mesmo resultado de uma instalação nova (os 12 períodos e os 22 movimentos presentes, listas de ocultos vazias).
- **Retratos automáticos ficam**, por serem a única volta depois de um apagar por engano com backup perdido. Cada edição nova gasta a cota de 10 retratos (um a cada 6 horas no máximo), então o retrato de antes do apagar leva dias para ser empurrado para fora. A janela deve avisar isso (F13-D5).
- **Capas.** Apagar Dados inclui o IndexedDB de capas; o backup baixado antes leva as imagens embutidas.

## Etapas

| Etapa                         | O que entra                                                                                                                                                                                                                                                 |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 13-0 (**pronta, 07/10/2026**) | Inventário: listar com `grep` todas as chaves do `localStorage`, os bancos do IndexedDB e as chaves de `db`, e classificar cada uma em dado, preferência, pré-pronto ou estado. Teste que falha se aparecer chave `arquivoPoetico_*` nova sem classificação |
| 13a (**pronta, 07/10/2026**)  | Lógica pura em `js/esvaziar-acervo.js`: dado o `db` e as caixas marcadas, devolve o resumo com contagens e aplica o apagar; sem DOM. Testes de cada combinação das três caixas, inclusive a de instalação nova                                              |
| 13b (**pronta, 07/10/2026**)  | Modal e botão na área Dados: caixas, resumo, backup automático (reaproveita `exportarJSON` com capas) mais retrato forçado, campo da palavra, botão desabilitado até tudo estar certo; `window.x` e `tests/wiring-onclick.test.js`                          |
| 13c (**pronta, 07/10/2026**)  | Apagar efetivo em `js/apagar-acervo.js`: acervo esvaziado numa cópia e regravado, capas, chaves do `localStorage`, aviso às outras abas e recarga; `save()` ganhou uma trava (`bloquearSalvamento`)                                                         |
| 13d (**pronta, 08/10/2026**)  | Documentação: Central de Ajuda, README e `manutencao/` (status, decisões, schema se mudar algo)                                                                                                                                                             |

Cada etapa termina com a suíte verde e o app utilizável. A 13c é sem volta fácil: exportar um backup novo antes de testar à mão.

## Decisões (D1 a D9 aprovadas em 07/10/2026)

| Código | Pergunta                                                                                                                                        | Sugestão                                                                                                                                                                                                                        |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F13-D1 | O que cada caixa apaga exatamente                                                                                                               | Dados: tudo que é do Victor, inclusive cadastros que ele criou e as capas. Preferências: chaves `arquivoPoetico_*` que não são dados nem estado. Pré-prontos: só Períodos históricos e Movimentos/Escola de fábrica             |
| F13-D2 | Pré-prontos apagados com Dados mantidos: e os textos que os usam?                                                                               | Apagar só os que nenhum texto usa e avisar quantos ficaram por estarem em uso; com Dados também apagados, apagar todos. Alternativa: desligar a caixa quando houver uso                                                         |
| F13-D3 | Assuntos e Temas semeados contam como pré-prontos?                                                                                              | Não: depois do seed são registros comuns e não há marca de origem; entram em Dados. Se o Victor quiser separar, o seed precisa passar a marcar a origem (mudança de schema)                                                     |
| F13-D4 | Qual a palavra de confirmação                                                                                                                   | "ESVAZIAR", fixa, mais o resumo com contagens na mesma janela                                                                                                                                                                   |
| F13-D5 | O que acontece com os retratos automáticos e com o registro do último backup                                                                    | Os retratos ficam sempre (rede de segurança) e a janela avisa isso. O registro do último backup só muda se Dados for apagado                                                                                                    |
| F13-D6 | O backup é obrigatório ou o Victor pode dispensar                                                                                               | Obrigatório quando "Dados" estiver marcado (sempre baixa); dispensável quando só Preferências e/ou Pré-prontos forem apagados, porque o JSON do acervo não perderia nada                                                        |
| F13-D7 | Versões Alternativas (`arquivoPoetico_versoesFiltradas_v1`) são Dados e como protegê-las, já que ficam fora do JSON de backup e dos retratos    | Tratar como Dados; a janela baixa também o arquivo de extras (Versões Alternativas e preferências, ver `decisoes.md`) junto com o backup; antes era o `versoes_filtradas_banco.json`. Alternativa: incluí-las no JSON do acervo |
| F13-D8 | `templatesEstrutura` (e `templatesEstruturaOcultos`) entra em Cadastros pré-prontos                                                             | Sim, mesma caixa de Períodos e Movimentos, com a regra de F13-D2                                                                                                                                                                |
| F13-D9 | Apagar Dados deixa o acervo vazio de verdade, ou o app volta com Assuntos e Temas de exemplo (a chave removida o faria parecer instalação nova) | Vazio de verdade: a 13c regrava o `db` já esvaziado em vez de remover a chave; coerente com F13-D3. A 13a já devolve `regravarAcervo` e não lista a chave do acervo para remover                                                |

## Cuidados de cadeia

- Botão novo com `onclick` inline exige `window.x`: rodar `tests/wiring-onclick.test.js`.
- Sem travessão em texto de interface e de ajuda; commits em inglês; arquivos novos em minúsculas e sem acento.
- A lista de chaves do `localStorage` cresce a cada fase (esta sessão acrescentou uma). O teste da etapa 13-0 existe justamente para o apagar não esquecer a próxima.
- Conferir no navegador, que a suíte não vê: o modal no modo escuro e no celular, o download do backup, a recarga e o estado final de cada combinação das caixas.
