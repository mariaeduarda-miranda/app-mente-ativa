import React from 'react';
import {
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import styled from 'styled-components/native';
import {
  Feather,
  Ionicons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import BottomNavigation from '../components/BottomNavigation';

export default function HomeScreen({
  userName = 'visitante',
  profileImageUrl = null,
  isAuthenticated = false,
  onStartPress,
  onNotificationPress,
  onProfilePress,
  onNavigateTab,
}) {
  const handleDefaultStart = () => {
    if (onStartPress) {
      onStartPress();
    } else {
      Alert.alert('Mente Ativa', 'Iniciando as atividades de hoje!');
    }
  };

  return (
    <Container>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f8fa" />

      <Header>
        <HeaderLeft>
          <BrandIconBox>
            <MaterialCommunityIcons
              name="head-cog-outline"
              size={24}
              color="#ffffff"
            />
          </BrandIconBox>
          <HeaderTitle>Início</HeaderTitle>
        </HeaderLeft>

        <HeaderRight>
          <IconButton
            onPress={onNotificationPress || (() => Alert.alert('Notificações', 'Você não possui novos avisos.'))}
            activeOpacity={0.7}
            accessibilityLabel="Notificações"
            accessibilityRole="button"
          >
            <Feather name="bell" size={23} color="#1b2a32" />
          </IconButton>

          <ProfileButton
            onPress={onProfilePress || (() => Alert.alert('Perfil', `Perfil de ${userName}`))}
            activeOpacity={0.8}
            accessibilityLabel="Perfil do usuário"
            accessibilityRole="button"
          >
            <ProfileCircle>
              {profileImageUrl ? (
                <ProfileImage source={{ uri: profileImageUrl }} resizeMode="cover" />
              ) : (
                <Ionicons name="person" size={17} color="#ffffff" />
              )}
            </ProfileCircle>
          </ProfileButton>
        </HeaderRight>
      </Header>

      <ContentScrollView>
        <CenterContainer>
          <OuterCircle>
            <InnerCircle>
              <LogoBadgeContainer>
                <MaterialCommunityIcons
                  name="spa"
                  size={36}
                  color="#0f4c5c"
                />
                <LogoDotAccent />
              </LogoBadgeContainer>
            </InnerCircle>
          </OuterCircle>

          <BrandBadge>
            <BrandBadgeText>MENTE ATIVA</BrandBadgeText>
          </BrandBadge>

          <GreetingTitle>Olá, {userName}!</GreetingTitle>

          <WelcomeMessage>
            Seja bem-vindo(a) ao seu espaço seguro e sereno. Aqui você exercita sua
            mente com calma, tranquilidade e no seu próprio ritmo, sem pressa e
            com todo o cuidado.
          </WelcomeMessage>

          <MainActionButton
            onPress={handleDefaultStart}
            activeOpacity={0.85}
            accessibilityLabel={isAuthenticated ? 'Continuar' : 'Entrar e começar'}
            accessibilityRole="button"
          >
            <MainActionButtonText>
              {isAuthenticated ? 'Continuar' : 'Entrar e começar'}
            </MainActionButtonText>
            <ArrowIcon
              name="arrow-right"
              size={22}
              color="#ffffff"
            />
          </MainActionButton>
        </CenterContainer>
      </ContentScrollView>

      {isAuthenticated && (
        <BottomNavigation activeTab="inicio" onNavigateTab={onNavigateTab} />
      )}
    </Container>
  );
}


export const Container = styled.SafeAreaView`
  flex: 1;
  background-color: #f3f8fa;
  padding-top: ${Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0}px;
`;

export const ContentScrollView = styled.ScrollView.attrs({
  contentContainerStyle: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  showsVerticalScrollIndicator: false,
})`
  flex: 1;
`;


export const Header = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background-color: transparent;
`;

export const HeaderLeft = styled.View`
  flex-direction: row;
  align-items: center;
`;

export const BrandIconBox = styled.View`
  width: 44px;
  height: 44px;
  background-color: #0f4c5c;
  border-radius: 14px;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  ${Platform.OS === 'ios'
    ? `
      shadow-color: #0f4c5c;
      shadow-offset: 0px 2px;
      shadow-opacity: 0.2;
      shadow-radius: 4px;
    `
    : `
      elevation: 3;
    `}
`;

export const HeaderTitle = styled.Text`
  font-size: 21px;
  font-weight: 700;
  color: #1a2730;
  letter-spacing: -0.3px;
`;

export const HeaderRight = styled.View`
  flex-direction: row;
  align-items: center;
`;

export const IconButton = styled.TouchableOpacity`
  padding: 8px;
  margin-right: 6px;
`;

export const ProfileButton = styled.TouchableOpacity`
  padding: 4px;
`;

export const ProfileCircle = styled.View`
  width: 38px;
  height: 38px;
  border-radius: 19px;
  background-color: #0f4c5c;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

export const ProfileImage = styled.Image`
  width: 100%;
  height: 100%;
`;


export const CenterContainer = styled.View`
  align-items: center;
  justify-content: center;
  width: 100%;
`;

export const OuterCircle = styled.View`
  width: 140px;
  height: 140px;
  border-radius: 70px;
  background-color: #e3eff4;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
`;

export const InnerCircle = styled.View`
  width: 104px;
  height: 104px;
  border-radius: 52px;
  background-color: #ffffff;
  align-items: center;
  justify-content: center;
  border-width: 1.5px;
  border-color: #d2e7ee;
`;

export const LogoBadgeContainer = styled.View`
  align-items: center;
  justify-content: center;
  position: relative;
`;

export const LogoDotAccent = styled.View`
  width: 6px;
  height: 6px;
  border-radius: 3px;
  background-color: #7bb0a6;
  position: absolute;
  top: 4px;
`;

export const BrandBadge = styled.View`
  background-color: #e1f0f5;
  padding: 6px 16px;
  border-radius: 20px;
  margin-bottom: 16px;
`;

export const BrandBadgeText = styled.Text`
  font-size: 12.5px;
  font-weight: 700;
  color: #0f4c5c;
  letter-spacing: 1.1px;
`;

export const GreetingTitle = styled.Text`
  font-size: 27px;
  font-weight: 800;
  color: #1a2730;
  text-align: center;
  margin-bottom: 14px;
  letter-spacing: -0.5px;
`;

export const WelcomeMessage = styled.Text`
  font-size: 15.5px;
  line-height: 24px;
  color: #4a5b67;
  text-align: center;
  padding: 0 12px;
  margin-bottom: 32px;
  font-weight: 400;
`;

export const MainActionButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  background-color: #0f4c5c;
  padding: 16px 28px;
  border-radius: 14px;
  width: 100%;
  max-width: 340px;
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

export const MainActionButtonText = styled.Text`
  color: #ffffff;
  font-size: 17px;
  font-weight: 700;
  margin-right: 6px;
`;

export const ArrowIcon = styled(Feather)`
  margin-left: 4px;
`;
