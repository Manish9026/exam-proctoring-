// import { useState, useCallback, useRef } from 'react';
// import api from '../services/api'; // Or your built-in axios instance

// export default function useNetworkQueue() {
//   const [isConnected, setIsConnected] = useState(true);
//   const tickRef = useRef(0);

//   const sendFrame = useCallback(async (base64Image, sessionId, audioLevel = 0, audioEvidence = null) => {
//     console.log(`[NetworkQueue] sendFrame called with sessionId:`, sessionId);
//     if (!sessionId) {
//       console.warn(`[NetworkQueue] Early exit, no sessionId.`);
//       return { risk_score: 0, violations: [] };
//     }

//     try {
//       // Optimistic reconnect: always try to send even if last one failed
//       const response = await api.post('/proctoring/frame/', {
//         session_id: sessionId,
//         frame: base64Image,
//         tick: tickRef.current,
//         audio_level: audioLevel,
//         audio_evidence: audioEvidence
//       });
      
//       tickRef.current += 1;
//       setIsConnected(true);
//       return response;
      
//     } catch (error) {
//       console.warn("AI Telemetry transmission error", error);
//       setIsConnected(false);
//       // We don't throw here to avoid crashing the caller's async loop
//       return { error: true, risk_score: 0 }; 
//     }
//   }, []); // Stable reference!

//   return { sendFrame, isConnected };
// }


import { useState, useCallback, useRef } from 'react';
import api from '../services/api'; // Or your built-in axios instance

export default function useNetworkQueue() {
  const [isConnected, setIsConnected] = useState(true);
  const tickRef = useRef(0);

  const sendFrame = useCallback(async (base64Image, sessionId, audioLevel = 0, audioEvidence = null, isSpeechDetected = false) => {
    if (!sessionId) {
      console.warn("[NetworkQueue] Missing sessionId! Skipping frame dispatch.");
      return { risk_score: 0, violations: [] };
    }

    try {
      console.log(`[NetworkQueue] Dispatching POST /proctoring/frame (tick: ${tickRef.current}) (voice: ${isSpeechDetected})`);
      const response = await api.post('/proctoring/frame/', {
        session_id: sessionId,
        frame: base64Image,
        tick: tickRef.current,
        audio_level: audioLevel,
        audio_evidence: audioEvidence,
        is_speech: isSpeechDetected
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
