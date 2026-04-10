"""
Proctoring models — stored in MongoDB via mongoengine.
"""
import mongoengine as me
from datetime import datetime


class Violation(me.Document):
    """AI-detected violation during an exam session."""
    
    VIOLATION_TYPES = (
        'face_missing', 'face_mismatch', 'multiple_faces', 'eye_movement',
        'tab_switch', 'phone_detected', 'object_detected', 'audio_detected',
        'copy_paste', 'devtools', 'fullscreen_exit',
    )
    SEVERITY_CHOICES = ('low', 'medium', 'high', 'critical')
    
    VIOLATION_LABELS = {
        'face_missing': 'Face Not Detected',
        'face_mismatch': 'Face Mismatch',
        'multiple_faces': 'Multiple Faces',
        'eye_movement': 'Suspicious Eye Movement',
        'tab_switch': 'Tab Switch',
        'phone_detected': 'Phone Detected',
        'object_detected': 'Object Detected',
        'audio_detected': 'Audio/Voice Detected',
        'copy_paste': 'Copy/Paste Attempt',
        'devtools': 'DevTools Opened',
        'fullscreen_exit': 'Fullscreen Exit',
    }
    
    session_id = me.StringField(required=True)
    candidate_id = me.StringField(required=True)
    candidate_name = me.StringField(default='')
    exam_title = me.StringField(default='')
    
    violation_type = me.StringField(required=True, choices=VIOLATION_TYPES)
    severity = me.StringField(default='medium', choices=SEVERITY_CHOICES)
    description = me.StringField(default='')
    
    risk_delta = me.FloatField(default=0)
    
    # Evidence
    snapshot_path = me.StringField(default='')
    metadata = me.DictField(default=dict)
    
    timestamp = me.DateTimeField(default=datetime.utcnow)
    
    meta = {
        'collection': 'violations',
        'ordering': ['-timestamp'],
        'indexes': ['session_id', 'candidate_id', 'violation_type', 'severity']
    }
    
    def __str__(self):
        return f"{self.violation_type} — {self.candidate_name}"
    
    @property
    def violation_label(self):
        return self.VIOLATION_LABELS.get(self.violation_type, self.violation_type)
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'session_id': self.session_id,
            'candidate_id': self.candidate_id,
            'candidate_name': self.candidate_name,
            'exam_title': self.exam_title,
            'violation_type': self.violation_type,
            'violation_label': self.violation_label,
            'severity': self.severity,
            'description': self.description,
            'risk_delta': self.risk_delta,
            'snapshot_path': self.snapshot_path,
            'metadata': self.metadata,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
        }


class ProctoringEvent(me.Document):
    """Generic proctoring event log for timeline/audit."""
    
    EVENT_TYPES = (
        'exam_started', 'exam_submitted', 'exam_terminated',
        'warning_sent', 'face_verified', 'risk_threshold', 'snapshot_taken',
    )
    
    session_id = me.StringField(required=True)
    event_type = me.StringField(required=True, choices=EVENT_TYPES)
    description = me.StringField(default='')
    metadata = me.DictField(default=dict)
    timestamp = me.DateTimeField(default=datetime.utcnow)
    
    meta = {
        'collection': 'proctoring_events',
        'ordering': ['-timestamp'],
        'indexes': ['session_id', 'event_type']
    }
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'session_id': self.session_id,
            'event_type': self.event_type,
            'description': self.description,
            'metadata': self.metadata,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
        }
