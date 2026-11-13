const { query } = require('./db');

/**
 * Catalogo dos jogos exibidos na tela "Meu Progresso".
 * A ordem aqui e a ordem usada na resposta da API.
 */
const GAME_CATALOG = [
  { key: 'sequencia', name: 'Sequência Lógica' },
  { key: 'memoria', name: 'Jogo da Memória' },
  { key: 'deducao', name: 'Dedução Lógica' },
];

const GAME_KEYS = new Set(GAME_CATALOG.map((game) => game.key));
const MAX_QUESTIONS = 100;
const MAX_DURATION_SECONDS = 24 * 60 * 60; // 24h

function toInteger(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : NaN;
}

function parseOptionalDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Valida o payload de uma partida concluida.
 * Retorna { errors, session } — session com os valores normalizados.
 */
function validateSession(body) {
  const { gameKey, totalQuestions, correctAnswers, durationSeconds, startedAt } = body || {};
  const errors = [];

  if (!GAME_KEYS.has(gameKey)) {
    errors.push('Jogo inválido.');
  }

  const total = toInteger(totalQuestions);
  if (!Number.isInteger(total) || total < 1 || total > MAX_QUESTIONS) {
    errors.push(`O total de questões deve estar entre 1 e ${MAX_QUESTIONS}.`);
  }

  const correct = toInteger(correctAnswers);
  if (!Number.isInteger(correct) || correct < 0) {
    errors.push('O número de acertos não pode ser negativo.');
  } else if (Number.isInteger(total) && correct > total) {
    errors.push('O número de acertos não pode ser maior que o total de questões.');
  }

  const duration = toInteger(durationSeconds);
  if (duration !== null && (!Number.isInteger(duration) || duration < 0 || duration > MAX_DURATION_SECONDS)) {
    errors.push('Duração inválida.');
  }

  return {
    errors,
    session: {
      gameKey,
      totalQuestions: total,
      correctAnswers: correct,
      durationSeconds: Number.isInteger(duration) ? duration : null,
      startedAt: parseOptionalDate(startedAt),
    },
  };
}

/**
 * POST /progress/sessions (protegido por authenticateJWT)
 * Registra uma partida concluida do usuario autenticado.
 */
async function createSession(req, res) {
  const { errors, session } = validateSession(req.body);

  if (errors.length > 0) {
    return res.status(400).json({ error: errors[0], details: errors });
  }

  const { rows } = await query(
    `INSERT INTO game_sessions
       (user_id, game_key, total_questions, correct_answers, duration_seconds, started_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, game_key, total_questions, correct_answers,
               duration_seconds, started_at, finished_at`,
    [
      req.user.id,
      session.gameKey,
      session.totalQuestions,
      session.correctAnswers,
      session.durationSeconds,
      session.startedAt,
    ]
  );

  const row = rows[0];
  return res.status(201).json({
    session: {
      id: row.id,
      gameKey: row.game_key,
      totalQuestions: row.total_questions,
      correctAnswers: row.correct_answers,
      durationSeconds: row.duration_seconds,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
    },
  });
}

/**
 * GET /progress (protegido por authenticateJWT)
 * Resumo agregado das partidas do usuario autenticado.
 */
async function summary(req, res) {
  const [summaryResult, gamesResult] = await Promise.all([
    query(
      `SELECT count(*)::int                    AS total_sessions,
              sum(correct_answers)::int        AS total_correct,
              sum(total_questions)::int        AS total_questions
         FROM game_sessions
        WHERE user_id = $1`,
      [req.user.id]
    ),
    query(
      `SELECT game_key,
              count(*)::int AS sessions,
              sum(correct_answers)::int AS correct_answers,
              sum(total_questions)::int AS total_questions
         FROM game_sessions
        WHERE user_id = $1
        GROUP BY game_key`,
      [req.user.id]
    ),
  ]);

  const totals = summaryResult.rows[0] || {
    total_sessions: 0,
    total_correct: 0,
    total_questions: 0,
  };

  const byGame = new Map(gamesResult.rows.map((row) => [row.game_key, row]));

  const games = GAME_CATALOG.map((game) => {
    const row = byGame.get(game.key);
    const questions = row?.total_questions || 0;
    const correct = row?.correct_answers || 0;

    return {
      key: game.key,
      name: game.name,
      sessions: row?.sessions || 0,
      accuracy: questions > 0 ? Math.round((correct / questions) * 100) : 0,
    };
  });

  const totalQuestions = totals.total_questions || 0;
  const totalCorrect = totals.total_correct || 0;

  return res.status(200).json({
    summary: {
      totalSessions: totals.total_sessions || 0,
      overallAccuracy:
        totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
    },
    games,
  });
}

module.exports = {
  createSession,
  summary,
  GAME_CATALOG,
};
