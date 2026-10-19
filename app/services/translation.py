"""Amazon Translate integration used by the public language picker."""

from __future__ import annotations

import os
from functools import lru_cache


LANGUAGES = (
    ("en", "English"),
    ("es", "Spanish"),
    ("fr", "French"),
    ("zh", "Chinese (Simplified)"),
    ("hi", "Hindi"),
    ("ar", "Arabic"),
    ("af", "Afrikaans"),
    ("sq", "Albanian"),
    ("am", "Amharic"),
    ("hy", "Armenian"),
    ("az", "Azerbaijani"),
    ("bn", "Bengali"),
    ("bs", "Bosnian"),
    ("bg", "Bulgarian"),
    ("ca", "Catalan"),
    ("zh-TW", "Chinese (Traditional)"),
    ("hr", "Croatian"),
    ("cs", "Czech"),
    ("da", "Danish"),
    ("fa-AF", "Dari"),
    ("nl", "Dutch"),
    ("et", "Estonian"),
    ("fa", "Farsi"),
    ("tl", "Filipino"),
    ("fi", "Finnish"),
    ("fr-CA", "French (Canada)"),
    ("ka", "Georgian"),
    ("de", "German"),
    ("el", "Greek"),
    ("gu", "Gujarati"),
    ("ht", "Haitian Creole"),
    ("ha", "Hausa"),
    ("he", "Hebrew"),
    ("hu", "Hungarian"),
    ("is", "Icelandic"),
    ("id", "Indonesian"),
    ("ga", "Irish"),
    ("it", "Italian"),
    ("ja", "Japanese"),
    ("kn", "Kannada"),
    ("kk", "Kazakh"),
    ("ko", "Korean"),
    ("lv", "Latvian"),
    ("lt", "Lithuanian"),
    ("mk", "Macedonian"),
    ("ms", "Malay"),
    ("ml", "Malayalam"),
    ("mt", "Maltese"),
    ("mr", "Marathi"),
    ("mn", "Mongolian"),
    ("no", "Norwegian"),
    ("ps", "Pashto"),
    ("pl", "Polish"),
    ("pt", "Portuguese"),
    ("ro", "Romanian"),
    ("ru", "Russian"),
    ("sr", "Serbian"),
    ("si", "Sinhala"),
    ("sk", "Slovak"),
    ("sl", "Slovenian"),
    ("so", "Somali"),
    ("sw", "Swahili"),
    ("sv", "Swedish"),
    ("ta", "Tamil"),
    ("te", "Telugu"),
    ("th", "Thai"),
    ("tr", "Turkish"),
    ("uk", "Ukrainian"),
    ("ur", "Urdu"),
    ("uz", "Uzbek"),
    ("vi", "Vietnamese"),
    ("cy", "Welsh"),
)

LANGUAGE_CODES = frozenset(code for code, _ in LANGUAGES)


class TranslationUnavailable(RuntimeError):
    """Raised when Amazon Translate is not configured or cannot be reached."""


@lru_cache(maxsize=1)
def _client():
    try:
        import boto3
    except ImportError as exc:  # pragma: no cover - production dependency
        raise TranslationUnavailable("Amazon Translate is not installed") from exc

    region = os.environ.get("AWS_REGION") or os.environ.get(
        "AWS_DEFAULT_REGION", "us-east-1"
    )
    return boto3.client("translate", region_name=region)


@lru_cache(maxsize=4096)
def translate_text(text: str, target_language: str) -> str:
    """Translate one English string, caching repeated navigation and page copy."""
    if target_language == "en" or not text.strip():
        return text
    if target_language not in LANGUAGE_CODES:
        raise ValueError("Unsupported target language")
    try:
        response = _client().translate_text(
            Text=text,
            SourceLanguageCode="en",
            TargetLanguageCode=target_language,
        )
    except Exception as exc:
        raise TranslationUnavailable("Amazon Translate is unavailable") from exc
    return response["TranslatedText"]

