import React from 'react';
import { Box, Typography, Button, Container, Paper, Card, CardContent, useTheme, styled, alpha } from '@mui/material';
import { Link } from 'react-router-dom';
import { ErrorOutline, Home } from '@mui/icons-material';
import ThemeToggle from '../components/common/ThemeToggle';

const StyledContainer = styled(Container)(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: theme.palette.mode === 'dark'
    ? `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.1)}, ${alpha(theme.palette.secondary.dark, 0.1)})`
    : `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.1)}, ${alpha(theme.palette.secondary.light, 0.1)})`,
  position: 'relative',
}));

const StyledCard = styled(Card)(({ theme }) => ({
  maxWidth: 500,
  width: '100%',
  borderRadius: 16,
  boxShadow: theme.palette.mode === 'dark'
    ? '0 8px 32px rgba(0, 0, 0, 0.3)'
    : '0 8px 32px rgba(0, 0, 0, 0.1)',
  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
  backdropFilter: 'blur(10px)',
  background: theme.palette.mode === 'dark'
    ? alpha(theme.palette.background.paper, 0.9)
    : alpha(theme.palette.background.paper, 0.95),
}));

const NotFound: React.FC = () => {
  const theme = useTheme();

  return (
    <StyledContainer maxWidth={false}>
      <Box sx={{ position: 'absolute', top: 20, right: 20 }}>
        <ThemeToggle />
      </Box>
      
      <StyledCard>
        <CardContent sx={{ p: 6, textAlign: 'center' }}>
          {/* Error Icon */}
          <Box
            sx={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)}, ${alpha(theme.palette.warning.main, 0.1)})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 4,
            }}
          >
            <ErrorOutline sx={{ fontSize: 60, color: theme.palette.error.main }} />
          </Box>

          <Typography 
            variant="h3" 
            component="h1" 
            gutterBottom 
            fontWeight={700}
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2,
            }}
          >
            404
          </Typography>
          
          <Typography variant="h5" component="h2" gutterBottom fontWeight={600}>
            Página não encontrada
          </Typography>
          
          <Typography 
            variant="body1" 
            color="text.secondary" 
            paragraph
            sx={{ mb: 4, fontSize: '1.1rem', lineHeight: 1.6 }}
          >
            Ops! A página que você está procurando não existe ou foi movida para outro local.
          </Typography>
          
          <Button
            variant="contained"
            component={Link}
            to="/"
            size="large"
            startIcon={<Home />}
            sx={{
              py: 1.5,
              px: 4,
              borderRadius: 2,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                transform: 'translateY(-2px)',
              },
              fontWeight: 600,
              fontSize: '1.1rem',
              transition: 'all 0.3s ease',
            }}
          >
            Voltar para o Dashboard
          </Button>
        </CardContent>
      </StyledCard>
    </StyledContainer>
  );
};

export default NotFound;