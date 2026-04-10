import logging
import cv2
import os
import numpy as np
from django.conf import settings

# Attempt to load MediaPipe safely (Deferred to first use)
HAS_MP_SOLUTIONS = False

logger = logging.getLogger(__name__)

# Don't import heavy ML libs at top level. 
# This prevents Windows deadlocks during module import phase.

import threading

class Models:
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                # Double-check pattern
                if cls._instance is None:
                    print("[DEBUG] AI Loading: Starting single-threaded initialization...")
                    instance = super(Models, cls).__new__(cls)
                    
                    # Pre-initialize attributes to avoid AttributeErrors
                    instance.yolo = None
                    instance.mp_face_mesh = None
                    instance.face_cascade = None
                    
                    # 1. Load YOLO Nano (Ultra-fast detection)
                    try:
                        from ultralytics import YOLO
                        yolo_path = os.path.join(settings.BASE_DIR, 'yolov8n.pt')
                        if os.path.exists(yolo_path):
                            print("[DEBUG] AI Loading: Initiating local YOLO load on CPU...")
                            instance.yolo = YOLO(yolo_path)
                            if hasattr(instance.yolo, 'to'):
                                instance.yolo.to('cpu')
                            print("[DEBUG] AI Loading: YOLO Model loaded successfully on CPU.")
                        else:
                            logger.warning(f"YOLO model not found at {yolo_path}. Attempting download.")
                            instance.yolo = YOLO('yolov8n.pt') 
                            instance.yolo.to('cpu')
                    except Exception as e:
                        logger.error(f"YOLO Initialization failed: {e}")
                    
                    # 2. MediaPipe FaceMesh (Gaze Tracking)
                    try:
                        print("[DEBUG] AI Loading: Initiating MediaPipe FaceMesh...")
                        import mediapipe.solutions.face_mesh as mp_face_mesh
                        instance.mp_face_mesh = mp_face_mesh.FaceMesh(
                            max_num_faces=1,
                            refine_landmarks=True,
                            min_detection_confidence=0.5,
                            min_tracking_confidence=0.5
                        )
                    except (ImportError, ModuleNotFoundError, Exception) as e:
                        logger.error(f"MediaPipe load/runtime error: {e}")
                        print(f"MediaPipe load/runtime error: {e}")
                        # Try one more deep fallback
                        try:
                            from mediapipe.python.solutions import face_mesh as mp_face_mesh_fallback
                            instance.mp_face_mesh = mp_face_mesh_fallback.FaceMesh(
                                max_num_faces=1,
                                refine_landmarks=True,
                                min_detection_confidence=0.5,
                                min_tracking_confidence=0.5
                            )
                        except:
                            instance.mp_face_mesh = None
                    
                    # 3. Load OpenCV Fallback Face Detector (Haar Cascade)
                    try:
                        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
                        instance.face_cascade = cv2.CascadeClassifier(cascade_path)
                        print("[DEBUG] AI Loading: OpenCV Fallback detector ready.")
                    except Exception as e:
                        logger.error(f"OpenCV Cascade load failed: {e}")
                    
                    # 4. Load DeepFace (Biometric Verification)
                    instance.deepface_ready = False
                    try:
                        print("[DEBUG] AI Loading: Initiating DeepFace (VGG-Face)...")
                        from deepface import DeepFace
                        # Trigger a dummy call to ensure model is in memory
                        # We use a tiny blank image to "warm" the model
                        blank_img = np.zeros((224, 224, 3), dtype=np.uint8)
                        DeepFace.represent(blank_img, model_name='VGG-Face', enforce_detection=False, detector_backend='skip')
                        instance.deepface_ready = True
                        print("[DEBUG] AI Loading: DeepFace Biometrics ready.")
                    except Exception as e:
                        logger.error(f"DeepFace Initialization failed: {e}")
                    
                    cls._instance = instance
                    
        return cls._instance

    def is_ready(self):
        """Diagnostic check for server health checks."""
        return {
            "yolo": self.yolo is not None,
            "mediapipe": self.mp_face_mesh is not None,
            "opencv": self.face_cascade is not None,
            "health": "healthy" if self.yolo else "degraded"
        }
