import numpy as np
import base64
import cv2
import asyncio
import logging
import os

logger = logging.getLogger(__name__)

# DeepFace is heavy; we handle it with a lazy check in the pipeline logic
HAS_DEEPFACE_PKGS = False
try:
    import deepface
    HAS_DEEPFACE_PKGS = True
except ImportError:
    pass

try:
    from .ai_engine import Models
except ImportError:
    from proctoring.ai.ai_engine import Models


class PipelineOrchestrator:
    def __init__(self):
        self.models = Models()
        self.last_id_match = True
        self.last_id_time = 0
        self.id_check_freq = 5.0 # Every 5 seconds


    def process_frame(self, b64_frame: str, check_objects: bool = True, check_identity: bool = False, check_gaze: bool = False, audio_level: int = 0, reference_id_b64: str = None, audio_evidence: str = None):
        try:
            # 1. Decode base64 to numpy array
            if ',' in b64_frame:
                b64_frame = b64_frame.split(',')[1]
            try:
                img_data = base64.b64decode(b64_frame)
                nparr = np.frombuffer(img_data, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                if img is None: raise ValueError("Decoded image is None")
            except Exception as e:
                logger.error(f"Frame Decode Error: {e}")
                return {"error": "Invalid frame data", "face_count": 0}

            result = {
                "face_count": 0,
                "gaze": "center",
                "objects": [],
                "identity_match": True,
                "audio_level": audio_level,
                "audio_evidence": audio_evidence,
                "boxes": [] 
            }

            img_h, img_w = img.shape[:2]

            # 2. FAST PRIORITY: OpenCV Face Cascade (Determines presence immediately)
            cascade_face_count = 0
            # --- 1. Face Detection Phase ---
            candidate_face_boxes = []
            mp_found = False
            
            # A. MediaPipe (Most Accurate for Face-only)
            if self.models.mp_face_mesh:
                try:
                    rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                    mesh_results = self.models.mp_face_mesh.process(rgb_img)
                    if mesh_results.multi_face_landmarks:
                        mp_found = True
                        for face_lms in mesh_results.multi_face_landmarks:
                            lms = face_lms.landmark
                            xs = [lm.x * img_w for lm in lms]
                            ys = [lm.y * img_h for lm in lms]
                            x, y = min(xs), min(ys)
                            candidate_face_boxes.append({
                                "x": float(x), "y": float(y), "w": float(max(xs)-x), "h": float(max(ys)-y), 
                                "label": "CANDIDATE", "conf": 0.99
                            })
                        result["gaze"] = self._calculate_gaze(mesh_results.multi_face_landmarks[0])
                except Exception as e:
                    logger.warning(f"MediaPipe error: {e}")

            # B. Fallback to OpenCV if MediaPipe missed
            if not mp_found and self.models.face_cascade:
                try:
                    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                    faces = self.models.face_cascade.detectMultiScale(gray, 1.2, 6, minSize=(60,60))
                    for (x, y, w, h) in faces:
                        candidate_face_boxes.append({
                            "x": float(x), "y": float(y), "w": float(w), "h": float(h), 
                            "label": "CANDIDATE", "conf": 0.8
                        })
                except: pass

            # --- 2. Object & Person Detection Phase ---
            final_object_boxes = []
            yolo_person_count = 0
            if check_objects and self.models.yolo:
                res = self.models.yolo.predict(img, verbose=False, classes=[0, 24, 26, 63, 67, 73], conf=0.3)
                for box in res[0].boxes:
                    cls_id = int(box.cls[0])
                    conf = float(box.conf[0])
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    bw, bh = x2 - x1, y2 - y1
                    
                    if cls_id == 0: # Person
                        yolo_person_count += 1
                        # Only use person box if no specific face box was found
                        if not mp_found and len(candidate_face_boxes) == 0:
                            # Person box is torso+head. Heuristic: take top 40% as 'Face'
                            candidate_face_boxes.append({
                                "x": float(x1), "y": float(y1), "w": float(bw), "h": float(bh * 0.45), 
                                "label": "CANDIDATE", "conf": conf
                            })
                    else:
                        label = "LAPTOP" if cls_id in [63, 26] else ("PHONE" if cls_id == 67 else "BOOK")
                        final_object_boxes.append({
                            "x": float(x1), "y": float(y1), "w": float(bw), "h": float(bh), 
                            "label": label, "conf": round(conf, 2)
                        })

            # --- 3. Merging & Cleanup ---
            result["face_count"] = max(len(candidate_face_boxes), yolo_person_count)
            
            # Simple NMS to prevent double boxes on same face
            if len(candidate_face_boxes) > 1:
                candidate_face_boxes.sort(key=lambda b: b['conf'], reverse=True)
                filtered = []
                for b in candidate_face_boxes:
                    if not any(self._is_overlap(b, f) for f in filtered):
                        filtered.append(b)
                candidate_face_boxes = filtered

            result["boxes"] = candidate_face_boxes + final_object_boxes
            # 5. Identity Verification (Stateful & Throttled)
            import time
            curr_time = time.time()
            
            # Default to last known state to prevent HUD jitter
            result["identity"] = {"match": self.last_id_match, "confidence": 1.0}

            # Only run heavy DeepFace if 5s passed OR if we previously failed
            should_check = (curr_time - self.last_id_time > self.id_check_freq) or (not self.last_id_match)
            
            if self.models.deepface_ready and check_identity and reference_id_b64 and result["face_count"] == 1 and should_check:
                try:
                    from deepface import DeepFace
                    if ',' in reference_id_b64: reference_id_b64 = reference_id_b64.split(',')[1]
                    ref_data = base64.b64decode(reference_id_b64)
                    ref_arr = np.frombuffer(ref_data, np.uint8)
                    ref_img = cv2.imdecode(ref_arr, cv2.IMREAD_COLOR)

                    if ref_img is not None:
                        verify_res = DeepFace.verify(
                            img, ref_img, 
                            model_name='VGG-Face', 
                            detector_backend='opencv', 
                            enforce_detection=False,
                            silent=True
                        )
                        self.last_id_match = bool(verify_res.get("verified", False))
                        self.last_id_time = curr_time
                        result["identity"] = {
                            "match": self.last_id_match,
                            "confidence": 1.0 - float(verify_res.get("distance", 0.5)),
                        }
                except Exception as e:
                    logger.warning(f"Identity check skipped: {e}")

            # 6. Integration: Flag identity mismatch on the HUD
            if result.get("identity") and not result["identity"].get("match", True):
                for box in result["boxes"]:
                    if box["label"] == "CANDIDATE":
                        box["label"] = "face_mismatch"

            return result
        except Exception as e:
            logger.error(f"Pipeline Critical Failure: {e}")
            return {"face_count": 0, "gaze": "center", "error": str(e)}

    def _calculate_gaze(self, face_landmarks):
        nose_x = face_landmarks.landmark[1].x
        left_x = face_landmarks.landmark[234].x
        right_x = face_landmarks.landmark[454].x
        left_dist = abs(nose_x - left_x)
        right_dist = abs(right_x - nose_x)
        if left_dist == 0 or right_dist == 0: return "center"
        ratio = left_dist / right_dist
        if ratio < 0.55: return "right"
        if ratio > 1.8: return "left"
        return "center"
