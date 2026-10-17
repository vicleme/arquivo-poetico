// importar-campos-extras.js: campos extras da "Importar campos" (entrega 3).
//
// Lógica pura, sem DOM e sem save(). O núcleo (importar-campos.js) lê e aplica
// Etiquetas, Temas e Assuntos; aqui moram os outros campos que fazem sentido
// importar sem complicar:
//
//   - territorialidade: lista de Locais citados no texto (nomes);
//   - localEscrita: onde o texto foi redigido (um Local só);
//   - pessoas: lista de { pessoa, papeis } (papéis de PAPEIS_PESSOA);
//   - pendencia: texto livre;
//   - fonte: { origem, edicao, link, conferido, grafia } (ou só um texto, que
//     vale como origem).
//
// Regras (escolhas a confirmar em `manutencao/decisoes.md`):
//   - Listas (territorialidade, pessoas) são SOMA, como etiquetas e temas:
//     o arquivo nunca tira nada do texto. Pessoa que o texto já tem ganha só
//     os papéis que faltam.
//   - Local e Pessoa que não existem no cadastro são criados (Local sem tipo e
//     sem pai; Pessoa sem grupo) e listados no relatório para conferir a
//     grafia antes de aplicar.
//   - Campos de valor único (local de escrita, pendência, fonte) só preenchem
//     o que está vazio. Com a opção `substituirCamposSimples`, o valor do
//     arquivo troca o que já está lá. Valor vazio no arquivo nunca limpa nada,
//     e "conferido" só vale como `true` (não desmarca).
//   - Papel de pessoa fora da lista, grafia desconhecida e valor de tipo errado
//     vão para o relatório e deixam aquela entrada de fora.

import { chaveTema, gerarId, PAPEIS_PESSOA, OPCOES_GRAFIA } from './utils.js';
import {
    localDoTextoDigitado,
    garantirLocalPorNome,
    limparNomeLocal,
    espelhoDeLocais,
    reconciliarLocaisDoTexto,
    territorialidadeDoTexto,
} from './locais.js';
import { obterCampoPreenchivel } from './campos-preenchiveis.js';

// ─── Chaves de comparação ──────────────────────────────────────────────

// Só letras e números, sem caixa nem acento.
export function chaveSolta(valor) {
    return chaveTema(valor).replace(/[^a-z0-9]+/g, '');
}
export function chaveComEspacos(valor) {
    return chaveTema(valor)
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

// ─── Papéis de pessoa ──────────────────────────────────────────────────

// "Retratado(a)", "retratada" e "Retratado" viram a mesma chave; "Inspiração
// para" também vale só como "inspiração".
function chaveDePapel(valor) {
    const tokens = chaveComEspacos(valor)
        .split(' ')
        .filter((t) => t && t !== 'a');
    if (!tokens.length) return '';
    // Feminino da primeira palavra: retratada, aludida, associada, dedicataria.
    tokens[0] = tokens[0].replace(/(ada|ida|aria)$/, (m) => `${m.slice(0, -1)}o`);
    const chave = tokens.join(' ');
    return chave === 'inspiracao' ? 'inspiracao para' : chave;
}

const PAPEL_POR_CHAVE = new Map();
PAPEIS_PESSOA.forEach((p) => PAPEL_POR_CHAVE.set(chaveDePapel(p), p));

export function papelDePessoaPorRotulo(rotulo) {
    return PAPEL_POR_CHAVE.get(chaveDePapel(rotulo)) || null;
}

function listaDeStrings(valor) {
    if (valor == null) return [];
    if (Array.isArray(valor)) return valor;
    return String(valor)
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean);
}

// ─── Leitura ───────────────────────────────────────────────────────────

function textoLimpo(valor) {
    return String(valor ?? '')
        .replace(/\s+/g, ' ')
        .trim();
}

function lerLocais(bruto, campo, problemas) {
    if (bruto == null || bruto === '') return [];
    if (typeof bruto !== 'string' && !Array.isArray(bruto)) {
        problemas.push({ campo, valor: String(bruto), motivo: 'formato-invalido' });
        return [];
    }
    return listaDeStrings(bruto)
        .map((v) => limparNomeLocal(typeof v === 'string' ? v : (v?.local ?? v?.nome ?? '')))
        .filter((n) => chaveTema(n));
}

function lerPessoas(bruto, problemas) {
    const saida = [];
    if (bruto == null) return saida;
    if (!Array.isArray(bruto)) {
        problemas.push({ campo: 'pessoas', valor: String(bruto), motivo: 'formato-invalido' });
        return saida;
    }
    bruto.forEach((e) => {
        const objeto = e && typeof e === 'object';
        const nome = textoLimpo(objeto ? (e.pessoa ?? e.nome ?? '') : e);
        if (!chaveTema(nome)) return;
        const rotulos = objeto ? listaDeStrings(e.papeis ?? e.papel) : [];
        const papeis = [];
        let invalido = null;
        rotulos.forEach((r) => {
            if (!chaveTema(r)) return;
            const papel = papelDePessoaPorRotulo(r);
            if (!papel) invalido = invalido ?? String(r);
            else if (!papeis.includes(papel)) papeis.push(papel);
        });
        if (invalido !== null) {
            problemas.push({
                campo: 'pessoas',
                valor: nome,
                motivo: 'papel-pessoa-invalido',
                detalhe: invalido,
            });
            return;
        }
        saida.push({ nome, papeis });
    });
    return saida;
}

function lerBooleano(valor) {
    if (valor === true || valor === false) return { ok: true, valor };
    const chave = chaveComEspacos(valor);
    if (['sim', 'true', 'verdadeiro', '1'].includes(chave)) return { ok: true, valor: true };
    if (['nao', 'false', 'falso', '0', ''].includes(chave)) return { ok: true, valor: false };
    return { ok: false, valor: false };
}

const GRAFIA_POR_CHAVE = new Map(
    OPCOES_GRAFIA.filter((o) => o.valor).map((o) => [chaveSolta(o.valor), o.valor]),
);

// Campos simples lidos de uma entrada: lista de { chave, valor }, com as
// chaves de CAMPOS_PREENCHIVEIS (fonteOrigem, fonteEdicao, fonteLink,
// fonteConferido, fonteGrafia, pendencia). Vazio é ignorado.
function lerCamposSimples(bruta, problemas) {
    const saida = [];
    const pendencia = textoLimpo(bruta.pendencia ?? bruta['pendência'] ?? '');
    if (pendencia) saida.push({ chave: 'pendencia', valor: pendencia });

    let fonte = bruta.fonte ?? bruta.fonteTexto;
    if (fonte == null || fonte === '') return saida;
    if (typeof fonte === 'string') fonte = { origem: fonte };
    if (typeof fonte !== 'object' || Array.isArray(fonte)) {
        problemas.push({ campo: 'fonte', valor: String(fonte), motivo: 'formato-invalido' });
        return saida;
    }
    const origem = textoLimpo(fonte.origem ?? fonte.fonte ?? '');
    if (origem) saida.push({ chave: 'fonteOrigem', valor: origem });
    const edicao = textoLimpo(fonte.edicao ?? fonte['edição'] ?? '');
    if (edicao) saida.push({ chave: 'fonteEdicao', valor: edicao });
    const link = String(fonte.link ?? '').trim();
    if (link) saida.push({ chave: 'fonteLink', valor: link });
    if (fonte.conferido !== undefined && fonte.conferido !== null) {
        const b = lerBooleano(fonte.conferido);
        if (!b.ok) {
            problemas.push({
                campo: 'fonte',
                valor: 'conferido',
                motivo: 'valor-invalido',
                detalhe: String(fonte.conferido),
            });
        } else if (b.valor) {
            saida.push({ chave: 'fonteConferido', valor: true });
        }
    }
    if (fonte.grafia !== undefined && fonte.grafia !== null && String(fonte.grafia).trim()) {
        const grafia = GRAFIA_POR_CHAVE.get(chaveSolta(fonte.grafia));
        if (!grafia) {
            problemas.push({
                campo: 'fonte',
                valor: 'grafia',
                motivo: 'valor-invalido',
                detalhe: String(fonte.grafia),
            });
        } else {
            saida.push({ chave: 'fonteGrafia', valor: grafia });
        }
    }
    return saida;
}

// Extras de uma entrada do arquivo (o núcleo junta isto ao resto da entrada).
export function lerExtrasDaEntrada(bruta, problemas) {
    const escritaBruta = bruta.localEscrita ?? bruta.local_escrita ?? bruta['local de escrita'];
    const escrita = lerLocais(escritaBruta, 'localEscrita', problemas);
    if (escrita.length > 1) {
        problemas.push({
            campo: 'localEscrita',
            valor: escrita.join(', '),
            motivo: 'mais-de-um-local-de-escrita',
        });
    }
    return {
        territorialidade: lerLocais(bruta.territorialidade, 'territorialidade', problemas),
        localEscrita: escrita.length === 1 ? escrita[0] : null,
        pessoas: lerPessoas(bruta.pessoas, problemas),
        simples: lerCamposSimples(bruta, problemas),
    };
}

export function extrasVazios() {
    return { territorialidade: [], localEscrita: null, pessoas: [], simples: [] };
}

export function entradaTemExtras(entrada) {
    return !!(
        entrada.territorialidade?.length ||
        entrada.localEscrita ||
        entrada.pessoas?.length ||
        entrada.simples?.length
    );
}

// ─── Aplicação ─────────────────────────────────────────────────────────

// Id do Local de nome `nome` e se ele é novo (ainda não existe no cadastro).
// Não cria nada: quem grava chama `garantirLocalPorNome`.
function acharLocal(dbRef, nome) {
    const id = localDoTextoDigitado(dbRef, nome);
    return id == null ? { id: null, nome: limparNomeLocal(nome), nova: true } : { id, nova: false };
}

function nomeCadastradoDoLocal(dbRef, id) {
    return (dbRef.locais || []).find((l) => String(l.id) === String(id))?.nome ?? '';
}

export function aplicarTerritorialidade(dbRef, item, nomes, rel) {
    if (!nomes.length) return;
    reconciliarLocaisDoTexto(dbRef, item);
    const ids = [...territorialidadeDoTexto(dbRef, item)];
    nomes.forEach((nome) => {
        const achado = acharLocal(dbRef, nome);
        let id = achado.id;
        if (id == null) id = garantirLocalPorNome(dbRef, nome);
        if (id == null) return;
        const nomeFinal = nomeCadastradoDoLocal(dbRef, id) || achado.nome;
        if (ids.some((x) => String(x) === String(id))) {
            rel.jaTinha.locais.push({ nome: nomeFinal });
            return;
        }
        ids.push(id);
        rel.adicionados.locais.push({ nome: nomeFinal, nova: achado.nova });
    });
    item.territorialidade = ids;
    item.sinalizacoesTerritorialidade = espelhoDeLocais(dbRef, ids);
}

export function aplicarLocalEscrita(dbRef, item, nome, rel, { substituir = false } = {}) {
    if (!nome) return;
    const achado = acharLocal(dbRef, nome);
    const atual = item.localEscrita ?? null;
    if (atual != null && achado.id != null && String(atual) === String(achado.id)) {
        rel.jaTinha.locais.push({ nome: nomeCadastradoDoLocal(dbRef, atual), escrita: true });
        return;
    }
    if (atual != null && !substituir) {
        rel.camposSimples.push({
            chave: 'localEscrita',
            rotulo: 'Local de escrita',
            de: nomeCadastradoDoLocal(dbRef, atual),
            para: achado.nova ? achado.nome : nomeCadastradoDoLocal(dbRef, achado.id),
            acao: 'mantido',
        });
        return;
    }
    const id = achado.id ?? garantirLocalPorNome(dbRef, nome);
    if (id == null) return;
    const nomeFinal = nomeCadastradoDoLocal(dbRef, id) || achado.nome;
    item.localEscrita = id;
    rel.camposSimples.push({
        chave: 'localEscrita',
        rotulo: 'Local de escrita',
        de: atual != null ? nomeCadastradoDoLocal(dbRef, atual) : '',
        para: nomeFinal,
        acao: atual != null ? 'substituido' : 'preenchido',
        nova: achado.nova,
    });
}

function ordemDosPapeis(papeis) {
    return [...papeis].sort((a, b) => PAPEIS_PESSOA.indexOf(a) - PAPEIS_PESSOA.indexOf(b));
}

export function aplicarPessoas(dbRef, item, pessoas, rel) {
    if (!pessoas.length) return;
    if (!Array.isArray(dbRef.pessoas)) dbRef.pessoas = [];
    if (!Array.isArray(item.pessoas)) item.pessoas = [];
    pessoas.forEach(({ nome, papeis }) => {
        const chave = chaveTema(nome);
        let cadastro = dbRef.pessoas.find((p) => chaveTema(p.nome) === chave);
        let nova = false;
        if (!cadastro) {
            cadastro = {
                id: gerarId(),
                nome,
                grupoIds: [],
                autorIds: [],
                genero: '',
                identidadeCisTrans: '',
                corRaca: '',
                oculto: false,
            };
            dbRef.pessoas.push(cadastro);
            nova = true;
        }
        const vinculo = item.pessoas.find((v) => String(v.pessoaId) === String(cadastro.id));
        if (!vinculo) {
            item.pessoas.push({ pessoaId: cadastro.id, papeis: ordemDosPapeis(papeis) });
            rel.adicionados.pessoas.push({
                nome: cadastro.nome,
                papeis: ordemDosPapeis(papeis),
                nova,
            });
            return;
        }
        const atuais = Array.isArray(vinculo.papeis) ? vinculo.papeis : [];
        const faltam = papeis.filter((p) => !atuais.includes(p));
        if (!faltam.length) {
            rel.jaTinha.pessoas.push({ nome: cadastro.nome });
            return;
        }
        vinculo.papeis = ordemDosPapeis([...atuais, ...faltam]);
        rel.papeisPessoa.push({ nome: cadastro.nome, papeis: ordemDosPapeis(faltam) });
    });
}

export function aplicarCamposSimples(item, simples, rel, { substituir = false } = {}) {
    simples.forEach(({ chave, valor }) => {
        const campo = obterCampoPreenchivel(chave);
        if (!campo) return;
        const atual = campo.ler(item);
        const vazio = campo.tipo === 'booleano' ? !atual : !String(atual ?? '').trim();
        const base = { chave, rotulo: campo.rotulo };
        if (vazio) {
            campo.gravar(item, valor);
            rel.camposSimples.push({ ...base, de: '', para: valor, acao: 'preenchido' });
        } else if (campo.tipo === 'booleano' || String(atual).trim() === String(valor)) {
            rel.camposSimples.push({ ...base, de: atual, para: valor, acao: 'igual' });
        } else if (substituir) {
            campo.gravar(item, valor);
            rel.camposSimples.push({ ...base, de: atual, para: valor, acao: 'substituido' });
        } else {
            rel.camposSimples.push({ ...base, de: atual, para: valor, acao: 'mantido' });
        }
    });
}
