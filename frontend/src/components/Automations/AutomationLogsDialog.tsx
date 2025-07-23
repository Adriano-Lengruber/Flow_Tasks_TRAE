import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Box,
  CircularProgress,
  Tooltip,
  IconButton,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { GET_AUTOMATION_LOGS } from '../../graphql/automations';

interface AutomationLogsDialogProps {
  open: boolean;
  onClose: () => void;
  automation: any;
}

const AutomationLogsDialog: React.FC<AutomationLogsDialogProps> = ({
  open,
  onClose,
  automation,
}) => {
  // Estado para paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Buscar logs da automação
  const { data, loading, error, refetch } = useQuery(GET_AUTOMATION_LOGS, {
    variables: {
      automationId: automation?.id,
      skip: page * rowsPerPage,
      take: rowsPerPage,
    },
    skip: !open || !automation?.id, // Não buscar se o diálogo não estiver aberto ou não tiver automação
    fetchPolicy: 'network-only', // Sempre buscar do servidor
  });

  // Handlers para paginação
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Formatar data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  // Renderizar chip de status
  const renderStatusChip = (status: string) => {
    let color: 'success' | 'error' | 'warning' | 'default' = 'default';
    let label = status;

    switch (status) {
      case 'SUCCESS':
        color = 'success';
        label = 'Sucesso';
        break;
      case 'FAILED':
        color = 'error';
        label = 'Falha';
        break;
      case 'PENDING':
        color = 'warning';
        label = 'Pendente';
        break;
      default:
        color = 'default';
    }

    return <Chip size="small" color={color} label={label} />;
  };

  // Renderizar conteúdo do diálogo
  const renderContent = () => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" p={4}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Box p={2}>
          <Typography color="error">
            Erro ao carregar logs: {error.message}
          </Typography>
        </Box>
      );
    }

    if (!data?.automationLogs || data.automationLogs.items.length === 0) {
      return (
        <Box p={2}>
          <Typography align="center">
            Nenhum log encontrado para esta automação.
          </Typography>
        </Box>
      );
    }

    return (
      <>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Data/Hora</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Evento</TableCell>
                <TableCell>Detalhes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.automationLogs.items.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell>{formatDate(log.createdAt)}</TableCell>
                  <TableCell>{renderStatusChip(log.status)}</TableCell>
                  <TableCell>{log.triggerEvent}</TableCell>
                  <TableCell>
                    <Tooltip title={log.details || 'Sem detalhes'}>
                      <Typography
                        variant="body2"
                        sx={{
                          maxWidth: 250,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {log.details || 'Sem detalhes'}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={data.automationLogs.totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Linhas por página:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
          }
        />
      </>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Logs da Automação: {automation?.name || 'Carregando...'}
          </Typography>
          <Tooltip title="Atualizar">
            <IconButton onClick={() => refetch()} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {renderContent()}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AutomationLogsDialog;