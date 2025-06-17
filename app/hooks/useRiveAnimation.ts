import { useRef } from 'react';
import { RiveRef, RNRiveError } from 'rive-react-native';

interface UseRiveAnimationProps {
  onError?: (error: RNRiveError) => void;
}

export const useRiveAnimation = ({ onError }: UseRiveAnimationProps = {}) => {
  const riveRef = useRef<RiveRef>(null);

  const setRiveIdle = () => {
    if (!riveRef.current) return;
    
    try {
      riveRef.current.setInputState('State Machine 1', 'Action-Number', 0);
    } catch (_) {
      // ignore if Action-Number input not present (older artboard)
    }
  };

  const handleRiveError = (error: RNRiveError) => {
    console.error('Rive animation error:', error);
    onError?.(error);
  };

  const setRiveState = (targetStateInput: number) => {
    if (!riveRef.current) return;

    try {
      riveRef.current.setInputState('State Machine 1', 'Action-Number', targetStateInput);
    } catch (_) {
      // ignore if Action-Number input not present (older artboard)
    }
    try {
      riveRef.current.setInputState('State Machine 1', 'Action-Number', targetStateInput);
    } catch (_) {
      // ignore if legacy Action-Number input missing
    }
  };

  return {
    riveRef,
    setRiveIdle,
    handleRiveError,
    setRiveState,
  };
}; 