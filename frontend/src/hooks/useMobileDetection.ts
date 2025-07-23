import { useState, useEffect, useCallback } from 'react';
import { useTheme, useMediaQuery } from '@mui/material';

interface MobileDetectionResult {
  // Tipos de dispositivo
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isSmallMobile: boolean;
  isLargeMobile: boolean;
  
  // Orientação
  isPortrait: boolean;
  isLandscape: boolean;
  
  // Capacidades do dispositivo
  isTouchDevice: boolean;
  hasHover: boolean;
  hasPointerFine: boolean;
  
  // Informações da tela
  screenWidth: number;
  screenHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  
  // Sistema operacional
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  
  // Recursos específicos
  supportsVibration: boolean;
  supportsServiceWorker: boolean;
  supportsWebShare: boolean;
  supportsInstallPrompt: boolean;
  
  // Funções utilitárias
  getOptimalTouchTarget: () => number;
  shouldUseMobileLayout: () => boolean;
  shouldShowMobileNavigation: () => boolean;
}

interface MobileDetectionOptions {
  // Breakpoints customizados (em px)
  mobileBreakpoint?: number;
  tabletBreakpoint?: number;
  
  // Configurações de detecção
  enableOrientationDetection?: boolean;
  enableCapabilityDetection?: boolean;
  enableOSDetection?: boolean;
  
  // Callbacks
  onDeviceChange?: (result: MobileDetectionResult) => void;
  onOrientationChange?: (isPortrait: boolean) => void;
}

export const useMobileDetection = (options: MobileDetectionOptions = {}): MobileDetectionResult => {
  const {
    mobileBreakpoint = 768,
    tabletBreakpoint = 1024,
    enableOrientationDetection = true,
    enableCapabilityDetection = true,
    enableOSDetection = true,
    onDeviceChange,
    onOrientationChange,
  } = options;

  const theme = useTheme();
  
  // Media queries usando Material-UI
  const isMobileQuery = useMediaQuery(theme.breakpoints.down('md'));
  const isTabletQuery = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  const isSmallMobileQuery = useMediaQuery(theme.breakpoints.down('sm'));
  const isLargeMobileQuery = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  
  // Estados para informações dinâmicas
  const [screenInfo, setScreenInfo] = useState({
    screenWidth: typeof window !== 'undefined' ? window.screen.width : 0,
    screenHeight: typeof window !== 'undefined' ? window.screen.height : 0,
    viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
    viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
    devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
  });
  
  const [orientation, setOrientation] = useState({
    isPortrait: typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : true,
    isLandscape: typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : false,
  });

  // Detecção de capacidades do dispositivo
  const getDeviceCapabilities = useCallback(() => {
    if (typeof window === 'undefined') {
      return {
        isTouchDevice: false,
        hasHover: true,
        hasPointerFine: true,
        supportsVibration: false,
        supportsServiceWorker: false,
        supportsWebShare: false,
        supportsInstallPrompt: false,
      };
    }

    // Detecção de touch
    const isTouchDevice = 
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-ignore
      navigator.msMaxTouchPoints > 0;

    // Detecção de hover e pointer precision
    const hasHover = window.matchMedia('(hover: hover)').matches;
    const hasPointerFine = window.matchMedia('(pointer: fine)').matches;

    // Detecção de APIs
    const supportsVibration = 'vibrate' in navigator;
    const supportsServiceWorker = 'serviceWorker' in navigator;
    const supportsWebShare = 'share' in navigator;
    
    // Detecção de install prompt (PWA)
    const supportsInstallPrompt = 'BeforeInstallPromptEvent' in window;

    return {
      isTouchDevice,
      hasHover,
      hasPointerFine,
      supportsVibration,
      supportsServiceWorker,
      supportsWebShare,
      supportsInstallPrompt,
    };
  }, []);

  // Detecção de sistema operacional e navegador
  const getOSAndBrowser = useCallback(() => {
    if (typeof window === 'undefined') {
      return {
        isIOS: false,
        isAndroid: false,
        isSafari: false,
        isChrome: false,
      };
    }

    const userAgent = navigator.userAgent;
    
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    const isChrome = /Chrome/.test(userAgent);

    return {
      isIOS,
      isAndroid,
      isSafari,
      isChrome,
    };
  }, []);

  // Atualizar informações da tela
  const updateScreenInfo = useCallback(() => {
    if (typeof window === 'undefined') return;

    setScreenInfo({
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    });
  }, []);

  // Atualizar orientação
  const updateOrientation = useCallback(() => {
    if (typeof window === 'undefined') return;

    const isPortrait = window.innerHeight > window.innerWidth;
    const isLandscape = window.innerWidth > window.innerHeight;
    
    setOrientation({ isPortrait, isLandscape });
    
    if (enableOrientationDetection && onOrientationChange) {
      onOrientationChange(isPortrait);
    }
  }, [enableOrientationDetection, onOrientationChange]);

  // Event listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      updateScreenInfo();
      if (enableOrientationDetection) {
        updateOrientation();
      }
    };

    const handleOrientationChange = () => {
      // Delay para aguardar a mudança completa da orientação
      setTimeout(() => {
        updateScreenInfo();
        updateOrientation();
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    // Inicializar
    updateScreenInfo();
    updateOrientation();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [updateScreenInfo, updateOrientation, enableOrientationDetection]);

  // Obter capacidades e informações do OS
  const capabilities = enableCapabilityDetection ? getDeviceCapabilities() : {
    isTouchDevice: false,
    hasHover: true,
    hasPointerFine: true,
    supportsVibration: false,
    supportsServiceWorker: false,
    supportsWebShare: false,
    supportsInstallPrompt: false,
  };
  
  const osInfo = enableOSDetection ? getOSAndBrowser() : {
    isIOS: false,
    isAndroid: false,
    isSafari: false,
    isChrome: false,
  };

  // Funções utilitárias
  const getOptimalTouchTarget = useCallback((): number => {
    // Retorna o tamanho ideal para touch targets baseado no dispositivo
    if (isSmallMobileQuery) return 48; // Telas pequenas
    if (isMobileQuery) return 44; // Mobile padrão
    if (isTabletQuery) return 40; // Tablet
    return 36; // Desktop
  }, [isMobileQuery, isTabletQuery, isSmallMobileQuery]);

  const shouldUseMobileLayout = useCallback((): boolean => {
    // Determina se deve usar layout mobile baseado em múltiplos fatores
    return isMobileQuery || (capabilities.isTouchDevice && !capabilities.hasPointerFine);
  }, [isMobileQuery, capabilities.isTouchDevice, capabilities.hasPointerFine]);

  const shouldShowMobileNavigation = useCallback((): boolean => {
    // Determina se deve mostrar navegação mobile
    return shouldUseMobileLayout() || screenInfo.viewportWidth < mobileBreakpoint;
  }, [shouldUseMobileLayout, screenInfo.viewportWidth, mobileBreakpoint]);

  // Resultado final
  const result: MobileDetectionResult = {
    // Tipos de dispositivo
    isMobile: isMobileQuery,
    isTablet: isTabletQuery,
    isDesktop: !isMobileQuery && !isTabletQuery,
    isSmallMobile: isSmallMobileQuery,
    isLargeMobile: isLargeMobileQuery,
    
    // Orientação
    isPortrait: orientation.isPortrait,
    isLandscape: orientation.isLandscape,
    
    // Capacidades
    ...capabilities,
    
    // Informações da tela
    ...screenInfo,
    
    // Sistema operacional
    ...osInfo,
    
    // Funções utilitárias
    getOptimalTouchTarget,
    shouldUseMobileLayout,
    shouldShowMobileNavigation,
  };

  // Callback de mudança de dispositivo
  useEffect(() => {
    if (onDeviceChange) {
      onDeviceChange(result);
    }
  }, [isMobileQuery, isTabletQuery, orientation.isPortrait, screenInfo.viewportWidth]);

  return result;
};

export default useMobileDetection;