import { useCallback, useRef } from 'react';
import { useMobileDetection } from './useMobileDetection';

type HapticPattern = number | number[];

interface HapticFeedbackOptions {
  // Configurações globais
  enabled?: boolean;
  fallbackToAudio?: boolean;
  respectUserPreferences?: boolean;
  
  // Padrões de vibração personalizados
  patterns?: {
    light?: HapticPattern;
    medium?: HapticPattern;
    heavy?: HapticPattern;
    success?: HapticPattern;
    warning?: HapticPattern;
    error?: HapticPattern;
    notification?: HapticPattern;
    selection?: HapticPattern;
    impact?: HapticPattern;
  };
  
  // Configurações de áudio fallback
  audioContext?: AudioContext;
  audioVolume?: number;
}

type HapticType = 
  | 'light' 
  | 'medium' 
  | 'heavy' 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'notification' 
  | 'selection' 
  | 'impact';

interface HapticFeedbackResult {
  // Funções principais
  vibrate: (pattern?: HapticPattern) => Promise<boolean>;
  vibrateType: (type: HapticType) => Promise<boolean>;
  
  // Funções de conveniência
  light: () => Promise<boolean>;
  medium: () => Promise<boolean>;
  heavy: () => Promise<boolean>;
  success: () => Promise<boolean>;
  warning: () => Promise<boolean>;
  error: () => Promise<boolean>;
  notification: () => Promise<boolean>;
  selection: () => Promise<boolean>;
  impact: () => Promise<boolean>;
  
  // Controle
  stop: () => void;
  isSupported: boolean;
  isEnabled: boolean;
  
  // Configuração
  setEnabled: (enabled: boolean) => void;
  testPattern: (pattern: HapticPattern) => Promise<boolean>;
}

const DEFAULT_PATTERNS: Required<NonNullable<HapticFeedbackOptions['patterns']>> = {
  light: 50,
  medium: 100,
  heavy: 200,
  success: [50, 50, 100],
  warning: [100, 50, 100],
  error: [200, 100, 200],
  notification: [50, 50, 50],
  selection: 25,
  impact: 150,
};

export const useHapticFeedback = (options: HapticFeedbackOptions = {}): HapticFeedbackResult => {
  const {
    enabled = true,
    fallbackToAudio = false,
    respectUserPreferences = true,
    patterns = {},
    audioContext,
    audioVolume = 0.1,
  } = options;

  const { supportsVibration, isMobile } = useMobileDetection();
  const enabledRef = useRef(enabled);
  const audioContextRef = useRef<AudioContext | null>(audioContext || null);

  // Combinar padrões padrão com personalizados
  const mergedPatterns = { ...DEFAULT_PATTERNS, ...patterns };

  // Verificar se haptic feedback está disponível
  const isSupported = supportsVibration && isMobile;

  // Verificar preferências do usuário
  const checkUserPreferences = useCallback((): boolean => {
    if (!respectUserPreferences) return true;
    
    // Verificar se o usuário desabilitou vibrações no sistema
    // Nota: Não há uma API padrão para isso, então assumimos que está habilitado
    // Em uma implementação real, você poderia armazenar essa preferência no localStorage
    const userPreference = localStorage.getItem('haptic-feedback-enabled');
    return userPreference !== 'false';
  }, [respectUserPreferences]);

  // Criar áudio de fallback
  const createAudioFeedback = useCallback(async (frequency: number = 800, duration: number = 100): Promise<void> => {
    if (!fallbackToAudio) return;
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(audioVolume, ctx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration / 1000);
    } catch (error) {
      console.warn('Failed to create audio feedback:', error);
    }
  }, [fallbackToAudio, audioVolume]);

  // Função principal de vibração
  const vibrate = useCallback(async (pattern: HapticPattern = 100): Promise<boolean> => {
    // Verificar se está habilitado
    if (!enabledRef.current) return false;
    
    // Verificar suporte
    if (!isSupported) {
      if (fallbackToAudio) {
        const duration = Array.isArray(pattern) ? pattern[0] || 100 : pattern;
        await createAudioFeedback(800, duration);
        return true;
      }
      return false;
    }
    
    // Verificar preferências do usuário
    if (!checkUserPreferences()) return false;
    
    try {
      // Executar vibração
      const success = navigator.vibrate(pattern);
      
      // Fallback para áudio se a vibração falhar
      if (!success && fallbackToAudio) {
        const duration = Array.isArray(pattern) ? pattern[0] || 100 : pattern;
        await createAudioFeedback(800, duration);
      }
      
      return success;
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
      
      // Fallback para áudio em caso de erro
      if (fallbackToAudio) {
        const duration = Array.isArray(pattern) ? pattern[0] || 100 : pattern;
        await createAudioFeedback(800, duration);
        return true;
      }
      
      return false;
    }
  }, [isSupported, fallbackToAudio, createAudioFeedback, checkUserPreferences]);

  // Vibrar por tipo
  const vibrateType = useCallback(async (type: HapticType): Promise<boolean> => {
    const pattern = mergedPatterns[type];
    return vibrate(pattern);
  }, [vibrate, mergedPatterns]);

  // Parar vibração
  const stop = useCallback(() => {
    if (isSupported) {
      navigator.vibrate(0);
    }
  }, [isSupported]);

  // Definir estado habilitado
  const setEnabled = useCallback((newEnabled: boolean) => {
    enabledRef.current = newEnabled;
    
    // Salvar preferência do usuário
    if (respectUserPreferences) {
      localStorage.setItem('haptic-feedback-enabled', newEnabled.toString());
    }
  }, [respectUserPreferences]);

  // Testar padrão
  const testPattern = useCallback(async (pattern: HapticPattern): Promise<boolean> => {
    return vibrate(pattern);
  }, [vibrate]);

  // Funções de conveniência
  const light = useCallback(() => vibrateType('light'), [vibrateType]);
  const medium = useCallback(() => vibrateType('medium'), [vibrateType]);
  const heavy = useCallback(() => vibrateType('heavy'), [vibrateType]);
  const success = useCallback(() => vibrateType('success'), [vibrateType]);
  const warning = useCallback(() => vibrateType('warning'), [vibrateType]);
  const error = useCallback(() => vibrateType('error'), [vibrateType]);
  const notification = useCallback(() => vibrateType('notification'), [vibrateType]);
  const selection = useCallback(() => vibrateType('selection'), [vibrateType]);
  const impact = useCallback(() => vibrateType('impact'), [vibrateType]);

  return {
    // Funções principais
    vibrate,
    vibrateType,
    
    // Funções de conveniência
    light,
    medium,
    heavy,
    success,
    warning,
    error,
    notification,
    selection,
    impact,
    
    // Controle
    stop,
    isSupported,
    isEnabled: enabledRef.current,
    
    // Configuração
    setEnabled,
    testPattern,
  };
};

export default useHapticFeedback;