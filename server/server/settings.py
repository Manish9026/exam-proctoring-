"""
ProctorAI — Django Settings
ALL application data in MongoDB. SQLite exists ONLY as Django's internal plumbing.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-change-me')
DEBUG = os.getenv('DEBUG', 'True') == 'True'
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# ============================================
# INSTALLED APPS
# ============================================
INSTALLED_APPS = [
    # Django internals (required by DRF, never used for app data)
    'django.contrib.contenttypes',
    'django.contrib.auth',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'corsheaders',
    # Project apps (all use MongoDB)
    'accounts',
    'exams',
    'proctoring',
    'api',
]

# ============================================
# MIDDLEWARE
# ============================================
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.middleware.common.CommonMiddleware',
]

ROOT_URLCONF = 'server.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
            ],
        },
    },
]

WSGI_APPLICATION = 'server.wsgi.application'

# ============================================
# DATABASE
# Django requires a SQL DB for its internal apps.
# This SQLite is NEVER used for application data.
# ALL real data (users, exams, proctoring) is in MongoDB.
# ============================================
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / '_django_internal.sqlite3',
    }
}

# MongoDB — ALL application data lives here
# ============================================
import mongoengine
MONGODB_NAME = os.getenv('MONGODB_NAME', 'proctorai')
MONGODB_URI = os.getenv('MONGODB_URI', '').strip()

# Fallback for local dev if MONGODB_URI is missing
if not MONGODB_URI:
    MONGODB_URI = 'mongodb://127.0.0.1:27017/proctorai'

try:
    mongoengine.connect(db=MONGODB_NAME, host=MONGODB_URI)
except Exception as e:
    print(f"WARNING: MongoDB connection failed: {e}")
    # Don't crash during build-time collectstatic
    if 'collectstatic' not in str(os.environ.get('RENDER_COMMAND', '')):
        pass 

# ============================================
# REST FRAMEWORK — Custom MongoDB JWT Auth
# ============================================
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'accounts.auth_backend.MongoJWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'UNAUTHENTICATED_USER': None,
}

# ============================================
# CORS
# ============================================
CORS_ALLOWED_ORIGINS = os.getenv(
    'CORS_ALLOWED_ORIGINS', 'http://localhost:5173'
).split(',')
CORS_ALLOW_CREDENTIALS = True

# ============================================
# STATIC & MEDIA
# ============================================
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ============================================
# INTERNATIONALIZATION
# ============================================
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ============================================
# PROCTORING SETTINGS (Enterprise Grade)
# Loaded from server/proctor_config.json
# ============================================
import json
CONFIG_PATH = BASE_DIR / 'server' / 'proctor_config.json'
_defaults = {
    'AUTO_WARNING_THRESHOLD': 50,
    'AUTO_TERMINATE_THRESHOLD': 85,
    'MAX_TAB_SWITCHES': 3,
    'SNAPSHOT_INTERVAL_SECONDS': 30,
    'RISK_WEIGHTS': {
        'face_missing': 15, 'multiple_faces': 25, 'face_mismatch': 40,
        'phone_detected': 60, 'object_detected': 30, 'looking_away': 10,
        'audio_detected': 15, 'tab_switch': 20, 'copy_paste': 10,
        'fullscreen_exit': 15, 'devtools': 30, 'blur_window': 10
    },
    'DECAY_RATE': 2, 'AUDIO_THRESHOLD': 45, 'IDENTITY_FAIL_TOLERANCE': 2,
    'FACE_MISS_TOLERANCE': 2, 'MULTI_FACE_TOLERANCE': 2,
}

try:
    with open(CONFIG_PATH, 'r') as f:
        PROCTORING = {**_defaults, **json.load(f)}
except Exception:
    PROCTORING = _defaults
