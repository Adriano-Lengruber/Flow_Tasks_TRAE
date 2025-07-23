import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ApolloClient, InMemoryCache, ApolloProvider, createHttpLink, split } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { getMainDefinition } from '@apollo/client/utilities';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { NotificationsProvider } from './components/Notifications/NotificationsProvider';
import { ThemeProvider } from './contexts/ThemeContext';
import { MainLayout } from './components/Layout/MainLayout';
import './App.css';

// Páginas
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Tasks from './pages/Tasks';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';
import NotificationPreferencesPage from './pages/NotificationPreferencesPage';
import Automations from './pages/Automations';
import GanttPage from './pages/Gantt';

// O tema agora é gerenciado pelo ThemeContext

// Configuração do Apollo Client
const httpLink = createHttpLink({
  uri: 'http://localhost:3000/graphql',
});

// Link para WebSocket (subscriptions)
const wsLink = new GraphQLWsLink(createClient({
  url: 'ws://localhost:3000/graphql',
  connectionParams: () => {
    const token = localStorage.getItem('token');
    return {
      authorization: token ? `Bearer ${token}` : '',
    };
  },
}));

// Adicionar token de autenticação aos headers
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

// Dividir links entre operações de query/mutation e subscription
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  authLink.concat(httpLink)
);

const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});

// Componente para rotas protegidas
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  // Envolver o ApolloProvider em uma função para evitar problemas com hooks
  const AppWithProviders = () => (
    <ThemeProvider>
      <AuthProvider>
        <NotificationsProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Dashboard />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Projects />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects/:id"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <ProjectDetail />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tasks"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Tasks />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route path="/notification-preferences" element={
                <ProtectedRoute>
                  <MainLayout>
                    <NotificationPreferencesPage />
                  </MainLayout>
                </ProtectedRoute>
              } />
              <Route path="/automations" element={
                <ProtectedRoute>
                  <MainLayout>
                    <Automations />
                  </MainLayout>
                </ProtectedRoute>
              } />
              <Route path="/gantt" element={
                <ProtectedRoute>
                  <MainLayout>
                    <GanttPage />
                  </MainLayout>
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
        </NotificationsProvider>
      </AuthProvider>
    </ThemeProvider>
  );

  return (
    <ApolloProvider client={client}>
      <AppWithProviders />
    </ApolloProvider>
  );
}

export default App;
