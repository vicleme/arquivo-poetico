import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { iniciaisPapeisPessoa } from '../js/utils.js';
import { nomesPapeisPessoa } from '../js/papeis-pessoa.js';
import { normalizarPapeis } from '../js/pessoas-papeis-massa.js';
import { papelDePessoaPorRotulo } from '../js/importar-campos-extras.js';

// Papel "Voz" de Pessoa (7º valor de fábrica): a pessoa real cuja fala aparece no
// texto. Diferente do papel Voz de Personagem, que é outra lista. Os papéis
// vêm do registro (papeis-pessoa.js); sem registro vivo, vale a fábrica.
describe('papel Voz em Pessoa', () => {
    const PAPEIS = nomesPapeisPessoa();

    it('é o 7º valor de fábrica, seguido de Alocutário(a) e Relacionado(a), sem duplicar nenhum', () => {
        assert.equal(PAPEIS.length, 9);
        assert.equal(PAPEIS[6], 'Voz');
        assert.equal(PAPEIS[7], 'Alocutário(a)');
        assert.equal(PAPEIS[8], 'Relacionado(a)');
        assert.equal(new Set(PAPEIS).size, PAPEIS.length);
    });

    it('a abreviação é "Voz" e os apelidos de três letras não colidem', () => {
        assert.equal(iniciaisPapeisPessoa(['Voz']), 'Voz');
        assert.equal(iniciaisPapeisPessoa(['Retratado(a)', 'Voz']), 'Retr · Voz');
        assert.equal(iniciaisPapeisPessoa(['Alocutário(a)', 'Aludido(a)']), 'Aloc · Alud');
        const apelidos = PAPEIS.map((p) => iniciaisPapeisPessoa([p]));
        assert.equal(new Set(apelidos).size, PAPEIS.length);
    });

    it('o painel em massa mantém Voz na ordem em que foi marcada', () => {
        assert.deepEqual(normalizarPapeis(['Voz', 'Retratado(a)']), ['Voz', 'Retratado(a)']);
    });

    it('o Importar reconhece Voz, com ou sem caixa', () => {
        assert.equal(papelDePessoaPorRotulo('Voz'), 'Voz');
        assert.equal(papelDePessoaPorRotulo('voz'), 'Voz');
    });

    it('os guias para IA (PT e EN) citam todos os papéis da lista', () => {
        ['docs/pessoas-papeis-for-ai-pt-br.md', 'docs/pessoas-papeis-for-ai.md'].forEach(
            (caminho) => {
                const texto = readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');
                PAPEIS.forEach((papel) =>
                    assert.ok(texto.includes(`- ${papel}`), `${caminho} não cita ${papel}`),
                );
                assert.ok(texto.includes('9'), `${caminho} não diz que são 9`);
            },
        );
    });
});

describe('descrição de fábrica do papel Voz', () => {
    it('descrição antiga não editada migra para a nova; a editada fica', async () => {
        const { normalizarRegistro } = await import('../js/papeis-pessoa.js');
        const antiga =
            'A pessoa real fala no texto: sua fala aparece citada (entre aspas, em itálico, em outra fonte ou cor) ou reproduzida de forma contínua. Pode ser o próprio autor. Não se marca só porque o texto está em primeira pessoa. Em Alocutário(a) a pessoa é ouvida sem responder; aqui ela fala. Não é o papel Voz de Personagem.';
        const migrado = normalizarRegistro([{ nome: 'Voz', apelido: 'Voz', descricao: antiga }]);
        const voz = migrado.find((p) => p.nome === 'Voz');
        assert.ok(voz.descricao.startsWith('Responde "quem fala neste texto?"'));
        const intermediaria =
            'Responde "de quem são as palavras?". É a pessoa real cujas próprias palavras o texto reproduz, falando como ela mesma: o autor (em primeira pessoa ou não), alguém citado (entre aspas, em itálico, em outra fonte ou cor) ou reproduzido de forma contínua. A primeira pessoa sozinha não decide: se quem fala é uma figura criada, o lugar é Personagens; se as palavras são de outra pessoa (citação, tradução fiel), a Voz é dela. Em Alocutário(a) a pessoa é ouvida sem responder; aqui ela fala. Não é o papel Voz de Personagem.';
        const migrado2 = normalizarRegistro([
            { nome: 'Voz', apelido: 'Voz', descricao: intermediaria },
        ]);
        assert.ok(
            migrado2.find((p) => p.nome === 'Voz').descricao.startsWith('Responde "quem fala'),
        );
        const nova = migrado.find((p) => p.nome === 'Voz').descricao;
        assert.ok(nova.includes('Citação'));
        assert.ok(nova.includes('turno (vez de fala)'));
        const editado = normalizarRegistro([{ nome: 'Voz', apelido: 'Voz', descricao: 'minha' }]);
        assert.equal(editado.find((p) => p.nome === 'Voz').descricao, 'minha');
    });
});
