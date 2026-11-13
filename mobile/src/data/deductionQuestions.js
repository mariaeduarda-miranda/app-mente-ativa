/**
 * Banco de enigmas do jogo "Dedução Lógica".
 *
 * Cada partida sorteia 5 enigmas sem repetição e embaralha as opções,
 * conforme definido em buildDeductionRound(). Nos textos das pistas, o trecho
 * entre **asteriscos** é destacado em negrito na tela.
 */
export const DEDUCTION_QUESTIONS = [
  {
    id: 'd01',
    question: 'Quem é a pessoa mais alta?',
    clues: [
      '**Carlos** é mais alto que Marcos.',
      '**Marcos** é mais alto que Lucas.',
    ],
    options: ['Carlos', 'Marcos', 'Lucas'],
    answer: 'Carlos',
    explanation:
      'Carlos é mais alto que Marcos, e Marcos é mais alto que Lucas. Logo, Carlos é o mais alto.',
  },
  {
    id: 'd02',
    question: 'Quem chegou primeiro?',
    clues: [
      '**Ana** chegou antes de Bruno.',
      '**Bruno** chegou antes de Carla.',
    ],
    options: ['Ana', 'Bruno', 'Carla'],
    answer: 'Ana',
    explanation:
      'Ana chegou antes de Bruno, que chegou antes de Carla. Então Ana foi a primeira.',
  },
  {
    id: 'd03',
    question: 'Qual animal é o mais pesado?',
    clues: [
      'O **cachorro** é mais pesado que o gato.',
      'O **gato** é mais pesado que o coelho.',
    ],
    options: ['Cachorro', 'Gato', 'Coelho'],
    answer: 'Cachorro',
    explanation:
      'O cachorro pesa mais que o gato, e o gato pesa mais que o coelho. Portanto, o cachorro é o mais pesado.',
  },
  {
    id: 'd04',
    question: 'Quem tem a maior idade?',
    clues: [
      '**Rita** é mais velha que Paulo.',
      '**Paulo** é mais velho que Sofia.',
    ],
    options: ['Rita', 'Paulo', 'Sofia'],
    answer: 'Rita',
    explanation:
      'Rita é mais velha que Paulo, e Paulo é mais velho que Sofia. Logo, Rita tem a maior idade.',
  },
  {
    id: 'd05',
    question: 'Qual fruta recebeu mais votos?',
    clues: [
      'A **maçã** recebeu mais votos que a banana.',
      'A **banana** recebeu mais votos que a uva.',
    ],
    options: ['Maçã', 'Banana', 'Uva'],
    answer: 'Maçã',
    explanation:
      'A maçã ficou à frente da banana, que ficou à frente da uva. Então a maçã recebeu mais votos.',
  },
  {
    id: 'd06',
    question: 'Quem mora mais longe da escola?',
    clues: [
      '**Júlia** mora mais longe que Pedro.',
      '**Pedro** mora mais longe que Alice.',
    ],
    options: ['Júlia', 'Pedro', 'Alice'],
    answer: 'Júlia',
    explanation:
      'Júlia mora mais longe que Pedro, que mora mais longe que Alice. Portanto, Júlia mora mais longe de todas.',
  },
  {
    id: 'd07',
    question: 'Quem terminou a prova primeiro?',
    clues: [
      '**Miguel** terminou antes de Clara.',
      '**Clara** terminou antes de Tiago.',
    ],
    options: ['Miguel', 'Clara', 'Tiago'],
    answer: 'Miguel',
    explanation:
      'Miguel terminou antes de Clara, que terminou antes de Tiago. Logo, Miguel terminou primeiro.',
  },
  {
    id: 'd08',
    question: 'Qual carro é o mais rápido?',
    clues: [
      'O **carro azul** é mais rápido que o vermelho.',
      'O **carro vermelho** é mais rápido que o branco.',
    ],
    options: ['Azul', 'Vermelho', 'Branco'],
    answer: 'Azul',
    explanation:
      'O carro azul é mais rápido que o vermelho, que é mais rápido que o branco. Então o azul é o mais rápido.',
  },
  {
    id: 'd09',
    question: 'Quem acordou mais cedo?',
    clues: [
      '**Nina** acordou antes de Otávio.',
      '**Otávio** acordou antes de Vera.',
    ],
    options: ['Nina', 'Otávio', 'Vera'],
    answer: 'Nina',
    explanation:
      'Nina acordou antes de Otávio, que acordou antes de Vera. Portanto, Nina acordou mais cedo.',
  },
  {
    id: 'd10',
    question: 'Qual planta cresceu mais?',
    clues: [
      'A **samambaia** cresceu mais que a suculenta.',
      'A **suculenta** cresceu mais que o cacto.',
    ],
    options: ['Samambaia', 'Suculenta', 'Cacto'],
    answer: 'Samambaia',
    explanation:
      'A samambaia cresceu mais que a suculenta, que cresceu mais que o cacto. Logo, a samambaia cresceu mais.',
  },
  {
    id: 'd11',
    question: 'Quem leu mais páginas?',
    clues: [
      '**Lucas** leu mais páginas que Renata.',
      '**Renata** leu mais páginas que Fábio.',
    ],
    options: ['Lucas', 'Renata', 'Fábio'],
    answer: 'Lucas',
    explanation:
      'Lucas leu mais que Renata, e Renata leu mais que Fábio. Então Lucas leu mais páginas.',
  },
  {
    id: 'd12',
    question: 'Qual bebida está mais quente?',
    clues: [
      'O **chá** está mais quente que o café.',
      'O **café** está mais quente que o leite.',
    ],
    options: ['Chá', 'Café', 'Leite'],
    answer: 'Chá',
    explanation:
      'O chá está mais quente que o café, que está mais quente que o leite. Logo, o chá está mais quente.',
  },
];

/** Quantidade de enigmas por partida. */
export const DEDUCTION_ROUND_SIZE = 5;

function shuffle(items) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapWith]] = [copy[swapWith], copy[index]];
  }

  return copy;
}

/**
 * Monta uma partida: sorteia os enigmas e embaralha as opções de cada um.
 */
export function buildDeductionRound(size = DEDUCTION_ROUND_SIZE) {
  const total = Math.min(size, DEDUCTION_QUESTIONS.length);

  return shuffle(DEDUCTION_QUESTIONS)
    .slice(0, total)
    .map((item) => ({
      ...item,
      options: shuffle(item.options),
    }));
}
