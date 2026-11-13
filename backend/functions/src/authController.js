//SEPARAR O CADASTRO DO LOGIN
//O login deve apenas autenticar uma conta existente!!!


const admin = require('firebase-admin');
const jwt = require('jsonwebtoken'); //permite gerar e verificar tokens JWT

// Chave secreta para assinatura e verificação dos tokens JWT
const JWT_SECRET = process.env.JWT_SECRET || 'mente-ativa-jwt-super-secret-key-2026'; //precisa ser retirada
//do código depois, pois não pode ficar amostra em um ambiente de produção. 
//O ideal é utilizar um segredo configurado de maneira segura no ambiente do Firebase.


/**
 * Controller de Autenticação - authController.js
 *
 * Responsável pelo fluxo de autenticação e comunicação das Cloud Functions:
 * 1. login: Recebe { email, password }, valida com Firebase Admin SDK / Auth e gera Token JWT.
 * 2. verifyToken: Valida se o Token JWT é autêntico e não está expirado.
 */
const authController = {
  /**
   * Rota HTTP /login (POST)
   * Recebe no body: { email, password }
   * Retorna: res.status(200).json({ token: "SEU_JWT_TOKEN", user: { uid, email } })
   */
  login: async (req, res) => {
    // Permite apenas requisições do tipo POST
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: 'Método não permitido. Utilize o método POST.',
      });
    }

    try {
      const { email, password } = req.body; // -> desestruturação de objetos

      // 1. Validação dos campos obrigatórios
      if (!email || !password) {
        return res.status(400).json({
          error: 'E-mail (ou nome de usuário) e senha são obrigatórios.',
        });
      }

      // Normaliza o e-mail (caso o usuário informe nome de usuário sem '@', converte para formato de e-mail válido)
      const trimmedInput = email.trim();
      const normalizedEmail = trimmedInput.includes('@')
        ? trimmedInput.toLowerCase()
        : `${trimmedInput.toLowerCase().replace(/\s+/g, '.')}@menteativa.com`;

      // 2. Validação da regra da senha (mínimo de 1 caractere especial: @, #)
      const specialCharRegex = /[@#\$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
      if (!specialCharRegex.test(password)) {
        return res.status(400).json({
          error: 'A senha deve conter ao menos um caractere especial (@, #).',
        });
      }

      let userRecord; // -> localizar o usuário não significa validar sua senha

      // 3. Validação das credenciais com o Firebase Admin SDK / Firebase Auth
      try {
        // Tenta localizar o usuário existente pelo e-mail no Firebase Auth
        userRecord = await admin.auth().getUserByEmail(normalizedEmail); // -> getUserByEmail verificar se o e-mail
        //existe no Firebase Auth, não verifica se a senha digitada é a correta
        // -> Isso significa que, atualmente, seu código pode permitir que alguém obtenha um token JWT apenas informando 
        //o e-mail de uma conta existente, mesmo sem fornecer a senha correta.
      } catch (authError) {
        // Se o usuário ainda não existir no Firebase Auth, cria a conta no primeiro acesso (desenvolvimento/teste)
        if (authError.code === 'auth/user-not-found') {  // -> Se o usuário não existir, o sistema cria uma conta automaticamente durante o login.
          // Se a senha tiver menos de seis caracteres, o sistema modifica a senha enviada, acrescentando 123!.
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

      // 4. Verificação de conta desativada
      if (userRecord.disabled) {
        return res.status(403).json({
          error: 'Esta conta de usuário foi temporariamente desativada.',
        });
      }

      // 5. Geração do Token JWT personalizado contendo os dados básicos do usuário (uid, email)
      const payload = {
        uid: userRecord.uid,
        email: userRecord.email,
        name: userRecord.displayName || 'Maria', // -> nome fixo, retirar. 
        // Podemos utilizar um nome genérico ou buscar o nome cadastrado pelo usuário.
        iss: 'mente-ativa-firebase-backend',
      };

      const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: '7d', // Validade de 7 dias
      });

      // 6. Retorno padronizado com Token JWT e dados do usuário (uid, email)
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

  /**
   * Rota HTTP /verifyToken (POST ou GET)
   * Valida a integridade e expiração de um Token JWT enviado no Header Authorization ou Body
   */
  verifyToken: async (req, res) => {
    try {
      let token = null;

      // Obtém o token do cabeçalho Authorization: Bearer <token>
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

      // Verifica o token usando a chave secreta
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
