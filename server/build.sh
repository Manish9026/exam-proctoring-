#!/usr/bin/env bash
# exit on error
set -o errexit

cd server
pip install --upgrade pip
pip install --no-cache-dir -r requirements.txt

python manage.py collectstatic --noinput
python manage.py migrate

# --- WARMUP AI CACHES (Prevents startup timeouts) ---
echo "Warmup AI Caches..."
export MPLCONFIGDIR=/tmp/matplotlib
python -c "import matplotlib.pyplot as plt; print('Font cache ready.')"
python -c "from ultralytics import YOLO; print('YOLO settings ready.')"
