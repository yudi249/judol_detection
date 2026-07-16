"""X search-timeline response adapters and bounded browser collection."""

from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import quote

from judol_detection.collection.language import detect_indonesian_language
from judol_detection.collection.models import CollectedDocument


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
        instructions = (
            payload.get("data", {})
            .get("search_by_raw_query", {})
            .get("search_timeline", {})
            .get("timeline", {})
            .get("instructions", [])
        )
        documents: list[CollectedDocument] = []
        seen_ids: set[str] = set()
        for instruction in instructions:
            for entry in instruction.get("entries", []):
                if not str(entry.get("entryId", "")).startswith("tweet-"):
                    continue
                result = (
                    entry.get("content", {})
                    .get("itemContent", {})
                    .get("tweet_results", {})
                    .get("result", {})
                )
                legacy = result.get("legacy", {})
                post_id = str(result.get("rest_id") or legacy.get("id_str") or "")
                text = str(legacy.get("full_text") or "").strip()
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
    scrolls: int
    responses_seen: int
    posts_observed: int
    stop_reason: str | None = None


@dataclass(frozen=True)
class XCollectionSummary:
    query: str
    scrolls: int
    responses_seen: int
    documents: tuple[CollectedDocument, ...]
    stop_reason: str


class XPlaywrightCollector:
    """Observe browser-loaded Latest-search responses during bounded scrolling."""

    def __init__(
        self,
        *,
        max_posts: int,
        max_scrolls: int,
        no_progress_limit: int,
        scroll_interval_ms: int = 1500,
        login_timeout_seconds: int = 300,
        parser: XSearchTimelineParser | None = None,
    ) -> None:
        for name, value in {
            "max_posts": max_posts,
            "max_scrolls": max_scrolls,
            "no_progress_limit": no_progress_limit,
            "scroll_interval_ms": scroll_interval_ms,
        }.items():
            if value < 1:
                raise ValueError(f"{name} must be a positive integer")
        if login_timeout_seconds < 0:
            raise ValueError("login_timeout_seconds must be zero or greater")
        self.max_posts = max_posts
        self.max_scrolls = max_scrolls
        self.no_progress_limit = no_progress_limit
        self.scroll_interval_ms = scroll_interval_ms
        self.login_timeout_seconds = login_timeout_seconds
        self.parser = parser or XSearchTimelineParser()

    def collect_page(self, page, *, query: str, search_url: str | None = None, on_progress=None, on_payload=None, wait_for_manual_login: bool = True) -> XCollectionSummary:
        documents: list[CollectedDocument] = []
        observed_ids: set[str] = set()
        responses_seen = 0

        def emit(scrolls: int, stop_reason: str | None = None) -> None:
            if on_progress is not None:
                on_progress(XCollectionProgress(query, scrolls, responses_seen, len(documents), stop_reason))

        def observe_response(response) -> None:
            nonlocal responses_seen
            if "SearchTimeline" not in str(getattr(response, "url", "")):
                return
            try:
                payload = response.json()
            except Exception:
                return
            responses_seen += 1
            raw_payload_path = on_payload(payload) if on_payload is not None else None
            for document in self.parser.parse_response(payload, query=query):
                if document.source_item_id and document.source_item_id not in observed_ids:
                    observed_ids.add(document.source_item_id)
                    if raw_payload_path is not None:
                        document = CollectedDocument(**{**document.__dict__, "raw_payload_path": raw_payload_path})
                    documents.append(document)

        page.on("response", observe_response)
        if search_url is not None:
            page.goto(search_url, wait_until="domcontentloaded")
        if self._requires_authentication(page):
            if not self._wait_for_manual_login(page, wait_for_manual_login):
                emit(0, "authentication_required")
                return XCollectionSummary(query, 0, responses_seen, (), "authentication_required")
            if search_url is not None:
                page.goto(search_url, wait_until="domcontentloaded")
            if self._requires_authentication(page):
                emit(0, "authentication_required")
                return XCollectionSummary(query, 0, responses_seen, (), "authentication_required")

        no_progress_scrolls = 0
        scrolls = 0
        stop_reason = "max_scrolls"
        while scrolls < self.max_scrolls and len(documents) < self.max_posts:
            before = len(documents)
            page.mouse.wheel(0, 1200)
            page.wait_for_timeout(self.scroll_interval_ms)
            scrolls += 1
            if self._requires_authentication(page):
                stop_reason = "authentication_required"
                break
            if self._has_access_challenge(page):
                stop_reason = "access_challenge"
                break
            if len(documents) == before:
                no_progress_scrolls += 1
            else:
                no_progress_scrolls = 0
            emit(scrolls)
            if no_progress_scrolls >= self.no_progress_limit:
                stop_reason = "no_new_posts"
                break
        if len(documents) >= self.max_posts:
            stop_reason = "max_posts"
        retained = tuple(documents[: self.max_posts])
        emit(scrolls, stop_reason)
        return XCollectionSummary(query, scrolls, responses_seen, retained, stop_reason)

    def collect_query(self, *, profile_dir: Path, query: str, headless: bool, on_progress=None, on_payload=None) -> XCollectionSummary:
        from playwright.sync_api import sync_playwright

        search_url = f"https://x.com/search?q={quote(query)}&src=typed_query&f=live"
        with sync_playwright() as playwright:
            context = playwright.chromium.launch_persistent_context(str(profile_dir), headless=headless)
            try:
                page = context.pages[0] if context.pages else context.new_page()
                return self.collect_page(
                    page, query=query, search_url=search_url, on_progress=on_progress,
                    on_payload=on_payload, wait_for_manual_login=not headless,
                )
            finally:
                context.close()

    @staticmethod
    def _requires_authentication(page) -> bool:
        return "/i/flow/login" in str(getattr(page, "url", ""))

    def _wait_for_manual_login(self, page, wait_for_manual_login: bool) -> bool:
        if not wait_for_manual_login:
            return False
        for _ in range(self.login_timeout_seconds):
            page.wait_for_timeout(1000)
            if not self._requires_authentication(page):
                return True
        return False

    @staticmethod
    def _has_access_challenge(page) -> bool:
        content = getattr(page, "content", None)
        if not callable(content):
            return False
        try:
            text = content().lower()
        except Exception:
            return False
        return "captcha" in text or "unusual activity" in text
