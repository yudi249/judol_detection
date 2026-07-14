"""Reusable local collection, labeling, and storage helpers."""

from .models import CollectedDocument
from .storage import CollectionStorage

__all__ = ["CollectedDocument", "CollectionStorage"]
