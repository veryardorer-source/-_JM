"""Google News RSS에서 카테고리별 기사를 수집합니다."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from urllib.parse import quote

import feedparser


CATEGORIES: dict[str, list[str]] = {
    "인테리어 트렌드": [
        f"https://news.google.com/rss/search?q={quote('인테리어 트렌드')}&hl=ko&gl=KR&ceid=KR:ko",
        f"https://news.google.com/rss/search?q={quote('인테리어 디자인')}&hl=ko&gl=KR&ceid=KR:ko",
        f"https://news.google.com/rss/search?q={quote('홈 인테리어')}&hl=ko&gl=KR&ceid=KR:ko",
    ],
    "마케팅 트렌드": [
        f"https://news.google.com/rss/search?q={quote('마케팅 트렌드')}&hl=ko&gl=KR&ceid=KR:ko",
        f"https://news.google.com/rss/search?q={quote('디지털 마케팅')}&hl=ko&gl=KR&ceid=KR:ko",
        f"https://news.google.com/rss/search?q={quote('브랜드 마케팅')}&hl=ko&gl=KR&ceid=KR:ko",
    ],
}


def _extract_source(entry) -> str:
    src = getattr(entry, "source", None)
    if src is None:
        return ""
    if hasattr(src, "get"):
        return src.get("title", "") or src.get("value", "") or ""
    if hasattr(src, "title"):
        return src.title
    return str(src)


def fetch_category(urls: list[str], hours: int = 48, max_articles: int = 25) -> list[dict]:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    articles: list[dict] = []
    seen_links: set[str] = set()

    for url in urls:
        feed = feedparser.parse(url)
        for entry in feed.entries:
            link = entry.get("link", "")
            if not link or link in seen_links:
                continue
            seen_links.add(link)

            pub_struct = entry.get("published_parsed") or entry.get("updated_parsed")
            pub_date = None
            if pub_struct:
                pub_date = datetime(*pub_struct[:6], tzinfo=timezone.utc)
                if pub_date < cutoff:
                    continue

            articles.append(
                {
                    "title": entry.get("title", "").strip(),
                    "link": link,
                    "summary": entry.get("summary", "").strip(),
                    "source": _extract_source(entry),
                    "published": pub_date.isoformat() if pub_date else "",
                }
            )

    articles.sort(key=lambda a: a["published"], reverse=True)
    return articles[:max_articles]


def fetch_all() -> dict[str, list[dict]]:
    return {cat: fetch_category(urls) for cat, urls in CATEGORIES.items()}
