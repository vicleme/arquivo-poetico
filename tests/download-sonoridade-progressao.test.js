import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

document.body.innerHTML = `
    <div id="a"><span class="sonoridade-progressao-slot"></span></div>
`;

const { db } = await import('../js/db.js');
const m = await import('../js/download-abrangente.js');

const CH_ANTIGA = 'arquivoPoetico_downloadAbrangente';
const CH_SON = 'arquivoPoetico_downloadSonoridade';
const CH_PRO = 'arquivoPoetico_downloadProgressao';

function limpar() {
    [CH_ANTIGA, CH_SON, CH_PRO].forEach((c) => localStorage.removeItem(c));
    db.escansoes = [{ id: 1, poemaId: 7, forma: 'x' }];
    db.estruturasTextuais = [{ id: 1, poemaId: 7, unidades: [], eventos: [] }];
}

const poema = () => ({ id: 7, tipo: 'poema', titulo: 'A' });

describe('Sonoridade e Progressão no download de Poemas', () => {
    beforeEach(limpar);

    it('sem nenhuma preferência guardada, nada é incluído', () => {
        const [item] = m.enriquecerItensComExtras([poema()]);
        assert.equal(item.sonoridade, undefined);
        assert.equal(item.estruturaTextual, undefined);
    });

    it('quem tinha o antigo Abrangente ligado fica com as duas ligadas', () => {
        localStorage.setItem(CH_ANTIGA, '1');
        assert.equal(m.isDownloadSonoridadeAtivo(), true);
        assert.equal(m.isDownloadProgressaoAtivo(), true);
        const [item] = m.enriquecerItensComExtras([poema()]);
        assert.ok(item.sonoridade);
        assert.ok(item.estruturaTextual);
    });

    it('a escolha nova vale sobre o Abrangente antigo, cada uma por si', () => {
        localStorage.setItem(CH_ANTIGA, '1');
        m.toggleDownloadProgressao(false);
        const [item] = m.enriquecerItensComExtras([poema()]);
        assert.ok(item.sonoridade);
        assert.equal(item.estruturaTextual, undefined);
    });

    it('só a Sonoridade, só a Progressão', () => {
        m.toggleDownloadSonoridade(true);
        let [item] = m.enriquecerItensComExtras([poema()]);
        assert.ok(item.sonoridade);
        assert.equal(item.estruturaTextual, undefined);
        m.toggleDownloadSonoridade(false);
        m.toggleDownloadProgressao(true);
        [item] = m.enriquecerItensComExtras([poema()]);
        assert.equal(item.sonoridade, undefined);
        assert.ok(item.estruturaTextual);
    });

    it('Prosa nunca recebe os extras', () => {
        m.toggleDownloadSonoridade(true);
        m.toggleDownloadProgressao(true);
        const [item] = m.enriquecerItensComExtras([{ id: 7, tipo: 'prosa', titulo: 'P' }]);
        assert.equal(item.sonoridade, undefined);
    });

    it('as caixas montam uma vez e ficam sincronizadas', () => {
        m.montarCaixasSonoridadeProgressao();
        m.montarCaixasSonoridadeProgressao();
        assert.equal(document.querySelectorAll('.download-sonoridade-check').length, 1);
        const caixa = document.querySelector('.download-sonoridade-check');
        assert.equal(caixa.checked, false);
        m.toggleDownloadSonoridade(true);
        assert.equal(caixa.checked, true);
    });
});
