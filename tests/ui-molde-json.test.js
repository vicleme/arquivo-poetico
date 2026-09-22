import { window } from './helpers/dom-real.js';
import './helpers/localstorage-shim.js';

// dom-real.js não expõe estes dois em globalThis (só os que os outros
// testes já precisaram) — copiados aqui, mesmo raciocínio dos demais.
globalThis.FileReader = window.FileReader;
globalThis.File = window.File;

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const { db } = await import('../js/db.js');
const { importarMoldeDeArquivo, baixarMoldePorId } = await import('../js/ui-molde-json.js');
const { moldeParaPayload } = await import('../js/molde-json.js');

// Sem IndexedDB no ambiente de teste, tirarSnapshotSeNecessario devolve
// false — o que, de quebra, exercita o caminho real "snapshot falhou →
// nada é importado" pela fiação de verdade (sem injeção de deps).
function dispararImportacao(conteudo) {
    const input = document.createElement('input');
    input.type = 'file';
    const arquivo = new File([conteudo], 'molde.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { value: [arquivo] });
    importarMoldeDeArquivo({ target: input });
    return new Promise((r) => setTimeout(r, 50));
}

const textoToasts = () => document.getElementById('avisos-toast')?.textContent || '';

describe('importarMoldeDeArquivo — fiação de UI', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        db.moldes.length = 0;
    });

    it('arquivo que não é JSON → aviso e nada muda', async () => {
        await dispararImportacao('isso não é json');
        assert.match(textoToasts(), /Erro ao ler o arquivo/);
        assert.equal(db.moldes.length, 0);
    });

    it('JSON que não é de Molde → aviso e nada muda', async () => {
        await dispararImportacao(JSON.stringify({ titulo: 'x', escansaoLinhas: [] }));
        assert.match(textoToasts(), /não é um JSON de Molde/);
        assert.equal(db.moldes.length, 0);
    });

    it('snapshot indisponível → avisa e não importa', async () => {
        await dispararImportacao(JSON.stringify(moldeParaPayload({ titulo: 'Novo' })));
        assert.match(textoToasts(), /snapshot de segurança/);
        assert.equal(db.moldes.length, 0);
    });

    it('título já existente → NÃO importa e oferece "Importar mesmo assim"', async () => {
        db.moldes.push({ id: 1, titulo: 'Repetido', moldeLinhas: [], paresRima: [] });
        await dispararImportacao(JSON.stringify(moldeParaPayload({ titulo: 'Repetido' })));
        assert.match(textoToasts(), /Já existe um Molde "Repetido"/);
        assert.match(textoToasts(), /Importar mesmo assim/);
        assert.equal(db.moldes.length, 1);
    });
});

describe('baixarMoldePorId', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        db.moldes.length = 0;
    });

    it('id inexistente → aviso, sem download', () => {
        baixarMoldePorId(12345);
        assert.match(textoToasts(), /Molde não encontrado/);
    });
});
