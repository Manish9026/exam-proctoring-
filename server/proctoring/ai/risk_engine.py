from django.conf import settings

class RiskManager:
    def __init__(self):
        self.session_states = {} 
        self.load_config()

    def load_config(self):
        """Hot-reloads config from disk with Django settings fallback."""
        import json
        import os
        from django.conf import settings
        
        path = getattr(settings, 'CONFIG_PATH', None)
        if not path:
            path = os.path.join(settings.BASE_DIR, 'server', 'proctor_config.json')

        try:
            with open(path, 'r') as f:
                config = json.load(f)
        except Exception:
            config = getattr(settings, 'PROCTORING', {})

        self.WEIGHTS = config.get('RISK_WEIGHTS', {})
        self.DECAY_RATE = config.get('DECAY_RATE', 2)
        self.AUDIO_THRESHOLD = config.get('AUDIO_THRESHOLD', 45)
        self.TOLERANCES = {
            'face_missing': config.get('FACE_MISS_TOLERANCE', 2),
            'multiple_faces': config.get('MULTI_FACE_TOLERANCE', 2),
            'identity_fail': config.get('IDENTITY_FAIL_TOLERANCE', 2),
        }

    def evaluate(self, session_id: str, signals: dict, current_score: float = 0):
        # Hot-reload config for immediate effect
        self.load_config()
        
        # Initialize state if new session
        if session_id not in self.session_states:
            self.session_states[session_id] = {
                'face_miss_streak': 0,
                'multi_face_streak': 0,
                'identity_fail_streak': 0
            }
        
        state = self.session_states[session_id]
        
        # Use database score as baseline
        score = current_score
        new_violations = []
        reasons = []
        
        # -- Core Evaluation Logic --
        if signals.get('face_count', 1) == 0:
            state['face_miss_streak'] += 1
            if state['face_miss_streak'] >= self.TOLERANCES['face_missing']:
                score += self.WEIGHTS.get('face_missing', 15)
                reasons.append("Face missing")
                new_violations.append({'type': 'face_missing', 'severity': 'high', 'detail': 'Face completely missing from feed.'})
        else:
            state['face_miss_streak'] = 0
            
        if signals.get('face_count', 1) > 1:
            state['multi_face_streak'] += 1
            if state['multi_face_streak'] >= self.TOLERANCES['multiple_faces']:
                score += self.WEIGHTS['multiple_faces']
                reasons.append("Multi-face")
                new_violations.append({'type': 'multiple_faces', 'severity': 'critical', 'detail': 'Second person detected.'})
        else:
            state['multi_face_streak'] = 0
            
        if "cell phone" in signals.get('objects', []):
            score += self.WEIGHTS['phone_detected']
            reasons.append("Phone detected")
            new_violations.append({'type': 'phone_detected', 'severity': 'critical', 'detail': 'Mobile device in frame.'})

        # Book / Multi-Object Detection
        other_objects = [o for o in signals.get('objects', []) if o in ['book', 'tablet', 'laptop']]
        if other_objects:
            score += self.WEIGHTS.get('object_detected', 20)
            reasons.append(f"Unauthorized object: {other_objects[0]}")
            new_violations.append({
                'type': 'object_detected', 
                'severity': 'high', 
                'detail': f'Unauthorized item detected: {", ".join(other_objects)}'
            })
            
        if signals.get('gaze') in ['left', 'right']:
            score += self.WEIGHTS['looking_away']
            reasons.append("Looking away")
            new_violations.append({'type': 'eye_movement', 'severity': 'medium', 'detail': f'Suspicious gaze detected ({signals["gaze"]}).'})
            
        identity = signals.get('identity', {})
        if not identity.get('match', True):
            state['identity_fail_streak'] += 1
            if state['identity_fail_streak'] >= self.TOLERANCES['identity_fail']:
                score += self.WEIGHTS.get('face_mismatch', 40)
                reasons.append("Face mismatch")
                new_violations.append({
                    'type': 'face_mismatch', 
                    'severity': 'critical', 
                    'detail': f"Biometric verification failed (Confidence: {identity.get('confidence', 0):.2f})."
                })
        else:
            state['identity_fail_streak'] = 0
            
        if signals.get('audio_level', 0) > self.AUDIO_THRESHOLD:
            score += self.WEIGHTS.get('audio_detected', 5) 
            reasons.append("High audio")
            new_violations.append({
                'type': 'audio_detected', 
                'severity': 'medium', 
                'detail': 'High decibel noise detected.'
            })

        # --- Global Evidence Attachment ---
        # Attach the 15s audio snapshot to EVERY violation found in this frame
        if signals.get('audio_evidence'):
            for v in new_violations:
                if 'metadata' not in v: v['metadata'] = {}
                v['metadata']['audio_blob'] = signals.get('audio_evidence')
                v['detail'] += ' (Audio evidence captured)'

        # Dynamic Decay from settings
        if not new_violations:
            score = max(0, score - self.DECAY_RATE) 

        # Hard Ceiling
        score = min(score, 100)
        
        return {
            "score": score,
            "new_violations": new_violations,
            "reasons": reasons
        }

    def cleanup_session(self, session_id: str):
        if session_id in self.active_sessions:
            del self.active_sessions[session_id]
