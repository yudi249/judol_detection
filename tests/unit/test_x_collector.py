import json
from pathlib import Path

from judol_detection.collectors.x import XPlaywrightCollector, XSearchTimelineParser


FIXTURE = Path(__file__).parents[1] / "fixtures" / "x_search_timeline.json"


def test_parser_extracts_latest_search_post() -> None:
    documents = XSearchTimelineParser().parse_response(
        json.loads(FIXTURE.read_text(encoding="utf-8")), query="situs slot gacor"
    )

    assert len(documents) == 1
    assert documents[0].platform == "x"
    assert documents[0].source_item_id == "2077347454761177169"
    assert documents[0].text_raw == "Situs slot gacor bonus deposit"


def test_parser_accepts_manual_file_source_type() -> None:
    payload = json.loads(FIXTURE.read_text(encoding="utf-8"))

    documents = XSearchTimelineParser().parse_response(
        payload, query="query_x_1", source_type="x_search_timeline_manual_file"
    )

    assert documents[0].source_type == "x_search_timeline_manual_file"


def test_parser_ignores_cursor_and_malformed_entries() -> None:
    payload = {
        "data": {"search_by_raw_query": {"search_timeline": {"timeline": {"instructions": [
            {"entries": [
                {"entryId": "cursor-bottom-1", "content": {"cursorType": "Bottom", "value": "next"}},
                {"entryId": "tweet-missing", "content": {"itemContent": {"tweet_results": {"result": {"rest_id": "missing", "legacy": {}}}}}},
            ]}
        ]}}}}
    }

    assert XSearchTimelineParser().parse_response(payload, query="slot") == ()


def test_parser_deduplicates_post_ids_within_one_response() -> None:
    payload = json.loads(FIXTURE.read_text(encoding="utf-8"))
    entries = payload["data"]["search_by_raw_query"]["search_timeline"]["timeline"]["instructions"][0]["entries"]
    entries.append(entries[0])

    documents = XSearchTimelineParser().parse_response(payload, query="slot")

    assert [document.source_item_id for document in documents] == ["2077347454761177169"]


class FakeMouse:
    def __init__(self) -> None:
        self.scrolls = 0

    def wheel(self, _x: int, _y: int) -> None:
        self.scrolls += 1


class FakePage:
    def __init__(self, *, url: str = "https://x.com/search?q=slot&f=live", payloads=(), login_completes_after_waits: int | None = None, redirect_first_navigation_to_login: bool = False) -> None:
        self.url = url
        self.mouse = FakeMouse()
        self.handlers = {}
        self.payloads = list(payloads)
        self.login_completes_after_waits = login_completes_after_waits
        self.wait_calls = 0
        self.gotos = []
        self.redirect_first_navigation_to_login = redirect_first_navigation_to_login

    def on(self, name: str, handler) -> None:
        self.handlers[name] = handler

    def goto(self, url: str, **_kwargs) -> None:
        self.gotos.append(url)
        self.url = "https://x.com/i/flow/login" if self.redirect_first_navigation_to_login and len(self.gotos) == 1 else url

    def wait_for_timeout(self, _milliseconds: int) -> None:
        self.wait_calls += 1
        if self.login_completes_after_waits == self.wait_calls:
            self.url = "https://x.com/home"
        if self.payloads and "response" in self.handlers:
            self.handlers["response"](FakeResponse(self.payloads.pop(0)))
        return None


class FakeResponse:
    url = "https://x.com/i/api/graphql/example/SearchTimeline"

    def __init__(self, payload) -> None:
        self.payload = payload

    def json(self):
        return self.payload


def test_collector_stops_after_configured_no_progress_scrolls() -> None:
    page = FakePage()
    collector = XPlaywrightCollector(max_posts=20, max_scrolls=10, no_progress_limit=2)

    summary = collector.collect_page(page, query="slot")

    assert summary.stop_reason == "no_new_posts"
    assert summary.scrolls == 2
    assert page.mouse.scrolls == 2


def test_collector_reports_authentication_required_without_scrolling() -> None:
    page = FakePage(url="https://x.com/i/flow/login")

    summary = XPlaywrightCollector(max_posts=20, max_scrolls=10, no_progress_limit=2).collect_page(
        page, query="slot", wait_for_manual_login=False
    )

    assert summary.stop_reason == "authentication_required"
    assert summary.scrolls == 0


def test_collector_waits_for_manual_login_before_scrolling() -> None:
    page = FakePage(url="https://x.com/i/flow/login", login_completes_after_waits=1)
    collector = XPlaywrightCollector(max_posts=20, max_scrolls=10, no_progress_limit=2, login_timeout_seconds=2)

    summary = collector.collect_page(page, query="slot")

    assert summary.stop_reason == "no_new_posts"
    assert summary.scrolls == 2
    assert page.wait_calls >= 3


def test_collector_returns_to_latest_search_after_manual_login_redirect() -> None:
    search_url = "https://x.com/search?q=slot&f=live"
    page = FakePage(login_completes_after_waits=1, redirect_first_navigation_to_login=True)
    collector = XPlaywrightCollector(max_posts=20, max_scrolls=2, no_progress_limit=2, login_timeout_seconds=2)

    collector.collect_page(page, query="slot", search_url=search_url)

    assert page.gotos == [search_url, search_url]


def test_collector_attaches_raw_payload_path_from_callback() -> None:
    payload = json.loads(FIXTURE.read_text(encoding="utf-8"))
    page = FakePage(payloads=[payload])
    collector = XPlaywrightCollector(max_posts=1, max_scrolls=2, no_progress_limit=2)

    summary = collector.collect_page(page, query="slot", on_payload=lambda _payload: "data/raw/x/example.json")

    assert summary.documents[0].raw_payload_path == "data/raw/x/example.json"
