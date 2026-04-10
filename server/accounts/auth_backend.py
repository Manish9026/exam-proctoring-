"""
Custom JWT authentication middleware for DRF — authenticates against MongoDB users.
Replaces djangorestframework-simplejwt entirely.
"""
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from .jwt_utils import decode_token
from .models import User


class MongoJWTUser:
    """Wrapper that makes a mongoengine User look like a Django user for DRF."""

    def __init__(self, mongo_user):
        self._user = mongo_user
        self.id = str(mongo_user.id)
        self.pk = self.id
        self.username = mongo_user.username
        self.email = mongo_user.email
        self.role = mongo_user.role
        self.first_name = mongo_user.first_name
        self.last_name = mongo_user.last_name
        self.is_active = mongo_user.is_active
        self.is_staff = mongo_user.is_staff
        self.is_authenticated = True
        self.total_exams_taken = mongo_user.total_exams_taken
        self.total_violations = mongo_user.total_violations
        self.avg_risk_score = mongo_user.avg_risk_score

    def get_full_name(self):
        return self._user.full_name

    def save(self, *args, **kwargs):
        """Proxy save to the mongoengine document."""
        self._user.total_exams_taken = self.total_exams_taken
        self._user.total_violations = self.total_violations
        self._user.avg_risk_score = self.avg_risk_score
        self._user.save()

    def __str__(self):
        return self.username


class MongoJWTAuthentication(BaseAuthentication):
    """DRF authentication class that validates JWTs against MongoDB users."""

    def authenticate(self, request):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return None

        token = auth_header.split(' ')[1]
        payload = decode_token(token)

        if not payload:
            raise AuthenticationFailed('Invalid or expired token.')

        if payload.get('type') != 'access':
            raise AuthenticationFailed('Invalid token type.')

        try:
            user = User.objects.get(id=payload['user_id'])
        except User.DoesNotExist:
            raise AuthenticationFailed('User not found.')

        if not user.is_active:
            raise AuthenticationFailed('User account is disabled.')

        return (MongoJWTUser(user), token)

    def authenticate_header(self, request):
        return 'Bearer'
