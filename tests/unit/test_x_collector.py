import json
import threading
from pathlib import Path

from judol_detection.collectors.x import XCamoufoxCollector, XSearchTimelineParser


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


def test_parser_prefers_long_note_text() -> None:
    payload = {
        "data": {"search_by_raw_query": {"search_timeline": {"timeline": {"instructions": [{
            "entries": [{
                "entryId": "tweet-123",
                "content": {"itemContent": {"tweet_results": {"result": {
                    "legacy": {"id_str": "123", "full_text": "short legacy text"},
                    "note_tweet": {"note_tweet_results": {"result": {"text": "long note text"}}},
                }}}},
            }]
        }]}}}}}

    documents = XSearchTimelineParser().parse_response(payload, query="slot")

    assert documents[0].source_item_id == "123"
    assert documents[0].text_raw == "long note text"


def test_parser_unwraps_nested_tweet_result() -> None:
    payload = {
        "data": {"search_by_raw_query": {"search_timeline": {"timeline": {"instructions": [{
            "entries": [{
                "entryId": "tweet-456",
                "content": {"itemContent": {"tweet_results": {"result": {
                    "tweet": {"legacy": {"id_str": "456", "full_text": "nested tweet text"}},
                }}}},
            }]
        }]}}}}}

    documents = XSearchTimelineParser().parse_response(payload, query="slot")

    assert documents[0].source_item_id == "456"
    assert documents[0].text_raw == "nested tweet text"


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


class ManualFakePage:
    def __init__(self, *, url: str = "https://x.com/search?q=slot&f=live", responses=(), stop_event=None, content_text: str = "", latest_link=None, role_link=None, search_input=None) -> None:
        self.url = url
        self.handlers = {}
        self.responses = list(responses)
        self.stop_event = stop_event
        self.content_text = content_text
        self.latest_link = latest_link
        self.role_link = role_link
        self.search_input = search_input
        self.wait_calls = 0
        self.gotos = []

    def on(self, name: str, handler) -> None:
        self.handlers[name] = handler

    def goto(self, url: str, **_kwargs) -> None:
        self.gotos.append(url)
        self.url = url

    def wait_for_timeout(self, _milliseconds: int) -> None:
        self.wait_calls += 1
        if self.responses and "response" in self.handlers:
            for response in self.responses:
                self.handlers["response"](response)
            self.responses.clear()
        if self.stop_event is not None:
            self.stop_event.set()
        return None

    def content(self) -> str:
        return self.content_text

    def locator(self, _selector: str):
        return self.latest_link

    def get_by_role(self, role: str, name: str, exact: bool = False):
        if role == "link" and name == "Terbaru" and exact:
            return self.role_link
        return None

    def get_by_placeholder(self, _placeholder: str):
        return self.search_input

    def get_by_test_id(self, _test_id: str):
        return None


class FakeLatestLink:
    def __init__(self) -> None:
        self.clicked = False
        self.waited = False

    @property
    def first(self):
        return self

    def count(self) -> int:
        return 1

    def wait_for(self, **_kwargs) -> None:
        self.waited = True

    def click(self, **_kwargs) -> None:
        self.clicked = True


class FakeSearchInput:
    def __init__(self) -> None:
        self.filled = None
        self.pressed = None
        self.waited = False

    @property
    def first(self):
        return self

    def count(self) -> int:
        return 1

    def wait_for(self, **_kwargs) -> None:
        self.waited = True

    def fill(self, value: str) -> None:
        self.filled = value

    def press(self, value: str) -> None:
        self.pressed = value


def test_collector_searches_from_home_through_x_ui() -> None:
    search_input = FakeSearchInput()
    page = ManualFakePage(search_input=search_input)

    XCamoufoxCollector._open_search_ui(page, "situs slot gacor")

    assert page.gotos == ["https://x.com/home"]
    assert search_input.filled == "situs slot gacor"
    assert search_input.pressed == "Enter"
    assert search_input.waited is True


class FakeResponse:
    def __init__(self, url: str, status: int, payload=None, error: Exception | None = None) -> None:
        self.url = url
        self.status = status
        self.payload = payload
        self.error = error

    def json(self):
        if self.error is not None:
            raise self.error
        return self.payload


def test_manual_collector_emits_only_successful_search_timeline_documents() -> None:
    payload = json.loads(FIXTURE.read_text(encoding="utf-8"))
    stop_event = threading.Event()
    page = ManualFakePage(
        responses=[
            FakeResponse("https://x.com/i/api/graphql/example/Other", 200, payload),
            FakeResponse("https://x.com/i/api/graphql/example/SearchTimeline", 204, payload),
            FakeResponse("https://x.com/i/api/graphql/example/SearchTimeline", 200, payload),
        ],
        stop_event=stop_event,
    )
    emitted = []
    collector = XCamoufoxCollector(poll_interval_ms=1)

    summary = collector.collect_page(
        page, query="slot", on_document=emitted.append, stop_event=stop_event
    )

    assert [item.source_item_id for item in emitted] == ["2077347454761177169"]
    assert summary.responses_seen == 1
    assert summary.posts_observed == 1
    assert summary.search_errors == 1
    assert summary.last_search_error_status == 204
    assert summary.stop_reason == "manual_stop"


def test_manual_collector_selects_latest_tab_after_navigation() -> None:
    stop_event = threading.Event()
    latest_link = FakeLatestLink()
    page = ManualFakePage(stop_event=stop_event, latest_link=latest_link)

    XCamoufoxCollector(poll_interval_ms=1).collect_page(
        page,
        query="slot",
        on_document=lambda _document: None,
        stop_event=stop_event,
        search_url="https://x.com/search?q=slot&src=typed_query&f=live",
    )

    assert latest_link.clicked is True
    assert latest_link.waited is True


def test_manual_collector_falls_back_to_latest_link_role() -> None:
    stop_event = threading.Event()
    latest_link = FakeLatestLink()
    page = ManualFakePage(stop_event=stop_event, role_link=latest_link)

    XCamoufoxCollector(poll_interval_ms=1).collect_page(
        page,
        query="slot",
        on_document=lambda _document: None,
        stop_event=stop_event,
        search_url="https://x.com/search?q=slot&src=typed_query&f=live",
    )

    assert latest_link.clicked is True


def test_manual_collector_stops_on_authentication_redirect() -> None:
    stop_event = threading.Event()
    page = ManualFakePage(url="https://x.com/i/flow/login")
    ready = []

    summary = XCamoufoxCollector(poll_interval_ms=1).collect_page(
        page,
        query="slot",
        on_document=lambda _document: None,
        stop_event=stop_event,
        on_ready=lambda: ready.append(True),
    )

    assert summary.stop_reason == "authentication_required"
    assert ready == []

def test_manual_collector_stops_on_access_challenge() -> None:
    stop_event = threading.Event()
    page = ManualFakePage(content_text="captcha challenge")

    summary = XCamoufoxCollector(poll_interval_ms=1).collect_page(
        page, query="slot", on_document=lambda _document: None, stop_event=stop_event
    )

    assert summary.stop_reason == "access_challenge"


def test_manual_collector_counts_malformed_search_timeline_response() -> None:
    stop_event = threading.Event()
    page = ManualFakePage(
        responses=[FakeResponse(
            "https://x.com/i/api/graphql/example/SearchTimeline",
            200,
            error=ValueError("not json"),
        )],
        stop_event=stop_event,
    )

    summary = XCamoufoxCollector(poll_interval_ms=1).collect_page(
        page, query="slot", on_document=lambda _document: None, stop_event=stop_event
    )

    assert summary.responses_seen == 0
    assert summary.parse_errors == 1
    assert summary.stop_reason == "manual_stop"
