import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

def send_trade_email(subject: str, body: str):
    """
    Sends an email using SMTP settings from the environment.
    """
    # If settings are missing, we log to terminal instead
    if not all([settings.smtp_host, settings.smtp_user, settings.smtp_password]):
        print("\n📧 [MOCK EMAIL] No SMTP settings found. Logging to terminal:")
        print(f"Subject: {subject}")
        print(f"Body:\n{body}\n")
        return True

    try:
        print(f"📡 [EMAIL] Attempting to connect to {settings.smtp_host}:{settings.smtp_port}...")
        msg = MIMEMultipart()
        msg['From'] = settings.smtp_user
        msg['To'] = settings.receiver_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10)
        server.set_debuglevel(1)  # This will print the full conversation with Gmail in your logs
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(msg)
        server.quit()
        
        print(f"✅ [EMAIL] Successfully sent to {settings.receiver_email}")
        return True
    except Exception as e:
        print(f"❌ [EMAIL] SMTP Error: {str(e)}")
        raise e
