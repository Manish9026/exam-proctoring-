"""
Seed script — 100% MongoDB. All data (users, exams, sessions, violations) in MongoDB.
Run: python seed.py
"""
import os, sys, django, random
from datetime import datetime, timedelta, timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')
django.setup()

from accounts.models import User
from exams.models import Exam, Question, ExamSession, Answer
from proctoring.models import Violation, ProctoringEvent

print("Seeding ProctorAI (100% MongoDB)...")

# Clear all collections
User.drop_collection()
Exam.drop_collection()
ExamSession.drop_collection()
Violation.drop_collection()
ProctoringEvent.drop_collection()

# ============================================
# 1. USERS (MongoDB)
# ============================================
admin = User(
    username='admin', email='admin@proctorai.com',
    first_name='Admin', last_name='User',
    role='admin', is_staff=True,
)
admin.set_password('admin123')
admin.save()
print("  [OK] Admin: admin / admin123")

candidates_data = [
    ('rahul', 'rahul@test.com', 'Rahul', 'Sharma'),
    ('priya', 'priya@test.com', 'Priya', 'Mehta'),
    ('amit', 'amit@test.com', 'Amit', 'Kumar'),
    ('sara', 'sara@test.com', 'Sara', 'Johnson'),
    ('vikram', 'vikram@test.com', 'Vikram', 'Reddy'),
    ('neha', 'neha@test.com', 'Neha', 'Patel'),
    ('arjun', 'arjun@test.com', 'Arjun', 'Singh'),
    ('kavya', 'kavya@test.com', 'Kavya', 'Nair'),
    ('dev', 'dev@test.com', 'Dev', 'Patel'),
    ('ananya', 'ananya@test.com', 'Ananya', 'Gupta'),
]

candidates = []
for uname, email, first, last in candidates_data:
    u = User(username=uname, email=email, first_name=first, last_name=last, role='candidate')
    u.set_password('test123')
    u.save()
    candidates.append(u)
print(f"  [OK] {len(candidates)} candidates (password: test123)")

# ============================================
# 2. EXAMS + QUESTIONS (MongoDB)
# ============================================
math_qs = [
    ('Derivative of f(x) = x^3 + 2x^2 - 5x + 3?', '3x^2 + 4x - 5', '3x^2 + 2x - 5', 'x^2 + 4x - 5', '3x^2 + 4x + 5', 'A'),
    ('Integral of (2x + 3)dx from 0 to 4?', '28', '32', '24', '36', 'A'),
    ('Limit of (sin x)/x as x approaches 0?', '0', '1', 'infinity', 'undefined', 'B'),
    ('Eigenvalues of [[2,1],[1,2]]?', '1 and 3', '2 and 3', '1 and 2', '0 and 4', 'A'),
    ('Taylor series of e^x at x=0?', 'Sum x^n/n!', 'Sum x^n/n', 'Sum nx^n', 'Sum x/n!', 'A'),
    ('Laplace transform of t^2?', '2/s^3', '1/s^3', '2/s^2', '1/s^2', 'A'),
    ('Rank of 3x3 matrix with identical rows?', '3', '1', '0', '2', 'B'),
    ('Gradient of x^2*y+y^3 at (1,1)?', '(2,4)', '(2,3)', '(1,4)', '(3,3)', 'A'),
    ('Divergence theorem relates?', 'Surface and volume integrals', 'Line and surface integrals', 'Two line integrals', 'Two volume integrals', 'A'),
    ('det([[1,2],[3,4]])?', '-2', '2', '-1', '10', 'A'),
]

physics_qs = [
    ("Newton's 2nd law: F = ?", 'ma', 'mv', 'mg', 'mc^2', 'A'),
    ('SI unit of energy?', 'Joule', 'Watt', 'Newton', 'Pascal', 'A'),
    ('Speed of light in vacuum?', '3x10^8 m/s', '3x10^6 m/s', '3x10^10 m/s', '3x10^4 m/s', 'A'),
    ("Ohm's law relates?", 'V, I, R', 'F, m, a', 'P, V, T', 'E, m, c', 'A'),
    ('Free fall acceleration?', '9.8 m/s^2', '10 m/s^2', '0 m/s^2', '1 m/s^2', 'A'),
]

chem_qs = [
    ('Atomic number of Carbon?', '6', '8', '12', '14', 'A'),
    ('Water formula?', 'H2O', 'CO2', 'NaCl', 'H2SO4', 'A'),
    ('pH of neutral solution?', '7', '0', '14', '1', 'A'),
    ('Noble gas?', 'Helium', 'Oxygen', 'Nitrogen', 'Hydrogen', 'A'),
    ('Solid to Gas process?', 'Sublimation', 'Evaporation', 'Condensation', 'Melting', 'A'),
]

def make_qs(qlist, marks_each):
    return [Question(question_text=t, option_a=a, option_b=b, option_c=c, option_d=d,
                     correct_answer=ans, marks=marks_each, order=i+1)
            for i, (t, a, b, c, d, ans) in enumerate(qlist)]

now = datetime.now(timezone.utc)

exams_cfg = [
    ('Advanced Mathematics Final', 'Calculus, linear algebra, differential equations', 'Mathematics', 120, 50, 20, 'active', True, True, 2, make_qs(math_qs, 5)),
    ('Physics Midterm Exam', 'Mechanics, thermodynamics, wave motion', 'Physics', 90, 40, 16, 'active', True, False, 3, make_qs(physics_qs, 8)),
    ('Chemistry Lab Assessment', 'Organic and inorganic chemistry', 'Chemistry', 60, 30, 12, 'active', True, True, 1, make_qs(chem_qs, 6)),
    ('Computer Science Practical', 'DS, algorithms, system design', 'Computer Science', 180, 100, 40, 'scheduled', True, False, 3, []),
]

exams = []
for title, desc, subj, dur, total, passing, stat, cam, mic, tabs, questions in exams_cfg:
    exam = Exam(
        title=title, description=desc, subject=subj,
        duration_minutes=dur, total_marks=total, passing_marks=passing,
        status=stat, created_by_id=str(admin.id), created_by_name='Admin User',
        camera_required=cam, mic_required=mic, max_tab_switches=tabs,
        questions=questions,
    )
    if stat == 'scheduled':
        exam.scheduled_at = now + timedelta(days=1)
    exam.save()
    exams.append(exam)
print(f"  [OK] {len(exams)} exams with questions -> MongoDB")

# ============================================
# 3. SESSIONS + VIOLATIONS (MongoDB)
# ============================================
viol_types = [
    ('face_missing', 'high'), ('phone_detected', 'high'),
    ('multiple_faces', 'medium'), ('eye_movement', 'medium'),
    ('tab_switch', 'high'), ('audio_detected', 'medium'),
]

sc, vc = 0, 0
for exam in exams[:3]:
    for cand in candidates:
        risk = random.randint(0, 100)
        vcount = random.randint(0, 8)
        st = random.choice(['in_progress', 'submitted', 'in_progress'])

        session = ExamSession(
            exam_id=str(exam.id), exam_title=exam.title,
            candidate_id=str(cand.id), candidate_name=cand.full_name, candidate_email=cand.email,
            status=st,
            started_at=now - timedelta(minutes=random.randint(10, 100)),
            risk_score=risk, violation_count=vcount,
            tab_switch_count=random.randint(0, 3), face_verified=True,
            score=random.randint(0, exam.total_marks) if st == 'submitted' else 0,
            total_answered=len(exam.questions) if st == 'submitted' else random.randint(0, len(exam.questions)),
            correct_answers=random.randint(0, len(exam.questions)),
        )
        session.save()
        sc += 1

        for _ in range(min(vcount, 4)):
            vtype, sev = random.choice(viol_types)
            Violation(
                session_id=str(session.id), candidate_id=str(cand.id),
                candidate_name=cand.full_name, exam_title=exam.title,
                violation_type=vtype, severity=sev,
                description=f'{vtype.replace("_", " ").title()} detected.',
                risk_delta=random.uniform(5, 20),
            ).save()
            vc += 1

        ProctoringEvent(
            session_id=str(session.id), event_type='exam_started',
            description=f'{cand.full_name} started {exam.title}',
        ).save()

        if risk >= 50:
            ProctoringEvent(
                session_id=str(session.id), event_type='risk_threshold',
                description=f'Risk {risk} exceeded warning threshold.',
                metadata={'risk_score': risk},
            ).save()

        cand.total_exams_taken += 1
        cand.avg_risk_score = risk
        cand.total_violations = vcount
        cand.save()

print(f"  [OK] {sc} sessions -> MongoDB")
print(f"  [OK] {vc} violations -> MongoDB")

print("\nSeed complete! All data in MongoDB (proctorai database).")
print("  Admin:     admin / admin123")
print("  Candidate: rahul / test123 (or any of 10 candidates)")
