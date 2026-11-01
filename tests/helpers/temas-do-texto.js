// Nomes dos Temas de um texto como "a, b" (principal, secundário, sem papel),
// lidos por id, como o app faz. Os testes usam isto no lugar do campo antigo
// `sinalizacoesTema`, que não existe mais (Fase 2, Etapa 5).
import { nomesTemasDoTexto } from '../../js/utils.js';

export function nomesDosTemas(item, dbRef) {
    return nomesTemasDoTexto(item, dbRef.temas).join(', ');
}

// Texto de teste com Temas por id já resolvidos no cadastro `dbRef`:
// `entradas` = ['Amor', { nome: 'Saudade', papel: 'principal' }, ...].
export function temasPorNome(dbRef, entradas) {
    if (!Array.isArray(dbRef.temas)) dbRef.temas = [];
    return entradas.map((e) => {
        const nome = typeof e === 'string' ? e : e.nome;
        const papel = typeof e === 'string' ? '' : e.papel || '';
        let tema = dbRef.temas.find((t) => t.nome === nome);
        if (!tema) {
            tema = {
                id: dbRef.temas.reduce((m, t) => Math.max(m, Number(t.id) || 0), 0) + 1,
                nome,
                notas: '',
            };
            dbRef.temas.push(tema);
        }
        return { temaId: tema.id, papel };
    });
}
