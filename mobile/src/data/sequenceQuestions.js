/**
 * Banco de sequências lógicas do jogo "Sequência Lógica".
 *
 * Cada partida sorteia 10 perguntas sem repetição e embaralha as opções,
 * conforme definido em buildSequenceRound().
 */
export const SEQUENCE_QUESTIONS = [
  {
    id: 'q01',
    sequence: [2, 4, 6, 8],
    options: [9, 10, 11, 12],
    answer: 10,
    explanation: 'A sequência avança de 2 em 2.',
    hint: 'Some 2 ao último número.',
  },
  {
    id: 'q02',
    sequence: [5, 10, 15, 20],
    options: [22, 24, 25, 30],
    answer: 25,
    explanation: 'A sequência avança de 5 em 5.',
    hint: 'Some 5 ao número 20.',
  },
  {
    id: 'q03',
    sequence: [1, 2, 4, 8],
    options: [10, 12, 16, 20],
    answer: 16,
    explanation: 'Cada número é o dobro do anterior.',
    hint: 'Dobre o número 8.',
  },
  {
    id: 'q04',
    sequence: [20, 17, 14, 11],
    options: [7, 8, 9, 10],
    answer: 8,
    explanation: 'A sequência diminui de 3 em 3.',
    hint: 'Tire 3 do número 11.',
  },
  {
    id: 'q05',
    sequence: [1, 4, 9, 16],
    options: [20, 24, 25, 36],
    answer: 25,
    explanation: 'São os quadrados: 1, 4, 9, 16 e 25 (5 × 5).',
    hint: 'O próximo é 5 × 5.',
  },
  {
    id: 'q06',
    sequence: [3, 6, 12, 24],
    options: [30, 36, 42, 48],
    answer: 48,
    explanation: 'Cada número é o dobro do anterior.',
    hint: 'Dobre o número 24.',
  },
  {
    id: 'q07',
    sequence: [2, 3, 5, 8, 13],
    options: [18, 20, 21, 24],
    answer: 21,
    explanation: 'Cada número é a soma dos dois anteriores (8 + 13 = 21).',
    hint: 'Some 8 + 13.',
  },
  {
    id: 'q08',
    sequence: [100, 90, 80, 70],
    options: [50, 55, 60, 65],
    answer: 60,
    explanation: 'A sequência diminui de 10 em 10.',
    hint: 'Tire 10 do número 70.',
  },
  {
    id: 'q09',
    sequence: [1, 3, 5, 7],
    options: [8, 9, 10, 11],
    answer: 9,
    explanation: 'São os números ímpares, avançando de 2 em 2.',
    hint: 'Some 2 ao número 7.',
  },
  {
    id: 'q10',
    sequence: [10, 9, 7, 4],
    options: [0, 1, 2, 3],
    answer: 0,
    explanation: 'As subtrações crescem: −1, −2, −3 e agora −4.',
    hint: 'Tire 4 do número 4.',
  },
  {
    id: 'q11',
    sequence: [4, 8, 12, 16],
    options: [18, 19, 20, 24],
    answer: 20,
    explanation: 'A sequência avança de 4 em 4.',
    hint: 'Some 4 ao número 16.',
  },
  {
    id: 'q12',
    sequence: [81, 27, 9, 3],
    options: [0, 1, 2, 3],
    answer: 1,
    explanation: 'Cada número é dividido por 3.',
    hint: 'Divida 3 por 3.',
  },
  {
    id: 'q13',
    sequence: [2, 5, 10, 17],
    options: [24, 25, 26, 30],
    answer: 26,
    explanation: 'As diferenças são +3, +5, +7 e agora +9.',
    hint: 'Some 9 ao número 17.',
  },
  {
    id: 'q14',
    sequence: [1, 1, 2, 3, 5],
    options: [6, 7, 8, 10],
    answer: 8,
    explanation: 'Cada número é a soma dos dois anteriores (3 + 5 = 8).',
    hint: 'Some 3 + 5.',
  },
  {
    id: 'q15',
    sequence: [6, 12, 18, 24],
    options: [28, 29, 30, 36],
    answer: 30,
    explanation: 'A sequência avança de 6 em 6.',
    hint: 'Some 6 ao número 24.',
  },
  {
    id: 'q16',
    sequence: [7, 14, 21, 28],
    options: [32, 34, 35, 42],
    answer: 35,
    explanation: 'A sequência avança de 7 em 7.',
    hint: 'Some 7 ao número 28.',
  },
  {
    id: 'q17',
    sequence: [50, 45, 40, 35],
    options: [25, 28, 30, 32],
    answer: 30,
    explanation: 'A sequência diminui de 5 em 5.',
    hint: 'Tire 5 do número 35.',
  },
  {
    id: 'q18',
    sequence: [1, 8, 27, 64],
    options: [100, 121, 125, 216],
    answer: 125,
    explanation: 'São os cubos: 1, 8, 27, 64 e 125 (5 × 5 × 5).',
    hint: 'O próximo é 5 × 5 × 5.',
  },
  {
    id: 'q19',
    sequence: [9, 18, 27, 36],
    options: [40, 44, 45, 54],
    answer: 45,
    explanation: 'A sequência avança de 9 em 9.',
    hint: 'Some 9 ao número 36.',
  },
  {
    id: 'q20',
    sequence: [3, 9, 27, 81],
    options: [162, 200, 243, 324],
    answer: 243,
    explanation: 'Cada número é multiplicado por 3.',
    hint: 'Multiplique 81 por 3.',
  },
];

/** Quantidade de perguntas em cada partida. */
export const ROUND_SIZE = 10;

function shuffle(items) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapWith]] = [copy[swapWith], copy[index]];
  }

  return copy;
}

/**
 * Monta uma partida: sorteia as perguntas e embaralha as opções de cada uma.
 */
export function buildSequenceRound(size = ROUND_SIZE) {
  const total = Math.min(size, SEQUENCE_QUESTIONS.length);

  return shuffle(SEQUENCE_QUESTIONS)
    .slice(0, total)
    .map((question) => ({
      ...question,
      options: shuffle(question.options),
    }));
}
