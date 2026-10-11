# Protótipos

Páginas soltas para testar uma ideia antes de ela entrar no app. Nada daqui é carregado pelo `index.html`, nenhum teste depende desta pasta, e cada protótipo pode ser apagado sem afetar o Arquivo Poético.

## cifra-minima.html

Protótipo da versão mínima da Cifra (ver `planejamento/ideia-musica-e-cifra.md`, Fase 15): acordes colados do jeito que aparecem nos sites, guardados por versão (rótulo, tom, capotraste, fonte, notas) e mostrados em fonte monoespaçada, com destaque opcional dos acordes. Serve para quem toca avaliar o formato e os campos, com seis perguntas no fim da página.

- Abre direto no navegador, sem build e sem dependências (só a fonte do Google Fonts, que é opcional).
- A letra e os acordes do exemplo são inventados, não há obra de terceiros.
- Guarda o que o usuário digita no `localStorage`, na chave `cifra-minima-v1`, fora do prefixo `arquivoPoetico_` de propósito: o "Esvaziar o acervo" não toca nela.
- O reconhecimento de acordes (`ACORDE`, uma expressão regular) pode ser reaproveitado na Cifra de verdade.
- Fica de fora do app e de qualquer exportação. Se a pasta for publicada junto com o site, a página fica acessível em `/prototipos/cifra-minima.html`.
