/**
 * Banco de pares do "Jogo da Memória".
 *
 * Cada rodada sorteia 4 pares (8 cartas) e embaralha o tabuleiro, conforme
 * definido em buildMemoryBoard(). Os ícones são nomes do
 * MaterialCommunityIcons (@expo/vector-icons).
 */
export const MEMORY_PAIRS = [
  { id: 'flor', label: 'Flor', icon: 'flower' },
  { id: 'sol', label: 'Sol', icon: 'white-balance-sunny' },
  { id: 'estrela', label: 'Estrela', icon: 'star-four-points' },
  { id: 'folha', label: 'Folha', icon: 'leaf' },
  { id: 'lua', label: 'Lua', icon: 'moon-waning-crescent' },
  { id: 'coracao', label: 'Coração', icon: 'heart' },
  { id: 'borboleta', label: 'Borboleta', icon: 'butterfly' },
  { id: 'passaro', label: 'Pássaro', icon: 'bird' },
];

/** Quantidade de pares por rodada (4 pares = 8 cartas). */
export const MEMORY_ROUND_PAIRS = 4;

function shuffle(items) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapWith]] = [copy[swapWith], copy[index]];
  }

  return copy;
}

/**
 * Monta o tabuleiro: sorteia os pares, duplica cada um e embaralha as cartas.
 * Cada carta recebe um `cardId` único para controlar as viradas.
 */
export function buildMemoryBoard(size = MEMORY_ROUND_PAIRS) {
  const total = Math.min(size, MEMORY_PAIRS.length);

  const cards = shuffle(MEMORY_PAIRS)
    .slice(0, total)
    .flatMap((pair) => [
      { ...pair, cardId: `${pair.id}-a` },
      { ...pair, cardId: `${pair.id}-b` },
    ]);

  return shuffle(cards);
}
