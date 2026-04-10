"""
Exam models — stored in MongoDB via mongoengine.
"""
import mongoengine as me
from datetime import datetime


class Question(me.EmbeddedDocument):
    """MCQ question embedded in an Exam document."""
    question_text = me.StringField(required=True)
    question_type = me.StringField(default='mcq', choices=['mcq', 'true_false', 'short_answer'])
    marks = me.IntField(default=1)
    order = me.IntField(default=0)
    option_a = me.StringField(default='')
    option_b = me.StringField(default='')
    option_c = me.StringField(default='')
    option_d = me.StringField(default='')
    correct_answer = me.StringField(default='A')  # A/B/C/D
    explanation = me.StringField(default='')

    def to_dict(self, hide_answer=False):
        data = {
            'question_text': self.question_text,
            'question_type': self.question_type,
            'marks': self.marks,
            'order': self.order,
            'option_a': self.option_a,
            'option_b': self.option_b,
            'option_c': self.option_c,
            'option_d': self.option_d,
        }
        if not hide_answer:
            data['correct_answer'] = self.correct_answer
            data['explanation'] = self.explanation
        return data


class Exam(me.Document):
    """Exam document stored in MongoDB."""
    
    STATUS_CHOICES = ('draft', 'scheduled', 'active', 'completed', 'cancelled')
    
    title = me.StringField(required=True, max_length=255)
    description = me.StringField(default='')
    subject = me.StringField(required=True, max_length=100)
    duration_minutes = me.IntField(default=60)
    total_marks = me.IntField(default=100)
    passing_marks = me.IntField(default=40)
    
    status = me.StringField(default='draft', choices=STATUS_CHOICES)
    scheduled_at = me.DateTimeField()
    
    # Creator (MongoDB user ID)
    created_by_id = me.StringField(required=True)
    created_by_name = me.StringField(default='')
    
    # Proctoring rules
    camera_required = me.BooleanField(default=True)
    mic_required = me.BooleanField(default=False)
    max_tab_switches = me.IntField(default=3)
    fullscreen_required = me.BooleanField(default=True)
    auto_submit_on_violation = me.BooleanField(default=False)
    risk_threshold = me.IntField(default=85)
    
    # Embedded questions
    questions = me.EmbeddedDocumentListField(Question)
    
    created_at = me.DateTimeField(default=datetime.utcnow)
    updated_at = me.DateTimeField(default=datetime.utcnow)
    
    meta = {
        'collection': 'exams',
        'ordering': ['-created_at'],
        'indexes': ['status', 'subject', 'created_by_id']
    }
    
    def __str__(self):
        return self.title
    
    @property
    def question_count(self):
        return len(self.questions)
    
    def to_dict(self, include_questions=False, hide_answers=False):
        data = {
            'id': str(self.id),
            'title': self.title,
            'description': self.description,
            'subject': self.subject,
            'duration_minutes': self.duration_minutes,
            'total_marks': self.total_marks,
            'passing_marks': self.passing_marks,
            'status': self.status,
            'scheduled_at': self.scheduled_at.isoformat() if hasattr(self.scheduled_at, 'isoformat') else self.scheduled_at,
            'created_by_id': self.created_by_id,
            'created_by_name': self.created_by_name,
            'camera_required': self.camera_required,
            'mic_required': self.mic_required,
            'max_tab_switches': self.max_tab_switches,
            'fullscreen_required': self.fullscreen_required,
            'risk_threshold': self.risk_threshold,
            'question_count': self.question_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        if include_questions:
            data['questions'] = [q.to_dict(hide_answer=hide_answers) for q in self.questions]
        return data


class Answer(me.EmbeddedDocument):
    """Candidate's answer to a question (embedded in ExamSession)."""
    question_index = me.IntField(required=True)
    selected_answer = me.StringField(default='')  # A/B/C/D
    is_flagged = me.BooleanField(default=False)
    answered_at = me.DateTimeField(default=datetime.utcnow)


class ExamSession(me.Document):
    """A candidate's attempt at an exam — stored in MongoDB."""
    
    SESSION_STATUS = ('not_started', 'verifying', 'in_progress', 'submitted', 'terminated', 'expired')
    
    exam_id = me.StringField(required=True)  # ObjectId of Exam
    exam_title = me.StringField(default='')
    
    # Candidate (MongoDB user ID)
    candidate_id = me.StringField(required=True)
    candidate_name = me.StringField(default='')
    candidate_email = me.StringField(default='')
    
    status = me.StringField(default='not_started', choices=SESSION_STATUS)
    started_at = me.DateTimeField()
    submitted_at = me.DateTimeField()
    
    # Scoring
    score = me.IntField(default=0)
    total_answered = me.IntField(default=0)
    correct_answers = me.IntField(default=0)
    
    # Risk scoring
    risk_score = me.FloatField(default=0)
    violation_count = me.IntField(default=0)
    tab_switch_count = me.IntField(default=0)
    session_violations_summary = me.DictField(default=dict)
    termination_reason = me.StringField(default='')
    device_info = me.DictField(default=dict)
    
    # Verification & Real-time Telemetry
    face_verified = me.BooleanField(default=False)
    id_verified = me.BooleanField(default=False)
    environment_scanned = me.BooleanField(default=False)
    face_snapshot = me.StringField(default='')
    id_document = me.StringField(default='')
    
    # Live HUD sync
    last_frame = me.StringField(default='')
    last_detections = me.DictField(default=dict)
    
    # Embedded answers
    answers = me.EmbeddedDocumentListField(Answer)
    
    created_at = me.DateTimeField(default=datetime.utcnow)
    
    meta = {
        'collection': 'exam_sessions',
        'ordering': ['-created_at'],
        'indexes': ['exam_id', 'candidate_id', 'status', 'risk_score']
    }
    
    def __str__(self):
        return f"{self.candidate_name} — {self.exam_title}"
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'exam_id': self.exam_id,
            'exam_title': self.exam_title,
            'candidate_id': self.candidate_id,
            'candidate_name': self.candidate_name,
            'candidate_email': self.candidate_email,
            'status': self.status,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'score': self.score,
            'total_answered': self.total_answered,
            'correct_answers': self.correct_answers,
            'risk_score': self.risk_score,
            'violation_count': self.violation_count,
            'tab_switch_count': self.tab_switch_count,
            'session_violations_summary': self.session_violations_summary,
            'termination_reason': self.termination_reason,
            'device_info': self.device_info,
            'face_verified': self.face_verified,
            'id_verified': self.id_verified,
            'environment_scanned': self.environment_scanned,
            'face_snapshot': self.face_snapshot,
            'id_document': self.id_document,
            'is_passed': self.score >= 40,  # simplified
            'answers': [
                {
                    'question_index': a.question_index,
                    'selected_answer': a.selected_answer,
                    'is_flagged': a.is_flagged,
                }
                for a in self.answers
            ],
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
