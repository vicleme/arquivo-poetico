# Fase 4: Biblioteca (pacotes com dados preenchidos)

Fases 1, 2 e 3 de A. Depende de F4-D1 (só a 4c).

Movido do `plano-central.md` em 20/10/2026, sem reescrever. O painel guarda só a linha da fase.

**Ordem de execução: 4b, 4a, 4c** (decidido em 01/10/2026). As letras ficam como estão; abaixo, as levas seguem a ordem das letras só por leitura.

- **4a, fatos verificáveis:** ano de publicação e de escrita, livro de origem, edição de referência; no autor, gênero, cor/raça (só onde documentado) e ocupações. Exige estender `montarItem` e `cabecalhoPacote` para aceitar `livro` e `epocaRetratada` no `meta`, com testes. Começar pelos três pacotes novos (`mario-de-andrade`, `renee-vivien`, `virginia-woolf`) e depois os oito antigos.
- **4b, contexto e movimento:** `contextoHistorico`, `movimentosEscolas` e período histórico em texto **e em autor** (estender `criarEntidade` para o Autor receber `movimentosEscolasIds`). O pacote tenta o seed e pode nomear fora dele (decidido em 28/09/2026). Ideia solta: o `montar-pacote` avisar quando o nome não está no seed.
- **4c, interpretação:** tema, tom, domínio imagético, dedicatários. Só depois de F4-D1.
- **Travas já decididas:** só preencher onde a biografia documenta; vazio significa não documentado; os atributos vêm prontos no pacote.
- **Links:** só 7 dos 52 textos têm link de fonte; os 45 sem link ficam por conta do Victor passar. Começar por Renée Vivien (fr.wikisource) e Virginia Woolf (en.wikisource).

## Decisões em aberto

| Código | Pergunta                                                                            | Sugestão                                                                                        | Bloqueia |
| ------ | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------- |
| F4-D1  | Tema, tom e domínio imagético nos pacotes saem marcados como "sugestão de leitura"? | Marcar (é leitura, não dado). Falta desenhar como: etiqueta no campo ou filtro nas Estatísticas | etapa 4c |
