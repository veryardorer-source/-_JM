"""SMTP로 HTML 뉴스레터를 발송합니다."""
from __future__ import annotations

import os
import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from html import escape


def _render_category(category: str, items: list[dict]) -> str:
    if not items:
        return (
            f'<h2 style="color:#1a1a1a;margin-top:32px;padding:10px 14px;background:#f5f5f5;'
            f'border-left:4px solid #333;">{escape(category)}</h2>'
            f'<p style="color:#999;">오늘은 선별된 기사가 없습니다.</p>'
        )

    html = (
        f'<h2 style="color:#1a1a1a;margin-top:32px;padding:10px 14px;background:#f5f5f5;'
        f'border-left:4px solid #333;">{escape(category)}</h2>'
    )
    for item in items:
        title = escape(item.get("title", ""))
        link = escape(item.get("link", "#"), quote=True)
        source = escape(item.get("source", ""))
        insight = escape(item.get("insight", ""))
        summary_html = "".join(
            f"<li>{escape(str(s))}</li>" for s in item.get("summary", [])
        )
        source_html = (
            f'<div style="color:#888;font-size:12px;margin-bottom:8px;">출처: {source}</div>'
            if source
            else ""
        )
        html += (
            '<article style="margin-bottom:20px;padding:16px;border:1px solid #eee;'
            'border-radius:8px;background:#fff;">'
            f'<h3 style="margin:0 0 6px 0;font-size:17px;">'
            f'<a href="{link}" style="color:#1a56db;text-decoration:none;">{title}</a>'
            f'</h3>'
            f'{source_html}'
            f'<ul style="margin:8px 0;padding-left:20px;color:#333;">{summary_html}</ul>'
            f'<p style="margin:10px 0 0 0;padding:10px;background:#fffbeb;'
            f'border-left:3px solid #f59e0b;border-radius:4px;font-size:14px;">'
            f'<strong>시사점:</strong> {insight}</p>'
            '</article>'
        )
    return html


def render_html(curated: dict[str, list[dict]]) -> str:
    today = datetime.now().strftime("%Y년 %m월 %d일 (%a)")
    body = "".join(_render_category(cat, items) for cat, items in curated.items())
    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>오늘의 트렌드 뉴스레터</title>
</head>
<body style="font-family:'Apple SD Gothic Neo','Malgun Gothic','맑은 고딕',sans-serif;
             max-width:720px;margin:0 auto;padding:24px;color:#222;line-height:1.6;
             background:#fafafa;">
  <div style="background:#fff;padding:24px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
    <h1 style="color:#1a1a1a;border-bottom:3px solid #333;padding-bottom:10px;margin:0;">
      오늘의 트렌드 뉴스레터
    </h1>
    <p style="color:#666;margin:8px 0 0 0;">{today}</p>
    <p style="color:#666;margin:4px 0 0 0;font-size:14px;">인테리어 · 마케팅 업계 실무자를 위한 큐레이션</p>
    {body}
    <footer style="margin-top:40px;padding-top:16px;border-top:1px solid #ddd;color:#999;font-size:12px;">
      <p>자동 생성된 뉴스레터입니다. 기사 선정과 요약은 Claude AI가 수행하며,
         원문 내용은 링크를 통해 확인하세요.</p>
    </footer>
  </div>
</body>
</html>"""


def send(subject: str, html: str) -> int:
    """환경변수 기반으로 SMTP 발송. 수신자 수를 반환합니다."""
    host = os.environ["SMTP_HOST"]
    port = int(os.environ.get("SMTP_PORT", "465"))
    user = os.environ["SMTP_USER"]
    password = os.environ["SMTP_PASSWORD"]
    sender = os.environ.get("NEWSLETTER_SENDER", user)
    recipients_raw = os.environ["NEWSLETTER_RECIPIENTS"]
    recipients = [r.strip() for r in recipients_raw.split(",") if r.strip()]

    if not recipients:
        raise RuntimeError("NEWSLETTER_RECIPIENTS 환경변수에 수신자가 없습니다.")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = ", ".join(recipients)
    msg.attach(MIMEText(html, "html", "utf-8"))

    # SMTP_PORT=465 → SSL, 587 → STARTTLS
    if port == 465:
        with smtplib.SMTP_SSL(host, port) as server:
            server.login(user, password)
            server.send_message(msg)
    else:
        with smtplib.SMTP(host, port) as server:
            server.starttls()
            server.login(user, password)
            server.send_message(msg)

    return len(recipients)
