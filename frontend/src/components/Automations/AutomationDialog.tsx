import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Grid,
  Typography,
  Box,
  Divider,
  CircularProgress,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { CREATE_AUTOMATION, UPDATE_AUTOMATION } from '../../graphql/automations';
import { gql } from '@apollo/client';
import useToast from '../../hooks/useToast';

// Query para buscar projetos (necessário para selecionar o projeto na automação)
const GET_PROJECTS = gql`
  query GetProjects {
    projects {
      id
      name
    }
  }
`;

interface AutomationDialogProps {
  open: boolean;
  onClose: (refetchData?: boolean) => void;
  automation?: any;
  projectId?: string;
}

const AutomationDialog: React.FC<AutomationDialogProps> = ({
  open,
  onClose,
  automation,
  projectId,
}) => {
  const { showToast } = useToast();
  const isEditing = !!automation;

  // Estado do formulário
  const [formState, setFormState] = useState({
    name: '',
    description: '',
    triggerType: '',
    triggerConditions: '',
    actionType: '',
    actionParameters: '',
    isActive: true,
    projectId: projectId || '',
  });

  // Estado de validação
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Buscar projetos para o dropdown
  const { data: projectsData } = useQuery(GET_PROJECTS, {
    skip: !!projectId, // Pular se já temos um projectId
  });

  // Mutações GraphQL
  const [createAutomation, { loading: createLoading }] = useMutation(CREATE_AUTOMATION, {
    onCompleted: () => {
      showToast('Automação criada com sucesso!', 'success');
      onClose(true);
    },
    onError: (error) => {
      showToast(`Erro ao criar automação: ${error.message}`, 'error');
    },
  });

  const [updateAutomation, { loading: updateLoading }] = useMutation(UPDATE_AUTOMATION, {
    onCompleted: () => {
      showToast('Automação atualizada com sucesso!', 'success');
      onClose(true);
    },
    onError: (error) => {
      showToast(`Erro ao atualizar automação: ${error.message}`, 'error');
    },
  });

  // Carregar dados da automação quando estiver editando
  useEffect(() => {
    if (automation) {
      setFormState({
        name: automation.name || '',
        description: automation.description || '',
        triggerType: automation.triggerType || '',
        triggerConditions: automation.triggerConditions || '',
        actionType: automation.actionType || '',
        actionParameters: automation.actionParameters || '',
        isActive: automation.isActive !== undefined ? automation.isActive : true,
        projectId: automation.project?.id || projectId || '',
      });
    } else {
      // Reset para valores padrão quando estiver criando
      setFormState({
        name: '',
        description: '',
        triggerType: '',
        triggerConditions: '',
        actionType: '',
        actionParameters: '',
        isActive: true,
        projectId: projectId || '',
      });
    }
    setErrors({});
  }, [automation, projectId, open]);

  // Handler para mudanças nos campos de texto
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked } = e.target;
    
    if (name === 'isActive') {
      setFormState(prev => ({ ...prev, [name]: checked }));
    } else if (name) {
      setFormState(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handler para mudanças nos campos Select
  const handleSelectChange = (e: any) => {
    const { name, value } = e.target;
    if (name) {
      setFormState(prev => ({ ...prev, [name]: value }));
    }
  };

  // Validação do formulário
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formState.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    
    if (!formState.triggerType) {
      newErrors.triggerType = 'Tipo de gatilho é obrigatório';
    }
    
    if (!formState.actionType) {
      newErrors.actionType = 'Tipo de ação é obrigatório';
    }
    
    // Validar JSON para triggerConditions e actionParameters
    if (formState.triggerConditions) {
      try {
        JSON.parse(formState.triggerConditions);
      } catch (e) {
        newErrors.triggerConditions = 'JSON inválido';
      }
    }
    
    if (formState.actionParameters) {
      try {
        JSON.parse(formState.actionParameters);
      } catch (e) {
        newErrors.actionParameters = 'JSON inválido';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handler para submissão do formulário
  const handleSubmit = () => {
    if (!validateForm()) return;
    
    const input = {
      ...formState,
      // Converter para JSON se for string
      triggerConditions: formState.triggerConditions ? formState.triggerConditions : undefined,
      actionParameters: formState.actionParameters ? formState.actionParameters : undefined,
    };
    
    if (isEditing) {
      updateAutomation({
        variables: {
          id: automation.id,
          input,
        },
      });
    } else {
      createAutomation({
        variables: {
          input,
        },
      });
    }
  };

  // Opções para os selects
  const triggerTypes = [
    { value: 'TASK_CREATED', label: 'Tarefa criada' },
    { value: 'TASK_COMPLETED', label: 'Tarefa concluída' },
    { value: 'TASK_MOVED', label: 'Tarefa movida' },
    { value: 'TASK_ASSIGNED', label: 'Tarefa atribuída' },
    { value: 'TASK_DUE_DATE', label: 'Prazo de tarefa' },
    { value: 'PROJECT_CREATED', label: 'Projeto criado' },
    { value: 'PROJECT_COMPLETED', label: 'Projeto concluído' },
  ];

  const actionTypes = [
    { value: 'SEND_NOTIFICATION', label: 'Enviar notificação' },
    { value: 'ASSIGN_TASK', label: 'Atribuir tarefa' },
    { value: 'MOVE_TASK', label: 'Mover tarefa' },
    { value: 'CREATE_TASK', label: 'Criar tarefa' },
    { value: 'UPDATE_TASK_PRIORITY', label: 'Atualizar prioridade' },
    { value: 'SEND_EMAIL', label: 'Enviar e-mail' },
  ];

  // Exemplos de parâmetros para ajudar o usuário
  const getTriggerConditionsExample = (type: string) => {
    switch (type) {
      case 'TASK_CREATED':
        return '{ "priority": "HIGH" }';
      case 'TASK_MOVED':
        return '{ "toSectionId": "section-id-here" }';
      case 'TASK_ASSIGNED':
        return '{ "assigneeId": "user-id-here" }';
      case 'TASK_DUE_DATE':
        return '{ "daysBeforeDue": 1 }';
      default:
        return '{}';
    }
  };

  const getActionParametersExample = (type: string) => {
    switch (type) {
      case 'SEND_NOTIFICATION':
        return '{ "message": "Sua tarefa foi movida" }';
      case 'ASSIGN_TASK':
        return '{ "assigneeId": "user-id-here" }';
      case 'MOVE_TASK':
        return '{ "sectionId": "section-id-here" }';
      case 'CREATE_TASK':
        return '{ "title": "Nova tarefa", "sectionId": "section-id-here" }';
      case 'UPDATE_TASK_PRIORITY':
        return '{ "priority": "HIGH" }';
      case 'SEND_EMAIL':
        return '{ "subject": "Notificação", "body": "Conteúdo do email" }';
      default:
        return '{}';
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose()} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEditing ? 'Editar Automação' : 'Nova Automação'}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              name="name"
              label="Nome da Automação"
              value={formState.name}
              onChange={handleChange}
              fullWidth
              required
              error={!!errors.name}
              helperText={errors.name}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              name="description"
              label="Descrição"
              value={formState.description}
              onChange={handleChange}
              fullWidth
              multiline
              rows={2}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth required error={!!errors.triggerType}>
              <InputLabel>Gatilho</InputLabel>
              <Select
                name="triggerType"
                value={formState.triggerType}
                onChange={handleSelectChange}
                label="Gatilho"
              >
                {triggerTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
              {errors.triggerType && <FormHelperText>{errors.triggerType}</FormHelperText>}
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth required error={!!errors.actionType}>
              <InputLabel>Ação</InputLabel>
              <Select
                name="actionType"
                value={formState.actionType}
                onChange={handleSelectChange}
                label="Ação"
              >
                {actionTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
              {errors.actionType && <FormHelperText>{errors.actionType}</FormHelperText>}
            </FormControl>
          </Grid>

          {!projectId && (
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Projeto (opcional)</InputLabel>
                <Select
                  name="projectId"
                  value={formState.projectId}
                  onChange={handleSelectChange}
                  label="Projeto (opcional)"
                >
                  <MenuItem value="">Global (todos os projetos)</MenuItem>
                  {projectsData?.projects.map((project: any) => (
                    <MenuItem key={project.id} value={project.id}>
                      {project.name}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  Se não selecionar um projeto, a automação será aplicada globalmente
                </FormHelperText>
              </FormControl>
            </Grid>
          )}

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" gutterBottom>
              Configurações Avançadas
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Condições do Gatilho (JSON)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <TextField
                  name="triggerConditions"
                  label="Condições do Gatilho (JSON)"
                  value={formState.triggerConditions}
                  onChange={handleChange}
                  fullWidth
                  multiline
                  rows={4}
                  error={!!errors.triggerConditions}
                  helperText={errors.triggerConditions || 'Especifique condições adicionais em formato JSON'}
                />
                {formState.triggerType && (
                  <Box sx={{ mt: 2 }}>
                    <Alert severity="info">
                      <Typography variant="body2">
                        Exemplo para {triggerTypes.find(t => t.value === formState.triggerType)?.label}:
                      </Typography>
                      <pre style={{ marginTop: 8 }}>
                        {getTriggerConditionsExample(formState.triggerType)}
                      </pre>
                    </Alert>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          </Grid>

          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Parâmetros da Ação (JSON)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <TextField
                  name="actionParameters"
                  label="Parâmetros da Ação (JSON)"
                  value={formState.actionParameters}
                  onChange={handleChange}
                  fullWidth
                  multiline
                  rows={4}
                  error={!!errors.actionParameters}
                  helperText={errors.actionParameters || 'Especifique parâmetros para a ação em formato JSON'}
                />
                {formState.actionType && (
                  <Box sx={{ mt: 2 }}>
                    <Alert severity="info">
                      <Typography variant="body2">
                        Exemplo para {actionTypes.find(t => t.value === formState.actionType)?.label}:
                      </Typography>
                      <pre style={{ marginTop: 8 }}>
                        {getActionParametersExample(formState.actionType)}
                      </pre>
                    </Alert>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  name="isActive"
                  checked={formState.isActive}
                  onChange={handleChange}
                  color="primary"
                />
              }
              label="Ativar automação imediatamente"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose()} disabled={createLoading || updateLoading}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={createLoading || updateLoading}
          startIcon={createLoading || updateLoading ? <CircularProgress size={20} /> : null}
        >
          {isEditing ? 'Atualizar' : 'Criar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AutomationDialog;