// Fase 2, Etapa 3d: a Importação Aditiva converte JSON antigo (só o espelho
// `sinalizacoesTema`) em `temas` por id na hora, sem esperar o save(), e o
// espelho do texto importado sempre sai de `sincronizarEspelhoDoTexto`.
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { temasDeEspelhoAntigo } from '../js/temas.js';
import { aplicarImportacaoAditiva, classificarImportacaoAditiva } from '../js/importar-aditivo.js';
import { nomesDosTemas } from './helpers/temas-do-texto.js';

const dbVazio = () => ({
    poemas: [],
    prosas: [],
    pessoas: [],
    grupos: [],
    autores: [],
    epocas: [],
    periodosHistoricos: [],
    livros: [],
    escansoes: [],
    estruturasTextuais: [],
    temas: [],
    assuntos: [],
});

const texto = (extra) => ({
    id: 42,
    tipo: 'poema',
    titulo: 'Elegia',
    texto: 'texto',
    pessoas: [],
    autoria: [],
    gruposDiretosResolvidos: [],
    livrosResolvidos: [],
    contexto: { livro: null, parte: null, secao: null },
    ...extra,
});

const deps = () => ({
    tirarSnapshotSeNecessario: mock.fn(async () => true),
    save: mock.fn(() => {}),
});

async function importar(db, item) {
    const payload = { itens: [item] };
    const rel = classificarImportacaoAditiva(payload, db);
    const r = await aplicarImportacaoAditiva(payload, rel, db, deps());
    assert.equal(r.sucesso, true);
    return db.poemas[db.poemas.length - 1];
}

const nomes = (db, texto) => texto.temas.map((t) => db.temas.find((x) => x.id == t.temaId)?.nome);

describe('temasDeEspelhoAntigo', () => {
    it('converte o espelho em temas por id, todos sem papel, e cria o que falta', () => {
        const db = dbVazio();
        db.temas.push({ id: 1, nome: 'Amor', notas: '' });
        const item = { sinalizacoesTema: 'amor, Exílio' };
        const temas = temasDeEspelhoAntigo(db, item);
        assert.equal(temas.length, 2);
        assert.equal(temas[0].temaId, 1);
        assert.deepEqual(
            temas.map((t) => t.papel),
            ['', ''],
        );
        assert.equal(db.temas.length, 2);
        assert.equal(db.temas[1].nome, 'Exílio');
    });

    it('não mexe no texto, ignora repetição por grafia e aceita espelho vazio', () => {
        const db = dbVazio();
        const item = { sinalizacoesTema: 'café, Café' };
        assert.equal(temasDeEspelhoAntigo(db, item).length, 1);
        assert.equal(item.sinalizacoesTema, 'café, Café');
        assert.equal('temas' in item, false);
        assert.deepEqual(temasDeEspelhoAntigo(db, { sinalizacoesTema: '' }), []);
        assert.deepEqual(temasDeEspelhoAntigo(db, {}), []);
    });
});

describe('Importação Aditiva e o formato antigo do Tema', () => {
    it('JSON antigo (só o espelho) vira temas por id na hora, sem papel', async () => {
        const db = dbVazio();
        const novo = await importar(db, texto({ sinalizacoesTema: 'Amor, Exílio' }));
        assert.deepEqual(nomes(db, novo), ['Amor', 'Exílio']);
        assert.deepEqual(
            novo.temas.map((t) => t.papel),
            ['', ''],
        );
        assert.equal(nomesDosTemas(novo, db), 'Amor, Exílio');
        assert.equal(db.temas.length, 2);
    });

    it('`temas` vazio com espelho cheio também cai no espelho', async () => {
        const db = dbVazio();
        const novo = await importar(db, texto({ temas: [], sinalizacoesTema: 'Mar' }));
        assert.deepEqual(nomes(db, novo), ['Mar']);
        assert.equal(nomesDosTemas(novo, db), 'Mar');
    });

    it('JSON novo mantém os papéis e o espelho sai na ordem principal, secundário, sem papel', async () => {
        const db = dbVazio();
        const novo = await importar(
            db,
            texto({
                temas: [
                    { temaId: 7, nome: 'Mar', papel: '' },
                    { temaId: 8, nome: 'Luto', papel: 'secundario' },
                    { temaId: 9, nome: 'Amor', papel: 'principal' },
                ],
                sinalizacoesTema: 'Mar, Luto, Amor',
            }),
        );
        assert.deepEqual(nomes(db, novo), ['Mar', 'Luto', 'Amor']);
        assert.deepEqual(
            novo.temas.map((t) => t.papel),
            ['', 'secundario', 'principal'],
        );
        assert.equal(nomesDosTemas(novo, db), 'Amor, Luto, Mar');
    });

    it('quando `temas` e o espelho do arquivo discordam, valem os `temas`', async () => {
        const db = dbVazio();
        const novo = await importar(
            db,
            texto({
                temas: [{ temaId: 7, nome: 'Mar', papel: 'principal' }],
                sinalizacoesTema: 'Luto',
            }),
        );
        assert.deepEqual(nomes(db, novo), ['Mar']);
        assert.equal(nomesDosTemas(novo, db), 'Mar');
        assert.equal(
            db.temas.some((t) => t.nome === 'Luto'),
            false,
        );
    });

    it('Tema que o acervo já tem é reaproveitado, sem duplicata por caixa ou acento', async () => {
        const db = dbVazio();
        db.temas.push({ id: 1, nome: 'Exílio', notas: '' });
        const novo = await importar(db, texto({ sinalizacoesTema: 'exilio' }));
        assert.equal(db.temas.length, 1);
        assert.equal(novo.temas[0].temaId, 1);
        assert.equal(nomesDosTemas(novo, db), 'Exílio');
    });

    it('texto de pacote (sem Tema nenhum) nasce com `temas` vazio e espelho vazio', async () => {
        const db = dbVazio();
        const novo = await importar(db, texto({ sinalizacoesTema: '' }));
        assert.deepEqual(novo.temas, []);
        assert.equal(nomesDosTemas(novo, db), '');
        assert.equal(db.temas.length, 0);
    });

    it('JSON sem nenhum dos dois campos também nasce vazio', async () => {
        const db = dbVazio();
        const novo = await importar(db, texto({}));
        assert.deepEqual(novo.temas, []);
        assert.equal(nomesDosTemas(novo, db), '');
    });
});
