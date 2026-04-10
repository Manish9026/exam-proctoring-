"""
Proctoring views — MongoDB powered.
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import permissions, status
from django.conf import settings
from datetime import datetime

import logging
from .models import Violation, ProctoringEvent
from exams.models import ExamSession

logger = logging.getLogger(__name__)


def get_proctor_config():
    """Reads latest config from file with settings fallback."""
    import json, os
    from django.conf import settings
    path = getattr(settings, 'CONFIG_PATH', None)
    if not path:
        path = os.path.join(settings.BASE_DIR, 'server', 'proctor_config.json')
    try:
        with open(path, 'r') as f:
            return {**settings.PROCTORING, **json.load(f)}
    except:
        return settings.PROCTORING


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


# ============================================
# CANDIDATE — Realtime Server-Side AI Frame Integration
# ============================================
import logging
import asyncio

try:
    from .ai.detection_pipeline import PipelineOrchestrator
    from .ai.risk_engine import RiskManager
    ai_pipeline = PipelineOrchestrator()
    risk_engine = RiskManager()
except Exception as e:
    ai_pipeline = None
    risk_engine = None
    logging.error(f"AI tools load failed: {str(e)}")

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def process_frame(request):
    """POST /api/proctoring/frame/"""
    data = request.data
    session_id = data.get('session_id')
    b64_frame = data.get('frame')
    tick_count = data.get('tick', 0)
    
    if not b64_frame or not session_id or not ai_pipeline:
        return Response({"status": "no_op", "risk_score": 0, "violations": []})
        
    try:
        session = ExamSession.objects.get(
            id=session_id, candidate_id=request.user.id, status='in_progress'
        )
    except ExamSession.DoesNotExist:
        logger.warning(f"Frame Reject [Session {session_id}]: Not found or not in_progress")
        return Response({'error': 'Active session not found'}, status=404)

    # Schedule: objects every 3rd tick, identity every 5th tick
    # Since Django views are synchronous, we run the asyncio task synchronously here.
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    results = loop.run_until_complete(ai_pipeline.process_frame(
        b64_frame, 
        check_objects=(tick_count % 3 == 0), 
        check_identity=(tick_count % 5 == 0),
        audio_level=data.get('audio_level', 0),
        reference_id_b64=session.face_snapshot,
        audio_evidence=data.get('audio_evidence')
    ))
    
    risk_state = risk_engine.evaluate(session_id, results, current_score=session.risk_score)
    
    # Use LIVE config from file
    config = get_proctor_config()
    weights = config.get('RISK_WEIGHTS', {})
    
    if risk_state['new_violations']:
        for v in risk_state['new_violations']:
            from .models import Violation, ProctoringEvent
            v_type = v['type']
            violation = Violation(
                session_id=session_id, candidate_id=request.user.id,
                candidate_name=request.user.get_full_name() or request.user.username,
                exam_title=session.exam_title, violation_type=v_type,
                severity=v['severity'], description=v['detail'],
                risk_delta=weights.get(v_type, 0),
                snapshot_path=b64_frame,
                metadata=v.get('metadata', {})
            )
            violation.save()
            
    # Sync DB score & results for Live Monitoring
    session.risk_score = risk_state['score']
    session.last_frame = b64_frame
    session.last_detections = results
    if risk_state['new_violations']:
        session.violation_count += len(risk_state['new_violations'])
    
    # Auto-terminate if threshold exceeded
    threshold = config.get('AUTO_TERMINATE_THRESHOLD', 100)
    if session.risk_score >= threshold:
        session.status = 'terminated'
        session.termination_reason = f"Auto-terminated: Risk score {session.risk_score} reached threshold."
        session.save()
        return Response({
            "status": "terminated",
            "risk_score": session.risk_score,
            "reason": "Security threshold exceeded."
        }, status=403)

    session.save()

    return Response({
        "status": "success",
        "risk_score": risk_state['score'],
        "violations": risk_state['new_violations'],
        "detections": results,
        "reasons": risk_state['reasons']
    })


# ============================================
# CANDIDATE — Report AI-Detected Violation
# ============================================
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def report_violation(request):
    """POST /api/proctoring/report-violation/"""
    data = request.data
    session_id = data.get('session_id')
    
    try:
        session = ExamSession.objects.get(
            id=session_id, candidate_id=request.user.id, status='in_progress'
        )
    except ExamSession.DoesNotExist:
        return Response({'error': 'Active session not found'}, status=404)
    
    violation_type = data.get('violation_type', 'tab_switch')
    severity = data.get('severity', 'medium')
    
    # Use LIVE config from file
    config = get_proctor_config()
    weights = config.get('RISK_WEIGHTS', {})
    risk_delta = weights.get(violation_type, 10)
    
    # Handle snapshot file or base64 evidence
    snapshot_path = ''
    if 'snapshot' in request.FILES:
        import uuid, os, base64
        file = request.FILES['snapshot']
        snapshot_path = f"data:{file.content_type};base64,{base64.b64encode(file.read()).decode('utf-8')}"
    elif 'snapshot' in data:
        snapshot_path = data['snapshot']
        
    # Create violation in MongoDB
    violation = Violation(
        session_id=session_id,
        candidate_id=request.user.id,
        candidate_name=request.user.get_full_name() or request.user.username,
        exam_title=session.exam_title,
        violation_type=violation_type,
        severity=severity,
        description=data.get('description', ''),
        risk_delta=risk_delta,
        snapshot_path=snapshot_path,
        metadata=data.get('metadata', {}),
    )
    violation.save()
    
    # Update session risk
    session.risk_score = min(100, session.risk_score + risk_delta)
    session.violation_count += 1
    if violation_type == 'tab_switch':
        session.tab_switch_count += 1
    
    summary = session.session_violations_summary or {}
    summary[violation_type] = summary.get(violation_type, 0) + 1
    session.session_violations_summary = summary
    
    session.save()
    
    # Update user stats
    request.user.total_violations += 1
    request.user.save()
    
    # Create event
    warning_threshold = config.get('AUTO_WARNING_THRESHOLD', 50)
    ProctoringEvent(
        session_id=session_id,
        event_type='risk_threshold' if session.risk_score >= warning_threshold else 'warning_sent',
        description=f"{violation.violation_label} detected. Risk: {session.risk_score:.0f}",
        metadata={'risk_score': session.risk_score, 'violation_id': str(violation.id)},
    ).save()
    
    # Check auto-terminate
    term_threshold = config.get('AUTO_TERMINATE_THRESHOLD', 85)
    should_terminate = session.risk_score >= term_threshold
    if should_terminate:
        term_desc = f"Auto-terminated: Risk score {session.risk_score:.0f} exceeded threshold due to {violation.violation_label}."
        logger.error(f"SESSION TERMINATED [Session {session_id}]: {term_desc}")
        session.status = 'terminated'
        session.termination_reason = term_desc
        session.save()
        ProctoringEvent(
            session_id=session_id, event_type='exam_terminated',
            description=term_desc,
        ).save()
    
    return Response({
        'violation': violation.to_dict(),
        'risk_score': session.risk_score,
        'warning': session.risk_score >= warning_threshold,
        'terminated': should_terminate,
    })


# ============================================
# ADMIN — Violation Logs
# ============================================
@api_view(['GET'])
@permission_classes([IsAdminUser])
def violation_list(request):
    """GET /api/proctoring/violations/"""
    qs = Violation.objects.all()
    session_id = request.query_params.get('session')
    if session_id:
        qs = qs.filter(session_id=session_id)
    severity = request.query_params.get('severity')
    if severity:
        qs = qs.filter(severity=severity)
    vtype = request.query_params.get('type')
    if vtype:
        qs = qs.filter(violation_type=vtype)
    return Response([v.to_dict() for v in qs[:100]])


@api_view(['GET'])
@permission_classes([IsAdminUser])
def session_timeline(request, session_id):
    """GET /api/proctoring/timeline/{session_id}/"""
    events = ProctoringEvent.objects.filter(session_id=session_id)
    return Response([e.to_dict() for e in events])


# ============================================
# ADMIN — Live Monitoring Data
# ============================================
@api_view(['GET'])
@permission_classes([IsAdminUser])
def live_monitoring(request):
    """GET /api/proctoring/live/ — active sessions with risk data."""
    sessions = ExamSession.objects.filter(status='in_progress').order_by('-risk_score')
    
    data = []
    for s in sessions:
        recent_violations = Violation.objects.filter(session_id=str(s.id)).order_by('-timestamp')[:5]
        data.append({
            'session_id': str(s.id),
            'candidate': {
                'id': s.candidate_id,
                'name': s.candidate_name,
                'email': s.candidate_email,
            },
            'exam': {
                'id': s.exam_id,
                'title': s.exam_title,
            },
            'risk_score': s.risk_score,
            'risk_level': 'high' if s.risk_score >= 60 else 'medium' if s.risk_score >= 30 else 'low',
            'violation_count': s.violation_count,
            'tab_switches': s.tab_switch_count,
            'last_frame': s.last_frame,
            'last_detections': s.last_detections,
            'started_at': s.started_at.isoformat() if s.started_at else None,
            'recent_flags': [
                {'type': v.violation_label, 'time': v.timestamp.isoformat(), 'delta': v.risk_delta}
                for v in recent_violations
            ],
        })
    
    return Response(data)


# ============================================
# ADMIN — System Config (File Persistent)
# ============================================
@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def admin_config(request):
    """GET /api/proctoring/config/ — Read file | POST — Write file."""
    import json
    from django.conf import settings
    
    # Path is defined in settings
    CONFIG_PATH = getattr(settings, 'CONFIG_PATH', None)
    if not CONFIG_PATH:
        # Fallback if settings didn't define it
        from pathlib import Path
        CONFIG_PATH = Path(settings.BASE_DIR) / 'server' / 'proctor_config.json'

    if request.method == 'GET':
        try:
            with open(CONFIG_PATH, 'r') as f:
                return Response(json.load(f))
        except Exception as e:
            return Response({"error": f"Load failed: {str(e)}"}, status=500)

    # POST (Update)
    try:
        new_config = request.data
        # Simple validation: ensure it's a dict
        if not isinstance(new_config, dict):
            return Response({"error": "Invalid format"}, status=400)
            
        with open(CONFIG_PATH, 'w') as f:
            json.dump(new_config, f, indent=4)
            
        return Response({"status": "Configuration updated successfully", "config": new_config})
    except Exception as e:
        return Response({"error": f"Save failed: {str(e)}"}, status=500)
