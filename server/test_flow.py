"""Quick E2E test of the full candidate exam flow via API."""
import requests, json

BASE = 'http://127.0.0.1:8000/api'

# 1. Login
r = requests.post(f'{BASE}/auth/login/', json={'username': 'rahul', 'password': 'test123'})
assert r.status_code == 200, f'Login failed: {r.text}'
token = r.json()['access']
h = {'Authorization': f'Bearer {token}'}
print(f'1. LOGIN: OK (200)')

# 2. Available exams
r = requests.get(f'{BASE}/candidate/exams/', headers=h)
exams = r.json()
print(f'2. EXAMS: {len(exams)} available')

# 3. Exam detail — pick an active exam with questions
active_exams = [e for e in exams if e['status'] == 'active' and e['question_count'] > 0]
eid = active_exams[0]['id']
r = requests.get(f'{BASE}/candidate/exams/{eid}/', headers=h)
detail = r.json()
print(f'3. DETAIL: "{detail["title"]}" - {detail["question_count"]} questions')

# 4. Start session
r = requests.post(f'{BASE}/candidate/exams/{eid}/start/', headers=h)
session = r.json()
sid = session['id']
print(f'4. SESSION STARTED: {sid[:15]}...')

# 5. Submit answer
r = requests.post(f'{BASE}/candidate/sessions/{sid}/answer/', headers=h,
    json={'question_index': 0, 'selected_answer': 'A'})
print(f'5. ANSWER SAVED: {r.json()}')

# 6. Report violation
r = requests.post(f'{BASE}/proctoring/report-violation/', headers=h,
    json={'session_id': sid, 'violation_type': 'tab_switch', 'severity': 'high', 'description': 'Tab switch test'})
vdata = r.json()
print(f'6. VIOLATION REPORTED: risk_score={vdata.get("risk_score")}')

# 7. Submit exam
r = requests.post(f'{BASE}/candidate/sessions/{sid}/submit/', headers=h)
result = r.json()
print(f'7. EXAM SUBMITTED: score={result["session"]["score"]}, correct={result["session"]["correct_answers"]}')

print('\n=== FULL CANDIDATE FLOW VERIFIED ===')
