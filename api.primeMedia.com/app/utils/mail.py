import os
from email.message import EmailMessage
from dotenv import load_dotenv
import aiosmtplib

load_dotenv()  # Load .env

async def send_invite_email(to_email: str, slug: str):
    try:
        frontend_url = os.getenv("FRONTEND_URL")
        register_url = f"{frontend_url}/register/{slug}"

        msg = EmailMessage()
        msg["From"] = os.getenv("MAIL_FROM")
        msg["To"] = to_email
        msg["Subject"] = "You're invited to join Prime Media CMS"
        msg.set_content(f"""
    Hello,

    You've been invited to register as an editor.

    Click below to register:
    {register_url}

    This link can only be used to register once.

    — Prime Media CMS
    """)

        await aiosmtplib.send(
            msg,
            hostname="smtp.gmail.com",
            port=465,
            use_tls=True,
            username=os.getenv("GMAIL_USERNAME"),
            password=os.getenv("GMAIL_PASSWORD"),
        )
    except Exception as e:
        print("Failed to send email:", e)
        raise