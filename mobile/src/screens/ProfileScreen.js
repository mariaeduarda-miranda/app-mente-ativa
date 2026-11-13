import React, { useState } from 'react';
import { StatusBar, Platform, Alert, ActivityIndicator, Linking } from 'react-native';
import styled from 'styled-components/native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  updateProfile,
  changePassword,
  uploadAvatar,
  removeAvatar,
  resolveAssetUrl,
} from '../services/api';
import {
  FieldGroup,
  FieldLabel,
  InputWrapper,
  InputField,
  SubmitButton,
  SubmitButtonText,
} from '../components/authStyles';
import BottomNavigation from '../components/BottomNavigation';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD_LENGTH = 8;

const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

/** Formata a data de criação da conta como "março de 2026". */
function formatMemberSince(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${MONTHS[date.getMonth()]} de ${date.getFullYear()}`;
}

/**
 * Tela de Perfil do Mente Ativa.
 *
 * Exibe os dados do usuário autenticado e permite atualizar nome, e-mail e
 * senha (PUT /me e PUT /me/password). Também concentra a saída da conta.
 *
 * @param {Object} props
 * @param {Object} props.user - Usuário da sessão atual
 * @param {string} props.token - Token JWT da sessão
 * @param {Function} [props.onSessionUpdated] - Recebe a sessão renovada
 * @param {Function} [props.onLogout] - Encerra a sessão
 * @param {Function} [props.onBackPress] - Volta para a Home
 * @param {Function} [props.onNavigateTab] - Navegação da barra inferior
 * @param {'inicio'|'jogos'|'progresso'|'perfil'} [props.activeTab='perfil']
 */
export default function ProfileScreen({
  user,
  token,
  onSessionUpdated,
  onLogout,
  onBackPress,
  onNavigateTab,
  activeTab = 'perfil',
}) {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);

  const memberSince = formatMemberSince(user?.createdAt);
  const avatarUri = resolveAssetUrl(user?.avatarUrl);
  const avatarBusy = uploadingAvatar || removingAvatar;

  const handleSaveProfile = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (trimmedName.length < 2) {
      Alert.alert('Atenção', 'Informe seu nome (mínimo de 2 caracteres).');
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      Alert.alert('Atenção', 'Informe um e-mail válido.');
      return;
    }

    const unchanged =
      trimmedName === (user?.name || '') &&
      trimmedEmail.toLowerCase() === String(user?.email || '').toLowerCase();

    if (unchanged) {
      Alert.alert('Tudo certo', 'Nenhuma alteração para salvar.');
      return;
    }

    try {
      setSavingProfile(true);
      const data = await updateProfile(token, {
        name: trimmedName,
        email: trimmedEmail,
      });

      if (!data?.user) {
        throw new Error('O servidor não retornou os dados atualizados.');
      }

      setName(data.user.name);
      setEmail(data.user.email);
      await onSessionUpdated?.(data);
      Alert.alert('Dados atualizados', 'Suas informações foram salvas com sucesso.');
    } catch (error) {
      Alert.alert(
        'Não foi possível salvar',
        error.message || 'Verifique os dados e tente novamente.'
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      Alert.alert('Atenção', 'Informe sua senha atual.');
      return;
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      Alert.alert(
        'Atenção',
        `A nova senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Atenção', 'As novas senhas não conferem.');
      return;
    }

    try {
      setSavingPassword(true);
      await changePassword(token, { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Senha atualizada', 'Sua nova senha já está valendo.');
    } catch (error) {
      Alert.alert(
        'Não foi possível alterar a senha',
        error.message || 'Confira a senha atual e tente novamente.'
      );
    } finally {
      setSavingPassword(false);
    }
  };

  const handlePickAvatar = async () => {
    if (avatarBusy) return;

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        if (!permission.canAskAgain) {
          Alert.alert(
            'Permissão necessária',
            'Para trocar a foto, libere o acesso à galeria nas configurações do aparelho.',
            [
              { text: 'Agora não', style: 'cancel' },
              { text: 'Abrir ajustes', onPress: () => Linking.openSettings() },
            ]
          );
          return;
        }

        Alert.alert(
          'Permissão necessária',
          'Precisamos do acesso à galeria para você escolher uma foto de perfil.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        exif: false,
      });

      if (result.canceled || !result.assets?.length) return;

      setUploadingAvatar(true);
      const data = await uploadAvatar(token, result.assets[0]);

      if (!data?.user) {
        throw new Error('O servidor não retornou os dados atualizados.');
      }

      await onSessionUpdated?.({ user: data.user });
      Alert.alert('Foto atualizada', 'Sua foto de perfil foi alterada com sucesso.');
    } catch (error) {
      Alert.alert(
        'Não foi possível atualizar a foto',
        error.message || 'Escolha outra imagem e tente novamente.'
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = () => {
    if (avatarBusy || !avatarUri) return;

    Alert.alert('Remover foto', 'Deseja voltar para o avatar padrão?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            setRemovingAvatar(true);
            const data = await removeAvatar(token);

            if (!data?.user) {
              throw new Error('O servidor não retornou os dados atualizados.');
            }

            await onSessionUpdated?.({ user: data.user });
            Alert.alert('Foto removida', 'Voltamos para o avatar padrão.');
          } catch (error) {
            Alert.alert(
              'Não foi possível remover a foto',
              error.message || 'Tente novamente em instantes.'
            );
          } finally {
            setRemovingAvatar(false);
          }
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Sair da conta', 'Deseja realmente desconectar?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: onLogout },
    ]);
  };

  return (
    <Container>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f8fa" />

      <KeyboardWrapper behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ContentScrollView>
          <Header>
            <BackButton
              onPress={onBackPress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Voltar para a tela inicial"
            >
              <Feather name="arrow-left" size={24} color="#0f4c5c" />
            </BackButton>
            <HeaderTitle>Perfil</HeaderTitle>
          </Header>

          {/* Dados resumidos da conta */}
          <HeroCard>
            <AvatarButton
              onPress={handlePickAvatar}
              disabled={avatarBusy}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Alterar foto de perfil"
            >
              <Avatar>
                {avatarUri ? (
                  <AvatarImage source={{ uri: avatarUri }} resizeMode="cover" />
                ) : (
                  <Feather name="user" size={40} color="#ffffff" />
                )}
              </Avatar>
              <AvatarBadge>
                {uploadingAvatar ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Feather name="camera" size={15} color="#ffffff" />
                )}
              </AvatarBadge>
            </AvatarButton>

            {avatarUri ? (
              <RemoveAvatarButton
                onPress={handleRemoveAvatar}
                disabled={avatarBusy}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Remover foto de perfil"
              >
                <Feather name="trash-2" size={13} color="#8a5a55" />
                <RemoveAvatarText>
                  {removingAvatar ? 'Removendo...' : 'Remover foto'}
                </RemoveAvatarText>
              </RemoveAvatarButton>
            ) : (
              <AvatarHint>Toque na foto para escolher uma imagem</AvatarHint>
            )}

            <HeroName>{user?.name || 'Usuário'}</HeroName>
            <HeroEmail>{user?.email || ''}</HeroEmail>
            {memberSince && (
              <MemberChip>
                <Feather name="calendar" size={14} color="#2f6b53" />
                <MemberChipText>Membro desde {memberSince}</MemberChipText>
              </MemberChip>
            )}
          </HeroCard>

          {/* Dados pessoais */}
          <SectionCard>
            <SectionTitle>Dados pessoais</SectionTitle>
            <SectionSubtitle>Atualize seu nome ou e-mail quando precisar.</SectionSubtitle>

            <FieldGroup>
              <FieldLabel>Nome</FieldLabel>
              <InputWrapper>
                <Feather name="user" size={20} color="#7b8794" />
                <InputField
                  placeholder="Seu nome"
                  placeholderTextColor="#a0b0b9"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  editable={!savingProfile}
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
                  editable={!savingProfile}
                />
              </InputWrapper>
            </FieldGroup>

            <SaveButton
              onPress={handleSaveProfile}
              disabled={savingProfile}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Salvar dados pessoais"
            >
              {savingProfile ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <SubmitButtonText>Salvar alterações</SubmitButtonText>
              )}
            </SaveButton>
          </SectionCard>

          {/* Alteração de senha */}
          <SectionCard>
            <PasswordHeader>
              <ViewFlex>
                <SectionTitle>Alterar senha</SectionTitle>
                <SectionSubtitle>
                  Use no mínimo {MIN_PASSWORD_LENGTH} caracteres.
                </SectionSubtitle>
              </ViewFlex>
              <ShowPasswordsButton
                onPress={() => setShowPasswords((current) => !current)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={showPasswords ? 'Ocultar senhas' : 'Mostrar senhas'}
              >
                <Feather
                  name={showPasswords ? 'eye-off' : 'eye'}
                  size={16}
                  color="#0f4c5c"
                />
                <ShowPasswordsText>
                  {showPasswords ? 'Ocultar' : 'Mostrar'}
                </ShowPasswordsText>
              </ShowPasswordsButton>
            </PasswordHeader>

            <FieldGroup>
              <FieldLabel>Senha atual</FieldLabel>
              <InputWrapper>
                <Feather name="lock" size={20} color="#7b8794" />
                <InputField
                  placeholder="Digite sua senha atual"
                  placeholderTextColor="#a0b0b9"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showPasswords}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="password"
                  editable={!savingPassword}
                />
              </InputWrapper>
            </FieldGroup>

            <FieldGroup>
              <FieldLabel>Nova senha</FieldLabel>
              <InputWrapper>
                <Feather name="lock" size={20} color="#7b8794" />
                <InputField
                  placeholder="Digite a nova senha"
                  placeholderTextColor="#a0b0b9"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPasswords}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  editable={!savingPassword}
                />
              </InputWrapper>
            </FieldGroup>

            <FieldGroup>
              <FieldLabel>Confirmar nova senha</FieldLabel>
              <InputWrapper>
                <Feather name="lock" size={20} color="#7b8794" />
                <InputField
                  placeholder="Repita a nova senha"
                  placeholderTextColor="#a0b0b9"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPasswords}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  editable={!savingPassword}
                />
              </InputWrapper>
            </FieldGroup>

            <SaveButton
              onPress={handleChangePassword}
              disabled={savingPassword}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Atualizar senha"
            >
              {savingPassword ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <SubmitButtonText>Atualizar senha</SubmitButtonText>
              )}
            </SaveButton>
          </SectionCard>

          <LogoutButton
            onPress={handleLogout}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Sair da conta"
          >
            <Feather name="log-out" size={20} color="#b3261e" />
            <LogoutText>Sair da conta</LogoutText>
          </LogoutButton>
        </ContentScrollView>
      </KeyboardWrapper>

      <BottomNavigation activeTab={activeTab} onNavigateTab={onNavigateTab} />
    </Container>
  );
}

/* ========================================================
   ESTILOS
   ======================================================== */

const Container = styled.SafeAreaView`
  flex: 1;
  background-color: #f3f8fa;
  padding-top: ${Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0}px;
`;

const KeyboardWrapper = styled.KeyboardAvoidingView`
  flex: 1;
`;

const ContentScrollView = styled.ScrollView.attrs({
  contentContainerStyle: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  showsVerticalScrollIndicator: false,
  keyboardShouldPersistTaps: 'handled',
})`
  flex: 1;
`;

const Header = styled.View`
  flex-direction: row;
  align-items: center;
  padding-vertical: 12px;
`;

const BackButton = styled.TouchableOpacity`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background-color: #ffffff;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  ${Platform.OS === 'ios'
    ? `
      shadow-color: #0f4c5c;
      shadow-offset: 0px 2px;
      shadow-opacity: 0.15;
      shadow-radius: 4px;
    `
    : `
      elevation: 2;
    `}
`;

const HeaderTitle = styled.Text`
  font-size: 21px;
  font-weight: 700;
  color: #1a2730;
  letter-spacing: -0.3px;
`;

const HeroCard = styled.View`
  background-color: #ffffff;
  border-radius: 20px;
  padding: 22px 18px;
  align-items: center;
  margin-bottom: 16px;
  ${Platform.OS === 'ios'
    ? `
      shadow-color: #000000;
      shadow-offset: 0px 2px;
      shadow-opacity: 0.06;
      shadow-radius: 8px;
    `
    : `
      elevation: 2;
    `}
`;

const AvatarButton = styled.TouchableOpacity`
  position: relative;
  margin-bottom: 8px;
`;

const Avatar = styled.View`
  width: 92px;
  height: 92px;
  border-radius: 46px;
  background-color: #0f4c5c;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-width: 3px;
  border-color: #e3eff4;
`;

const AvatarImage = styled.Image`
  width: 100%;
  height: 100%;
`;

const AvatarBadge = styled.View`
  position: absolute;
  right: 1px;
  bottom: 1px;
  width: 30px;
  height: 30px;
  border-radius: 15px;
  background-color: #2f6b53;
  border-width: 2.5px;
  border-color: #ffffff;
  align-items: center;
  justify-content: center;
`;

const AvatarHint = styled.Text`
  font-size: 12.5px;
  color: #7b8794;
  margin-top: 2px;
  margin-bottom: 12px;
`;

const RemoveAvatarButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  padding: 4px 8px;
  margin-top: 2px;
  margin-bottom: 10px;
`;

const RemoveAvatarText = styled.Text`
  font-size: 12.5px;
  font-weight: 600;
  color: #8a5a55;
  margin-left: 4px;
`;

const HeroName = styled.Text`
  font-size: 22px;
  font-weight: 700;
  color: #1a2730;
  text-align: center;
  margin-bottom: 2px;
`;

const HeroEmail = styled.Text`
  font-size: 15px;
  color: #556570;
  text-align: center;
`;

const MemberChip = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: #dcefe4;
  border-radius: 999px;
  padding: 5px 12px;
  margin-top: 12px;
`;

const MemberChipText = styled.Text`
  font-size: 13px;
  font-weight: 600;
  color: #2f6b53;
  margin-left: 6px;
`;

const SectionCard = styled.View`
  background-color: #ffffff;
  border-radius: 20px;
  border-width: 1px;
  border-color: #e3edf2;
  padding: 20px 16px;
  margin-bottom: 16px;
`;

const SectionTitle = styled.Text`
  font-size: 18px;
  font-weight: 700;
  color: #1a2730;
  letter-spacing: -0.2px;
`;

const SectionSubtitle = styled.Text`
  font-size: 14px;
  line-height: 20px;
  color: #556570;
  margin-top: 2px;
  margin-bottom: 16px;
`;

const PasswordHeader = styled.View`
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
`;

const ViewFlex = styled.View`
  flex: 1;
  margin-right: 8px;
`;

const ShowPasswordsButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  background-color: #e6eff3;
  border-radius: 10px;
  padding: 6px 10px;
  margin-top: 2px;
`;

const ShowPasswordsText = styled.Text`
  font-size: 13px;
  font-weight: 700;
  color: #0f4c5c;
  margin-left: 4px;
`;

const SaveButton = styled(SubmitButton)`
  margin-top: 4px;
`;

const LogoutButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  background-color: #ffffff;
  border-width: 1.5px;
  border-color: #f0c9c6;
  height: 52px;
  border-radius: 14px;
  margin-bottom: 8px;
`;

const LogoutText = styled.Text`
  font-size: 16px;
  font-weight: 700;
  color: #b3261e;
  margin-left: 8px;
`;
