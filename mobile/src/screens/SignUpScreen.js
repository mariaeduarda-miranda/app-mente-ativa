import React, { useState } from 'react';
import { StatusBar, Platform, Alert, ActivityIndicator } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { registerUser } from '../services/api';
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
  SubmitButton,
  SubmitButtonText,
  FooterContainer,
  FooterText,
  SignUpLink,
} from '../components/authStyles';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD_LENGTH = 8;

/**
 * Tela de Cadastro do Mente Ativa.
 *
 * Cria a conta via POST /register e, em caso de sucesso, o App.js ja
 * persiste a sessao retornada (token + usuario).
 */
export default function SignUpScreen({ onBackPress, onSignUpSuccess, onNavigateToLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (name.trim().length < 2) {
      return 'Informe seu nome (mínimo de 2 caracteres).';
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      return 'Informe um e-mail válido.';
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return `A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`;
    }
    if (password !== confirmPassword) {
      return 'As senhas não conferem.';
    }
    return null;
  };

  const handleSignUp = async () => {
    const validationError = validate();
    if (validationError) {
      Alert.alert('Atenção', validationError);
      return;
    }

    try {
      setLoading(true);

      const data = await registerUser({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      if (!data?.token || !data?.user) {
        throw new Error('O servidor não retornou uma sessão válida.');
      }

      onSignUpSuccess?.(data);
    } catch (error) {
      console.error('Erro durante o cadastro:', error);
      Alert.alert(
        'Não foi possível criar a conta',
        error.message || 'Tente novamente em instantes.'
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
          <TopBackBar>
            <BackButton
              onPress={onBackPress || onNavigateToLogin}
              activeOpacity={0.7}
              accessibilityLabel="Voltar"
              accessibilityRole="button"
            >
              <Feather name="arrow-left" size={24} color="#0f4c5c" />
            </BackButton>
          </TopBackBar>

          <HeaderContainer>
            <LogoCircle>
              <MaterialCommunityIcons name="spa" size={38} color="#ffffff" />
            </LogoCircle>

            <AppTitle>Criar conta</AppTitle>
            <AppSubtitle>Comece seus treinos cognitivos hoje</AppSubtitle>
          </HeaderContainer>

          <Card>
            <FieldGroup>
              <FieldLabel>Nome</FieldLabel>
              <InputWrapper>
                <Feather name="user" size={20} color="#7b8794" />
                <InputField
                  placeholder="Como podemos te chamar?"
                  placeholderTextColor="#a0b0b9"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!loading}
                />
              </InputWrapper>
            </FieldGroup>

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
                  placeholder="Mínimo de 8 caracteres"
                  placeholderTextColor="#a0b0b9"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  editable={!loading}
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
            </FieldGroup>

            <FieldGroup>
              <FieldLabel>Confirmar senha</FieldLabel>
              <InputWrapper>
                <Feather name="lock" size={20} color="#7b8794" />
                <InputField
                  placeholder="Repita a senha"
                  placeholderTextColor="#a0b0b9"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  onSubmitEditing={handleSignUp}
                />
              </InputWrapper>

              <InfoNotice>
                <Feather name="info" size={15} color="#556570" />
                <InfoNoticeText>
                  Use pelo menos {MIN_PASSWORD_LENGTH} caracteres. Evite dados óbvios como
                  seu nome ou data de nascimento.
                </InfoNoticeText>
              </InfoNotice>
            </FieldGroup>

            <SubmitButton
              onPress={handleSignUp}
              disabled={loading}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Criar conta"
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <SubmitButtonText>Criar conta</SubmitButtonText>
              )}
            </SubmitButton>
          </Card>

          <FooterContainer>
            <FooterText>
              Já tem uma conta?{' '}
              <SignUpLink onPress={onNavigateToLogin || onBackPress}>
                Entrar
              </SignUpLink>
            </FooterText>
          </FooterContainer>
        </ScrollContainer>
      </KeyboardWrapper>
    </Container>
  );
}
