# Production Deployment Guide (Render.com)

This project is optimized for deployment on Render.com using Python 3.10 and a dedicated LITE mode for low-resource environments.

## 🚀 Deployment Architecture
- **Infrastructure**: Render Web Service (Free/Starter Tier)
- **Engine**: Gunicorn (Sync Workers)
- **Database**: MongoDB Atlas (Managed Cloud)
- **Static files**: WhiteNoise

---

## 🛠️ 1. Essential Environment Variables

Configure these in the **Render Dashboard > Environment**:

| Key | Value / Example | Purpose |
|-----|-----------------|---------|
| `PYTHON_VERSION` | `3.10.14` | **Critical**: Must be <= 3.11 for AI support. |
| `RENDER` | `true` | Enables auto-detection of cloud environment. |
| `AI_LITE_MODE` | `true` | **Crucial**: Skips DeepFace to fit in 512MB RAM. |
| `MONGODB_URI` | `mongodb+srv://...` | Connection string for your MongoDB Atlas. |
| `SECRET_KEY` | (Generate a random string) | Django security secret. |
| `MPLCONFIGDIR` | `/tmp/matplotlib` | Fixes font cache permission issues. |
| `ALLOWED_HOSTS` | `proctor-api.onrender.com` | Prevents Host header attacks. |

---

## 🏗️ 2. Build & Start Commands

These are pre-configured in `render.yaml`, but verify them in the dashboard:

### Backend (Web Service)
- **Build Command**: `./server/build.sh`
- **Start Command**: `gunicorn server.wsgi:application --chdir server --timeout 120 --workers 1`

> [!IMPORTANT]
> **Why 1 Worker?**: Render Free tier provides 512MB RAM. Since each Gunicorn worker loads the AI models into memory, multiple workers will cause an immediate `SIGKILL` (Out of Memory) error.

### Frontend (Static Site)
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `./dist`

---

## 📁 3. The Build Script (`build.sh`)
The custom `build.sh` handles deployment steps:
1. Navigates to the server subfolder.
2. Upgrades `pip`.
3. Installs dependencies using `--no-cache-dir` (Essential to save disk space).
4. Runs `collectstatic`.

---

## ⚠️ 4. Production AI Limitations
- **Biometrics**: In `LITE_MODE` (active on Render), real-time face matching (DeepFace) is disabled to prevent memory crashes. Gaze tracking (MediaPipe) and Object detection (YOLO) remain active.
- **Warmup Time**: High-intensity AI initialization can take up to 90 seconds on first request. This is why the Gunicorn `--timeout` is set to 120s.

## 🛠️ Troubleshooting
- **SIGKILL / Out of Memory**: Ensure `AI_LITE_MODE=true` and `workers=1`.
- **Worker Timeout**: If the site shows "502 Bad Gateway" on first load, wait for Gunicorn to finish loading YOLO (check logs). Consider upgrading to a "Starter" instance for faster boot.
- **KeyError: 'boxes'**: Ensure you are using the updated `detection_pipeline.py` which handles model failures gracefully.

---

> [!NOTE]
> For scaling to thousands of concurrent users, it is recommended to move AI inference to a dedicated GPU-enabled microservice or use AWS/GCP with larger memory profiles.
