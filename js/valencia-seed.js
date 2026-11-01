// valencia-seed.js: primeira classificação de Valência dos 44 Temas da
// amostra que acompanha a instalação nova (ver semearTemasEAssuntos, db.js).
//
// É uma SUGESTÃO do Claude (30/10/2026), para o Victor revisar na aba Temas
// (filtro de valência). Descreve o afeto do tema, não um juízo moral: luto é
// desagradável sem ser "ruim"; Ambivalente é o que pesa e alivia ao mesmo
// tempo. Casa pelo nome sem diferenciar caixa nem acento (`chaveTema`).
//
// Sem DOM e sem acesso ao `db`: dados puros, para o seed e para o botão
// "Aplicar valências sugeridas" (temas-massa.js) usarem a mesma tabela.

import { chaveTema } from './utils.js';

export const VALENCIA_SEED_TEMAS = {
    // Identidade e Autoconhecimento
    Autorrepresentação: 'neutro',
    'Mudança pessoal': 'ambivalente',
    Pertencimento: 'agradavel',
    'Multiplicidade identitária': 'neutro',
    'Busca pela verdade/autenticidade': 'ambivalente',
    // Vida emocional
    'Resiliência emocional': 'ambivalente',
    'Aceitação da imperfeição': 'agradavel',
    Autoacolhimento: 'agradavel',
    'Esgotamento/burnout': 'desagradavel',
    Escapismo: 'ambivalente',
    'Ruminação mental': 'desagradavel',
    // Relações e vínculos
    'Confiança interpessoal': 'agradavel',
    'Empatia social': 'agradavel',
    'Cuidado interpessoal': 'agradavel',
    Isolamento: 'desagradavel',
    'Paixão/desejo romântico': 'ambivalente',
    'Impermanência amorosa': 'desagradavel',
    // Tempo, memória e perda
    'Luto/Finitude': 'desagradavel',
    Saudade: 'ambivalente',
    Despedida: 'desagradavel',
    Memória: 'ambivalente',
    Efemeridade: 'ambivalente',
    Cotidiano: 'neutro',
    // Sociedade e política
    'Crítica político-social': 'desagradavel',
    'Desigualdade social/Pobreza': 'desagradavel',
    Violência: 'desagradavel',
    Polarização: 'desagradavel',
    'Sistema educacional': 'neutro',
    // Corpo, gênero e sexualidade (e Discriminação)
    Machismo: 'desagradavel',
    'Pressão estética': 'desagradavel',
    'Autonomia corporal': 'agradavel',
    Corporeidade: 'neutro',
    Objetificação: 'desagradavel',
    LGBTfobia: 'desagradavel',
    'Culpabilização da vítima': 'desagradavel',
    // Modernidade, tecnologia e consumo
    'Modernidade líquida': 'neutro',
    Tecnologia: 'neutro',
    'Descartabilidade/Consumismo': 'desagradavel',
    'Crítica ao materialismo': 'desagradavel',
    Infodemia: 'desagradavel',
    // Arte, cultura e escrita
    'Crítica Cultural': 'neutro',
    'Literatura/Escrita terapêutica': 'agradavel',
    'Função social da arte': 'agradavel',
    Contracultura: 'neutro',
};

const PORCHAVE = new Map(
    Object.entries(VALENCIA_SEED_TEMAS).map(([nome, v]) => [chaveTema(nome), v]),
);

// Valência sugerida para o nome de um Tema, ou '' se ele não está na amostra.
export function valenciaSugeridaDoTema(nome) {
    return PORCHAVE.get(chaveTema(nome)) || '';
}
