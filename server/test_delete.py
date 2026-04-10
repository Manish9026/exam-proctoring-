import requests

BASE = 'http://127.0.0.1:8000/api'

# 1. Login to get Admin JWT
r = requests.post(f'{BASE}/auth/login/', json={'username': 'admin', 'password': 'admin123'})
token = r.json().get('access')
h = {'Authorization': f'Bearer {token}'}

# 2. Create an Exam
payload = {
    'title': 'Test Delete Target',
    'subject': 'Testing',
    'duration_minutes': 30,
    'total_marks': 50,
    'passing_marks': 25
}
r1 = requests.post(f'{BASE}/exams/', headers=h, json=payload)
exam_id = r1.json().get('id')
print(f"Created Exam: {exam_id}")

# 3. Delete Exam
r2 = requests.delete(f'{BASE}/exams/{exam_id}/', headers=h)
print(f"Delete Status: {r2.status_code}")

# 4. Verify Delete
r3 = requests.get(f'{BASE}/exams/{exam_id}/', headers=h)
print(f"Verify Status: {r3.status_code} (Should be 404)")
