#!/usr/bin/env python3
"""Repair common mojibake sequences and enforce UTF-8 encoding.

The tool re-encodes text assets that accidentally picked up Latin-1 style
artifacts (e.g. "F1/4" instead of "fü") by applying a curated set of
transformations.  It is intentionally conservative to avoid touching layout-
or style-related content.
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_GLOBS = (
    '*.html', '*.js', '*.css', '*.json', '*.txt'
)

REGEX_RULES: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r'1/4'), 'ü'),
    (re.compile(r"EUR'"), '-'),
    (re.compile(r'ä\''), '-'),
    (re.compile(r'(?<=\w)EUR(?=[A-Za-z-])'), 'ä'),
)

DIRECT_MAP = {
    'vorUebergehend': 'vorübergehend',
    'vorUebergehenden': 'vorübergehenden',
    'vorUebergehendem': 'vorübergehendem',
    'verfUegbar': 'verfügbar',
    'verfUegbare': 'verfügbare',
    'verfUegbar.': 'verfügbar.',
    'verfUegbar?': 'verfügbar?',
    'verfUegbar)': 'verfügbar)',
    'DUenger': 'Dünger',
    'DUeng': 'Düng',
    'BUero': 'Büro',
    'Ueberwaesserung': 'Überwässerung',
    'Ueberwaesser': 'Überwässer',
    'Ueberdueng': 'Überdüng',
    'Oeffne': 'Öffne',
    'lschen': 'löschen',
    'erhoeht': 'erhöht',
    'Schaedlingsspray': 'Schädlingsspray',
    'Schaedlingskontrolle': 'Schädlingskontrolle',
    'Schaedlings': 'Schädlings',
    'Schaedlinge': 'Schädlinge',
    'SchAedlinge': 'Schädlinge',
    'vorraetig': 'vorrätig',
    'Benoetigt': 'Benötigt',
    'Fungizid benoetigt': 'Fungizid benötigt',
}

EXTRA_RULES: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r'Hard Reset \(alle Daten l[öo]schen\)'), 'Hard Reset (alle Daten löschen)'),
)


def decode_bytes(data: bytes) -> str:
    for encoding in ('utf-8', 'latin-1'):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise UnicodeDecodeError('unable to decode', b'', 0, len(data), 'unsupported encoding')


def apply_rules(text: str) -> str:
    updated = text
    for pattern, repl in REGEX_RULES:
        updated = pattern.sub(repl, updated)
    for src, dst in DIRECT_MAP.items():
        updated = updated.replace(src, dst)
    for pattern, repl in EXTRA_RULES:
        updated = pattern.sub(repl, updated)
    return updated


def process_file(path: Path, dry_run: bool = False) -> bool:
    original_bytes = path.read_bytes()
    original_text = decode_bytes(original_bytes)
    updated_text = apply_rules(original_text)
    if updated_text == original_text:
        return False
    if dry_run:
        return True
    path.write_text(updated_text, encoding='utf-8')
    return True


def iter_files(globs: tuple[str, ...]) -> list[Path]:
    results: list[Path] = []
    for pattern in globs:
        results.extend(ROOT.glob(pattern))
        for sub in ROOT.iterdir():
            if sub.is_dir() and sub.name not in {'.git', '__pycache__', 'node_modules'}:
                results.extend(sub.rglob(pattern))
    # Deduplicate while preserving order
    seen: set[Path] = set()
    uniq: list[Path] = []
    for path in results:
        if path in seen:
            continue
        seen.add(path)
        uniq.append(path)
    return uniq


def main() -> None:
    parser = argparse.ArgumentParser(description='Repair mojibake and normalise UTF-8 encoding.')
    parser.add_argument('paths', nargs='*', type=Path, help='Specific files to process')
    parser.add_argument('--dry-run', action='store_true', help='Report files that would be updated without writing changes')
    parser.add_argument('--glob', action='append', dest='globs', help='Additional glob patterns to include')
    args = parser.parse_args()

    targets = list(args.paths)
    if not targets:
        globs = tuple(args.globs) if args.globs else DEFAULT_GLOBS
        targets = iter_files(globs)

    changed = []
    for path in targets:
        if not path.is_file():
            continue
        if process_file(path, dry_run=args.dry_run):
            changed.append(path.relative_to(ROOT))

    if args.dry_run:
        if changed:
            print('Would update:')
            for path in changed:
                print(f'  {path}')
        else:
            print('No files need updates.')
    else:
        if changed:
            print('Updated:')
            for path in changed:
                print(f'  {path}')
        else:
            print('No changes required.')


if __name__ == '__main__':
    main()
