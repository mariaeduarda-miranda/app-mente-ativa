import React, { useCallback, useEffect, useState } from 'react';
import {
  StatusBar,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import styled from 'styled-components/native';
import * as Speech from 'expo-speech';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { getProgress } from '../services/api';
import BottomNavigation from '../components/BottomNavigation';

/**
 * Visual de cada jogo na lista de atividades.
 * As chaves seguem o catalogo da API (game_key).
 */
const GAME_META = {
  sequencia: {
    icon: 'numeric-1-circle-outline',
    color: '#2f6b53',
    background: '#dcefe4',
  },
  memoria: {
    icon: 'view-grid-outline',
    color: '#8a4b16',
    background: '#fde8d3',
  },
  deducao: {
    icon: 'text-search',
    color: '#0f4c5c',
    background: '#e3edf2',
  },
};

const EMPTY_GAMES = [
  { key: 'sequencia', name: 'Sequência Lógica', sessions: 0, accuracy: 0 },
  { key: 'memoria', name: 'Jogo da Memória', sessions: 0, accuracy: 0 },
  { key: 'deducao', name: 'Dedução Lógica', sessions: 0, accuracy: 0 },
];

/**
 * Tela "Meu Progresso".
 *
 * Consome GET /progress (agregado por usuário autenticado) e mostra partidas
 * concluídas, média geral de acertos e o percentual por jogo, além de um
 * resumo falado em voz alta.
 *
 * @param {Object} props
 * @param {string} props.token - Token JWT da sessão
 * @param {Object} props.user - Usuário da sessão (avatar do cabeçalho)
 * @param {Function} [props.onNavigateTab] - Navegação da barra inferior
 * @param {'inicio'|'jogos'|'progresso'|'perfil'} [props.activeTab='progresso']
 */
export default function ProgressScreen({
  token,
  user,
  onNavigateTab,
  activeTab = 'progresso',
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [speaking, setSpeaking] = useState(false);

  const loadProgress = useCallback(
    async ({ isRefresh = false } = {}) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError(null);

      try {
        const progress = await getProgress(token);
        setData(progress);
      } catch (loadError) {
        setError(
          loadError.message || 'Não foi possível carregar seu progresso agora.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  // Interrompe a leitura ao trocar de tela.
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const summary = data?.summary || { totalSessions: 0, overallAccuracy: 0 };
  const games = data?.games?.length ? data.games : EMPTY_GAMES;
  const hasSessions = summary.totalSessions > 0;

  const summaryText = `Resumo do seu progresso: ${
    summary.totalSessions
  } ${summary.totalSessions === 1 ? 'partida realizada' : 'partidas realizadas'}, média de ${
    summary.overallAccuracy
  }% de acertos. Parabéns pela prática!`;

  const handleListen = () => {
    if (speaking) {
      Speech.stop();
      setSpeaking(false);
      return;
    }

    Speech.stop();
    setSpeaking(true);
    Speech.speak(summaryText, {
      language: 'pt-BR',
      rate: 0.9,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  return (
    <Container>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f8fa" />

      {/* ========================================================
          CABEÇALHO
          ======================================================== */}
      <Header>
        <HeaderLeft>
          <HeaderIconBox>
            <Feather name="bar-chart-2" size={22} color="#0f4c5c" />
          </HeaderIconBox>
          <HeaderTitle>Meu Progresso</HeaderTitle>
        </HeaderLeft>

        <AvatarButton
          onPress={() => onNavigateTab?.('perfil')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Abrir perfil de ${user?.name || 'usuário'}`}
        >
          <Feather name="user" size={18} color="#ffffff" />
        </AvatarButton>
      </Header>

      <ContentScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadProgress({ isRefresh: true })}
            colors={['#0f4c5c']}
            tintColor="#0f4c5c"
          />
        }
      >
        <TitleSection>
          <PageTitle>Meu progresso</PageTitle>
          <PageSubtitle>
            Sua dedicação diária em ritmo leve e constante.
          </PageSubtitle>
        </TitleSection>

        {loading && !data ? (
          <LoadingBox>
            <ActivityIndicator color="#0f4c5c" size="large" />
            <LoadingText>Carregando seu progresso...</LoadingText>
          </LoadingBox>
        ) : (
          <>
            {error && (
              <ErrorCard>
                <Feather name="alert-circle" size={20} color="#b3261e" />
                <ErrorTextBox>
                  <ErrorText>{error}</ErrorText>
                </ErrorTextBox>
                <RetryButton
                  onPress={() => loadProgress()}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Tentar carregar novamente"
                >
                  <RetryText>Tentar novamente</RetryText>
                </RetryButton>
              </ErrorCard>
            )}

            {/* ==================================================
                RESUMO GERAL
                ================================================== */}
            <StatsRow accessibilityLabel="Resumo geral">
              <StatCard>
                <StatValue tone="primary">{summary.totalSessions}</StatValue>
                <StatLabel>Partidas</StatLabel>
                <StatHint>concluídas</StatHint>
              </StatCard>

              <StatCard>
                <StatValue tone="secondary">{summary.overallAccuracy}%</StatValue>
                <StatLabel>Acertos</StatLabel>
                <StatHint>média geral</StatHint>
              </StatCard>
            </StatsRow>

            {!hasSessions && (
              <EmptyCard>
                <Feather name="sun" size={24} color="#2f6b53" />
                <EmptyTextBox>
                  <EmptyTitle>Seu progresso começa agora</EmptyTitle>
                  <EmptyText>
                    Conclua uma partida para ver seus acertos aqui.
                  </EmptyText>
                </EmptyTextBox>
                <EmptyButton
                  onPress={() => onNavigateTab?.('jogos')}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Ir para os jogos"
                >
                  <EmptyButtonText>Jogar</EmptyButtonText>
                  <Feather name="arrow-right" size={16} color="#ffffff" />
                </EmptyButton>
              </EmptyCard>
            )}

            {/* ==================================================
                ATIVIDADES
                ================================================== */}
            <SectionTitle>Atividades</SectionTitle>

            <ActivitiesCard>
              {games.map((game, index) => {
                const meta = GAME_META[game.key] || GAME_META.sequencia;

                return (
                  <React.Fragment key={game.key}>
                    {index > 0 && <Divider />}

                    <ActivityRow>
                      <ActivityHeader>
                        <ActivityIdentity>
                          <ActivityIconBox backgroundColor={meta.background}>
                            <MaterialCommunityIcons
                              name={meta.icon}
                              size={22}
                              color={meta.color}
                            />
                          </ActivityIconBox>
                          <ActivityName>{game.name}</ActivityName>
                        </ActivityIdentity>
                        <ActivityValue color={meta.color}>
                          {game.accuracy}%
                        </ActivityValue>
                      </ActivityHeader>

                      <BarTrack>
                        <BarFill
                          color={meta.color}
                          style={{ width: `${game.accuracy}%` }}
                        />
                      </BarTrack>
                    </ActivityRow>
                  </React.Fragment>
                );
              })}
            </ActivitiesCard>

            {/* ==================================================
                RESUMO EM VOZ ALTA
                ================================================== */}
            <ListenButton
              onPress={handleListen}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={
                speaking
                  ? 'Pausar leitura do progresso'
                  : 'Ouvir resumo do progresso em voz alta'
              }
            >
              <Feather
                name={speaking ? 'pause-circle' : 'volume-2'}
                size={26}
                color="#0f4c5c"
              />
              <ListenText>
                {speaking ? 'Pausar leitura em voz alta' : 'Ouvir resumo em voz alta'}
              </ListenText>
            </ListenButton>

            {speaking && (
              <AudioFeedback>
                <Feather name="activity" size={20} color="#2f6b53" />
                <AudioFeedbackText>{summaryText}</AudioFeedbackText>
              </AudioFeedback>
            )}
          </>
        )}
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
`;

const HeaderLeft = styled.View`
  flex-direction: row;
  align-items: center;
`;

const HeaderIconBox = styled.View`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background-color: #e6eff3;
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

const AvatarButton = styled.TouchableOpacity`
  width: 38px;
  height: 38px;
  border-radius: 19px;
  background-color: #0f4c5c;
  align-items: center;
  justify-content: center;
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
  padding-top: 8px;
  padding-bottom: 24px;
`;

const PageTitle = styled.Text`
  font-size: 30px;
  font-weight: 700;
  color: #0f4c5c;
  letter-spacing: -0.6px;
  margin-bottom: 4px;
`;

const PageSubtitle = styled.Text`
  font-size: 16px;
  line-height: 23px;
  color: #556570;
`;

const LoadingBox = styled.View`
  align-items: center;
  justify-content: center;
  padding-vertical: 48px;
`;

const LoadingText = styled.Text`
  font-size: 15px;
  color: #556570;
  margin-top: 12px;
`;

const ErrorCard = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: #ffdad6;
  border-radius: 14px;
  padding: 12px;
  margin-bottom: 16px;
`;

const ErrorTextBox = styled.View`
  flex: 1;
  margin-horizontal: 8px;
`;

const ErrorText = styled.Text`
  font-size: 13px;
  line-height: 19px;
  color: #93000a;
`;

const RetryButton = styled.TouchableOpacity`
  padding: 6px 4px;
`;

const RetryText = styled.Text`
  font-size: 13px;
  font-weight: 700;
  color: #b3261e;
  text-decoration-line: underline;
`;

const StatsRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  margin-bottom: 24px;
`;

const StatCard = styled.View`
  width: 48.5%;
  background-color: #ffffff;
  border-radius: 20px;
  border-width: 1px;
  border-color: #e3edf2;
  padding: 20px 12px;
  align-items: center;
  ${Platform.OS === 'ios'
    ? `
      shadow-color: #000000;
      shadow-offset: 0px 2px;
      shadow-opacity: 0.05;
      shadow-radius: 8px;
    `
    : `
      elevation: 2;
    `}
`;

const StatValue = styled.Text`
  font-size: 40px;
  font-weight: 700;
  letter-spacing: -1px;
  color: ${({ tone }) => (tone === 'secondary' ? '#2f6b53' : '#0f4c5c')};
`;

const StatLabel = styled.Text`
  font-size: 15px;
  font-weight: 700;
  color: #1a2730;
  margin-top: 2px;
`;

const StatHint = styled.Text`
  font-size: 13px;
  color: #556570;
`;

const EmptyCard = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: #ffffff;
  border-radius: 16px;
  border-width: 1px;
  border-color: #e3edf2;
  padding: 14px;
  margin-bottom: 24px;
`;

const EmptyTextBox = styled.View`
  flex: 1;
  margin-horizontal: 10px;
`;

const EmptyTitle = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: #1a2730;
`;

const EmptyText = styled.Text`
  font-size: 13px;
  line-height: 18px;
  color: #556570;
`;

const EmptyButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  background-color: #0f4c5c;
  border-radius: 12px;
  padding: 10px 14px;
`;

const EmptyButtonText = styled.Text`
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  margin-right: 6px;
`;

const SectionTitle = styled.Text`
  font-size: 20px;
  font-weight: 700;
  color: #0f4c5c;
  margin-bottom: 12px;
`;

const ActivitiesCard = styled.View`
  background-color: #ffffff;
  border-radius: 20px;
  border-width: 1px;
  border-color: #e3edf2;
  padding: 18px 16px;
  margin-bottom: 24px;
  ${Platform.OS === 'ios'
    ? `
      shadow-color: #000000;
      shadow-offset: 0px 2px;
      shadow-opacity: 0.05;
      shadow-radius: 8px;
    `
    : `
      elevation: 2;
    `}
`;

const Divider = styled.View`
  height: 1px;
  background-color: #e1e9ef;
  margin-vertical: 14px;
`;

const ActivityRow = styled.View``;

const ActivityHeader = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const ActivityIdentity = styled.View`
  flex: 1;
  flex-direction: row;
  align-items: center;
  margin-right: 8px;
`;

const ActivityIconBox = styled.View`
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background-color: ${({ backgroundColor }) => backgroundColor};
  align-items: center;
  justify-content: center;
  margin-right: 10px;
`;

const ActivityName = styled.Text`
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: #0f4c5c;
`;

const ActivityValue = styled.Text`
  font-size: 18px;
  font-weight: 700;
  color: ${({ color }) => color};
`;

const BarTrack = styled.View`
  height: 10px;
  border-radius: 999px;
  background-color: #dbe4e9;
  overflow: hidden;
`;

const BarFill = styled.View`
  height: 10px;
  border-radius: 999px;
  background-color: ${({ color }) => color};
`;

const ListenButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  min-height: 58px;
  border-radius: 16px;
  background-color: #dfe8ee;
  padding-horizontal: 16px;
`;

const ListenText = styled.Text`
  font-size: 16px;
  font-weight: 700;
  color: #0f4c5c;
  margin-left: 10px;
`;

const AudioFeedback = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: #dcefe4;
  border-radius: 12px;
  padding: 12px;
  margin-top: 12px;
`;

const AudioFeedbackText = styled.Text`
  flex: 1;
  font-size: 14px;
  line-height: 20px;
  color: #314d3b;
  margin-left: 8px;
`;
