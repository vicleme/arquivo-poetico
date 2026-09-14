// dom-real.js (não dom-shim.js) — renderVisualizacaoSonoridadeHtml
// chama renderGradeLeituraHtml (editor-sonoridade.js), que consulta
// mostrarEcosAtivo() via window.localStorage; mesmo motivo de
// exportar-sonoridade.test.js.
import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { renderVisualizacaoSonoridadeHtml } from '../js/visualizar-sonoridade.js';
import { definirMostrarEcos } from '../js/editor-sonoridade.js';

beforeEach(() => definirMostrarEcos(true));

describe('renderVisualizacaoSonoridadeHtml', () => {
    it('sem nenhum campo/linha, mostra só o cabeçalho da Grade e "Sem grade de escansão."', () => {
        const html = renderVisualizacaoSonoridadeHtml({});
        assert.match(html, /Grade Silábica/);
        assert.match(html, /Sem grade de escansão\./);
        // nenhum campo de meta (Forma/Registro/Tom etc.) deveria aparecer
        assert.ok(!html.includes('<strong'));
    });

    it('mostra só os campos de classificação preenchidos, com rótulo em negrito', () => {
        const html = renderVisualizacaoSonoridadeHtml({ formaPoema: 'Soneto', tom: 'Melancólico' });
        assert.match(html, /<strong[^>]*>Forma:<\/strong> Soneto/);
        assert.match(html, /<strong[^>]*>Tom:<\/strong> Melancólico/);
        assert.ok(!html.includes('Registro'));
    });

    it('junta Presença + Padrão do Esquema de Rimas numa linha só', () => {
        const html = renderVisualizacaoSonoridadeHtml({
            esquemaRimasPresenca: 'Com rima',
            esquemaRimasPadrao: 'ABAB',
        });
        assert.match(html, /<strong[^>]*>Esquema de Rimas:<\/strong> Com rima · ABAB/);
    });

    it('escapa HTML nos valores dos campos (evita injeção via texto livre)', () => {
        const html = renderVisualizacaoSonoridadeHtml({ formaPoema: '<script>x</script>' });
        assert.ok(!html.includes('<script>x</script>'));
        assert.match(html, /&lt;script&gt;/);
    });

    it('repassa escansaoLinhas/rimas/ecos pra renderGradeLeituraHtml (grade real aparece)', () => {
        const linhas = [{ tipo: 'verso', numero: 1, texto: 'Um/Dois', tonicas: [1] }];
        const html = renderVisualizacaoSonoridadeHtml({ escansaoLinhas: linhas });
        assert.ok(!html.includes('Sem grade de escansão.'));
        assert.match(html, /Um/);
        assert.match(html, /Dois/);
    });
});
