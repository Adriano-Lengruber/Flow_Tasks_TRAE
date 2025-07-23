import React, { useState } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectProps,
  useTheme,
  useMediaQuery,
  alpha,
  Box,
  Chip,
  OutlinedInput,
  ListItemText,
  Checkbox,
} from '@mui/material';
import { TouchOptimizedButton } from './TouchOptimizedButton';

interface MobileOptimizedSelectProps extends Omit<SelectProps, 'variant'> {
  mobileVariant?: 'standard' | 'outlined' | 'filled';
  options: Array<{
    value: string | number;
    label: string;
    disabled?: boolean;
  }>;
  showClearButton?: boolean;
  onClear?: () => void;
}

export const MobileOptimizedSelect: React.FC<MobileOptimizedSelectProps> = ({
  mobileVariant = 'outlined',
  options,
  showClearButton = false,
  onClear,
  multiple,
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(false);

  const handleClear = () => {
    if (onClear) {
      onClear();
    }
  };

  const renderValue = (selected: any) => {
    if (multiple && Array.isArray(selected)) {
      if (selected.length === 0) {
        return <em>Selecione...</em>;
      }
      
      // Em mobile, mostrar apenas a quantidade selecionada se for mais de 2
      if (isMobile && selected.length > 2) {
        return `${selected.length} selecionados`;
      }
      
      return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {selected.map((value: any) => {
            const option = options.find(opt => opt.value === value);
            return (
              <Chip
                key={value}
                label={option?.label || value}
                size="small"
                sx={{
                  height: isMobile ? 28 : 24,
                  fontSize: isMobile ? '0.875rem' : '0.75rem',
                }}
              />
            );
          })}
        </Box>
      );
    }
    
    const option = options.find(opt => opt.value === selected);
    return option?.label || selected || <em>Selecione...</em>;
  };

  return (
    <FormControl fullWidth sx={{ mb: 2 }}>
      <>
        {props.label && (
          <InputLabel
            sx={{
              fontSize: isMobile ? '16px' : '14px',
              '&.Mui-focused': {
                color: theme.palette.primary.main,
              },
            }}
          >
            {props.label}
          </InputLabel>
        )}
        <Select
        {...props}
        variant={isMobile ? 'outlined' : mobileVariant}
        multiple={multiple}
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        renderValue={multiple ? renderValue : undefined}
        input={multiple ? <OutlinedInput label={props.label} /> : undefined}
        sx={{
          minHeight: isMobile ? 56 : 48, // Altura maior para touch
          borderRadius: isMobile ? 12 : 8,
          fontSize: isMobile ? '16px' : '14px', // Evita zoom no iOS
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(theme.palette.divider, 0.3),
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.main,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.main,
            borderWidth: 2,
          },
          '& .MuiSelect-select': {
            padding: isMobile ? '16px 14px' : '12px 14px',
            minHeight: 'unset !important',
          },
          ...props.sx,
        }}
        MenuProps={{
          PaperProps: {
            sx: {
              maxHeight: isMobile ? '60vh' : 300,
              borderRadius: isMobile ? 16 : 8,
              mt: 1,
              '& .MuiMenuItem-root': {
                minHeight: isMobile ? 48 : 36, // Touch targets maiores
                padding: isMobile ? '12px 16px' : '8px 16px',
                fontSize: isMobile ? '16px' : '14px',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                },
                '&.Mui-selected': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.12),
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.16),
                  },
                },
              },
            },
          },
          ...props.MenuProps,
        }}
      >
        {options.map((option) => (
          <MenuItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            sx={{
              justifyContent: multiple ? 'flex-start' : 'center',
            }}
          >
            {multiple && (
              <Checkbox
                checked={Array.isArray(props.value) && props.value.includes(option.value)}
                sx={{
                  minWidth: isMobile ? 44 : 36,
                  minHeight: isMobile ? 44 : 36,
                }}
              />
            )}
            <ListItemText
              primary={option.label}
              sx={{
                '& .MuiListItemText-primary': {
                  fontSize: isMobile ? '16px' : '14px',
                },
              }}
            />
          </MenuItem>
        ))}
      </Select>
      
        {/* Botão de limpar (opcional) */}
        {showClearButton && props.value && (
          <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <TouchOptimizedButton
              variant="text"
              size="small"
              onClick={handleClear}
              sx={{
                minHeight: isMobile ? 44 : 36,
                fontSize: isMobile ? '14px' : '12px',
              }}
            >
              Limpar Seleção
            </TouchOptimizedButton>
          </Box>
        )}
      </>
    </FormControl>
  );
};

export default MobileOptimizedSelect;