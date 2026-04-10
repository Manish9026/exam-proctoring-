from django.urls import path
from . import views

urlpatterns = [
    # Admin — Exam CRUD
    path('exams/', views.exam_list_create, name='exam-list-create'),
    path('exams/<str:exam_id>/', views.exam_detail, name='exam-detail'),
    path('exams/<str:exam_id>/questions/', views.add_question, name='add-question'),
    path('exams/<str:exam_id>/activate/', views.activate_exam, name='activate-exam'),
    path('exams/<str:exam_id>/sessions/', views.exam_sessions, name='exam-sessions'),
    
    # Admin — Sessions
    path('sessions/', views.admin_session_list, name='admin-sessions'),
    path('sessions/<str:session_id>/', views.session_detail, name='session-detail'),
    path('sessions/<str:session_id>/reset/', views.admin_reset_session, name='session-reset'),
    path('sessions/<str:session_id>/delete/', views.admin_delete_session, name='session-delete'),
    path('admin/stats/', views.admin_dashboard_stats, name='admin-stats'),
    path('admin/candidates/', views.admin_candidate_list, name='admin-candidates'),
    path('admin/analytics/', views.admin_analytics, name='admin-analytics'),
    
    # Candidate
    path('candidate/exams/', views.candidate_exam_list, name='candidate-exams'),
    path('candidate/exams/<str:exam_id>/', views.candidate_exam_detail, name='candidate-exam-detail'),
    path('candidate/exams/<str:exam_id>/start/', views.start_exam, name='start-exam'),
    path('candidate/sessions/', views.my_sessions, name='my-sessions'),
    path('candidate/sessions/<str:session_id>/answer/', views.submit_answer, name='submit-answer'),
    path('candidate/sessions/<str:session_id>/submit/', views.submit_exam, name='submit-exam'),
]
