from judol_detection.collectors.youtube_api import YouTubeDataApiCollector


def test_maps_api_results_and_follows_page_token() -> None:
    calls = []

    def transport(params):
        calls.append(params)
        if len(calls) == 1:
            return {"items": [{"id": {"videoId": "a"}, "snippet": {"title": "Slot Gacor", "description": "bonus", "publishedAt": "2026-01-02T00:00:00Z"}}], "nextPageToken": "next"}
        return {"items": [{"id": {"videoId": "b"}, "snippet": {"title": "Deposit", "description": "link", "publishedAt": "2026-01-01T00:00:00Z"}}]}

    results = list(YouTubeDataApiCollector("key", transport=transport).collect_query("slot", max_pages=2))

    assert [document.source_item_id for document, _ in results] == ["a", "b"]
    assert results[0][0].source_type == "youtube_data_api_search"
    assert calls[0]["order"] == "date"
    assert calls[1]["pageToken"] == "next"
