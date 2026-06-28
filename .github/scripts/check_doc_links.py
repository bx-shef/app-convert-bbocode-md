#!/usr/bin/env python3
"""Проверка относительных ссылок в документации (docs/**.md, README.md).

Проверяются ТОЛЬКО ссылки на документы (`*.md`) и изображения внутри
репозитория — то есть навигация между доками и встроенные картинки.

Намеренно пропускаются:
- внешние ссылки (`http(s)://`, `mailto:`) и чистые якоря (`#...`);
- ссылки-указатели на исходный код приложений (`*.php`, `*.vue`, `../lib/...`,
  `local/apps/...`) — это справочные указания на код в ДРУГИХ репозиториях,
  а не навигация внутри базы знаний;
- ссылки на каталоги (заканчиваются на `/`).

Скрипт оффлайновый: сеть не используется, проверяется только наличие файла
на диске. Завершается с кодом 1, если найдена хотя бы одна битая ссылка.
"""
import glob
import os
import re
import sys

DOC_EXT = (".md", ".png", ".jpg", ".jpeg", ".svg", ".gif", ".webp")
LINK_RE = re.compile(r"\]\((?!https?:|mailto:|#)([^)]+)\)")


def is_doc_target(path: str) -> bool:
    """True, если ссылка указывает на документ или изображение (не на код/каталог)."""
    if path.endswith("/"):
        return False
    return path.lower().endswith(DOC_EXT)


def main() -> int:
    files = sorted(glob.glob("docs/**/*.md", recursive=True))
    if os.path.exists("README.md"):
        files.append("README.md")

    broken = []
    for f in files:
        base = os.path.dirname(f)
        with open(f, encoding="utf-8") as fh:
            content = fh.read()
        for raw in LINK_RE.findall(content):
            target = raw.split("#")[0].strip()
            if not target or not is_doc_target(target):
                continue
            resolved = os.path.normpath(os.path.join(base, target))
            if not os.path.exists(resolved):
                broken.append(f"{f} -> {raw}")

    if broken:
        print("Битые ссылки на документацию/изображения:")
        for b in broken:
            print("  " + b)
        return 1

    print(f"OK: проверено файлов — {len(files)}, битых ссылок на документацию нет.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
