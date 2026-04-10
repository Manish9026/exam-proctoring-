"""
User model — stored in MongoDB via mongoengine.
Replaces Django's built-in auth User model entirely.
"""
import mongoengine as me
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash


class User(me.Document):
    """Custom user stored in MongoDB."""

    ROLE_CHOICES = ('admin', 'proctor', 'candidate')

    username = me.StringField(required=True, unique=True, max_length=100)
    email = me.StringField(required=True, unique=True, max_length=200)
    password_hash = me.StringField(required=True)

    first_name = me.StringField(default='', max_length=100)
    last_name = me.StringField(default='', max_length=100)
    role = me.StringField(default='candidate', choices=ROLE_CHOICES)

    phone = me.StringField(default='')
    organization = me.StringField(default='')
    avatar_url = me.StringField(default='')

    is_verified = me.BooleanField(default=False)
    is_active = me.BooleanField(default=True)
    is_staff = me.BooleanField(default=False)

    # Proctoring stats
    avg_risk_score = me.FloatField(default=0)
    total_exams_taken = me.IntField(default=0)
    total_violations = me.IntField(default=0)

    created_at = me.DateTimeField(default=datetime.utcnow)
    updated_at = me.DateTimeField(default=datetime.utcnow)
    last_login = me.DateTimeField()

    meta = {
        'collection': 'users',
        'ordering': ['-created_at'],
        'indexes': ['username', 'email', 'role'],
    }

    def __str__(self):
        return f"{self.full_name} ({self.role})"

    # ---- Password management ----
    def set_password(self, raw_password):
        self.password_hash = generate_password_hash(raw_password)

    def check_password(self, raw_password):
        return check_password_hash(self.password_hash, raw_password)

    # ---- Properties ----
    @property
    def full_name(self):
        name = f"{self.first_name} {self.last_name}".strip()
        return name or self.username

    @property
    def is_admin(self):
        return self.role == 'admin'

    @property
    def is_candidate(self):
        return self.role == 'candidate'

    def to_dict(self):
        return {
            'id': str(self.id),
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': self.full_name,
            'role': self.role,
            'phone': self.phone,
            'organization': self.organization,
            'avatar_url': self.avatar_url,
            'is_verified': self.is_verified,
            'avg_risk_score': self.avg_risk_score,
            'total_exams_taken': self.total_exams_taken,
            'total_violations': self.total_violations,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
