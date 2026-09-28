import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TAREFAS_COMO_FACO, tarefaComoFaco } from '../js/como-faco-passos.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(__dirname, '..');
const INDEX_HTML = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
const UI_JS = fs.readFileSync(path.join(RAIZ, 'js/ui.js'), 'utf8');

const todosOsPassos = TAREFAS_COMO_FACO.flatMap((t) => t.passos);

function idsDoIndex() {
    return new Set([...INDEX_HTML.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
}

describe('Como eu faço para...: tarefas', () => {
    it('ids de tarefa são únicos', () => {
        const ids = TAREFAS_COMO_FACO.map((t) => t.id);
        assert.equal(new Set(ids).size, ids.length);
    });

    it('toda tarefa tem descrição (frase mostrada acima do botão)', () => {
        for (const t of TAREFAS_COMO_FACO) {
            assert.ok(t.descricao && t.descricao.trim(), `tarefa sem descrição: ${t.id}`);
        }
    });

    it('toda tarefa tem título e ao menos 1 passo', () => {
        for (const t of TAREFAS_COMO_FACO) {
            assert.ok(t.titulo, `tarefa sem título: ${t.id}`);
            assert.ok(t.passos.length >= 1, `tarefa sem passo: ${t.id}`);
        }
    });

    it('ids de passo são únicos entre todas as tarefas', () => {
        const ids = todosOsPassos.map((p) => p.id);
        assert.equal(new Set(ids).size, ids.length);
    });

    it('todo passo tem título, texto e seletor', () => {
        for (const p of todosOsPassos) {
            assert.ok(p.titulo && p.texto && p.seletor, `passo incompleto: ${p.id}`);
        }
    });

    it('textos de tela não usam travessão', () => {
        for (const p of todosOsPassos) {
            assert.ok(!/[—–]/.test(p.titulo + p.texto), `travessão em ${p.id}`);
        }
        for (const t of TAREFAS_COMO_FACO) {
            assert.ok(!/[—–]/.test(t.titulo + t.descricao), `travessão na tarefa ${t.id}`);
        }
    });

    it('tarefaComoFaco acha por id e devolve null pro que não existe', () => {
        assert.equal(tarefaComoFaco('registrar-poema').titulo, 'Registrar um poema');
        assert.equal(tarefaComoFaco('tarefa-inexistente'), null);
    });
});

// Guarda no espírito de tour-passos.test.js: renomear um id do HTML
// quebra ESTE teste em vez de deixar o mini-tour apontando pro nada.
describe('Como eu faço para...: seletores e abas existem de verdade', () => {
    const ids = idsDoIndex();

    it('todo seletor é "#id" e o id existe no index.html', () => {
        for (const p of todosOsPassos) {
            for (const seletor of [p.seletor, p.seletorAlternativo].filter(Boolean)) {
                assert.match(seletor, /^#[\w-]+$/, `seletor fora do formato em ${p.id}`);
                assert.ok(ids.has(seletor.slice(1)), `${seletor} (passo ${p.id}) não existe`);
            }
        }
    });

    it('toda aba aberta por um passo é uma aba real (section + item da nav)', () => {
        for (const p of todosOsPassos.filter((x) => x.aba)) {
            assert.ok(
                new RegExp(`<section id="${p.aba}"`).test(INDEX_HTML),
                `aba ${p.aba} (passo ${p.id}) sem <section> no index.html`,
            );
            assert.ok(
                UI_JS.includes(`id: '${p.aba}'`),
                `aba ${p.aba} (passo ${p.id}) fora do GRUPOS_NAV de ui.js`,
            );
        }
    });
});
