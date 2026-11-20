

const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'mente-ativa-jwt-super-secret-key-2026';


const authController = {
  login: async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: 'Método não permitido. Utilize o método POST.',
      });
    }

    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'E-mail (ou nome de usuário) e senha são obrigatórios.',
        });
      }

      const trimmedInput = email.trim();
      const normalizedEmail = trimmedInput.includes('@')
        ? trimmedInput.toLowerCase()
        : `${trimmedInput.toLowerCase().replace(/\s+/g, '.')}@menteativa.com`;

      const specialCharRegex = /[@#\$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
      if (!specialCharRegex.test(password)) {
        return res.status(400).json({
          error: 'A senha deve conter ao menos um caractere especial (@, #).',
        });
      }

      let userRecord;

      try {
        userRecord = await admin.auth().getUserByEmail(normalizedEmail);
      } catch (authError) {
        if (authError.code === 'auth/user-not-found') {
          const displayName = trimmedInput.includes('@')
            ? trimmedInput.split('@')[0]
            : trimmedInput;

          userRecord = await admin.auth().createUser({
            email: normalizedEmail,
            displayName: displayName.charAt(0).toUpperCase() + displayName.slice(1),
            password: password.length >= 6 ? password : `${password}123!`,
          });
        } else {
          console.error('Erro ao consultar Firebase Auth:', authError);
          return res.status(401).json({
            error: 'Credenciais inválidas. Verifique seu e-mail e senha.',
          });
        }
      }

      if (userRecord.disabled) {
        return res.status(403).json({
          error: 'Esta conta de usuário foi temporariamente desativada.',
        });
      }

      const payload = {
        uid: userRecord.uid,
        email: userRecord.email,
        name: userRecord.displayName || 'Maria',
        iss: 'mente-ativa-firebase-backend',
      };

      const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: '7d',
      });

      return res.status(200).json({
        token: token,
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          name: userRecord.displayName || 'Maria',
        },
      });
    } catch (error) {
      console.error('Erro no processamento do login:', error);
      return res.status(500).json({
        error: 'Ocorreu um erro interno ao processar a autenticação.',
        details: error.message,
      });
    }
  },

  verifyToken: async (req, res) => {
    try {
      let token = null;

      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split('Bearer ')[1].trim();
      } else if (req.body && req.body.token) {
        token = req.body.token.trim();
      }

      if (!token) {
        return res.status(401).json({
          valid: false,
          error: 'Nenhum token JWT foi fornecido para validação.',
        });
      }

      const decoded = jwt.verify(token, JWT_SECRET);

      return res.status(200).json({
        valid: true,
        user: {
          uid: decoded.uid,
          email: decoded.email,
          name: decoded.name || 'Maria',
        },
      });
    } catch (error) {
      return res.status(401).json({
        valid: false,
        error: 'Token JWT inválido ou expirado.',
      });
    }
  },
};

module.exports = authController;
