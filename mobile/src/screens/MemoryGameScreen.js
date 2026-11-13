import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar, Platform, Alert, ActivityIndicator } from 'react-native';
import styled from 'styled-components/native';
import * as Speech from 'expo-speech';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { buildMemoryBoard, MEMORY_ROUND_PAIRS } from '../data/memoryPairs';
import { saveGameSession } from '../services/api';

const INSTRUCTIONS_TEXT =
  'Jogo da memória. Toque em duas cartas para virar e procure os pares iguais. ' +
  'Vire duas cartas por vez, no seu próprio ritmo, sem pressa.';

/**
 * Tela do jogo "Jogo da Memória".
 *
 * Cada rodada sorteia 4 pares (8 cartas) do banco local. O usuário vira duas
 * cartas por vez; ao encontrar um par, as cartas ficam fixas em verde. Ao
 * concluir, envia o resultado para POST /progress/sessions com
 * gameKey "memoria".
 *
 * Métrica de acerto: cada tentativa (dupla de cartas viradas) conta como uma
 * "questão" e cada par encontrado como um "acerto", então a média do progresso
 * reflete a eficiência da memória (pares / tentativas).
 *
 * @param {Object} props
 * @param {string} props.token - Token JWT da sessão
 * @param {Function} [props.onBack] - Volta para a lista de jogos
 */
export default function MemoryGameScreen({ token, onBack }) {
  const [board, setBoard] = useState(() => buildMemoryBoard(MEMORY_ROUND_PAIRS));
  const [flipped, setFlipped] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState([]);
  const [attempts, setAttempts] = useState(0);
  const [finished, setFinished] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const startedAtRef = useRef(Date.now());
  const timersRef = useRef([]);
  const busyRef = useRef(false);
  const flippedRef = useRef([]);
  const lastAttemptsRef = useRef(0);

  const totalPairs = board.length / 2;
  const progressPercent =
    totalPairs > 0 ? Math.round((matchedPairs.length / totalPairs) * 100) : 0;

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current = [];
    busyRef.current = false;
  }, []);

  // Interrompe a leitura e os atrasos pendentes ao sair da tela.
  useEffect(() => {
    return () => {
      Speech.stop();
      timersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const stopSpeech = useCallback(() => {
    Speech.stop();
    setSpeaking(false);
  }, []);

  const handleListen = () => {
    if (speaking) {
      stopSpeech();
      return;
    }

    Speech.stop();
    setSpeaking(true);
    Speech.speak(INSTRUCTIONS_TEXT, {
      language: 'pt-BR',
      rate: 0.9,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => {
        setSpeaking(false);
        Alert.alert(
          'Leitura por voz',
          'Não foi possível ler as instruções neste dispositivo.'
        );
      },
    });
  };

  const persistSession = async (pairs, attemptCount) => {
    try {
      setSaving(true);
      setSaveError(null);

      const durationSeconds = Math.max(
        1,
        Math.round((Date.now() - startedAtRef.current) / 1000)
      );

      // O backend aceita até 100 "questões" por partida. Em casos extremos de
      // muitas tentativas, limitamos o total para não recusar o registro.
      const totalQuestions = Math.min(100, Math.max(attemptCount, pairs));

      await saveGameSession(token, {
        gameKey: 'memoria',
        totalQuestions,
        correctAnswers: pairs,
        durationSeconds,
        startedAt: new Date(startedAtRef.current).toISOString(),
      });

      setSaved(true);
    } catch (error) {
      setSaveError(
        error.message || 'Não foi possível salvar esta partida no seu progresso.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCardPress = (card) => {
    if (finished || busyRef.current) return;
    if (matchedPairs.includes(card.id) || flippedRef.current.includes(card.cardId)) {
      return;
    }

    // Primeira carta da dupla: apenas vira.
    if (flippedRef.current.length === 0) {
      flippedRef.current = [card.cardId];
      setFlipped([card.cardId]);
      return;
    }

    const firstCard = board.find((item) => item.cardId === flippedRef.current[0]);
    if (!firstCard) return;

    const nextAttempts = attempts + 1;
    const isMatch = firstCard.id === card.id;

    busyRef.current = true;
    flippedRef.current = [firstCard.cardId, card.cardId];
    setFlipped([firstCard.cardId, card.cardId]);
    setAttempts(nextAttempts);

    const timer = setTimeout(
      () => {
        if (isMatch) {
          const nextMatched = [...matchedPairs, card.id];
          setMatchedPairs(nextMatched);
          flippedRef.current = [];
          setFlipped([]);
          busyRef.current = false;

          if (nextMatched.length === totalPairs) {
            lastAttemptsRef.current = nextAttempts;
            setFinished(true);
            persistSession(nextMatched.length, nextAttempts);
          }
        } else {
          flippedRef.current = [];
          setFlipped([]);
          busyRef.current = false;
        }
      },
      isMatch ? 450 : 950
    );

    timersRef.current.push(timer);
  };

  const handleRestart = () => {
    clearTimers();
    stopSpeech();
    flippedRef.current = [];
    lastAttemptsRef.current = 0;
    setBoard(buildMemoryBoard(MEMORY_ROUND_PAIRS));
    setFlipped([]);
    setMatchedPairs([]);
    setAttempts(0);
    setFinished(false);
    setSaved(false);
    setSaveError(null);
    setSaving(false);
    startedAtRef.current = Date.now();
  };

  const handleBack = () => {
    if (!finished && attempts > 0) {
      Alert.alert('Sair do jogo?', 'Sua partida atual não será salva.', [
        { text: 'Continuar jogando', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: () => onBack?.() },
      ]);
      return;
    }

    onBack?.();
  };

  const resultAttempts = lastAttemptsRef.current || attempts;
  const resultAccuracy =
    resultAttempts > 0
      ? Math.round((matchedPairs.length / resultAttempts) * 100)
      : 0;

  return (
    <Container>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f8fa" />

      <Header>
        <HeaderRow>
          <BackButton
            onPress={handleBack}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Voltar aos jogos"
          >
            <Feather name="arrow-left" size={26} color="#0f4c5c" />
          </BackButton>

          <HeaderTitle numberOfLines={1}>Jogo da Memória</HeaderTitle>

          <CounterPill>
            <CounterText>
              {finished
                ? 'Concluído'
                : `Pares ${matchedPairs.length}/${totalPairs}`}
            </CounterText>
          </CounterPill>
        </HeaderRow>

        <ProgressTrack>
          <ProgressFill style={{ width: `${finished ? 100 : progressPercent}%` }} />
        </ProgressTrack>
      </Header>

      <ContentScrollView>
        {finished ? (
          /* ======================================================
             RESULTADO DA PARTIDA
             ====================================================== */
          <ResultCard>
            <ResultIconCircle isGreat={resultAccuracy >= 50}>
              <Feather
                name={resultAccuracy >= 50 ? 'award' : 'refresh-cw'}
                size={34}
                color={resultAccuracy >= 50 ? '#2f6b53' : '#8a4b16'}
              />
            </ResultIconCircle>

            <ResultLabel>Seu resultado</ResultLabel>
            <ResultScore>{resultAccuracy}%</ResultScore>
            <ResultDetail>
              Você encontrou {matchedPairs.length} de {totalPairs} pares em{' '}
              {resultAttempts} {resultAttempts === 1 ? 'tentativa' : 'tentativas'}.
            </ResultDetail>
            <ResultMessage>
              {resultAccuracy >= 75
                ? 'Excelente memória! Você encontrou os pares com poucas tentativas.'
                : resultAccuracy >= 50
                  ? 'Muito bem! Sua recordação visual está no caminho certo.'
                  : 'Bom começo! Cada rodada fortalece sua memória.'}
            </ResultMessage>

            {saving && (
              <SavingRow>
                <ActivityIndicator color="#0f4c5c" size="small" />
                <SavingText>Salvando no seu progresso...</SavingText>
              </SavingRow>
            )}

            {!saving && saved && (
              <SavedRow>
                <Feather name="check-circle" size={18} color="#2f6b53" />
                <SavedText>Progresso salvo com sucesso.</SavedText>
              </SavedRow>
            )}

            {!saving && saveError && (
              <ErrorBox>
                <ErrorText>{saveError}</ErrorText>
                <RetryButton
                  onPress={() =>
                    persistSession(matchedPairs.length, resultAttempts)
                  }
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Tentar salvar novamente"
                >
                  <Feather name="refresh-cw" size={16} color="#b3261e" />
                  <RetryText>Tentar salvar novamente</RetryText>
                </RetryButton>
              </ErrorBox>
            )}

            <PrimaryButton
              onPress={handleRestart}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Jogar novamente"
            >
              <PrimaryButtonText>Jogar novamente</PrimaryButtonText>
              <Feather name="refresh-cw" size={20} color="#ffffff" />
            </PrimaryButton>

            <SecondaryButton
              onPress={onBack}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Voltar aos jogos"
            >
              <SecondaryButtonText>Voltar aos jogos</SecondaryButtonText>
            </SecondaryButton>
          </ResultCard>
        ) : (
          /* ======================================================
             TABULEIRO
             ====================================================== */
          <>
            <StatusCard>
              <StatusRow>
                <StatusIdentity>
                  <MaterialCommunityIcons
                    name="brain"
                    size={22}
                    color="#0f4c5c"
                  />
                  <StatusTitle>Exercício de Foco</StatusTitle>
                </StatusIdentity>

                <PairsPill>
                  <Feather name="check-circle" size={16} color="#2f6b53" />
                  <PairsText>
                    Pares: {matchedPairs.length} de {totalPairs}
                  </PairsText>
                </PairsPill>
              </StatusRow>
            </StatusCard>

            <InstructionRow>
              <InstructionTextBox>
                <InstructionTitle>Toque para encontrar os pares</InstructionTitle>
                <InstructionSubtitle>
                  Vire duas cartas por vez no seu próprio ritmo.
                </InstructionSubtitle>
              </InstructionTextBox>

              <ListenButton
                onPress={handleListen}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={
                  speaking
                    ? 'Parar leitura das instruções'
                    : 'Ouvir instruções do jogo'
                }
              >
                <Feather
                  name={speaking ? 'volume-x' : 'volume-2'}
                  size={24}
                  color="#0f4c5c"
                />
              </ListenButton>
            </InstructionRow>

            <CardsGrid accessibilityLabel="Tabuleiro de cartas do Jogo da Memória">
              {board.map((card) => {
                const isMatched = matchedPairs.includes(card.id);
                const isFlipped = flipped.includes(card.cardId);
                const isRevealed = isMatched || isFlipped;

                return (
                  <CardButton
                    key={card.cardId}
                    state={isMatched ? 'matched' : isRevealed ? 'revealed' : 'hidden'}
                    onPress={() => handleCardPress(card)}
                    disabled={isMatched || finished}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityState={{
                      disabled: isMatched || finished,
                      selected: isRevealed,
                    }}
                    accessibilityLabel={
                      isMatched
                        ? `Carta revelada: ${card.label}, par concluído`
                        : isRevealed
                          ? `Carta revelada: ${card.label}`
                          : 'Carta fechada. Toque para virar'
                    }
                  >
                    <MaterialCommunityIcons
                      name={isRevealed ? card.icon : 'spa'}
                      size={isRevealed ? 44 : 36}
                      color={
                        isMatched
                          ? '#2f6b53'
                          : isRevealed
                            ? '#ffffff'
                            : '#9fb2bc'
                      }
                    />
                    <CardLabel
                      state={isMatched ? 'matched' : isRevealed ? 'revealed' : 'hidden'}
                    >
                      {isRevealed ? card.label : 'Virar'}
                    </CardLabel>
                  </CardButton>
                );
              })}
            </CardsGrid>

            <HintCard>
              <HintIconBox>
                <MaterialCommunityIcons
                  name="head-lightbulb-outline"
                  size={24}
                  color="#8a4b16"
                />
              </HintIconBox>
              <HintTextBox>
                <HintTitle>Dica suave</HintTitle>
                <HintText>
                  Observe a forma e a cor com calma antes de cada escolha.
                </HintText>
              </HintTextBox>
            </HintCard>

            <RestartButton
              onPress={handleRestart}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Reiniciar rodada"
            >
              <Feather name="refresh-cw" size={20} color="#0f4c5c" />
              <RestartText>Reiniciar rodada</RestartText>
            </RestartButton>
          </>
        )}
      </ContentScrollView>
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
  background-color: #f3f8fa;
  border-bottom-width: 1px;
  border-bottom-color: #e3edf2;
`;

const HeaderRow = styled.View`
  flex-direction: row;
  align-items: center;
  height: 64px;
  padding-horizontal: 12px;
`;

const BackButton = styled.TouchableOpacity`
  width: 48px;
  height: 48px;
  border-radius: 24px;
  align-items: center;
  justify-content: center;
`;

const HeaderTitle = styled.Text`
  flex: 1;
  font-size: 19px;
  font-weight: 700;
  color: #1a2730;
  text-align: center;
  margin-horizontal: 6px;
`;

const CounterPill = styled.View`
  min-width: 86px;
  background-color: #e6eff3;
  border-radius: 999px;
  padding: 6px 10px;
  align-items: center;
`;

const CounterText = styled.Text`
  font-size: 13px;
  font-weight: 700;
  color: #0f4c5c;
`;

const ProgressTrack = styled.View`
  height: 6px;
  background-color: #dfe8ee;
`;

const ProgressFill = styled.View`
  height: 6px;
  background-color: #2f6b53;
  border-radius: 3px;
`;

const ContentScrollView = styled.ScrollView.attrs({
  contentContainerStyle: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  showsVerticalScrollIndicator: false,
})`
  flex: 1;
`;

const StatusCard = styled.View`
  background-color: #edf5fa;
  border-radius: 16px;
  border-width: 1px;
  border-color: #e3edf2;
  padding: 14px;
  margin-bottom: 16px;
`;

const StatusRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const StatusIdentity = styled.View`
  flex-direction: row;
  align-items: center;
  margin-right: 8px;
`;

const StatusTitle = styled.Text`
  font-size: 16px;
  font-weight: 600;
  color: #0f4c5c;
  margin-left: 8px;
`;

const PairsPill = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: #ffffff;
  border-radius: 999px;
  padding: 5px 10px;
`;

const PairsText = styled.Text`
  font-size: 13px;
  font-weight: 600;
  color: #1a2730;
  margin-left: 6px;
`;

const InstructionRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const InstructionTextBox = styled.View`
  flex: 1;
  margin-right: 12px;
`;

const InstructionTitle = styled.Text`
  font-size: 22px;
  font-weight: 700;
  color: #1a2730;
  letter-spacing: -0.3px;
`;

const InstructionSubtitle = styled.Text`
  font-size: 15px;
  line-height: 21px;
  color: #556570;
  margin-top: 2px;
`;

const ListenButton = styled.TouchableOpacity`
  width: 48px;
  height: 48px;
  border-radius: 24px;
  background-color: #e6eff3;
  align-items: center;
  justify-content: center;
`;

const CardsGrid = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const CardButton = styled.TouchableOpacity`
  width: 48.5%;
  height: 112px;
  border-radius: 16px;
  border-width: 1px;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  ${({ state }) => {
    if (state === 'matched') {
      return `
        background-color: #dcefe4;
        border-color: #a9cdb8;
      `;
    }
    if (state === 'revealed') {
      return `
        background-color: #0f4c5c;
        border-color: #0f4c5c;
      `;
    }
    return `
      background-color: #ffffff;
      border-color: #e1e9ef;
    `;
  }}
  ${Platform.OS === 'ios'
    ? `
      shadow-color: #000000;
      shadow-offset: 0px 1px;
      shadow-opacity: 0.04;
      shadow-radius: 4px;
    `
    : `
      elevation: 1;
    `}
`;

const CardLabel = styled.Text`
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.3px;
  margin-top: 4px;
  color: ${({ state }) => {
    if (state === 'matched') return '#2f6b53';
    if (state === 'revealed') return '#ffffff';
    return '#556570';
  }};
`;

const HintCard = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: #ffffff;
  border-radius: 16px;
  border-width: 1px;
  border-color: #e3edf2;
  padding: 14px;
  margin-top: 4px;
  margin-bottom: 20px;
`;

const HintIconBox = styled.View`
  width: 46px;
  height: 46px;
  border-radius: 23px;
  background-color: #fde8d3;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
`;

const HintTextBox = styled.View`
  flex: 1;
`;

const HintTitle = styled.Text`
  font-size: 15px;
  font-weight: 700;
  color: #1a2730;
`;

const HintText = styled.Text`
  font-size: 14px;
  line-height: 20px;
  color: #556570;
`;

const RestartButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 56px;
  border-radius: 14px;
  background-color: #dfe8ee;
`;

const RestartText = styled.Text`
  font-size: 16px;
  font-weight: 700;
  color: #0f4c5c;
  margin-left: 8px;
`;

const ResultCard = styled.View`
  background-color: #ffffff;
  border-radius: 24px;
  border-width: 1px;
  border-color: #e3edf2;
  padding: 24px 18px;
  align-items: center;
  ${Platform.OS === 'ios'
    ? `
      shadow-color: #000000;
      shadow-offset: 0px 3px;
      shadow-opacity: 0.07;
      shadow-radius: 10px;
    `
    : `
      elevation: 3;
    `}
`;

const ResultIconCircle = styled.View`
  width: 74px;
  height: 74px;
  border-radius: 37px;
  align-items: center;
  justify-content: center;
  background-color: ${({ isGreat }) => (isGreat ? '#dcefe4' : '#fde8d3')};
  margin-bottom: 12px;
`;

const ResultLabel = styled.Text`
  font-size: 15px;
  font-weight: 600;
  color: #556570;
`;

const ResultScore = styled.Text`
  font-size: 52px;
  font-weight: 700;
  color: #0f4c5c;
  letter-spacing: -1px;
`;

const ResultDetail = styled.Text`
  font-size: 17px;
  font-weight: 600;
  color: #1a2730;
  text-align: center;
`;

const ResultMessage = styled.Text`
  font-size: 15px;
  line-height: 22px;
  color: #556570;
  text-align: center;
  margin-top: 8px;
  margin-bottom: 16px;
`;

const SavingRow = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: 16px;
`;

const SavingText = styled.Text`
  font-size: 14px;
  color: #556570;
  margin-left: 8px;
`;

const SavedRow = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: #dcefe4;
  border-radius: 999px;
  padding: 6px 12px;
  margin-bottom: 16px;
`;

const SavedText = styled.Text`
  font-size: 13px;
  font-weight: 700;
  color: #2f6b53;
  margin-left: 6px;
`;

const ErrorBox = styled.View`
  width: 100%;
  background-color: #ffdad6;
  border-radius: 14px;
  padding: 12px;
  margin-bottom: 16px;
  align-items: center;
`;

const ErrorText = styled.Text`
  font-size: 14px;
  line-height: 20px;
  color: #93000a;
  text-align: center;
`;

const RetryButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  margin-top: 8px;
  padding: 6px 10px;
`;

const RetryText = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: #b3261e;
  margin-left: 6px;
  text-decoration-line: underline;
`;

const PrimaryButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 56px;
  border-radius: 14px;
  background-color: #0f4c5c;
  margin-bottom: 12px;
`;

const PrimaryButtonText = styled.Text`
  color: #ffffff;
  font-size: 17px;
  font-weight: 700;
  margin-right: 8px;
`;

const SecondaryButton = styled.TouchableOpacity`
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 52px;
  border-radius: 14px;
  border-width: 1.5px;
  border-color: #c9dbe3;
  background-color: #ffffff;
`;

const SecondaryButtonText = styled.Text`
  color: #0f4c5c;
  font-size: 16px;
  font-weight: 700;
`;
