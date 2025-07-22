import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import useToast from '../hooks/useToast';
import Toast from '../components/common/Toast';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (value && !validateEmail(value)) {
      setEmailError('Por favor, insira um email válido');
    } else {
      setEmailError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validação antes de enviar
    if (!validateEmail(email)) {
      setEmailError('Por favor, insira um email válido');
      return;
    }
    
    if (password.length < 6) {
      showError('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    
    setLoading(true);

    try {
      await login(email, password);
      showSuccess('Login realizado com sucesso!');
      setTimeout(() => navigate('/'), 1000);
    } catch (err: any) {
      const errorMessage = err.message || 'Falha ao fazer login. Verifique suas credenciais.';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box display="flex" flexDirection="column" alignItems="center">
            <Typography component="h1" variant="h4" gutterBottom>
              Entrar
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Acesse sua conta para gerenciar seus projetos e tarefas
            </Typography>

            {error && (
              <Alert severity="error" sx={{ width: '100%', mb: 3 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email"
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={handleEmailChange}
                disabled={loading}
                error={!!emailError}
                helperText={emailError}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Senha"
                type="password"
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading || !email || !password || !!emailError}
              >
                {loading ? <CircularProgress size={24} /> : 'Entrar'}
              </Button>

              <Divider sx={{ my: 2 }} />

              <Grid container justifyContent="center">
                <Grid item>
                  <Typography variant="body2" align="center">
                    Não tem uma conta?{' '}
                    <Link to="/register" style={{ textDecoration: 'none' }}>
                      Registre-se
                    </Link>
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Box>
        </Paper>
      </Box>
      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={hideToast}
      />
    </Container>
  );
};

export default Login;