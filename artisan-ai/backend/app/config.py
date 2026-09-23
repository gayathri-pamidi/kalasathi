import os

class Config:
    DATABASE_URL = os.getenv("DATABASE_URL", "")
    STORAGE_PATH = os.getenv("STORAGE_PATH", "./storage")
    AI_ENV = os.getenv("AI_ENV", "development")
    MAX_IMAGE_DIMENSION = int(os.getenv("MAX_IMAGE_DIMENSION", "1920"))
    BACKGROUND_REMOVAL_MODEL = os.getenv("BACKGROUND_REMOVAL_MODEL", "u2netp")
    ENHANCEMENT_MODEL_SCALE = int(os.getenv("ENHANCEMENT_MODEL_SCALE", "2"))
    ENHANCEMENT_MAX_INPUT_DIMENSION = int(os.getenv("ENHANCEMENT_MAX_INPUT_DIMENSION", "1024"))

config = Config()
