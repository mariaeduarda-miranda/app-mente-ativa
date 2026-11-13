import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar, Platform, Alert } from 'react-native';
import styled from 'styled-components/native';
import * as Speech from 'expo-speech';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import BottomNavigation from '../components/BottomNavigation';

/**
 * Texto lido pelo guia de voz (mesmo conteúdo do protótipo).
 */
const VOICE_GUIDE_TEXT =
  'Tela de seleção de jogos. Opção um: Sequência Lógica, nível fácil. ' +
  'Descubra qual número ou padrão completa a sequência. ' +
  'Opção dois: Jogo da Memória, nível médio. Encontre os pares de figuras e exercite a recordação visual. ' +
  'Opção três: Dedução Lógica, nível médio. Leia as pistas com calma e descubra a resposta correta. ' +
  'Escolha tocando no botão do jogo desejado.';

/**
 * Jogos disponíveis. Cada item carrega também as cores do card para manter
 * a distinção visual entre as categorias (lógica, memória e atenção).
 */
const GAMES = [
  {
    key: 'sequencia',
    category: 'Lógica e Padrões',
    title: 'Sequência Lógica',
    difficulty: 'Fácil',
    description: 'Descubra o número ou padrão correto da sequência.',
    actionLabel: 'Jogar Sequência',
    icon: 'numeric-1-circle-outline',
    iconBackground: '#dcefe4',
    iconColor: '#2f6b53',
    categoryColor: '#2f6b53',
    badgeBackground: '#dcefe4',
    badgeColor: '#2f6b53',
  },
  {
    key: 'memoria',
    category: 'Recordação Visual',
    title: 'Jogo da Memória',
    difficulty: 'Médio',
    description: 'Encontre os pares de cartas correspondentes.',
    actionLabel: 'Jogar Memória',
    icon: 'view-grid-outline',
    iconBackground: '#fde8d3',
    iconColor: '#8a4b16',
    categoryColor: '#8a4b16',
    badgeBackground: '#fde8d3',
    badgeColor: '#8a4b16',
  },
  {
    key: 'deducao',
    category: 'Atenção e Análise',
    title: 'Dedução Lógica',
    difficulty: 'Médio',
    description: 'Leia as pistas com calma e descubra a resposta.',
    actionLabel: 'Jogar Dedução',
    icon: 'text-search',
    iconBackground: '#e3edf2',
    iconColor: '#0f4c5c',
    categoryColor: '#2f6b53',
    badgeBackground: '#fde8d3',
    badgeColor: '#8a4b16',
  },
];

/**
 * Tela de Jogos (Exercícios) do Mente Ativa.
 *
 * Apresenta os treinos cognitivos disponíveis com descrição e nível de
 * dificuldade. O botão de voz lê as opções em voz alta (expo-speech) e o
 * segundo toque interrompe a leitura, como no protótipo.
 *
 * @param {Object} props
 * @param {Function} [props.onGamePress] - Recebe o objeto do jogo escolhido
 * @param {Function} [props.onNavigateTab] - Navegação da barra inferior
 * @param {'inicio'|'jogos'|'progresso'|'perfil'} [props.activeTab='jogos']
 */
export default function GamesScreen({
  onGamePress,
  onNavigateTab,
  activeTab = 'jogos',
}) {
  const [isReading, setIsReading] = useState(false);

  // Garante que a fala seja interrompida ao sair da tela.
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const handleVoiceGuide = useCallback(() => {
    if (isReading) {
      Speech.stop();
      setIsReading(false);
      return;
    }

    try {
      setIsReading(true);
      Speech.speak(VOICE_GUIDE_TEXT, {
        language: 'pt-BR',
        rate: 0.9,
        onDone: () => setIsReading(false),
        onStopped: () => setIsReading(false),
        onError: () => {
          setIsReading(false);
          Alert.alert(
            'Leitura por voz',
            'Não foi possível ler as instruções neste dispositivo.'
          );
        },
      });
    } catch (error) {
      console.warn('Guia de voz indisponível:', error?.message);
      setIsReading(false);
      Alert.alert(
        'Leitura por voz',
        'A leitura por voz não está disponível neste dispositivo.'
      );
    }
  }, [isReading]);

  return (
    <Container>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f8fa" />

      {/* ========================================================
          1. CABEÇALHO (Exercícios + guia de voz)
          ======================================================== */}
      <Header>
        <HeaderLeft>
          <HeaderIconBox>
            <MaterialCommunityIcons
              name="puzzle-outline"
              size={24}
              color="#2f6b53"
            />
          </HeaderIconBox>
          <HeaderTitle>Exercícios</HeaderTitle>
        </HeaderLeft>

        <VoiceButton
          onPress={handleVoiceGuide}
          activeOpacity={0.75}
          isReading={isReading}
          accessibilityRole="button"
          accessibilityLabel={
            isReading ? 'Parar leitura das instruções' : 'Ouvir instruções da tela'
          }
          accessibilityHint="Lê em voz alta a descrição dos jogos disponíveis"
        >
          <Feather
            name={isReading ? 'volume-x' : 'volume-2'}
            size={24}
            color={isReading ? '#ffffff' : '#0f4c5c'}
          />
        </VoiceButton>
      </Header>

      {/* ========================================================
          2. LISTA DE JOGOS
          ======================================================== */}
      <ContentScrollView>
        <TitleSection>
          <PageTitle>Escolha seu jogo</PageTitle>
          <PageSubtitle>Treine no seu ritmo, com tranquilidade.</PageSubtitle>
        </TitleSection>

        <GamesList>
          {GAMES.map((game) => (
            <GameCard key={game.key}>
              <GameHeader>
                <GameIdentity>
                  <GameIconBox backgroundColor={game.iconBackground}>
                    <MaterialCommunityIcons
                      name={game.icon}
                      size={28}
                      color={game.iconColor}
                    />
                  </GameIconBox>
                  <GameIdentityText>
                    <GameCategory color={game.categoryColor}>
                      {game.category}
                    </GameCategory>
                    <GameTitle>{game.title}</GameTitle>
                  </GameIdentityText>
                </GameIdentity>

                <DifficultyBadge backgroundColor={game.badgeBackground}>
                  <DifficultyText color={game.badgeColor}>
                    {game.difficulty}
                  </DifficultyText>
                </DifficultyBadge>
              </GameHeader>

              <GameDescription>{game.description}</GameDescription>

              <PlayButton
                onPress={() => onGamePress?.(game)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={game.actionLabel}
                accessibilityHint={game.description}
              >
                <PlayButtonText>{game.actionLabel}</PlayButtonText>
                <Feather name="arrow-right" size={20} color="#ffffff" />
              </PlayButton>
            </GameCard>
          ))}
        </GamesList>
      </ContentScrollView>

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

const Header = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background-color: #f3f8fa;
`;

const HeaderLeft = styled.View`
  flex-direction: row;
  align-items: center;
`;

const HeaderIconBox = styled.View`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background-color: #dcefe4;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
`;

const HeaderTitle = styled.Text`
  font-size: 21px;
  font-weight: 700;
  color: #1a2730;
  letter-spacing: -0.3px;
`;

const VoiceButton = styled.TouchableOpacity`
  width: 52px;
  height: 52px;
  border-radius: 26px;
  align-items: center;
  justify-content: center;
  background-color: ${({ isReading }) => (isReading ? '#0f4c5c' : '#e6eff3')};
`;

const ContentScrollView = styled.ScrollView.attrs({
  contentContainerStyle: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  showsVerticalScrollIndicator: false,
})`
  flex: 1;
`;

const TitleSection = styled.View`
  padding-top: 16px;
  padding-bottom: 24px;
`;

const PageTitle = styled.Text`
  font-size: 26px;
  font-weight: 700;
  color: #1a2730;
  letter-spacing: -0.5px;
  margin-bottom: 4px;
`;

const PageSubtitle = styled.Text`
  font-size: 16px;
  color: #556570;
`;

const GamesList = styled.View``;

const GameCard = styled.View`
  background-color: #ffffff;
  border-radius: 16px;
  border-width: 1px;
  border-color: #e3edf2;
  padding: 16px;
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

const GameHeader = styled.View`
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
`;

const GameIdentity = styled.View`
  flex: 1;
  flex-direction: row;
  align-items: center;
  margin-right: 8px;
`;

const GameIconBox = styled.View`
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background-color: ${({ backgroundColor }) => backgroundColor};
  align-items: center;
  justify-content: center;
  margin-right: 12px;
`;

const GameIdentityText = styled.View`
  flex: 1;
`;

const GameCategory = styled.Text`
  font-size: 14px;
  font-weight: 600;
  color: ${({ color }) => color};
  margin-bottom: 2px;
`;

const GameTitle = styled.Text`
  font-size: 20px;
  font-weight: 600;
  color: #1a2730;
  letter-spacing: -0.3px;
`;

const DifficultyBadge = styled.View`
  padding: 3px 10px;
  border-radius: 999px;
  background-color: ${({ backgroundColor }) => backgroundColor};
`;

const DifficultyText = styled.Text`
  font-size: 13px;
  font-weight: 700;
  color: ${({ color }) => color};
`;

const GameDescription = styled.Text`
  font-size: 16px;
  line-height: 24px;
  color: #556570;
  margin-top: 12px;
`;

const PlayButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  height: 52px;
  border-radius: 14px;
  background-color: #0f4c5c;
  margin-top: 12px;
  ${Platform.OS === 'ios'
    ? `
      shadow-color: #0f4c5c;
      shadow-offset: 0px 3px;
      shadow-opacity: 0.25;
      shadow-radius: 5px;
    `
    : `
      elevation: 3;
    `}
`;

const PlayButtonText = styled.Text`
  color: #ffffff;
  font-size: 16px;
  font-weight: 700;
  margin-right: 8px;
`;
