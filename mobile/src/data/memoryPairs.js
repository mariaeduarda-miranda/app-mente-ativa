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

export const MEMORY_ROUND_PAIRS = 4;

function shuffle(items) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapWith]] = [copy[swapWith], copy[index]];
  }

  return copy;
}

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
