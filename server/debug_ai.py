import os
import sys
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger("AI-Debugger")

def test_dependencies():
    logger.info("--- Testing Dependencies ---")
    deps = [
        ('cv2', 'opencv-python'),
        ('mediapipe', 'mediapipe'),
        ('ultralytics', 'ultralytics'),
        ('deepface', 'deepface'),
        ('tensorflow', 'tensorflow'),
        ('numpy', 'numpy'),
        ('mongoengine', 'mongoengine')
    ]
    
    missing = []
    for mod, pkg in deps:
        try:
            __import__(mod)
            logger.info(f"OK: {pkg} is installed.")
        except ImportError:
            logger.error(f"FAIL: {pkg} is MISSING.")
            missing.append(pkg)
    return missing

def test_models():
    logger.info("\n--- Testing Model Loading ---")
    # Set Django Settings for standalone script
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')
    try:
        import django
        django.setup()
        from django.conf import settings
        from proctoring.ai.ai_engine import Models
        
        models = Models()
        report = models.is_ready()
        logger.info(f"Model Health Report: {report}")
        
        if not report['yolo']:
            logger.error("YOLO model failed to load.")
        if not report['mediapipe']:
            logger.warning("MediaPipe failed to load (Head pose/Gaze will be disabled).")
            
    except Exception as e:
        logger.error(f"Critical error during model loading: {e}")

if __name__ == "__main__":
    logger.info("Starting AI Engine Production Debugger...")
    
    missing = test_dependencies()
    if missing:
        logger.error(f"\nCRITICAL: {len(missing)} dependencies missing. Please run: pip install -r requirements.txt")
    
    test_models()
    
    logger.info("\nDebugger finished.")
