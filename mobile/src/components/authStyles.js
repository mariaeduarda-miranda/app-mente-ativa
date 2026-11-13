import { Platform, StatusBar } from 'react-native';
import styled from 'styled-components/native';

/* ========================================================
   Estilos compartilhados das telas de autenticação
   (Login e Cadastro) — identidade visual do Mente Ativa:
   fundo #f3f8fa, azul-petróleo #0f4c5c, cards brancos.
   ======================================================== */

export const Container = styled.SafeAreaView`
  flex: 1;
  background-color: #f3f8fa;
  padding-top: ${Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0}px;
`;

export const TopBackBar = styled.View`
  width: 100%;
  max-width: 380px;
  flex-direction: row;
  justify-content: flex-start;
  margin-bottom: 8px;
`;

export const BackButton = styled.TouchableOpacity`
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background-color: #ffffff;
  align-items: center;
  justify-content: center;
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

export const KeyboardWrapper = styled.KeyboardAvoidingView`
  flex: 1;
`;

export const ScrollContainer = styled.ScrollView.attrs({
  contentContainerStyle: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  showsVerticalScrollIndicator: false,
})`
  flex: 1;
`;

export const HeaderContainer = styled.View`
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
`;

export const LogoCircle = styled.View`
  width: 72px;
  height: 72px;
  border-radius: 36px;
  background-color: #0f4c5c;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
  ${Platform.OS === 'ios'
    ? `
      shadow-color: #0f4c5c;
      shadow-offset: 0px 4px;
      shadow-opacity: 0.25;
      shadow-radius: 8px;
    `
    : `
      elevation: 4;
    `}
`;

export const AppTitle = styled.Text`
  font-size: 28px;
  font-weight: 800;
  color: #0f4c5c;
  margin-bottom: 6px;
  letter-spacing: -0.4px;
`;

export const AppSubtitle = styled.Text`
  font-size: 16px;
  color: #556570;
  font-weight: 400;
  text-align: center;
`;

export const Card = styled.View`
  width: 100%;
  max-width: 380px;
  background-color: #ffffff;
  border-radius: 24px;
  padding: 28px 22px;
  ${Platform.OS === 'ios'
    ? `
      shadow-color: #000000;
      shadow-offset: 0px 4px;
      shadow-opacity: 0.08;
      shadow-radius: 12px;
    `
    : `
      elevation: 4;
    `}
`;

export const FieldGroup = styled.View`
  margin-bottom: 18px;
`;

export const FieldLabel = styled.Text`
  font-size: 15.5px;
  font-weight: 700;
  color: #1a2730;
  margin-bottom: 8px;
`;

export const InputWrapper = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: #edf4f8;
  border-radius: 14px;
  padding: 0 14px;
  height: 54px;
`;

export const InputField = styled.TextInput`
  flex: 1;
  font-size: 15px;
  color: #1a2730;
  margin-left: 10px;
  height: 100%;
`;

export const TogglePasswordButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  background-color: #dce7ee;
  border-radius: 10px;
  padding: 6px 10px;
  margin-left: 6px;
`;

export const TogglePasswordText = styled.Text`
  font-size: 13px;
  font-weight: 700;
  color: #0f4c5c;
  margin-left: 4px;
`;

export const InfoNotice = styled.View`
  flex-direction: row;
  align-items: center;
  margin-top: 10px;
  padding-horizontal: 2px;
`;

export const InfoNoticeText = styled.Text`
  flex: 1;
  font-size: 13px;
  line-height: 18px;
  color: #4a5b67;
  margin-left: 8px;
`;

export const RememberMeRow = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  margin-top: 8px;
  margin-bottom: 18px;
  padding-vertical: 4px;
`;

export const Checkbox = styled.View`
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background-color: ${({ isChecked }) => (isChecked ? '#0f4c5c' : '#ffffff')};
  border-width: ${({ isChecked }) => (isChecked ? '0px' : '2px')};
  border-color: #0f4c5c;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
`;

export const RememberMeText = styled.Text`
  font-size: 15px;
  font-weight: 600;
  color: #1a2730;
`;

export const ForgotPasswordButton = styled.TouchableOpacity`
  align-self: flex-start;
  margin-bottom: 24px;
  padding-vertical: 4px;
`;

export const ForgotPasswordText = styled.Text`
  font-size: 14.5px;
  font-weight: 700;
  color: #0f4c5c;
  text-decoration-line: underline;
`;

export const SubmitButton = styled.TouchableOpacity`
  background-color: #0f4c5c;
  height: 54px;
  border-radius: 14px;
  align-items: center;
  justify-content: center;
  width: 100%;
  opacity: ${({ disabled }) => (disabled ? 0.7 : 1)};
  ${Platform.OS === 'ios'
    ? `
      shadow-color: #0f4c5c;
      shadow-offset: 0px 4px;
      shadow-opacity: 0.3;
      shadow-radius: 6px;
    `
    : `
      elevation: 4;
    `}
`;

export const SubmitButtonText = styled.Text`
  color: #ffffff;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.2px;
`;

export const FooterContainer = styled.View`
  margin-top: 24px;
  align-items: center;
  justify-content: center;
`;

export const FooterText = styled.Text`
  font-size: 15px;
  color: #4a5b67;
  text-align: center;
`;

export const SignUpLink = styled.Text`
  font-size: 15px;
  font-weight: 700;
  color: #0f4c5c;
  text-decoration-line: underline;
`;
