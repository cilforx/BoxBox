#!/usr/bin/env python3
"""
BoxBox — update_changelog.py
Parse devlog.md  ##  Version History  →  wwwroot/changelog.json

รัน: python update_changelog.py
รัน ทุกครั้ง ที่เพิ่มรายการใน ## 📋 Version History ใน devlog.md
ผลลัพธ์ถูก fetch โดย App.js เพื่อแสดงประวัติเวอร์ชันในแอป
"""
import re
import json
import pathlib

DEVLOG  = pathlib.Path(__file__).parent / 'devlog.md'
OUTFILE = pathlib.Path(__file__).parent / 'wwwroot' / 'changelog.json'

def parse_devlog(text: str) -> list[dict]:
    entries: list[dict] = []
    current: dict | None = None
    in_history = False

    for line in text.split('\n'):
        # เจอ section header (ค้นโดยไม่ใช้ emoji เพื่อหลีกเลี่ยง encoding mismatch)
        if line.startswith('## ') and 'Version History' in line:
            in_history = True
            continue
        # เจอ section อื่น → หยุด
        if in_history and line.startswith('## ') and 'Version History' not in line:
            break
        if not in_history:
            continue
        # skip comment / blank / separator
        if line.startswith('<!--') or not line.strip() or line.startswith('---'):
            continue
        # ### v1.2.3 — DD MMM YYYY  ← version entry
        m = re.match(r'^### v([\d.]+)\s*[—\-]\s*(.+)', line)
        if m:
            current = {'version': m.group(1), 'date': m.group(2).strip(), 'changes': []}
            entries.append(current)
        elif line.startswith('### '):
            # non-version ### heading (e.g. "### Known Issues") → stop parsing
            break
        elif current and line.startswith('- ') and not line.startswith('- [ ]'):
            # regular bullet (skip checklist items "- [ ]")
            current['changes'].append(line[2:].strip())

    return entries


def main() -> None:
    if not DEVLOG.exists():
        print(f'[ERROR] devlog.md not found: {DEVLOG}')
        return

    text    = DEVLOG.read_text(encoding='utf-8')
    entries = parse_devlog(text)

    if not entries:
        print('[WARN] section "## Version History" not found in devlog.md')
        print('  Please add the section, then run again.')
        return

    OUTFILE.parent.mkdir(parents=True, exist_ok=True)
    OUTFILE.write_text(
        json.dumps(entries, ensure_ascii=False, indent=2),
        encoding='utf-8'
    )
    print(f'[OK] Wrote {len(entries)} version(s) -> {OUTFILE}')
    for e in entries:
        print(f"  v{e['version']}  {e['date']}  ({len(e['changes'])} changes)")


if __name__ == '__main__':
    main()
