import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    montarForaDoAcervo,
    ordenarObrasDaLista,
    ordenarAutoresDaLista,
    ORDENS_FORA_DO_ACERVO,
} from '../js/fora-do-acervo.js';
import { gerarMarkdownForaDoAcervo } from '../js/exportar-fora-do-acervo.js';

// Conexões › Fora do acervo: ordenar obras e autores pela data da obra.

const ano = (n) => ({ nivel: 'ano', ano: n });

const dados = () =>
    montarForaDoAcervo({
        poemas: [
            {
                id: 1,
                titulo: 'A',
                intertextualidade: [
                    { obra: 'Nova', autores: ['Ana'], dataObra: ano(2010) },
                    { obra: 'Velha', autores: ['Beto'], dataObra: ano(1850) },
                ],
            },
            {
                id: 2,
                titulo: 'B',
                intertextualidade: [
                    { obra: 'Sem data', autores: ['Caio'] },
                    { obra: 'Meio', autores: ['Ana', 'Dani'], dataObra: ano(1950) },
                ],
            },
            {
                id: 3,
                titulo: 'C',
                intertextualidade: [{ obra: 'Sem data', autores: ['Caio'] }],
            },
            {
                id: 4,
                titulo: 'D',
                intertextualidade: [{ obra: 'Só o fim', autores: ['Eva'], dataObraAte: ano(1700) }],
            },
        ],
        prosas: [],
    });

const nomes = (lista, campo) => lista.map((x) => x[campo]);

describe('Fora do acervo: ordem por data da obra', () => {
    it('as duas ordens novas existem na lista de ordens', () => {
        assert.ok(ORDENS_FORA_DO_ACERVO.includes('data-antiga'));
        assert.ok(ORDENS_FORA_DO_ACERVO.includes('data-recente'));
    });

    it('obras: mais antiga primeiro, com a sem data no fim e o ano do fim valendo sozinho', () => {
        const d = dados();
        assert.deepEqual(nomes(ordenarObrasDaLista(d.obras, 'data-antiga'), 'obra'), [
            'Só o fim',
            'Velha',
            'Meio',
            'Nova',
            'Sem data',
        ]);
    });

    it('obras: mais recente primeiro, e a sem data continua no fim', () => {
        const d = dados();
        assert.deepEqual(nomes(ordenarObrasDaLista(d.obras, 'data-recente'), 'obra'), [
            'Nova',
            'Meio',
            'Velha',
            'Só o fim',
            'Sem data',
        ]);
    });

    it('empate de ano segue a ordem de textos e depois o nome', () => {
        const d = montarForaDoAcervo({
            poemas: [
                { id: 1, titulo: 'A', intertextualidade: [{ obra: 'Zeta', dataObra: ano(1900) }] },
                { id: 2, titulo: 'B', intertextualidade: [{ obra: 'Alfa', dataObra: ano(1900) }] },
                { id: 3, titulo: 'C', intertextualidade: [{ obra: 'Zeta', dataObra: ano(1900) }] },
            ],
            prosas: [],
        });
        assert.deepEqual(nomes(ordenarObrasDaLista(d.obras, 'data-antiga'), 'obra'), [
            'Zeta',
            'Alfa',
        ]);
    });

    it('autores: vale a obra mais antiga (data-antiga) ou a mais recente (data-recente)', () => {
        const d = dados();
        // Ana: 2010 e 1950; Beto: 1850; Dani: 1950; Eva: 1700; Caio: sem data.
        assert.deepEqual(nomes(ordenarAutoresDaLista(d.autores, 'data-antiga'), 'autor'), [
            'Eva',
            'Beto',
            'Ana',
            'Dani',
            'Caio',
        ]);
        assert.deepEqual(nomes(ordenarAutoresDaLista(d.autores, 'data-recente'), 'autor'), [
            'Ana',
            'Dani',
            'Beto',
            'Eva',
            'Caio',
        ]);
    });

    it('as obras de cada autor levam a data', () => {
        const ana = dados().autores.find((a) => a.autor === 'Ana');
        const nova = ana.obras.find((o) => o.obra === 'Nova');
        assert.equal(nova.dataObra.ano, 2010);
    });

    it('não muda a lista de entrada e não mexe nas outras ordens', () => {
        const d = dados();
        const antes = nomes(d.obras, 'obra');
        ordenarObrasDaLista(d.obras, 'data-antiga');
        assert.deepEqual(nomes(d.obras, 'obra'), antes);
        assert.deepEqual(
            nomes(ordenarObrasDaLista(d.obras, 'textos'), 'obra'),
            nomes(ordenarObrasDaLista(d.obras), 'obra'),
        );
    });

    it('o relatório .md diz a ordem escolhida', () => {
        const md = gerarMarkdownForaDoAcervo(dados(), 'tudo', { ordem: 'data-antiga' });
        assert.match(md, /Ordem: data da obra, mais antiga primeiro/);
        assert.ok(md.indexOf('Só o fim') < md.indexOf('Velha'));
    });
});
