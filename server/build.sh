#!/usr/bin/env bash
# exit on error
set -o errexit

cd server
pip install -r requirements.txt

python manage.py collectstatic --noinput
python manage.py migrate
