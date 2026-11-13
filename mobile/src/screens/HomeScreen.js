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

/**
 * Componente: HomeScreen
 *
 * Tela Inicial (Início) do aplicativo "Mente Ativa".
 * Desenvolvida com styled-components/native, com foco em acolhimento,
 * usabilidade clara e tranquilidade para o estímulo cognitivo e bem-estar.
 *
 * @param {Object} props
 * @param {string} [props.userName='visitante'] - Nome para a saudação
 * @param {boolean} [props.isAuthenticated=false] - Indica se há sessão ativa
 * @param {Function} [props.onStartPress] - Ação ao clicar em 'Entrar e começar'
 * @param {Function} [props.onNotificationPress] - Ação para o ícone de notificações
 * @param {Function} [props.onProfilePress] - Ação para o ícone de perfil
 * @param {Function} [props.onNavigateTab] - Navegação da barra inferior
 */
export default function HomeScreen({
  userName = 'visitante',
  isAuthenticated = false,
  onStartPress,
  onNotificationPress,
  onProfilePress,
  onNavigateTab,
}) {
  // Ação padrão do botão principal
  const handleDefaultStart = () => {
    if (onStartPress) {
      onStartPress();
    } else {
      Alert.alert('Mente Ativa', 'Iniciando as atividades de hoje!');
    }
  };

  return (
    // Container principal com área segura
    <Container>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f8fa" />

      {/* ========================================================
          1. CABEÇALHO SUPERIOR (TOP BAR)
          ======================================================== */}
      <Header>
        {/* Lado Esquerdo: Marca estilizada + Título 'Início' */}
        <HeaderLeft>
          {/* Caixa quadrada com cantos arredondados e cor azul-petróleo */}
          <BrandIconBox>
            <MaterialCommunityIcons
              name="head-cog-outline"
              size={24}
              color="#ffffff"
            />
          </BrandIconBox>
          <HeaderTitle>Início</HeaderTitle>
        </HeaderLeft>

        {/* Lado Direito: Botão de Notificação e Botão de Perfil */}
        <HeaderRight>
          {/* Botão de notificações */}
          <IconButton
            onPress={onNotificationPress || (() => Alert.alert('Notificações', 'Você não possui novos avisos.'))}
            activeOpacity={0.7}
            accessibilityLabel="Notificações"
            accessibilityRole="button"
          >
            <Feather name="bell" size={23} color="#1b2a32" />
          </IconButton>

          {/* Botão de perfil do usuário */}
          <ProfileButton
            onPress={onProfilePress || (() => Alert.alert('Perfil', `Perfil de ${userName}`))}
            activeOpacity={0.8}
            accessibilityLabel="Perfil do usuário"
            accessibilityRole="button"
          >
            <ProfileCircle>
              <Ionicons name="person" size={17} color="#ffffff" />
            </ProfileCircle>
          </ProfileButton>
        </HeaderRight>
      </Header>

      {/* ========================================================
          2. SEÇÃO CENTRAL DE BOAS-VINDAS
          ======================================================== */}
      <ContentScrollView>
        <CenterContainer>
          {/* Ilustração central: Círculo externo suave */}
          <OuterCircle>
            {/* Círculo interno branco com borda delicada */}
            <InnerCircle>
              {/* Emblema central de mente serena */}
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

          {/* Tag de Marca 'MENTE ATIVA' */}
          <BrandBadge>
            <BrandBadgeText>MENTE ATIVA</BrandBadgeText>
          </BrandBadge>

          {/* Título de saudação principal */}
          <GreetingTitle>Olá, {userName}!</GreetingTitle>

          {/* Mensagem de acolhimento e apoio */}
          <WelcomeMessage>
            Seja bem-vindo(a) ao seu espaço seguro e sereno. Aqui você exercita sua
            mente com calma, tranquilidade e no seu próprio ritmo, sem pressa e
            com todo o cuidado.
          </WelcomeMessage>

          {/* Botão Principal de Ação ('Entrar e começar →' ou 'Continuar →') */}
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

      {/* Barra inferior apenas para usuários autenticados */}
      {isAuthenticated && (
        <BottomNavigation activeTab="inicio" onNavigateTab={onNavigateTab} />
      )}
    </Container>
  );
}

/* ========================================================
   DECLARAÇÃO DOS COMPONENTES COM STYLED-COMPONENTS/NATIVE
   ======================================================== */

/**
 * Container principal da aplicação:
 * Utiliza SafeAreaView para respeitar os entalhes de tela (notch)
 * e aplica a cor de fundo azul-gelo suave (#f3f8fa).
 */
export const Container = styled.SafeAreaView`
  flex: 1;
  background-color: #f3f8fa;
  padding-top: ${Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0}px;
`;

/**
 * ScrollView para o conteúdo central:
 * Permite rolagem suave em telas menores mantendo o conteúdo centralizado.
 */
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

// --------------------------------------------------------
// Cabeçalho (Top Bar)
// --------------------------------------------------------

/**
 * Barra superior horizontal com espaçamento uniforme entre os cantos.
 */
export const Header = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background-color: transparent;
`;

/**
 * Lado esquerdo do cabeçalho contendo a caixa do logo e o título.
 */
export const HeaderLeft = styled.View`
  flex-direction: row;
  align-items: center;
`;

/**
 * Caixa quadrada de fundo azul-petróleo (#0f4c5c) com bordas arredondadas e sombra.
 */
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

/**
 * Texto do título 'Início' em negrito.
 */
export const HeaderTitle = styled.Text`
  font-size: 21px;
  font-weight: 700;
  color: #1a2730;
  letter-spacing: -0.3px;
`;

/**
 * Lado direito do cabeçalho agrupando notificações e perfil.
 */
export const HeaderRight = styled.View`
  flex-direction: row;
  align-items: center;
`;

/**
 * Botão clicável para o ícone de sininho/notificações.
 */
export const IconButton = styled.TouchableOpacity`
  padding: 8px;
  margin-right: 6px;
`;

/**
 * Botão clicável para a foto/avatar do usuário.
 */
export const ProfileButton = styled.TouchableOpacity`
  padding: 4px;
`;

/**
 * Círculo azul-petróleo com ícone do usuário em branco centralizado.
 */
export const ProfileCircle = styled.View`
  width: 38px;
  height: 38px;
  border-radius: 19px;
  background-color: #0f4c5c;
  align-items: center;
  justify-content: center;
`;

// --------------------------------------------------------
// Seção Central de Boas-Vindas
// --------------------------------------------------------

/**
 * Container que agrupa e centraliza vertical e horizontalmente a seção de acolhimento.
 */
export const CenterContainer = styled.View`
  align-items: center;
  justify-content: center;
  width: 100%;
`;

/**
 * Círculo externo em azul suave (#e3eff4) que emoldura o emblema.
 */
export const OuterCircle = styled.View`
  width: 140px;
  height: 140px;
  border-radius: 70px;
  background-color: #e3eff4;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
`;

/**
 * Círculo interno branco com borda suave (#d2e7ee) para destaque do logo.
 */
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

/**
 * Container posicionador do emblema de flor/mente.
 */
export const LogoBadgeContainer = styled.View`
  align-items: center;
  justify-content: center;
  position: relative;
`;

/**
 * Ponto verde suave decorativo no topo do emblema central.
 */
export const LogoDotAccent = styled.View`
  width: 6px;
  height: 6px;
  border-radius: 3px;
  background-color: #7bb0a6;
  position: absolute;
  top: 4px;
`;

/**
 * Pílula/Badge da marca com fundo azul claríssimo (#e1f0f5).
 */
export const BrandBadge = styled.View`
  background-color: #e1f0f5;
  padding: 6px 16px;
  border-radius: 20px;
  margin-bottom: 16px;
`;

/**
 * Texto da tag 'MENTE ATIVA' em caixa alta e espaçado.
 */
export const BrandBadgeText = styled.Text`
  font-size: 12.5px;
  font-weight: 700;
  color: #0f4c5c;
  letter-spacing: 1.1px;
`;

/**
 * Saudação em destaque principal.
 */
export const GreetingTitle = styled.Text`
  font-size: 27px;
  font-weight: 800;
  color: #1a2730;
  text-align: center;
  margin-bottom: 14px;
  letter-spacing: -0.5px;
`;

/**
 * Mensagem carinhosa de acolhimento com alta legibilidade e espaçamento entre linhas.
 */
export const WelcomeMessage = styled.Text`
  font-size: 15.5px;
  line-height: 24px;
  color: #4a5b67;
  text-align: center;
  padding: 0 12px;
  margin-bottom: 32px;
  font-weight: 400;
`;

/**
 * Botão principal de ação 'Entrar e começar →' na cor azul-petróleo com cantos arredondados.
 */
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

/**
 * Texto em branco e negrito dentro do botão principal.
 */
export const MainActionButtonText = styled.Text`
  color: #ffffff;
  font-size: 17px;
  font-weight: 700;
  margin-right: 6px;
`;

/**
 * Ícone estilizado da seta à direita no botão de ação.
 */
export const ArrowIcon = styled(Feather)`
  margin-left: 4px;
`;
