// autoria-publica.js: a autoria como o LEITOR vê, respeitando "Autor sigiloso"
// (31/10/2026).
//
// Lógica pura (sem DOM e sem `db`). É uma função pública, separada de
// `textoAutoriaDe` (utils.js), que continua com o nome real porque alimenta o
// `.md` e o Ver, que são do autor. Só a página do sorteio usa este módulo (e,
// no futuro, qualquer tela feita para quem lê).
//
// Regra, por Autor do cadastro (ver `autor-sigiloso.js`). Basta um nível pedir
// sigilo (a caixa "Autor sigiloso" ou a marca "Anonimizar autor" no nome com
// que o texto foi assinado) para o sigilo valer:
//   - sem sigilo: igual ao texto do autor, com o nome real e, para heterônimo
//     ou pseudônimo, a nota "pseudônimo de X";
//   - com sigilo e o texto assinado com nome literário: só o nome literário,
//     sem a nota "pseudônimo de X" (ela revelaria a identidade);
//   - com sigilo e o texto assinado com o nome civil (Ortônimo, ou nome
//     literário vazio ou igual ao civil): o autor some da linha. Só a caixa do
//     Autor chega a este caso, porque a marca do nome só vale para o nome.
// Coautores contam um a um: sobra a linha com os que podem aparecer, e sem
// ninguém sobrando a linha não existe (`null`).
//
// Créditos de obras citadas: o autor da obra é texto livre, sem ligação com o
// cadastro, então a comparação é pelo nome civil do Autor sigiloso, sem acento,
// caixa e pontuação (a mesma chave de `chaveDeAutor`). Acha o nome exato, não
// variações ("Maria R." não é achado).

import { paresAutoria, nomeAutoriaExibido, textoAutoriaDe } from './utils.js';
import { chaveDeAutor } from './autores-da-obra.js';
import { autorEhSigiloso, nomeAnonimiza } from './autor-sigiloso.js';
import { ehAutorEmSigilo } from './autor-em-sigilo.js';

// As chaves dos nomes civis dos Autores sigilosos do cadastro. Com `item` (o
// texto), se ele está com o autor em sigilo, entram também os nomes civis de
// todos os Autores dele: o sigilo do texto vale para os créditos dele.
export function chavesDeAutoresSigilosos(autoresCadastro = [], item = null) {
    const chaves = new Set();
    const lista = Array.isArray(autoresCadastro) ? autoresCadastro : [];
    lista.forEach((a) => {
        if (!autorEhSigiloso(a)) return;
        const chave = chaveDeAutor(a.nome);
        if (chave) chaves.add(chave);
    });
    if (ehAutorEmSigilo(item)) {
        paresAutoria(item, lista).forEach(({ autor }) => {
            const chave = chaveDeAutor(autor.nome);
            if (chave) chaves.add(chave);
        });
    }
    return chaves;
}

// O texto foi assinado com um nome literário (e não com o nome civil)?
function assinadoComNomeLiterario({ autor, assinatura, nomeLiterario }) {
    const nome = nomeAutoriaExibido({ autor, assinatura, nomeLiterario });
    return !!chaveDeAutor(nome) && chaveDeAutor(nome) !== chaveDeAutor(autor.nome);
}

// O nome literário com que o texto foi assinado está marcado "Anonimizar autor"
// no cadastro do Autor? O nome é achado pela mesma chave (sem acento, caixa e
// pontuação); sem nome literário na assinatura, a resposta é não.
export function assinaturaAnonimiza({ autor, assinatura, nomeLiterario }) {
    if (!assinadoComNomeLiterario({ autor, assinatura, nomeLiterario })) return false;
    const chave = chaveDeAutor(nomeLiterario);
    return (autor?.nomesLiterarios ?? []).some(
        (n) => nomeAnonimiza(n) && chaveDeAutor(n?.nome) === chave,
    );
}

// A autoria do texto como o leitor vê: `null` sem ninguém para mostrar.
export function textoAutoriaPublica(item, autoresCadastro = []) {
    const pares = paresAutoria(item, autoresCadastro);
    if (!pares.length) return null;
    // Texto com o autor em sigilo: vale para todos os pares dele.
    const textoEmSigilo = ehAutorEmSigilo(item);
    // Sem sigilo em nenhum par do texto, o resultado é o do autor.
    if (!textoEmSigilo && !pares.some((p) => autorEhSigiloso(p.autor) || assinaturaAnonimiza(p))) {
        return textoAutoriaDe(item, autoresCadastro);
    }
    const partes = [];
    pares.forEach((par) => {
        const { autor, papel, assinatura, nomeLiterario } = par;
        const nome = nomeAutoriaExibido({ autor, assinatura, nomeLiterario });
        if (!textoEmSigilo && !autorEhSigiloso(autor) && !assinaturaAnonimiza(par)) {
            const nota =
                assinatura && assinatura !== 'Ortônimo' && nomeLiterario
                    ? `, ${assinatura.toLowerCase()} de ${autor.nome}`
                    : '';
            partes.push(`${nome} (${papel}${nota})`);
            return;
        }
        // Com sigilo: só entra se o texto foi assinado com nome literário.
        if (assinadoComNomeLiterario(par)) partes.push(`${nome} (${papel})`);
    });
    return partes.length ? partes.join(', ') : null;
}

// O que o modal mostra ao vivo: "No sorteio: ...". `aplica` é falso quando
// nenhum nível de sigilo muda a linha (nada a mostrar); `texto` é a autoria
// pública ou, sem ninguém para mostrar, "sem linha de Autoria".
export function linhaSigiloDoTexto(item, autoresCadastro = []) {
    const aberto = textoAutoriaDe(item, autoresCadastro);
    if (aberto === null) return { aplica: false, texto: '' };
    const publico = textoAutoriaPublica(item, autoresCadastro);
    return {
        aplica: publico !== aberto,
        texto: `No sorteio: ${publico ?? 'sem linha de Autoria'}`,
    };
}

// Tira de uma lista de autores de crédito (texto livre) os que são o nome civil
// de um Autor sigiloso. `nomesOcultos` é o conjunto de `chavesDeAutoresSigilosos`.
export function autoresSemSigilosos(nomes, nomesOcultos) {
    const lista = Array.isArray(nomes) ? nomes : [];
    if (!nomesOcultos || nomesOcultos.size === 0) return lista;
    return lista.filter((nome) => !nomesOcultos.has(chaveDeAutor(nome)));
}
