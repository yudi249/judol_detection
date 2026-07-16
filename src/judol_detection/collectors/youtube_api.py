"""Newest-first YouTube Data API discovery mapped to shared documents."""

import json
from typing import Any, Callable
from urllib.parse import urlencode
from urllib.request import urlopen

from judol_detection.collection.models import CollectedDocument
from judol_detection.collection.language import detect_indonesian_language


def _http_transport(params: dict[str, str]) -> dict[str, Any]:
    with urlopen(f"https://www.googleapis.com/youtube/v3/search?{urlencode(params)}", timeout=30) as response:
        return json.load(response)


class YouTubeDataApiCollector:
    def __init__(self, api_key: str, *, transport: Callable[[dict[str, str]], dict[str, Any]] = _http_transport) -> None:
        self.api_key, self.transport = api_key, transport

    def collect_query(self, query: str, *, max_pages: int = 1, published_after: str | None = None, published_before: str | None = None, region_code: str = "ID"):
        page_token = None
        for _ in range(max_pages):
            params = {"key": self.api_key, "part": "snippet", "q": query, "type": "video", "order": "date", "maxResults": "50", "regionCode": region_code, "relevanceLanguage": "id"}
            if page_token:
                params["pageToken"] = page_token
            if published_after:
                params["publishedAfter"] = published_after
            if published_before:
                params["publishedBefore"] = published_before
            response = self.transport(params)
            for item in response.get("items", []):
                video_id = item.get("id", {}).get("videoId")
                if not video_id:
                    continue
                snippet = item.get("snippet", {})
                text = f"{snippet.get('title', '')}\n\n{snippet.get('description', '')}"
                language = detect_indonesian_language(text, metadata_language=snippet.get("defaultLanguage") or snippet.get("defaultAudioLanguage"))
                document = CollectedDocument("youtube", "youtube_data_api_search", text, source_item_id=video_id, source_url=f"https://www.youtube.com/watch?v={video_id}", published_at=snippet.get("publishedAt"), language_hint=language.language_hint)
                yield document, item
            page_token = response.get("nextPageToken")
            if not page_token:
                break
