# Local Development Setup Guide

Follow these steps to set up the AI Proctoring System on your local machine for development and testing.

## 📋 Prerequisites
- **Node.js**: v18.x or v20.x (Recommended)
- **Python**: v3.10.x or v3.11.x (Stable for AI libraries)
- **MongoDB**: Local Community Edition or MongoDB Atlas (Free Tier)
- **Git**: Installed and configured

---

## 🔧 1. Backend Setup (Django)

1. **Navigate to server directory**:
   ```bash
   cd server
   ```

2. **Create a Virtual Environment**:
   ```bash
   python -m venv venv
   # Activate it:
   # Windows:
   .\venv\Scripts\activate
   # Linux/Mac:
   source venv/bin/activate
   ```

3. **Install Dependencies**:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. **Environment Configuration**:
   Create a `.env` file in the `server/` root:
   ```env
   DEBUG=True
   SECRET_KEY=your-local-secret-key
   MONGODB_URI=mongodb://localhost:27017/proctor_db
   # Optional for cloud-specific behavior testing
   RENDER=false
   AI_LITE_MODE=false
   ```

5. **AI Model Weights**:
   The system uses YOLOv8 Nano. If not present, the system will attempt to download it on first start, but you can manually place `yolov8n.pt` in the `server/` directory.

6. **Run Initial Database Logic**:
   ```bash
   python manage.py migrate
   # (Optional) Seed initial exam data
   python seed.py
   ```

7. **Start the Development Server**:
   ```bash
   python manage.py runserver 8000
   ```

---

## 🎨 2. Frontend Setup (React/Vite)

1. **Navigate to the project root**:
   ```bash
   cd ..
   ```

2. **Install Packages**:
   ```bash
   npm install
   ```

3. **Environment Configuration**:
   The frontend uses a `.env` file for API redirection:
   ```env
   VITE_API_BASE_URL=http://localhost:8000/api
   ```

4. **Start the Frontend**:
   ```bash
   npm run dev
   ```

---

## 🚦 3. Troubleshooting Local AI
- **Webcam Access**: Ensure your browser allows camera/mic access for `localhost:5173`.
- **Latency**: If the UI flickers, check that `AI_LITE_MODE=false` is set in `.env` to ensure high-performance mode.
- **Port Conflict**: If 8000 is busy, run Django on another port: `python manage.py runserver 8001` and update `VITE_API_BASE_URL`.

---

> [!TIP]
> **Performance Optimization**: For the best local experience, use a machine with at least 8GB RAM. The AI models (YOLO + DeepFace) consume roughly 1.5GB combined during active inference.
