# Fase 3: Completude e exportação (Bloco 4)

Estatísticas: Completude e exportação PNG/CSV. Sem dependência.

Movido do `plano-central.md` em 20/10/2026, sem reescrever. O painel guarda só a linha da fase.

- Porcentagem de textos com cada campo preenchido (tema, tom, datas, livro, movimento, pessoas e outros), separada por corpus (Meus textos, Obras importadas, Tudo).
- Exportação de gráfico em PNG e dos dados em CSV, a partir das telas de Estatísticas.
- Serve de placar para a Fase 4. Sem dependência. Cria `fase-03-completude-exportacao.md` ao começar.
- **Campo que não se aplica não é lacuna (conversa de 12/10/2026).** Dois casos já conhecidos, e a regra vale para qualquer campo novo com a mesma situação:
    - **Data de escrita e status.** Texto com status **Incompleto** não tem data de escrita de propósito (a escrita não terminou). Se a conta de "data de escrita" incluir esses textos, eles aparecem como falta que não é falta. Sugestão (F3-D1): o denominador dessa conta exclui os textos incompletos.
    - **Livro e corpus.** Os textos de **Obras importadas** vêm da Biblioteca, que não tem livro; por isso não têm. A conta de "livro" vale para **Meus textos**; em Obras importadas, o campo aparece como "não se aplica", a não ser que a Fase 4a passe a trazer o livro de origem no pacote.
- **A conta precisa mostrar o recorte.** Quando um campo for contado sem um grupo (por status ou por corpus), a tela diz isso junto do número, para quem acessa não ler como falta. Exemplo: "Data de escrita: 88% (de 280 textos; 29 incompletos fora desta conta)". Quem quiser ver o bruto tem um botão para incluir todos (F3-D1).
- **O CSV segue a mesma regra:** coluna com o denominador usado e a quantidade excluída, sem recorte escondido.

## Decisões em aberto

| Código | Pergunta                                                                                                         | Sugestão                                                                                                         | Bloqueia |
| ------ | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------- |
| F3-D1  | Como a Completude trata campo que não se aplica (data de escrita de texto Incompleto; livro de Obras importadas) | Excluir do denominador, mostrar na tela e no CSV quantos ficaram de fora e por quê, com botão para incluir todos | Fase 3   |
