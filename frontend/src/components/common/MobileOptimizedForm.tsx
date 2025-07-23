import React, { useState } from 'react';
import {
  Box,
  TextField,
  TextFieldProps,
  Button,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  useTheme,
  useMediaQuery,
  alpha,
  InputAdornment,
  IconButton,
  Collapse,
  Alert,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { TouchOptimizedButton } from './TouchOptimizedButton';

// Props para campos otimizados
interface MobileOptimizedTextFieldProps extends Omit<TextFieldProps, 'variant'> {
  mobileVariant?: 'standard' | 'outlined' | 'filled';
  showValidation?: boolean;
  validationState?: 'success' | 'error' | 'none';
  validationMessage?: string;
}

// Campo de texto otimizado para mobile
export const MobileOptimizedTextField: React.FC<MobileOptimizedTextFieldProps> = ({
  mobileVariant = 'outlined',
  showValidation = false,
  validationState = 'none',
  validationMessage,
  type,
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [showPassword, setShowPassword] = useState(false);

  const isPasswordField = type === 'password';
  const actualType = isPasswordField && showPassword ? 'text' : type;

  const getValidationColor = () => {
    switch (validationState) {
      case 'success':
        return theme.palette.success.main;
      case 'error':
        return theme.palette.error.main;
      default:
        return undefined;
    }
  };

  const getValidationIcon = () => {
    switch (validationState) {
      case 'success':
        return <CheckCircle sx={{ color: theme.palette.success.main, fontSize: '1.2rem' }} />;
      case 'error':
        return <ErrorIcon sx={{ color: theme.palette.error.main, fontSize: '1.2rem' }} />;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      <TextField
        {...props}
        type={actualType}
        variant={isMobile ? 'outlined' : mobileVariant}
        fullWidth
        sx={{
          '& .MuiOutlinedInput-root': {
            minHeight: isMobile ? 56 : 48, // Altura maior para touch
            borderRadius: isMobile ? 12 : 8,
            fontSize: isMobile ? '16px' : '14px', // Evita zoom no iOS
            '& fieldset': {
              borderColor: getValidationColor() || alpha(theme.palette.divider, 0.3),
              borderWidth: validationState !== 'none' ? 2 : 1,
            },
            '&:hover fieldset': {
              borderColor: getValidationColor() || theme.palette.primary.main,
            },
            '&.Mui-focused fieldset': {
              borderColor: getValidationColor() || theme.palette.primary.main,
              borderWidth: 2,
            },
          },
          '& .MuiInputLabel-root': {
            fontSize: isMobile ? '16px' : '14px',
            '&.Mui-focused': {
              color: getValidationColor() || theme.palette.primary.main,
            },
          },
          '& .MuiInputBase-input': {
            padding: isMobile ? '16px 14px' : '12px 14px',
          },
          ...props.sx,
        }}
        InputProps={{
          ...props.InputProps,
          endAdornment: (
            <InputAdornment position="end">
              {isPasswordField && (
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                  sx={{ minWidth: 44, minHeight: 44 }} // Touch target
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              )}
              {showValidation && getValidationIcon()}
              {props.InputProps?.endAdornment}
            </InputAdornment>
          ),
        }}
      />
      
      {/* Mensagem de validação */}
      <Collapse in={showValidation && !!validationMessage}>
        <Alert
          severity={validationState === 'success' ? 'success' : 'error'}
          sx={{
            mt: 1,
            fontSize: '0.875rem',
            '& .MuiAlert-icon': {
              fontSize: '1rem',
            },
          }}
        >
          {validationMessage}
        </Alert>
      </Collapse>
    </Box>
  );
};

// Props para formulário em steps
interface FormStep {
  label: string;
  content: React.ReactNode;
  optional?: boolean;
  validation?: () => boolean;
}

interface MobileStepperFormProps {
  steps: FormStep[];
  onSubmit: () => void;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
}

// Formulário com stepper para mobile
export const MobileStepperForm: React.FC<MobileStepperFormProps> = ({
  steps,
  onSubmit,
  onCancel,
  submitLabel = 'Concluir',
  cancelLabel = 'Cancelar',
  loading = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [activeStep, setActiveStep] = useState(0);

  const handleNext = () => {
    const currentStep = steps[activeStep];
    if (currentStep.validation && !currentStep.validation()) {
      return; // Não avança se a validação falhar
    }
    
    if (activeStep === steps.length - 1) {
      onSubmit();
    } else {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleStepClick = (stepIndex: number) => {
    if (!isMobile) {
      setActiveStep(stepIndex);
    }
  };

  if (!isMobile) {
    // Em desktop, mostrar formulário normal sem stepper
    return (
      <Box>
        {steps.map((step, index) => (
          <Box key={index} sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {step.label}
            </Typography>
            {step.content}
          </Box>
        ))}
        
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
          {onCancel && (
            <Button onClick={onCancel} disabled={loading}>
              {cancelLabel}
            </Button>
          )}
          <Button
            variant="contained"
            onClick={onSubmit}
            disabled={loading}
          >
            {submitLabel}
          </Button>
        </Box>
      </Box>
    );
  }

  // Em mobile, usar stepper
  return (
    <Box>
      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((step, index) => (
          <Step key={step.label}>
            <StepLabel
              optional={
                step.optional ? (
                  <Typography variant="caption">Opcional</Typography>
                ) : null
              }
              onClick={() => handleStepClick(index)}
              sx={{
                cursor: isMobile ? 'default' : 'pointer',
                '& .MuiStepLabel-label': {
                  fontSize: '1rem',
                  fontWeight: activeStep === index ? 600 : 400,
                },
              }}
            >
              {step.label}
            </StepLabel>
            <StepContent>
              <Box sx={{ mb: 2 }}>
                {step.content}
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TouchOptimizedButton
                  variant="contained"
                  onClick={handleNext}
                  disabled={loading}
                  sx={{ minWidth: 100 }}
                >
                  {activeStep === steps.length - 1 ? submitLabel : 'Próximo'}
                </TouchOptimizedButton>
                
                {activeStep > 0 && (
                  <TouchOptimizedButton
                    onClick={handleBack}
                    disabled={loading}
                    sx={{ minWidth: 80 }}
                  >
                    Voltar
                  </TouchOptimizedButton>
                )}
                
                {activeStep === 0 && onCancel && (
                  <TouchOptimizedButton
                    onClick={onCancel}
                    disabled={loading}
                    sx={{ minWidth: 80 }}
                  >
                    {cancelLabel}
                  </TouchOptimizedButton>
                )}
              </Box>
            </StepContent>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
};

// Hook para validação de formulário
export const useFormValidation = (initialValues: Record<string, any>) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const setValue = (field: string, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }));
    
    // Limpar erro quando o usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const setError = (field: string, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const setFieldTouched = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const validate = (validationRules: Record<string, (value: any) => string | null>) => {
    const newErrors: Record<string, string> = {};
    
    Object.keys(validationRules).forEach(field => {
      const error = validationRules[field](values[field]);
      if (error) {
        newErrors[field] = error;
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  };

  return {
    values,
    errors,
    touched,
    setValue,
    setError,
    setTouched: setFieldTouched,
    validate,
    reset,
    isValid: Object.keys(errors).length === 0,
  };
};

export default MobileOptimizedTextField;