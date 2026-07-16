from yt_dlp.utils import DownloadError

from judol_detection.collectors.youtube import QuietYtDlpLogger, YouTubeMetadataCollector, video_metadata_to_document


def test_video_metadata_maps_to_shared_document(tmp_path) -> None:
    entry = {
        "id": "abc123",
        "title": "Slot Gacor",
        "description": "Bonus deposit",
        "webpage_url": "https://www.youtube.com/watch?v=abc123",
        "timestamp": 1_700_000_000,
    }

    document = video_metadata_to_document(entry, raw_payload_path=str(tmp_path / "abc123.json"))

    assert document.platform == "youtube"
    assert document.source_type == "youtube_video_metadata"
    assert document.source_item_id == "abc123"
    assert document.text_raw == "Slot Gacor\n\nBonus deposit"
    assert document.source_url == entry["webpage_url"]


def test_quiet_logger_suppresses_warnings(capsys) -> None:
    logger = QuietYtDlpLogger()
    logger.warning("missing JavaScript runtime")
    logger.info("metadata progress")

    assert capsys.readouterr().out == ""


def test_scheduled_live_event_uses_search_metadata_fallback() -> None:
    class FakeYdl:
        def extract_info(self, url, download):
            if url.startswith("ytsearch"):
                return {"entries": [{"id": "live", "title": "Live slot", "description": "bonus"}]}
            raise DownloadError("This live event will begin later")

    results = list(YouTubeMetadataCollector(FakeYdl()).collect_queries(("slot",), search_limit=1))

    assert results[0][1]["id"] == "live"
