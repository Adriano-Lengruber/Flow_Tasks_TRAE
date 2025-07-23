import { useState, useCallback } from 'react';

interface FeedbackState {
  open: boolean;
  type: 'loading' | 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface UseFeedbackReturn {
  feedback: FeedbackState;
  showLoading: (message?: string) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
  hideFeedback: () => void;
  isLoading: boolean;
}

const useFeedback = (): UseFeedbackReturn => {
  const [feedback, setFeedback] = useState<FeedbackState>({
    open: false,
    type: 'loading',
    message: '',
  });

  const showLoading = useCallback((message = 'Carregando...') => {
    setFeedback({
      open: true,
      type: 'loading',
      message,
    });
  }, []);

  const showSuccess = useCallback((message: string) => {
    setFeedback({
      open: true,
      type: 'success',
      message,
    });
  }, []);

  const showError = useCallback((message: string) => {
    setFeedback({
      open: true,
      type: 'error',
      message,
    });
  }, []);

  const showWarning = useCallback((message: string) => {
    setFeedback({
      open: true,
      type: 'warning',
      message,
    });
  }, []);

  const showInfo = useCallback((message: string) => {
    setFeedback({
      open: true,
      type: 'info',
      message,
    });
  }, []);

  const hideFeedback = useCallback(() => {
    setFeedback(prev => ({ ...prev, open: false }));
  }, []);

  return {
    feedback,
    showLoading,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideFeedback,
    isLoading: feedback.open && feedback.type === 'loading',
  };
};

export default useFeedback;