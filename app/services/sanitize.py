"""Inline-HTML allowlist sanitizer for user-edited résumé prose.

Résumé prose fields (summary, bullets) can now carry a tiny bit of inline
formatting that the user applied in the editable document. Only bold and
italic are allowed. Everything else — other tags, all attributes, raw text —
is neutralized, so the result is safe to render unescaped through Jinja2 +
WeasyPrint without opening an HTML-injection / broken-layout hole.

Kept deliberately tiny (stdlib `html.parser` only, no extra dependency): the
allowlist is just two tags, so a small auditable parser beats pulling in a
sanitization library on a box that already fights WeasyPrint's native libs.
"""

from html.parser import HTMLParser

from markupsafe import Markup, escape

# Allowed output tags. `b`/`i` are normalized to the semantic `strong`/`em`,
# matching the tags resume.html already styles.
_ALLOWED = {"strong", "em"}
_NORMALIZE = {"b": "strong", "i": "em"}


class _InlineSanitizer(HTMLParser):
    """Collect only allowlisted inline tags; escape everything else to text."""

    def __init__(self) -> None:
        # convert_charrefs=True (the default): character references are decoded
        # into their text and delivered to handle_data, where we escape them
        # once. Doing our own entity handling risked corrupting bare ampersands
        # (e.g. "AT&T" -> "AT&T;") — letting the parser normalize first avoids that.
        super().__init__(convert_charrefs=True)
        self._parts: list[str] = []
        # Stack of allowed tags we've opened but not yet closed, so we can
        # ignore stray end tags and auto-close anything left open at the end.
        self._open: list[str] = []

    def _resolve(self, tag: str) -> str | None:
        tag = _NORMALIZE.get(tag.lower(), tag.lower())
        return tag if tag in _ALLOWED else None

    def handle_starttag(self, tag: str, attrs: list) -> None:
        # Attributes are dropped entirely — allowed tags emit bare, e.g. <strong>.
        resolved = self._resolve(tag)
        if resolved:
            self._parts.append(f"<{resolved}>")
            self._open.append(resolved)

    def handle_startendtag(self, tag: str, attrs: list) -> None:
        # A self-closing <strong/> carries no content; nothing to emit.
        pass

    def handle_endtag(self, tag: str) -> None:
        resolved = self._resolve(tag)
        # Only close if it matches a tag we actually opened; ignore stray closes.
        if resolved and resolved in self._open:
            # Close nested tags down to (and including) the matched one.
            while self._open:
                top = self._open.pop()
                self._parts.append(f"</{top}>")
                if top == resolved:
                    break

    def handle_data(self, data: str) -> None:
        # Text content is escaped so &, <, > become literal characters.
        self._parts.append(str(escape(data)))

    def result(self) -> str:
        # Auto-close any tags the input left open.
        while self._open:
            self._parts.append(f"</{self._open.pop()}>")
        return "".join(self._parts)


def sanitize_inline(text: str) -> Markup:
    """Return `text` with only <strong>/<em> preserved, wrapped as Markup.

    Wrapping in Markup lets the template render it unescaped without a global
    autoescape change or per-field |safe. Empty/blank input returns an empty
    Markup (still falsy, so empty modules keep getting skipped upstream).
    """
    if not text:
        return Markup("")
    parser = _InlineSanitizer()
    parser.feed(text)
    parser.close()
    return Markup(parser.result())
