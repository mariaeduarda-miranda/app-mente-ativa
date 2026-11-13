import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar, Platform, Alert, ActivityIndicator } from 'react-native';
import styled from 'styled-components/native';
import * as Speech from 'expo-speech';
import { Feather } from '@expo/vector-icons';
import { buildSequenceRound, ROUND_SIZE } from '../data/sequenceQuestions';
import { saveGameSession } from '../services/api';

/**
 * Tela do jogo "Sequência Lógica".
 *
 * Cada partida sorteia 10 perguntas do banco local, embaralha as opções e
 * registra o resultado em POST /progress/sessions ao concluir. A resposta é
 * bloqueada após a escolha (acerto em verde, erro em vermelho com a correta
 * destacada), mantendo a pontuação objetiva.
 *
 * @param {Object} props
 * @param {string} props.token - Token JWT da sessão
 * @param {Function} [props.onBack] - Volta para a lista de jogos
 */
export default function SequenceGameScreen({ token, onBack }) {
  const [round, setRound] = useState(() => buildSequenceRound(ROUND_SIZE));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [finished, setFinished] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const startedAtRef = useRef(Date.now());

  const total = round.length;
  const question = round[currentIndex];
  const correctCount = answers.filter(Boolean).length;
  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const progressPercent = finished
    ? 100
    : Math.round(((currentIndex + 1) / total) * 100);

  // Interrompe a leitura ao sair da tela.
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const stopSpeech = useCallback(() => {
    Speech.stop();
    setSpeaking(false);
  }, []);

  const speakSequence = () => {
    if (speaking) {
      stopSpeech();
      return;
    }

    const text = `Sequência: ${question.sequence.join(', ')}. Qual é o próximo número?`;

    Speech.stop();
    setSpeaking(true);
    Speech.speak(text, {
      language: 'pt-BR',
      rate: 0.8,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => {
        setSpeaking(false);
        Alert.alert(
          'Leitura por voz',
          'Não foi possível ler a sequência neste dispositivo.'
        );
      },
    });
  };

  const persistSession = async (correct) => {
    try {
      setSaving(true);
      setSaveError(null);

      const durationSeconds = Math.max(
        1,
        Math.round((Date.now() - startedAtRef.current) / 1000)
      );

      await saveGameSession(token, {
        gameKey: 'sequencia',
        totalQuestions: total,
        correctAnswers: correct,
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

  const handleSelect = (value) => {
    if (selected !== null || finished) return;

    const isCorrect = value === question.answer;
    setSelected(value);
    setAnswers((previous) => [...previous, isCorrect]);
  };

  const handleNext = () => {
    stopSpeech();

    if (currentIndex + 1 >= total) {
      setFinished(true);
      persistSession(correctCount);
      return;
    }

    setCurrentIndex((index) => index + 1);
    setSelected(null);
  };

  const handlePlayAgain = () => {
    stopSpeech();
    setRound(buildSequenceRound(ROUND_SIZE));
    setCurrentIndex(0);
    setSelected(null);
    setAnswers([]);
    setFinished(false);
    setSaved(false);
    setSaveError(null);
    setSaving(false);
    startedAtRef.current = Date.now();
  };

  const handleBack = () => {
    if (!finished && answers.length > 0) {
      Alert.alert('Sair do jogo?', 'Sua partida atual não será salva.', [
        { text: 'Continuar jogando', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: () => onBack?.() },
      ]);
      return;
    }

    onBack?.();
  };

  const isCorrectAnswer = selected !== null && selected === question?.answer;
  const isLastQuestion = currentIndex + 1 >= total;

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

          <HeaderTitle numberOfLines={1}>Sequência Lógica</HeaderTitle>

          <CounterPill>
            <CounterText>
              {finished ? 'Concluído' : `${currentIndex + 1} de ${total}`}
            </CounterText>
          </CounterPill>
        </HeaderRow>

        <ProgressTrack>
          <ProgressFill style={{ width: `${progressPercent}%` }} />
        </ProgressTrack>
      </Header>

      <ContentScrollView>
        {finished ? (
          /* ======================================================
             RESULTADO DA PARTIDA
             ====================================================== */
          <ResultCard>
            <ResultIconCircle isGreat={accuracy >= 60}>
              <Feather
                name={accuracy >= 60 ? 'award' : 'refresh-cw'}
                size={34}
                color={accuracy >= 60 ? '#2f6b53' : '#8a4b16'}
              />
            </ResultIconCircle>

            <ResultLabel>Seu resultado</ResultLabel>
            <ResultScore>{accuracy}%</ResultScore>
            <ResultDetail>
              Você acertou {correctCount} de {total} questões.
            </ResultDetail>
            <ResultMessage>
              {accuracy >= 80
                ? 'Excelente! Sua mente está afiada.'
                : accuracy >= 60
                  ? 'Muito bem! Continue praticando no seu ritmo.'
                  : 'Bom começo! Cada partida fortalece sua atenção.'}
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
                  onPress={() => persistSession(correctCount)}
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
              onPress={handlePlayAgain}
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
             PERGUNTA ATUAL
             ====================================================== */
          <>
            <Instruction>Qual número completa a sequência?</Instruction>

            <SequenceCard>
              <TilesRow>
                {question.sequence.map((number, index) => (
                  <React.Fragment key={`${question.id}-${number}-${index}`}>
                    {index > 0 && (
                      <ArrowBox>
                        <Feather name="arrow-right" size={18} color="#8a97a0" />
                      </ArrowBox>
                    )}
                    <NumberTile>
                      <NumberTileText>{number}</NumberTileText>
                    </NumberTile>
                  </React.Fragment>
                ))}

                <ArrowBox>
                  <Feather name="arrow-right" size={18} color="#8a97a0" />
                </ArrowBox>

                <QuestionTile>
                  <QuestionTileText>?</QuestionTileText>
                </QuestionTile>
              </TilesRow>

              <ListenButton
                onPress={speakSequence}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={
                  speaking ? 'Parar leitura da sequência' : 'Ouvir a sequência em voz alta'
                }
              >
                <Feather
                  name={speaking ? 'volume-x' : 'volume-2'}
                  size={20}
                  color="#0f4c5c"
                />
                <ListenText>{speaking ? 'Parar' : 'Ouvir'}</ListenText>
              </ListenButton>
            </SequenceCard>

            <OptionsRow accessibilityRole="radiogroup">
              {question.options.map((option) => {
                const answered = selected !== null;
                const isAnswer = option === question.answer;
                const isChosen = option === selected;

                let status = 'idle';
                if (answered && isAnswer) status = 'correct';
                else if (answered && isChosen) status = 'wrong';
                else if (answered) status = 'muted';

                return (
                  <OptionButton
                    key={`${question.id}-option-${option}`}
                    status={status}
                    onPress={() => handleSelect(option)}
                    disabled={answered}
                    activeOpacity={0.85}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isChosen, disabled: answered }}
                    accessibilityLabel={`Opção ${option}`}
                  >
                    <OptionText status={status}>{option}</OptionText>
                    {answered && isAnswer && (
                      <Feather name="check-circle" size={26} color="#2f6b53" />
                    )}
                  </OptionButton>
                );
              })}
            </OptionsRow>

            {selected !== null && (
              <FeedbackCard>
                <FeedbackHeader>
                  <FeedbackIconCircle isCorrect={isCorrectAnswer}>
                    <Feather
                      name={isCorrectAnswer ? 'smile' : 'refresh-cw'}
                      size={24}
                      color={isCorrectAnswer ? '#2f6b53' : '#b3261e'}
                    />
                  </FeedbackIconCircle>

                  <FeedbackTextGroup>
                    <FeedbackTitle isCorrect={isCorrectAnswer}>
                      {isCorrectAnswer
                        ? 'Muito bem! Resposta certa.'
                        : 'Vamos tentar de novo?'}
                    </FeedbackTitle>
                    <FeedbackDescription>
                      {isCorrectAnswer
                        ? question.explanation
                        : `${question.hint} A resposta certa era ${question.answer}.`}
                    </FeedbackDescription>
                  </FeedbackTextGroup>
                </FeedbackHeader>

                <NextButton
                  onPress={handleNext}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={isLastQuestion ? 'Ver resultado' : 'Próxima questão'}
                >
                  <NextButtonText>
                    {isLastQuestion ? 'Ver resultado' : 'Próxima questão'}
                  </NextButtonText>
                  <Feather name="arrow-right" size={22} color="#ffffff" />
                </NextButton>
              </FeedbackCard>
            )}
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
  min-width: 62px;
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
  background-color: #0f4c5c;
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

const Instruction = styled.Text`
  font-size: 26px;
  font-weight: 700;
  color: #1a2730;
  text-align: center;
  letter-spacing: -0.5px;
  line-height: 34px;
  margin-bottom: 20px;
`;

const SequenceCard = styled.View`
  background-color: #ffffff;
  border-radius: 20px;
  border-width: 1px;
  border-color: #e3edf2;
  padding: 20px 14px;
  align-items: center;
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

const TilesRow = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
`;

const NumberTile = styled.View`
  width: 58px;
  height: 58px;
  border-radius: 16px;
  background-color: #edf5fa;
  border-width: 1px;
  border-color: #e1e9ef;
  align-items: center;
  justify-content: center;
  margin: 5px;
`;

const NumberTileText = styled.Text`
  font-size: 28px;
  font-weight: 700;
  color: #0f4c5c;
`;

const QuestionTile = styled.View`
  width: 58px;
  height: 58px;
  border-radius: 16px;
  background-color: #fde8d3;
  align-items: center;
  justify-content: center;
  margin: 5px;
`;

const QuestionTileText = styled.Text`
  font-size: 28px;
  font-weight: 700;
  color: #8a4b16;
`;

const ArrowBox = styled.View`
  width: 22px;
  align-items: center;
  justify-content: center;
`;

const ListenButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  border-radius: 999px;
  background-color: #e6eff3;
  padding-horizontal: 18px;
  margin-top: 12px;
`;

const ListenText = styled.Text`
  font-size: 15px;
  font-weight: 700;
  color: #0f4c5c;
  margin-left: 8px;
`;

const OptionsRow = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  margin-top: 20px;
`;

const OptionButton = styled.TouchableOpacity`
  width: 48.5%;
  min-height: 76px;
  border-radius: 16px;
  border-width: 2px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  ${({ status }) => {
    if (status === 'correct') {
      return `
        background-color: #dcefe4;
        border-color: #2f6b53;
      `;
    }
    if (status === 'wrong') {
      return `
        background-color: #ffdad6;
        border-color: #b3261e;
      `;
    }
    if (status === 'muted') {
      return `
        background-color: #f5f8fa;
        border-color: #e1e9ef;
      `;
    }
    return `
      background-color: #ffffff;
      border-color: #dbe4e9;
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

const OptionText = styled.Text`
  font-size: 36px;
  font-weight: 700;
  color: ${({ status }) => {
    if (status === 'correct') return '#2f6b53';
    if (status === 'wrong') return '#b3261e';
    if (status === 'muted') return '#8a97a0';
    return '#1a2730';
  }};
  margin-right: ${({ status }) => (status === 'correct' ? '8px' : '0px')};
`;

const FeedbackCard = styled.View`
  background-color: #ffffff;
  border-radius: 20px;
  border-width: 1px;
  border-color: #e3edf2;
  padding: 16px;
  margin-top: 8px;
`;

const FeedbackHeader = styled.View`
  flex-direction: row;
  align-items: center;
`;

const FeedbackIconCircle = styled.View`
  width: 46px;
  height: 46px;
  border-radius: 23px;
  align-items: center;
  justify-content: center;
  background-color: ${({ isCorrect }) => (isCorrect ? '#dcefe4' : '#ffdad6')};
`;

const FeedbackTextGroup = styled.View`
  flex: 1;
  margin-left: 12px;
`;

const FeedbackTitle = styled.Text`
  font-size: 18px;
  font-weight: 700;
  color: ${({ isCorrect }) => (isCorrect ? '#2f6b53' : '#b3261e')};
  margin-bottom: 2px;
`;

const FeedbackDescription = styled.Text`
  font-size: 15px;
  line-height: 22px;
  color: #556570;
`;

const NextButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  min-height: 56px;
  border-radius: 14px;
  background-color: #0f4c5c;
  margin-top: 16px;
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

const NextButtonText = styled.Text`
  color: #ffffff;
  font-size: 17px;
  font-weight: 700;
  margin-right: 8px;
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
