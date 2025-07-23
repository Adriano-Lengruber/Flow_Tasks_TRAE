import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  Typography,
  Box,
  Paper,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Divider,
  Switch,
  FormControlLabel,
  Tooltip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardActions,
  CardHeader,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { 
  GET_AUTOMATIONS, 
  TOGGLE_AUTOMATION_ACTIVE, 
  REMOVE_AUTOMATION 
} from '../graphql/automations';
import AutomationDialog from '../components/Automations/AutomationDialog';
import AutomationLogsDialog from '../components/Automations/AutomationLogsDialog';
import ResponsiveContainer from '../components/common/ResponsiveContainer';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import useToast from '../hooks/useToast';

const Automations: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  // Estados locais
  const [openDialog, setOpenDialog] = useState(false);
  const [openLogsDialog, setOpenLogsDialog] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Consulta GraphQL para buscar automações
  const { data, loading, error, refetch } = useQuery(GET_AUTOMATIONS, {
    variables: { projectId },
    fetchPolicy: 'cache-and-network',
  });

  // Mutações GraphQL
  const [toggleActive] = useMutation(TOGGLE_AUTOMATION_ACTIVE, {
    onCompleted: (data) => {
      const status = data.toggleAutomationActive.isActive ? 'ativada' : 'desativada';
      showToast(`Automação ${status} com sucesso!`, 'success');
      refetch();
    },
    onError: (error) => {
      showToast(`Erro ao alterar status da automação: ${error.message}`, 'error');
    },
  });

  const [removeAutomation] = useMutation(REMOVE_AUTOMATION, {
    onCompleted: () => {
      showToast('Automação removida com sucesso!', 'success');
      refetch();
      setConfirmDelete(null);
    },
    onError: (error) => {
      showToast(`Erro ao remover automação: ${error.message}`, 'error');
      setConfirmDelete(null);
    },
  });

  // Handlers
  const handleOpenDialog = (automation?: any) => {
    setSelectedAutomation(automation || null);
    setOpenDialog(true);
  };

  const handleCloseDialog = (refetchData: boolean = false) => {
    setOpenDialog(false);
    setSelectedAutomation(null);
    if (refetchData) refetch();
  };

  const handleOpenLogsDialog = (automation: any) => {
    setSelectedAutomation(automation);
    setOpenLogsDialog(true);
  };

  const handleCloseLogsDialog = () => {
    setOpenLogsDialog(false);
    setSelectedAutomation(null);
  };

  const handleToggleActive = (id: string) => {
    toggleActive({ variables: { id } });
  };

  const handleDelete = (id: string) => {
    setConfirmDelete(id);
  };

  const confirmDeleteAutomation = () => {
    if (confirmDelete) {
      removeAutomation({ variables: { id: confirmDelete } });
    }
  };

  const getTriggerTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      TASK_CREATED: 'Tarefa criada',
      TASK_COMPLETED: 'Tarefa concluída',
      TASK_MOVED: 'Tarefa movida',
      TASK_ASSIGNED: 'Tarefa atribuída',
      TASK_DUE_DATE: 'Prazo de tarefa',
      PROJECT_CREATED: 'Projeto criado',
      PROJECT_COMPLETED: 'Projeto concluído',
    };
    return labels[type] || type;
  };

  const getActionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      SEND_NOTIFICATION: 'Enviar notificação',
      ASSIGN_TASK: 'Atribuir tarefa',
      MOVE_TASK: 'Mover tarefa',
      CREATE_TASK: 'Criar tarefa',
      UPDATE_TASK_PRIORITY: 'Atualizar prioridade',
      SEND_EMAIL: 'Enviar e-mail',
    };
    return labels[type] || type;
  };

  // Renderização
  if (loading && !data) {
    return (
      <ResponsiveContainer>
        <LoadingSkeleton variant="project-list" count={6} />
      </ResponsiveContainer>
    );
  }

  if (error) {
    return (
      <ResponsiveContainer>
        <Alert severity="error">
          Erro ao carregar automações: {error.message}
        </Alert>
      </ResponsiveContainer>
    );
  }

  const automations = data?.automations || [];

  return (
    <ResponsiveContainer>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Automações {projectId ? 'do Projeto' : ''}
          </Typography>
          <Box>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => refetch()}
              sx={{ mr: 1 }}
            >
              Atualizar
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Nova Automação
            </Button>
          </Box>
        </Box>

        {automations.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="textSecondary" gutterBottom>
              Nenhuma automação encontrada
            </Typography>
            <Typography variant="body1" color="textSecondary" paragraph>
              Crie sua primeira automação para aumentar a produtividade do seu fluxo de trabalho.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Criar Automação
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {automations.map((automation: any) => (
              <Grid item xs={12} md={6} lg={4} key={automation.id}>
                <Card 
                  elevation={2} 
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    opacity: automation.isActive ? 1 : 0.7,
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: 6,
                    },
                  }}
                >
                  <CardHeader
                    title={automation.name}
                    subheader={
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        <Chip 
                          size="small" 
                          label={getTriggerTypeLabel(automation.triggerType)} 
                          color="primary" 
                          variant="outlined" 
                          sx={{ mr: 1 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(automation.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                        </Typography>
                      </Box>
                    }
                    action={
                      <FormControlLabel
                        control={
                          <Switch
                            checked={automation.isActive}
                            onChange={() => handleToggleActive(automation.id)}
                            color="primary"
                          />
                        }
                        label={automation.isActive ? "Ativa" : "Inativa"}
                        labelPlacement="start"
                      />
                    }
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    {automation.description && (
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {automation.description}
                      </Typography>
                    )}
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Quando: {getTriggerTypeLabel(automation.triggerType)}
                      </Typography>
                      <Typography variant="subtitle2" gutterBottom>
                        Ação: {getActionTypeLabel(automation.actionType)}
                      </Typography>
                      {automation.executionCount > 0 && (
                        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                          <Tooltip title="Número de execuções">
                            <Chip 
                              size="small" 
                              label={`${automation.executionCount} execuções`} 
                              color="secondary" 
                              variant="outlined" 
                            />
                          </Tooltip>
                          {automation.lastExecutedAt && (
                            <Tooltip title="Última execução">
                              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                Última: {format(new Date(automation.lastExecutedAt), 'dd/MM HH:mm', { locale: ptBR })}
                              </Typography>
                            </Tooltip>
                          )}
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                  <Divider />
                  <CardActions>
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => handleOpenDialog(automation)}
                    >
                      Editar
                    </Button>
                    <Button
                      size="small"
                      startIcon={<HistoryIcon />}
                      onClick={() => handleOpenLogsDialog(automation)}
                    >
                      Logs
                    </Button>
                    <Box sx={{ flexGrow: 1 }} />
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(automation.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Dialog de criação/edição de automação */}
      <AutomationDialog
        open={openDialog}
        onClose={handleCloseDialog}
        automation={selectedAutomation}
        projectId={projectId}
      />

      {/* Dialog de logs de automação */}
      <AutomationLogsDialog
        open={openLogsDialog}
        onClose={handleCloseLogsDialog}
        automation={selectedAutomation}
      />

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Confirmar exclusão</DialogTitle>
        <DialogContent>
          <Typography>Tem certeza que deseja excluir esta automação? Esta ação não pode ser desfeita.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancelar</Button>
          <Button onClick={confirmDeleteAutomation} color="error" variant="contained">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </ResponsiveContainer>
  );
};

export default Automations;