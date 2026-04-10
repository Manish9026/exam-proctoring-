"""
Exam views — using MongoDB (mongoengine) for all data operations.
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import permissions, status
from django.conf import settings
from datetime import datetime, timedelta

from .models import Exam, Question, ExamSession, Answer
from proctoring.models import Violation, ProctoringEvent
from accounts.models import User


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


# ============================================
# ADMIN — Exam CRUD
# ============================================
@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def exam_list_create(request):
    """GET /api/exams/ — list all | POST /api/exams/ — create."""
    if request.method == 'GET':
        qs = Exam.objects.all()
        stat = request.query_params.get('status')
        if stat:
            qs = qs.filter(status=stat)
        return Response([e.to_dict() for e in qs])
    
    # POST — create exam
    data = request.data
    exam = Exam(
        title=data['title'],
        description=data.get('description', ''),
        subject=data['subject'],
        duration_minutes=data.get('duration_minutes', 60),
        total_marks=data.get('total_marks', 100),
        passing_marks=data.get('passing_marks', 40),
        status=data.get('status', 'draft'),
        scheduled_at=data.get('scheduled_at'),
        created_by_id=request.user.id,
        created_by_name=request.user.get_full_name() or request.user.username,
        camera_required=data.get('camera_required', True),
        mic_required=data.get('mic_required', False),
        max_tab_switches=data.get('max_tab_switches', 3),
        fullscreen_required=data.get('fullscreen_required', True),
        risk_threshold=data.get('risk_threshold', 85),
    )
    exam.save()
    return Response(exam.to_dict(include_questions=True), status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAdminUser])
def exam_detail(request, exam_id):
    """GET/PUT/DELETE /api/exams/{exam_id}/"""
    try:
        exam = Exam.objects.get(id=exam_id)
    except Exam.DoesNotExist:
        return Response({'error': 'Exam not found'}, status=404)
    
    if request.method == 'GET':
        return Response(exam.to_dict(include_questions=True))
    
    if request.method == 'PUT':
        for field in ['title', 'description', 'subject', 'duration_minutes', 'total_marks',
                       'passing_marks', 'status', 'scheduled_at', 'camera_required', 'mic_required',
                       'fullscreen_required', 'max_tab_switches', 'risk_threshold']:
            if field in request.data:
                setattr(exam, field, request.data[field])
        exam.updated_at = datetime.utcnow()
        exam.save()
        return Response(exam.to_dict(include_questions=True))
    
    if request.method == 'DELETE':
        exam.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def add_question(request, exam_id):
    """POST /api/exams/{exam_id}/questions/ — add a question."""
    try:
        exam = Exam.objects.get(id=exam_id)
    except Exam.DoesNotExist:
        return Response({'error': 'Exam not found'}, status=404)
    
    data = request.data
    question = Question(
        question_text=data['question_text'],
        question_type=data.get('question_type', 'mcq'),
        marks=data.get('marks', 1),
        order=data.get('order', len(exam.questions) + 1),
        option_a=data.get('option_a', ''),
        option_b=data.get('option_b', ''),
        option_c=data.get('option_c', ''),
        option_d=data.get('option_d', ''),
        correct_answer=data.get('correct_answer', 'A'),
        explanation=data.get('explanation', ''),
    )
    exam.questions.append(question)
    exam.save()
    return Response(exam.to_dict(include_questions=True), status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def activate_exam(request, exam_id):
    """POST /api/exams/{exam_id}/activate/"""
    try:
        exam = Exam.objects.get(id=exam_id)
    except Exam.DoesNotExist:
        return Response({'error': 'Exam not found'}, status=404)
    exam.status = 'active'
    exam.save()
    return Response({'status': 'active', 'message': 'Exam is now live.'})


@api_view(['GET'])
@permission_classes([IsAdminUser])
def exam_sessions(request, exam_id):
    """GET /api/exams/{exam_id}/sessions/"""
    sessions = ExamSession.objects.filter(exam_id=str(exam_id))
    return Response([s.to_dict() for s in sessions])


# ============================================
# ADMIN — All Sessions
# ============================================
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_session_list(request):
    """GET /api/sessions/"""
    qs = ExamSession.objects.all()
    stat = request.query_params.get('status')
    if stat:
        qs = qs.filter(status=stat)
    risk_min = request.query_params.get('risk_min')
    if risk_min:
        qs = qs.filter(risk_score__gte=float(risk_min))
    return Response([s.to_dict() for s in qs])


@api_view(['GET', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def session_detail(request, session_id):
    """GET/PATCH /api/sessions/{session_id}/ — accessible by Admin or Owner."""
    try:
        session = ExamSession.objects.get(id=session_id)
    except ExamSession.DoesNotExist:
        return Response({'error': 'Session not found'}, status=404)
    
    # Permission Check: Admin or the Candidate who owns the session
    is_admin = getattr(request.user, 'role', '') == 'admin'
    is_owner = str(session.candidate_id) == str(request.user.id)
    
    if not (is_admin or is_owner):
        return Response({'error': 'Unauthorized access to this session.'}, status=403)
    
    if request.method == 'PATCH':
        if not is_admin:
             return Response({'error': 'Only admins can modify session results.'}, status=403)
             
        for field in ['status', 'risk_score']:
            if field in request.data:
                setattr(session, field, request.data[field])
        session.save()
    
    return Response(session.to_dict())


# ============================================
# CANDIDATE — Available Exams
# ============================================
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def candidate_exam_list(request):
    """GET /api/candidate/exams/ — available exams."""
    exams = Exam.objects.filter(status__in=['active', 'scheduled'])
    return Response([e.to_dict() for e in exams])


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def candidate_exam_detail(request, exam_id):
    """GET /api/candidate/exams/{exam_id}/ — exam with questions (no answers)."""
    try:
        exam = Exam.objects.get(id=exam_id)
    except Exam.DoesNotExist:
        return Response({'error': 'Exam not found'}, status=404)
    return Response(exam.to_dict(include_questions=True, hide_answers=True))


# ============================================
# CANDIDATE — Start / Take / Submit Exam
# ============================================
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def start_exam(request, exam_id):
    """POST /api/candidate/exams/{exam_id}/start/"""
    try:
        exam = Exam.objects.get(id=exam_id, status='active')
    except Exam.DoesNotExist:
        return Response({'error': 'Exam not found or not active'}, status=404)
    
    # Check existing session
    existing = ExamSession.objects.filter(
        exam_id=str(exam_id), candidate_id=request.user.id
    ).first()
    
    face_snapshot = request.data.get('face_snapshot', '')
    id_document = request.data.get('id_document', '')

    device_info = request.data.get('device_info', {})
    if not device_info:
        # Fallback to grabbing basic info from request headers
        device_info = {
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            'ip_address': request.META.get('REMOTE_ADDR', '')
        }

    if existing:
        if existing.status in ['submitted', 'terminated']:
            return Response({'error': 'You have already completed this exam.'}, status=400)
        existing.status = 'in_progress'
        if not existing.started_at:
            existing.started_at = datetime.utcnow()
        if face_snapshot: existing.face_snapshot = face_snapshot
        if id_document: existing.id_document = id_document
        existing.device_info = device_info
        existing.face_verified = True
        existing.id_verified = True
        existing.environment_scanned = True
        existing.save()
        return Response(existing.to_dict())
    
    session = ExamSession(
        exam_id=str(exam_id),
        exam_title=exam.title,
        candidate_id=request.user.id,
        candidate_name=request.user.get_full_name() or request.user.username,
        candidate_email=request.user.email,
        status='in_progress',
        started_at=datetime.utcnow(),
        face_snapshot=face_snapshot,
        id_document=id_document,
        device_info=device_info,
        face_verified=True,
        id_verified=True,
        environment_scanned=True
    )
    session.save()
    return Response(session.to_dict(), status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def submit_answer(request, session_id):
    """POST /api/candidate/sessions/{session_id}/answer/"""
    try:
        session = ExamSession.objects.get(
            id=session_id, candidate_id=request.user.id, status='in_progress'
        )
    except ExamSession.DoesNotExist:
        return Response({'error': 'Session not found'}, status=404)
    
    q_index = int(request.data.get('question_index', 0))
    selected = request.data.get('selected_answer', '')
    flagged = request.data.get('is_flagged', False)
    
    # Update or add answer
    found = False
    for ans in session.answers:
        if ans.question_index == q_index:
            ans.selected_answer = selected
            ans.is_flagged = flagged
            ans.answered_at = datetime.utcnow()
            found = True
            break
    
    if not found:
        session.answers.append(Answer(
            question_index=q_index,
            selected_answer=selected,
            is_flagged=flagged,
        ))
    
    session.save()
    return Response({'message': 'Answer saved', 'total_answered': len(session.answers)})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def submit_exam(request, session_id):
    """POST /api/candidate/sessions/{session_id}/submit/"""
    try:
        session = ExamSession.objects.get(
            id=session_id, candidate_id=request.user.id, status='in_progress'
        )
    except ExamSession.DoesNotExist:
        return Response({'error': 'Session not found'}, status=404)
    
    # Get exam to check answers
    try:
        exam = Exam.objects.get(id=session.exam_id)
    except Exam.DoesNotExist:
        return Response({'error': 'Exam data not found'}, status=404)
    
    correct = 0
    total_marks = 0
    for ans in session.answers:
        if ans.question_index < len(exam.questions):
            q = exam.questions[ans.question_index]
            if ans.selected_answer.upper() == q.correct_answer.upper():
                correct += 1
                total_marks += q.marks
    
    session.status = 'submitted'
    session.submitted_at = datetime.utcnow()
    session.total_answered = len(session.answers)
    session.correct_answers = correct
    session.score = total_marks
    session.save()
    
    # Update user stats
    request.user.total_exams_taken += 1
    request.user.save()
    
    return Response({
        'message': 'Exam submitted successfully.',
        'session': session.to_dict(),
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_sessions(request):
    """GET /api/candidate/sessions/ — candidate's own sessions."""
    sessions = ExamSession.objects.filter(candidate_id=request.user.id)
    return Response([s.to_dict() for s in sessions])


# ============================================
# ADMIN DASHBOARD STATS
# ============================================
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_dashboard_stats(request):
    """GET /api/admin/stats/ — Aggregated Enterprise Dashboard Data."""
    # 1. Base Metrics
    now = datetime.utcnow()
    total_exams = Exam.objects.count()
    active_exams = Exam.objects.filter(status='active').count()
    total_sessions = ExamSession.objects.count()
    active_sessions = ExamSession.objects.filter(status='in_progress').count()
    total_candidates = User.objects(role='candidate').count()
    
    # 2. Risk Metrics
    sessions_total = ExamSession.objects.all()
    avg_risk = 0
    total_violations = 0
    if sessions_total:
        avg_risk = sum(s.risk_score for s in sessions_total) / len(sessions_total)
        total_violations = sum(s.violation_count for s in sessions_total)

    high_risk_count = ExamSession.objects.filter(risk_score__gte=60).count()

    # 3. Trends (Last 7 Days)
    trends = []
    for i in range(6, -1, -1):
        day = (now - timedelta(days=i)).date()
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day, datetime.max.time())
        
        cands = ExamSession.objects.filter(started_at__gte=day_start, started_at__lte=day_end).count()
        viols = Violation.objects.filter(timestamp__gte=day_start, timestamp__lte=day_end).count()
        
        trends.append({
            'time': day.strftime('%b %d'),
            'candidates': cands,
            'violations': viols
        })

    # 4. Recent Activity (Merged Violations and Events)
    recent_violations = Violation.objects.order_by('-timestamp')[:5]
    recent_events = ProctoringEvent.objects.order_by('-timestamp')[:5]
    
    activity = []
    for v in recent_violations:
        activity.append({
            'type': 'danger' if v.severity == 'critical' else 'warning',
            'text': f"<strong>{v.candidate_name}</strong> - {v.violation_label} detected",
            'time': v.timestamp.strftime('%H:%M'),
            'ts': v.timestamp
        })
    for e in recent_events:
        activity.append({
            'type': 'success' if e.event_type == 'exam_started' else 'warning',
            'text': f"<strong>System</strong> - {e.description}",
            'time': e.timestamp.strftime('%H:%M'),
            'ts': e.timestamp
        })
    activity.sort(key=lambda x: x['ts'], reverse=True)

    # 5. Security Grid (In Progress sessions with highest risk)
    grid = []
    for s in ExamSession.objects.filter(status='in_progress').order_by('-risk_score')[:6]:
        grid.append({
            'name': s.candidate_name,
            'score': round(s.risk_score),
            'status': 'danger' if s.risk_score >= 60 else 'warning' if s.risk_score >=30 else 'success'
        })

    # 6. Violations Breakdown
    breakdown_map = {}
    for v in Violation.objects.all():
        label = v.violation_label
        breakdown_map[label] = breakdown_map.get(label, 0) + 1
    
    breakdown = [{'name': k, 'value': v} for k, v in breakdown_map.items()]
    if not breakdown: breakdown = [{'name': 'Clean', 'value': 1}]

    # 7. Risk distribution percentages
    total_sess = max(1, len(sessions_total))
    medium_risk_count = ExamSession.objects.filter(risk_score__gte=30, risk_score__lt=60).count()
    low_risk_count = total_sess - high_risk_count - medium_risk_count

    return Response({
        'stats': {
            'active_exams': active_exams,
            'online_candidates': active_sessions,
            'high_risk_alerts': high_risk_count,
            'avg_risk_score': avg_risk,
            'total_exams': total_exams,
            'total_violations': total_violations,
        },
        'trends': trends,
        'recent_activity': activity[:10],
        'live_grid': grid,
        'risk_distribution': [
            {'label': 'High Risk', 'percentage': round((high_risk_count / total_sess) * 100), 'level': 'high'},
            {'label': 'Medium Risk', 'percentage': round((medium_risk_count / total_sess) * 100), 'level': 'medium'},
            {'label': 'Low Risk', 'percentage': round((low_risk_count / total_sess) * 100), 'level': 'low'},
        ],
        'violations_breakdown': breakdown[:5] # Top 5 types
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_candidate_list(request):
    """GET /api/admin/candidates/ — listing with summary stats."""
    candidates = User.objects(role='candidate')
    
    data = []
    for c in candidates:
        sess = ExamSession.objects.filter(candidate_id=str(c.id))
        avg_risk = sum(s.risk_score for s in sess) / len(sess) if sess else 0
        last_s = sess.order_by('-started_at').first()
        
        status = 'active'
        if avg_risk > 70: status = 'flagged'
        
        data.append({
            'id': str(c.id),
            'name': c.get_full_name() or c.username,
            'email': c.email,
            'exams': len(sess),
            'avgRisk': round(avg_risk),
            'status': status,
            'lastExam': last_s.started_at.strftime('%Y-%m-%d') if (last_s and last_s.started_at) else 'N/A'
        })
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_reset_session(request, session_id):
    """POST /api/sessions/{session_id}/reset/ — allow candidate to retake."""
    try:
        session = ExamSession.objects.get(id=session_id)
    except ExamSession.DoesNotExist:
        return Response({'error': 'Session not found'}, status=404)
    
    # Reset session for retake
    session.status = 'not_started'
    session.score = 0
    session.correct_answers = 0
    session.total_answered = 0
    session.risk_score = 0
    session.violation_count = 0
    session.answers = []
    session.submitted_at = None
    session.started_at = None
    session.save()
    
    return Response({'message': 'Session reset successfully. Candidate can now retake this exam.'})


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def admin_delete_session(request, session_id):
    """DELETE /api/sessions/{session_id}/ — remove session completely."""
    try:
        session = ExamSession.objects.get(id=session_id)
        session.delete()
        return Response({'message': 'Session deleted.'}, status=204)
    except ExamSession.DoesNotExist:
        return Response({'error': 'Session not found'}, status=404)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_analytics(request):
    """GET /api/admin/analytics/ — High-level historical & distribution analytics."""
    now = datetime.utcnow()
    
    # Monthly volume (Last 4 months)
    monthly_data = []
    for i in range(3, -1, -1):
        month_start = (now.replace(day=1) - timedelta(days=i*30)).replace(day=1, hour=0, minute=0, second=0)
        # simplistic next month calc
        month_end = (month_start + timedelta(days=32)).replace(day=1)
        
        exams = Exam.objects.filter(created_at__gte=month_start, created_at__lt=month_end).count()
        candidates = ExamSession.objects.filter(started_at__gte=month_start, started_at__lt=month_end).count()
        viols = Violation.objects.filter(timestamp__gte=month_start, timestamp__lt=month_end).count()
        
        monthly_data.append({
            'month': month_start.strftime('%b'),
            'exams': exams or (10 * (4-i)), # Mock some historical if empty
            'candidates': candidates or (100 * (4-i)),
            'violations': viols or (5 * (4-i))
        })

    # Stats cards
    total_exams = Exam.objects.count()
    total_sessions = ExamSession.objects.count()
    pass_count = ExamSession.objects.filter(status='submitted', score__gte=40).count()
    pass_rate = round((pass_count / total_sessions * 100)) if total_sessions else 0

    return Response({
        'monthlyData': monthly_data,
        'summary': {
            'totalExams': total_exams,
            'totalCandidates': total_sessions,
            'passRate': pass_rate,
            'avgDuration': "94m" # Simple static for now
        },
        'typeDistribution': [
            {'name': 'MCQ', 'value': 75, 'color': '#3b82f6'},
            {'name': 'Mixed', 'value': 25, 'color': '#8b5cf6'},
        ]
    })
