import asyncio

from telethon.errors import FloodWaitError

from judol_detection.collection.storage import CollectionStorage
from judol_detection.collectors import telegram
from judol_detection.collectors.telegram import TelegramSnowballCollector


class FakeMessage:
    def __init__(self, text: str, message_id: int) -> None:
        self.message = text
        self.id = message_id
        self.date = None


class FakeClient:
    async def iter_messages(self, username: str, limit: int):
        messages = {
            "seed": [FakeMessage("slot gacor https://t.me/nextchan", 1)],
            "nextchan": [FakeMessage("bonus deposit", 2)],
        }
        for message in messages[username]:
            yield message


def test_collector_follows_evidence_gated_depth_one_channel(tmp_path) -> None:
    storage = CollectionStorage(tmp_path / "pilot.sqlite")
    run_id = storage.start_run("telegram", "telegram_snowball", "seed")
    summary = asyncio.run(TelegramSnowballCollector(FakeClient(), max_messages_per_channel=10).collect_async(["seed"], storage, run_id))

    assert summary.processed_channels == 2
    assert summary.stored_documents == 2


class FloodThenSuccessClient:
    def __init__(self) -> None:
        self.calls = 0

    async def iter_messages(self, username: str, limit: int | None):
        self.calls += 1
        if self.calls == 1:
            raise FloodWaitError(None, 7)
        yield FakeMessage("slot gacor bonus deposit", 1)


def test_collector_waits_and_retries_after_flood_wait(tmp_path, monkeypatch) -> None:
    sleeps: list[float] = []

    async def fake_sleep(seconds: float) -> None:
        sleeps.append(seconds)

    monkeypatch.setattr(telegram.asyncio, "sleep", fake_sleep)
    storage = CollectionStorage(tmp_path / "pilot.sqlite")
    run_id = storage.start_run("telegram", "telegram_snowball", "seed")
    client = FloodThenSuccessClient()

    summary = asyncio.run(TelegramSnowballCollector(client, max_messages_per_channel=None).collect_async(["seed"], storage, run_id))

    assert client.calls == 2
    assert sleeps == [7]
    assert summary.processed_channels == 1
    assert summary.stored_documents == 1


def test_collector_emits_channel_checkpoint_and_completion_progress(tmp_path) -> None:
    events = []
    storage = CollectionStorage(tmp_path / "pilot.sqlite")
    run_id = storage.start_run("telegram", "telegram_snowball", "seed")

    asyncio.run(
        TelegramSnowballCollector(FakeClient(), max_messages_per_channel=10).collect_async(
            ["seed"],
            storage,
            run_id,
            progress_every=1,
            on_progress=events.append,
        )
    )

    assert [event.stage for event in events] == ["channel_started", "query_started", "checkpoint", "channel_completed", "channel_started", "query_started", "checkpoint", "channel_completed"]
    assert events[2].messages_read == 1
    assert events[2].inserted == 1
    assert events[2].queue_size == 1


class QueryRecordingClient:
    def __init__(self) -> None:
        self.calls = []

    async def iter_messages(self, username: str, **kwargs):
        self.calls.append((username, kwargs))
        yield FakeMessage("slot gacor bonus deposit", 9)


def test_targeted_mode_uses_server_search_and_records_channel_cursor(tmp_path) -> None:
    storage = CollectionStorage(tmp_path / "pilot.sqlite")
    run_id = storage.start_run("telegram", "telegram_targeted", "seed")
    client = QueryRecordingClient()
    events = []

    asyncio.run(
        TelegramSnowballCollector(client).collect_async(
            ["seed"], storage, run_id, mode="targeted", target_queries=("slot gacor", "bonus deposit"), on_progress=events.append
        )
    )

    assert [call[1]["search"] for call in client.calls] == ["slot gacor", "bonus deposit"]
    assert any(event.query == "slot gacor" for event in events)
    assert storage.get_telegram_channel_state("seed")["last_message_id"] == 9
