import json
import pathlib
import re
import urllib.request

import pdfplumber


ROOT = pathlib.Path(__file__).resolve().parents[1]
PDF_DIR = ROOT / ".tmp-kanji-pdfs"
OUT_PATH = ROOT / "server" / "data" / "sourceKanjiLists.json"

SOURCES = {
    "jlptN1": "https://www.tanos.co.uk/jlpt/jlpt1/kanji/KanjiList.N1.pdf",
    "jlptN2": "https://www.tanos.co.uk/jlpt/jlpt2/kanji/KanjiList.N2.pdf",
    # The N3-N5 PDFs live under jlpt3/jlpt4/jlpt5 on tanos.co.uk.
    "jlptN3": "https://www.tanos.co.uk/jlpt/jlpt3/kanji/KanjiList.N3.pdf",
    "jlptN4": "https://www.tanos.co.uk/jlpt/jlpt4/kanji/KanjiList.N4.pdf",
    "jlptN5": "https://www.tanos.co.uk/jlpt/jlpt5/kanji/KanjiList.N5.pdf",
    "advanced": "https://rhsjapanese.weebly.com/uploads/5/3/9/6/53963977/aij_ap_kanji.pdf",
}


def download(name: str, url: str) -> pathlib.Path:
    PDF_DIR.mkdir(exist_ok=True)
    path = PDF_DIR / f"{name}.pdf"
    urllib.request.urlretrieve(url, path)
    return path


def add_unique(chars: list[str], seen: set[str], value: str | None) -> None:
    if not value:
        return
    value = value.strip()
    if re.fullmatch(r"[\u4e00-\u9fff]", value) and value not in seen:
        seen.add(value)
        chars.append(value)


def extract_jlpt(path: pathlib.Path) -> list[str]:
    chars: list[str] = []
    seen: set[str] = set()
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables() or []:
                for row in table:
                    for cell in row[:3]:
                        add_unique(chars, seen, cell)
                        if chars and chars[-1] == cell:
                            break
    return chars


def extract_ap(path: pathlib.Path) -> list[str]:
    chars: list[str] = []
    seen: set[str] = set()
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables() or []:
                for row in table:
                    if len(row) > 1:
                        add_unique(chars, seen, row[1])
    return chars


def main() -> None:
    result = {}
    for name, url in SOURCES.items():
        path = download(name, url)
        chars = extract_ap(path) if name == "advanced" else extract_jlpt(path)
        result[name] = {"source": url, "kanji": "".join(chars), "count": len(chars)}
        print(f"{name}: {len(chars)}")
    OUT_PATH.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
