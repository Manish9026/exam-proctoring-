"""
ProctorAI — Main URL Configuration (100% MongoDB)
"""
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('api/auth/', include('accounts.urls')),
    path('api/', include('exams.urls')),
    path('api/proctoring/', include('proctoring.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
