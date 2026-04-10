"""
Custom JWT utilities — generates tokens for MongoDB users (no Django ORM needed).
"""
import jwt
from datetime import datetime, timedelta, timezone
from django.conf import settings


def generate_tokens(user):
    """Generate access + refresh JWT tokens for a MongoDB user."""
    now = datetime.now(timezone.utc)

    access_payload = {
        'user_id': str(user.id),
        'username': user.username,
        'role': user.role,
        'type': 'access',
        'iat': now,
        'exp': now + timedelta(hours=2),
    }

    refresh_payload = {
        'user_id': str(user.id),
        'type': 'refresh',
        'iat': now,
        'exp': now + timedelta(days=7),
    }

    access_token = jwt.encode(access_payload, settings.SECRET_KEY, algorithm='HS256')
    refresh_token = jwt.encode(refresh_payload, settings.SECRET_KEY, algorithm='HS256')

    return access_token, refresh_token


def decode_token(token):
    """Decode and validate a JWT token. Returns payload or None."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def refresh_access_token(refresh_token_str):
    """Generate new access token from a valid refresh token."""
    payload = decode_token(refresh_token_str)
    if not payload or payload.get('type') != 'refresh':
        return None

    from .models import User
    try:
        user = User.objects.get(id=payload['user_id'])
    except User.DoesNotExist:
        return None

    now = datetime.now(timezone.utc)
    access_payload = {
        'user_id': str(user.id),
        'username': user.username,
        'role': user.role,
        'type': 'access',
        'iat': now,
        'exp': now + timedelta(hours=2),
    }

    return jwt.encode(access_payload, settings.SECRET_KEY, algorithm='HS256')
