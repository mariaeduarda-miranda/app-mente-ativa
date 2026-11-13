import React, { useState, useEffect, useCallback } from 'react';
import { Alert, ActivityIndicator, StatusBar } from 'react-native';
import styled from 'styled-components/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
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
 * - Ao abrir o app, a sessao salva e revalidada no backend.
 */
export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Home');
  const [user, setUser] = useState(null);
  const [restoringSession, setRestoringSession] = useState(true);

  const restoreSession = useCallback(async () => {
    try {
      const { token, user: cachedUser } = await loadSession();

      if (!token) {
        setUser(null);
        return;
      }

      try {
        const data = await verifyToken(token);
        const freshUser = data?.user || cachedUser;
        if (freshUser) {
          setUser(freshUser);
          await saveSession({ token, user: freshUser });
        }
      } catch (error) {
        // Token invalido/expirado ou conta desativada: encerra a sessao local.
        if (error?.status === 401 || error?.status === 403) {
          await clearSession();
          setUser(null);
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

  const handleAuthenticated = async ({ token, user: authenticatedUser }) => {
    await saveSession({ token, user: authenticatedUser });
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
    setCurrentScreen('Home');
    Alert.alert('Sessão encerrada', 'Você foi desconectado com sucesso.');
  };

  const handleProfilePress = () => {
    if (!user) {
      setCurrentScreen('Login');
      return;
    }

    Alert.alert(
      'Perfil do Usuário',
      `Conectado como: ${user.name || user.email}\nE-mail: ${user.email}`,
      [
        { text: 'Fechar', style: 'cancel' },
        { text: 'Desconectar', style: 'destructive', onPress: handleLogout },
      ]
    );
  };

  const handleStartPress = () => {
    if (user) {
      Alert.alert('Mente Ativa', 'Suas atividades cognitivas estarão disponíveis em breve.');
      return;
    }
    setCurrentScreen('Login');
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

  return (
    <HomeScreen
      userName={user?.name || 'visitante'}
      isAuthenticated={Boolean(user)}
      onStartPress={handleStartPress}
      onProfilePress={handleProfilePress}
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
