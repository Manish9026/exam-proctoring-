# 🛡️ Enterprise-Grade AI Proctoring System

A sophisticated, production-ready AI Proctoring solution designed for high-stakes online examinations. Built with a focus on real-time security, forensic auditability, and administrative control.

---

## 🏗️ System Architecture
The platform utilizes a hybrid architecture:
- **Client-Side Edge Logic**: Captures telemetry, performs basic behavioral checks, and enforces secure browser environments.
- **Server-Side AI Engine**: Processes video frames via a high-performance YOLOv8 pipeline for objective detection, gaze analysis, and face verification.
- **Persistent Risk Manager**: A hot-reloadable engine that calculates aggregate risk scores and enforces automated session termination.

## 🚀 Production Quickstart

### Environment Requirements
- **Hardware**: GPU recommended (NVIDIA with CUDA 11.8+) for < 200ms frame latency.
- **Python**: 3.10 or 3.11.
- **Node**: 18.x or 20.x (LTS).
- **Database**: PostgreSQL (Production) or SQLite (Development).
- **Storage**: MongoDB (for Violation & Event logging).

### Automatic Maintenance
Run the included PowerShell maintenance script to sync dependencies and prepare the environment:
```powershell
./maintain.ps1
```

## 🔒 Security Features
- **Tab/Window Enforcement**: Automatic termination after a configurable number of tab switches.
- **Biometric Locking**: Initial face snapshot verification against continuous video feed.
- **Forensic Audio**: 15-second rolling audio buffering stored as Base64 on violation detection.
- **Secure HUD**: Real-time candidate feedback via an AI-driven scanning overlay.

## ⚙️ Configuration (`server/server/proctor_config.json`)
The system behavior is managed via a hot-reloadable JSON file. Updates take effect **immediately** without a server restart:
| Parameter | Description |
| :--- | :--- |
| `AUTO_TERMINATE_THRESHOLD` | Risk score (0-100) at which the session is force-closed. |
| `RISK_WEIGHTS` | Penalty points for specific AI signatures (Phone, Face Missing, etc). |
| `SNAPSHOT_INTERVAL_SECONDS` | Frequency of forensic evidence capture. |
| `DECAY_RATE` | Speed at which the risk score drops when no violations are detected. |

## 🛠️ API Documentation (Key Endpoints)
- `POST /api/proctoring/frame/`: Primary AI telemetry endpoint (accepts Base64 frames).
- `POST /api/proctoring/report-violation/`: Behavioral event logging.
- `GET /api/proctoring/config/`: Remote system configuration (Admin only).
- `GET /api/proctoring/live/`: Real-time monitoring feed.

## 🚀 Deploying to Render
This project is configured for automated deployment via **Render Blueprints**.

### 1. Requirements
- A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster (Free tier is fine).
- A GitHub repository containing this project.

### 2. Steps to Deploy
1. Log in to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** and select **Blueprint**.
3. Connect your GitHub repository.
4. Render will detect the `render.yaml` file and prepare two services:
   - `proctor-api` (Web Service)
   - `proctor-app` (Static Site)
5. **Environment Variables**:
   - In the `proctor-api` settings, provide your `MONGODB_URI` from Atlas.
   - Update `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS` with your actual Render URLs.
6. Click **Apply**.

### 3. Build Configuration
- **Backend Build**: `./server/build.sh`
- **Backend Start**: `gunicorn server.wsgi:application --chdir server`
- **Frontend Build**: `npm run build`
- **Frontend Publish**: `dist`

---

## 📄 License
Licensed under the Apache License, Version 2.0.
