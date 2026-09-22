import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const {
    construirLinhasIniciais,
    dividirSilabas,
    calcularMaxSilabas,
    calcularContagemMetrica,
    calcularDivergenciaSilabas,
    extrairAlvo,
    atualizarTamanhoVersoSonoridade,
    digrafoDivididoNoTexto,
    indicesDigrafoDivididoNoTexto,
    removerBarraDivisoria,
    deslocarBarraDigrafo,
    celulasComDigrafoDividido,
    contarDigrafosDivididos,
    mesclarDigrafoDividido,
    mesclarTodosDigrafosDivididos,
    calcularVersosComDigrafoDividido,
    calcularLetrasRima,
    calcularPosicaoPar,
    calcularDistanciaPar,
    calcularProximidadePar,
    calcularClassificacaoSonora,
    calcularTalyPorEixo,
    EIXOS_CLASSIFICACAO_PAR,
    rotuloCurtoValor,
    CAMPOS_CONTAVEIS_RIMA,
    camposContaveisEco,
    construirCamposContaveisSonoridade,
    inicializarGradeSonoridade,
    obterLinhasSonoridade,
    obterRimasSonoridade,
    obterEcosSonoridade,
    celulasComEco,
    celulasDivergentesPeMetrico,
    calcularLetraRimaEsperada,
    mostrarEcosAtivo,
    definirMostrarEcos,
} = await import('../js/editor-sonoridade.js');
const {
    ACENTUACOES_RIMA,
    TONALIDADES_RIMA,
    RIQUEZAS_RIMA,
    TIPOS_ECO,
    TIPOS_ECO_SONORO,
    classificarTonicidade,
} = await import('../js/utils.js');

describe('construirLinhasIniciais', () => {
    it('numera só os versos, pulando linhas vazias/quebras de estrofe', () => {
        const linhas = construirLinhasIniciais('Primeiro verso\n\nSegundo verso\nTerceiro verso');
        assert.deepEqual(
            linhas.map((l) => l.tipo),
            ['verso', 'vazia', 'verso', 'verso'],
        );
        assert.equal(linhas[0].numero, 1);
        assert.equal(linhas[2].numero, 2);
        assert.equal(linhas[3].numero, 3);
    });

    it('remove marcação de ênfase markdown (**negrito**/_itálico_) do texto do verso', () => {
        const linhas = construirLinhasIniciais('Um **verso em negrito** e _um em itálico_');
        assert.equal(linhas[0].texto, 'Um verso em negrito e um em itálico');
    });

    it('trata texto vazio/ausente como uma única linha vazia', () => {
        assert.deepEqual(construirLinhasIniciais(''), [{ tipo: 'vazia' }]);
        assert.deepEqual(construirLinhasIniciais(undefined), [{ tipo: 'vazia' }]);
    });

    it('linhasIgnoradas remove a linha inteira, não conta nem como linha vazia', () => {
        const linhas = construirLinhasIniciais('Título\nVerso 1\nVerso 2', '1');
        assert.deepEqual(
            linhas.map((l) => l.tipo),
            ['verso', 'verso'],
        );
        assert.equal(linhas[0].texto, 'Verso 1');
        assert.equal(linhas[0].numero, 1);
        assert.equal(linhas[1].numero, 2);
    });

    it('linhasIgnoradas aceita intervalos e números soltos misturados', () => {
        const linhas = construirLinhasIniciais('A\nB\nC\nD\nE', '1-2, 4');
        assert.deepEqual(
            linhas.map((l) => l.texto),
            ['C', 'E'],
        );
    });

    it('remove comentário HTML por completo', () => {
        const linhas = construirLinhasIniciais('Verso com <!-- nota --> comentário');
        assert.equal(linhas[0].texto, 'Verso com  comentário');
    });

    it('remove só a tag de um elemento HTML, preservando o conteúdo', () => {
        const linhas = construirLinhasIniciais('<div style="color:red">Verso</div> normal');
        assert.equal(linhas[0].texto, 'Verso normal');
    });

    it('escapa barra já presente no texto do poema, pra não nascer pré-dividida', () => {
        const linhas = construirLinhasIniciais('pós-p/a/r/t/i/d/a');
        assert.equal(linhas[0].texto, 'pós-p\\/a\\/r\\/t\\/i\\/d\\/a');
        // Como o resto da função documenta: sem barra "de verdade" (não
        // escapada), o verso inteiro é uma única sílaba até o usuário
        // começar a dividir — mesmo tendo barra no texto original.
        assert.equal(dividirSilabas(linhas[0].texto).length, 1);
    });
});

describe('dividirSilabas', () => {
    it('divide pela barra não escapada', () => {
        assert.deepEqual(dividirSilabas('Quan/do o/ sol'), ['Quan', 'do o', 'sol']);
    });

    it('barra escapada (\\/) não divide e volta a ser barra literal na sílaba', () => {
        assert.deepEqual(dividirSilabas('p\\/a\\/r\\/t\\/i\\/d\\/a'), ['p/a/r/t/i/d/a']);
    });

    it('mistura barra real com barra escapada na mesma linha', () => {
        // Hífen é removido do segmento como sempre (não é exclusividade
        // desse teste) — o que se verifica aqui é só a barra escapada
        // sobrevivendo dentro do mesmo segmento que a divisão real.
        assert.deepEqual(dividirSilabas('pós-p\\/a\\/ra/da'), ['pósp/a/ra', 'da']);
    });

    it('ainda remove hífen ortográfico normalmente ao redor de barra escapada', () => {
        assert.deepEqual(dividirSilabas('di-ze\\/-me'), ['dize/me']);
    });
});

describe('calcularMaxSilabas', () => {
    it('conta sílabas pelo número de barras + 1, ignorando linhas vazias', () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol/ se/ pôs' },
            { tipo: 'vazia' },
            { tipo: 'verso', numero: 2, texto: 'A/lém' },
        ];
        assert.equal(calcularMaxSilabas(linhas), 5);
    });

    it('sem nenhuma barra em nenhum verso, o máximo é 1 (verso inteiro é uma célula só)', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'Um verso qualquer' }];
        assert.equal(calcularMaxSilabas(linhas), 1);
    });

    it('sem nenhum verso (só linhas vazias ou array vazio), o mínimo é 1', () => {
        assert.equal(calcularMaxSilabas([{ tipo: 'vazia' }]), 1);
        assert.equal(calcularMaxSilabas([]), 1);
    });
});

describe('classificarTonicidade', () => {
    it('oxítona com acento gráfico', () => {
        assert.equal(classificarTonicidade('sofá'), 'oxitona');
        assert.equal(classificarTonicidade('café'), 'oxitona');
        assert.equal(classificarTonicidade('também'), 'oxitona');
        assert.equal(classificarTonicidade('chapéu'), 'oxitona'); // tônica é ditongo "éu"
    });

    it('oxítona sem acento (terminações padrão)', () => {
        assert.equal(classificarTonicidade('animal'), 'oxitona');
        assert.equal(classificarTonicidade('cantar'), 'oxitona');
        assert.equal(classificarTonicidade('jasmim'), 'oxitona');
        assert.equal(classificarTonicidade('javali'), 'oxitona');
        assert.equal(classificarTonicidade('urubu'), 'oxitona');
        assert.equal(classificarTonicidade('comum'), 'oxitona');
        assert.equal(classificarTonicidade('irmã'), 'oxitona');
        assert.equal(classificarTonicidade('chimarrão'), 'oxitona');
    });

    it('paroxítona com acento gráfico', () => {
        assert.equal(classificarTonicidade('fácil'), 'paroxitona');
        assert.equal(classificarTonicidade('hífen'), 'paroxitona');
        assert.equal(classificarTonicidade('mártir'), 'paroxitona');
        assert.equal(classificarTonicidade('tórax'), 'paroxitona');
        assert.equal(classificarTonicidade('álbum'), 'paroxitona');
        assert.equal(classificarTonicidade('tênis'), 'paroxitona');
        assert.equal(classificarTonicidade('vírus'), 'paroxitona');
        // ã/õ final não é o acento — o acento de verdade decide, mesmo
        // a palavra terminando em ã/ão (ver comentário da função).
        assert.equal(classificarTonicidade('órfã'), 'paroxitona');
        assert.equal(classificarTonicidade('órgão'), 'paroxitona');
    });

    it('paroxítona sem acento (terminações padrão)', () => {
        assert.equal(classificarTonicidade('casa'), 'paroxitona');
        assert.equal(classificarTonicidade('gente'), 'paroxitona');
        assert.equal(classificarTonicidade('livro'), 'paroxitona');
        assert.equal(classificarTonicidade('jovem'), 'paroxitona');
    });

    it('proparoxítona (sempre acentuada)', () => {
        assert.equal(classificarTonicidade('século'), 'proparoxitona');
        assert.equal(classificarTonicidade('público'), 'proparoxitona');
        assert.equal(classificarTonicidade('árvore'), 'proparoxitona');
        assert.equal(classificarTonicidade('sábado'), 'proparoxitona');
        assert.equal(classificarTonicidade('história'), 'paroxitona'); // controle: só 1 depois
    });

    it('monossílabo é tratado como tônico (limitação documentada de clítico átono)', () => {
        assert.equal(classificarTonicidade('sol'), 'oxitona');
        assert.equal(classificarTonicidade('não'), 'oxitona');
        assert.equal(classificarTonicidade('que'), 'oxitona');
    });

    it('string vazia/nula devolve null', () => {
        assert.equal(classificarTonicidade(''), null);
        assert.equal(classificarTonicidade(null), null);
        assert.equal(classificarTonicidade(undefined), null);
    });
});

describe('calcularContagemMetrica', () => {
    it('verso terminado em oxítona: contagem métrica = contagem gramatical', () => {
        // "Quan/do o/ sol/ se/ pôs" — 5 sílabas gramaticais, "pôs" é
        // monossílabo (oxítona aqui) — nada a descartar.
        assert.equal(calcularContagemMetrica('Quan/do o/ sol/ se/ pôs'), 5);
    });

    it('verso terminado em paroxítona: descarta 1 sílaba átona final', () => {
        // "Bri/sa/ le/ve/ so/bre a/ ca/sa" — 8 sílabas gramaticais,
        // "casa" é paroxítona — métrica corta a última ("sa"), fica 7.
        assert.equal(calcularContagemMetrica('Bri/sa/ le/ve/ so/bre a/ ca/sa'), 7);
    });

    it('verso terminado em proparoxítona: descarta 2 sílabas átonas finais', () => {
        // "Bri/lha o/ sol/ pú/bli/co" — 6 sílabas gramaticais, "público"
        // é proparoxítona — métrica corta as 2 últimas ("bli","co"), fica 4.
        assert.equal(calcularContagemMetrica('Bri/lha o/ sol/ pú/bli/co'), 4);
    });

    it('nunca desce abaixo de 1, mesmo num verso monossilábico curto', () => {
        assert.equal(calcularContagemMetrica('Sol'), 1);
    });

    it('sem nenhum verso real (texto vazio), devolve 0', () => {
        assert.equal(calcularContagemMetrica(''), 0);
    });
});

describe('calcularDivergenciaSilabas — contagem métrica (corte na última tônica)', () => {
    it('verso paroxítono com 1 sílaba gramatical "sobrando" NÃO diverge do alvo métrico', () => {
        // "Bri/sa/ le/ve/ so/bre a/ ca/sa" tem 8 sílabas gramaticais, mas
        // 7 métricas (casa é paroxítona) — contra um alvo de 7 (ex.
        // "Redondilha Maior (7)"), não deveria mais disparar falso
        // positivo (antes da correção, comparava 8 contra 7 e divergia).
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'Bri/sa/ le/ve/ so/bre a/ ca/sa' }];
        assert.deepEqual(calcularDivergenciaSilabas(linhas, 'Redondilha Maior (7)'), []);
    });

    it('verso proparoxítono com 2 sílabas gramaticais "sobrando" NÃO diverge do alvo métrico', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'Bri/lha o/ sol/ pú/bli/co' }];
        assert.deepEqual(calcularDivergenciaSilabas(linhas, 'Redondilha Menor (4)'), []);
    });

    it('ainda diverge quando a contagem métrica de verdade não bate', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'Bri/sa/ le/ve/ so/bre a/ ca/sa' }];
        // 7 sílabas métricas contra um alvo de 5 — diverge de verdade.
        assert.deepEqual(calcularDivergenciaSilabas(linhas, 'Redondilha Menor (5)'), [1]);
    });
});

describe('extrairAlvo', () => {
    it('extrai o número entre parênteses do rótulo de Tamanho do Verso', () => {
        assert.equal(extrairAlvo('Decassílabo (10)'), 10);
        assert.equal(extrairAlvo('Redondilha Maior (7)'), 7);
    });

    it('devolve null pra rótulo sem número fixo ou vazio', () => {
        assert.equal(extrairAlvo('Bárbaro'), null);
        assert.equal(extrairAlvo(''), null);
        assert.equal(extrairAlvo(undefined), null);
    });
});

describe('digrafoDivididoNoTexto', () => {
    it('detecta barra real dividindo "rr"', () => {
        assert.equal(digrafoDivididoNoTexto('car/ro'), true);
    });

    it('detecta barra real dividindo "ss"', () => {
        assert.equal(digrafoDivididoNoTexto('pas/sar'), true);
    });

    it('não acusa divisão gramatical normal em outras posições da mesma palavra', () => {
        assert.equal(digrafoDivididoNoTexto('car-ro'), false);
        assert.equal(digrafoDivididoNoTexto('ca/rro'), false);
    });

    it('não acusa barra escapada (\\/) entre as letras do dígrafo', () => {
        assert.equal(digrafoDivididoNoTexto('car\\/ro'), false);
    });

    it('não acusa "r" ou "s" isolados de palavras diferentes ao redor da barra', () => {
        assert.equal(digrafoDivididoNoTexto('flor/ sol'), false);
        assert.equal(digrafoDivididoNoTexto('mas/ tarde'), false);
    });

    it('texto sem barra nenhuma não acusa nada', () => {
        assert.equal(digrafoDivididoNoTexto('carro'), false);
    });
});

describe('calcularVersosComDigrafoDividido', () => {
    it('devolve os números das linhas de verso com dígrafo dividido, ignorando as demais', () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Car/ro veloz' },
            { tipo: 'vazia' },
            { tipo: 'verso', numero: 2, texto: 'Um verso normal' },
            { tipo: 'verso', numero: 3, texto: 'Pas/sa o tempo' },
        ];
        assert.deepEqual(calcularVersosComDigrafoDividido(linhas), [1, 3]);
    });

    it('array vazio ou sem dígrafo dividido devolve array vazio', () => {
        assert.deepEqual(calcularVersosComDigrafoDividido([]), []);
        assert.deepEqual(
            calcularVersosComDigrafoDividido([
                { tipo: 'verso', numero: 1, texto: 'Sol sobre o mar' },
            ]),
            [],
        );
    });
});

describe('indicesDigrafoDivididoNoTexto', () => {
    it('devolve o índice (0-based, só contando barras reais) de cada ocorrência', () => {
        assert.deepEqual(indicesDigrafoDivididoNoTexto('car/ro'), [0]);
        // "Quan/do car/ro" — 1ª barra (índice 0) é divisão normal, a 2ª
        // (índice 1) é que divide o dígrafo.
        assert.deepEqual(indicesDigrafoDivididoNoTexto('Quan/do car/ro'), [1]);
    });

    it('mais de uma ocorrência no mesmo verso — devolve todos os índices', () => {
        assert.deepEqual(indicesDigrafoDivididoNoTexto('car/ro pas/sa'), [0, 1]);
    });

    it('sem ocorrência nenhuma devolve array vazio', () => {
        assert.deepEqual(indicesDigrafoDivididoNoTexto('Quan/do o/ sol'), []);
    });
});

describe('removerBarraDivisoria', () => {
    it('remove só a barra do índice pedido, preservando as outras', () => {
        assert.equal(removerBarraDivisoria('car/ro pas/sa', 0), 'carro pas/sa');
        assert.equal(removerBarraDivisoria('car/ro pas/sa', 1), 'car/ro passa');
    });

    it('não conta barra escapada (\\/) como candidata a ser removida', () => {
        // índice 0 deve ser a barra REAL (a 2ª barra do texto), não a
        // escapada (que fica intocada como conteúdo literal).
        assert.equal(removerBarraDivisoria('p\\/ar/te', 0), 'p\\/arte');
    });

    it('índice fora do alcance devolve o texto sem alteração', () => {
        assert.equal(removerBarraDivisoria('car/ro', 5), 'car/ro');
    });
});

describe('deslocarBarraDigrafo', () => {
    it('desloca a barra pra antes da letra repetida, sem fundir as duas sílabas inteiras', () => {
        // "car/ro" -> "ca/rro": o "r" que fechava "car" avança pra
        // antes do "r" que abria "ro" — não vira "carro" (1 sílaba).
        assert.equal(deslocarBarraDigrafo('car/ro', 0), 'ca/rro');
    });

    it('caso do relato original: "Sor/ri/so" -> "So/rri/so", não "Sorri/so"', () => {
        assert.equal(deslocarBarraDigrafo('Sor/ri/so', 0), 'So/rri/so');
    });

    it('mexe só na barra do índice pedido, preservando as outras divisões do verso', () => {
        assert.equal(deslocarBarraDigrafo('Quan/do car/ro', 1), 'Quan/do ca/rro');
    });

    it('não conta barra escapada (\\/) como candidata', () => {
        // índice 0 deve ser a barra REAL ("ar/ro"), não a escapada
        // (que fica intocada como conteúdo literal).
        assert.equal(deslocarBarraDigrafo('p\\/ar/ro', 0), 'p\\/a/rro');
    });

    it('índice fora do alcance devolve o texto sem alteração', () => {
        assert.equal(deslocarBarraDigrafo('car/ro', 5), 'car/ro');
    });

    it('preserva o total de sílabas (não reduz de N para N-1)', () => {
        const antes = dividirSilabas('car/ro').length;
        const depois = dividirSilabas(deslocarBarraDigrafo('car/ro', 0)).length;
        assert.equal(depois, antes);
    });
});

describe('celulasComDigrafoDividido', () => {
    it('marca as duas células vizinhas da barra (antes e depois) com o mesmo índice de barra', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'car/ro' }];
        const mapa = celulasComDigrafoDividido(linhas);
        assert.equal(mapa.get('0:0'), 0);
        assert.equal(mapa.get('0:1'), 0);
        assert.equal(mapa.size, 2);
    });

    it('sem dígrafo dividido, devolve mapa vazio', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol' }];
        assert.equal(celulasComDigrafoDividido(linhas).size, 0);
    });
});

describe('contarDigrafosDivididos', () => {
    it('conta ocorrências (não linhas) no poema inteiro', () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'car/ro pas/sa' },
            { tipo: 'vazia' },
            { tipo: 'verso', numero: 2, texto: 'car/ro' },
        ];
        assert.equal(contarDigrafosDivididos(linhas), 3);
    });

    it('sem nenhuma ocorrência, devolve 0', () => {
        assert.equal(contarDigrafosDivididos([{ tipo: 'verso', numero: 1, texto: 'Sol' }]), 0);
    });
});

describe('Correção assistida de dígrafo dividido — DOM real (happy-dom)', () => {
    let container;

    function clicar(el) {
        el.dispatchEvent(new window.Event('click', { bubbles: true }));
    }

    beforeEach(() => {
        document.body.innerHTML = '<div id="son-grade-container"></div>';
        container = document.getElementById('son-grade-container');
    });

    it('destaca (borda + cursor) e torna clicável a célula de um dígrafo dividido', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'car/ro' }];
        inicializarGradeSonoridade(container, linhas);

        const celulas = [...container.querySelectorAll('td.son-cel-silaba')];
        assert.deepEqual(
            celulas.map((td) => td.textContent.trim()),
            ['car', 'ro'],
        );
        assert.ok(celulas[0].className.includes('border-rose-500'));
        assert.ok(celulas[1].className.includes('border-rose-500'));
        assert.equal(celulas[0].dataset.digrafoBarra, '0');
        assert.equal(celulas[1].dataset.digrafoBarra, '0');
    });

    it('verso sem dígrafo dividido não ganha destaque nenhum', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol' }];
        inicializarGradeSonoridade(container, linhas);

        const celulas = [...container.querySelectorAll('td.son-cel-silaba')];
        celulas.forEach((td) => {
            assert.equal(td.className.includes('border-rose-500'), false);
            assert.equal(td.dataset.digrafoBarra, undefined);
        });
    });

    it('clicar na célula destacada desloca a barra do dígrafo pra antes da letra repetida, preservando as outras divisões do verso', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'Quan/do car/ro' }];
        inicializarGradeSonoridade(container, linhas);

        const celulaDigrafo = container.querySelector('td[data-digrafo-barra]');
        assert.ok(celulaDigrafo, 'deveria existir uma célula marcada como dígrafo dividido');
        clicar(celulaDigrafo);

        // a barra do dígrafo ("car/ro") se desloca pra antes do "rr"
        // ("ca/rro") em vez de sumir e fundir as duas sílabas inteiras
        // — a divisão normal ("Quan/do") continua intacta.
        assert.equal(obterLinhasSonoridade()[0].texto, 'Quan/do ca/rro');
        // o campo editável (coluna de texto) também precisa refletir a
        // correção, não só as células de sílaba abaixo dele.
        assert.equal(
            container.querySelector('.son-linha-texto[data-idx="0"]').textContent,
            'Quan/do ca/rro',
        );
        assert.equal(container.querySelector('td[data-digrafo-barra]'), null);
    });

    it('clique em célula de dígrafo tem prioridade mesmo com o Modo Sílaba Tônica ligado', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'car/ro' }];
        inicializarGradeSonoridade(container, linhas);
        clicar(container.querySelector('#son-btn-modo-tonico'));

        const celulaDigrafo = container.querySelector('td[data-digrafo-barra]');
        clicar(celulaDigrafo);

        assert.equal(obterLinhasSonoridade()[0].texto, 'ca/rro');
        // não deveria ter marcado tônica na célula em vez de corrigir
        // (garantirTonicas já inicializa `tonicas: []` em qualquer
        // render — o que importa aqui é continuar vazio, não virar [0]).
        assert.deepEqual(obterLinhasSonoridade()[0].tonicas, []);
    });

    it('mostra o aviso em lote com a contagem certa e some quando não há mais ocorrência', () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'car/ro' },
            { tipo: 'verso', numero: 2, texto: 'pas/sa' },
        ];
        inicializarGradeSonoridade(container, linhas);

        const aviso = container.querySelector('#son-aviso-digrafos');
        assert.match(aviso.textContent, /2 dígrafos divididos/);

        clicar(container.querySelector('#son-btn-corrigir-digrafos'));

        assert.equal(obterLinhasSonoridade()[0].texto, 'ca/rro');
        assert.equal(obterLinhasSonoridade()[1].texto, 'pa/ssa');
        assert.equal(container.querySelector('#son-aviso-digrafos').textContent.trim(), '');
    });

    it('mesclarDigrafoDividido preserva o total de sílabas (só desloca a barra, não funde) e mantém tonicas intactas', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'car/ro' }];
        inicializarGradeSonoridade(container, linhas);
        obterLinhasSonoridade()[0].tonicas = [0, 1];

        mesclarDigrafoDividido(0, 0);

        // "car/ro" (2 sílabas) -> "ca/rro" (ainda 2 sílabas) — a barra
        // se desloca, não desaparece, então nenhuma tônica marcada
        // precisa ser truncada.
        assert.deepEqual(obterLinhasSonoridade()[0].tonicas, [0, 1]);
    });

    it('mesclarTodosDigrafosDivididos corrige múltiplas ocorrências na mesma linha', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'car/ro pas/sa' }];
        inicializarGradeSonoridade(container, linhas);

        mesclarTodosDigrafosDivididos();

        assert.equal(obterLinhasSonoridade()[0].texto, 'ca/rro pa/ssa');
        assert.equal(contarDigrafosDivididos(obterLinhasSonoridade()), 0);
    });
});

describe('calcularLetrasRima', () => {
    it('sem nenhuma rima, nenhum verso ganha letra', () => {
        assert.deepEqual([...calcularLetrasRima([]).entries()], []);
    });

    it('um par simples: os dois versos ganham a mesma letra (A)', () => {
        const rimas = [{ id: 1, a: { linha: 0, silabas: [2] }, b: { linha: 2, silabas: [3] } }];
        const letras = calcularLetrasRima(rimas);
        assert.equal(letras.get(0), 'A');
        assert.equal(letras.get(2), 'A');
    });

    it('dois pares independentes ganham letras diferentes, na ordem do 1º verso de cada grupo', () => {
        const rimas = [
            { id: 1, a: { linha: 1, silabas: [0] }, b: { linha: 3, silabas: [0] } },
            { id: 2, a: { linha: 0, silabas: [0] }, b: { linha: 2, silabas: [0] } },
        ];
        const letras = calcularLetrasRima(rimas);
        // grupo {0,2} tem o menor índice (0) → letra A; grupo {1,3} → letra B,
        // mesmo o par B ter sido criado primeiro na lista
        assert.equal(letras.get(0), 'A');
        assert.equal(letras.get(2), 'A');
        assert.equal(letras.get(1), 'B');
        assert.equal(letras.get(3), 'B');
    });

    it('monorrima transitiva (1↔2, 2↔3) cai no mesmo grupo/letra sem par direto 1↔3', () => {
        const rimas = [
            { id: 1, a: { linha: 0, silabas: [0] }, b: { linha: 1, silabas: [0] } },
            { id: 2, a: { linha: 1, silabas: [0] }, b: { linha: 2, silabas: [0] } },
        ];
        const letras = calcularLetrasRima(rimas);
        assert.equal(letras.get(0), 'A');
        assert.equal(letras.get(1), 'A');
        assert.equal(letras.get(2), 'A');
    });
});

describe('calcularDistanciaPar', () => {
    it('distância é a diferença entre os números de verso (linha.numero), não a posição bruta na grade', () => {
        // quebra de estrofe (linha vazia) entre os dois versos não deve
        // inflar a distância: v.1 e v.2 continuam a 1 de distância mesmo
        // com uma linha em branco entre eles no array.
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Um' },
            { tipo: 'vazia' },
            { tipo: 'verso', numero: 2, texto: 'Dois' },
        ];
        const par = { a: { linha: 0, silabas: [0] }, b: { linha: 2, silabas: [0] } };
        assert.equal(calcularDistanciaPar(par, linhas), 1);
    });

    it('retorna null se algum dos lados apontar pra uma linha inexistente', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'Um' }];
        const par = { a: { linha: 0, silabas: [0] }, b: { linha: 5, silabas: [0] } };
        assert.equal(calcularDistanciaPar(par, linhas), null);
    });
});

describe('calcularProximidadePar', () => {
    it('até a distância limite (2), o par é "Vizinha"', () => {
        assert.equal(calcularProximidadePar(1), 'Vizinha');
        assert.equal(calcularProximidadePar(2), 'Vizinha');
    });

    it('acima da distância limite, o par é "Distante"', () => {
        assert.equal(calcularProximidadePar(3), 'Distante');
        assert.equal(calcularProximidadePar(10), 'Distante');
    });

    it('distância null (par inválido) não recebe rótulo', () => {
        assert.equal(calcularProximidadePar(null), null);
    });
});

describe('calcularClassificacaoSonora', () => {
    const linhas = Array.from({ length: 10 }, (_, i) => ({
        tipo: 'verso',
        numero: i + 1,
        texto: 'x',
    }));

    it('sem nenhum par, não há rótulo', () => {
        assert.deepEqual(calcularClassificacaoSonora([], linhas), {
            vizinhas: 0,
            distantes: 0,
            rotulo: null,
        });
    });

    it('mais pares vizinhos que distantes → "Com Rimas mais Próximas"', () => {
        const rimas = [
            { a: { linha: 0, silabas: [0] }, b: { linha: 1, silabas: [0] } }, // d=1, vizinha
            { a: { linha: 2, silabas: [0] }, b: { linha: 3, silabas: [0] } }, // d=1, vizinha
            { a: { linha: 0, silabas: [0] }, b: { linha: 9, silabas: [0] } }, // d=9, distante
        ];
        const resultado = calcularClassificacaoSonora(rimas, linhas);
        assert.deepEqual(resultado, {
            vizinhas: 2,
            distantes: 1,
            rotulo: 'Com Rimas mais Próximas',
        });
    });

    it('mais pares distantes que vizinhos → "Com Rimas mais Distantes"', () => {
        const rimas = [
            { a: { linha: 0, silabas: [0] }, b: { linha: 9, silabas: [0] } }, // d=9, distante
            { a: { linha: 1, silabas: [0] }, b: { linha: 8, silabas: [0] } }, // d=7, distante
            { a: { linha: 2, silabas: [0] }, b: { linha: 3, silabas: [0] } }, // d=1, vizinha
        ];
        const resultado = calcularClassificacaoSonora(rimas, linhas);
        assert.deepEqual(resultado, {
            vizinhas: 1,
            distantes: 2,
            rotulo: 'Com Rimas mais Distantes',
        });
    });

    it('empate entre vizinhas e distantes → "Com Rimas Equilibradas"', () => {
        const rimas = [
            { a: { linha: 0, silabas: [0] }, b: { linha: 1, silabas: [0] } }, // d=1, vizinha
            { a: { linha: 2, silabas: [0] }, b: { linha: 9, silabas: [0] } }, // d=7, distante
        ];
        const resultado = calcularClassificacaoSonora(rimas, linhas);
        assert.deepEqual(resultado, {
            vizinhas: 1,
            distantes: 1,
            rotulo: 'Com Rimas Equilibradas',
        });
    });
});

// ─── calcularPosicaoPar ────────────────────────────────────────────

describe('calcularPosicaoPar', () => {
    // Cada linha tem 2 sílabas (índices 0 e 1) — a última sílaba REAL é
    // sempre o índice 1 nessas fixtures.
    const linhas = [
        { tipo: 'verso', numero: 1, texto: 'Um/Dois' },
        { tipo: 'verso', numero: 2, texto: 'Tres/Quatro' },
    ];

    it('os dois lados na última sílaba do verso → "Externa"', () => {
        const par = { a: { linha: 0, silabas: [1] }, b: { linha: 1, silabas: [1] } };
        assert.equal(calcularPosicaoPar(par, linhas), 'Externa');
    });

    it('um lado fora da última sílaba já torna o par "Interna"', () => {
        const par = { a: { linha: 0, silabas: [0] }, b: { linha: 1, silabas: [1] } };
        assert.equal(calcularPosicaoPar(par, linhas), 'Interna');
    });
});

// ─── calcularTalyPorEixo / EIXOS_CLASSIFICACAO_PAR / rotuloCurtoValor ─

describe('rotuloCurtoValor', () => {
    it('corta no primeiro " (" (ex.: valores de Riqueza)', () => {
        assert.equal(rotuloCurtoValor('Pobre (mesma classe gramatical)'), 'Pobre');
    });

    it('corta no primeiro " /" (ex.: valores de Acentuação/Tonalidade)', () => {
        assert.equal(rotuloCurtoValor('Aguda / Oxítona'), 'Aguda');
        assert.equal(rotuloCurtoValor('Soante / Consoante (Perfeita)'), 'Soante');
    });

    it('valor sem " (" nem " /" (ex.: Posição) volta como está', () => {
        assert.equal(rotuloCurtoValor('Externa'), 'Externa');
    });

    it('valor vazio/ausente volta como está', () => {
        assert.equal(rotuloCurtoValor(''), '');
        assert.equal(rotuloCurtoValor(undefined), undefined);
    });
});

describe('EIXOS_CLASSIFICACAO_PAR', () => {
    it('tem os 4 eixos, cada um com label e extrairValor', () => {
        assert.deepEqual(Object.keys(EIXOS_CLASSIFICACAO_PAR), [
            'posicao',
            'acentuacao',
            'tonalidade',
            'riqueza',
        ]);
        Object.values(EIXOS_CLASSIFICACAO_PAR).forEach((eixo) => {
            assert.equal(typeof eixo.label, 'string');
            assert.equal(typeof eixo.extrairValor, 'function');
        });
    });

    it("'posicao' extrai via calcularPosicaoPar (sempre calculado, nunca lido do par)", () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Um/Dois' },
            { tipo: 'verso', numero: 2, texto: 'Tres/Quatro' },
        ];
        const par = { a: { linha: 0, silabas: [1] }, b: { linha: 1, silabas: [1] } };
        assert.equal(EIXOS_CLASSIFICACAO_PAR.posicao.extrairValor(par, linhas), 'Externa');
    });

    it("'acentuacao'/'tonalidade'/'riqueza' extraem o valor salvo direto no par", () => {
        const par = {
            acentuacao: 'Grave / Paroxítona',
            tonalidade: 'Toante (Assonante)',
            riqueza: 'Rica (classes gramaticais diferentes)',
        };
        assert.equal(EIXOS_CLASSIFICACAO_PAR.acentuacao.extrairValor(par), 'Grave / Paroxítona');
        assert.equal(EIXOS_CLASSIFICACAO_PAR.tonalidade.extrairValor(par), 'Toante (Assonante)');
        assert.equal(
            EIXOS_CLASSIFICACAO_PAR.riqueza.extrairValor(par),
            'Rica (classes gramaticais diferentes)',
        );
    });
});

describe('calcularTalyPorEixo', () => {
    it('conta pares por valor, ignorando pares sem esse eixo classificado', () => {
        const rimas = [
            { riqueza: 'Pobre (mesma classe gramatical)' },
            { riqueza: 'Pobre (mesma classe gramatical)' },
            { riqueza: 'Rica (classes gramaticais diferentes)' },
            { riqueza: undefined },
        ];
        const resultado = calcularTalyPorEixo(rimas, [], (par) => par.riqueza);
        assert.deepEqual(resultado.valores, {
            'Pobre (mesma classe gramatical)': 2,
            'Rica (classes gramaticais diferentes)': 1,
        });
        assert.equal(resultado.semClassificar, 1);
        assert.equal(resultado.total, 4);
    });

    it('sem nenhum par, volta zerado', () => {
        assert.deepEqual(
            calcularTalyPorEixo([], [], (par) => par.riqueza),
            {
                valores: {},
                semClassificar: 0,
                total: 0,
            },
        );
    });

    it('nenhum par com o eixo classificado → só semClassificar cresce, valores fica vazio', () => {
        const rimas = [{}, {}];
        const resultado = calcularTalyPorEixo(rimas, [], (par) => par.tonalidade);
        assert.deepEqual(resultado.valores, {});
        assert.equal(resultado.semClassificar, 2);
    });
});

// ─── CAMPOS_CONTAVEIS_RIMA (colunas de contagem, ver colunas-contagem.js) ─
// Registro ESTÁTICO — só depende de listas fechadas (ACENTUACOES_RIMA/
// TONALIDADES_RIMA/RIQUEZAS_RIMA), diferente do de Eco logo abaixo, que
// depende dos dados (`tipo` é campo livre) e por isso é uma função.

describe('CAMPOS_CONTAVEIS_RIMA', () => {
    // 2 versos, 2 de distância (vizinha, já que DISTANCIA_VIZINHO_MAXIMA é
    // 2), o par A é Externo (ambos os lados na última sílaba do verso) e o
    // par B é Interno (lado A não está na última sílaba).
    const escansaoLinhas = [
        { tipo: 'verso', numero: 1, texto: 'Um/Dois' },
        { tipo: 'verso', numero: 2, texto: 'Tres/Quatro' },
    ];
    const parExterno = { a: { linha: 0, silabas: [1] }, b: { linha: 1, silabas: [1] } };
    const parInterno = { a: { linha: 0, silabas: [0] }, b: { linha: 1, silabas: [1] } };
    const item = { escansaoLinhas, rimas: [parExterno, parInterno] };

    it('tem uma entrada por campo geral, uma por Posição/Proximidade e uma por valor de Acentuação/Tonalidade/Riqueza', () => {
        const chaves = Object.keys(CAMPOS_CONTAVEIS_RIMA);
        assert.ok(chaves.includes('rimasTotal'));
        assert.ok(chaves.includes('rimasProporcao'));
        assert.ok(chaves.includes('rimasExternas'));
        assert.ok(chaves.includes('rimasInternas'));
        assert.ok(chaves.includes('rimasVizinhas'));
        assert.ok(chaves.includes('rimasDistantes'));
        // 3 (Acentuação) + 3 (Tonalidade) + 6 (Riqueza) = 12 campos por valor
        const camposPorValor = chaves.filter(
            (c) =>
                c.startsWith('rimas') &&
                ![
                    'rimasTotal',
                    'rimasProporcao',
                    'rimasExternas',
                    'rimasInternas',
                    'rimasVizinhas',
                    'rimasDistantes',
                ].includes(c),
        );
        assert.equal(
            camposPorValor.length,
            ACENTUACOES_RIMA.length + TONALIDADES_RIMA.length + RIQUEZAS_RIMA.length,
        );
    });

    it('cada campo tem `grupo` (pro <optgroup> do próprio select de Rima) — diferente de CAMPOS_CONTAVEIS de Poemas/Prosas', () => {
        Object.values(CAMPOS_CONTAVEIS_RIMA).forEach((campo) => {
            assert.equal(typeof campo.grupo, 'string');
        });
    });

    it('subgrupos: Geral (Total/Proporção), Posição (Externas/Internas), Proximidade (Vizinhas/Distantes)', () => {
        assert.equal(CAMPOS_CONTAVEIS_RIMA.rimasTotal.grupo, 'Geral');
        assert.equal(CAMPOS_CONTAVEIS_RIMA.rimasProporcao.grupo, 'Geral');
        assert.equal(CAMPOS_CONTAVEIS_RIMA.rimasExternas.grupo, 'Posição');
        assert.equal(CAMPOS_CONTAVEIS_RIMA.rimasInternas.grupo, 'Posição');
        assert.equal(CAMPOS_CONTAVEIS_RIMA.rimasVizinhas.grupo, 'Proximidade');
        assert.equal(CAMPOS_CONTAVEIS_RIMA.rimasDistantes.grupo, 'Proximidade');
    });

    it('rimasTotal conta o total de pares', () => {
        assert.equal(CAMPOS_CONTAVEIS_RIMA.rimasTotal.contar(item), 2);
    });

    it('rimasProporcao é pares ÷ versos, arredondado a 2 casas', () => {
        assert.equal(CAMPOS_CONTAVEIS_RIMA.rimasProporcao.contar(item), 1);
    });

    it('rimasProporcao é 0 quando não há verso nenhum (evita divisão por zero)', () => {
        assert.equal(
            CAMPOS_CONTAVEIS_RIMA.rimasProporcao.contar({ escansaoLinhas: [], rimas: [] }),
            0,
        );
    });

    it('rimasExternas/rimasInternas contam por posição calculada (nunca lida do par)', () => {
        assert.equal(CAMPOS_CONTAVEIS_RIMA.rimasExternas.contar(item), 1);
        assert.equal(CAMPOS_CONTAVEIS_RIMA.rimasInternas.contar(item), 1);
    });

    it('rimasVizinhas/rimasDistantes contam por distância calculada', () => {
        // ambos os pares desta fixture estão a 1 verso de distância (< 2)
        assert.equal(CAMPOS_CONTAVEIS_RIMA.rimasVizinhas.contar(item), 2);
        assert.equal(CAMPOS_CONTAVEIS_RIMA.rimasDistantes.contar(item), 0);
    });

    it('campos por valor de Acentuação/Tonalidade/Riqueza contam só pares com aquele valor exato', () => {
        const itemClassificado = {
            escansaoLinhas,
            rimas: [
                { ...parExterno, riqueza: 'Pobre (mesma classe gramatical)' },
                { ...parInterno, riqueza: 'Pobre (mesma classe gramatical)' },
                { riqueza: 'Rica (classes gramaticais diferentes)' },
            ],
        };
        assert.equal(CAMPOS_CONTAVEIS_RIMA.rimasRiquezaPobre.contar(itemClassificado), 2);
        assert.equal(CAMPOS_CONTAVEIS_RIMA.rimasRiquezaRica.contar(itemClassificado), 1);
        assert.equal(CAMPOS_CONTAVEIS_RIMA.rimasRiquezaRara.contar(itemClassificado), 0);
    });

    it('item sem rimas/escansaoLinhas não quebra (trata como vazio)', () => {
        Object.values(CAMPOS_CONTAVEIS_RIMA).forEach((campo) => {
            assert.equal(campo.contar({}), 0);
        });
    });
});

// ─── camposContaveisEco (registro DINÂMICO de Eco, ver colunas-contagem.js) ─
// Diferente de CAMPOS_CONTAVEIS_RIMA, aqui `tipo` é campo LIVRE — o
// conjunto de campos contáveis depende de quais tipos já foram digitados
// na coleção inteira (`escansoes`), não só das 5 sugestões padrão.

describe('camposContaveisEco', () => {
    it('sem escansoes (ou vazio), tem só Total/Proporção + as 5 sugestões padrão de TIPOS_ECO_SONORO', () => {
        const registro = camposContaveisEco([]);
        assert.ok(registro.ecosTotal);
        assert.ok(registro.ecosProporcao);
        TIPOS_ECO_SONORO.forEach((tipo) => {
            const chave = Object.keys(registro).find((k) => registro[k].label === tipo);
            assert.ok(chave, `esperava um campo pra sugestão "${tipo}"`);
        });
        assert.equal(Object.keys(registro).length, 2 + TIPOS_ECO_SONORO.length);
    });

    it('nenhum campo de Eco tem `grupo` — lista curta o bastante pra não precisar de <optgroup>', () => {
        Object.values(camposContaveisEco([])).forEach((campo) => {
            assert.equal(campo.grupo, undefined);
        });
    });

    it('ecosTotal conta o total de ecos do item', () => {
        const item = { ecos: [{ tipo: 'Aliteração' }, { tipo: 'Assonância' }] };
        assert.equal(camposContaveisEco([]).ecosTotal.contar(item), 2);
    });

    it('ecosProporcao é ecos ÷ versos, arredondado a 2 casas (0 sem verso nenhum)', () => {
        const escansaoLinhas = [
            { tipo: 'verso', numero: 1, texto: 'Um' },
            { tipo: 'verso', numero: 2, texto: 'Dois' },
        ];
        const item = { escansaoLinhas, ecos: [{ tipo: 'Aliteração' }] };
        assert.equal(camposContaveisEco([]).ecosProporcao.contar(item), 0.5);
        assert.equal(
            camposContaveisEco([]).ecosProporcao.contar({ escansaoLinhas: [], ecos: [] }),
            0,
        );
    });

    it('um tipo de Eco personalizado (fora das 5 sugestões) ganha campo próprio assim que aparece em QUALQUER escansão — bug relatado pelo Victor', () => {
        const escansoes = [{ ecos: [{ tipo: 'Eco disperso' }] }];
        const registro = camposContaveisEco(escansoes);
        const chave = Object.keys(registro).find((k) => registro[k].label === 'Eco disperso');
        assert.ok(chave, 'tipo personalizado deveria ter um campo contável próprio');
        assert.equal(registro[chave].contar({ ecos: [{ tipo: 'Eco disperso' }] }), 1);
    });

    it('tipos personalizados vêm depois das 5 sugestões padrão, em ordem alfabética', () => {
        const escansoes = [{ ecos: [{ tipo: 'Zeugma' }, { tipo: 'Anáfora' }] }];
        const labels = Object.values(camposContaveisEco(escansoes)).map((c) => c.label);
        const idxUltimaSugestao = labels.indexOf(TIPOS_ECO_SONORO.at(-1));
        const idxAnafora = labels.indexOf('Anáfora');
        const idxZeugma = labels.indexOf('Zeugma');
        assert.ok(idxUltimaSugestao !== -1 && idxAnafora !== -1 && idxZeugma !== -1);
        assert.ok(idxUltimaSugestao < idxAnafora);
        assert.ok(idxAnafora < idxZeugma);
    });

    it('um eco sem `tipo` (campo livre não preenchido) não quebra e não vira campo próprio', () => {
        const escansoes = [{ ecos: [{ tipo: '' }, {}] }];
        assert.doesNotThrow(() => camposContaveisEco(escansoes));
    });

    it('item sem ecos/escansaoLinhas não quebra (trata como vazio)', () => {
        Object.values(camposContaveisEco([])).forEach((campo) => {
            assert.equal(campo.contar({}), 0);
        });
    });
});

// ─── construirCamposContaveisSonoridade (registro COMBINADO Rima+Eco) ─
// Usado por registroContavel('sonoridade') em colunas-contagem.js pra
// validação/ordenação/filtro, que não precisam saber de família — só a
// camada de UI (dois <select> separados) se importa com a distinção.

describe('construirCamposContaveisSonoridade', () => {
    it('junta CAMPOS_CONTAVEIS_RIMA e camposContaveisEco num registro só, sem perder nenhuma chave', () => {
        const escansoes = [{ ecos: [{ tipo: 'Eco disperso' }] }];
        const combinado = construirCamposContaveisSonoridade(escansoes);
        Object.keys(CAMPOS_CONTAVEIS_RIMA).forEach((chave) => {
            assert.ok(
                combinado[chave],
                `esperava a chave de Rima "${chave}" no registro combinado`,
            );
        });
        Object.keys(camposContaveisEco(escansoes)).forEach((chave) => {
            assert.ok(combinado[chave], `esperava a chave de Eco "${chave}" no registro combinado`);
        });
    });
});

describe('inicializarGradeSonoridade — DOM real (happy-dom)', () => {
    let container;

    beforeEach(() => {
        document.body.innerHTML = '<div id="son-grade-container"></div>';
        container = document.getElementById('son-grade-container');
    });

    it('sem linhas, mostra a mensagem de "escolha um poema" e não uma tabela', () => {
        inicializarGradeSonoridade(container, []);
        assert.match(container.textContent, /Escolha um poema/);
        assert.equal(container.querySelector('table'), null);
    });

    it('renderiza uma linha por verso, número correto e uma célula editável por linha', () => {
        const linhas = construirLinhasIniciais('Primeiro verso\n\nSegundo verso');
        inicializarGradeSonoridade(container, linhas);

        const numeros = [
            ...container.querySelectorAll('#son-grade-body tr:not(.son-linha-vazia)'),
        ].map((tr) => tr.querySelector('td')?.textContent.trim());
        assert.deepEqual(numeros, ['1', '2']);

        assert.equal(container.querySelectorAll('.son-linha-texto').length, 2);
        assert.equal(container.querySelectorAll('#son-grade-body tr.son-linha-vazia').length, 1);
    });

    it('a régua do cabeçalho tem uma coluna por sílaba do maior verso já dividido', () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol/ se/ pôs' },
            { tipo: 'verso', numero: 2, texto: 'A/lém' },
        ];
        inicializarGradeSonoridade(container, linhas);

        const ths = [...container.querySelectorAll('#son-grade-header-row th')];
        // 2 colunas fixas (Nº, Verso) + 5 colunas de régua (1..5) + 1 coluna
        // de Cont. + 1 coluna de Rima
        assert.equal(ths.length, 9);
        assert.deepEqual(
            ths.slice(2, 7).map((th) => th.textContent.trim()),
            ['1', '2', '3', '4', '5'],
        );
        assert.equal(ths[7].textContent.trim(), 'Cont.');
        assert.equal(ths[8].textContent.trim(), 'Rima');
    });

    it('preenche as células de sílaba a partir da divisão por barra de cada verso', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol' }];
        inicializarGradeSonoridade(container, linhas);

        const celulas = [...container.querySelectorAll('td.son-cel-silaba')].map((td) =>
            td.textContent.trim(),
        );
        assert.deepEqual(celulas, ['Quan', 'do o', 'sol']);
    });

    it('digitar no campo editável atualiza a grade (mais barras → mais colunas) sem perder as outras linhas', () => {
        const linhas = construirLinhasIniciais('Um verso\nOutro verso');
        inicializarGradeSonoridade(container, linhas);

        const primeiroCampo = container.querySelector('.son-linha-texto[data-idx="0"]');
        primeiroCampo.textContent = 'Um/ ver/so';
        primeiroCampo.dispatchEvent(new window.Event('input', { bubbles: true }));

        assert.equal(obterLinhasSonoridade()[0].texto, 'Um/ ver/so');

        const ths = [...container.querySelectorAll('#son-grade-header-row th')];
        assert.equal(ths.length, 7); // Nº + Verso + 3 colunas de régua + Cont. + Rima

        const linhaDoisCelulas = [
            ...container.querySelectorAll('#son-grade-body tr[data-idx="1"] td.son-cel-silaba'),
        ].map((td) => td.textContent.trim());
        assert.deepEqual(linhaDoisCelulas, ['Outro verso', '', '']);
    });

    it('coluna "Cont." mostra a contagem métrica sozinha quando não há Tamanho do Verso selecionado', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol/ se/ pôs' }];
        inicializarGradeSonoridade(container, linhas);

        const celula = container.querySelector(
            '#son-grade-body tr[data-idx="0"] td.son-cel-contagem',
        );
        assert.equal(celula.textContent.trim(), '5');
        assert.equal(container.querySelector('#son-grade-rotulo-alvo').textContent.trim(), '');
    });

    it('coluna "Cont." mostra contagem/alvo e destaca em âmbar o verso divergente', () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Bri/sa/ le/ve/ so/bre a/ ca/sa' }, // 7 métricas
            { tipo: 'verso', numero: 2, texto: 'A/lém' }, // 2 métricas
        ];
        inicializarGradeSonoridade(container, linhas, [], [], '', 'Redondilha Maior (7)');

        const celulas = [...container.querySelectorAll('#son-grade-body td.son-cel-contagem')].map(
            (td) => td.textContent.trim(),
        );
        assert.deepEqual(celulas, ['7/7', '2/7']);

        const celulaDivergente = container.querySelector(
            '#son-grade-body tr[data-idx="1"] td.son-cel-contagem',
        );
        assert.match(celulaDivergente.className, /text-amber-600/);
        const celulaOk = container.querySelector(
            '#son-grade-body tr[data-idx="0"] td.son-cel-contagem',
        );
        assert.doesNotMatch(celulaOk.className, /text-amber-600/);

        assert.equal(
            container.querySelector('#son-grade-rotulo-alvo').textContent.trim(),
            'Alvo: 7 sílabas por verso',
        );
    });

    it('atualizarTamanhoVersoSonoridade recalcula a coluna "Cont." sem reabrir o modal', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'A/lém' }]; // 2 métricas
        inicializarGradeSonoridade(container, linhas);

        atualizarTamanhoVersoSonoridade('Redondilha Menor (5)');

        const celula = container.querySelector(
            '#son-grade-body tr[data-idx="0"] td.son-cel-contagem',
        );
        assert.equal(celula.textContent.trim(), '2/5');
        assert.match(celula.className, /text-amber-600/);
    });

    it('apaga o hífen ortográfico das células de sílaba (ênclise/composta), em qualquer posição', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'Di/ze-me a ver/da/de' }];
        inicializarGradeSonoridade(container, linhas);

        const celulas = [...container.querySelectorAll('td.son-cel-silaba')].map((td) =>
            td.textContent.trim(),
        );
        assert.deepEqual(celulas, ['Di', 'zeme a ver', 'da', 'de']);
    });

    it('hífen isolado entre duas barras (célula fantasma) não conta como sílaba real', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'ze/-/me' }];
        inicializarGradeSonoridade(container, linhas);

        const celulas = [...container.querySelectorAll('td.son-cel-silaba')];
        assert.deepEqual(
            celulas.map((td) => td.textContent.trim()),
            ['ze', '', 'me'],
        );
        // a célula do meio (hífen apagado, sobrou vazia) não deve ter os
        // data attributes que marcam célula "real" (clicável no Modo Tônica)
        assert.equal(celulas[1].dataset.silabaIdx, undefined);
    });

    it('realça cada `/` digitado com um <span> de destaque, sem perder o texto puro', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'a/b' }];
        inicializarGradeSonoridade(container, linhas);

        const campo = container.querySelector('.son-linha-texto');
        assert.equal(campo.textContent, 'a/b');
        assert.ok(campo.querySelector('span'), 'a barra deveria estar envolvida num <span>');
    });
});

describe('Modo Sílaba Tônica — DOM real (happy-dom)', () => {
    let container;

    function clicar(el) {
        el.dispatchEvent(new window.Event('click', { bubbles: true }));
    }

    beforeEach(() => {
        document.body.innerHTML = '<div id="son-grade-container"></div>';
        container = document.getElementById('son-grade-container');
    });

    it('começa desligado (mesmo reabrindo a grade) e sem clicar em nada não marca tônica', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol' }];
        inicializarGradeSonoridade(container, linhas);

        const botao = container.querySelector('#son-btn-modo-tonico');
        assert.equal(botao.getAttribute('aria-pressed'), 'false');

        const celula = container.querySelector('td.son-cel-silaba[data-silaba-idx="0"]');
        clicar(celula);
        assert.ok(!celula.className.includes('bg-amber'));
        assert.deepEqual(obterLinhasSonoridade()[0].tonicas ?? [], []);
    });

    it('ligar o modo e clicar numa célula real marca a sílaba como tônica (destaque + índice salvo)', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol' }];
        inicializarGradeSonoridade(container, linhas);

        clicar(container.querySelector('#son-btn-modo-tonico'));
        assert.equal(
            container.querySelector('#son-btn-modo-tonico').getAttribute('aria-pressed'),
            'true',
        );

        const celula = container.querySelector('td.son-cel-silaba[data-silaba-idx="2"]');
        clicar(celula);

        const celulaNova = container.querySelector('td.son-cel-silaba[data-silaba-idx="2"]');
        assert.ok(celulaNova.className.includes('bg-amber'));
        assert.deepEqual(obterLinhasSonoridade()[0].tonicas, [2]);
    });

    it('clicar de novo na mesma sílaba tônica desmarca', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol' }];
        inicializarGradeSonoridade(container, linhas);
        clicar(container.querySelector('#son-btn-modo-tonico'));

        const celula = () => container.querySelector('td.son-cel-silaba[data-silaba-idx="1"]');
        clicar(celula());
        assert.deepEqual(obterLinhasSonoridade()[0].tonicas, [1]);
        clicar(celula());
        assert.deepEqual(obterLinhasSonoridade()[0].tonicas, []);
    });

    it('células de preenchimento (além do total de sílabas do próprio verso) não têm data-idx e não respondem a clique', () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol/ se/ pôs' },
            { tipo: 'verso', numero: 2, texto: 'A/lém' },
        ];
        inicializarGradeSonoridade(container, linhas);
        clicar(container.querySelector('#son-btn-modo-tonico'));

        const linhaDois = container.querySelectorAll(
            '#son-grade-body tr[data-idx="1"] td.son-cel-silaba',
        );
        // "A/lém" só tem 2 sílabas reais, mas a régua vai até 5 (maior verso)
        assert.equal(linhaDois[2].dataset.silabaIdx, undefined);
        clicar(linhaDois[2]);
        assert.deepEqual(obterLinhasSonoridade()[1].tonicas ?? [], []);
    });

    it('reduzir o número de sílabas de um verso descarta índices de tônica que ficaram fora do alcance', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol/ se/ pôs' }];
        inicializarGradeSonoridade(container, linhas);
        clicar(container.querySelector('#son-btn-modo-tonico'));
        clicar(container.querySelector('td.son-cel-silaba[data-silaba-idx="4"]'));
        assert.deepEqual(obterLinhasSonoridade()[0].tonicas, [4]);

        const campo = container.querySelector('.son-linha-texto[data-idx="0"]');
        campo.textContent = 'Quan/do o/ sol';
        campo.dispatchEvent(new window.Event('input', { bubbles: true }));

        assert.deepEqual(obterLinhasSonoridade()[0].tonicas, []);
    });

    it('desligar o modo tira o cursor-pointer das células, mas preserva as marcações já feitas', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol' }];
        inicializarGradeSonoridade(container, linhas);
        clicar(container.querySelector('#son-btn-modo-tonico'));
        clicar(container.querySelector('td.son-cel-silaba[data-silaba-idx="0"]'));

        clicar(container.querySelector('#son-btn-modo-tonico')); // desliga de novo
        const celula = container.querySelector('td.son-cel-silaba[data-silaba-idx="0"]');
        assert.ok(!celula.className.includes('cursor-pointer'));
        assert.ok(celula.className.includes('bg-amber'), 'marcação feita antes deve persistir');
        assert.deepEqual(obterLinhasSonoridade()[0].tonicas, [0]);
    });
});

describe('Mapeamento de Rimas — DOM real (happy-dom)', () => {
    let container;

    function clicar(el) {
        el.dispatchEvent(new window.Event('click', { bubbles: true }));
    }
    function shiftClicar(el) {
        el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, shiftKey: true }));
    }
    function celula(linhaIdx, silabaIdx) {
        return container.querySelector(
            `#son-grade-body tr[data-idx="${linhaIdx}"] td.son-cel-silaba[data-silaba-idx="${silabaIdx}"]`,
        );
    }
    function letraDaLinha(linhaIdx) {
        return container
            .querySelector(`#son-grade-body tr[data-idx="${linhaIdx}"] td.son-cel-rima-letra`)
            .textContent.trim();
    }

    beforeEach(() => {
        document.body.innerHTML = '<div id="son-grade-container"></div>';
        container = document.getElementById('son-grade-container');
    });

    it('clicar numa sílaba com Modo Rima ligado só abre o lado A — nada é confirmado sozinho', () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol' },
            { tipo: 'verso', numero: 2, texto: 'A/lém' },
        ];
        inicializarGradeSonoridade(container, linhas);
        clicar(container.querySelector('#son-btn-modo-rima'));
        clicar(celula(0, 0));

        assert.deepEqual(obterRimasSonoridade(), []);
        assert.equal(container.querySelector('#son-btn-confirmar-rima').disabled, true);
        assert.ok(
            container.querySelector('#son-btn-cancelar-rima'),
            'botão de cancelar deve aparecer',
        );
    });

    it('clicar num verso diferente abre o lado B; Confirmar par cria a rima e atribui a letra aos dois versos', () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol' },
            { tipo: 'verso', numero: 2, texto: 'A/lém' },
        ];
        inicializarGradeSonoridade(container, linhas);
        clicar(container.querySelector('#son-btn-modo-rima'));
        clicar(celula(0, 2)); // lado A: verso 0, sílaba "sol"
        clicar(celula(1, 1)); // lado B: verso 1, sílaba "lém"

        assert.equal(container.querySelector('#son-btn-confirmar-rima').disabled, false);
        clicar(container.querySelector('#son-btn-confirmar-rima'));

        const rimas = obterRimasSonoridade();
        assert.equal(rimas.length, 1);
        assert.deepEqual(rimas[0].a, { linha: 0, silabas: [2] });
        assert.deepEqual(rimas[0].b, { linha: 1, silabas: [1] });
        assert.equal(letraDaLinha(0), 'A');
        assert.equal(letraDaLinha(1), 'A');
        // seleção fecha sozinha depois de confirmar — botões somem
        assert.equal(container.querySelector('#son-btn-confirmar-rima'), null);
    });

    it('shift-clique estende os dois lados (rima rica) antes de confirmar', () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Ca/mi/nhei' },
            { tipo: 'verso', numero: 2, texto: 'A/qui/vim' },
        ];
        inicializarGradeSonoridade(container, linhas);
        clicar(container.querySelector('#son-btn-modo-rima'));
        clicar(celula(0, 1)); // "mi"
        shiftClicar(celula(0, 2)); // + "nhei" no lado A
        clicar(celula(1, 1)); // "qui" no lado B
        shiftClicar(celula(1, 2)); // + "vim" no lado B
        clicar(container.querySelector('#son-btn-confirmar-rima'));

        const rimas = obterRimasSonoridade();
        assert.deepEqual(rimas[0].a, { linha: 0, silabas: [1, 2] });
        assert.deepEqual(rimas[0].b, { linha: 1, silabas: [1, 2] });
    });

    it('Cancelar seleção descarta o par em curso sem criar rima', () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol' },
            { tipo: 'verso', numero: 2, texto: 'A/lém' },
        ];
        inicializarGradeSonoridade(container, linhas);
        clicar(container.querySelector('#son-btn-modo-rima'));
        clicar(celula(0, 2));
        clicar(celula(1, 1));
        clicar(container.querySelector('#son-btn-cancelar-rima'));

        assert.deepEqual(obterRimasSonoridade(), []);
        assert.equal(container.querySelector('#son-btn-confirmar-rima'), null);
    });

    it('monorrima transitiva (3 versos) aparece com a mesma letra na grade', () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Um/ verso' },
            { tipo: 'verso', numero: 2, texto: 'Ou/tro' },
            { tipo: 'verso', numero: 3, texto: 'Ter/ceiro' },
        ];
        inicializarGradeSonoridade(container, linhas);
        clicar(container.querySelector('#son-btn-modo-rima'));
        clicar(celula(0, 1));
        clicar(celula(1, 1));
        clicar(container.querySelector('#son-btn-confirmar-rima'));
        clicar(celula(1, 1));
        clicar(celula(2, 1));
        clicar(container.querySelector('#son-btn-confirmar-rima'));

        assert.equal(letraDaLinha(0), 'A');
        assert.equal(letraDaLinha(1), 'A');
        assert.equal(letraDaLinha(2), 'A');
    });

    it('ligar o Modo Rima desliga o Modo Sílaba Tônica, e vice-versa', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol' }];
        inicializarGradeSonoridade(container, linhas);
        clicar(container.querySelector('#son-btn-modo-tonico'));
        assert.equal(
            container.querySelector('#son-btn-modo-tonico').getAttribute('aria-pressed'),
            'true',
        );

        clicar(container.querySelector('#son-btn-modo-rima'));
        assert.equal(
            container.querySelector('#son-btn-modo-tonico').getAttribute('aria-pressed'),
            'false',
        );
        assert.equal(
            container.querySelector('#son-btn-modo-rima').getAttribute('aria-pressed'),
            'true',
        );

        clicar(container.querySelector('#son-btn-modo-tonico'));
        assert.equal(
            container.querySelector('#son-btn-modo-rima').getAttribute('aria-pressed'),
            'false',
        );
    });

    it('reabrir a grade com rimas já salvas mostra as letras sem precisar reconfirmar', () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol' },
            { tipo: 'verso', numero: 2, texto: 'A/lém' },
        ];
        const rimasSalvas = [
            { id: 1, a: { linha: 0, silabas: [2] }, b: { linha: 1, silabas: [1] } },
        ];
        inicializarGradeSonoridade(container, linhas, rimasSalvas);

        assert.equal(letraDaLinha(0), 'A');
        assert.equal(letraDaLinha(1), 'A');
        assert.deepEqual(obterRimasSonoridade(), rimasSalvas);
    });

    it('confirmar um par dá contorno colorido às células dos dois lados, e a mesma cor na letra da linha', () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol' },
            { tipo: 'verso', numero: 2, texto: 'A/lém' },
        ];
        inicializarGradeSonoridade(container, linhas);
        clicar(container.querySelector('#son-btn-modo-rima'));
        clicar(celula(0, 2));
        clicar(celula(1, 1));
        clicar(container.querySelector('#son-btn-confirmar-rima'));

        const celulaA = celula(0, 2);
        const celulaB = celula(1, 1);
        assert.match(celulaA.className, /ring-2/);
        assert.match(celulaA.className, /ring-rose-400/); // 1ª letra (A) = 1ª cor da paleta
        assert.match(celulaB.className, /ring-rose-400/);
        // célula não envolvida na rima não ganha contorno nenhum
        assert.doesNotMatch(celula(0, 0).className, /ring-2/);

        const tdLetraA = container.querySelector(
            '#son-grade-body tr[data-idx="0"] td.son-cel-rima-letra',
        );
        assert.match(tdLetraA.className, /text-rose-600/);
    });

    it('grupos de rima diferentes (letras diferentes) ganham cores diferentes', () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Um/ verso' },
            { tipo: 'verso', numero: 2, texto: 'Ou/tro' },
            { tipo: 'verso', numero: 3, texto: 'Ter/ceiro' },
            { tipo: 'verso', numero: 4, texto: 'Quar/to' },
        ];
        inicializarGradeSonoridade(container, linhas);
        clicar(container.querySelector('#son-btn-modo-rima'));
        // par A: versos 0 e 1
        clicar(celula(0, 1));
        clicar(celula(1, 1));
        clicar(container.querySelector('#son-btn-confirmar-rima'));
        // par B: versos 2 e 3
        clicar(celula(2, 1));
        clicar(celula(3, 1));
        clicar(container.querySelector('#son-btn-confirmar-rima'));

        assert.match(celula(0, 1).className, /ring-rose-400/);
        assert.match(celula(2, 1).className, /ring-emerald-400/); // 2ª letra (B) = 2ª cor
    });

    it('re-selecionar (Modo Rima) uma célula já rimada mostra o destaque de seleção, não a cor confirmada', () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol' },
            { tipo: 'verso', numero: 2, texto: 'A/lém' },
        ];
        const rimasSalvas = [
            { id: 1, a: { linha: 0, silabas: [2] }, b: { linha: 1, silabas: [1] } },
        ];
        inicializarGradeSonoridade(container, linhas, rimasSalvas);
        clicar(container.querySelector('#son-btn-modo-rima'));
        clicar(celula(0, 2)); // reabre como novo lado A da próxima seleção

        const cel = celula(0, 2);
        assert.match(cel.className, /ring-blue-400/);
        assert.doesNotMatch(cel.className, /ring-rose-400/);
    });
});

// ─── celulasComEco (mapa célula→eco, reaproveitado pelos exportadores
// .pdf/.docx em exportar-sonoridade.js) ────────────────────────────────
describe('celulasComEco', () => {
    it('mapeia as sílabas dos dois lados de cada eco, sem depender de letra/esquema', () => {
        const ecos = [{ id: 1, a: { linha: 0, silabas: [1, 2] }, b: { linha: 2, silabas: [0] } }];
        const mapa = celulasComEco(ecos);
        assert.equal(mapa.get('0:1'), true);
        assert.equal(mapa.get('0:2'), true);
        assert.equal(mapa.get('2:0'), true);
        assert.equal(mapa.get('1:0'), undefined);
    });

    it('sem ecos, o mapa vem vazio', () => {
        assert.equal(celulasComEco([]).size, 0);
    });
});

describe('celulasDivergentesPeMetrico', () => {
    it('pé contínuo (iambo): marca as posições pares não-tônicas até o total real de sílabas', () => {
        // "Quan/do o/ sol/ se/ pôs" = 5 sílabas reais, tônicas em [1, 3]
        // (posições 2 e 4, 0-based) — iambo espera 2, 4 (todas pares até
        // 5): posição 2 já está marcada, só a 4 diverge.
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol/ se/ pôs', tonicas: [1] },
        ];
        const mapa = celulasDivergentesPeMetrico(linhas, 'Iambo (fraca-forte)');
        assert.equal(mapa.get('0:1'), undefined);
        assert.equal(mapa.get('0:3'), true);
        assert.equal(mapa.size, 1);
    });

    it('pé fixo (Decassílabo Heroico): só cobra as posições obrigatórias que cabem no verso', () => {
        // Verso com só 8 sílabas reais (ainda sendo escrito) — a posição
        // 10 não existe ainda, não pode ser cobrada; só a 6 é verificada.
        const oitoSilabas = 'a/a/a/a/a/a/a/a';
        const linhas = [{ tipo: 'verso', numero: 1, texto: oitoSilabas, tonicas: [] }];
        const mapa = celulasDivergentesPeMetrico(linhas, 'Decassílabo Heroico');
        assert.equal(mapa.get('0:5'), true); // posição 6, 0-based
        assert.equal(mapa.get('0:9'), undefined); // posição 10 não cabe ainda
        assert.equal(mapa.size, 1);
    });

    it('nenhuma divergência quando todas as posições esperadas já estão marcadas', () => {
        const dezSilabas = 'a/a/a/a/a/a/a/a/a/a';
        const linhas = [{ tipo: 'verso', numero: 1, texto: dezSilabas, tonicas: [5, 9] }];
        assert.equal(celulasDivergentesPeMetrico(linhas, 'Decassílabo Heroico').size, 0);
    });

    it('sobrar tônica fora do padrão nunca gera divergência (não-punitivo)', () => {
        const dezSilabas = 'a/a/a/a/a/a/a/a/a/a';
        const linhas = [{ tipo: 'verso', numero: 1, texto: dezSilabas, tonicas: [0, 5, 9] }];
        assert.equal(celulasDivergentesPeMetrico(linhas, 'Decassílabo Heroico').size, 0);
    });

    it('linha vazia/quebra de estrofe é ignorada', () => {
        const linhas = [{ tipo: 'vazia' }];
        assert.equal(celulasDivergentesPeMetrico(linhas, 'Iambo (fraca-forte)').size, 0);
    });

    it('sem Pé Métrico selecionado (ou rótulo desconhecido), mapa vem vazio', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol', tonicas: [] }];
        assert.equal(celulasDivergentesPeMetrico(linhas, '').size, 0);
        assert.equal(celulasDivergentesPeMetrico(linhas, 'Pé Inexistente').size, 0);
    });

    it('linha.tonicas ausente conta como nenhuma tônica marcada — padrão inteiro diverge', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol/ se' }];
        const mapa = celulasDivergentesPeMetrico(linhas, 'Iambo (fraca-forte)');
        assert.equal(mapa.get('0:1'), true);
        assert.equal(mapa.get('0:3'), true);
        assert.equal(mapa.size, 2);
    });
});

// ─── calcularLetraRimaEsperada — Molde, Bloco 2 sub-passo 3 (contraparte
// prescritiva de calcularLetrasRima: aqui não existe par confirmado
// nenhum, a letra vem só do esquema declarado) ────────────────────────
describe('calcularLetraRimaEsperada', () => {
    const verso = () => ({ tipo: 'verso' });
    const vazia = () => ({ tipo: 'vazia' });

    it('Presença diferente de "Rimado" — mapa sempre vazio, mesmo com Padrão preenchido', () => {
        const linhas = [verso(), verso(), verso(), verso()];
        assert.equal(
            calcularLetraRimaEsperada(linhas, 'Sem Rimas / Livre', 'Alternada / Cruzada (ABAB)')
                .size,
            0,
        );
        assert.equal(calcularLetraRimaEsperada(linhas, '', 'Alternada / Cruzada (ABAB)').size, 0);
    });

    it('Padrão sem fórmula fixa (Mista/Completa) — mapa vazio', () => {
        const linhas = [verso(), verso(), verso(), verso()];
        assert.equal(calcularLetraRimaEsperada(linhas, 'Rimado', 'Mista / Completa').size, 0);
    });

    it('Monorrima Absoluta (AAAA) — todo verso é A, inclusive atravessando quebra de estrofe', () => {
        const linhas = [verso(), verso(), vazia(), verso()];
        const letras = calcularLetraRimaEsperada(linhas, 'Rimado', 'Monorrima Absoluta (AAAA)');
        assert.equal(letras.get(0), 'A');
        assert.equal(letras.get(1), 'A');
        assert.equal(letras.get(3), 'A');
        assert.equal(letras.has(2), false); // linha vazia nunca entra no mapa
    });

    it('Monorrima por Blocos — só quebra de estrofe avança a letra, não uma contagem fixa de versos', () => {
        const linhas = [verso(), verso(), verso(), vazia(), verso(), verso()];
        const letras = calcularLetraRimaEsperada(
            linhas,
            'Rimado',
            'Monorrima por Blocos / Continuada (AAAA BBBB CCCC)',
        );
        assert.equal(letras.get(0), 'A');
        assert.equal(letras.get(1), 'A');
        assert.equal(letras.get(2), 'A');
        assert.equal(letras.get(4), 'B');
        assert.equal(letras.get(5), 'B');
    });

    it('Emparelhada (AABB) — 1º ciclo AABB, ciclo seguinte avança pra CCDD', () => {
        const linhas = [verso(), verso(), verso(), verso(), verso(), verso(), verso(), verso()];
        const letras = calcularLetraRimaEsperada(linhas, 'Rimado', 'Emparelhada (AABB)');
        assert.deepEqual(
            [0, 1, 2, 3, 4, 5, 6, 7].map((i) => letras.get(i)),
            ['A', 'A', 'B', 'B', 'C', 'C', 'D', 'D'],
        );
    });

    it('Alternada / Cruzada (ABAB)', () => {
        const linhas = [verso(), verso(), verso(), verso()];
        const letras = calcularLetraRimaEsperada(linhas, 'Rimado', 'Alternada / Cruzada (ABAB)');
        assert.deepEqual(
            [0, 1, 2, 3].map((i) => letras.get(i)),
            ['A', 'B', 'A', 'B'],
        );
    });

    it('Oposta / Interpolada (ABBA)', () => {
        const linhas = [verso(), verso(), verso(), verso()];
        const letras = calcularLetraRimaEsperada(linhas, 'Rimado', 'Oposta / Interpolada (ABBA)');
        assert.deepEqual(
            [0, 1, 2, 3].map((i) => letras.get(i)),
            ['A', 'B', 'B', 'A'],
        );
    });

    it('Quadra / Rima Simples (ABCB) — 1º e 3º versos são soltos, ficam sem letra', () => {
        const linhas = [verso(), verso(), verso(), verso()];
        const letras = calcularLetraRimaEsperada(linhas, 'Rimado', 'Quadra / Rima Simples (ABCB)');
        assert.equal(letras.has(0), false);
        assert.equal(letras.get(1), 'B');
        assert.equal(letras.has(2), false);
        assert.equal(letras.get(3), 'B');
    });

    it('Sextilha Aberta (ABCBDB) — só os versos pares (letra B) recebem letra, os ímpares ficam soltos', () => {
        const linhas = [verso(), verso(), verso(), verso(), verso(), verso()];
        const letras = calcularLetraRimaEsperada(linhas, 'Rimado', 'Sextilha Aberta (ABCBDB)');
        assert.equal(letras.has(0), false);
        assert.equal(letras.get(1), 'B');
        assert.equal(letras.has(2), false);
        assert.equal(letras.get(3), 'B');
        assert.equal(letras.has(4), false);
        assert.equal(letras.get(5), 'B');
    });

    it('Encadeada / Terza Rima (ABA BCB) — a rima do meio de um terceto vira a externa do próximo', () => {
        const linhas = [verso(), verso(), verso(), verso(), verso(), verso()];
        const letras = calcularLetraRimaEsperada(
            linhas,
            'Rimado',
            'Encadeada / Terza Rima (ABA BCB)',
        );
        assert.deepEqual(
            [0, 1, 2, 3, 4, 5].map((i) => letras.get(i)),
            ['A', 'B', 'A', 'B', 'C', 'B'],
        );
    });

    it('quebra de estrofe força um ciclo novo (letras avançadas) mesmo com o ciclo em curso incompleto', () => {
        // AABB começou (A, A), quebra no meio do ciclo — o resto do
        // poema começa do zero, com letras já avançadas (C, D), nunca
        // reaproveitando A/B da 1ª estrofe.
        const linhas = [verso(), verso(), vazia(), verso(), verso()];
        const letras = calcularLetraRimaEsperada(linhas, 'Rimado', 'Emparelhada (AABB)');
        assert.equal(letras.get(0), 'A');
        assert.equal(letras.get(1), 'A');
        assert.equal(letras.get(3), 'C');
        assert.equal(letras.get(4), 'C');
    });

    it('sem nenhuma linha, mapa vem vazio', () => {
        assert.equal(calcularLetraRimaEsperada([], 'Rimado', 'Alternada / Cruzada (ABAB)').size, 0);
    });
});

// ─── TIPOS_ECO_SONORO — não pode ser confundido com TIPOS_ECO
// (intertextualidade entre poemas, conceito diferente — ver utils.js) ─
describe('TIPOS_ECO_SONORO', () => {
    it('tem as 5 sugestões padrão de eco sonoro (Assonância, Aliteração, Consonância, Paronomásia, Homeoteleuto)', () => {
        assert.deepEqual(TIPOS_ECO_SONORO, [
            'Assonância',
            'Aliteração',
            'Consonância',
            'Paronomásia',
            'Homeoteleuto',
        ]);
    });

    it('é uma constante distinta de TIPOS_ECO (Eco de Intertextualidade, outro conceito)', () => {
        assert.notDeepEqual(TIPOS_ECO_SONORO, TIPOS_ECO);
    });
});

describe('mostrarEcosAtivo/definirMostrarEcos — preferência persistida', () => {
    it('começa ligado por padrão, sem nada salvo ainda', () => {
        window.localStorage.removeItem('arquivo-poetico:mostrar-ecos-sonoros');
        assert.equal(mostrarEcosAtivo(), true);
    });

    it('definirMostrarEcos(false) persiste e mostrarEcosAtivo() reflete a mudança', () => {
        definirMostrarEcos(false);
        assert.equal(mostrarEcosAtivo(), false);
        definirMostrarEcos(true);
        assert.equal(mostrarEcosAtivo(), true);
    });
});

describe('Modo Eco (Ecos Sonoros) — DOM real (happy-dom)', () => {
    let container;

    function clicar(el) {
        el.dispatchEvent(new window.Event('click', { bubbles: true }));
    }
    function shiftClicar(el) {
        el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, shiftKey: true }));
    }
    function celula(linhaIdx, silabaIdx) {
        return container.querySelector(
            `#son-grade-body tr[data-idx="${linhaIdx}"] td.son-cel-silaba[data-silaba-idx="${silabaIdx}"]`,
        );
    }

    beforeEach(() => {
        document.body.innerHTML = '<div id="son-grade-container"></div>';
        container = document.getElementById('son-grade-container');
        definirMostrarEcos(true);
    });

    it('clicar numa sílaba com Modo Eco ligado só abre o lado A — nada é confirmado sozinho', () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol' },
            { tipo: 'verso', numero: 2, texto: 'A/lém' },
        ];
        inicializarGradeSonoridade(container, linhas);
        clicar(container.querySelector('#son-btn-modo-eco'));
        clicar(celula(0, 0));

        assert.deepEqual(obterEcosSonoridade(), []);
        assert.equal(container.querySelector('#son-btn-confirmar-eco').disabled, true);
        assert.ok(
            container.querySelector('#son-btn-cancelar-eco'),
            'botão de cancelar deve aparecer',
        );
    });

    it('clicar num verso diferente abre o lado B; Confirmar eco cria o eco sonoro (sem letra de esquema)', () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Me/nos' },
            { tipo: 'verso', numero: 2, texto: 'Ce/do' },
        ];
        inicializarGradeSonoridade(container, linhas);
        clicar(container.querySelector('#son-btn-modo-eco'));
        clicar(celula(0, 1)); // "nos"
        clicar(celula(1, 1)); // "do"

        assert.equal(container.querySelector('#son-btn-confirmar-eco').disabled, false);
        clicar(container.querySelector('#son-btn-confirmar-eco'));

        const ecos = obterEcosSonoridade();
        assert.equal(ecos.length, 1);
        assert.deepEqual(ecos[0].a, { linha: 0, silabas: [1] });
        assert.deepEqual(ecos[0].b, { linha: 1, silabas: [1] });
        // eco não ganha letra de esquema de rima — não é grupo/monorrima
        assert.equal(
            container
                .querySelector('#son-grade-body tr[data-idx="0"] td.son-cel-rima-letra')
                .textContent.trim(),
            '',
        );
        // seleção fecha sozinha depois de confirmar — botões somem
        assert.equal(container.querySelector('#son-btn-confirmar-eco'), null);
    });

    it('shift-clique estende os dois lados do eco antes de confirmar', () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Ca/mi/nhei' },
            { tipo: 'verso', numero: 2, texto: 'A/qui/vim' },
        ];
        inicializarGradeSonoridade(container, linhas);
        clicar(container.querySelector('#son-btn-modo-eco'));
        clicar(celula(0, 1));
        shiftClicar(celula(0, 2));
        clicar(celula(1, 1));
        shiftClicar(celula(1, 2));
        clicar(container.querySelector('#son-btn-confirmar-eco'));

        const ecos = obterEcosSonoridade();
        assert.deepEqual(ecos[0].a, { linha: 0, silabas: [1, 2] });
        assert.deepEqual(ecos[0].b, { linha: 1, silabas: [1, 2] });
    });

    it('Cancelar seleção descarta o eco em curso sem confirmar nada', () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol' },
            { tipo: 'verso', numero: 2, texto: 'A/lém' },
        ];
        inicializarGradeSonoridade(container, linhas);
        clicar(container.querySelector('#son-btn-modo-eco'));
        clicar(celula(0, 2));
        clicar(celula(1, 1));
        clicar(container.querySelector('#son-btn-cancelar-eco'));

        assert.deepEqual(obterEcosSonoridade(), []);
        assert.equal(container.querySelector('#son-btn-confirmar-eco'), null);
    });

    it('Modo Tônica, Modo Rima e Modo Eco são mutuamente exclusivos — só um ativo por vez', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol' }];
        inicializarGradeSonoridade(container, linhas);

        clicar(container.querySelector('#son-btn-modo-rima'));
        clicar(container.querySelector('#son-btn-modo-eco'));
        assert.equal(
            container.querySelector('#son-btn-modo-rima').getAttribute('aria-pressed'),
            'false',
        );
        assert.equal(
            container.querySelector('#son-btn-modo-eco').getAttribute('aria-pressed'),
            'true',
        );

        clicar(container.querySelector('#son-btn-modo-tonico'));
        assert.equal(
            container.querySelector('#son-btn-modo-eco').getAttribute('aria-pressed'),
            'false',
        );
        assert.equal(
            container.querySelector('#son-btn-modo-tonico').getAttribute('aria-pressed'),
            'true',
        );
    });

    it('confirmar um eco dá contorno tracejado (outline-dashed) às células dos dois lados, sem ring colorido', () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol' },
            { tipo: 'verso', numero: 2, texto: 'A/lém' },
        ];
        inicializarGradeSonoridade(container, linhas);
        clicar(container.querySelector('#son-btn-modo-eco'));
        clicar(celula(0, 2));
        clicar(celula(1, 1));
        clicar(container.querySelector('#son-btn-confirmar-eco'));

        const celulaA = celula(0, 2);
        assert.match(celulaA.className, /outline-dashed/);
        assert.doesNotMatch(celulaA.className, /ring-2/);
    });

    it('desligar "Mostrar Ecos Sonoros" tira o contorno tracejado da grade sem apagar os ecos salvos', () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol' },
            { tipo: 'verso', numero: 2, texto: 'A/lém' },
        ];
        const ecosSalvos = [
            { id: 1, a: { linha: 0, silabas: [2] }, b: { linha: 1, silabas: [1] } },
        ];
        inicializarGradeSonoridade(container, linhas, [], ecosSalvos);

        assert.match(celula(0, 2).className, /outline-dashed/);

        // dispatchEvent('click') sintético não dispara a "activation
        // behavior" nativa de checkbox (toggle de checked + evento
        // change) no happy-dom — por isso alterna `checked` manualmente
        // e dispara 'change' direto, que é o evento que o listener do
        // toggle escuta (ver reconstruirColunas em editor-sonoridade.js).
        const toggle = container.querySelector('#son-toggle-mostrar-ecos');
        toggle.checked = false;
        toggle.dispatchEvent(new window.Event('change', { bubbles: true }));

        assert.equal(mostrarEcosAtivo(), false);
        assert.doesNotMatch(celula(0, 2).className, /outline-dashed/);
        assert.deepEqual(obterEcosSonoridade(), ecosSalvos);
    });

    it('reabrir a grade com ecos já salvos preserva o array (inclusive o campo tipo)', () => {
        const linhas = [
            { tipo: 'verso', numero: 1, texto: 'Quan/do o/ sol' },
            { tipo: 'verso', numero: 2, texto: 'A/lém' },
        ];
        const ecosSalvos = [
            {
                id: 1,
                a: { linha: 0, silabas: [2] },
                b: { linha: 1, silabas: [1] },
                tipo: 'Assonância',
            },
        ];
        inicializarGradeSonoridade(container, linhas, [], ecosSalvos);
        assert.deepEqual(obterEcosSonoridade(), ecosSalvos);
    });

    it('inicializarGradeSonoridade sem ecos (chamada antiga, sem 4º argumento) não quebra — vira array vazio', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'Um/ verso' }];
        inicializarGradeSonoridade(container, linhas, []);
        assert.deepEqual(obterEcosSonoridade(), []);
    });
});
