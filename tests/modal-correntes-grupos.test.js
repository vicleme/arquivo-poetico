import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Modal de Corrente literária: campos em grupos recolhíveis, explicações
// longas atrás de toggle e título "Nova Corrente literária".
const { correnteGruposComDados } = await import('../js/utils.js');
const HTML = readFileSync(
    new URL('../modais/modal-movimento-escola.html', import.meta.url),
    'utf8',
);
const UI = readFileSync(new URL('../js/ui.js', import.meta.url), 'utf8');

describe('modal de Corrente literária', () => {
    it('tem os cinco grupos e todos os campos continuam no modal', () => {
        const grupos = [...HTML.matchAll(/data-grupo-corrente="([^"]+)"/g)].map((m) => m[1]);
        assert.deepEqual(grupos, [
            'hierarquia',
            'classificacao',
            'origem',
            'caracteristicas',
            'notas',
        ]);
        [
            'me-nome',
            'me-tipo',
            'me-pai',
            'me-divisao',
            'me-genero-divisao',
            'me-programa',
            'me-postura-estetica',
            'me-notas',
            'me-regiao-origem',
            'me-ini-ano',
            'me-fim-ano',
            'me-valores',
            'me-temas',
            'me-tecnicas',
            'me-tipos-composicao',
            'me-lemas',
            'me-manifestos',
        ].forEach((id) => assert.ok(HTML.includes(`id="${id}"`), id));
    });

    it('Nome e Tipo ficam fora dos grupos; os grupos não têm campo obrigatório', () => {
        const antes = HTML.slice(0, HTML.indexOf('data-grupo-corrente'));
        assert.ok(antes.includes('id="me-nome"') && antes.includes('id="me-tipo"'));
        assert.ok(!HTML.slice(HTML.indexOf('data-grupo-corrente')).includes('required'));
    });

    it('as explicações longas ficam em três toggles fechados por padrão', () => {
        const toggles = HTML.match(/<details class="campo-ajuda"[^>]*>/g) || [];
        assert.equal(toggles.length, 3);
        toggles.forEach((t) => assert.ok(!/\bopen\b/.test(t)));
    });

    it('o título de nova corrente é "Nova Corrente literária"', () => {
        assert.ok(HTML.includes('Nova Corrente literária'));
        assert.match(
            UI,
            /tipo === 'movimento-escola'\) title\.innerText = 'Nova Corrente literária'/,
        );
    });
});

describe('correnteGruposComDados', () => {
    it('corrente vazia: nenhum grupo', () => {
        assert.deepEqual(Object.values(correnteGruposComDados({ nome: 'X' })).filter(Boolean), []);
    });
    it('abre só os grupos com dado', () => {
        const g = correnteGruposComDados({
            paiId: 1,
            programa: 'Escola',
            inicio: { ano: 1800 },
            temas: ['amor'],
            notas: ' ',
        });
        assert.deepEqual(g, {
            hierarquia: true,
            classificacao: true,
            origem: true,
            caracteristicas: true,
            notas: false,
        });
    });
});
