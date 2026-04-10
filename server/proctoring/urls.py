from django.urls import path
from . import views

urlpatterns = [
    # Candidate
    path('report-violation/', views.report_violation, name='report-violation'),
    path('frame/', views.process_frame, name='process-frame'),
    
    # Admin
    path('violations/', views.violation_list, name='violations'),
    path('timeline/<str:session_id>/', views.session_timeline, name='session-timeline'),
    path('live/', views.live_monitoring, name='live-monitoring'),
    path('config/', views.admin_config, name='admin-config'),
]
