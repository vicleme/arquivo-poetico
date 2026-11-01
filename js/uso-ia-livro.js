// ============================================================
// uso-ia-livro.js: uso de IA no Livro e na Coletânea (Fase 19,
// etapa 5). Só lógica pura, sem DOM e sem `db.js`: os dados vêm
// por parâmetro (`dbRef`), como em `autoria-livro.js`.
//
//   livro.usoIa = {
//     estado: 'usou',                 // 'nao-usou' | 'usou'
//     usos: [{
//       onde: 'Capa',                 // texto livre, com sugestões
//       ferramenta: 'Midjourney',     // texto livre, com sugestões
//       modelo: 'v6',                 // opcional, a "raiz"
//       descricao: '...',             // opcional
//       data: { mes: 3, ano: 2025 },  // opcional, data parcial
//       texto: { tipo: 'poema', id: 12 }, // opcional (F19-D12)
//       como: 'Gerou do zero',        // opcional, lista fechada
//     }],
//     nota: '...',                    // nota geral, opcional
//   }
//
// Sem a chave `usoIa`, vale "Não informado": livro antigo nunca
// afirma "não usou" sem alguém ter dito. O estado "Não informado"
// é o padrão; a chave só existe quando há estado, uso ou nota (uma nota
// geral vale mesmo sem estado).
// ============================================================

export const ESTADOS_USO_IA = [
    { valor: '', rotulo: 'Não informado' },
    { valor: 'nao-usou', rotulo: 'Não usou' },
    { valor: 'usou', rotulo: 'Usou' },
];

export const ONDE_USO_IA_SUGERIDOS = [
    'Capa',
    'Ilustração',
    'Texto',
    'Revisão',
    'Tradução',
    'Diagramação',
    'Outro',
];

export const COMO_USO_IA = [
    'Gerou do zero',
    'Gerou quase pronto',
    'Gerou uma base',
    'Editou ou refinou algo meu',
    'Sugeriu ideias',
    'Corrigiu ou revisou',
    'Traduziu',
];

export const FERRAMENTAS_USO_IA_SUGERIDAS = [
    'ChatGPT',
    'Gemini',
    'Claude',
    'Copilot',
    'Midjourney',
    'DALL·E',
    'Adobe Firefly',
    'Canva',
    'ComfyUI',
    'Ollama',
];

const TIPOS_TEXTO = ['poema', 'prosa'];

const texto = (v) =>
    String(v ?? '')
        .replace(/\s+/g, ' ')
        .trim();
const inteiro = (v, min, max) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= min && n <= max ? n : null;
};

export function chaveUso(valor) {
    return texto(valor)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

const COMO_POR_CHAVE = new Map(COMO_USO_IA.map((c) => [chaveUso(c), c]));

// Estado da lista fechada, ou '' (Não informado) para qualquer outra coisa.
export function normalizarEstado(valor) {
    const v = String(valor ?? '').trim();
    return v === 'usou' || v === 'nao-usou' ? v : '';
}

// "Como foi usada": grafia da lista fechada, ou '' se for outra coisa.
export function normalizarComo(valor) {
    return COMO_POR_CHAVE.get(chaveUso(valor)) || '';
}

// Data parcial `{ dia?, mes?, ano? }` só com o que for válido; dia sem mês
// é descartado. `null` quando não sobra nada.
export function normalizarDataUso(d) {
    if (!d || typeof d !== 'object') return null;
    const ano = inteiro(d.ano, 1, 2100);
    const mes = ano === null ? null : inteiro(d.mes, 1, 12);
    const dia = mes === null ? null : inteiro(d.dia, 1, 31);
    if (ano === null) return null;
    const saida = { ano };
    if (mes !== null) saida.mes = mes;
    if (dia !== null) saida.dia = dia;
    return saida;
}

// Vínculo com um texto do acervo: `{ tipo: 'poema'|'prosa', id }` ou `null`.
export function normalizarTextoRef(ref) {
    if (!ref || typeof ref !== 'object') return null;
    const tipo = String(ref.tipo ?? '').toLowerCase();
    if (!TIPOS_TEXTO.includes(tipo)) return null;
    if (ref.id === undefined || ref.id === null || ref.id === '') return null;
    return { tipo, id: ref.id };
}

// Um uso limpo. Só grava a chave quando há valor, para o dado não crescer
// com vazios. `null` se o uso não tem nada.
export function normalizarUso(uso) {
    if (!uso || typeof uso !== 'object') return null;
    const saida = {};
    const onde = texto(uso.onde);
    const ferramenta = texto(uso.ferramenta);
    const modelo = texto(uso.modelo);
    const descricao = String(uso.descricao ?? '').trim();
    const data = normalizarDataUso(uso.data);
    const ref = normalizarTextoRef(uso.texto);
    const como = normalizarComo(uso.como);
    if (onde) saida.onde = onde;
    if (ferramenta) saida.ferramenta = ferramenta;
    if (modelo) saida.modelo = modelo;
    if (descricao) saida.descricao = descricao;
    if (data) saida.data = data;
    if (ref) saida.texto = ref;
    if (como) saida.como = como;
    return Object.keys(saida).length ? saida : null;
}

// Uso de IA limpo: `{ estado, usos, nota }` ou `null` quando não há nada.
// Os usos só valem com estado "usou": ao trocar para "não usou" ou "não
// informado" eles saem, como os itens do Sumário ao trocar de tipo.
export function normalizarUsoIa(usoIa) {
    if (!usoIa || typeof usoIa !== 'object') return null;
    const estado = normalizarEstado(usoIa.estado);
    const nota = String(usoIa.nota ?? '').trim();
    const usos =
        estado === 'usou'
            ? (Array.isArray(usoIa.usos) ? usoIa.usos : []).map(normalizarUso).filter(Boolean)
            : [];
    if (!estado && !nota) return null;
    const saida = { estado };
    if (usos.length) saida.usos = usos;
    if (nota) saida.nota = nota;
    return saida;
}

// O uso de IA de um livro em qualquer estado do dado. Sem registro, devolve
// o estado "Não informado".
export function usoIaDoLivro(livro) {
    return normalizarUsoIa(livro?.usoIa) || { estado: '' };
}

// Campos para gravar no livro (mesmo padrão de `camposAutoriaLivro`).
export function camposUsoIa(usoIa) {
    const limpo = normalizarUsoIa(usoIa);
    return limpo ? { usoIa: limpo } : {};
}

// Pendências do formulário: cada uso precisa dizer "onde". Devolve
// `{ semOnde: [índice...] }`, vazio quando está tudo certo.
export function pendenciasDoUsoIa(usoIa) {
    const semOnde = [];
    if (normalizarEstado(usoIa?.estado) === 'usou') {
        (Array.isArray(usoIa.usos) ? usoIa.usos : []).forEach((u, i) => {
            if (normalizarUso(u) && !texto(u.onde)) semOnde.push(i);
        });
    }
    return { semOnde };
}

// ---------- Sugestões ----------

function sugestoesDe(livros, campo, fixas = []) {
    const vistos = new Map(fixas.map((f) => [chaveUso(f), f]));
    (livros || []).forEach((l) =>
        (usoIaDoLivro(l).usos || []).forEach((u) => {
            const v = u[campo];
            if (v && !vistos.has(chaveUso(v))) vistos.set(chaveUso(v), v);
        }),
    );
    return Array.from(vistos.values());
}

// Ferramentas já usadas em algum livro mais as de fábrica, sem repetir.
export const ferramentasUsadas = (livros) =>
    sugestoesDe(livros, 'ferramenta', FERRAMENTAS_USO_IA_SUGERIDAS);
// "Onde" já digitado mais as sugestões de fábrica.
export const ondeUsados = (livros) => sugestoesDe(livros, 'onde', ONDE_USO_IA_SUGERIDOS);
// Modelos já digitados (sem lista de fábrica: mudam rápido).
export const modelosUsados = (livros) => sugestoesDe(livros, 'modelo');

// ---------- Leitura ----------

export function rotuloEstado(estado) {
    return ESTADOS_USO_IA.find((e) => e.valor === normalizarEstado(estado)).rotulo;
}

// Nome do texto ligado a um uso, ou `null` se o vínculo não existe mais.
export function tituloDoTextoDoUso(uso, dbRef) {
    const ref = normalizarTextoRef(uso?.texto);
    if (!ref) return null;
    const lista = ref.tipo === 'poema' ? dbRef?.poemas : dbRef?.prosas;
    const achado = (lista || []).find((t) => String(t.id) === String(ref.id));
    return achado ? achado.titulo || '(sem título)' : null;
}

function dataCurta(d) {
    if (!d) return '';
    const mm = d.mes ? String(d.mes).padStart(2, '0') : '';
    const dd = d.dia ? String(d.dia).padStart(2, '0') : '';
    return [dd, mm, d.ano].filter(Boolean).join('/');
}

// Uma linha por uso: "Capa: Midjourney v6, 03/2025 (Gerou do zero)".
export function textoDoUso(uso) {
    const u = normalizarUso(uso) || {};
    const quem = [u.ferramenta, u.modelo].filter(Boolean).join(' ');
    const base = [u.onde, quem].filter(Boolean).join(': ');
    const data = dataCurta(u.data);
    return [base, data].filter(Boolean).join(', ') + (u.como ? ` (${u.como})` : '');
}

// Resumo do livro para busca, `.md` e `.csv`.
export function textoUsoIa(livro) {
    const uso = usoIaDoLivro(livro);
    if (!uso.estado) return '';
    if (uso.estado === 'nao-usou') return 'Não usou';
    const linhas = (uso.usos || []).map(textoDoUso).filter(Boolean);
    return linhas.length ? `Usou: ${linhas.join('; ')}` : 'Usou';
}

// ---------- Filtro ----------

// Filtro "usou IA": 'usou', 'nao-usou' ou 'nao-informado'.
export function livroCombinaComUsoIa(livro, filtro) {
    if (!filtro) return true;
    const estado = usoIaDoLivro(livro).estado || 'nao-informado';
    return estado === filtro;
}

export function filtrarLivrosPorUsoIa(livros, filtro) {
    return (livros || []).filter((l) => livroCombinaComUsoIa(l, filtro));
}

// ---------- Exclusão de texto (F19-D12) ----------
// O uso fica; só o vínculo some, com aviso e Desfazer.

function percorrerUsosComTexto(dbRef, tipo, id, fn) {
    (dbRef.livros || []).forEach((livro) => {
        (livro.usoIa?.usos || []).forEach((uso, indice) => {
            const ref = uso.texto;
            if (ref && ref.tipo === tipo && String(ref.id) === String(id)) fn(livro, uso, indice);
        });
    });
}

export function impactoExclusaoTextoNosUsosIa(dbRef, tipo, id) {
    const livrosIds = new Set();
    let usos = 0;
    percorrerUsosComTexto(dbRef, tipo, id, (livro) => {
        livrosIds.add(livro.id);
        usos += 1;
    });
    return { livrosIds: Array.from(livrosIds), usos };
}

// Tira o vínculo e devolve `[{ livroId, indice, texto }]` para o Desfazer.
export function removerTextoDosUsosIa(dbRef, tipo, id) {
    const removidos = [];
    percorrerUsosComTexto(dbRef, tipo, id, (livro, uso, indice) => {
        removidos.push({ livroId: livro.id, indice, texto: uso.texto });
        delete uso.texto;
    });
    return removidos;
}

export function restaurarTextoNosUsosIa(dbRef, removidos) {
    (removidos || []).forEach(({ livroId, indice, texto: ref }) => {
        const livro = (dbRef.livros || []).find((l) => String(l.id) === String(livroId));
        const uso = livro?.usoIa?.usos?.[indice];
        if (uso && !uso.texto) uso.texto = ref;
    });
}

// ---------- Saída ----------

// Uso de IA para arquivo: o texto ligado sai pelo título (o id não vale fora
// do acervo). Vínculo cujo texto não existe mais sai sem o título.
export function usoIaParaExportar(livro, dbRef) {
    const uso = usoIaDoLivro(livro);
    // Nota geral vale mesmo sem estado (escolha (a) da entrega 1): sai sozinha.
    if (!uso.estado && !uso.nota) return null;
    const saida = uso.estado ? { estado: uso.estado } : {};
    if (uso.usos) {
        saida.usos = uso.usos.map((u) => {
            const { texto: ref, ...resto } = u;
            const titulo = tituloDoTextoDoUso(u, dbRef);
            // A data é copiada para a saída nunca dividir objeto com o acervo.
            const copia = resto.data ? { ...resto, data: { ...resto.data } } : resto;
            return ref && titulo ? { ...copia, texto: { tipo: ref.tipo, titulo } } : copia;
        });
    }
    if (uso.nota) saida.nota = uso.nota;
    return saida;
}
