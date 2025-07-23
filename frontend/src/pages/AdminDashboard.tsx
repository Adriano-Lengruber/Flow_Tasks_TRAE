import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Badge,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Visibility as VisibilityIcon,
  Timeline as TimelineIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  BugReport as BugReportIcon,
  Code as CodeIcon,
  ExpandMore as ExpandMoreIcon,
  RestartAlt as RestartIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
  BarElement
} from 'chart.js';
import { adminApi, TestResult, PipelineStatus, QualityMetrics, HealthCheck, SecurityScan, PerformanceMetric } from '../services/adminApi';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement,
  BarElement
);

// Interfaces agora importadas do adminApi

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [pipelines, setPipelines] = useState<PipelineStatus[]>([]);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [securityScans, setSecurityScans] = useState<SecurityScan[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTest, setSelectedTest] = useState<TestResult | null>(null);
  const [selectedPipeline, setSelectedPipeline] = useState<PipelineStatus | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pipelineDetailsOpen, setPipelineDetailsOpen] = useState(false);

  // Simular dados em tempo real
  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Atualizar a cada 30s
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [tests, pipelines, health, quality, security, performance] = await Promise.all([
        adminApi.getTestResults(),
        adminApi.getPipelineStatus(),
        adminApi.getHealthChecks(),
        adminApi.getQualityMetrics(),
        adminApi.getSecurityScans(),
        adminApi.getPerformanceMetrics()
      ]);
      
      setTestResults(tests);
      setPipelines(pipelines);
      setHealthChecks(health);
      setQualityMetrics(quality);
      setSecurityScans(security);
      setPerformanceMetrics(performance);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Funções de carregamento removidas - agora usamos adminApi diretamente

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
      case 'success':
      case 'healthy':
        return 'success';
      case 'failed':
      case 'unhealthy':
        return 'error';
      case 'running':
      case 'pending':
      case 'degraded':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
      case 'success':
      case 'healthy':
        return <CheckCircleIcon />;
      case 'failed':
      case 'unhealthy':
        return <ErrorIcon />;
      case 'running':
      case 'pending':
      case 'degraded':
        return <WarningIcon />;
      default:
        return <CircularProgress size={20} />;
    }
  };

  const qualityChartData = qualityMetrics ? {
    labels: ['Qualidade', 'Cobertura', 'Segurança', 'Performance', 'Acessibilidade', 'Manutenibilidade'],
    datasets: [
      {
        data: [
          qualityMetrics.codeQuality,
          qualityMetrics.testCoverage,
          qualityMetrics.security,
          qualityMetrics.performance,
          qualityMetrics.accessibility,
          qualityMetrics.maintainability
        ],
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40'
        ]
      }
    ]
  } : null;

  const performanceChartData = {
    labels: performanceMetrics.slice(-12).map((_, index) => `${12-index}h`),
    datasets: [
      {
        label: 'Tempo de Resposta (ms)',
        data: performanceMetrics.slice(-12).map(m => m.responseTime),
        borderColor: '#36A2EB',
        backgroundColor: 'rgba(54, 162, 235, 0.1)',
        tension: 0.4
      },
      {
        label: 'CPU Usage (%)',
        data: performanceMetrics.slice(-12).map(m => m.cpuUsage),
        borderColor: '#FF6384',
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        tension: 0.4
      }
    ]
  };

  const runTest = async (testId: string) => {
    setTestResults(prev => 
      prev.map(test => 
        test.id === testId 
          ? { ...test, status: 'running' as const, duration: 0 }
          : test
      )
    );

    try {
      await adminApi.runTest(testId);
      // Recarregar dados após execução
      const updatedTests = await adminApi.getTestResults();
      setTestResults(updatedTests);
    } catch (error) {
      console.error('Erro ao executar teste:', error);
      setTestResults(prev => 
        prev.map(test => 
          test.id === testId 
            ? { ...test, status: 'failed' as const }
            : test
        )
      );
    }
  };

  const showTestDetails = (test: TestResult) => {
    setSelectedTest(test);
    setDetailsOpen(true);
  };

  const showPipelineDetails = (pipeline: PipelineStatus) => {
    setSelectedPipeline(pipeline);
    setPipelineDetailsOpen(true);
  };

  const retryPipeline = async (pipelineId: string) => {
    try {
      await adminApi.retryPipeline(pipelineId);
      // Recarregar pipelines
      const updatedPipelines = await adminApi.getPipelineStatus();
      setPipelines(updatedPipelines);
    } catch (error) {
      console.error('Erro ao reiniciar pipeline:', error);
    }
  };

  const restartService = async (serviceName: string) => {
    try {
      await adminApi.restartService(serviceName);
      // Recarregar health checks
      const updatedHealth = await adminApi.getHealthChecks();
      setHealthChecks(updatedHealth);
    } catch (error) {
      console.error('Erro ao reiniciar serviço:', error);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Dashboard Administrativo
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadDashboardData}
          disabled={loading}
        >
          {loading ? 'Atualizando...' : 'Atualizar'}
        </Button>
      </Box>

      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Visão Geral" />
        <Tab label="Testes" />
        <Tab label="Pipelines" />
        <Tab label="Health Checks" />
        <Tab label="Segurança" />
        <Tab label="Métricas" />
      </Tabs>

      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Cards de Resumo */}
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CodeIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Testes</Typography>
                </Box>
                <Typography variant="h4" color="primary">
                  {testResults.filter(t => t.status === 'passed').length}/{testResults.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Passando
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TimelineIcon sx={{ mr: 1, color: 'success.main' }} />
                  <Typography variant="h6">Pipelines</Typography>
                </Box>
                <Typography variant="h4" color="success.main">
                  {pipelines.filter(p => p.status === 'success').length}/{pipelines.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Sucesso
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <SecurityIcon sx={{ mr: 1, color: 'warning.main' }} />
                  <Typography variant="h6">Segurança</Typography>
                </Box>
                <Typography variant="h4" color="warning.main">
                  {qualityMetrics?.security || 0}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Score
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <SpeedIcon sx={{ mr: 1, color: 'info.main' }} />
                  <Typography variant="h6">Performance</Typography>
                </Box>
                <Typography variant="h4" color="info.main">
                  {healthChecks.reduce((acc, h) => acc + h.responseTime, 0) / healthChecks.length}ms
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tempo Médio
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Gráficos */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Métricas de Qualidade
                </Typography>
                <Box sx={{ height: 300 }}>
                  {qualityChartData ? (
                    <Doughnut data={qualityChartData} options={{ maintainAspectRatio: false }} />
                  ) : (
                    <CircularProgress />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performance ao Longo do Tempo
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Line data={performanceChartData} options={{ maintainAspectRatio: false }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Status dos Testes
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Duração</TableCell>
                    <TableCell>Cobertura</TableCell>
                    <TableCell>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {testResults.map((test) => (
                    <TableRow key={test.id}>
                      <TableCell>{test.name}</TableCell>
                      <TableCell>
                        <Chip label={test.type} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(test.status)}
                          label={test.status}
                          color={getStatusColor(test.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{test.duration}s</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <LinearProgress
                            variant="determinate"
                            value={test.coverage}
                            sx={{ width: 100, mr: 1 }}
                          />
                          <Typography variant="body2">{test.coverage}%</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Executar Teste">
                          <IconButton
                            size="small"
                            onClick={() => runTest(test.id)}
                            disabled={test.status === 'running'}
                          >
                            <PlayArrowIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Ver Detalhes">
                          <IconButton
                            size="small"
                            onClick={() => showTestDetails(test)}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Status dos Pipelines CI/CD
            </Typography>
            {pipelines.map((pipeline) => (
              <Card key={pipeline.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box>
                      <Typography variant="h6">{pipeline.branch}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {pipeline.commit} por {pipeline.author}
                      </Typography>
                    </Box>
                    <Chip
                      icon={getStatusIcon(pipeline.status)}
                      label={pipeline.status}
                      color={getStatusColor(pipeline.status) as any}
                    />
                  </Box>
                  <Typography variant="body2" gutterBottom>
                    Estágio: {pipeline.stage}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={pipeline.progress}
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {pipeline.progress}% completo
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {activeTab === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Health Checks dos Serviços
            </Typography>
            <Grid container spacing={2}>
              {healthChecks.map((health, index) => (
                <Grid item xs={12} md={4} key={index}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">{health.service}</Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Chip
                            icon={getStatusIcon(health.status)}
                            label={health.status}
                            color={getStatusColor(health.status) as any}
                            size="small"
                          />
                          {health.status !== 'healthy' && (
                            <Tooltip title="Reiniciar Serviço">
                              <IconButton
                                size="small"
                                onClick={() => restartService(health.service)}
                              >
                                <RestartIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </Box>
                      <Typography variant="body2" gutterBottom>
                        Tempo de Resposta: {health.responseTime}ms
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        Uptime: {health.uptime}%
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        Versão: {health.version}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Última Verificação: {new Date(health.lastCheck).toLocaleTimeString()}
                      </Typography>
                      {health.endpoint && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.75rem' }}>
                          Endpoint: {health.endpoint}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {activeTab === 4 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Scans de Segurança
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Tipo</TableCell>
                        <TableCell>Severidade</TableCell>
                        <TableCell>Título</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Data</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {securityScans.map((scan) => (
                        <TableRow key={scan.id}>
                          <TableCell>
                            <Chip label={scan.type} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={scan.severity}
                              size="small"
                              color={
                                scan.severity === 'critical' ? 'error' :
                                scan.severity === 'high' ? 'error' :
                                scan.severity === 'medium' ? 'warning' : 'default'
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {scan.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                              {scan.description}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={scan.status}
                              size="small"
                              color={
                                scan.status === 'fixed' ? 'success' :
                                scan.status === 'open' ? 'error' : 'default'
                              }
                            />
                          </TableCell>
                          <TableCell>
                            {new Date(scan.timestamp).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 5 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Métricas de Qualidade Detalhadas
                </Typography>
                {qualityMetrics && Object.entries(qualityMetrics).map(([key, value]) => (
                  <Box key={key} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </Typography>
                      <Typography variant="body2">{value}%</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={value}
                      color={value >= 80 ? 'success' : value >= 60 ? 'warning' : 'error'}
                    />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Alertas e Recomendações
                </Typography>
                {qualityMetrics && qualityMetrics.testCoverage < 80 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Cobertura de testes abaixo de 80%. Considere adicionar mais testes.
                  </Alert>
                )}
                {qualityMetrics && qualityMetrics.performance < 85 && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Performance pode ser melhorada. Verifique Core Web Vitals.
                  </Alert>
                )}
                {securityScans.filter(s => s.status === 'open' && s.severity === 'high').length > 0 && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {securityScans.filter(s => s.status === 'open' && s.severity === 'high').length} vulnerabilidades de alta severidade encontradas!
                  </Alert>
                )}
                {healthChecks.some(h => h.status === 'degraded') && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Alguns serviços estão com performance degradada.
                  </Alert>
                )}
                <Alert severity="success">
                  Segurança e acessibilidade estão em bom estado!
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Dialog de Detalhes do Teste */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Detalhes do Teste: {selectedTest?.name}
        </DialogTitle>
        <DialogContent>
          {selectedTest && (
            <Box>
              <Typography variant="body1" gutterBottom>
                <strong>Tipo:</strong> {selectedTest.type}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Status:</strong> {selectedTest.status}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Duração:</strong> {selectedTest.duration}s
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Cobertura:</strong> {selectedTest.coverage}%
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Executado em:</strong> {new Date(selectedTest.timestamp).toLocaleString()}
              </Typography>
              {selectedTest.details && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {selectedTest.details}
                </Alert>
              )}
              {selectedTest.logs && selectedTest.logs.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Logs do Teste
                  </Typography>
                  <Paper sx={{ p: 2, backgroundColor: '#f5f5f5', maxHeight: 200, overflow: 'auto' }}>
                    {selectedTest.logs.map((log, index) => (
                      <Typography key={index} variant="body2" sx={{ fontFamily: 'monospace', mb: 0.5 }}>
                        {log}
                      </Typography>
                    ))}
                  </Paper>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Detalhes do Pipeline */}
      <Dialog open={pipelineDetailsOpen} onClose={() => setPipelineDetailsOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          Pipeline: {selectedPipeline?.branch} ({selectedPipeline?.commit})
        </DialogTitle>
        <DialogContent>
          {selectedPipeline && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body1" gutterBottom>
                    <strong>Branch:</strong> {selectedPipeline.branch}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Autor:</strong> {selectedPipeline.author}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Commit:</strong> {selectedPipeline.commit}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body1" gutterBottom>
                    <strong>Status:</strong> {selectedPipeline.status}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Estágio Atual:</strong> {selectedPipeline.stage}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Progresso:</strong> {selectedPipeline.progress}%
                  </Typography>
                </Grid>
              </Grid>
              
              <Typography variant="h6" gutterBottom>
                Estágios do Pipeline
              </Typography>
              
              {selectedPipeline.stages.map((stage, index) => (
                <Accordion key={index}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Box sx={{ mr: 2 }}>
                        {getStatusIcon(stage.status)}
                      </Box>
                      <Typography sx={{ flexGrow: 1 }}>
                        {stage.name}
                      </Typography>
                      <Chip
                        label={stage.status}
                        size="small"
                        color={getStatusColor(stage.status) as any}
                        sx={{ mr: 2 }}
                      />
                      {stage.duration && (
                        <Typography variant="body2" color="text.secondary">
                          {stage.duration}s
                        </Typography>
                      )}
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box>
                      {stage.startTime && (
                        <Typography variant="body2" gutterBottom>
                          <strong>Início:</strong> {new Date(stage.startTime).toLocaleString()}
                        </Typography>
                      )}
                      {stage.endTime && (
                        <Typography variant="body2" gutterBottom>
                          <strong>Fim:</strong> {new Date(stage.endTime).toLocaleString()}
                        </Typography>
                      )}
                      {stage.duration && (
                        <Typography variant="body2" gutterBottom>
                          <strong>Duração:</strong> {stage.duration} segundos
                        </Typography>
                      )}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedPipeline?.status === 'failed' && (
            <Button
              onClick={() => {
                if (selectedPipeline) {
                  retryPipeline(selectedPipeline.id);
                  setPipelineDetailsOpen(false);
                }
              }}
              startIcon={<RestartIcon />}
              color="primary"
            >
              Reiniciar Pipeline
            </Button>
          )}
          <Button onClick={() => setPipelineDetailsOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDashboard;