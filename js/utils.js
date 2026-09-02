// ============================================================
// utils.js — Funções puras sem dependências internas
// Importado por: db.js, render.js, forms.js
// ============================================================

// ─── Geração de ID único ────────────────────────────────────────
// Antes, cada módulo gerava IDs com `Date.now()` de forma independente.
// Como Date.now() só tem resolução de 1ms, dois itens criados no mesmo
// milissegundo (ex.: duplo clique, criação em lote) recebiam o MESMO id,
// colidindo silenciosamente. gerarId() mantém IDs numéricos (pra não
// quebrar comparações existentes como `a.id - b.id` nas ordenações de
// db.js), mas garante que cada chamada retorna um valor estritamente
// maior que o anterior, mesmo em rajada.
let _ultimoIdEmitido = 0;

export function gerarId() {
    const agora = Date.now();
    _ultimoIdEmitido = agora > _ultimoIdEmitido ? agora : _ultimoIdEmitido + 1;
    return _ultimoIdEmitido;
}

// ─── Escaping de HTML ───────────────────────────────────────────
// Usado por render.js em todo campo de texto livre (título, notas,
// tags, pessoas...) antes de injetar via innerHTML/template string.
// NÃO deve ser usado no campo `texto` de Poema/Prosa/Elemento — esse
// campo guarda HTML de propósito (o editor de formatação em editor.js
// insere <div style="..."> pra negrito/itálico/cor), então escapá-lo
// quebraria a formatação do texto.
export function escapeHtml(valor) {
    if (valor === null || valor === undefined) return '';
    return String(valor)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

// ─── Sanitização do campo `texto` (HTML cru intencional) ────────
// O campo `texto` de Poema/Prosa/Elemento guarda HTML de propósito
// (ver comentário de escapeHtml acima) — mas "guardar HTML cru" não
// pode significar "confiar cegamente no HTML cru", principalmente
// porque esse campo entra no app por importarJSON() sem qualquer
// validação (ver db.js → importarDB). Um backup .json editado à mão,
// corrompido ou vindo de outra máquina pode trazer um <script> ou
// onerror= disfarçado de formatação.
//
// sanitizarTextoRico() roda esse HTML por uma allowlist (DOMPurify).
// A allowlist NÃO é só o que applyStyle() (editor.js) gera hoje — foi
// conferida contra o acervo real de poemas/prosas (anos de HTML colado
// de fontes diversas: Word, versões antigas do editor etc.), então
// cobre também <p>, <span> soltos e propriedades como line-height,
// page-break-after, background-color, padding, border-radius,
// max-width, white-space, font-weight, que aparecem no acervo mas que
// o editor atual não gera sozinho.
//
// IMPORTANTE: essa função só deve ser chamada no momento de
// RENDERIZAR (innerHTML), nunca ao importar/salvar. Ver nota extensa
// sobre "HTML malformado" logo abaixo — sanitizar e sobrescrever o
// dado salvo pode apagar conteúdo legítimo silenciosamente.
//
// Depende do DOMPurify vendorizado em assets/js/purify.min.js
// (carregado antes de js/main.js no index.html).
const ALLOWLIST_TEXTO_RICO = {
    ALLOWED_TAGS: ['div', 'span', 'p', 'br', 'b', 'i', 'u'],
    ALLOWED_ATTR: ['style'],
    ALLOWED_STYLES: [
        'color',
        'font-family',
        'font-size',
        'text-align',
        'display',
        'page-break-after',
        'background-color',
        'padding',
        'border-radius',
        'line-height',
        'max-width',
        'white-space',
        'font-weight',
    ],
};
// Nenhuma dessas propriedades aceita url()/expression() de verdade
// (background-color só aceita cor, não é o mesmo que `background`),
// mas barramos mesmo assim por segurança extra.
const VALOR_DE_ESTILO_PERIGOSO = /url\s*\(|expression\s*\(|javascript:/i;

export function sanitizarTextoRico(valor) {
    if (valor === null || valor === undefined) return '';
    const bruto = String(valor);

    // Nada de "<" no texto — não há o que sanitizar, e evita qualquer
    // efeito colateral de passar texto puro por um parser de HTML.
    if (!bruto.includes('<')) return bruto;

    if (typeof window === 'undefined' || !window.DOMPurify) {
        // DOMPurify não carregou (ex.: script bloqueado) — melhor
        // perder a formatação do que arriscar HTML não filtrado.
        console.warn('DOMPurify indisponível — texto exibido sem formatação.');
        return escapeHtml(bruto);
    }

    let limpo = window.DOMPurify.sanitize(bruto, {
        ALLOWED_TAGS: ALLOWLIST_TEXTO_RICO.ALLOWED_TAGS,
        ALLOWED_ATTR: ALLOWLIST_TEXTO_RICO.ALLOWED_ATTR,
    });

    // DOMPurify por padrão permite qualquer propriedade CSS dentro de
    // style="..."; filtramos manualmente pra só sobrar as da allowlist
    // acima (bloqueia coisas como style="background:url(...)").
    limpo = limpo.replace(/style="([^"]*)"/g, (match, decls) => {
        const permitidas = decls
            .split(';')
            .map((d) => d.trim())
            .filter(Boolean)
            .filter((d) => {
                const [propBruta, ...resto] = d.split(':');
                const prop = propBruta?.trim().toLowerCase();
                const valorDecl = resto.join(':').trim();
                if (!ALLOWLIST_TEXTO_RICO.ALLOWED_STYLES.includes(prop)) return false;
                if (VALOR_DE_ESTILO_PERIGOSO.test(valorDecl)) return false;
                return true;
            })
            .join('; ');
        return permitidas ? `style="${permitidas}"` : '';
    });

    // Rede de segurança contra HTML malformado (não malicioso — ex.:
    // uma aspa de style="..." esquecida aberta). Quando isso acontece,
    // o parser de HTML pode interpretar o resto do texto inteiro como
    // "dentro" da tag quebrada e descartar tudo — um poema pode virar
    // string vazia por causa de um erro de digitação de anos atrás,
    // sem nenhum conteúdo malicioso envolvido. Isso já aconteceu com
    // um poema real testado durante o desenvolvimento desta função.
    // Se a sanitização reduziu drasticamente o texto visível, não
    // confiamos no resultado: caímos pra texto puro escapado (sem
    // formatação, mas sem perder o poema).
    const textoPlanoAntes = bruto.replace(/<[^>]*>/g, '').trim();
    const textoPlanoDepois = limpo.replace(/<[^>]*>/g, '').trim();
    if (textoPlanoAntes.length > 20 && textoPlanoDepois.length < textoPlanoAntes.length * 0.5) {
        console.warn(
            'sanitizarTextoRico: HTML possivelmente malformado — formatação removida, texto original preservado como texto puro.',
            bruto.slice(0, 80),
        );
        return escapeHtml(bruto);
    }

    return limpo;
}

// ─── Debounce ────────────────────────────────────────────────
// Atrasa a chamada de fn até `espera` ms depois da última invocação.
// Usado nos campos de busca (Poemas/Prosas): cada renderPoemas()/
// renderProsas() reconstrói a lista inteira via innerHTML, então sem
// isso cada tecla digitada dispara um render completo.
export function debounce(fn, espera = 200) {
    let timer = null;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), espera);
    };
}

export const sortBySeq = (lista) => {
    return [...lista].sort((a, b) => {
        const seqA = parseInt(a.sequencia) || 9999;
        const seqB = parseInt(b.sequencia) || 9999;
        return seqA - seqB || a.id - b.id;
    });
};

export async function toBase64(file) {
    if (!file) return null;
    return new Promise((res) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.readAsDataURL(file);
    });
}

// ─── Reordenação automática (inserir empurra, excluir fecha o buraco) ──

// Reposiciona um item dentro do grupo de irmãos (mesmo nível de
// competição). Se posicaoAntiga for null, trata como inserção nova
// (empurra pra frente quem estiver na posição ou depois). Se houver
// posicaoAntiga, trata como um "mover": desloca só quem estava entre
// a posição antiga e a nova, na direção certa.
// Converte o valor de sequência de um campo de formulário:
// string vazia / NaN / null → null (sem posição definida)
// qualquer inteiro válido → esse inteiro
export function seqOuNull(valor) {
    if (valor === null || valor === undefined || valor === '') return null;
    const n = parseInt(valor);
    return isNaN(n) ? null : n;
}

export function reordenarPosicao(irmaos, itemAtual, posicaoDesejada, posicaoAntiga = null) {
    // Se o item não tem posição definida, não disputa slot com ninguém
    if (posicaoDesejada === null) {
        itemAtual.sequencia = null;
        return;
    }

    const outros = irmaos.filter((it) => it !== itemAtual && it.id != itemAtual.id);

    if (posicaoAntiga === null) {
        // Inserção nova com posição: empurra pra frente quem tiver posição ≥ desejada
        outros.forEach((it) => {
            const seq = it.sequencia;
            if (seq !== null && seq >= posicaoDesejada) it.sequencia = seq + 1;
        });
    } else if (posicaoDesejada > posicaoAntiga) {
        outros.forEach((it) => {
            const seq = it.sequencia;
            if (seq !== null && seq > posicaoAntiga && seq <= posicaoDesejada)
                it.sequencia = seq - 1;
        });
    } else if (posicaoDesejada < posicaoAntiga) {
        outros.forEach((it) => {
            const seq = it.sequencia;
            if (seq !== null && seq >= posicaoDesejada && seq < posicaoAntiga)
                it.sequencia = seq + 1;
        });
    }

    itemAtual.sequencia = posicaoDesejada;
}

// Fecha o buraco deixado por um item removido de uma posição.
// Itens sem posição (null) são ignorados.
export function fecharEspaco(irmaos, posicaoRemovida) {
    if (posicaoRemovida === null) return; // item sem posição não deixa buraco
    irmaos.forEach((it) => {
        if (it.sequencia !== null && it.sequencia > posicaoRemovida)
            it.sequencia = it.sequencia - 1;
    });
}

// Inverso de fecharEspaco — reabre o espaço numa posição, empurrando pra
// frente quem ocupa aquele lugar em diante. Usado só pelo "desfazer" de
// exclusão (ver db.js): depois que fecharEspaco já rodou na hora de
// excluir, isso devolve os irmãos pra posição de antes, liberando o
// número original pro item restaurado.
export function abrirEspaco(irmaos, posicaoAlvo) {
    if (posicaoAlvo === null) return;
    irmaos.forEach((it) => {
        if (it.sequencia !== null && it.sequencia >= posicaoAlvo) it.sequencia = it.sequencia + 1;
    });
}

// ─── Quem compete com quem (irmãos no mesmo "andar" da estrutura) ──
// Um item ligado direto ao Livro (sem Parte) compete com as Partes,
// não tem uma numeração isolada própria — por isso entra no mesmo grupo.

export function getIrmaosTopoLivro(db, livroId) {
    return [
        ...db.partes.filter((p) => p.livroId == livroId),
        ...db.secoes.filter((s) => s.paiTipo === 'livro' && s.paiId == livroId),
        ...db.elementos.filter((e) => e.paiTipo === 'livro' && e.paiId == livroId),
        ...db.poemas.filter((p) => p.paiTipo === 'livro' && p.paiId == livroId),
        ...db.prosas.filter((p) => p.paiTipo === 'livro' && p.paiId == livroId),
    ];
}

export function getIrmaosDentroParte(db, parteId) {
    return [
        ...db.secoes.filter((s) => s.paiTipo === 'parte' && s.paiId == parteId),
        ...db.elementos.filter((e) => e.paiTipo === 'parte' && e.paiId == parteId),
        ...db.poemas.filter((p) => p.paiTipo === 'parte' && p.paiId == parteId),
        ...db.prosas.filter((p) => p.paiTipo === 'parte' && p.paiId == parteId),
    ];
}

export function getIrmaosDentroSecao(db, secaoId) {
    return [
        ...db.elementos.filter((e) => e.paiTipo === 'secao' && e.paiId == secaoId),
        ...db.poemas.filter((p) => p.paiTipo === 'secao' && p.paiId == secaoId),
        ...db.prosas.filter(
            (p) => (p.paiTipo === 'secao' && p.paiId == secaoId) || p.secaoId == secaoId,
        ),
    ];
}

export function getIrmaosPorEscopo(db, paiTipo, paiId) {
    if (paiTipo === 'parte') return getIrmaosDentroParte(db, paiId);
    if (paiTipo === 'secao') return getIrmaosDentroSecao(db, paiId);
    if (paiTipo === 'livro') return getIrmaosTopoLivro(db, paiId);
    return [];
}

// Calcula a posição "comparável" de um Elemento dentro do livro, em até
// 3 níveis: [livroSeq, posiçãoNoNívelDasPartes, posiçãoNoNívelDasSeções].
// Funciona em conjunto com a reordenação automática: como um item ligado
// direto ao Livro/Parte usa sua própria sequência competindo na MESMA
// escala dos irmãos reais (Partes, Seções), essa posição já é coerente.
export function getPosicaoElemento(el, db) {
    let livroSeq = 9999,
        posParte = 9999,
        posSecao = 9999;

    if (el.paiTipo === 'livro') {
        const l = db.livros.find((x) => x.id == el.paiId);
        livroSeq = parseInt(l?.sequencia) || 9999;
        posParte = parseInt(el.sequencia) || 9999;
    } else if (el.paiTipo === 'parte') {
        const p = db.partes.find((x) => x.id == el.paiId);
        if (p) {
            posParte = parseInt(p.sequencia) || 9999;
            const l = db.livros.find((x) => x.id == p.livroId);
            livroSeq = parseInt(l?.sequencia) || 9999;
        }
        posSecao = parseInt(el.sequencia) || 9999;
    } else if (el.paiTipo === 'secao') {
        const s = db.secoes.find((x) => x.id == el.paiId);
        if (s) {
            if (s.paiTipo === 'parte') {
                const p = db.partes.find((x) => x.id == s.paiId);
                if (p) {
                    posParte = parseInt(p.sequencia) || 9999;
                    const l = db.livros.find((x) => x.id == p.livroId);
                    livroSeq = parseInt(l?.sequencia) || 9999;
                }
            } else {
                posParte = parseInt(s.sequencia) || 9999;
                const l = db.livros.find((x) => x.id == s.paiId);
                livroSeq = parseInt(l?.sequencia) || 9999;
            }
            posSecao = parseInt(s.sequencia) || 9999;
        }
    }

    return [livroSeq, posParte, posSecao];
}

// ─── Modal de confirmação genérico ────────────────────────────
// Base de qualquer ação que precise de "tem certeza?" antes de rodar:
// exclusões (abrirModalExclusao abaixo) e ações em massa que afetam
// vários itens de uma vez (ver aplicarPessoaEmMassa etc. em
// render-listas.js). Vive aqui por ser uma utilidade genérica de UI
// sem dependência de estado interno — qualquer módulo pode importar.
//
// `acaoSecundaria` é opcional — usado quando a decisão não é um
// simples sim/não, mas tem uma terceira saída além de "Confirmar" e
// "Cancelar" (ex.: nome duplicado ao editar Pessoa/Época, ver
// initFormPessoa/initFormEpoca em forms.js: "Mesclar agora" vs "Salvar
// mesmo assim" vs "Cancelar"). Fica escondido quando não informado —
// quem já chama abrirModalConfirmacao sem essa opção não muda nada.
//
// Uso:
//   abrirModalConfirmacao({
//       titulo: 'Título do item',
//       rotulo: 'Tipo',
//       mensagem: 'Descrição do que vai acontecer.',
//       textoConfirmar: 'Confirmar',
//       corConfirmar: '#dc2626',
//       acaoSecundaria: { texto: 'Fazer outra coisa', onClick: () => {} },
//       onConfirmar: () => { /* executa a ação */ }
//   });

export function abrirModalConfirmacao({
    titulo,
    rotulo,
    mensagem = 'Você terá alguns segundos pra desfazer depois de confirmar — passado esse tempo, a exclusão é permanente.',
    textoConfirmar = 'Confirmar',
    corConfirmar = '#dc2626',
    acaoSecundaria = null,
    onConfirmar,
}) {
    let overlay = document.getElementById('modal-confirmar-exclusao');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'modal-confirmar-exclusao';
        overlay.style.cssText = `
            position:fixed; inset:0; z-index:10000;
            background:rgba(0,0,0,0.5);
            display:flex; align-items:center; justify-content:center;
            animation:fadeIn .15s ease-out;
        `;

        const caixa = document.createElement('div');
        caixa.style.cssText = `
            background:#fff; border-radius:12px;
            padding:28px 32px; max-width:380px; width:90%;
            box-shadow:0 8px 40px rgba(0,0,0,0.18);
            font-family:sans-serif;
        `;

        caixa.innerHTML = `
            <p style="margin:0 0 6px; font-size:11px; font-weight:700;
                      text-transform:uppercase; letter-spacing:.06em; color:#9ca3af;"
               id="excl-rotulo"></p>
            <h3 style="margin:0 0 20px; font-size:16px; font-weight:700;
                       color:#111827; line-height:1.4; word-break:break-word;"
                id="excl-titulo"></h3>
            <p style="margin:0 0 24px; font-size:13px; color:#6b7280;"
               id="excl-mensagem"></p>
            <div style="display:flex; gap:10px; justify-content:flex-end; flex-wrap:wrap;">
                <button id="excl-cancelar"
                    style="padding:8px 18px; border-radius:8px; border:1px solid #e5e7eb;
                           background:#fff; color:#374151; font-size:13px; font-weight:600;
                           cursor:pointer;">
                    Cancelar
                </button>
                <button id="excl-secundaria"
                    style="display:none; padding:8px 18px; border-radius:8px; border:1px solid #e5e7eb;
                           background:#fff; color:#374151; font-size:13px; font-weight:600;
                           cursor:pointer;">
                </button>
                <button id="excl-confirmar"
                    style="padding:8px 18px; border-radius:8px; border:none;
                           color:#fff; font-size:13px; font-weight:600;
                           cursor:pointer;">
                </button>
            </div>
        `;

        overlay.appendChild(caixa);
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) _fecharModalExclusao();
        });
        document.addEventListener('keydown', _modalExclusaoTeclado);
    }

    document.getElementById('excl-rotulo').textContent = rotulo;
    document.getElementById('excl-titulo').textContent = titulo;
    document.getElementById('excl-mensagem').textContent = mensagem;

    const btnCancelar = document.getElementById('excl-cancelar');
    const btnSecundaria = document.getElementById('excl-secundaria');
    const btnConfirmar = document.getElementById('excl-confirmar');
    btnCancelar.onclick = _fecharModalExclusao;
    btnConfirmar.onclick = () => {
        _fecharModalExclusao();
        onConfirmar();
    };
    btnConfirmar.textContent = textoConfirmar;
    btnConfirmar.style.background = corConfirmar;

    if (acaoSecundaria) {
        btnSecundaria.style.display = '';
        btnSecundaria.textContent = acaoSecundaria.texto;
        btnSecundaria.onclick = () => {
            _fecharModalExclusao();
            acaoSecundaria.onClick();
        };
    } else {
        btnSecundaria.style.display = 'none';
        btnSecundaria.onclick = null;
    }

    overlay.style.display = 'flex';
    setTimeout(() => btnCancelar.focus(), 0);
}

// Atalho pro caso mais comum (exclusão permanente) — mesma assinatura
// de sempre, quem já chama abrirModalExclusao não precisa mudar nada.
export function abrirModalExclusao(titulo, rotulo, onConfirmar) {
    abrirModalConfirmacao({
        titulo,
        rotulo,
        textoConfirmar: 'Excluir',
        corConfirmar: '#dc2626',
        onConfirmar,
    });
}

function _fecharModalExclusao() {
    const overlay = document.getElementById('modal-confirmar-exclusao');
    if (overlay) overlay.style.display = 'none';
}

function _modalExclusaoTeclado(e) {
    const overlay = document.getElementById('modal-confirmar-exclusao');
    if (!overlay || overlay.style.display === 'none') return;
    if (e.key === 'Escape') _fecharModalExclusao();
}

// ─── Rastreador de alterações não salvas ──────────────────────
// Usado pelos modais de edição (Poema, Prosa) pra saber se dá pra
// fechar direto ou se precisa confirmar antes (ver toggleModal em
// modais.js). Marca "sujo" em qualquer 'input'/'change' real dentro
// do formulário. Preencher campos via JS (.value = x, .checked = x,
// opt.selected = x, como fazem editarPoema/editarProsa/prepararNovo)
// NÃO dispara esses eventos — só interação de fato do usuário marca
// sujo, então não é preciso "limpar" manualmente ao abrir o modal.
// Precisa limpar manualmente só depois de um salvamento bem-sucedido
// (o form continua com os mesmos valores que o usuário digitou, então
// nenhum evento novo dispara pra avisar que agora está tudo salvo).
export function criarRastreadorDeAlteracoes() {
    let sujo = false;

    function observar(form) {
        if (!form) return;
        form.addEventListener('input', () => {
            sujo = true;
        });
        form.addEventListener('change', () => {
            sujo = true;
        });
    }

    return {
        observar,
        estaSujo: () => sujo,
        marcarLimpo: () => {
            sujo = false;
        },
    };
}

// ─── Aviso não-bloqueante (toast) ──────────────────────────────
// Substitui os `alert()` nativos espalhados pelo app pra mensagens de
// validação/erro simples ("selecione um vínculo", "nenhum item
// selecionado" etc.) — o alert() nativo trava a página inteira com uma
// caixa cinza do sistema operacional, destoando do resto da UI, que já
// usa modais estilizados (ver abrirModalExclusao acima) pra tudo que é
// realmente bloqueante. Um toast desaparece sozinho e não trava nada.
//
// Uso: mostrarAviso('Selecione um vínculo.') ou
//      mostrarAviso('Backup salvo!', 'sucesso')
// Pra feedback de "salvo" depois de save(), usar avisarSalvo() (abaixo)
// em vez de chamar mostrarAviso() direto — evita empilhar toast repetido.

const _CORES_AVISO = {
    erro: { bg: '#dc2626', texto: '#fff' },
    sucesso: { bg: '#059669', texto: '#fff' },
    info: { bg: '#1f2937', texto: '#fff' },
};

function _containerToasts() {
    let container = document.getElementById('avisos-toast');
    if (!container) {
        container = document.createElement('div');
        container.id = 'avisos-toast';
        container.style.cssText = `
            position:fixed; bottom:20px; right:20px; z-index:10001;
            display:flex; flex-direction:column; gap:8px;
            font-family:sans-serif; pointer-events:none;
        `;
        document.body.appendChild(container);
    }
    return container;
}

// Cria e insere o elemento do toast, com fade-in — sem agendar o
// desaparecimento sozinho, já que mostrarAviso() e avisarSalvo() têm
// necessidades diferentes de temporização (ver cada uma abaixo).
function _criarToastEl(mensagem, tipo) {
    const cor = _CORES_AVISO[tipo] || _CORES_AVISO.erro;
    const toast = document.createElement('div');
    toast.style.cssText = `
        background:${cor.bg}; color:${cor.texto};
        padding:12px 18px; border-radius:8px; font-size:13px; font-weight:500;
        box-shadow:0 4px 20px rgba(0,0,0,0.25); max-width:340px;
        opacity:0; transform:translateY(8px);
        transition:opacity .18s ease-out, transform .18s ease-out;
        pointer-events:auto; cursor:pointer;
    `;
    toast.textContent = mensagem;
    toast.title = 'Clique pra fechar';
    toast.onclick = () => _removerToast(toast);
    _containerToasts().appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    return toast;
}

export function mostrarAviso(mensagem, tipo = 'erro') {
    const toast = _criarToastEl(mensagem, tipo);

    // Erros ficam mais tempo na tela — costumam pedir uma ação da pessoa,
    // sucesso/info são só uma confirmação rápida.
    const duracao = tipo === 'erro' ? 5000 : 3000;
    setTimeout(() => _removerToast(toast), duracao);
}

// Variante de mostrarAviso() com um botão de ação embutido (ex.: "Desfazer"
// depois de excluir um item — ver deleteItem em db.js). Diferente de
// _criarToastEl, o clique no corpo do toast fecha ele normalmente, mas o
// clique no botão dispara aoClicarAcao() antes de fechar. `duracaoMs` é o
// tempo até o toast sumir sozinho (e, por convenção de quem chama, também
// o prazo pra ação ainda poder ser desfeita — ver setTimeout gêmeo em
// db.js que efetiva a exclusão de fato nesse mesmo intervalo).
export function mostrarAvisoComAcao(mensagem, rotuloAcao, aoClicarAcao, duracaoMs = 6000) {
    const cor = _CORES_AVISO.info;
    const toast = document.createElement('div');
    toast.style.cssText = `
        display:flex; align-items:center; gap:14px;
        background:${cor.bg}; color:${cor.texto};
        padding:10px 14px; border-radius:8px; font-size:13px; font-weight:500;
        box-shadow:0 4px 20px rgba(0,0,0,0.25); max-width:340px;
        opacity:0; transform:translateY(8px);
        transition:opacity .18s ease-out, transform .18s ease-out;
        pointer-events:auto; cursor:pointer;
    `;

    const texto = document.createElement('span');
    texto.textContent = mensagem;
    texto.style.flex = '1';
    toast.appendChild(texto);

    const botao = document.createElement('button');
    botao.type = 'button';
    botao.textContent = rotuloAcao;
    botao.style.cssText = `
        background:transparent; border:none; padding:0; margin:0;
        text-decoration:underline; font-weight:700; font-size:13px;
        color:inherit; cursor:pointer; flex-shrink:0;
    `;
    botao.onclick = (e) => {
        e.stopPropagation(); // não deixa o clique "vazar" pro onclick de fechar do toast
        aoClicarAcao();
        _removerToast(toast);
    };
    toast.appendChild(botao);

    toast.title = 'Clique fora do botão pra fechar';
    toast.onclick = () => _removerToast(toast);
    _containerToasts().appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => _removerToast(toast), duracaoMs);
    return toast;
}

// Deixa quem chamou mostrarAvisoComAcao() fechar o toast de fora (ex.: uma
// exclusão pendente que foi confirmada de vez antes do tempo — ver
// _finalizarExclusaoPendente em db.js. Sem isso, o toast antigo continua na
// tela oferecendo um "Desfazer" que na verdade iria desfazer outra coisa).
export function fecharAviso(toast) {
    _removerToast(toast);
}

function _removerToast(toast) {
    if (!toast?.isConnected) return;
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    setTimeout(() => toast.remove(), 180);
}

// ─── Feedback de "salvo" (toast coalescido) ─────────────────────
// save() roda com bastante frequência — em toda ação discreta (editar,
// apagar, reordenar, mover pra cima/baixo, ação em massa...). Um app sem
// backend não tem "sincronizando..." nem confirmação de servidor — esse
// "✓ salvo" é o único sinal de que o dado realmente não se perdeu.
//
// Se cada save() empilhasse um toast novo (mostrarAviso normal), uma
// sequência rápida de ações — tipo mover um item 4 vezes seguidas —
// deixaria uma coluna de "✓ salvo" repetidos entulhando o canto da tela.
// Em vez disso, reaproveita o MESMO toast entre saves próximos e só
// reinicia o timer de sumiço: nunca mais que um "✓ salvo" visível.
let _toastSalvo = null;
let _timeoutToastSalvo = null;

export function avisarSalvo() {
    clearTimeout(_timeoutToastSalvo);

    if (!_toastSalvo?.isConnected) {
        _toastSalvo = _criarToastEl('✓ salvo', 'sucesso');
    }

    _timeoutToastSalvo = setTimeout(() => {
        _removerToast(_toastSalvo);
        _toastSalvo = null;
    }, 1800);
}

// Recebe o array db.livros e retorna todas as "Fases de Vida" já usadas,
// sem repetição e ordenadas — pra alimentar o datalist de sugestões.
export function extrairFasesUnicas(livros) {
    const fases = new Set();
    livros.forEach((l) => {
        if (l.fase && l.fase.trim()) fases.add(l.fase.trim());
    });
    return Array.from(fases).sort();
}

// ─── Datas parciais (Escrita / Primeira Publicação) ────────────
// Flexíveis: cada campo (dia/mes/ano/hora/minuto) é opcional e
// independente — dá pra saber só o ano, só o mês e ano, etc.

export function lerDataParcial(prefixo) {
    const campos = ['dia', 'mes', 'ano', 'hora', 'minuto'];
    const obj = {};
    campos.forEach((c) => {
        const el = document.getElementById(`${prefixo}-${c}`);
        const v = el?.value;
        if (v !== '' && v != null) obj[c] = parseInt(v);
    });
    return Object.keys(obj).length ? obj : null;
}

export function preencherDataParcial(prefixo, dataObj) {
    const campos = ['dia', 'mes', 'ano', 'hora', 'minuto'];
    campos.forEach((c) => {
        const el = document.getElementById(`${prefixo}-${c}`);
        if (el) el.value = dataObj && dataObj[c] != null ? dataObj[c] : '';
    });
}

// Variante não-destrutiva de preencherDataParcial: só entra nos
// subcampos (dia/mês/ano) que estiverem vazios — usada pela sugestão
// automática de Época Retratada (ver aplicarSugestaoEpoca em forms.js),
// pra nunca sobrescrever o que a pessoa já digitou. Mesmo idioma do
// "if (el && !el.value)" já usado em ui.js pra sugerir data de
// publicação a partir do Livro de destino.
export function preencherDataParcialSeVazio(prefixo, dataObj) {
    if (!dataObj) return;
    ['dia', 'mes', 'ano'].forEach((c) => {
        const el = document.getElementById(`${prefixo}-${c}`);
        if (el && !el.value && dataObj[c] != null) el.value = dataObj[c];
    });
}

export function formatarDataParcial(dataObj) {
    if (!dataObj) return '—';
    const { dia, mes, ano, hora, minuto } = dataObj;
    let partes = '';
    if (dia || mes || ano) {
        partes = [dia, mes, ano]
            .filter(Boolean)
            .map((v, i) => (i < 2 ? String(v).padStart(2, '0') : v))
            .join('/');
    }
    if (hora != null) {
        const h = String(hora).padStart(2, '0');
        const m = minuto != null ? String(minuto).padStart(2, '0') : '00';
        partes += (partes ? ' ' : '') + `${h}:${m}`;
    }
    return partes || '—';
}

// Extrai o ano (número) de uma data parcial, se houver.
export function anoDeDataParcial(dataObj) {
    return dataObj && dataObj.ano ? dataObj.ano : null;
}

// Reduz uma data parcial a um instante (timestamp), preenchendo os
// campos ausentes com o extremo que a torna mais favorável à
// comparação pedida: 'inicio' assume o menor valor possível pra cada
// campo em branco (mês 1, dia 1, 00:00), 'fim' assume o maior (mês 12,
// último dia do mês, 23:59). Sem ano não dá pra posicionar a data em
// nenhum instante com segurança, então retorna null.
function extremoDeDataParcial(dataObj, extremo) {
    if (!dataObj || dataObj.ano == null) return null;
    const { ano } = dataObj;
    const mes = dataObj.mes ?? (extremo === 'inicio' ? 1 : 12);
    const ultimoDiaDoMes = new Date(ano, mes, 0).getDate();
    const dia = dataObj.dia ?? (extremo === 'inicio' ? 1 : ultimoDiaDoMes);
    const hora = dataObj.hora ?? (extremo === 'inicio' ? 0 : 23);
    const minuto = dataObj.minuto ?? (extremo === 'inicio' ? 0 : 59);
    return new Date(ano, mes - 1, dia, hora, minuto).getTime();
}

// Diz se `posterior` (ex.: data de publicação) é COM CERTEZA anterior a
// `anterior` (ex.: data de escrita) — duas datas parciais, cada uma com
// dia/mês/ano/hora/minuto independentes e opcionais.
//
// Só acusa violação quando não existe NENHUMA combinação de valores
// ausentes que tornaria as duas datas compatíveis: compara o extremo
// mais cedo possível de `anterior` com o extremo mais tarde possível
// de `posterior`. Isso evita falso-positivo em datas ambíguas — ex.:
// escrita só com o ano "2020" e publicação "01/2020" não é acusada,
// porque é possível (embora não certo) que a escrita tenha sido em
// janeiro também. Já escrita "2020" e publicação "2019" é sempre uma
// violação, não importa o dia/mês que faltar preencher.
//
// Sem ano em algum dos dois lados, não dá pra garantir nada — retorna
// false (não bloqueia).
export function violaOrdemDeDatas(anterior, posterior) {
    const minAnterior = extremoDeDataParcial(anterior, 'inicio');
    const maxPosterior = extremoDeDataParcial(posterior, 'fim');
    if (minAnterior == null || maxPosterior == null) return false;
    return maxPosterior < minAnterior;
}

// ─── Época Retratada (intervalo De/Até, com N/A explícito) ─────
// Diferente de dataEscrita/dataPublicacao (um ponto no tempo, parcial),
// "a que época o poema se refere" já É um intervalo por natureza — por
// isso o campo guarda dois limites (inicio/fim, cada um uma data parcial
// independente e opcional) em vez de um só. Precisa também de um
// terceiro estado além de "preenchido"/"vazio": `na: true` significa
// "não se aplica" (marcado deliberadamente), distinto de "ainda não
// categorizado" (o campo inteiro null). Ver epocaRetratada em forms.js.
//
// Item 3 do plano de schema: Época deixou de guardar o nome como texto
// livre (`epocaRetratada.nome`) e passou a referenciar por ID um
// cadastro central próprio (`db.epocas`, `{id, nome, contextoRelacao,
// notas}` — ver migrarEpocas/obterOuCriarEpocaPorNome em db.js), mesmo
// padrão já validado em Pessoas/Autores. `epocaRetratada` guarda só
// `{ epocaId, inicio, fim, recorte, na }` — quem a época É (nome,
// contexto do relacionamento, notas) mora uma vez só no cadastro; o
// recorte de "momento vs. repercussão" (ver RECORTES_EPOCA abaixo)
// continua por item, já que o mesmo período pode ser retratado como
// evento pontual num poema e como efeito posterior noutro.
export const RECORTES_EPOCA = ['momento', 'repercussão'];

export const ROTULOS_RECORTE_EPOCA = {
    momento: 'Momento',
    repercussão: 'Momento e Repercussão',
};

// Resolve epocaRetratada.epocaId pro nome cadastrado — dado ainda não
// migrado (schema antigo, `.nome` cru) cai no fallback direto, mesmo
// critério defensivo já usado em nomesPessoas/paresAutoria pra dado que
// ainda não passou pela migração.
export function nomeEpoca(epoca, epocasCadastro = []) {
    if (!epoca) return '';
    if (epoca.epocaId) {
        return epocasCadastro.find((e) => e.id == epoca.epocaId)?.nome || '';
    }
    return epoca.nome || '';
}

// Resolve epocaRetratada.epocaId pro Contexto do relacionamento
// cadastrado (db.epocas.contextoRelacao, ex. "Pedro e Victor" — ver
// modal-epoca.html). Dado ainda não migrado (schema antigo, sem
// epocaId) não tem cadastro pra resolver, então não tem contexto.
// Mesmo critério defensivo de nomeEpoca.
export function contextoRelacaoEpoca(epoca, epocasCadastro = []) {
    if (!epoca?.epocaId) return '';
    return epocasCadastro.find((e) => e.id == epoca.epocaId)?.contextoRelacao || '';
}

export function formatarEpocaRetratada(epoca, epocasCadastro = []) {
    if (!epoca) return '—';
    const nome = nomeEpoca(epoca, epocasCadastro);
    // Contexto do relacionamento entra na frente, separado por "•"
    // (mesmo padrão pedido pro badge da coluna, só que aqui sempre
    // visível — na exportação/Visualização não há espaço de tabela
    // pra restringir, nem hover pra esconder atrás). Ex.: "Pedro e
    // Victor • Namoro (2019 – 2021)".
    const contexto = contextoRelacaoEpoca(epoca, epocasCadastro);
    const prefixo = contexto ? `${contexto} • ` : '';
    if (epoca.na) return nome ? `${prefixo}${nome} (N/A)` : 'N/A';
    const ini = formatarDataParcial(epoca.inicio);
    const fim = formatarDataParcial(epoca.fim);
    const intervalo =
        ini !== '—' && fim !== '—'
            ? `${ini} – ${fim}`
            : ini !== '—'
              ? `A partir de ${ini}`
              : fim !== '—'
                ? `Até ${fim}`
                : '';
    // "repercussão" (rótulo "Momento e Repercussão") é marcado inline,
    // logo depois do nome e antes do parênteses de datas ("Nome e pós
    // (datas)") — não mais num colchete solto no fim ("Nome (datas)
    // [Repercussão (e Pós)]"), que lia como se o colchete falasse da
    // repercussão em si e de um "pós-repercussão", em vez de "o
    // momento e o que veio depois dele". "momento" (só o evento) segue
    // marcado em colchete no fim, já que não tem ambiguidade de leitura.
    const posRepercussao = epoca.recorte === 'repercussão' ? ' e pós' : '';
    const recorte =
        epoca.recorte && epoca.recorte !== 'repercussão'
            ? ` [${ROTULOS_RECORTE_EPOCA[epoca.recorte] || epoca.recorte}]`
            : '';
    if (nome) {
        return (
            prefixo +
            (intervalo ? `${nome}${posRepercussao} (${intervalo})` : `${nome}${posRepercussao}`) +
            recorte
        );
    }
    // Sem nome, o contexto (se houver) fica sozinho — caso raro, época
    // sem nome só existe em dado legado não migrado, que também não
    // teria epocaId pra resolver contexto, então `prefixo` é sempre ''
    // aqui na prática; mantido por simetria caso o schema mude.
    return (
        prefixo +
        (intervalo ? `${intervalo}${posRepercussao}` : posRepercussao ? 'e pós' : '—') +
        recorte
    );
}

// Só o intervalo textual de Época Retratada, sem o nome do período —
// usado onde o nome já é mostrado à parte, com destaque visual próprio
// (ver render-listas.js, coluna Época Retratada). formatarEpocaRetratada
// (acima) continua sendo a versão "tudo junto" usada na exportação em
// Markdown, onde não há como colorir/destacar nada.
export function formatarIntervaloEpocaRetratada(epoca) {
    if (!epoca) return '—';
    if (epoca.na) return 'N/A';
    const ini = formatarDataParcial(epoca.inicio);
    const fim = formatarDataParcial(epoca.fim);
    if (ini !== '—' && fim !== '—') return `${ini} – ${fim}`;
    if (ini !== '—') return `A partir de ${ini}`;
    if (fim !== '—') return `Até ${fim}`;
    return '—';
}

// Sugestão automática de datas e contexto pra uma Época já cadastrada
// (ver aplicarSugestaoEpoca em forms.js): entre os poemas que já
// referenciam essa mesma `epocaId`, busca o mais recente (maior id — id
// é timestamp de criação, ver gerarId) e devolve as datas e o contexto
// histórico/pessoal dele como sugestão.
//
// É só um ponto de partida, nunca uma imposição — quem chama só aplica
// nos campos que estiverem vazios (preencherDataParcialSeVazio). Uma
// mesma Época pode, de propósito, ter datas diferentes de um poema pro
// outro — ex.: "Luto" pode valer até um ponto num poema e se estender
// mais adiante em outro.
export function obterSugestaoEpocaPorId(poemas, epocaId) {
    if (!epocaId) return null;
    const candidatos = poemas
        .filter((p) => p.epocaRetratada?.epocaId == epocaId)
        .sort((a, b) => b.id - a.id);
    if (!candidatos.length) return null;
    const maisRecente = candidatos[0];
    return {
        inicio: maisRecente.epocaRetratada.inicio || null,
        fim: maisRecente.epocaRetratada.fim || null,
        contextoHistorico: maisRecente.contextoHistorico || '',
    };
}

// ─── Filtro por faixa de data (Escrita / Publicação) ───────────
// Datas parciais (dia/mês/ano, cada um opcional) não podem ser comparadas
// como um único ponto no tempo — "só o ano" representa qualquer dia
// daquele ano. Por isso tratamos tanto o item quanto os limites do
// filtro como uma FAIXA de datas possíveis, e consideramos "bateu" se
// as duas faixas se sobrepõem. Isso evita esconder itens que têm menos
// precisão cadastrada do que o filtro pede (ex.: filtrar por mês não
// deve excluir um poema que só tem o ano).

// [inicio, fim] em formato AAAAMMDD, preenchendo partes ausentes com o
// limite mais aberto possível (menor pro início, maior pro fim).
function faixaDeDataParcial(dataObj) {
    if (!dataObj || (!dataObj.ano && !dataObj.mes && !dataObj.dia)) return null;
    const chave = (a, m, d) => a * 10000 + m * 100 + d;
    const ano = dataObj.ano,
        mes = dataObj.mes,
        dia = dataObj.dia;
    return [chave(ano ?? 0, mes ?? 1, dia ?? 1), chave(ano ?? 9999, mes ?? 12, dia ?? 31)];
}

// filtro = { de: {dia?,mes?,ano?}, ate: {dia?,mes?,ano?} } — qualquer
// um dos dois lados pode estar vazio (faixa aberta só de um lado).
function faixaDeFiltro(filtro) {
    const deObj = filtro?.de || {};
    const ateObj = filtro?.ate || {};
    const temDe = deObj.ano || deObj.mes || deObj.dia;
    const temAte = ateObj.ano || ateObj.mes || ateObj.dia;
    if (!temDe && !temAte) return null;

    const inicio = temDe ? faixaDeDataParcial(deObj)[0] : 0;
    const fim = temAte ? faixaDeDataParcial(ateObj)[1] : 99991231;
    return [inicio, fim];
}

/**
 * Retorna true se a data parcial de um item (dataEscrita ou
 * dataPublicacao) cai dentro do filtro de faixa (de/até), ou se não há
 * filtro ativo. Se há filtro ativo mas o item não tem essa data
 * cadastrada, é excluído (não dá pra confirmar que ele se encaixa).
 */
export function itemBateFiltroData(dataItem, filtro) {
    const faixaFiltro = faixaDeFiltro(filtro);
    if (!faixaFiltro) return true;

    const faixaItem = faixaDeDataParcial(dataItem);
    if (!faixaItem) return false;

    const [iniFiltro, fimFiltro] = faixaFiltro;
    const [iniItem, fimItem] = faixaItem;
    return iniItem <= fimFiltro && fimItem >= iniFiltro;
}

// Um filtro de data "vazio" (de e até ambos sem nenhum campo) — usado
// pra inicializar o estado e pra resetar ao trocar de aba/limpar.
export function filtroDataVazio() {
    return { de: {}, ate: {} };
}

/**
 * Atalho de digitação pro filtro de data De/Até (dia/mês/ano): em vez de
 * preencher 6 campos separados, aceita um texto num desses 4 formatos e
 * devolve o mesmo formato { de: {...}, ate: {...} } que os campos
 * avançados usam por trás — os 6 campos continuam existindo pra quem
 * precisa de uma faixa mais específica (ex: de um mês até outro).
 *
 *   "2020"          → o ano inteiro de 2020
 *   "2020-2023"     → de 2020 até 2023
 *   "03/2020"       → março de 2020
 *   "15/03/2020"    → um dia exato
 *
 * Texto vazio limpa o filtro (retorna filtroDataVazio()). Texto que não
 * bate com nenhum formato, ou com valores fora da faixa válida (dia
 * 1-31, mês 1-12, ano 1900-2100), retorna null — quem chama deve
 * simplesmente não aplicar nada, sem mensagem de erro.
 */
export function parseFiltroDataRapido(texto) {
    const t = (texto || '').trim();
    if (!t) return filtroDataVazio();

    const dentro = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;

    let m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
        const dia = parseInt(m[1], 10);
        const mes = parseInt(m[2], 10);
        const ano = parseInt(m[3], 10);
        if (!dentro(dia, 1, 31) || !dentro(mes, 1, 12) || !dentro(ano, 1900, 2100)) return null;
        return { de: { dia, mes, ano }, ate: { dia, mes, ano } };
    }

    m = t.match(/^(\d{1,2})\/(\d{4})$/);
    if (m) {
        const mes = parseInt(m[1], 10);
        const ano = parseInt(m[2], 10);
        if (!dentro(mes, 1, 12) || !dentro(ano, 1900, 2100)) return null;
        return { de: { mes, ano }, ate: { mes, ano } };
    }

    m = t.match(/^(\d{4})-(\d{4})$/);
    if (m) {
        const anoDe = parseInt(m[1], 10);
        const anoAte = parseInt(m[2], 10);
        if (!dentro(anoDe, 1900, 2100) || !dentro(anoAte, 1900, 2100)) return null;
        return { de: { ano: anoDe }, ate: { ano: anoAte } };
    }

    m = t.match(/^(\d{4})$/);
    if (m) {
        const ano = parseInt(m[1], 10);
        if (!dentro(ano, 1900, 2100)) return null;
        return { de: { ano }, ate: { ano } };
    }

    return null;
}

// Retorna true se o filtro está ativo (tem algum limite de/até
// preenchido) mas o item não tem essa data cadastrada — ou seja, ele
// está sendo excluído só por falta de data, e não por estar fora da
// faixa pedida. Usado pra avisar quantos itens caem nesse caso.
export function itemFaltaDataParaFiltro(dataItem, filtro) {
    const deObj = filtro?.de || {};
    const ateObj = filtro?.ate || {};
    const filtroAtivo = !!(
        deObj.ano ||
        deObj.mes ||
        deObj.dia ||
        ateObj.ano ||
        ateObj.mes ||
        ateObj.dia
    );
    if (!filtroAtivo) return false;
    return !dataItem || (!dataItem.ano && !dataItem.mes && !dataItem.dia);
}

// ─── Filtro por faixa de data — versão pra Época Retratada ─────
// Mesma lógica de sobreposição de faixas acima, mas o item já É um
// intervalo (inicio/fim) em vez de um ponto — então em vez de comparar
// "o item cabe dentro do filtro", comparamos se as DUAS faixas (a do
// item e a do filtro) se sobrepõem. N/A explícito nunca bate com um
// filtro ativo (não faz sentido dizer que uma época "não se aplica"
// está dentro de uma faixa de anos).
export function itemBateFiltroEpoca(epoca, filtro) {
    const faixaFiltro = faixaDeFiltro(filtro);
    if (!faixaFiltro) return true;
    if (!epoca || epoca.na) return false;

    const faixaItem = faixaDeFiltro({ de: epoca.inicio || {}, ate: epoca.fim || {} });
    if (!faixaItem) return false;

    const [iniFiltro, fimFiltro] = faixaFiltro;
    const [iniItem, fimItem] = faixaItem;
    return iniItem <= fimFiltro && fimItem >= iniFiltro;
}

// Mesmo papel de itemFaltaDataParaFiltro, pra Época Retratada: exclusão
// só por falta de dado (nem início nem fim preenchidos, e sem N/A
// marcado) — distinto de N/A, que é uma exclusão deliberada e por isso
// NÃO entra nessa contagem de "faltou".
export function itemFaltaEpocaParaFiltro(epoca, filtro) {
    const deObj = filtro?.de || {};
    const ateObj = filtro?.ate || {};
    const filtroAtivo = !!(
        deObj.ano ||
        deObj.mes ||
        deObj.dia ||
        ateObj.ano ||
        ateObj.mes ||
        ateObj.dia
    );
    if (!filtroAtivo) return false;
    if (!epoca) return true;
    if (epoca.na) return false; // N/A é deliberado, não "faltou"
    const i = epoca.inicio || {},
        f = epoca.fim || {};
    return !i.ano && !i.mes && !i.dia && !f.ano && !f.mes && !f.dia;
}

// Um Poema é "publicado" via status ('publicado'/'completo'/'incompleto');
// uma Prosa ainda usa o campo `publicado` (boolean) puro e simples. Este
// helper cobre os dois formatos, pra código que trata Poema/Prosa de forma
// genérica (ver exportar.js) não precisar saber qual dos dois é.
export function estaPublicado(item) {
    return item.status ? item.status === 'publicado' : !!item.publicado;
}

// Nomes de pessoas de um item (poema/prosa), resolvidos via o cadastro
// central `db.pessoas` — desde a migração pra Pessoa como entidade
// própria (ver migrarPessoasParaCadastro em db.js), item.pessoas guarda
// `{ pessoaId, papeis }`, não mais `{ nome, papeis }`; quem sabe o nome
// agora é só o cadastro. Recebe `pessoasCadastro` (normalmente
// `db.pessoas`) em vez de fechar sobre `db` pra continuar testável com
// dados de mentira, mesmo padrão do resto deste arquivo. pessoaId sem
// correspondência no cadastro (não deveria acontecer, mas dado
// importado de fora pode vir incompleto) é ignorado, não quebra a
// lista pros demais.
export function nomesPessoas(item, pessoasCadastro = []) {
    if (!Array.isArray(item.pessoas)) return [];
    const porId = new Map(pessoasCadastro.map((p) => [p.id, p.nome]));
    return item.pessoas.map((p) => porId.get(p.pessoaId)).filter(Boolean);
}

// Nomes dos grupos que uma Pessoa pertence, resolvidos via o cadastro
// central `db.grupos` — mesmo padrão de nomesPessoas acima, mas um
// nível abaixo: Grupo é característica da Pessoa (constante entre
// poemas), não do vínculo poema↔pessoa (esse é o papel, que continua
// em item.pessoas — ver comentário ali).
export function nomesGrupos(pessoa, gruposCadastro = []) {
    if (!pessoa || !Array.isArray(pessoa.grupoIds)) return [];
    const porId = new Map(gruposCadastro.map((g) => [g.id, g.nome]));
    return pessoa.grupoIds.map((id) => porId.get(id)).filter(Boolean);
}

// Pares (Grupo, Pessoa) de um item (poema/prosa) — resolve
// item.pessoas → cada pessoa → cada grupo que ela pertence, achatando
// tudo numa lista única. Usado tanto pela exportação em Markdown
// ("Grupos: Namorado (Dalton), Ex-namorado (Pedro)") quanto pela
// coluna "Grupos" das tabelas e pelo painel somente-leitura do modal
// (ver renderPainelGruposDoChip em editor.js) — uma pessoa em mais de
// um grupo gera um par por grupo, não uma linha combinada. pessoaId
// ou grupoId sem correspondência no cadastro é ignorado, mesmo
// critério de nomesPessoas/nomesGrupos acima.
export function paresGrupoPessoa(item, pessoasCadastro = [], gruposCadastro = []) {
    if (!Array.isArray(item.pessoas)) return [];
    const porPessoaId = new Map(pessoasCadastro.map((p) => [p.id, p]));
    const porGrupoId = new Map(gruposCadastro.map((g) => [g.id, g]));
    const pares = [];
    item.pessoas.forEach((p) => {
        const pessoa = porPessoaId.get(p.pessoaId);
        if (!pessoa || !Array.isArray(pessoa.grupoIds)) return;
        pessoa.grupoIds.forEach((grupoId) => {
            const grupo = porGrupoId.get(grupoId);
            if (grupo) pares.push({ grupo, pessoa });
        });
    });
    return pares;
}

// ─── Cor de Grupo ──────────────────────────────────────────────
// Paleta curada (não cor livre via input[type=color]): cada Grupo
// escolhe uma destas chaves, salva em `grupo.cor`. Curada em vez de
// hex livre por dois motivos — cada entrada já garante contraste
// correto claro/escuro (par bg-100/900 + text-600/400, mesmo padrão
// de badge do resto do app), e evita repetir a cor que já identifica
// "isto é uma Pessoa" nas tabelas (rose, ver badgesPessoas em
// render-listas.js) — por isso rose não faz parte da paleta de Grupo,
// pra badge de Pessoa e badge de Grupo nunca se confundirem visualmente
// só de bater o olho. `CORES_GRUPO` é a fonte única (paleta do seletor
// no modal + resolução de classes); grupo sem `cor` (dado de antes
// dessa feature) cai no `PADRAO`.
export const CORES_GRUPO = [
    { chave: 'blue', rotulo: 'Azul' },
    { chave: 'emerald', rotulo: 'Verde' },
    { chave: 'amber', rotulo: 'Âmbar' },
    { chave: 'violet', rotulo: 'Violeta' },
    { chave: 'cyan', rotulo: 'Ciano' },
    { chave: 'fuchsia', rotulo: 'Fúcsia' },
    { chave: 'orange', rotulo: 'Laranja' },
    { chave: 'teal', rotulo: 'Verde-azulado' },
    { chave: 'indigo', rotulo: 'Índigo' },
    { chave: 'slate', rotulo: 'Cinza' },
];
export const CORES_GRUPO_PADRAO = 'blue';

// Classes completas por cor, escritas por extenso (não construídas com
// template string tipo `bg-${chave}-100`) — o Tailwind Play CDN deste
// projeto escaneia o DOM renderizado atrás de nomes de classe
// literais; string montada em runtime some do JS-fonte antes de
// chegar lá, então cada combinação precisa existir escrita por
// inteiro em algum lugar que o scanner veja. Mesmo padrão que o resto
// do app já segue (`corClasse: 'bg-rose-500'`, sempre literal, nunca
// interpolado).
const CLASSES_POR_COR_GRUPO = {
    blue: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400',
    violet: 'bg-violet-100 dark:bg-violet-900 text-violet-600 dark:text-violet-400',
    cyan: 'bg-cyan-100 dark:bg-cyan-900 text-cyan-600 dark:text-cyan-400',
    fuchsia: 'bg-fuchsia-100 dark:bg-fuchsia-900 text-fuchsia-600 dark:text-fuchsia-400',
    orange: 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400',
    teal: 'bg-teal-100 dark:bg-teal-900 text-teal-600 dark:text-teal-400',
    indigo: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400',
    slate: 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400',
};

// Classes Tailwind (bg/text, claro+escuro) pra badge de um Grupo. Cor
// desconhecida ou ausente (dado de antes da feature de cor) cai no
// padrão, sem quebrar a renderização.
export function classesCorGrupo(cor) {
    return CLASSES_POR_COR_GRUPO[cor] || CLASSES_POR_COR_GRUPO[CORES_GRUPO_PADRAO];
}

// Bolinha sólida (dot) por cor — usada tanto no seletor de cor do
// formulário de Grupo (ver renderSeletorCorGrupo em forms.js) quanto no
// card da própria aba Grupos (ver renderGrupos em render-listas.js), pra
// bater o olho na cor sem precisar abrir "Editar". Mapa à parte de
// CLASSES_POR_COR_GRUPO (que é bg claro + texto, pensado pra badge com
// nome dentro) porque aqui o preenchimento é sólido (-500), sem par
// claro/escuro — é só uma bolinha, não precisa de contraste de texto.
// Escrito por extenso pelo mesmo motivo de CLASSES_POR_COR_GRUPO acima
// (Tailwind Play CDN escaneia classe literal no DOM).
const PONTO_POR_COR_GRUPO = {
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    violet: 'bg-violet-500',
    cyan: 'bg-cyan-500',
    fuchsia: 'bg-fuchsia-500',
    orange: 'bg-orange-500',
    teal: 'bg-teal-500',
    indigo: 'bg-indigo-500',
    slate: 'bg-slate-500',
};

export function pontoCorGrupo(cor) {
    return PONTO_POR_COR_GRUPO[cor] || PONTO_POR_COR_GRUPO[CORES_GRUPO_PADRAO];
}

// Remove acentos e caixa alta pra comparação de busca (título, texto do
// prefixo "campo:" e valores dos campos). Usada em vez de um simples
// toLowerCase() pra que "arvore" ache "árvore", "coracao" ache "coração",
// etc. — mesma técnica (NFD + strip de diacríticos) já usada em
// exportarLivroCompleto (exportar.js) pra gerar nome de arquivo, só que
// aplicada aqui à busca em vez de a um nome de arquivo.
export function normalizarBusca(s) {
    if (s == null) return '';
    return String(s)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

// Nomes de atributo aceitos no prefixo "campo:valor" (ver filtrarTextos
// abaixo) → chave correspondente no item já decorado. livro/parte/secao
// são preenchidos por decorarCamposBusca() em render-listas.js a partir
// do vínculo estrutural (paiTipo/paiId) do poema/prosa.
// Como o nome do prefixo agora passa por normalizarBusca() antes do
// lookup (ver parseConsultaBusca), não precisa mais duplicar cada chave
// com/sem acento (título/titulo, relação/relacao, etc.) — um único nome
// sem acento já casa com as duas formas digitadas.
const CAMPOS_ATRIBUTO = {
    titulo: 'titulo',
    texto: 'texto',
    etiqueta: '_buscaSinalizacoes',
    estilo: 'sinalizacoesEstilo',
    tema: 'sinalizacoesTema',
    relacao: 'sinalizacoesRelacao',
    tom: 'sinalizacoesTom',
    // Diferente de sensivel: (abaixo), que busca no parágrafo descritivo
    // de conteudoSensivel — aqui é a tag solta de Sensibilidade
    // (ex.: "Linguagem obscena").
    sensibilidade: 'sinalizacoesSensibilidade',
    // Balde temporário de tags migradas sem categoria própria ainda
    // (ver SINAL_CATEGORIAS em editor.js) — não é uma categoria de
    // verdade, só dá pra buscar nela enquanto ela existir.
    outros: 'sinalizacoesOutros',
    pessoa: '_buscaPessoas',
    papel: '_buscaPapeis',
    grupo: '_buscaGrupos',
    // Só se aplica a Prosa (ver extrairGenerosUnicos) — em Poema, o
    // campo simplesmente não existe, então o prefixo não acha nada lá.
    genero: 'genero',
    idioma: 'idioma',
    epoca: '_buscaEpoca',
    autor: '_buscaAutoria',
    envio: '_buscaEnvios',
    nota: 'notas',
    livro: '_buscaLivro',
    parte: '_buscaParte',
    secao: '_buscaSecao',
    visual: 'descricaoVisual',
    contexto: 'contextoHistorico',
    intertexto: '_buscaIntertexto',
    anexo: '_buscaAnexos',
    anexos: '_buscaAnexos',
    notaanexos: 'anexosNotaGeral',
    anotacao: '_buscaAnotacoes',
    anotacoes: '_buscaAnotacoes',
    ocultacao: 'ocultacao',
    sensivel: 'conteudoSensivel',
    hiperacionante: 'vocabularioHiperacionante',
    cortado: '_buscaCortadoDe',
    lancado: '_buscaLancadoEm',
    descarte: 'descarte',
    pendencia: 'pendencia',
    elo: '_buscaElos',
    elos: '_buscaElos',
    referencia: '_buscaReferencias',
    referencias: '_buscaReferencias',
    reconhecimento: '_buscaReconhecimentos',
    reconhecimentos: '_buscaReconhecimentos',
};

// Lista, pra uso da UI (legenda de ajuda, atalho de clique no cabeçalho
// da coluna — ver render-listas.js), dos prefixos "canônicos" — um por
// campo de destino, preferindo a forma mais curta/comum quando um campo
// tem mais de um nome aceito (ex.: "anexo" em vez de "anexos").
export const PREFIXOS_CANONICOS_POR_CAMPO = {
    titulo: 'titulo',
    texto: 'texto',
    _buscaSinalizacoes: 'etiqueta',
    sinalizacoesEstilo: 'estilo',
    sinalizacoesTema: 'tema',
    sinalizacoesRelacao: 'relacao',
    sinalizacoesTom: 'tom',
    sinalizacoesSensibilidade: 'sensibilidade',
    sinalizacoesOutros: 'outros',
    _buscaPessoas: 'pessoa',
    _buscaPapeis: 'papel',
    _buscaGrupos: 'grupo',
    genero: 'genero',
    idioma: 'idioma',
    _buscaEpoca: 'epoca',
    _buscaAutoria: 'autor',
    _buscaEnvios: 'envio',
    notas: 'nota',
    _buscaLivro: 'livro',
    _buscaParte: 'parte',
    _buscaSecao: 'secao',
    descricaoVisual: 'visual',
    contextoHistorico: 'contexto',
    _buscaIntertexto: 'intertexto',
    _buscaAnexos: 'anexo',
    anexosNotaGeral: 'notaanexos',
    _buscaAnotacoes: 'anotacao',
    ocultacao: 'ocultacao',
    conteudoSensivel: 'sensivel',
    vocabularioHiperacionante: 'hiperacionante',
    _buscaCortadoDe: 'cortado',
    _buscaLancadoEm: 'lancado',
    descarte: 'descarte',
    pendencia: 'pendencia',
    _buscaElos: 'elo',
    _buscaReferencias: 'referencia',
    _buscaReconhecimentos: 'reconhecimento',
};

// Interpreta uma consulta de busca no estilo Google e devolve os grupos de
// inclusão e os termos de exclusão — parte compartilhada entre
// filtrarTextos (título/etiqueta/pessoa/etc.) e filtrarPorConteudo (texto).
//
// Sintaxe:
//   - termos soltos, separados por espaço, precisam TODOS aparecer (E lógico)
//   - a palavra "ou" separa alternativas: só um dos lados precisa bater
//     (E dentro de cada lado, OU entre os lados)
//   - "frase entre aspas" busca a sequência exata, com espaços
//   - um "-" na frente de um termo (ou de uma frase entre aspas) exclui
//     qualquer item que o contenha — a exclusão vale sempre, não importa
//     o lado do "ou" em que está
//   - um prefixo "campo:" restringe o termo a um atributo (ver
//     CAMPOS_ATRIBUTO acima); sem prefixo, busca nos campos gerais
//   - "campo:*" (asterisco sozinho, só faz sentido com prefixo de campo)
//     não busca o caractere "*" — significa "esse campo está preenchido,
//     não importa com o quê". "-campo:*" inverte: "esse campo está
//     vazio". Sem prefixo, um "*" solto é tratado como termo literal
//     (não tem campo único pra checar presença).
//   - acentos não importam nem no termo nem no nome do prefixo (ver
//     normalizarBusca acima): "arvore"/"árvore" e "sensivel:"/"sensível:"
//     casam do mesmo jeito.
// Ex.: Dalton -rascunho            → menciona Dalton, mas não a tag "rascunho"
//      Dalton ou Gabriela          → menciona Dalton OU Gabriela
//      -2023                       → tudo, exceto o que tiver "2023"
//      "beira do mar"              → só o que tiver essa sequência exata
//      pessoa:Dalton               → só onde "Dalton" aparece em Pessoas (nome OU papel)
//      papel:Melhor Amiga          → só quem tem alguém marcado com esse papel específico
//      grupo:Família               → só quem menciona alguém que pertence a esse Grupo
//      -etiqueta:rascunho          → exclui quem tem a etiqueta "rascunho"
//      secao:"Fragmentos do Fim"   → só quem está dentro dessa seção
//      sensivel:*                  → só quem tem Conteúdo Sensível preenchido
//      -sensivel:*                 → só quem NÃO tem Conteúdo Sensível preenchido
function parseConsultaBusca(query) {
    // Cada match é, opcionalmente, um prefixo "campo:" seguido de uma
    // frase entre aspas ou uma palavra solta, com "-" opcional na frente
    // pra excluir — assim "frase exata" e "campo:"frase exata"" mantêm
    // os espaços de dentro em vez de serem quebrados palavra por palavra.
    const matches = query.trim().match(/-?(?:[a-zA-Zà-úÀ-Ú]+:)?"[^"]*"|-?\S+/g) || [];

    const termosExcluir = [];
    const gruposIncluir = [];
    let grupoAtual = [];

    matches.forEach((bruto) => {
        // "ou" sozinho (sem "-", aspas ou prefixo de campo) fecha o grupo
        // atual e começa um novo — os grupos são combinados por OU depois.
        if (bruto.toLowerCase() === 'ou') {
            if (grupoAtual.length) gruposIncluir.push(grupoAtual);
            grupoAtual = [];
            return;
        }

        const excluir = bruto.startsWith('-');
        let resto = excluir ? bruto.slice(1) : bruto;

        let campo = null;
        const casouCampo = resto.match(/^([a-zA-Zà-úÀ-Ú]+):([\s\S]*)$/);
        if (casouCampo && CAMPOS_ATRIBUTO[normalizarBusca(casouCampo[1])]) {
            campo = CAMPOS_ATRIBUTO[normalizarBusca(casouCampo[1])];
            resto = casouCampo[2];
        }

        let termo = resto;
        if (termo.startsWith('"') && termo.endsWith('"') && termo.length >= 2) {
            termo = termo.slice(1, -1); // tira as aspas, mantém os espaços de dentro
        }
        termo = termo.trim();
        if (!termo) return;

        // Presença de campo ("campo:*"): só faz sentido com um campo
        // restrito e o asterisco sozinho — "campo:*algo*" ou um "*" sem
        // prefixo continuam sendo termo literal, não presença.
        const presenca = campo && termo === '*';
        termo = presenca ? '*' : normalizarBusca(termo);

        (excluir ? termosExcluir : grupoAtual).push({ campo, termo, presenca });
    });
    if (grupoAtual.length) gruposIncluir.push(grupoAtual);

    return { gruposIncluir, termosExcluir };
}

// Filtra uma lista de textos (poemas/prosas) por uma busca livre que
// procura em título, ano, sinalizações, pessoas, autoria, grupos,
// papéis, época retratada, livros, descrição visual, contexto
// histórico/pessoal e intertextualidade ao mesmo tempo — ou,
// opcionalmente, restrita a um atributo específico. Ver
// parseConsultaBusca acima pra sintaxe completa.
export function filtrarTextos(lista, query) {
    if (!query || !query.trim()) return lista;
    const { gruposIncluir, termosExcluir } = parseConsultaBusca(query);

    return lista.filter((item) => {
        const camposGerais = normalizarBusca(
            [
                item.titulo,
                item.ano,
                item._buscaSinalizacoes,
                item._buscaPessoas,
                item._buscaAutoria,
                item._buscaGrupos,
                item._buscaPapeis,
                item._buscaEpoca,
                item.genero,
                item.notas,
                item._livros,
                item.descricaoVisual,
                item.contextoHistorico,
                item._buscaIntertexto,
                item._buscaAnexos,
                item.anexosNotaGeral,
                item._buscaAnotacoes,
                item.ocultacao,
                item.conteudoSensivel,
                item.vocabularioHiperacionante,
                item._buscaCortadoDe,
                item._buscaLancadoEm,
                item.descarte,
                item.pendencia,
            ]
                .filter(Boolean)
                .join(' '),
        );

        const valorDoTermo = (t) => {
            if (!t.campo) return camposGerais;
            const v = item[t.campo];
            return v == null ? '' : normalizarBusca(String(v));
        };

        // "campo:*" checa presença (valor não-vazio), ignorando o texto
        // do campo — o resto continua sendo substring normal.
        const bateTermo = (t) =>
            t.presenca ? valorDoTermo(t) !== '' : valorDoTermo(t).includes(t.termo);

        const combinaInclusao =
            gruposIncluir.length === 0 || gruposIncluir.some((grupo) => grupo.every(bateTermo));
        const combinaExclusao = termosExcluir.some(bateTermo);

        return combinaInclusao && !combinaExclusao;
    });
}

// Filtra por conteúdo textual (versos do poema, corpo da prosa), com a
// mesma sintaxe de "ou" / aspas / exclusão de parseConsultaBusca — mas
// sempre olhando o campo "texto", ignorando prefixos de outros atributos.
export function filtrarPorConteudo(lista, query) {
    if (!query || !query.trim()) return lista;
    const { gruposIncluir, termosExcluir } = parseConsultaBusca(query);

    return lista.filter((item) => {
        const texto = normalizarBusca(item.texto == null ? '' : String(item.texto));

        const bateTermo = (t) => (t.presenca ? texto !== '' : texto.includes(t.termo));

        const combinaInclusao =
            gruposIncluir.length === 0 || gruposIncluir.some((grupo) => grupo.every(bateTermo));
        const combinaExclusao = termosExcluir.some(bateTermo);

        return combinaInclusao && !combinaExclusao;
    });
}

// Recebe o array db.poemas e retorna todas as sinalizações únicas ordenadas
// Campo "Gênero" da Prosa (Cartas, Diálogos, Ensaios, Prosas poéticas...).
// Mesmo padrão de extração das Sinalizações, mas restrito a prosas —
// gênero não se aplica a Poema.
export function extrairGenerosUnicos(prosas) {
    const generos = new Set();
    prosas.forEach((p) => {
        if (p.genero) {
            const lista = Array.isArray(p.genero)
                ? p.genero
                : p.genero.split(',').map((s) => s.trim());
            lista.forEach((g) => {
                if (g) generos.add(g);
            });
        }
    });
    return Array.from(generos).sort();
}

// Sinalizações viraram 5 campos por categoria (Estilo/Tema/Relação/
// Sensibilidade/Tom — ver SINALIZACOES_CATEGORIAS) em vez de um campo
// único misturando tudo (ver migrarSinalizacoes em db.js). `campo`
// aceita qualquer um desses nomes de campo — a função é genérica, não
// hardcoded pra sinalizacoesEstilo especificamente — pra poder ser
// reaproveitada por cada datalist de categoria em editor.js.
export function extrairSinalizacoesUnicas(itens, campo = 'sinalizacoesTema') {
    const sinais = new Set();
    itens.forEach((p) => {
        const valor = p[campo];
        if (valor) {
            const lista = Array.isArray(valor) ? valor : valor.split(',').map((s) => s.trim());
            lista.forEach((s) => {
                if (s) sinais.add(s);
            });
        }
    });
    return Array.from(sinais).sort();
}

// Nomes de campo das categorias de Sinalizações, na ordem em que
// aparecem no modal. "Conteúdo sensível" não é mais um valor dentro de
// Sensibilidade — passou a ser derivado da presença do campo
// `conteudoSensivel` (ver badgeConteudoSensivel em render-listas.js).
// "outros" é o balde temporário de tags migradas sem categoria própria
// ainda (Premiados/Tradução/Variações — ver editor.js e o plano em
// Análise de estrutura e metadados poéticos); não é uma 6ª categoria
// definitiva, é onde elas ficam visíveis até virar Reconhecimentos e
// Elos tipados de Derivação.
export const SINALIZACOES_CATEGORIAS = {
    estilo: 'sinalizacoesEstilo',
    tema: 'sinalizacoesTema',
    relacao: 'sinalizacoesRelacao',
    sensibilidade: 'sinalizacoesSensibilidade',
    tom: 'sinalizacoesTom',
    outros: 'sinalizacoesOutros',
};

// Uma única string combinando as categorias acima — pra busca geral, export
// em .md (linha resumo) e estatísticas, que não precisam saber de
// categoria, só "quais tags esse item tem". Cada consumidor que SE
// importa com categoria (o modal de edição, o filtro por prefixo
// estilo:/tema:/etc.) usa os campos individuais direto.
export function sinalizacoesCombinadas(item) {
    return Object.values(SINALIZACOES_CATEGORIAS)
        .map((campo) => item[campo])
        .filter(Boolean)
        .join(', ');
}

// ─── Elos / Referências tipados (item 1 do plano de schema) ────
// Duas listas fechadas separadas — porque Elos e Referências têm
// natureza diferente — e, desde o redesenho Relação+Direção, Elos usa
// um schema à parte de Referências (ver mais abaixo).
//
// PAPEIS_PESSOA: papel de cada pessoa vinculada a um texto (item 2 do
// plano de schema — "Pedro, Dani" comma-string vira array de objeto
// { nome, papel }). Fechado (não texto livre) pra dar consistência de
// filtro/estatística; "" (vazio) é o valor de "não especificado" — todo
// nome migrado da string antiga cai aqui (ver migrarPessoas em db.js),
// e continua sendo uma opção válida pra quem não quiser categorizar.
export const PAPEIS_PESSOA = [
    'Retratado(a)',
    'Inspirado(a) por',
    'Dedicatário(a)',
    'Mencionado(a)',
    'Aludido(a)',
];

// Iniciais de PAPEIS_PESSOA pra exibição compacta (modal e coluna da
// tabela — ver badgesPessoas em render-listas.js e o chip de papéis em
// editor.js). As 5 iniciais não colidem (R/I/D/M/A), então não precisa de
// abreviação tipo "Re/In/De/Me". Mantém a ordem em que os papéis foram
// marcados (não é hierarquia fixa por categoria — ver alternarPapel em
// editor.js), só troca o nome por extenso pela inicial; "·" (ponto
// médio) como separador entre elas, escolhido por ser mais leve que "-"
// ou espaço sem ficar ambíguo tipo "RDIM" grudado. Exportação pra MD
// mantém os papéis por extenso (ver exportar-md.js) — a abreviação é só
// pra UI, onde passar o mouse por cima do chip já mostra o papel por
// extenso via `title` (ver badgesPessoas em render-listas.js).
export function iniciaisPapeisPessoa(papeis) {
    if (!Array.isArray(papeis) || !papeis.length) return '';
    return papeis.map((p) => p.charAt(0)).join('·');
}

// ─── Autoria ─────────────────────────────────────────────────────
// AUTORIA_PAPEIS: papel de cada Autor vinculado a um texto — lista
// fechada própria (não reaproveita PAPEIS_PESSOA acima), já que
// Autor/Coautor é um vínculo single-role por texto (um autor só pode
// estar marcado como UM dos dois num mesmo poema/prosa), diferente de
// Pessoa, onde os papéis se acumulam. `item.autoria` é um array de
// `{ autorId, papel }`, resolvido contra o cadastro central
// `db.autores` (nome + sobre — ver criarGrupoDeAutoria em editor.js e
// migrarAutoria/obterOuCriarAutorPorNome em db.js).
export const AUTORIA_PAPEIS = ['Autor', 'Coautor'];

// Pares (Autor, papel) de um item (poema/prosa) — resolve
// item.autoria → cada vínculo { autorId, papel } → o Autor
// correspondente no cadastro central, mesmo padrão de paresGrupoPessoa
// acima. Usado pela exportação em Markdown (ver textoAutoria em
// exportar-md.js), pela coluna "Autoria" das tabelas (ver
// badgesAutoria em render-listas.js) e por `_buscaAutoria` (nome +
// papel, alimenta o prefixo de busca `autor:`). autorId sem
// correspondência no cadastro (autor excluído) é ignorado, mesmo
// critério de nomesPessoas/paresGrupoPessoa; `item.autoria` ausente ou
// não-array (dado ainda não migrado) devolve lista vazia sem quebrar.
export function paresAutoria(item, autoresCadastro = []) {
    if (!Array.isArray(item.autoria)) return [];
    const porId = new Map(autoresCadastro.map((a) => [a.id, a]));
    const pares = [];
    item.autoria.forEach((v) => {
        const autor = porId.get(v.autorId);
        if (autor) pares.push({ autor, papel: v.papel });
    });
    return pares;
}

// IDIOMA: campo simples em Poema/Prosa (item 9 do plano de schema),
// padrão "pt-BR" — complementa a Relação "Tradução" do item 1 (sem ele
// não dava pra saber em que língua um texto traduzido está). Texto
// livre com autocomplete (não select fechado — um texto pode estar em
// qualquer idioma, inclusive misto/dialeto, não faz sentido fechar a
// lista), então não é uma constante fechada como PAPEIS_PESSOA. Códigos
// BCP-47 (pt-BR, en, es...) só por convenção de concisão; texto livre
// aceita qualquer valor.
//
// IDIOMAS_SUGERIDOS é só a semente inicial do datalist — antes de
// qualquer poema/prosa ter um idioma diferente de pt-BR salvo, o campo
// ainda precisa sugerir algo além do próprio valor padrão. Ver
// extrairIdiomasUnicos abaixo, que soma isso ao que já está salvo no
// acervo (mesmo padrão de atualizarDatalistEpoca em editor.js).
export const IDIOMAS_SUGERIDOS = ['pt-BR', 'en', 'es', 'fr', 'it', 'de'];

// Idiomas já usados no acervo (Poemas + Prosas juntos, mesmo motivo de
// atualizarDatalistEpoca somar as duas fontes: um idioma digitado numa
// prosa deve sugerir numa próxima edição de poema e vice-versa), somado
// à semente de IDIOMAS_SUGERIDOS pra não começar vazio.
export function extrairIdiomasUnicos(itens) {
    const idiomas = new Set(IDIOMAS_SUGERIDOS);
    itens.forEach((item) => {
        if (item.idioma) idiomas.add(item.idioma);
    });
    return Array.from(idiomas).sort();
}

// ─── Envios e Reações ──────────────────────────────────────────
// ENVIOS: item 7 do plano de schema. Registro de quando um texto foi
// enviado/mostrado pra alguém e como essa pessoa reagiu — lista (não
// campo único), porque o mesmo poema pode ter sido enviado mais de uma
// vez, pra pessoas diferentes, em momentos diferentes. Poema + Prosa
// desde já (mesma antecipação do item 9/Idioma e do campo Autoria).
//
// `item.envios` é array de `{ pessoa, data, meio, reacao, notas }`:
//   - `pessoa`: texto livre (não referência a `db.pessoas` por id) —
//     reaproveita só o *datalist* de nomes já cadastrados como sugestão
//     de digitação (mesmo padrão de `meio` abaixo), sem virar vínculo
//     estrutural; não faz sentido forçar cadastro central só pra
//     registrar "mandei pro Instagram da Dani".
//   - `data`: data parcial (dia/mês/ano — ver lerDataParcial/
//     preencherDataParcial/formatarDataParcial acima), o dia do envio,
//     não de escrita/publicação.
//   - `meio`: texto livre com autocomplete (WhatsApp, Instagram,
//     presencial...) — ver extrairMeiosEnviosUnicos abaixo, mesmo
//     motivo de IDIOMAS_SUGERIDOS não fechar a lista: o meio de envio
//     não é uma categoria fixa e finita.
//   - `reacao`/`notas`: texto livre — o que a pessoa disse/fez, e uma
//     nota própria à parte (contexto adicional, não a reação em si).
//
// Meios já usados no acervo (Poemas + Prosas juntos, mesmo motivo de
// extrairIdiomasUnicos somar as duas fontes), sem semente fixa — ao
// contrário de IDIOMAS_SUGERIDOS, não há um punhado óbvio de meios pra
// sugerir antes do primeiro envio salvo (WhatsApp/Instagram/presencial
// variam demais por acervo).
export function extrairMeiosEnviosUnicos(itens) {
    const meios = new Set();
    itens.forEach((item) => {
        if (Array.isArray(item.envios)) {
            item.envios.forEach((e) => {
                if (e && e.meio) meios.add(e.meio);
            });
        }
    });
    return Array.from(meios).sort();
}

// ─── Reconhecimentos ─────────────────────────────────────────────
// RECONHECIMENTOS: item 8 do plano de schema. Entidade tipo lista,
// separada de tag solta (a tag "Premiados" que hoje ficava num balde
// temporário em sinalizacoesOutros — ver MAPA_MIGRACAO_SINALIZACOES em
// db.js — migra pra cá, ver migrarReconhecimentos em db.js). Poema +
// Prosa desde já (mesma antecipação de Idioma/Autoria/Envios).
//
// `item.reconhecimentos` é array de `{ premio, posicao, ano, texto }`:
//   - `premio`: texto livre (nome do concurso/prêmio/menção) — reaproveita
//     só o *datalist* dos nomes já cadastrados como sugestão de digitação
//     (ver extrairPremiosUnicos abaixo), mesmo padrão de `meio` em Envios:
//     não há uma lista fechada de prêmios possíveis.
//   - `posicao`: texto livre (ex.: "1º lugar", "Menção honrosa") — não é
//     um valor fechado, prêmios diferentes nomeiam colocação de formas
//     diferentes.
//   - `ano`: número (ano da premiação), pode ficar em branco.
//   - `texto`: nota livre opcional (contexto adicional sobre o prêmio).
//
// Prêmios já usados no acervo (Poemas + Prosas juntos, mesmo motivo de
// extrairMeiosEnviosUnicos acima), sem semente fixa.
export function extrairPremiosUnicos(itens) {
    const premios = new Set();
    itens.forEach((item) => {
        if (Array.isArray(item.reconhecimentos)) {
            item.reconhecimentos.forEach((r) => {
                if (r && r.premio) premios.add(r.premio);
            });
        }
    });
    return Array.from(premios).sort();
}

// TIPOS_REFERENCIA: relações sempre UNIDIRECIONAIS (mais novo → mais
// antigo), sem par estrutural fechado — por isso sem painel derivado
// (não há "outro lado" a inferir). "Imagem central compartilhada" é um
// motivo recorrendo ao longo do corpus sem relação de par fechado
// (diferente de Elos, que é bilateral). "Aceno a" é um gesto mais
// solto, sem exigir reciprocidade nem pertencer a um tipo mais
// específico.
export const TIPOS_REFERENCIA = [
    'Personagem em comum',
    'Imagem central compartilhada',
    'Aceno a',
    'Outro',
];

// RELACOES_ELO: relações BILATERAIS entre dois poemas (par estrutural —
// reescrita, tradução, resposta...), redesenhadas pra separar a
// Relação em si (8 valores fixos) da Direção (Origem/Destino) de cada
// lado — em vez do schema antigo (`TIPOS_ELO` fixo com 11 rótulos, um
// por lado possível, e um mapa `TIPO_INVERSO_ELO` só pros 3 pares que
// tinham nome pros dois lados). Com Relação+Direção, todo par vira
// automaticamente nomeado nos dois sentidos (ver ROTULOS_RELACAO_ELO
// logo abaixo), sem precisar de mapa de inverso.
export const RELACOES_ELO = [
    'Reescrita',
    'Continuidade',
    'Tradução',
    'Variação',
    'Versão',
    'Resposta',
    'Díptico',
    'Outro',
];

// Rótulo de exibição por Relação e lado (Origem = texto mais
// antigo/base, Destino = texto derivado/mais novo). Relações
// assimétricas (Reescrita, Continuidade, Tradução, Variação, Versão,
// Resposta) têm um rótulo diferente por lado; Díptico e Outro não têm
// uma direção real, então usam o mesmo rótulo dos dois lados. "Versão"
// não carrega mais "descartada" no rótulo (antes "Versão anterior
// (descartada) de") — decisão de simplificar o texto.
export const ROTULOS_RELACAO_ELO = {
    Reescrita: { origem: 'Reescrito em', destino: 'Reescrita de' },
    Continuidade: { origem: 'Continuado em', destino: 'Continuação de' },
    Tradução: { origem: 'Traduzido para', destino: 'Tradução de' },
    Variação: { origem: 'Variado em', destino: 'Variação de' },
    Versão: { origem: 'Versão anterior de', destino: 'Versão oficial de' },
    Resposta: { origem: 'Respondido em', destino: 'Resposta a' },
    Díptico: { origem: 'Díptico com', destino: 'Díptico com' },
    Outro: { origem: 'Outro', destino: 'Outro' },
};

// Rótulo mostrado pra um elo, dada sua Relação e Direção — usado no
// modal (botões de direção, ver atualizarRotulosDirecaoElo em
// editor.js), na coluna da tabela (render-listas.js) e na exportação
// (exportar-md.js). Relação vazia/desconhecida (elo legado sem
// migração aplicada, ou dado corrompido) devolve string vazia em vez
// de inventar um rótulo.
export function rotuloElo(relacao, direcao) {
    return ROTULOS_RELACAO_ELO[relacao]?.[direcao] || '';
}

// Direção oposta — usada pelo painel derivado (elosDerivados em
// editor.js) pra mostrar o rótulo certo do lado que ainda não foi
// cadastrado manualmente. Valores vazios/desconhecidos passam direto,
// sem inventar uma direção que não existe.
export function direcaoInversa(direcao) {
    if (direcao === 'origem') return 'destino';
    if (direcao === 'destino') return 'origem';
    return direcao;
}

// Sugestões de autocompletar pra Intertextualidade (campo Texto):
// várias entradas de intertexto — de poemas diferentes, às vezes tipos
// diferentes — costumam repetir a mesma referência (a mesma conversa, o
// mesmo livro), daí o autocompletar evitar redigitar/variar a grafia.
// Mesma lógica de extração de extrairValoresUnicosDeAnotacoes, só que
// sobre `intertextualidade` em vez de `anotacoesMarginais`.
export function extrairValoresUnicosDeIntertextualidade(poemas) {
    const valores = new Set();
    poemas.forEach((p) => {
        if (Array.isArray(p.intertextualidade)) {
            p.intertextualidade.forEach((it) => {
                if (it && it.texto) valores.add(it.texto);
            });
        }
    });
    return Array.from(valores).sort();
}

// Sugestões de autocompletar pras Anotações Marginais (Posição e Fonte):
// diferente de Pessoas/Sinalizações, não são strings separadas por vírgula
// dentro do poema — cada poema tem uma lista de objetos
// { trecho, posicao, fonte, texto } (ver criarListaDeEntradas em editor.js),
// então extraímos o valor de `campo` de cada anotação de cada poema.
export function extrairValoresUnicosDeAnotacoes(poemas, campo) {
    const valores = new Set();
    poemas.forEach((p) => {
        if (Array.isArray(p.anotacoesMarginais)) {
            p.anotacoesMarginais.forEach((a) => {
                if (a && a[campo]) valores.add(a[campo]);
            });
        }
    });
    return Array.from(valores).sort();
}

// Retorna array [livroSeq, nivel, parteSeq, secaoSeq] para ordenação hierárquica.
// Usado por render.js para ordenar seções e elementos.
export function getElementHierarchy(el, db) {
    let livroSeq = 9999,
        parteSeq = 9999,
        secaoSeq = 9999,
        nivel = 9;

    if (el.paiTipo === 'livro') {
        const l = db.livros.find((x) => x.id == el.paiId);
        livroSeq = parseInt(l?.sequencia) || 9999;
        nivel = 1;
    } else if (el.paiTipo === 'parte') {
        const p = db.partes.find((x) => x.id == el.paiId);
        if (p) {
            parteSeq = parseInt(p.sequencia) || 9999;
            const l = db.livros.find((x) => x.id == p.livroId);
            livroSeq = parseInt(l?.sequencia) || 9999;
            nivel = 2;
        }
    } else if (el.paiTipo === 'secao') {
        const s = db.secoes.find((x) => x.id == el.paiId);
        if (s) {
            secaoSeq = parseInt(s.sequencia) || 9999;
            nivel = 3;
            if (s.paiTipo === 'parte') {
                const p = db.partes.find((x) => x.id == s.paiId);
                if (p) {
                    parteSeq = parseInt(p.sequencia) || 9999;
                    const l = db.livros.find((x) => x.id == p.livroId);
                    livroSeq = parseInt(l?.sequencia) || 9999;
                }
            } else {
                const l = db.livros.find((x) => x.id == s.paiId);
                livroSeq = parseInt(l?.sequencia) || 9999;
            }
        }
    }

    return [livroSeq, nivel, parteSeq, secaoSeq];
}
