import React from 'react';
import { render } from '@testing-library/react';
import App from './App';

// Mock do localStorage para os testes
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(() => null),
    setItem: jest.fn(() => null),
    removeItem: jest.fn(() => null),
    clear: jest.fn(() => null),
  },
  writable: true,
});

// Mock do WebSocket
global.WebSocket = jest.fn(() => ({
  close: jest.fn(),
  send: jest.fn(),
})) as any;

test('renders app without crashing', () => {
  render(<App />);
  // Verifica se o componente renderiza sem erros
  expect(document.body).toBeInTheDocument();
});
