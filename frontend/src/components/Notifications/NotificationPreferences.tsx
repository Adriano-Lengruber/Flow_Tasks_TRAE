import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  GET_NOTIFICATION_PREFERENCES,
  UPDATE_NOTIFICATION_PREFERENCES
} from '../../graphql/notifications';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormGroup,
  FormControlLabel,
  Switch,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Divider
} from '@mui/material';

interface NotificationPreference {
  id: string;
  taskAssigned: boolean;
  taskCompleted: boolean;
  taskMoved: boolean;
  taskComment: boolean;
  projectCreated: boolean;
  projectUpdated: boolean;
  deadlineApproaching: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

const NotificationPreferences: React.FC = () => {
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const { loading: loadingPreferences } = useQuery(GET_NOTIFICATION_PREFERENCES, {
    onCompleted: (data) => {
      if (data?.notificationPreferences) {
        setPreferences(data.notificationPreferences);
      }
    },
    onError: (error) => {
      console.error('Erro ao carregar preferências:', error);
      setSnackbarMessage('Erro ao carregar preferências de notificação');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    },
  });

  const [updatePreferences, { loading: updating }] = useMutation(UPDATE_NOTIFICATION_PREFERENCES, {
    onCompleted: () => {
      setSnackbarMessage('Preferências atualizadas com sucesso!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    },
    onError: (error) => {
      console.error('Erro ao atualizar preferências:', error);
      setSnackbarMessage('Erro ao atualizar preferências');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    },
  });

  const handleToggle = (field: keyof NotificationPreference) => {
    if (!preferences) return;
    
    const updatedPreferences = {
      ...preferences,
      [field]: !preferences[field],
    };
    
    setPreferences(updatedPreferences);
    
    // Atualizar no servidor
    updatePreferences({
      variables: {
        input: {
          [field]: updatedPreferences[field],
        },
      },
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  if (loadingPreferences) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (!preferences) {
    return (
      <Box p={3}>
        <Typography color="error">Não foi possível carregar as preferências de notificação.</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>Preferências de Notificação</Typography>
      
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Tipos de Notificação</Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Escolha quais tipos de notificações você deseja receber.
          </Typography>
          
          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.taskAssigned}
                  onChange={() => handleToggle('taskAssigned')}
                  disabled={updating}
                />
              }
              label="Tarefas atribuídas a mim"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.taskCompleted}
                  onChange={() => handleToggle('taskCompleted')}
                  disabled={updating}
                />
              }
              label="Tarefas concluídas"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.taskMoved}
                  onChange={() => handleToggle('taskMoved')}
                  disabled={updating}
                />
              }
              label="Tarefas movidas entre colunas"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.taskComment}
                  onChange={() => handleToggle('taskComment')}
                  disabled={updating}
                />
              }
              label="Comentários em tarefas"
            />
          </FormGroup>

          <Divider sx={{ my: 2 }} />
          
          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.projectCreated}
                  onChange={() => handleToggle('projectCreated')}
                  disabled={updating}
                />
              }
              label="Novos projetos criados"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.projectUpdated}
                  onChange={() => handleToggle('projectUpdated')}
                  disabled={updating}
                />
              }
              label="Atualizações em projetos"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.deadlineApproaching}
                  onChange={() => handleToggle('deadlineApproaching')}
                  disabled={updating}
                />
              }
              label="Prazos se aproximando"
            />
          </FormGroup>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Canais de Notificação</Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Escolha como você deseja receber suas notificações.
          </Typography>
          
          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.pushNotifications}
                  onChange={() => handleToggle('pushNotifications')}
                  disabled={updating}
                />
              }
              label="Notificações no navegador"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.emailNotifications}
                  onChange={() => handleToggle('emailNotifications')}
                  disabled={updating}
                />
              }
              label="Notificações por e-mail"
            />
          </FormGroup>
        </CardContent>
      </Card>

      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default NotificationPreferences;