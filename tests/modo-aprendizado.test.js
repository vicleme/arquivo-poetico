import './helpers/dom-real.js';

import { describe, it, beforeEach, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML_MODAL = fs.readFileSync(
    path.resolve(__dirname, '../modais/modal-modo-aprendizado.html'),
    'utf8',
);

// modais.js carrega o HTML do modal via fetch (lazy). Aqui o fetch devolve o
// arquivo REAL de modais/ — se um id mudar no HTML, este teste quebra.
globalThis.fetch = async () => ({ ok: true, status: 200, text: async () => HTML_MODAL });
document.body.innerHTML = '<div id="modais-container"></div>';

const { registrarModal, toggleModal } = await import('../js/modais.js');
const ma = await import('../js/modo-aprendizado.js');
const tour = await import('../js/tour.js');

registrarModal('modal-modo-aprendizado', 'modal-modo-aprendizado.html', ma.initModoAprendizado);

const el = (id) => document.getElementById(id);
const aberto = () => !el('modal-modo-aprendizado').classList.contains('hidden');
const visivel = (id) => !el(id).classList.contains('hidden');
const marcar = (valor) => {
    const radio = document.querySelector(`input[name="ma-perfil"][value="${valor}"]`);
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
};

describe('Modo Aprendizado — preferências (localStorage)', () => {
    beforeEach(() => localStorage.clear());

    it('abre sozinho no primeiro acesso (chave ainda não existe)', () => {
        assert.equal(ma.deveAbrirAutomaticamenteModoAprendizado(), true);
    });

    it('não abre sozinho quando "não exibir novamente" está salvo como marcado', () => {
        ma.salvarPreferenciaNaoExibirModoAprendizado(true);
        assert.equal(ma.deveAbrirAutomaticamenteModoAprendizado(), false);
        assert.equal(ma.lerPreferenciaNaoExibirModoAprendizado(), true);
    });

    it('volta a abrir sozinho se a pessoa desmarcou a preferência', () => {
        ma.salvarPreferenciaNaoExibirModoAprendizado(true);
        ma.salvarPreferenciaNaoExibirModoAprendizado(false);
        assert.equal(ma.deveAbrirAutomaticamenteModoAprendizado(), true);
    });

    it('garantirPreferenciaPadrao grava "marcado" quando a chave não existe', () => {
        ma.garantirPreferenciaPadraoModoAprendizado();
        assert.equal(ma.lerPreferenciaNaoExibirModoAprendizado(), true);
    });

    it('garantirPreferenciaPadrao nunca sobrescreve uma escolha já feita', () => {
        ma.salvarPreferenciaNaoExibirModoAprendizado(false);
        ma.garantirPreferenciaPadraoModoAprendizado();
        assert.equal(ma.lerPreferenciaNaoExibirModoAprendizado(), false);
    });

    it('perfil: só aceita os dois valores válidos', () => {
        assert.equal(ma.lerPerfilModoAprendizado(), null);
        ma.salvarPerfilModoAprendizado('qualquer-coisa');
        assert.equal(ma.lerPerfilModoAprendizado(), null);
        ma.salvarPerfilModoAprendizado('estudioso');
        assert.equal(ma.lerPerfilModoAprendizado(), 'estudioso');
    });

    it('perfil corrompido no localStorage é lido como "nunca escolhido"', () => {
        localStorage.setItem('arquivoPoetico_ma_perfil', 'hacker');
        assert.equal(ma.lerPerfilModoAprendizado(), null);
    });
});

describe('Modo Aprendizado — modal', () => {
    before(async () => {
        // carrega o modal uma vez (o registro em modais.js guarda o estado "carregado")
        await ma.abrirModoAprendizado();
        await toggleModal('modal-modo-aprendizado');
    });

    beforeEach(() => {
        localStorage.clear();
        el('modal-modo-aprendizado').classList.add('hidden');
    });

    it('abre na etapa do perfil, só com o botão Continuar', async () => {
        await ma.abrirModoAprendizado();
        assert.ok(aberto());
        assert.ok(visivel('ma-etapa-perfil'));
        assert.ok(!visivel('ma-etapa-fim'));
        assert.ok(visivel('ma-btn-continuar'));
        assert.ok(!visivel('ma-btn-voltar'));
        assert.ok(!visivel('ma-btn-agora-nao'));
        assert.ok(!visivel('ma-btn-comecar'));
    });

    it('"Não exibir novamente" vem marcado e o padrão já fica salvo', async () => {
        await ma.abrirModoAprendizado();
        assert.equal(el('ma-nao-exibir').checked, true);
        // abrir uma vez basta pra não reabrir sozinho na sessão seguinte
        assert.equal(ma.deveAbrirAutomaticamenteModoAprendizado(), false);
    });

    it('desmarcar "Não exibir novamente" grava e faz o modal voltar a abrir sozinho', async () => {
        await ma.abrirModoAprendizado();
        el('ma-nao-exibir').checked = false;
        el('ma-nao-exibir').dispatchEvent(new Event('change', { bubbles: true }));
        assert.equal(ma.deveAbrirAutomaticamenteModoAprendizado(), true);
    });

    it('Continuar sem escolher perfil mostra o aviso e não avança', async () => {
        await ma.abrirModoAprendizado();
        assert.equal(ma.avancarModoAprendizadoPerfil(), false);
        assert.ok(visivel('ma-perfil-erro'));
        assert.ok(visivel('ma-etapa-perfil'));
        assert.equal(ma.lerPerfilModoAprendizado(), null);
    });

    it('escolher um perfil some com o aviso', async () => {
        await ma.abrirModoAprendizado();
        ma.avancarModoAprendizadoPerfil();
        marcar('escritor');
        assert.ok(!visivel('ma-perfil-erro'));
    });

    it('Continuar com perfil salva, avança e troca os botões', async () => {
        await ma.abrirModoAprendizado();
        marcar('estudioso');
        assert.equal(ma.avancarModoAprendizadoPerfil(), true);
        assert.equal(ma.lerPerfilModoAprendizado(), 'estudioso');
        assert.ok(visivel('ma-etapa-fim'));
        assert.ok(!visivel('ma-etapa-perfil'));
        assert.ok(visivel('ma-btn-voltar'));
        assert.ok(visivel('ma-btn-agora-nao'));
        assert.ok(visivel('ma-btn-comecar'));
        assert.ok(!visivel('ma-btn-continuar'));
    });

    it('a tela 2 diz quantos passos o tour tem (roteiro do perfil + comuns)', async () => {
        await ma.abrirModoAprendizado();
        marcar('escritor');
        ma.avancarModoAprendizadoPerfil();
        assert.equal(el('ma-tour-total').textContent, '6');
    });

    it('Voltar retorna à etapa do perfil', async () => {
        await ma.abrirModoAprendizado();
        marcar('escritor');
        ma.avancarModoAprendizadoPerfil();
        ma.voltarModoAprendizadoPerfil();
        assert.ok(visivel('ma-etapa-perfil'));
        assert.ok(visivel('ma-btn-continuar'));
    });

    it('reabrir (o "?") volta à etapa 1 com o perfil e a preferência já preenchidos', async () => {
        await ma.abrirModoAprendizado();
        marcar('estudioso');
        ma.avancarModoAprendizadoPerfil();
        await toggleModal('modal-modo-aprendizado'); // fecha

        await ma.abrirModoAprendizado();
        assert.ok(visivel('ma-etapa-perfil'));
        assert.equal(document.querySelector('input[name="ma-perfil"]:checked').value, 'estudioso');
        assert.equal(el('ma-nao-exibir').checked, true);
    });

    it('clicar no "?" com o modal já aberto não reinicia nem fecha', async () => {
        await ma.abrirModoAprendizado();
        marcar('escritor');
        ma.avancarModoAprendizadoPerfil();
        await ma.abrirModoAprendizado();
        assert.ok(aberto());
        assert.ok(visivel('ma-etapa-fim'));
    });

    it('Começar fecha o modal e abre o tour do perfil escolhido (6 passos)', async () => {
        await ma.abrirModoAprendizado();
        marcar('estudioso');
        ma.avancarModoAprendizadoPerfil();
        assert.equal(await ma.iniciarTourModoAprendizado(), true);
        assert.ok(!aberto());
        assert.ok(tour.tourAtivo());
        assert.equal(el('tour-progresso').textContent, '1 de 6');
        tour.encerrarTour();
    });

    it('Começar sem perfil salvo não abre tour nenhum', async () => {
        assert.equal(await ma.iniciarTourModoAprendizado(), false);
        assert.ok(!tour.tourAtivo());
    });

    it('abrirModoAprendizadoSeNecessario: abre no primeiro acesso', async () => {
        await ma.abrirModoAprendizadoSeNecessario();
        assert.ok(aberto());
    });

    it('abrirModoAprendizadoSeNecessario: respeita "não exibir novamente"', async () => {
        ma.salvarPreferenciaNaoExibirModoAprendizado(true);
        await ma.abrirModoAprendizadoSeNecessario();
        assert.ok(!aberto());
    });
});
