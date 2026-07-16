from judol_detection.collection.language import detect_indonesian_language


class FakePredictor:
    def __init__(self, label: str, confidence: float) -> None:
        self.label, self.confidence = label, confidence

    def predict(self, text: str):
        return self.label, self.confidence


def test_metadata_indonesian_takes_precedence() -> None:
    assert detect_indonesian_language("English title", metadata_language="id", predictor=FakePredictor("en", 0.99)).language_hint == "id"


def test_confident_non_indonesian_is_rejected() -> None:
    assert detect_indonesian_language("This is a long English casino promotion message", predictor=FakePredictor("en", 0.95)).language_hint == "non_id"


def test_short_promotion_remains_uncertain() -> None:
    assert detect_indonesian_language("slot gacor", predictor=FakePredictor("en", 0.99)).language_hint == "uncertain"
