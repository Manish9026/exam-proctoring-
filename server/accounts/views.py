"""
Auth views — 100% MongoDB, no Django ORM.
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import permissions, status
from datetime import datetime, timezone

from .models import User
from .jwt_utils import generate_tokens, refresh_access_token


# ============================================
# LOGIN
# ============================================
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    """POST /api/auth/login/ — authenticate & return JWT + user."""
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '')

    if not username or not password:
        return Response({'error': 'Username and password required.'}, status=400)

    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({'error': 'Invalid credentials.'}, status=401)

    if not user.check_password(password):
        return Response({'error': 'Invalid credentials.'}, status=401)

    if not user.is_active:
        return Response({'error': 'Account disabled.'}, status=403)

    # Update last login
    user.last_login = datetime.now(timezone.utc)
    user.save()

    access, refresh = generate_tokens(user)

    return Response({
        'access': access,
        'refresh': refresh,
        'user': user.to_dict(),
    })


# ============================================
# REGISTER
# ============================================
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register_view(request):
    """POST /api/auth/register/ — create account + return JWT."""
    data = request.data
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    password_confirm = data.get('password_confirm', '')

    # Validations
    if not username or not email or not password:
        return Response({'error': 'Username, email, and password are required.'}, status=400)

    if len(password) < 6:
        return Response({'error': 'Password must be at least 6 characters.'}, status=400)

    if password != password_confirm:
        return Response({'error': 'Passwords do not match.'}, status=400)

    if User.objects(username=username).first():
        return Response({'error': 'Username already taken.'}, status=400)

    if User.objects(email=email).first():
        return Response({'error': 'Email already registered.'}, status=400)

    # Create user
    user = User(
        username=username,
        email=email,
        first_name=data.get('first_name', ''),
        last_name=data.get('last_name', ''),
        role=data.get('role', 'candidate'),
        phone=data.get('phone', ''),
        organization=data.get('organization', ''),
    )
    user.set_password(password)
    user.save()

    access, refresh = generate_tokens(user)

    return Response({
        'access': access,
        'refresh': refresh,
        'user': user.to_dict(),
    }, status=status.HTTP_201_CREATED)


# ============================================
# TOKEN REFRESH
# ============================================
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def refresh_view(request):
    """POST /api/auth/refresh/ — refresh access token."""
    refresh_token = request.data.get('refresh', '')
    if not refresh_token:
        return Response({'error': 'Refresh token required.'}, status=400)

    new_access = refresh_access_token(refresh_token)
    if not new_access:
        return Response({'error': 'Invalid or expired refresh token.'}, status=401)

    return Response({
        'access': new_access,
        'refresh': refresh_token,  # Keep the same refresh token
    })


# ============================================
# ME / PROFILE
# ============================================
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def me_view(request):
    """GET /api/auth/me/ — current user info."""
    user = User.objects.get(id=request.user.id)
    return Response(user.to_dict())


@api_view(['GET', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def profile_view(request):
    """GET/PATCH /api/auth/profile/."""
    user = User.objects.get(id=request.user.id)

    if request.method == 'PATCH':
        for field in ['first_name', 'last_name', 'phone', 'organization']:
            if field in request.data:
                setattr(user, field, request.data[field])
        user.updated_at = datetime.now(timezone.utc)
        user.save()

    return Response(user.to_dict())


# ============================================
# CANDIDATES LIST (admin)
# ============================================
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def candidates_view(request):
    """GET /api/auth/candidates/ — list all candidates (admin only)."""
    if request.user.role != 'admin':
        return Response({'error': 'Admin only.'}, status=403)

    candidates = User.objects(role='candidate')
    return Response([c.to_dict() for c in candidates])
