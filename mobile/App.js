import React, { useState, useEffect, useCallback } from 'react';
import { Alert, ActivityIndicator, StatusBar } from 'react-native';
import styled from 'styled-components/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import GamesScreen from './src/screens/GamesScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SequenceGameScreen from './src/screens/SequenceGameScreen';
import MemoryGameScreen from './src/screens/MemoryGameScreen';
import DeductionGameScreen from './src/screens/DeductionGameScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import { loadSession, saveSession, clearSession } from './src/services/session';
import { verifyToken } from './src/services/api';

/**
 * Componente principal (App.js)
 *
 * Fluxo de navegacao:
 * - Inicia na HomeScreen (visual acolhedor).
 * - "Entrar e comecar" leva ao Login (ou direto para as atividades, se logado).
 * - Login valida as credenciais na API (Express + PostgreSQL + JWT).
 * - "Criar conta" leva a SignUpScreen.
 * - Perfil permite atualizar nome, e-mail e senha (PUT /me e /me/password).
 * - Jogos abre a Sequência Lógica, o Jogo da Memória e a Dedução Lógica.
 * - O Progresso mostra as partidas concluídas do usuário autenticado.
 * - Ao abrir o app, a sessao salva e revalidada no backend.
 */
export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Home');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [restoringSession, setRestoringSession] = useState(true);

  const restoreSession = useCallback(async () => {
    try {
      const { token: storedToken, user: cachedUser } = await loadSession();

      if (!storedToken) {
        setUser(null);
        setToken(null);
        return;
      }

      setToken(storedToken);

      try {
        const data = await verifyToken(storedToken);
        const freshUser = data?.user || cachedUser;
        if (freshUser) {
          setUser(freshUser);
          await saveSession({ token: storedToken, user: freshUser });
        }
      } catch (error) {
        // Token invalido/expirado ou conta desativada: encerra a sessao local.
        if (error?.status === 401 || error?.status === 403) {
          await clearSession();
          setUser(null);
          setToken(null);
        } else {
          // API indisponivel: mantem os dados em cache para nao deslogar sem motivo.
          setUser(cachedUser || null);
        }
      }
    } catch (error) {
      console.warn('Nao foi possivel restaurar a sessao:', error.message);
    } finally {
      setRestoringSession(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const handleAuthenticated = async ({ token: sessionToken, user: authenticatedUser }) => {
    await saveSession({ token: sessionToken, user: authenticatedUser });
    setToken(sessionToken);
    setUser(authenticatedUser);
    setCurrentScreen('Home');
    Alert.alert(
      'Bem-vindo(a)!',
      `Login realizado com sucesso. Olá, ${authenticatedUser?.name || 'visitante'}!`
    );
  };

  const handleLogout = async () => {
    await clearSession();
    setUser(null);
    setToken(null);
    setCurrentScreen('Home');
    Alert.alert('Sessão encerrada', 'Você foi desconectado com sucesso.');
  };

  /**
   * Aplica a sessão renovada devolvida pela API após editar o perfil.
   */
  const handleSessionUpdated = async ({ token: nextToken, user: nextUser }) => {
    const updatedUser = nextUser || user;

    setUser(updatedUser);
    if (nextToken) setToken(nextToken);

    try {
      await saveSession({ token: nextToken || token, user: updatedUser });
    } catch (error) {
      console.warn('Não foi possível salvar a sessão atualizada:', error.message);
    }
  };

  const handleProfilePress = () => {
    if (!user) {
      setCurrentScreen('Login');
      return;
    }

    setCurrentScreen('Profile');
  };

  const handleStartPress = () => {
    if (user) {
      setCurrentScreen('Games');
      return;
    }
    setCurrentScreen('Login');
  };

  const handleGamePress = (game) => {
    if (!user) {
      Alert.alert(
        'Entre para jogar',
        'Faça login para salvar seu progresso nos treinos cognitivos.',
        [
          { text: 'Agora não', style: 'cancel' },
          { text: 'Entrar', onPress: () => setCurrentScreen('Login') },
        ]
      );
      return;
    }

    if (game?.key === 'sequencia') {
      setCurrentScreen('SequenceGame');
      return;
    }

    if (game?.key === 'memoria') {
      setCurrentScreen('MemoryGame');
      return;
    }

    if (game?.key === 'deducao') {
      setCurrentScreen('DeductionGame');
      return;
    }

    Alert.alert(
      game?.title || 'Jogo',
      'Este jogo estará disponível em breve. Continue acompanhando!'
    );
  };

  const handleNavigateTab = (tab) => {
    if (tab === 'inicio') {
      setCurrentScreen('Home');
      return;
    }

    if (tab === 'jogos') {
      setCurrentScreen('Games');
      return;
    }

    if (tab === 'perfil') {
      setCurrentScreen(user ? 'Profile' : 'Login');
      return;
    }

    setCurrentScreen(user ? 'Progress' : 'Login');
  };

  if (restoringSession) {
    return (
      <SplashContainer>
        <StatusBar barStyle="dark-content" backgroundColor="#f3f8fa" />
        <SplashLogo>
          <MaterialCommunityIcons name="spa" size={40} color="#ffffff" />
        </SplashLogo>
        <SplashTitle>Mente Ativa</SplashTitle>
        <ActivityIndicator color="#0f4c5c" style={{ marginTop: 16 }} />
      </SplashContainer>
    );
  }

  if (currentScreen === 'SignUp') {
    return (
      <SignUpScreen
        onBackPress={() => setCurrentScreen('Login')}
        onSignUpSuccess={handleAuthenticated}
        onNavigateToLogin={() => setCurrentScreen('Login')}
      />
    );
  }

  if (currentScreen === 'Login') {
    return (
      <LoginScreen
        onBackPress={() => setCurrentScreen('Home')}
        onLoginSuccess={handleAuthenticated}
        onNavigateToSignUp={() => setCurrentScreen('SignUp')}
        onForgotPassword={() =>
          Alert.alert(
            'Recuperar Senha',
            'A recuperação de senha por e-mail será implementada em breve.'
          )
        }
      />
    );
  }

  if (currentScreen === 'Profile' && user) {
    return (
      <ProfileScreen
        user={user}
        token={token}
        onSessionUpdated={handleSessionUpdated}
        onLogout={handleLogout}
        onBackPress={() => setCurrentScreen('Home')}
        onNavigateTab={handleNavigateTab}
      />
    );
  }

  if (currentScreen === 'SequenceGame' && user) {
    return (
      <SequenceGameScreen token={token} onBack={() => setCurrentScreen('Games')} />
    );
  }

  if (currentScreen === 'MemoryGame' && user) {
    return (
      <MemoryGameScreen token={token} onBack={() => setCurrentScreen('Games')} />
    );
  }

  if (currentScreen === 'DeductionGame' && user) {
    return (
      <DeductionGameScreen token={token} onBack={() => setCurrentScreen('Games')} />
    );
  }

  if (currentScreen === 'Progress' && user) {
    return (
      <ProgressScreen
        token={token}
        user={user}
        onNavigateTab={handleNavigateTab}
      />
    );
  }

  if (currentScreen === 'Games') {
    return (
      <GamesScreen
        activeTab="jogos"
        onGamePress={handleGamePress}
        onNavigateTab={handleNavigateTab}
      />
    );
  }

  return (
    <HomeScreen
      userName={user?.name || 'visitante'}
      isAuthenticated={Boolean(user)}
      onStartPress={handleStartPress}
      onProfilePress={handleProfilePress}
      onNavigateTab={handleNavigateTab}
      onNotificationPress={() =>
        Alert.alert('Notificações', 'Você não possui novas mensagens no momento.')
      }
    />
  );
}

const SplashContainer = styled.SafeAreaView`
  flex: 1;
  background-color: #f3f8fa;
  align-items: center;
  justify-content: center;
`;

const SplashLogo = styled.View`
  width: 84px;
  height: 84px;
  border-radius: 42px;
  background-color: #0f4c5c;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
`;

const SplashTitle = styled.Text`
  font-size: 26px;
  font-weight: 800;
  color: #0f4c5c;
  letter-spacing: -0.4px;
`;
