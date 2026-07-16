"""yt-dlp metadata discovery mapped to the shared collection contract."""

from datetime import datetime, timezone
from typing import Any

from yt_dlp.utils import DownloadError

from judol_detection.collection.models import CollectedDocument


class QuietYtDlpLogger:
    """Keep yt-dlp extractor warnings out of the research CLI output."""

    def debug(self, message: str) -> None:
        pass

    def info(self, message: str) -> None:
        pass

    def warning(self, message: str) -> None:
        pass

    def error(self, message: str) -> None:
        pass


def video_metadata_to_document(entry: dict[str, Any], *, raw_payload_path: str | None = None) -> CollectedDocument:
    video_id = str(entry["id"])
    title = str(entry.get("title") or "")
    description = str(entry.get("description") or "")
    timestamp = entry.get("timestamp")
    published_at = datetime.fromtimestamp(timestamp, timezone.utc).replace(microsecond=0).isoformat() if timestamp else None
    return CollectedDocument(
        "youtube", "youtube_video_metadata", f"{title}\n\n{description}",
        source_item_id=video_id,
        source_url=entry.get("webpage_url") or f"https://www.youtube.com/watch?v={video_id}",
        published_at=published_at,
        raw_payload_path=raw_payload_path,
    )


class YouTubeMetadataCollector:
    def __init__(self, ydl) -> None:
        self.ydl = ydl

    def collect_queries(self, queries: tuple[str, ...], *, search_limit: int, on_progress=None):
        seen: set[str] = set()
        for query in queries:
            if on_progress:
                on_progress("query_started", query, 0)
            result = self.ydl.extract_info(f"ytsearch{search_limit}:{query}", download=False)
            entries = result.get("entries", [])
            if on_progress:
                on_progress("query_results", query, len(entries))
            for entry in entries:
                video_id = entry.get("id")
                if not video_id or video_id in seen:
                    continue
                seen.add(video_id)
                try:
                    metadata = self.ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
                except DownloadError:
                    metadata = entry
                if on_progress:
                    on_progress("video_enriched", query, len(seen))
                yield query, metadata
