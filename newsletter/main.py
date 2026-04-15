"""일일 트렌드 뉴스레터 오케스트레이터.

흐름:
  1) Google News RSS에서 카테고리별 기사 수집 (최근 48시간)
  2) Claude API로 카테고리별 3-5개 기사 선별 및 요약
  3) HTML 렌더링 후 SMTP로 발송
"""
from __future__ import annotations

import sys
import traceback
from datetime import datetime

from fetch_news import fetch_all
from send_email import render_html, send
from summarize import curate


def main() -> int:
    started = datetime.now()
    print(f"[{started.isoformat()}] 뉴스레터 파이프라인 시작")

    # 1. 수집
    print("  [1/3] 뉴스 수집")
    try:
        articles_by_cat = fetch_all()
    except Exception as exc:
        print(f"  수집 실패: {exc}", file=sys.stderr)
        traceback.print_exc()
        return 1

    for cat, arts in articles_by_cat.items():
        print(f"    - {cat}: {len(arts)}건")

    if not any(articles_by_cat.values()):
        print("  수집된 기사가 없어 종료합니다.", file=sys.stderr)
        return 1

    # 2. 큐레이션
    print("  [2/3] Claude 큐레이션")
    curated: dict[str, list[dict]] = {}
    for cat, articles in articles_by_cat.items():
        try:
            items = curate(cat, articles)
            curated[cat] = items
            print(f"    - {cat}: {len(items)}건 선별")
        except Exception as exc:
            print(f"    - {cat}: 큐레이션 실패 - {exc}", file=sys.stderr)
            traceback.print_exc()
            curated[cat] = []

    if not any(curated.values()):
        print("  선별된 기사가 하나도 없어 발송을 건너뜁니다.", file=sys.stderr)
        return 1

    # 3. 발송
    print("  [3/3] 이메일 발송")
    html = render_html(curated)
    subject = (
        f"[트렌드 뉴스레터] {datetime.now().strftime('%Y-%m-%d')} "
        f"인테리어 & 마케팅 핵심 소식"
    )
    try:
        recipients = send(subject, html)
    except Exception as exc:
        print(f"  발송 실패: {exc}", file=sys.stderr)
        traceback.print_exc()
        return 2

    elapsed = (datetime.now() - started).total_seconds()
    print(f"  완료: {recipients}명 수신, 소요시간 {elapsed:.1f}초")
    return 0


if __name__ == "__main__":
    sys.exit(main())
