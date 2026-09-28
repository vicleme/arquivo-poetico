import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    PASSOS_COMUNS,
    PERFIS_COM_ROTEIRO,
    montarRoteiro,
    outroPerfil,
    passosDoPerfil,
} from '../js/tour-passos.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(__dirname, '..');
const INDEX_HTML = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
const MAIN_JS = fs.readFileSync(path.join(RAIZ, 'js/main.js'), 'utf8');
const UI_JS = fs.readFileSync(path.join(RAIZ, 'js/ui.js'), 'utf8');

const todosOsPassos = PERFIS_COM_ROTEIRO.flatMap((p) => passosDoPerfil(p)).concat(PASSOS_COMUNS);

function idsDoIndex() {
    return new Set([...INDEX_HTML.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
}

describe('Tour: roteiros', () => {
    it('cada perfil tem 4 passos próprios e o roteiro fecha com os 2 comuns', () => {
        for (const perfil of PERFIS_COM_ROTEIRO) {
            assert.equal(passosDoPerfil(perfil).length, 4);
            const roteiro = montarRoteiro(perfil);
            assert.equal(roteiro.length, 6);
            assert.deepEqual(roteiro.slice(4), PASSOS_COMUNS);
        }
    });

    it('perfil desconhecido não tem roteiro nem "outro perfil"', () => {
        assert.deepEqual(montarRoteiro('hacker'), []);
        assert.deepEqual(montarRoteiro(null), []);
        assert.equal(outroPerfil('hacker'), null);
    });

    it('outroPerfil devolve o oposto', () => {
        assert.equal(outroPerfil('escritor'), 'estudioso');
        assert.equal(outroPerfil('estudioso'), 'escritor');
    });

    it('ids de passo são únicos', () => {
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
    });
});

// Guarda no espírito do wiring-onclick.test.js: renomear um id do HTML
// quebra ESTE teste em vez de deixar o tour apontando pro nada.
describe('Tour: seletores e abas existem de verdade', () => {
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

    it('main.js liga a navegação do tour e expõe o "Começar" do modal', () => {
        assert.match(MAIN_JS, /definirNavegacaoTour\(abrirAba\)/);
        assert.match(MAIN_JS, /^window\.iniciarTourModoAprendizado\s*=/m);
    });
});
