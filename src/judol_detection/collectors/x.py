"""X SearchTimeline parsing and manual Camoufox collection."""

from dataclasses import dataclass
from pathlib import Path
import threading
from typing import Any, Callable

from judol_detection.collection.language import detect_indonesian_language
from judol_detection.collection.models import CollectedDocument
from judol_detection.collectors.x_camoufox import camoufox_launch_options


class XSearchTimelineParser:
    """Map observed X Latest-search response records to shared documents."""

    def parse_response(
        self,
        payload: dict[str, Any],
        *,
        query: str,
        source_type: str = "x_search_timeline_latest",
    ) -> tuple[CollectedDocument, ...]:
        del query
        data = payload.get("data", {})
        if not isinstance(data, dict):
            return ()
        search = data.get("search_by_raw_query", {})
        if not isinstance(search, dict):
            return ()
        timeline = search.get("search_timeline", {})
        if not isinstance(timeline, dict):
            return ()
        timeline_data = timeline.get("timeline", {})
        if not isinstance(timeline_data, dict):
            return ()
        instructions = timeline_data.get("instructions", [])
        if not isinstance(instructions, list):
            return ()

        documents: list[CollectedDocument] = []
        seen_ids: set[str] = set()
        for instruction in instructions:
            if not isinstance(instruction, dict):
                continue
            entries = instruction.get("entries", [])
            if not isinstance(entries, list):
                continue
            for entry in entries:
                if not isinstance(entry, dict):
                    continue
                if not str(entry.get("entryId", "")).startswith("tweet-"):
                    continue
                content = entry.get("content", {})
                if not isinstance(content, dict):
                    continue
                item_content = content.get("itemContent", {})
                if not isinstance(item_content, dict):
                    continue
                tweet_results = item_content.get("tweet_results", {})
                if not isinstance(tweet_results, dict):
                    continue
                result = tweet_results.get("result", {})
                if not isinstance(result, dict):
                    continue
                if isinstance(result.get("tweet"), dict):
                    result = result["tweet"]

                legacy = result.get("legacy") or {}
                if not isinstance(legacy, dict):
                    legacy = {}
                note_tweet = result.get("note_tweet", {})
                note_results = note_tweet.get("note_tweet_results", {}) if isinstance(note_tweet, dict) else {}
                note_result = note_results.get("result", {}) if isinstance(note_results, dict) else {}
                note_text = note_result.get("text") if isinstance(note_result, dict) else None
                post_id = str(result.get("rest_id") or legacy.get("id_str") or "")
                text = str(note_text or legacy.get("full_text") or "").strip()
                if not post_id or not text or post_id in seen_ids:
                    continue
                seen_ids.add(post_id)
                language = detect_indonesian_language(text)
                documents.append(
                    CollectedDocument(
                        platform="x",
                        source_type=source_type,
                        text_raw=text,
                        source_item_id=post_id,
                        source_url=f"https://x.com/i/web/status/{post_id}",
                        published_at=legacy.get("created_at"),
                        language_hint=language.language_hint,
                    )
                )
        return tuple(documents)


@dataclass(frozen=True)
class XCollectionProgress:
    query: str
    responses_seen: int
    posts_observed: int
    parse_errors: int
    search_errors: int
    last_search_error_status: int | None
    stop_reason: str | None = None


@dataclass(frozen=True)
class XCollectionSummary:
    query: str
    responses_seen: int
    posts_observed: int
    parse_errors: int
    search_errors: int
    last_search_error_status: int | None
    stop_reason: str


class XCamoufoxCollector:
    """Observe SearchTimeline responses while the researcher scrolls manually."""

    def __init__(self, *, poll_interval_ms: int = 500, parser: XSearchTimelineParser | None = None) -> None:
        if poll_interval_ms < 1:
            raise ValueError("poll_interval_ms must be a positive integer")
        self.poll_interval_ms = poll_interval_ms
        self.parser = parser or XSearchTimelineParser()

    def collect_page(
        self,
        page,
        *,
        query: str,
        on_document: Callable[[CollectedDocument], None],
        stop_event: threading.Event,
        search_url: str | None = None,
        search_query: str | None = None,
        on_progress: Callable[[XCollectionProgress], None] | None = None,
        on_ready: Callable[[], None] | None = None,
    ) -> XCollectionSummary:
        observed_ids: set[str] = set()
        responses_seen = 0
        posts_observed = 0
        parse_errors = 0
        search_errors = 0
        last_search_error_status: int | None = None

        def emit(stop_reason: str | None = None) -> None:
            if on_progress is not None:
                on_progress(
                    XCollectionProgress(
                        query,
                        responses_seen,
                        posts_observed,
                        parse_errors,
                        search_errors,
                        last_search_error_status,
                        stop_reason,
                    )
                )

        def observe_response(response) -> None:
            nonlocal responses_seen, posts_observed, parse_errors, search_errors, last_search_error_status
            if "SearchTimeline" not in str(getattr(response, "url", "")):
                return
            status = getattr(response, "status", None)
            if status != 200:
                search_errors += 1
                last_search_error_status = status
                emit()
                return
            try:
                payload = response.json()
                documents = self.parser.parse_response(payload, query=query)
            except Exception:
                parse_errors += 1
                return
            responses_seen += 1
            for document in documents:
                post_id = document.source_item_id
                if not post_id or post_id in observed_ids:
                    continue
                observed_ids.add(post_id)
                posts_observed += 1
                on_document(document)
            emit()

        page.on("response", observe_response)
        if search_url is not None:
            page.goto(search_url, wait_until="domcontentloaded")
        elif search_query is not None:
            self._open_search_ui(page, search_query)
        if search_url is not None or search_query is not None:
            self._select_latest_tab(page)

        stop_reason = self._stop_reason(page)
        if stop_reason is not None:
            emit(stop_reason)
            return XCollectionSummary(
                query,
                responses_seen,
                posts_observed,
                parse_errors,
                search_errors,
                last_search_error_status,
                stop_reason,
            )
        if on_ready is not None:
            on_ready()

        while not stop_event.is_set():
            page.wait_for_timeout(self.poll_interval_ms)
            stop_reason = self._stop_reason(page)
            if stop_reason is not None:
                break
            emit()
        if stop_reason is None:
            stop_reason = "manual_stop"
        emit(stop_reason)
        return XCollectionSummary(
            query,
            responses_seen,
            posts_observed,
            parse_errors,
            search_errors,
            last_search_error_status,
            stop_reason,
        )

    @staticmethod
    def _select_latest_tab(page) -> None:
        """Use X's rendered Latest tab when navigation falls back to Top."""
        locator_factory = getattr(page, "locator", None)
        if not callable(locator_factory):
            return
        try:
            latest_link = locator_factory('a[href*="f=live"]').first
            wait_for = getattr(latest_link, "wait_for", None)
            if callable(wait_for):
                wait_for(state="visible", timeout=10_000)
            if latest_link.count() > 0:
                latest_link.click()
                return
        except Exception:
            pass

        get_by_role = getattr(page, "get_by_role", None)
        if not callable(get_by_role):
            get_by_role = lambda *_args, **_kwargs: None
        try:
            latest_tab = get_by_role("tab", name="Terbaru", exact=True)
            if latest_tab is not None:
                latest_tab.wait_for(state="visible", timeout=5_000)
                latest_tab.click()
                return
        except Exception:
            pass

        try:
            latest_link = get_by_role("link", name="Terbaru", exact=True)
            if latest_link is not None:
                latest_link.wait_for(state="visible", timeout=5_000)
                latest_link.click()
                return
        except Exception:
            pass

        get_by_text = getattr(page, "get_by_text", None)
        if not callable(get_by_text):
            return
        try:
            latest_text = get_by_text("Terbaru", exact=True).first
            latest_text.wait_for(state="visible", timeout=5_000)
            latest_text.click()
        except Exception:
            return

    @staticmethod
    def _open_search_ui(page, query: str) -> None:
        page.goto("https://x.com/home", wait_until="domcontentloaded")
        search_box = None
        get_by_test_id = getattr(page, "get_by_test_id", None)
        if callable(get_by_test_id):
            search_box = get_by_test_id("SearchBox_Search_Input")
        locator = getattr(page, "get_by_placeholder", None)
        if search_box is None or search_box.count() == 0:
            for placeholder in ("Search", "Cari di X", "Cari"):
                candidate = locator(placeholder) if callable(locator) else None
                if candidate is not None and candidate.count() > 0:
                    search_box = candidate
                    break
        if search_box is None or search_box.count() == 0:
            get_by_role = getattr(page, "get_by_role", None)
            search_box = (
                get_by_role("textbox", name="Search", exact=False)
                if callable(get_by_role)
                else None
            )
        if search_box is None or search_box.count() == 0:
            raise RuntimeError("X search box was not found on the home page")
        search_box.first.wait_for(state="visible", timeout=30_000)
        search_box.first.fill(query)
        search_box.first.press("Enter")

    def collect_query(
        self,
        *,
        profile_dir: Path,
        query: str,
        on_document: Callable[[CollectedDocument], None],
        on_progress: Callable[[XCollectionProgress], None] | None = None,
    ) -> XCollectionSummary:
        from camoufox.sync_api import Camoufox

        stop_event = threading.Event()
        ready_event = threading.Event()

        def wait_for_stop() -> None:
            while not stop_event.is_set() and not ready_event.wait(0.05):
                pass
            if stop_event.is_set():
                return
            try:
                input("Scroll manual di browser. Tekan Enter di terminal untuk selesai: ")
            except EOFError:
                pass
            finally:
                stop_event.set()

        try:
            with Camoufox(**camoufox_launch_options(profile_dir)) as context:
                page = context.pages[0] if context.pages else context.new_page()
                input_thread = threading.Thread(target=wait_for_stop, daemon=True)
                input_thread.start()
                return self.collect_page(
                    page,
                    query=query,
                    on_document=on_document,
                    stop_event=stop_event,
                    search_query=query,
                    on_progress=on_progress,
                    on_ready=ready_event.set,
                )
        finally:
            stop_event.set()

    @staticmethod
    def _stop_reason(page) -> str | None:
        if "/i/flow/login" in str(getattr(page, "url", "")):
            return "authentication_required"
        content = getattr(page, "content", None)
        if callable(content):
            try:
                text = content().lower()
            except Exception:
                text = ""
            if "captcha" in text or "unusual activity" in text:
                return "access_challenge"
        return None
