import './helpers/dom-real.js';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    SINALIZACOES_CATEGORIAS,
    sinalizacoesCombinadas,
    sinalizacoesAgrupadas,
    filtrarTextos,
    PREFIXOS_CANONICOS_POR_CAMPO,
} from '../js/utils.js';
import { badgesEtiquetasPorCategoria } from '../js/celulas-tabela.js';
import { montarItem } from '../js/pacote-texto.js';
import { renderSinalizacoesProsa } from '../js/editor.js';

// Territorialidade: lugares específicos citados no texto. Categoria de
// Sinalizações independente de Tema (assunto amplo) e Domínio Imagético.
describe('Territorialidade (categoria de Sinalizações)', () => {
    it('existe em SINALIZACOES_CATEGORIAS, logo depois de Tema', () => {
        const chaves = Object.keys(SINALIZACOES_CATEGORIAS);
        assert.equal(SINALIZACOES_CATEGORIAS.territorialidade, 'sinalizacoesTerritorialidade');
        assert.equal(chaves.indexOf('territorialidade'), chaves.indexOf('tema') + 1);
    });

    it('entra na string combinada, na busca geral e no prefixo canônico', () => {
        const item = { sinalizacoesTema: 'Brasil', sinalizacoesTerritorialidade: 'Copacabana' };
        assert.equal(sinalizacoesCombinadas(item), 'Brasil, Copacabana');
        assert.equal(PREFIXOS_CANONICOS_POR_CAMPO._buscaTerritorialidade, 'territorialidade');
    });

    it('aparece agrupada com o rótulo próprio, só quando preenchida', () => {
        const agrupadas = sinalizacoesAgrupadas({ sinalizacoesTerritorialidade: 'Rio Amazonas' });
        assert.deepEqual(agrupadas, [{ rotulo: 'Territorialidade', valor: 'Rio Amazonas' }]);
        assert.deepEqual(sinalizacoesAgrupadas({ sinalizacoesTema: '' }), []);
    });

    it('prefixo territorialidade: busca só nessa categoria, sem pegar Tema', () => {
        const itens = [
            { id: 1, titulo: 'A', _buscaTerritorialidade: 'Santos', sinalizacoesTema: '' },
            { id: 2, titulo: 'B', _buscaTerritorialidade: '', sinalizacoesTema: 'Santos' },
        ];
        const r = filtrarTextos(itens, 'territorialidade:santos');
        assert.deepEqual(
            r.map((i) => i.id),
            [1],
        );
    });

    it('badge da tabela usa cor própria, diferente da de Tema', () => {
        const territorial = badgesEtiquetasPorCategoria({ sinalizacoesTerritorialidade: 'Santos' });
        const tematico = badgesEtiquetasPorCategoria({ sinalizacoesTema: 'Santos' });
        assert.match(territorial, /emerald/);
        assert.doesNotMatch(tematico, /emerald/);
    });

    it('o importador de texto nasce com o campo vazio', () => {
        const item = montarItem(
            1,
            { titulo: 'x', texto: 'verso' },
            { autor: { nome: 'Fulano' } },
            'poema',
        );
        assert.equal(item.sinalizacoesTerritorialidade, '');
    });

    it('o bloco de Sinalizações do modal de Prosa NÃO renderiza mais a Territorialidade (vive em Região e Idioma)', () => {
        document.body.innerHTML = '<div id="pr-sinalizacoes-corpo"></div>';
        renderSinalizacoesProsa();
        assert.equal(document.getElementById('pr-sinal-territorialidade'), null);
        assert.equal(document.getElementById('sugestoes-sinais-territorialidade-prosa'), null);
    });
});
