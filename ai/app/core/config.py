"""공용 설정. 저장소 루트 .env 하나만 읽는다."""

import os

from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv())

# --- DB ---
POSTGRES_DB = os.getenv("POSTGRES_DB", "sobi")
POSTGRES_USER = os.getenv("POSTGRES_USER", "sobi")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")

DATABASE_URL = (
    f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}"
    f"@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
)

# --- GMS (OpenAI 호환) ---
GMS_API_KEY = os.getenv("GMS_API_KEY", "")
GMS_BASE_URL = os.getenv(
    "GMS_BASE_URL", "https://gms.ssafy.io/gmsapi/api.openai.com/v1"
)