import numpy as np
import base64
import cv2
import asyncio
import tempfile
import os
from deepface import DeepFace

try:
    from .ai_engine import Models
except ImportError:
    from proctoring.ai.ai_engine import Models


class PipelineOrchestrator:
    def __init__(self):
        self.models = Models()

    async def process_frame(self, b64_frame: str, check_objects: bool = True, check_identity: bool = False, audio_level: int = 0, reference_id_b64: str = None, audio_evidence: str = None):
        try:
            # 1. Decode base64 to numpy array (handles 'data:image/jpeg;base64,...')
            if ',' in b64_frame:
                b64_frame = b64_frame.split(',')[1]
            img_data = base64.b64decode(b64_frame)
            nparr = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            result = {
                "face_count": 0,
                "gaze": "center",
                "objects": [],
                "identity_match": True,
                "audio_level": audio_level,
                "audio_evidence": audio_evidence,
                "boxes": [] # [ {x, y, w, h, label} ]
            }

            # 2. Fast Object & Face Count Detection (YOLOv8)
            img_h, img_w = img.shape[:2]
            yolo_face_count = 0
            if check_objects:
                # YOLOv8n classes: 0:person, 24:backpack, 26:handbag, 63:laptop, 67:cell phone, 73:book
                res = self.models.yolo.predict(img, verbose=False, classes=[0, 24, 26, 63, 67, 73], conf=0.2) 
                
                for box in res[0].boxes:
                    cls_id = int(box.cls[0])
                    conf = float(box.conf[0])
                    
                    # Mapping
                    label = "CANDIDATE"
                    if cls_id == 0: 
                        yolo_face_count += 1
                    elif cls_id == 67: 
                        label = "PHONE"
                        if "cell phone" not in result["objects"]: result["objects"].append("cell phone")
                    elif cls_id == 63: 
                        label = "TABLET/LAPTOP"
                        if "tablet" not in result["objects"]: result["objects"].append("tablet")
                    elif cls_id == 73: 
                        label = "BOOK"
                        if "book" not in result["objects"]: result["objects"].append("book")
                    elif cls_id in [24, 26]:
                        label = "BAGGAGE"
                        if "bag" not in result["objects"]: result["objects"].append("bag")
                    else:
                        label = "OBJECT"
                        
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    result["boxes"].append({
                        "x": float(x1), "y": float(y1), "w": float(x2 - x1), "h": float(y2 - y1), 
                        "label": label, "conf": round(conf, 2)
                    })

            # 3. Head Pose & Gaze (MediaPipe) - REDUNDANT CHECK FOR FACE
            mp_face_count = 0
            if self.models.mp_face_mesh:
                mesh_results = self.models.mp_face_mesh.process(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
                if mesh_results.multi_face_landmarks:
                    mp_face_count = len(mesh_results.multi_face_landmarks)
                    # If YOLO missed it, add a FACE box from landmarks
                    if yolo_face_count == 0:
                        for face_lms in mesh_results.multi_face_landmarks:
                            lms = face_lms.landmark
                            xs = [lm.x * img_w for lm in lms]
                            ys = [lm.y * img_h for lm in lms]
                            x, y = min(xs), min(ys)
                            w, h = max(xs) - x, max(ys) - y
                            result["boxes"].append({"x": x, "y": y, "w": w, "h": h, "label": "FACE (MP)"})

                    result["gaze"] = self._calculate_gaze(mesh_results.multi_face_landmarks[0])
            
            # 4. OpenCV Haar Cascade Fallback
            cascade_face_count = 0
            if yolo_face_count == 0 and mp_face_count == 0:
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                faces = self.models.face_cascade.detectMultiScale(gray, 1.1, 4)
                cascade_face_count = len(faces)
                for (x, y, w, h) in faces:
                    result["boxes"].append({"x": float(x), "y": float(y), "w": float(w), "h": float(h), "label": "FACE (CV2)"})

            # Use the max of all engines for face count
            result["face_count"] = max(yolo_face_count, mp_face_count, cascade_face_count)

            # 4. Identity Match (Biometric Verification)
            result["identity"] = {"match": True, "confidence": 1.0}
            
            # Only run identity verification if exactly 1 face is detected
            if check_identity and reference_id_b64 and result["face_count"] == 1:
                try:
                    # Decode reference image
                    ref_b64_clean = reference_id_b64
                    if ',' in ref_b64_clean:
                        ref_b64_clean = ref_b64_clean.split(',')[1]
                    
                    ref_data = base64.b64decode(ref_b64_clean)
                    ref_arr = np.frombuffer(ref_data, np.uint8)
                    ref_img = cv2.imdecode(ref_arr, cv2.IMREAD_COLOR)

                    if ref_img is not None:
                        # Perform verification using DeepFace
                        # VGG-Face + Cosine distance is the standard pair
                        verify_res = DeepFace.verify(
                            img, 
                            ref_img, 
                            detector_backend='opencv', 
                            enforce_detection=False, 
                            model_name='VGG-Face',
                            distance_metric='cosine'
                        )
                        
                        is_match = bool(verify_res.get("verified", False))
                        distance = float(verify_res.get("distance", 1.0))
                        
                        # With cosine, lower distance means higher similarity
                        result["identity"] = {
                            "match": is_match,
                            "confidence": max(0, 1.0 - distance),
                            "distance": distance
                        }
                except Exception as e:
                    print(f"Identity Verification Error: {str(e)}")
                    # On failure, we don't necessarily want to penalize unless we are sure it's a mismatch
                    # But for now we log it.

            return result
        except Exception as e:
            return {"face_count": 0, "gaze": "error", "objects": [], "error": str(e)}

    def _calculate_gaze(self, face_landmarks):
        """ Calculate simple head pitch/yaw using MediaPipe mesh coords """
        # Simplified gaze tracking logic: 
        # Nose tip = 1
        # Left cheek = 234
        # Right cheek = 454
        nose_x = face_landmarks.landmark[1].x
        left_x = face_landmarks.landmark[234].x
        right_x = face_landmarks.landmark[454].x
        
        # Distance ratio
        left_dist = abs(nose_x - left_x)
        right_dist = abs(right_x - nose_x)
        
        if left_dist == 0 or right_dist == 0: return "center"
        ratio = left_dist / right_dist
        
        if ratio < 0.5: return "right"
        if ratio > 2.0: return "left"
        return "center"
