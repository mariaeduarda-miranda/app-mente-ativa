import React, { useEffect, useState } from 'react';
import { StatusBar, Platform, Alert, ActivityIndicator } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { loginUser } from '../services/api';
import { getRememberMe, setRememberMe } from '../services/session';
import {
  Container,
  KeyboardWrapper,
  ScrollContainer,
  TopBackBar,
  BackButton,
  HeaderContainer,
  LogoCircle,
  AppTitle,
  AppSubtitle,
  Card,
  FieldGroup,
  FieldLabel,
  InputWrapper,
  InputField,
  TogglePasswordButton,
  TogglePasswordText,
  InfoNotice,
  InfoNoticeText,
  RememberMeRow,
  Checkbox,
  RememberMeText,
  ForgotPasswordButton,
  ForgotPasswordText,
  SubmitButton,
  SubmitButtonText,
  FooterContainer,
  FooterText,
  SignUpLink,
} from '../components/authStyles';

/**
 * Tela de Login do Mente Ativa.
 *
 * Integra com POST /login (Express + PostgreSQL + JWT). A senha e validada
 * no servidor com bcrypt; aqui apenas verificamos se os campos foram
 * preenchidos. Política de senha e responsabilidade do cadastro.
 */
export default function LoginScreen({
  navigation,
  onLoginSuccess,
  onNavigateToSignUp,
  onForgotPassword,
  onBackPress,
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMeChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  // Restaura o e-mail salvo pela opção "Lembrar de mim".
  useEffect(() => {
    let isActive = true;

    getRememberMe()
      .then(({ enabled, email: savedEmail }) => {
        if (!isActive) return;
        if (enabled) {
          setRememberMeChecked(true);
          if (savedEmail) setEmail(savedEmail);
        }
      })
      .catch(() => {});

    return () => {
      isActive = false;
    };
  }, []);

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Atenção', 'Por favor, informe seu e-mail de acesso.');
      return;
    }

    if (!password) {
      Alert.alert('Atenção', 'Por favor, digite sua senha.');
      return;
    }

    try {
      setLoading(true);

      const data = await loginUser(email, password);

      if (!data?.token || !data?.user) {
        throw new Error('O servidor não retornou uma sessão válida.');
      }

      await setRememberMe(email.trim(), rememberMe);

      // O App.js persiste a sessão e atualiza o estado global.
      onLoginSuccess?.(data);
    } catch (error) {
      console.error('Erro durante o login:', error);
      Alert.alert(
        'Não foi possível entrar',
        error.message || 'Verifique seus dados de acesso e tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f8fa" />

      <KeyboardWrapper behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollContainer>
          {(onBackPress || navigation?.goBack) && (
            <TopBackBar>
              <BackButton
                onPress={onBackPress || (() => navigation.goBack())}
                activeOpacity={0.7}
                accessibilityLabel="Voltar"
                accessibilityRole="button"
              >
                <Feather name="arrow-left" size={24} color="#0f4c5c" />
              </BackButton>
            </TopBackBar>
          )}

          <HeaderContainer>
            <LogoCircle>
              <MaterialCommunityIcons name="spa" size={38} color="#ffffff" />
            </LogoCircle>

            <AppTitle>Mente Ativa</AppTitle>
            <AppSubtitle>Acesse seus treinos cognitivos</AppSubtitle>
          </HeaderContainer>

          <Card>
            <FieldGroup>
              <FieldLabel>E-mail</FieldLabel>
              <InputWrapper>
                <Feather name="mail" size={20} color="#7b8794" />
                <InputField
                  placeholder="seu@email.com"
                  placeholderTextColor="#a0b0b9"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  editable={!loading}
                />
              </InputWrapper>
            </FieldGroup>

            <FieldGroup>
              <FieldLabel>Senha</FieldLabel>
              <InputWrapper>
                <Feather name="lock" size={20} color="#7b8794" />
                <InputField
                  placeholder="Digite sua senha"
                  placeholderTextColor="#a0b0b9"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="password"
                  editable={!loading}
                  onSubmitEditing={handleLogin}
                />
                <TogglePasswordButton
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                  accessibilityLabel={showPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  <Feather
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={16}
                    color="#0f4c5c"
                  />
                  <TogglePasswordText>Ver</TogglePasswordText>
                </TogglePasswordButton>
              </InputWrapper>

              <InfoNotice>
                <Feather name="info" size={15} color="#556570" />
                <InfoNoticeText>Use o mesmo e-mail informado no cadastro.</InfoNoticeText>
              </InfoNotice>
            </FieldGroup>

            <RememberMeRow
              onPress={() => setRememberMeChecked(!rememberMe)}
              activeOpacity={0.8}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: rememberMe }}
              accessibilityLabel="Lembrar de mim"
            >
              <Checkbox isChecked={rememberMe}>
                {rememberMe && <Feather name="check" size={16} color="#ffffff" />}
              </Checkbox>
              <RememberMeText>Lembrar de mim</RememberMeText>
            </RememberMeRow>

            <ForgotPasswordButton
              onPress={
                onForgotPassword ||
                (() =>
                  Alert.alert(
                    'Recuperar Senha',
                    'A recuperação de senha será implementada em breve.'
                  ))
              }
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <ForgotPasswordText>Esqueci minha senha</ForgotPasswordText>
            </ForgotPasswordButton>

            <SubmitButton
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Entrar"
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <SubmitButtonText>Entrar</SubmitButtonText>
              )}
            </SubmitButton>
          </Card>

          <FooterContainer>
            <FooterText>
              Não tem uma conta?{' '}
              <SignUpLink
                onPress={
                  onNavigateToSignUp ||
                  (() =>
                    Alert.alert('Criar Conta', 'Abra a tela de cadastro para criar sua conta.'))
                }
              >
                Criar conta
              </SignUpLink>
            </FooterText>
          </FooterContainer>
        </ScrollContainer>
      </KeyboardWrapper>
    </Container>
  );
}
