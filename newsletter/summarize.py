"""Claude API로 기사 목록을 큐레이션하고 요약합니다."""
from __future__ import annotations

import json
from datetime import datetime

import anthropic


SYSTEM_PROMPT = """당신은 인테리어 및 마케팅 업계 종사자를 위한 트렌드 뉴스 큐레이터입니다.

역할:
- 주어진 기사 목록에서 업계 종사자에게 가장 유용하고 실질적인 정보를 담은 기사 3-5개를 선별합니다.
- 각 기사를 제목, 3줄 요약, 시사점(실무자에게 왜 중요한지)으로 정리합니다.
- 광고성, 단순 홍보, 중복, 실질적 정보가 부족한 기사는 제외합니다.
- 한국 시장과 업계 실무 관점에서 인사이트를 제공합니다.
- 기사 제목과 설명이 부족하면 제목에서 추론 가능한 범위 내에서만 요약하고 과장하지 않습니다.

출력 형식: 반드시 아래 JSON 스키마만 출력하세요. 다른 텍스트, 설명, 코드 펜스는 절대 포함하지 마세요.

{
  "items": [
    {
      "title": "기사 제목 (원문 그대로)",
      "summary": ["핵심 요약 1", "핵심 요약 2", "핵심 요약 3"],
      "insight": "실무자에게 주는 시사점 1-2줄",
      "link": "원문 URL",
      "source": "출처 매체명"
    }
  ]
}

기사 수가 부족하거나 적절한 기사가 없으면 items는 빈 배열로 반환하세요.
"""


def _build_user_message(category: str, articles: list[dict]) -> str:
    today = datetime.now().strftime("%Y-%m-%d")
    articles_text = "\n\n".join(
        f"[{i + 1}] {a['title']}\n"
        f"출처: {a.get('source') or '-'} | 발행: {a.get('published') or '-'}\n"
        f"링크: {a['link']}\n"
        f"설명: {(a.get('summary') or '-')[:600]}"
        for i, a in enumerate(articles)
    )
    return (
        f"카테고리: {category}\n"
        f"오늘 날짜: {today}\n\n"
        f"다음 기사 목록에서 실무자에게 가장 유용한 3-5개를 골라 JSON으로 정리해주세요.\n\n"
        f"{articles_text}"
    )


def _parse_json_output(text: str) -> dict:
    text = text.strip()
    # 혹시 코드 펜스가 섞였을 경우 제거
    if text.startswith("```"):
        lines = text.split("\n")
        lines = lines[1:]
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines)
    return json.loads(text)


def curate(category: str, articles: list[dict]) -> list[dict]:
    """카테고리별 기사 목록을 Claude로 큐레이션합니다."""
    if not articles:
        return []

    client = anthropic.Anthropic()
    user_msg = _build_user_message(category, articles)

    # 시스템 프롬프트는 매일 동일하므로 ephemeral 캐시를 적용합니다.
    # (일간 실행 간격에는 캐시 TTL을 넘어 캐시 히트는 없지만, 수동 재실행이나
    #  같은 날 여러 카테고리를 처리할 때는 효과가 있을 수 있음)
    with client.messages.stream(
        model="claude-opus-4-6",
        max_tokens=16000,
        thinking={"type": "adaptive"},
        system=[
            {
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": user_msg}],
    ) as stream:
        for _ in stream.text_stream:
            pass
        final_message = stream.get_final_message()

    text = "".join(b.text for b in final_message.content if b.type == "text")
    data = _parse_json_output(text)
    items = data.get("items", [])

    # 캐시 활용 여부 로그
    usage = final_message.usage
    print(
        f"    [API usage] input={usage.input_tokens} "
        f"cache_read={getattr(usage, 'cache_read_input_tokens', 0)} "
        f"cache_write={getattr(usage, 'cache_creation_input_tokens', 0)} "
        f"output={usage.output_tokens}"
    )

    return items
