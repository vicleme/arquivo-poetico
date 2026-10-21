import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
    ABAS_PREVIAS,
    previasAtivas,
    definirPreviasImagem,
    definirPreviasImagemTodas,
    renderControlePrevias,
} from '../js/previas-imagem.js';
import { classificarChaveLocalStorage } from '../js/inventario-armazenamento.js';

const LS_KEY = 'arquivoPoetico_previasImagem';

describe('previas-imagem: Exibir prévias por aba', () => {
    beforeEach(() => {
        localStorage.removeItem(LS_KEY);
    });

    it('sem escolha guardada, todas as abas ficam ligadas', () => {
        ABAS_PREVIAS.forEach((aba) => assert.equal(previasAtivas(aba), true));
    });

    it('desligar uma aba não mexe nas outras e a escolha sobrevive', () => {
        definirPreviasImagem('partes', false);
        assert.equal(previasAtivas('partes'), false);
        assert.equal(previasAtivas('livros'), true);
        assert.equal(previasAtivas('autores'), true);
        assert.equal(JSON.parse(localStorage.getItem(LS_KEY)).partes, false);
    });

    it('religar uma aba apaga a chave dela (ligado é o padrão)', () => {
        definirPreviasImagem('secoes', false);
        definirPreviasImagem('secoes', true);
        assert.equal(previasAtivas('secoes'), true);
        assert.deepEqual(JSON.parse(localStorage.getItem(LS_KEY)), {});
    });

    it('"desligar todas" e "ligar todas" valem para as cinco abas', () => {
        definirPreviasImagemTodas(false);
        ABAS_PREVIAS.forEach((aba) => assert.equal(previasAtivas(aba), false));
        definirPreviasImagemTodas(true);
        ABAS_PREVIAS.forEach((aba) => assert.equal(previasAtivas(aba), true));
    });

    it('aba desconhecida é ignorada e não grava nada', () => {
        definirPreviasImagem('poemas', false);
        assert.equal(localStorage.getItem(LS_KEY), null);
        assert.equal(previasAtivas('poemas'), true);
    });

    it('valor guardado corrompido cai no padrão (tudo ligado)', () => {
        localStorage.setItem(LS_KEY, '{quebrado');
        assert.equal(previasAtivas('livros'), true);
        localStorage.setItem(LS_KEY, '[1,2]');
        assert.equal(previasAtivas('livros'), true);
    });

    it('o controle da aba nasce marcado ou desmarcado conforme a escolha', () => {
        assert.match(renderControlePrevias('livros'), /data-aba="livros" checked/);
        definirPreviasImagem('livros', false);
        assert.doesNotMatch(renderControlePrevias('livros'), /data-aba="livros" checked/);
        assert.match(renderControlePrevias('autores'), /data-aba="autores" checked/);
    });

    it('a chave está classificada como preferência no inventário', () => {
        assert.equal(classificarChaveLocalStorage(LS_KEY), 'preferencia');
    });
});
