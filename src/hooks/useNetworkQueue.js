import { useState, useCallback, useRef } from 'react';
import api from '../services/api'; // Or your built-in axios instance

export default function useNetworkQueue() {
  const [isConnected, setIsConnected] = useState(true);
  const tickRef = useRef(0);

  const sendFrame = useCallback(async (base64Image, sessionId, audioLevel = 0, audioEvidence = null) => {
    if (!sessionId) return { risk_score: 0, violations: [] };

    try {
      const response = await api.post('/proctoring/frame/', {
        session_id: sessionId,
        frame: base64Image,
        tick: tickRef.current,
        audio_level: audioLevel,
        audio_evidence: audioEvidence
      });
      
      tickRef.current += 1;
      setIsConnected(true);
      return response;
      
    } catch (error) {
      console.warn("AI Telemetry transmission error", error);
      setIsConnected(false);
      throw error; // Propagate for security handling
    }
  }, []); // Stable reference!

  return { sendFrame, isConnected };
}
