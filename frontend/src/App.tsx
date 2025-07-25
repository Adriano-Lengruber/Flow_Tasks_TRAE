import React, { Suspense, useEffect } from 'react';
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
import LoadingSkeleton from './components/common/LoadingSkeleton';
import { register as registerSW } from './utils/serviceWorker';
import useToast from './hooks/useToast';
// Páginas sem lazy loading (carregamento imediato)
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';
import './App.css';

// Páginas com lazy loading
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Projects = React.lazy(() => import('./pages/Projects'));
const ProjectDetail = React.lazy(() => import('./pages/ProjectDetail'));
const Tasks = React.lazy(() => import('./pages/Tasks'));
const NotificationPreferencesPage = React.lazy(() => import('./pages/NotificationPreferencesPage'));
const Automations = React.lazy(() => import('./pages/Automations'));
const GanttPage = React.lazy(() => import('./pages/Gantt'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const MetricsDashboardPage = React.lazy(() => import('./pages/MetricsDashboardPage'));

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

// Componente interno para usar hooks
const AppContent: React.FC = () => {
  const { showToast } = useToast();

  useEffect(() => {
    // Registrar Service Worker
    registerSW({
      onSuccess: (registration) => {
        console.log('[App] Service Worker registrado com sucesso:', registration);
        showToast('Aplicação pronta para uso offline', 'success');
      },
      onUpdate: (registration) => {
        console.log('[App] Nova versão disponível:', registration);
        showToast('Nova versão disponível - Recarregue a página para atualizar', 'info');
      },
      onOffline: () => {
        showToast('Modo offline ativado', 'warning');
      },
      onOnline: () => {
        showToast('Conexão restaurada', 'success');
      }
    });
  }, [showToast]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<LoadingSkeleton />}>
                  <Dashboard />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<LoadingSkeleton />}>
                  <Projects />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<LoadingSkeleton />}>
                  <ProjectDetail />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<LoadingSkeleton />}>
                  <Tasks />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/notification-preferences" element={
          <ProtectedRoute>
            <MainLayout>
              <Suspense fallback={<LoadingSkeleton />}>
                <NotificationPreferencesPage />
              </Suspense>
            </MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/automations" element={
          <ProtectedRoute>
            <MainLayout>
              <Suspense fallback={<LoadingSkeleton />}>
                <Automations />
              </Suspense>
            </MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/gantt" element={
          <ProtectedRoute>
            <MainLayout>
              <Suspense fallback={<LoadingSkeleton />}>
                <GanttPage />
              </Suspense>
            </MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute>
            <MainLayout>
              <Suspense fallback={<LoadingSkeleton />}>
                <AdminDashboard />
              </Suspense>
            </MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/metrics" element={
          <ProtectedRoute>
            <MainLayout>
              <Suspense fallback={<LoadingSkeleton />}>
                <MetricsDashboardPage />
              </Suspense>
            </MainLayout>
          </ProtectedRoute>
        } />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
};

function App() {
  // Envolver o ApolloProvider em uma função para evitar problemas com hooks
  const AppWithProviders = () => (
    <ThemeProvider>
      <AuthProvider>
        <NotificationsProvider>
          <AppContent />
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
