// ============================================================
// mapa-paises.js: lógica pura que liga o texto livre da Origem de uma obra
// ("Grécia", "EUA", "Países Baixos") ao país certo do mapa-múndi
// (`assets/mapa/mapa-mundi.json`, gerado por `scripts/gerar-mapa-mundi.mjs`).
//
// A origem é uma etiqueta digitada, então o que vale é o NOME em português. A
// comparação ignora acento, caixa e pontuação (a mesma regra do resto do app,
// `chaveDeOrigem`): "grecia", "Grécia" e "GRÉCIA" são o mesmo país.
//
// Cada país do mapa tem:
//   codigo    o código do mapa (ISO numérico de 3 dígitos, ou um código próprio)
//   nome      o nome que o app mostra
//   features  os desenhos que ele pinta (quase sempre só o seu; Chipre pinta
//             também o norte, a Somália também a Somalilândia, e assim por diante)
//
// Só entram países de hoje e territórios. Etiquetas que não são lugar no mapa
// ("Roma Antiga", "Celta", "URSS", "Mesopotâmia") não têm país e ficam na lista
// "sem lugar no mapa". "Desconhecida" é tratada à parte (`ehOrigemDesconhecida`).
// ============================================================

import { chaveDeOrigem } from './origem-da-obra.js';

// [código, nome em português]. Em ordem de código.
const NOMES = [
    ['004', 'Afeganistão'],
    ['008', 'Albânia'],
    ['010', 'Antártida'],
    ['012', 'Argélia'],
    ['016', 'Samoa Americana'],
    ['020', 'Andorra'],
    ['024', 'Angola'],
    ['028', 'Antígua e Barbuda'],
    ['031', 'Azerbaijão'],
    ['032', 'Argentina'],
    ['036', 'Austrália'],
    ['040', 'Áustria'],
    ['044', 'Bahamas'],
    ['048', 'Bahrein'],
    ['050', 'Bangladesh'],
    ['051', 'Armênia'],
    ['052', 'Barbados'],
    ['056', 'Bélgica'],
    ['060', 'Bermudas'],
    ['064', 'Butão'],
    ['068', 'Bolívia'],
    ['070', 'Bósnia e Herzegovina'],
    ['072', 'Botsuana'],
    ['076', 'Brasil'],
    ['084', 'Belize'],
    ['086', 'Território Britânico do Oceano Índico'],
    ['090', 'Ilhas Salomão'],
    ['092', 'Ilhas Virgens Britânicas'],
    ['096', 'Brunei'],
    ['100', 'Bulgária'],
    ['104', 'Mianmar'],
    ['108', 'Burundi'],
    ['112', 'Belarus'],
    ['116', 'Camboja'],
    ['120', 'Camarões'],
    ['124', 'Canadá'],
    ['132', 'Cabo Verde'],
    ['136', 'Ilhas Cayman'],
    ['140', 'República Centro-Africana'],
    ['144', 'Sri Lanka'],
    ['148', 'Chade'],
    ['152', 'Chile'],
    ['156', 'China'],
    ['158', 'Taiwan'],
    ['170', 'Colômbia'],
    ['174', 'Comores'],
    ['178', 'Congo'],
    ['180', 'República Democrática do Congo'],
    ['184', 'Ilhas Cook'],
    ['188', 'Costa Rica'],
    ['191', 'Croácia'],
    ['192', 'Cuba'],
    ['196', 'Chipre'],
    ['203', 'Tchéquia'],
    ['204', 'Benin'],
    ['208', 'Dinamarca'],
    ['212', 'Dominica'],
    ['214', 'República Dominicana'],
    ['218', 'Equador'],
    ['222', 'El Salvador'],
    ['226', 'Guiné Equatorial'],
    ['231', 'Etiópia'],
    ['232', 'Eritreia'],
    ['233', 'Estônia'],
    ['234', 'Ilhas Faroé'],
    ['238', 'Ilhas Malvinas'],
    ['239', 'Geórgia do Sul e Sandwich do Sul'],
    ['242', 'Fiji'],
    ['246', 'Finlândia'],
    ['248', 'Ilhas Åland'],
    ['250', 'França'],
    ['258', 'Polinésia Francesa'],
    ['260', 'Terras Austrais e Antárticas Francesas'],
    ['262', 'Djibuti'],
    ['266', 'Gabão'],
    ['268', 'Geórgia'],
    ['270', 'Gâmbia'],
    ['275', 'Palestina'],
    ['276', 'Alemanha'],
    ['288', 'Gana'],
    ['296', 'Kiribati'],
    ['300', 'Grécia'],
    ['304', 'Groenlândia'],
    ['308', 'Granada'],
    ['316', 'Guam'],
    ['320', 'Guatemala'],
    ['324', 'Guiné'],
    ['328', 'Guiana'],
    ['332', 'Haiti'],
    ['334', 'Ilhas Heard e McDonald'],
    ['336', 'Vaticano'],
    ['340', 'Honduras'],
    ['344', 'Hong Kong'],
    ['348', 'Hungria'],
    ['352', 'Islândia'],
    ['356', 'Índia'],
    ['360', 'Indonésia'],
    ['364', 'Irã'],
    ['368', 'Iraque'],
    ['372', 'Irlanda'],
    ['376', 'Israel'],
    ['380', 'Itália'],
    ['384', 'Costa do Marfim'],
    ['388', 'Jamaica'],
    ['392', 'Japão'],
    ['398', 'Cazaquistão'],
    ['400', 'Jordânia'],
    ['404', 'Quênia'],
    ['408', 'Coreia do Norte'],
    ['410', 'Coreia do Sul'],
    ['414', 'Kuwait'],
    ['417', 'Quirguistão'],
    ['418', 'Laos'],
    ['422', 'Líbano'],
    ['426', 'Lesoto'],
    ['428', 'Letônia'],
    ['430', 'Libéria'],
    ['434', 'Líbia'],
    ['438', 'Liechtenstein'],
    ['440', 'Lituânia'],
    ['442', 'Luxemburgo'],
    ['446', 'Macau'],
    ['450', 'Madagascar'],
    ['454', 'Malaui'],
    ['458', 'Malásia'],
    ['462', 'Maldivas'],
    ['466', 'Mali'],
    ['470', 'Malta'],
    ['478', 'Mauritânia'],
    ['480', 'Maurício'],
    ['484', 'México'],
    ['492', 'Mônaco'],
    ['496', 'Mongólia'],
    ['498', 'Moldávia'],
    ['499', 'Montenegro'],
    ['500', 'Montserrat'],
    ['504', 'Marrocos'],
    ['508', 'Moçambique'],
    ['512', 'Omã'],
    ['516', 'Namíbia'],
    ['520', 'Nauru'],
    ['524', 'Nepal'],
    ['528', 'Países Baixos'],
    ['531', 'Curaçao'],
    ['533', 'Aruba'],
    ['534', 'Sint Maarten'],
    ['540', 'Nova Caledônia'],
    ['548', 'Vanuatu'],
    ['554', 'Nova Zelândia'],
    ['558', 'Nicarágua'],
    ['562', 'Níger'],
    ['566', 'Nigéria'],
    ['570', 'Niue'],
    ['574', 'Ilha Norfolk'],
    ['578', 'Noruega'],
    ['580', 'Ilhas Marianas do Norte'],
    ['583', 'Micronésia'],
    ['584', 'Ilhas Marshall'],
    ['585', 'Palau'],
    ['586', 'Paquistão'],
    ['591', 'Panamá'],
    ['598', 'Papua-Nova Guiné'],
    ['600', 'Paraguai'],
    ['604', 'Peru'],
    ['608', 'Filipinas'],
    ['612', 'Ilhas Pitcairn'],
    ['616', 'Polônia'],
    ['620', 'Portugal'],
    ['624', 'Guiné-Bissau'],
    ['626', 'Timor-Leste'],
    ['630', 'Porto Rico'],
    ['634', 'Catar'],
    ['642', 'Romênia'],
    ['643', 'Rússia'],
    ['646', 'Ruanda'],
    ['652', 'São Bartolomeu'],
    ['654', 'Santa Helena'],
    ['659', 'São Cristóvão e Nevis'],
    ['660', 'Anguila'],
    ['662', 'Santa Lúcia'],
    ['663', 'São Martinho'],
    ['666', 'São Pedro e Miquelon'],
    ['670', 'São Vicente e Granadinas'],
    ['674', 'San Marino'],
    ['678', 'São Tomé e Príncipe'],
    ['682', 'Arábia Saudita'],
    ['686', 'Senegal'],
    ['688', 'Sérvia'],
    ['690', 'Seicheles'],
    ['694', 'Serra Leoa'],
    ['702', 'Singapura'],
    ['703', 'Eslováquia'],
    ['704', 'Vietnã'],
    ['705', 'Eslovênia'],
    ['706', 'Somália'],
    ['710', 'África do Sul'],
    ['716', 'Zimbábue'],
    ['724', 'Espanha'],
    ['728', 'Sudão do Sul'],
    ['729', 'Sudão'],
    ['732', 'Saara Ocidental'],
    ['740', 'Suriname'],
    ['748', 'Essuatíni'],
    ['752', 'Suécia'],
    ['756', 'Suíça'],
    ['760', 'Síria'],
    ['762', 'Tajiquistão'],
    ['764', 'Tailândia'],
    ['768', 'Togo'],
    ['776', 'Tonga'],
    ['780', 'Trinidad e Tobago'],
    ['784', 'Emirados Árabes Unidos'],
    ['788', 'Tunísia'],
    ['792', 'Turquia'],
    ['795', 'Turcomenistão'],
    ['796', 'Ilhas Turks e Caicos'],
    ['800', 'Uganda'],
    ['804', 'Ucrânia'],
    ['807', 'Macedônia do Norte'],
    ['818', 'Egito'],
    ['826', 'Reino Unido'],
    ['831', 'Guernsey'],
    ['832', 'Jersey'],
    ['833', 'Ilha de Man'],
    ['834', 'Tanzânia'],
    ['840', 'Estados Unidos'],
    ['850', 'Ilhas Virgens Americanas'],
    ['854', 'Burkina Faso'],
    ['858', 'Uruguai'],
    ['860', 'Uzbequistão'],
    ['862', 'Venezuela'],
    ['876', 'Wallis e Futuna'],
    ['882', 'Samoa'],
    ['887', 'Iêmen'],
    ['894', 'Zâmbia'],
    // Sem código ISO numérico na fonte do mapa (ver CODIGOS_PROPRIOS no gerador).
    ['NCY', 'Chipre do Norte'],
    ['SOL', 'Somalilândia'],
    ['XKX', 'Kosovo'],
];

// Outros nomes que o mesmo país recebe. Vale o que se costuma digitar: o nome
// antigo, o curto, a sigla, e as partes de um país que o mapa não separa
// (Inglaterra e Escócia pintam o Reino Unido).
const APELIDOS = {
    104: ['Birmânia', 'Myanmar'],
    112: ['Bielorrússia'],
    140: ['Rep. Centro-Africana'],
    158: ['República da China'],
    156: ['República Popular da China'],
    178: ['República do Congo', 'Congo-Brazzaville'],
    180: ['RD Congo', 'RDC', 'Congo-Kinshasa'],
    203: ['República Tcheca', 'Chéquia'],
    238: ['Falkland', 'Ilhas Falkland'],
    275: ['Estado da Palestina', 'Territórios Palestinos'],
    '096': ['Brunei Darussalam'],
    304: ['Gronelândia'],
    364: ['República Islâmica do Irã'],
    372: ['República da Irlanda'],
    384: ["Côte d'Ivoire"],
    408: ['República Popular Democrática da Coreia'],
    410: ['República da Coreia'],
    418: ['República Democrática Popular do Laos'],
    498: ['Moldova'],
    528: ['Holanda'],
    598: ['Papua Nova Guiné'],
    643: ['Federação Russa'],
    704: ['Viet Nam'],
    732: ['Sara Ocidental'],
    748: ['Suazilândia', 'Eswatini'],
    792: ['Türkiye'],
    807: ['Macedônia', 'República da Macedônia'],
    826: [
        'Inglaterra',
        'Escócia',
        'País de Gales',
        'Gales',
        'Irlanda do Norte',
        'Grã-Bretanha',
        'Reino Unido da Grã-Bretanha e Irlanda do Norte',
        'UK',
    ],
    840: ['EUA', 'Estados Unidos da América', 'USA'],
    '070': ['Bósnia'],
    659: ['São Cristóvão e Névis'],
    663: ['Saint Martin'],
    534: ['São Martinho (Países Baixos)'],
};

// Países que pintam mais de um desenho do mapa, além do seu próprio.
const DESENHOS_EXTRAS = {
    196: ['NCY'], // Chipre: a parte norte
    706: ['SOL'], // Somália: a Somalilândia
};

// Desenhos do mapa que não têm nome próprio nem etiqueta que os alcance: ficam
// no mapa, cinza, e nada os pinta.
export const DESENHOS_SEM_NOME = ['IOT', 'SIA'];

// Etiquetas que dizem "não se sabe de onde vem" (ex.: ditados populares). Não
// são país nem "sem lugar no mapa": contam à parte.
const ETIQUETAS_DESCONHECIDA = ['desconhecida', 'desconhecido', 'origem desconhecida'];

// Os nomes que o app não mostra no mapa de calor (a Antártida não está no mapa).
const SEM_DESENHO = new Set(['010']);

export const PAISES = NOMES.filter(([codigo]) => !SEM_DESENHO.has(codigo)).map(
    ([codigo, nome]) => ({
        codigo,
        nome,
        apelidos: APELIDOS[codigo] ? [...APELIDOS[codigo]] : [],
        desenhos: [codigo, ...(DESENHOS_EXTRAS[codigo] || [])],
    }),
);

// A chave (sem acento nem caixa) de cada nome e apelido, para o país certo.
const PORTA_DE_ENTRADA = new Map();
PAISES.forEach((pais) => {
    [pais.nome, ...pais.apelidos].forEach((nome) => {
        const chave = chaveDeOrigem(nome);
        if (PORTA_DE_ENTRADA.has(chave) && PORTA_DE_ENTRADA.get(chave) !== pais.codigo) {
            throw new Error(`Nome repetido em dois países do mapa: ${nome}`);
        }
        PORTA_DE_ENTRADA.set(chave, pais.codigo);
    });
});

const POR_CODIGO = new Map(PAISES.map((pais) => [pais.codigo, pais]));

// O código do país de uma origem digitada, ou null se ela não é país do mapa.
export function codigoDoPaisDaOrigem(rotulo) {
    return PORTA_DE_ENTRADA.get(chaveDeOrigem(rotulo)) || null;
}

export function paisPorCodigo(codigo) {
    return POR_CODIGO.get(codigo) || null;
}

export function ehOrigemDesconhecida(rotulo) {
    return ETIQUETAS_DESCONHECIDA.includes(chaveDeOrigem(rotulo));
}
