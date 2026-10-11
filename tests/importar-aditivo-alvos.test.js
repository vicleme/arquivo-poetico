import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { classificarImportacaoAditiva, aplicarImportacaoAditiva } from '../js/importar-aditivo.js';
import { alvosSoltosPorItem, comAlvoTitulo } from '../js/alvos-conceitos.js';

// F11-D9 (etapa 4a2): a Importação Aditiva remapeia o texto-alvo de Elos e
// Ecos. Ordem de resolução: texto do lote, duplicata casada, título exato
// único no destino (`alvoTitulo`) e, sem nada disso, a entrada é solta.

function dbVazio() {
    return {
        poemas: [],
        prosas: [],
        pessoas: [],
        grupos: [],
        autores: [],
        epocas: [],
        periodosHistoricos: [],
        livros: [],
        personagens: [],
        escansoes: [],
        estruturasTextuais: [],
    };
}

function texto(tipo, id, titulo, conceitos = undefined) {
    return {
        id,
        tipo,
        titulo,
        texto: 'x',
        pessoas: [],
        autoria: [],
        gruposDiretosResolvidos: [],
        livrosResolvidos: [],
        contexto: { livro: null, parte: null, secao: null },
        ...(conceitos ? { conceitos } : {}),
    };
}

function depsFake() {
    return {
        tirarSnapshotSeNecessario: mock.fn(async () => true),
        save: mock.fn(() => {}),
    };
}

async function importar(payload, db, ajustar = null) {
    const relatorio = classificarImportacaoAditiva(payload, db);
    if (ajustar) ajustar(relatorio);
    const resultado = await aplicarImportacaoAditiva(payload, relatorio, db, depsFake());
    return resultado;
}

const porTitulo = (db, titulo) => [...db.poemas, ...db.prosas].find((t) => t.titulo === titulo);

describe('Importação Aditiva: alvo de Elos e Ecos (F11-D9)', () => {
    it('Eco entre dois textos do lote aponta para o id novo do alvo', async () => {
        const db = dbVazio();
        const payload = {
            itens: [
                texto('poema', 7, 'Maré'),
                texto('prosa', 1000, 'Cais', {
                    ecos: [{ id: 7, tipo: 'Aceno a', texto: 'a mesma mulher', alvoTitulo: 'Maré' }],
                }),
            ],
        };
        const r = await importar(payload, db);
        assert.equal(r.sucesso, true);
        const mare = porTitulo(db, 'Maré');
        const cais = porTitulo(db, 'Cais');
        assert.notEqual(mare.id, 7);
        assert.deepEqual(cais.conceitos.ecos, [
            { id: mare.id, tipo: 'Aceno a', texto: 'a mesma mulher' },
        ]);
        assert.deepEqual(r.soltos, { elos: 0, ecos: 0 });
    });

    it('Elo nos dois sentidos dentro do lote: cada lado aponta para o outro', async () => {
        const db = dbVazio();
        const payload = {
            itens: [
                texto('poema', 7, 'Maré', {
                    elos: [{ id: 1000, relacao: 'Resposta', direcao: 'origem', texto: '' }],
                }),
                texto('prosa', 1000, 'Cais', {
                    elos: [{ id: 7, relacao: 'Resposta', direcao: 'destino', texto: '' }],
                }),
            ],
        };
        await importar(payload, db);
        const mare = porTitulo(db, 'Maré');
        const cais = porTitulo(db, 'Cais');
        assert.equal(mare.conceitos.elos[0].id, cais.id);
        assert.equal(cais.conceitos.elos[0].id, mare.id);
    });

    it('a ordem do arquivo não importa: o alvo pode vir depois de quem o ecoa', async () => {
        const db = dbVazio();
        const payload = {
            itens: [
                texto('prosa', 1000, 'Cais', {
                    ecos: [{ id: 7, tipo: 'Aceno a', texto: '' }],
                }),
                texto('poema', 7, 'Maré'),
            ],
        };
        await importar(payload, db);
        assert.equal(porTitulo(db, 'Cais').conceitos.ecos[0].id, porTitulo(db, 'Maré').id);
    });

    it('alvo fora do lote casa por título exato no acervo (sem caixa)', async () => {
        const db = dbVazio();
        db.poemas.push({ id: 555, titulo: 'maré', texto: 'y' });
        const payload = {
            itens: [
                texto('prosa', 1000, 'Cais', {
                    ecos: [{ id: 7, tipo: 'Aceno a', texto: 'n', alvoTitulo: 'Maré' }],
                    elos: [
                        { id: 7, relacao: 'Variação', direcao: '', texto: '', alvoTitulo: 'Maré' },
                    ],
                }),
            ],
        };
        const r = await importar(payload, db);
        const cais = porTitulo(db, 'Cais');
        assert.equal(cais.conceitos.ecos[0].id, 555);
        assert.equal(cais.conceitos.elos[0].id, 555);
        assert.deepEqual(r.soltos, { elos: 0, ecos: 0 });
    });

    it('alvo de Prosa no destino também casa por título', async () => {
        const db = dbVazio();
        db.prosas.push({ id: 556, titulo: 'Farol', texto: 'y' });
        const payload = {
            itens: [
                texto('poema', 7, 'Maré', {
                    ecos: [{ id: 99, tipo: 'Aceno a', texto: '', alvoTitulo: 'Farol' }],
                }),
            ],
        };
        await importar(payload, db);
        assert.equal(porTitulo(db, 'Maré').conceitos.ecos[0].id, 556);
    });

    it('alvo fora do lote sem correspondência: o Eco sai inteiro, com nota e âncora', async () => {
        const db = dbVazio();
        db.personagens.push({ id: 10, nome: 'Iara' });
        const payload = {
            itens: [
                texto('prosa', 1000, 'Cais', {
                    ecos: [
                        {
                            id: 7,
                            tipo: 'Personagem em comum',
                            texto: 'a mesma mulher, anos depois',
                            alvoTitulo: 'Maré',
                            ancoras: [{ especie: 'personagem', id: 10, nome: 'Iara' }],
                        },
                        { id: 7, tipo: 'Aceno a', texto: '', alvoTitulo: 'Maré' },
                    ],
                    elos: [
                        { id: 7, relacao: 'Díptico', direcao: '', texto: '', alvoTitulo: 'Maré' },
                    ],
                }),
            ],
        };
        const r = await importar(payload, db);
        const cais = porTitulo(db, 'Cais');
        assert.deepEqual(cais.conceitos.ecos, []);
        assert.deepEqual(cais.conceitos.elos, []);
        assert.deepEqual(r.soltos, { elos: 1, ecos: 2 });
    });

    it('o id de origem nunca vale sozinho: bater com outro texto do destino não liga nada', async () => {
        const db = dbVazio();
        db.poemas.push({ id: 7, titulo: 'Outro poema qualquer', texto: 'y' });
        const payload = {
            itens: [
                texto('prosa', 1000, 'Cais', {
                    ecos: [{ id: 7, tipo: 'Aceno a', texto: '', alvoTitulo: 'Maré' }],
                }),
            ],
        };
        const r = await importar(payload, db);
        assert.deepEqual(porTitulo(db, 'Cais').conceitos.ecos, []);
        assert.equal(r.soltos.ecos, 1);
    });

    it('JSON antigo (sem alvoTitulo): resolve dentro do lote e solta o resto', async () => {
        const db = dbVazio();
        const payload = {
            itens: [
                texto('poema', 7, 'Maré'),
                texto('prosa', 1000, 'Cais', {
                    ecos: [
                        { id: 7, tipo: 'Aceno a', texto: 'no lote' },
                        { id: 8, tipo: 'Aceno a', texto: 'fora do lote' },
                    ],
                }),
            ],
        };
        const r = await importar(payload, db);
        const cais = porTitulo(db, 'Cais');
        assert.equal(cais.conceitos.ecos.length, 1);
        assert.equal(cais.conceitos.ecos[0].id, porTitulo(db, 'Maré').id);
        assert.equal(r.soltos.ecos, 1);
    });

    it('duplicata casada: o alvo passa a ser o texto que já existe no acervo', async () => {
        const db = dbVazio();
        db.poemas.push({ id: 555, titulo: 'Maré', texto: 'já aqui' });
        const payload = {
            itens: [
                texto('poema', 7, 'Maré'),
                texto('prosa', 1000, 'Cais', {
                    ecos: [{ id: 7, tipo: 'Aceno a', texto: '', alvoTitulo: 'Maré' }],
                }),
            ],
        };
        const r = await importar(payload, db, (relatorio) => {
            const dup = relatorio.itensOrigem[0].referencias.find(
                (x) => x.campo === 'duplicataTitulo',
            );
            dup.decisao = 'casar';
            dup.entidadeDestinoId = dup.candidatos[0].id;
        });
        assert.equal(r.duplicatasPuladas, 1);
        assert.equal(db.poemas.length, 1, 'a Maré do arquivo não foi importada');
        assert.equal(porTitulo(db, 'Cais').conceitos.ecos[0].id, 555);
    });

    it('duplicata casada vale mesmo sem alvoTitulo (JSON antigo)', async () => {
        const db = dbVazio();
        db.poemas.push({ id: 555, titulo: 'Maré', texto: 'já aqui' });
        const payload = {
            itens: [
                texto('poema', 7, 'Maré'),
                texto('prosa', 1000, 'Cais', { ecos: [{ id: 7, tipo: 'Aceno a', texto: '' }] }),
            ],
        };
        await importar(payload, db, (relatorio) => {
            const dup = relatorio.itensOrigem[0].referencias.find(
                (x) => x.campo === 'duplicataTitulo',
            );
            dup.decisao = 'casar';
            dup.entidadeDestinoId = dup.candidatos[0].id;
        });
        assert.equal(porTitulo(db, 'Cais').conceitos.ecos[0].id, 555);
    });

    it('duplicata importada como item novo conta como texto do lote', async () => {
        const db = dbVazio();
        db.poemas.push({ id: 555, titulo: 'Maré', texto: 'já aqui' });
        const payload = {
            itens: [
                texto('poema', 7, 'Maré'),
                texto('prosa', 1000, 'Cais', {
                    ecos: [{ id: 7, tipo: 'Aceno a', texto: '', alvoTitulo: 'Maré' }],
                }),
            ],
        };
        await importar(payload, db, (relatorio) => {
            const dup = relatorio.itensOrigem[0].referencias.find(
                (x) => x.campo === 'duplicataTitulo',
            );
            dup.decisao = 'criar';
        });
        const novas = db.poemas.filter((p) => p.titulo === 'Maré');
        assert.equal(novas.length, 2);
        const importada = novas.find((p) => p.id !== 555);
        assert.equal(porTitulo(db, 'Cais').conceitos.ecos[0].id, importada.id);
    });

    it('dois textos do acervo com o mesmo título: ambíguo, solta em vez de chutar', async () => {
        const db = dbVazio();
        db.poemas.push({ id: 555, titulo: 'Maré', texto: 'a' });
        db.prosas.push({ id: 556, titulo: 'Maré', texto: 'b' });
        const payload = {
            itens: [
                texto('prosa', 1000, 'Cais', {
                    ecos: [{ id: 7, tipo: 'Aceno a', texto: '', alvoTitulo: 'Maré' }],
                }),
            ],
        };
        const r = await importar(payload, db);
        assert.deepEqual(porTitulo(db, 'Cais').conceitos.ecos, []);
        assert.equal(r.soltos.ecos, 1);
    });

    it('alvoTitulo não persiste no texto importado', async () => {
        const db = dbVazio();
        const payload = {
            itens: [
                texto('poema', 7, 'Maré'),
                texto('prosa', 1000, 'Cais', {
                    ecos: [{ id: 7, tipo: 'Aceno a', texto: '', alvoTitulo: 'Maré' }],
                    elos: [
                        { id: 7, relacao: 'Versão', direcao: '', texto: '', alvoTitulo: 'Maré' },
                    ],
                }),
            ],
        };
        await importar(payload, db);
        const cais = porTitulo(db, 'Cais');
        assert.equal('alvoTitulo' in cais.conceitos.ecos[0], false);
        assert.equal('alvoTitulo' in cais.conceitos.elos[0], false);
    });

    it('texto sem Elos nem Ecos passa intacto', async () => {
        const db = dbVazio();
        const payload = {
            itens: [texto('poema', 7, 'Maré', { notas: 'x' }), texto('poema', 8, 'Sem conceitos')],
        };
        const r = await importar(payload, db);
        assert.deepEqual(porTitulo(db, 'Maré').conceitos, { notas: 'x' });
        assert.equal('conceitos' in porTitulo(db, 'Sem conceitos'), false);
        assert.deepEqual(r.soltos, { elos: 0, ecos: 0 });
    });

    it('item com erro fica fora do lote: quem o ecoa perde a ligação', async () => {
        const db = dbVazio();
        const payload = {
            itens: [
                texto('poema', 7, ''), // título vazio: erro
                texto('prosa', 1000, 'Cais', { ecos: [{ id: 7, tipo: 'Aceno a', texto: '' }] }),
            ],
        };
        const r = await importar(payload, db);
        assert.deepEqual(porTitulo(db, 'Cais').conceitos.ecos, []);
        assert.equal(r.soltos.ecos, 1);
    });
});

describe('Prévia: ligações que serão soltas', () => {
    it('conta o que será solto por item e some quando o alvo entra no lote', () => {
        const db = dbVazio();
        const so = {
            itens: [
                texto('prosa', 1000, 'Cais', {
                    ecos: [{ id: 7, tipo: 'Aceno a', texto: '', alvoTitulo: 'Maré' }],
                    elos: [
                        { id: 7, relacao: 'Versão', direcao: '', texto: '', alvoTitulo: 'Maré' },
                    ],
                }),
            ],
        };
        const rel = classificarImportacaoAditiva(so, db);
        const [soltos] = alvosSoltosPorItem(so, rel, db);
        assert.deepEqual(soltos.ecos, [{ titulo: 'Maré' }]);
        assert.deepEqual(soltos.elos, [{ titulo: 'Maré' }]);

        const completo = { itens: [texto('poema', 7, 'Maré'), ...so.itens] };
        const rel2 = classificarImportacaoAditiva(completo, db);
        const porItem = alvosSoltosPorItem(completo, rel2, db);
        assert.deepEqual(porItem[1], { elos: [], ecos: [] });
    });

    it('alvo que já existe no acervo não gera aviso', () => {
        const db = dbVazio();
        db.poemas.push({ id: 555, titulo: 'Maré', texto: 'y' });
        const payload = {
            itens: [
                texto('prosa', 1000, 'Cais', {
                    ecos: [{ id: 7, tipo: 'Aceno a', texto: '', alvoTitulo: 'Maré' }],
                }),
            ],
        };
        const rel = classificarImportacaoAditiva(payload, db);
        assert.deepEqual(alvosSoltosPorItem(payload, rel, db)[0], { elos: [], ecos: [] });
    });

    it('acompanha a decisão da duplicata: casar resolve, e o item pulado não avisa', () => {
        const db = dbVazio();
        db.poemas.push({ id: 555, titulo: 'Maré', texto: 'y' });
        const payload = {
            itens: [
                texto('poema', 7, 'Maré', {
                    ecos: [{ id: 99, tipo: 'Aceno a', texto: '', alvoTitulo: 'Fantasma' }],
                }),
                texto('prosa', 1000, 'Cais', { ecos: [{ id: 7, tipo: 'Aceno a', texto: '' }] }),
            ],
        };
        const rel = classificarImportacaoAditiva(payload, db);
        const dup = rel.itensOrigem[0].referencias.find((x) => x.campo === 'duplicataTitulo');

        // Pendente: o item entra no lote, então o Eco de "Maré" para "Fantasma" é aviso.
        let porItem = alvosSoltosPorItem(payload, rel, db);
        assert.equal(porItem[0].ecos.length, 1);
        assert.equal(porItem[1].ecos.length, 0, 'Cais aponta para Maré, que está no lote');

        dup.decisao = 'casar';
        dup.entidadeDestinoId = dup.candidatos[0].id;
        porItem = alvosSoltosPorItem(payload, rel, db);
        assert.equal(porItem[0], null, 'duplicata pulada não é importada, não avisa');
        assert.equal(porItem[1].ecos.length, 0, 'Cais passa a apontar para a Maré do acervo');
    });

    it('item com erro não entra na conta', () => {
        const db = dbVazio();
        const payload = { itens: [texto('poema', 7, '')] };
        const rel = classificarImportacaoAditiva(payload, db);
        assert.deepEqual(alvosSoltosPorItem(payload, rel, db), [null]);
    });
});

describe('Exportação: alvoTitulo', () => {
    it('cada Elo e Eco leva o título do alvo; alvo inexistente passa como está', () => {
        const db = dbVazio();
        db.poemas.push({ id: 7, titulo: 'Maré' });
        db.prosas.push({ id: 8, titulo: 'Farol' });
        const r = comAlvoTitulo(db, [
            { id: 7, tipo: 'Aceno a' },
            { id: 8, tipo: 'Aceno a' },
            { id: 99, tipo: 'Aceno a' },
        ]);
        assert.equal(r[0].alvoTitulo, 'Maré');
        assert.equal(r[1].alvoTitulo, 'Farol');
        assert.equal('alvoTitulo' in r[2], false);
    });

    it('lista ausente passa como está', () => {
        assert.equal(comAlvoTitulo(dbVazio(), undefined), undefined);
    });
});
