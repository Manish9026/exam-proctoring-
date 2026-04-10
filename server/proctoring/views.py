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


# Global AI instances (Initialized during Django startup on main thread to avoid thread deadlocks)
_ai_pipeline = None
_risk_engine = None

def get_ai_pipeline():
    global _ai_pipeline
    if _ai_pipeline is None:
        try:
            from .ai.detection_pipeline import PipelineOrchestrator
            _ai_pipeline = PipelineOrchestrator()
            logging.info("AI Pipeline initialized successfully.")
        except Exception as e:
            import traceback
            logging.error(f"AI Pipeline initialization failed: {str(e)}\n{traceback.format_exc()}")
            _ai_pipeline = False 
    return _ai_pipeline

def get_risk_engine():
    global _risk_engine
    if _risk_engine is None:
        try:
            from .ai.risk_engine import RiskManager
            _risk_engine = RiskManager()
        except Exception:
            _risk_engine = False
    return _risk_engine

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def process_frame(request):
    """POST /api/proctoring/frame/"""
    pipeline = get_ai_pipeline()
    risk = get_risk_engine()
    data = request.data
    
    session_id = data.get('session_id')
    b64_frame = data.get('frame')
    tick_count = data.get('tick', 0)
    
    if not b64_frame or not session_id or not pipeline:
        return Response({"status": "no_op", "risk_score": 0, "violations": []})
        
    try:
        session = ExamSession.objects.get(
            id=session_id, candidate_id=request.user.id, status='in_progress'
        )
    except ExamSession.DoesNotExist:
        logger.warning(f"Frame Reject [Session {session_id}]: Not found or not in_progress")
        return Response({'error': 'Active session not found'}, status=404)

    # Run all detections every frame for maximum accuracy and smoothness
    # (The 400x300 downscaling we added to the frontend makes this feasible)
    results = pipeline.process_frame(
        b64_frame, 
        check_objects=True, 
        check_identity=True,
        check_gaze=True,
        audio_level=data.get('audio_level', 0),
        reference_id_b64=getattr(session, 'face_snapshot', None),
        audio_evidence=data.get('audio_evidence')
    )
    
    risk_state = risk.evaluate(
        session_id, 
        results, 
        current_score=session.risk_score,
        is_speech=data.get('is_speech', False)
    )
    
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
    
    # Return clean response (exclude heavy audio/image metadata for HUD performance)
    clean_violations = [
        {"type": v["type"], "severity": v["severity"], "detail": v["detail"]} 
        for v in risk_state['new_violations']
    ]

    response_data = {
        "status": session.status,
        "risk_score": risk_state['score'],
        "detections": {
            "boxes": results["boxes"],
            "gaze": results["gaze"],
            "face_count": results["face_count"],
            "identity": results.get("identity")
        },
        "violations": clean_violations,
        "tick": tick_count,
        "reasons": risk_state['reasons']
    }

    if session.status == 'terminated':
        return Response(response_data, status=403)
        
    return Response(response_data)


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
