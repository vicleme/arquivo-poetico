#!/usr/bin/env node
// ============================================================
// montar-pacote.js — Acervo Poético
//
// O que faz:
//   Converte um texto de obra em domínio público (Markdown simples)
//   num pacote da Biblioteca (biblioteca/<id>.json) e regenera o
//   catálogo biblioteca/indice.json. Roda no seu computador, uma vez
//   por pacote — o app só lê os JSONs prontos.
//
// Entrada (dois arquivos com o mesmo nome-base). O texto vem de UM dos
// dois formatos abaixo; o `.meta.json` é sempre obrigatório:
//   <base>.md         cada texto começa com uma linha "# Título";
//                     tudo até o próximo "# " é o corpo (linhas em
//                     branco entre estrofes são preservadas).
//   <base>.json       o JSON de "Exportar seleção" do app (também serve
//                     o da Exportação Seletiva e o "tudo flat"). Use este
//                     quando os textos já estão no acervo revisados: a
//                     Fonte/Edição/Link/conferido de cada texto vem junto,
//                     sem redigitar. Só título, texto, tipo, idioma e
//                     fonteTexto atravessam — notas, pessoas, livros,
//                     envios e afins ficam de fora do pacote.
//   <base>.meta.json  { id, titulo, descricao, autor: { nome,
//                     nacionalidade, nascimento, obito }, fonte,
//                     edicao, link, ortografia, conferido, textos? }
//                     `textos` (opcional) sobrescreve fonte/edicao/link/
//                     conferido de um texto pelo título, pra quando cada
//                     texto tem seu próprio link:
//                     { "Versos Íntimos": { "link": "https://..." } }
//                     nascimento/obito são { dia?, mes?, ano } (datas
//                     parciais, mesmo padrão do cadastro de Autor).
//                     Além disso:
//                     - meta.tipo ('poema'|'prosa', padrão poema) vale
//                       pro pacote todo; textos[título].tipo sobrescreve
//                       (pacote misto, ex.: Machado de Assis).
//                     - autor.sexo, autor.corRaca (listas fechadas de
//                       utils.js) e autor.nomesLiterarios
//                       [{ nome, tipo: Heterônimo|Pseudônimo }] —
//                       vazio = não documentado, nada é deduzido.
//                     - textos[título].assinatura + .nomeLiterario
//                       (o nome tem de estar em autor.nomesLiterarios
//                       com o mesmo tipo), .grafia, .dataEscrita
//                       { dia?, mes?, ano, exata? } e .dataPublicacao.
//
// Uso:
//   node scripts/montar-pacote.js biblioteca/fontes/augusto-dos-anjos
//   (o nome-base acha o .md ou o .json sozinho; se existirem os dois,
//   passe o arquivo com a extensão: .../cruz-e-sousa.json)
//
// A proveniência (fonte, edição, link, se foi conferido) vai no campo
// `fonteTexto` de cada texto. A situação de domínio público NÃO é
// gravada: o app a deriva do óbito do Autor (ver linhasFonteTexto em
// js/utils.js).
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import {
    separarTextos,
    montarItem,
    montarPacote,
    montarPacoteDeSelecao,
} from '../js/pacote-texto.js';

const PASTA_BIBLIOTECA = 'biblioteca';

// O parser e o montador moram em js/pacote-texto.js (compartilhados com a aba
// Biblioteca); reexportados aqui pra quem já importava deste script.
export { separarTextos, montarItem, montarPacote, montarPacoteDeSelecao };

export function montarIndice(pasta = PASTA_BIBLIOTECA) {
    const pacotes = fs
        .readdirSync(pasta)
        .filter((f) => f.endsWith('.json') && f !== 'indice.json')
        .sort()
        .map((arquivo) => {
            const p = JSON.parse(fs.readFileSync(path.join(pasta, arquivo), 'utf-8'));
            return {
                id: p.pacote.id,
                arquivo: arquivo.replace(/\.json$/, ''),
                titulo: p.pacote.titulo,
                autor: p.autores.map((a) => a.nome).join(', '),
                descricao: p.pacote.descricao,
                quantidade: p.itens.length,
                conferido: p.pacote.conferido,
            };
        });
    return { pacotes };
}

// Descobre de qual arquivo vem o texto. Aceita o nome-base (acha sozinho) ou
// o caminho com extensão (decide por ela). Com os dois arquivos presentes e
// nenhuma extensão informada, recusa em vez de escolher um por conta própria.
export function escolherFonte(alvo, existe = (p) => fs.existsSync(p)) {
    const base = String(alvo)
        .replace(/\.meta\.json$/, '')
        .replace(/\.(md|json)$/, '');
    if (/\.md$/.test(alvo)) return { base, tipo: 'md', caminho: `${base}.md` };
    if (/\.json$/.test(alvo) && !/\.meta\.json$/.test(alvo)) {
        return { base, tipo: 'selecao', caminho: `${base}.json` };
    }

    const temMd = existe(`${base}.md`);
    const temJson = existe(`${base}.json`);
    if (temMd && temJson) {
        throw new Error(`Existem ${base}.md e ${base}.json. Informe a extensão do que usar.`);
    }
    if (temMd) return { base, tipo: 'md', caminho: `${base}.md` };
    if (temJson) return { base, tipo: 'selecao', caminho: `${base}.json` };
    throw new Error(`Não encontrei ${base}.md nem ${base}.json.`);
}

function main() {
    const alvo = process.argv[2];
    if (!alvo) {
        console.error('Uso: node scripts/montar-pacote.js biblioteca/fontes/<nome-base>');
        process.exit(1);
    }
    let fonte, meta, pacote;
    try {
        fonte = escolherFonte(alvo);
        meta = JSON.parse(fs.readFileSync(`${fonte.base}.meta.json`, 'utf-8'));
        const bruto = fs.readFileSync(fonte.caminho, 'utf-8');
        pacote =
            fonte.tipo === 'md'
                ? montarPacote(bruto, meta)
                : montarPacoteDeSelecao(JSON.parse(bruto), meta);
    } catch (e) {
        console.error(e.message);
        process.exit(1);
    }

    fs.mkdirSync(PASTA_BIBLIOTECA, { recursive: true });
    const destino = path.join(PASTA_BIBLIOTECA, `${meta.id}.json`);
    fs.writeFileSync(destino, JSON.stringify(pacote, null, 2) + '\n');
    fs.writeFileSync(
        path.join(PASTA_BIBLIOTECA, 'indice.json'),
        JSON.stringify(montarIndice(), null, 2) + '\n',
    );
    console.log(
        `${destino}: ${pacote.itens.length} texto(s) de ${fonte.caminho}. indice.json atualizado.`,
    );
}

if (import.meta.url === `file://${process.argv[1]}`) main();
