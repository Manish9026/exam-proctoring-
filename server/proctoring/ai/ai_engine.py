import logging
import cv2
try:
    import mediapipe as mp
    import mediapipe.solutions.face_mesh as mp_face_mesh
    HAS_MP_SOLUTIONS = True
except (ImportError, AttributeError):
    HAS_MP_SOLUTIONS = False
    logging.error("MediaPipe solutions directly unavailable. Attempting fallback.")

logger = logging.getLogger(__name__)

from ultralytics import YOLO

class Models:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            logger.info("Instantiating Model Singletons (YOLOv8 + MediaPipe)...")
            cls._instance = super(Models, cls).__new__(cls)
            
            # Load YOLO Nano for ultra-fast performance
            cls._instance.yolo = YOLO('yolov8n.pt') 
            
            # Load MediaPipe FaceMesh safely
            if HAS_MP_SOLUTIONS:
                try:
                    cls._instance.mp_face_mesh = mp_face_mesh.FaceMesh(
                        max_num_faces=1,
                        refine_landmarks=True,
                        min_detection_confidence=0.5,
                        min_tracking_confidence=0.5
                    )
                except Exception:
                    cls._instance.mp_face_mesh = None
            else:
                cls._instance.mp_face_mesh = None
            
            # Load OpenCV Fallback Face Detector (Haar Cascade)
            cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            cls._instance.face_cascade = cv2.CascadeClassifier(cascade_path)
            
        return cls._instance
