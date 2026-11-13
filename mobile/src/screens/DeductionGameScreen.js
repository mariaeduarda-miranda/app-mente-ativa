import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar, Platform, Alert, ActivityIndicator } from 'react-native';
import styled from 'styled-components/native';
import * as Speech from 'expo-speech';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  buildDeductionRound,
  DEDUCTION_ROUND_SIZE,
} from '../data/deductionQuestions';
import { saveGameSession } from '../services/api';

/**
 * Renderiza uma pista destacando os trechos entre **asteriscos**.
 */
function ClueContent({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);

  return (
    <ClueText>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <ClueEmphasis key={`${part}-${index}`}>{part.slice(2, -2)}</ClueEmphasis>;
        }
        return part;
      })}
    </ClueText>
  );
}

/**
 * Tela do jogo "Dedução Lógica".
 *
 * Cada partida sorteia 5 enigmas do banco local e embaralha as opções. O
 * usuário lê as pistas, marca uma alternativa e confirma; a resposta é então
 * bloqueada e explicada antes de seguir. Ao concluir, envia o resultado para
 * POST /progress/sessions com gameKey "deducao".
 *
 * @param {Object} props
 * @param {string} props.token - Token JWT da sessão
 * @param {Function} [props.onBack] - Volta para a lista de jogos
 */
export default function DeductionGameScreen({ token, onBack }) {
  const [round, setRound] = useState(() =>
    buildDeductionRound(DEDUCTION_ROUND_SIZE)
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
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
  const isLastQuestion = currentIndex + 1 >= total;
  const isCorrectAnswer = selected !== null && selected === question?.answer;

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

  const speakQuestion = () => {
    if (speaking) {
      stopSpeech();
      return;
    }

    const clues = question.clues
      .map((clue) => clue.replace(/\*\*/g, ''))
      .join(' ');

    const text = `${question.question} Pistas: ${clues} Opções: ${question.options.join(
      ', '
    )}.`;

    Speech.stop();
    setSpeaking(true);
    Speech.speak(text, {
      language: 'pt-BR',
      rate: 0.85,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => {
        setSpeaking(false);
        Alert.alert(
          'Leitura por voz',
          'Não foi possível ler a pergunta neste dispositivo.'
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
        gameKey: 'deducao',
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

  const handleSelect = (option) => {
    if (confirmed || finished) return;
    setSelected(option);
  };

  const handleConfirm = () => {
    if (selected === null || confirmed) return;

    stopSpeech();
    setConfirmed(true);
    setAnswers((previous) => [...previous, selected === question.answer]);
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
    setConfirmed(false);
  };

  const handlePlayAgain = () => {
    stopSpeech();
    setRound(buildDeductionRound(DEDUCTION_ROUND_SIZE));
    setCurrentIndex(0);
    setSelected(null);
    setConfirmed(false);
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

          <HeaderTitle numberOfLines={1}>Dedução Lógica</HeaderTitle>

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
              Você acertou {correctCount} de {total} enigmas.
            </ResultDetail>
            <ResultMessage>
              {accuracy >= 80
                ? 'Excelente raciocínio! Suas deduções estão afiadas.'
                : accuracy >= 60
                  ? 'Muito bem! Continue praticando a análise das pistas.'
                  : 'Bom começo! Ler com calma já é meio caminho.'}
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
             ENIGMA ATUAL
             ====================================================== */
          <>
            <CategoryRow>
              <CategoryPill>
                <MaterialCommunityIcons
                  name="brain"
                  size={18}
                  color="#0f4c5c"
                />
                <CategoryText>Dedução Lógica</CategoryText>
              </CategoryPill>
            </CategoryRow>

            <QuestionCard>
              <QuestionLabelRow>
                <Feather name="help-circle" size={20} color="#0f4c5c" />
                <QuestionLabel>Pergunta principal</QuestionLabel>
              </QuestionLabelRow>
              <QuestionText>{question.question}</QuestionText>
            </QuestionCard>

            <CluesCard>
              <CluesHeader>
                <CluesHeaderLeft>
                  <Feather name="sun" size={18} color="#8a4b16" />
                  <CluesTitle>Pistas para analisar:</CluesTitle>
                </CluesHeaderLeft>

                <ListenButton
                  onPress={speakQuestion}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={
                    speaking
                      ? 'Parar leitura da pergunta'
                      : 'Ouvir pergunta, pistas e opções'
                  }
                >
                  <Feather
                    name={speaking ? 'volume-x' : 'volume-2'}
                    size={20}
                    color="#0f4c5c"
                  />
                </ListenButton>
              </CluesHeader>

              {question.clues.map((clue, index) => (
                <ClueRow key={`${question.id}-clue-${index}`}>
                  <ClueNumber>
                    <ClueNumberText>{index + 1}</ClueNumberText>
                  </ClueNumber>
                  <ClueContent text={clue} />
                </ClueRow>
              ))}
            </CluesCard>

            <OptionsSection accessibilityRole="radiogroup">
              <OptionsLabel>
                <Feather name="check-circle" size={18} color="#0f4c5c" />
                <OptionsLabelText>Escolha sua resposta:</OptionsLabelText>
              </OptionsLabel>

              {question.options.map((option) => {
                const isAnswer = option === question.answer;
                const isChosen = option === selected;

                let status = 'idle';
                if (confirmed) {
                  if (isAnswer) status = 'correct';
                  else if (isChosen) status = 'wrong';
                  else status = 'muted';
                } else if (isChosen) {
                  status = 'selected';
                }

                const stateLabel = confirmed
                  ? isAnswer
                    ? 'Correta'
                    : isChosen
                      ? 'Sua escolha'
                      : 'Não é esta'
                  : isChosen
                    ? 'Selecionado'
                    : 'Toque para marcar';

                return (
                  <OptionButton
                    key={`${question.id}-option-${option}`}
                    status={status}
                    onPress={() => handleSelect(option)}
                    disabled={confirmed}
                    activeOpacity={0.85}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isChosen, disabled: confirmed }}
                    accessibilityLabel={`${option}. ${stateLabel}`}
                  >
                    <OptionLeft>
                      <OptionCircle status={status}>
                        {isChosen || (confirmed && isAnswer) ? (
                          <Feather
                            name="check"
                            size={16}
                            color={
                              status === 'correct'
                                ? '#ffffff'
                                : status === 'wrong'
                                  ? '#ffffff'
                                  : status === 'selected'
                                    ? '#0f4c5c'
                                    : '#2f6b53'
                            }
                          />
                        ) : (
                          <OptionCircleDot status={status} />
                        )}
                      </OptionCircle>
                      <OptionLabel status={status}>{option}</OptionLabel>
                    </OptionLeft>

                    <OptionState status={status}>{stateLabel}</OptionState>
                  </OptionButton>
                );
              })}
            </OptionsSection>

            {!confirmed ? (
              <ConfirmButton
                onPress={handleConfirm}
                disabled={selected === null}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Confirmar resposta"
                accessibilityState={{ disabled: selected === null }}
              >
                <ConfirmButtonText>Confirmar resposta</ConfirmButtonText>
                <Feather name="arrow-right" size={22} color="#ffffff" />
              </ConfirmButton>
            ) : (
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
                        : 'Quase lá! Vamos entender.'}
                    </FeedbackTitle>
                    <FeedbackDescription>
                      {question.explanation}
                    </FeedbackDescription>
                  </FeedbackTextGroup>
                </FeedbackHeader>

                <NextButton
                  onPress={handleNext}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isLastQuestion ? 'Ver resultado' : 'Próxima questão'
                  }
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
  min-width: 74px;
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

const CategoryRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const CategoryPill = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: #e6eff3;
  border-radius: 999px;
  padding: 6px 12px;
`;

const CategoryText = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: #0f4c5c;
  margin-left: 6px;
`;

const QuestionCard = styled.View`
  background-color: #ffffff;
  border-radius: 18px;
  border-width: 1px;
  border-color: #e3edf2;
  padding: 18px;
  margin-bottom: 16px;
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

const QuestionLabelRow = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: 6px;
`;

const QuestionLabel = styled.Text`
  font-size: 14px;
  font-weight: 600;
  color: #556570;
  margin-left: 6px;
`;

const QuestionText = styled.Text`
  font-size: 26px;
  line-height: 34px;
  font-weight: 700;
  color: #1a2730;
  letter-spacing: -0.4px;
`;

const CluesCard = styled.View`
  background-color: #ffffff;
  border-radius: 18px;
  border-width: 1px;
  border-color: #e3edf2;
  padding: 16px;
  margin-bottom: 20px;
`;

const CluesHeader = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const CluesHeaderLeft = styled.View`
  flex-direction: row;
  align-items: center;
  flex: 1;
  margin-right: 8px;
`;

const CluesTitle = styled.Text`
  font-size: 15px;
  font-weight: 700;
  color: #556570;
  margin-left: 6px;
`;

const ListenButton = styled.TouchableOpacity`
  width: 44px;
  height: 44px;
  border-radius: 22px;
  background-color: #e6eff3;
  align-items: center;
  justify-content: center;
`;

const ClueRow = styled.View`
  flex-direction: row;
  align-items: flex-start;
  background-color: #f7fafc;
  border-radius: 14px;
  padding: 12px;
  margin-bottom: 10px;
`;

const ClueNumber = styled.View`
  width: 28px;
  height: 28px;
  border-radius: 14px;
  background-color: #e6eff3;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  margin-top: 1px;
`;

const ClueNumberText = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: #0f4c5c;
`;

const ClueText = styled.Text`
  flex: 1;
  font-size: 17px;
  line-height: 25px;
  color: #1a2730;
`;

const ClueEmphasis = styled.Text`
  font-weight: 700;
  color: #0f4c5c;
`;

const OptionsSection = styled.View`
  margin-bottom: 20px;
`;

const OptionsLabel = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: 10px;
`;

const OptionsLabelText = styled.Text`
  font-size: 15px;
  font-weight: 700;
  color: #556570;
  margin-left: 6px;
`;

const OptionButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  min-height: 64px;
  border-radius: 14px;
  border-width: 2px;
  padding: 12px 14px;
  margin-bottom: 10px;
  ${({ status }) => {
    if (status === 'selected') {
      return `
        background-color: #0f4c5c;
        border-color: #0f4c5c;
      `;
    }
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

const OptionLeft = styled.View`
  flex: 1;
  flex-direction: row;
  align-items: center;
  margin-right: 8px;
`;

const OptionCircle = styled.View`
  width: 28px;
  height: 28px;
  border-radius: 14px;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  background-color: ${({ status }) => {
    if (status === 'selected') return '#ffffff';
    if (status === 'correct') return '#2f6b53';
    if (status === 'wrong') return '#b3261e';
    return '#e6eff3';
  }};
`;

const OptionCircleDot = styled.View`
  width: 10px;
  height: 10px;
  border-radius: 5px;
  background-color: ${({ status }) =>
    status === 'muted' ? 'transparent' : '#9fb2bc'};
`;

const OptionLabel = styled.Text`
  flex: 1;
  font-size: 18px;
  font-weight: 700;
  color: ${({ status }) => {
    if (status === 'selected' || status === 'wrong') return '#ffffff';
    if (status === 'correct') return '#2f6b53';
    if (status === 'muted') return '#8a97a0';
    return '#1a2730';
  }};
`;

const OptionState = styled.Text`
  font-size: 13px;
  font-weight: 600;
  color: ${({ status }) => {
    if (status === 'selected') return '#d7e7ec';
    if (status === 'correct') return '#2f6b53';
    if (status === 'wrong') return '#7a1c17';
    if (status === 'muted') return '#98a4ac';
    return '#556570';
  }};
`;

const ConfirmButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  min-height: 58px;
  border-radius: 14px;
  background-color: #0f4c5c;
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
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

const ConfirmButtonText = styled.Text`
  color: #ffffff;
  font-size: 17px;
  font-weight: 700;
  margin-right: 8px;
`;

const FeedbackCard = styled.View`
  background-color: #ffffff;
  border-radius: 20px;
  border-width: 1px;
  border-color: #e3edf2;
  padding: 16px;
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
