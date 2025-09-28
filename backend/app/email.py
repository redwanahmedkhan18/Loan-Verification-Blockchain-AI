from typing import Optional
import smtplib, ssl
from email.message import EmailMessage
from .config import settings

def send_email(to_email: str, subject: str, html: str):
    """
    Dev-friendly: if EMAIL_ENABLED=false, just print the email to console.
    """
    if not settings.EMAIL_ENABLED:
        print("\n=== DEV EMAIL (disabled SMTP) ===")
        print(f"To: {to_email}\nSubject: {subject}\n\n{html}\n=== END ===\n")
        return

    msg = EmailMessage()
    msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content("HTML email. Please view in an HTML-capable client.")
    msg.add_alternative(html, subtype="html")

    ctx = ssl.create_default_context()
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as s:
        if settings.SMTP_TLS:
            s.starttls(context=ctx)
        if settings.SMTP_USER:
            s.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        s.send_message(msg)
