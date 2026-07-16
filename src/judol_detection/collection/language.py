"""Conservative local language-decision policy for collected text."""

from dataclasses import dataclass
from pathlib import Path
from functools import lru_cache


@dataclass(frozen=True)
class LanguageDetection:
    language_hint: str
    predicted_label: str | None
    confidence: float | None
    decision_reason: str


class FastTextLanguagePredictor:
    def __init__(self, model_path: Path) -> None:
        import fasttext
        self.model = fasttext.load_model(str(model_path))

    def predict(self, text: str) -> tuple[str, float]:
        labels, probabilities = self.model.predict(text)
        return labels[0], float(probabilities[0])


class LinguaLanguagePredictor:
    def __init__(self) -> None:
        from lingua import LanguageDetectorBuilder
        self.detector = LanguageDetectorBuilder.from_all_languages().build()

    def predict(self, text: str) -> tuple[str, float]:
        values = self.detector.compute_language_confidence_values(text)
        if not values:
            return "uncertain", 0.0
        top = values[0]
        return ("id" if top.language.name == "INDONESIAN" else top.language.name.lower()), float(top.value)


@lru_cache(maxsize=1)
def default_predictor() -> LinguaLanguagePredictor:
    return LinguaLanguagePredictor()


def detect_indonesian_language(text: str, *, metadata_language: str | None = None, predictor=None) -> LanguageDetection:
    language = (metadata_language or "").lower()
    if language == "id" or language.startswith("id-"):
        return LanguageDetection("id", None, None, "youtube_metadata")
    if language:
        return LanguageDetection("non_id", None, None, "youtube_metadata")
    if len("".join(char for char in text if char.isalpha())) < 30:
        return LanguageDetection("uncertain", None, None, "short_text")
    if predictor is None:
        predictor = default_predictor()
    label, confidence = predictor.predict(text)
    label = label.removeprefix("__label__")
    if label == "id" and confidence >= 0.60:
        return LanguageDetection("id", label, confidence, "fasttext")
    if label != "id" and confidence >= 0.60:
        return LanguageDetection("non_id", label, confidence, "fasttext")
    return LanguageDetection("uncertain", label, confidence, "low_confidence")
