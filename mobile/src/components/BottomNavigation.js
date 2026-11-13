import React from 'react';
import { Platform } from 'react-native';
import styled from 'styled-components/native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * Componente: BottomNavigation
 *
 * Barra de navegacao inferior compartilhada pelas telas do Mente Ativa.
 * Mantem os mesmos 4 destinos do protótipo (Início, Jogos, Progresso e Perfil),
 * com alvos de toque generosos para facilitar o uso por pessoas idosas.
 *
 * @param {Object} props
 * @param {'inicio'|'jogos'|'progresso'|'perfil'} [props.activeTab='inicio']
 * @param {Function} [props.onNavigateTab] - Recebe a chave da aba tocada
 */
export default function BottomNavigation({ activeTab = 'inicio', onNavigateTab }) {
  return (
    <Container>
      <ItemsRow>
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === activeTab;

          return (
            <Item
              key={item.key}
              onPress={() => onNavigateTab?.(item.key)}
              activeOpacity={0.7}
              isActive={isActive}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={item.label}
            >
              {item.family === 'material' ? (
                <MaterialCommunityIcons
                  name={item.icon}
                  size={26}
                  color={isActive ? '#0f4c5c' : '#6b7c88'}
                />
              ) : (
                <Feather
                  name={item.icon}
                  size={25}
                  color={isActive ? '#0f4c5c' : '#6b7c88'}
                />
              )}
              <ItemLabel isActive={isActive}>{item.label}</ItemLabel>
            </Item>
          );
        })}
      </ItemsRow>
    </Container>
  );
}

const NAV_ITEMS = [
  { key: 'inicio', label: 'Início', icon: 'home', family: 'feather' },
  { key: 'jogos', label: 'Jogos', icon: 'puzzle-outline', family: 'material' },
  { key: 'progresso', label: 'Progresso', icon: 'bar-chart-2', family: 'feather' },
  { key: 'perfil', label: 'Perfil', icon: 'user', family: 'feather' },
];

const Container = styled.View`
  background-color: #fbfdfe;
  border-top-width: 1px;
  border-top-color: #e3edf2;
  padding-bottom: ${Platform.OS === 'ios' ? 22 : 8}px;
  ${Platform.OS === 'ios'
    ? `
      shadow-color: #0f4c5c;
      shadow-offset: 0px -2px;
      shadow-opacity: 0.08;
      shadow-radius: 8px;
    `
    : `
      elevation: 12;
    `}
`;

const ItemsRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-around;
  height: 68px;
  padding-horizontal: 4px;
`;

const Item = styled.TouchableOpacity`
  flex: 1;
  min-height: 56px;
  min-width: 64px;
  align-items: center;
  justify-content: center;
  margin-horizontal: 4px;
  padding-vertical: 6px;
  border-radius: 14px;
  background-color: ${({ isActive }) => (isActive ? '#dcefe4' : 'transparent')};
`;

const ItemLabel = styled.Text`
  margin-top: 3px;
  font-size: 13px;
  font-weight: ${({ isActive }) => (isActive ? '700' : '600')};
  color: ${({ isActive }) => (isActive ? '#0f4c5c' : '#6b7c88')};
`;
