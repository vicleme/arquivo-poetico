import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { montarPacote } from '../js/pacote-texto.js';
import { classificarImportacaoAditiva } from '../js/importar-aditivo.js';

// Guarda dos pacotes que vão com o app (biblioteca/): o JSON tem de ser o
// que o `.md` + `.meta.json` geram, e o texto não pode carregar resto de
// página copiada da Wikisource.

const indice = JSON.parse(fs.readFileSync('biblioteca/indice.json', 'utf-8'));
const ids = indice.pacotes.map((p) => p.arquivo);

const RESTO_DE_PAGINA = [
    /Projetos irmãos/,
    /Wikidata|Wikipédia/,
    /\[iniciar\]/,
    /Dados de edição indisponíveis/,
    /Informações desta edição/,
    /Unidade de texto com/,
    /digitalização transcluída/,
    /Ouça este texto/,
    /Edição de referência:/,
    /\[errata \d+\]/,
    /deve ler-se/,
    /→/,
    /\u00ad/,
];

function dbVazio() {
    return {
        poemas: [],
        prosas: [],
        pessoas: [],
        grupos: [],
        autores: [],
        epocas: [],
        livros: [],
        escansoes: [],
        estruturasTextuais: [],
    };
}

describe('pacotes curados de biblioteca/', () => {
    for (const id of ids) {
        const md = `biblioteca/fontes/${id}.md`;
        if (!fs.existsSync(md)) continue; // pacote nascido de seleção (.json)

        describe(id, () => {
            const pacote = JSON.parse(fs.readFileSync(`biblioteca/${id}.json`, 'utf-8'));

            it('o JSON é o que o .md + .meta.json geram (rodar montar-pacote.js)', () => {
                const meta = JSON.parse(
                    fs.readFileSync(`biblioteca/fontes/${id}.meta.json`, 'utf-8'),
                );
                assert.deepEqual(montarPacote(fs.readFileSync(md, 'utf-8'), meta), pacote);
            });

            it('nenhum texto carrega resto de página, marca de errata ou hífen invisível', () => {
                for (const item of pacote.itens) {
                    for (const padrao of RESTO_DE_PAGINA) {
                        assert.doesNotMatch(item.texto, padrao, `${item.titulo}: ${padrao}`);
                    }
                    assert.ok(item.texto.trim().length > 20, `${item.titulo}: texto vazio`);
                }
            });

            it('títulos únicos e importáveis sem erro num acervo vazio', () => {
                const titulos = pacote.itens.map((i) => i.titulo);
                assert.equal(new Set(titulos).size, titulos.length);
                const rel = classificarImportacaoAditiva(pacote, dbVazio());
                assert.equal(rel.resumo.erros ?? 0, 0);
                assert.equal(rel.resumo.prontos, pacote.itens.length);
            });

            it('Prosa não leva descricaoVisual (exclusivo de Poema)', () => {
                for (const item of pacote.itens) {
                    assert.equal('descricaoVisual' in item, item.tipo === 'poema', item.titulo);
                }
            });
        });
    }

    it('composição de tipos dos pacotes novos', () => {
        const contar = (id) => {
            const p = JSON.parse(fs.readFileSync(`biblioteca/${id}.json`, 'utf-8'));
            return p.itens.reduce((a, i) => ({ ...a, [i.tipo]: (a[i.tipo] || 0) + 1 }), {});
        };
        assert.deepEqual(contar('machado-de-assis'), { poema: 3, prosa: 3 });
        assert.deepEqual(contar('maria-firmina-dos-reis'), { prosa: 1, poema: 1 });
        assert.deepEqual(contar('lima-barreto'), { prosa: 3 });
        assert.deepEqual(contar('camoes'), { poema: 6 });
    });

    it('Pessoa: cada heterônimo usado está cadastrado no Autor com o tipo certo', () => {
        const p = JSON.parse(fs.readFileSync('biblioteca/fernando-pessoa.json', 'utf-8'));
        const cadastro = p.autores[0].nomesLiterarios;
        const usados = p.itens.filter((i) => i.autoria[0].nomeLiterario);
        assert.equal(usados.length, 4);
        for (const i of usados) {
            assert.ok(
                cadastro.some(
                    (n) =>
                        n.nome === i.autoria[0].nomeLiterario && n.tipo === i.autoria[0].assinatura,
                ),
                i.titulo,
            );
        }
    });
});
