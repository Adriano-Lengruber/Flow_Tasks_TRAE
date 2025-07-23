import React from 'react';
import {
  Box,
  useTheme,
  useMediaQuery,
  Breakpoint,
} from '@mui/material';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  variant?: 'kanban' | 'dashboard' | 'form' | 'list';
  maxWidth?: Breakpoint | false;
  disableGutters?: boolean;
  mobileDirection?: 'column' | 'row';
}

const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  variant = 'dashboard',
  maxWidth = 'xl',
  disableGutters = false,
  mobileDirection = 'column',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));

  const getContainerStyles = () => {
    const baseStyles: any = {
      width: '100%',
      mx: 'auto',
      px: disableGutters ? 0 : { xs: 1, sm: 2, md: 3 },
      py: { xs: 1, sm: 2 },
    };

    if (maxWidth) {
      baseStyles.maxWidth = maxWidth;
    }

    switch (variant) {
      case 'kanban':
        return {
          ...baseStyles,
          height: '100%',
          display: 'flex',
          flexDirection: isMobile ? mobileDirection : 'row',
          gap: { xs: 1, sm: 2 },
          overflowX: isMobile ? 'hidden' : 'auto',
          overflowY: isMobile ? 'auto' : 'hidden',
          px: disableGutters ? 0 : { xs: 0.5, sm: 1, md: 2 },
        };
      
      case 'dashboard':
        return {
          ...baseStyles,
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: 2, sm: 3 },
        };
      
      case 'form':
        return {
          ...baseStyles,
          maxWidth: { xs: '100%', sm: 600, md: 800 },
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: 2, sm: 3 },
        };
      
      case 'list':
        return {
          ...baseStyles,
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: 1, sm: 2 },
        };
      
      default:
        return baseStyles;
    }
  };

  const getChildrenWrapper = () => {
    if (variant === 'kanban' && isMobile) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: 1.5, sm: 2 },
            width: '100%',
            overflowX: 'hidden',
            '& > *': {
              minWidth: 'unset',
              width: '100%',
              minHeight: { xs: '300px', sm: '400px' },
            },
            // Melhor scroll em mobile
            '&::-webkit-scrollbar': {
              display: 'none',
            },
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {children}
        </Box>
      );
    }

    if (variant === 'kanban' && isTablet) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            gap: 2,
            width: '100%',
            overflowX: 'auto',
            pb: 2,
            '& > *': {
              minWidth: '280px',
              flex: '0 0 auto',
            },
            // Scroll horizontal suave em tablet
            '&::-webkit-scrollbar': {
              height: 8,
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'rgba(0,0,0,0.1)',
              borderRadius: 4,
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0,0,0,0.3)',
              borderRadius: 4,
              '&:hover': {
                backgroundColor: 'rgba(0,0,0,0.5)',
              },
            },
          }}
        >
          {children}
        </Box>
      );
    }

    return children;
  };

  return (
    <Box sx={getContainerStyles()}>
      {getChildrenWrapper()}
    </Box>
  );
};

// Hook para detectar o tipo de dispositivo
export const useDeviceType = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return {
    isMobile,
    isTablet,
    isDesktop,
    isSmallMobile,
    deviceType: isSmallMobile ? 'small-mobile' : isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
  };
};

// Hook para estilos responsivos
export const useResponsiveStyles = () => {
  const { isMobile, isTablet, isDesktop, isSmallMobile } = useDeviceType();

  const getResponsiveValue = <T,>(values: {
    mobile?: T;
    tablet?: T;
    desktop?: T;
    smallMobile?: T;
  }) => {
    if (isSmallMobile && values.smallMobile !== undefined) return values.smallMobile;
    if (isMobile && values.mobile !== undefined) return values.mobile;
    if (isTablet && values.tablet !== undefined) return values.tablet;
    if (isDesktop && values.desktop !== undefined) return values.desktop;
    
    // Fallback para o primeiro valor disponível
    return values.desktop || values.tablet || values.mobile || values.smallMobile;
  };

  const getKanbanStyles = () => ({
    columnWidth: getResponsiveValue({
      smallMobile: '100%',
      mobile: '100%',
      tablet: '280px',
      desktop: '320px',
    }),
    columnMinWidth: getResponsiveValue({
      smallMobile: 'unset',
      mobile: 'unset',
      tablet: '250px',
      desktop: '280px',
    }),
    gap: getResponsiveValue({
      smallMobile: 1,
      mobile: 1,
      tablet: 2,
      desktop: 3,
    }),
    padding: getResponsiveValue({
      smallMobile: 0.5,
      mobile: 1,
      tablet: 2,
      desktop: 3,
    }),
  });

  const getCardStyles = () => ({
    padding: getResponsiveValue({
      smallMobile: 1,
      mobile: 1.5,
      tablet: 2,
      desktop: 2,
    }),
    margin: getResponsiveValue({
      smallMobile: 0.5,
      mobile: 1,
      tablet: 1,
      desktop: 1,
    }),
  });

  return {
    getResponsiveValue,
    getKanbanStyles,
    getCardStyles,
    isMobile,
    isTablet,
    isDesktop,
    isSmallMobile,
  };
};

export default ResponsiveContainer;