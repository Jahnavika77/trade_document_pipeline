import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    app_name: str = "Nova Trade Pipeline API"
    app_env: str = os.getenv("APP_ENV", "development")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    database_url: str = os.getenv("DATABASE_URL", "")
    customer_rules_path: str = os.getenv("CUSTOMER_RULES_PATH", "customer_rules.json")
    inbox_dir: str = os.getenv("INBOX_DIR", "backend/inbox")
    poll_interval_sec: int = int(os.getenv("POLL_INTERVAL_SEC", "8"))
    
    # Email Settings
    smtp_host: str = os.getenv("SMTP_HOST", "")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_user: str = os.getenv("SMTP_USER", "")
    smtp_password: str = os.getenv("SMTP_PASSWORD", "")
    receiver_email: str = os.getenv("RECEIVER_EMAIL", "")

settings = Settings()
