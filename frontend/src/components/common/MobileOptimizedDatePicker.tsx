import React, { useState } from 'react';
import {
  TextField,
  useTheme,
  useMediaQuery,
  alpha,
  InputAdornment,
  IconButton,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';
import {
  CalendarToday,
  Clear,
} from '@mui/icons-material';
import { TouchOptimizedButton } from './TouchOptimizedButton';
import { format, parse, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MobileOptimizedDatePickerProps {
  label?: string;
  value?: string; // Formato: YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  minDate?: string;
  maxDate?: string;
  showClearButton?: boolean;
  fullWidth?: boolean;
}

export const MobileOptimizedDatePicker: React.FC<MobileOptimizedDatePickerProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Selecione uma data',
  disabled = false,
  error = false,
  helperText,
  required = false,
  minDate,
  maxDate,
  showClearButton = true,
  fullWidth = true,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(false);
  const [tempValue, setTempValue] = useState(value || '');

  const formatDisplayValue = (dateValue: string) => {
    if (!dateValue) return '';
    
    try {
      const date = parse(dateValue, 'yyyy-MM-dd', new Date());
      if (isValid(date)) {
        return format(date, 'dd/MM/yyyy', { locale: ptBR });
      }
    } catch {
      // Fallback para formato direto
    }
    
    return dateValue;
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value;
    
    // Em mobile, abrir o picker nativo
    if (isMobile && event.target.type === 'date') {
      onChange(inputValue);
      return;
    }
    
    // Em desktop, permitir digitação manual
    setTempValue(inputValue);
    
    // Tentar converter para formato ISO
    if (inputValue.length === 10) { // dd/mm/yyyy
      try {
        const [day, month, year] = inputValue.split('/');
        if (day && month && year && year.length === 4) {
          const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          const date = new Date(isoDate);
          if (isValid(date)) {
            onChange(isoDate);
          }
        }
      } catch {
        // Ignorar erros de parsing
      }
    }
  };

  const handleClear = () => {
    onChange('');
    setTempValue('');
  };

  const handleCalendarClick = () => {
    if (isMobile) {
      // Em mobile, focar no input para abrir o picker nativo
      const input = document.querySelector('input[type="date"]') as HTMLInputElement;
      if (input) {
        input.focus();
        input.showPicker?.();
      }
    } else {
      setOpen(true);
    }
  };

  const handleDialogConfirm = () => {
    onChange(tempValue);
    setOpen(false);
  };

  const handleDialogCancel = () => {
    setTempValue(value || '');
    setOpen(false);
  };

  return (
    <Box sx={{ mb: 2 }}>
      <TextField
        label={label}
        value={isMobile ? value : formatDisplayValue(tempValue || value || '')}
        onChange={handleInputChange}
        placeholder={placeholder}
        disabled={disabled}
        error={error}
        helperText={helperText}
        required={required}
        fullWidth={fullWidth}
        type={isMobile ? 'date' : 'text'}
        inputProps={{
          min: minDate,
          max: maxDate,
          style: {
            fontSize: isMobile ? '16px' : '14px', // Evita zoom no iOS
          },
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            minHeight: isMobile ? 56 : 48, // Altura maior para touch
            borderRadius: isMobile ? 12 : 8,
            '& fieldset': {
              borderColor: error ? theme.palette.error.main : alpha(theme.palette.divider, 0.3),
            },
            '&:hover fieldset': {
              borderColor: error ? theme.palette.error.main : theme.palette.primary.main,
            },
            '&.Mui-focused fieldset': {
              borderColor: error ? theme.palette.error.main : theme.palette.primary.main,
              borderWidth: 2,
            },
          },
          '& .MuiInputLabel-root': {
            fontSize: isMobile ? '16px' : '14px',
            '&.Mui-focused': {
              color: error ? theme.palette.error.main : theme.palette.primary.main,
            },
          },
          '& .MuiInputBase-input': {
            padding: isMobile ? '16px 14px' : '12px 14px',
          },
        }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              {!isMobile && (
                <IconButton
                  onClick={handleCalendarClick}
                  edge="end"
                  sx={{ 
                    minWidth: 44, 
                    minHeight: 44,
                    color: theme.palette.text.secondary,
                  }}
                >
                  <CalendarToday />
                </IconButton>
              )}
              {showClearButton && value && (
                <IconButton
                  onClick={handleClear}
                  edge="end"
                  sx={{ 
                    minWidth: 44, 
                    minHeight: 44,
                    color: theme.palette.text.secondary,
                  }}
                >
                  <Clear />
                </IconButton>
              )}
            </InputAdornment>
          ),
        }}
      />
      
      {/* Dialog para desktop */}
      {!isMobile && (
        <Dialog
          open={open}
          onClose={handleDialogCancel}
          maxWidth="xs"
          fullWidth
          sx={{
            '& .MuiDialog-paper': {
              borderRadius: 16,
            },
          }}
        >
          <DialogTitle>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Selecionar Data
            </Typography>
          </DialogTitle>
          <DialogContent>
            <TextField
              type="date"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              fullWidth
              inputProps={{
                min: minDate,
                max: maxDate,
              }}
              sx={{
                mt: 1,
                '& .MuiOutlinedInput-root': {
                  minHeight: 48,
                },
              }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 1 }}>
            <TouchOptimizedButton
              onClick={handleDialogCancel}
              variant="text"
            >
              Cancelar
            </TouchOptimizedButton>
            <TouchOptimizedButton
              onClick={handleDialogConfirm}
              variant="contained"
              disabled={!tempValue}
            >
              Confirmar
            </TouchOptimizedButton>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default MobileOptimizedDatePicker;