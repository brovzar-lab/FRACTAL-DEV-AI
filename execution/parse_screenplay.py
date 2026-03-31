"""
parse_screenplay.py — Extract structured data from screenplay files.

Supports: PDF, FDX (Final Draft XML), Fountain (.fountain), plain text.
Output: JSON with scenes, characters, dialogue, action lines, page estimates.

Usage:
    python execution/parse_screenplay.py <input_file> [--output .tmp/parsed/]

Environment:
    No API keys needed. Pure local processing.
"""

import argparse
import json
import os
import re
import sys
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from pathlib import Path


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SCENE_HEADING_RE = re.compile(
    r"^\s*(INT\.|EXT\.|INT\./EXT\.|EXT\./INT\.|I/E\.|E/I\.)\s+.+",
    re.IGNORECASE,
)
CHARACTER_CUE_RE = re.compile(r"^[A-Z][A-Z\s\.\-']{1,40}(\s*\(.*\))?\s*$")
PARENTHETICAL_RE = re.compile(r"^\s*\(.*\)\s*$")
TRANSITION_RE = re.compile(
    r"^\s*(FADE IN:|FADE OUT\.|FADE TO BLACK\.|CUT TO:|SMASH CUT TO:|DISSOLVE TO:|"
    r"MATCH CUT TO:|JUMP CUT TO:|IRIS IN:|IRIS OUT:)\s*$",
    re.IGNORECASE,
)
PAGE_BREAK_RE = re.compile(r"^\s*\d+\.\s*$")

# Approximate lines per screenplay page (industry standard ~56 lines)
LINES_PER_PAGE = 56


# ---------------------------------------------------------------------------
# Parsers
# ---------------------------------------------------------------------------


def parse_fountain(text: str) -> dict:
    """Parse Fountain-formatted screenplay text into structured data."""
    lines = text.split("\n")
    scenes = []
    characters = Counter()
    current_scene = None
    current_character = None
    dialogue_lines = []
    action_lines = []

    for raw_line in lines:
        line = raw_line.rstrip()

        # Scene heading
        if SCENE_HEADING_RE.match(line) or line.startswith("."):
            if current_scene:
                scenes.append(current_scene)
            heading = line.lstrip(".").strip()
            current_scene = {
                "heading": heading,
                "scene_number": len(scenes) + 1,
                "dialogue": [],
                "action": [],
                "characters_present": [],
            }
            current_character = None
            continue

        # Transition
        if TRANSITION_RE.match(line):
            continue

        # Character cue
        if CHARACTER_CUE_RE.match(line) and line.strip():
            name = re.sub(r"\s*\(.*\)", "", line).strip()
            if name and len(name) > 1 and not name.startswith("("):
                current_character = name
                characters[name] += 1
                if current_scene and name not in current_scene["characters_present"]:
                    current_scene["characters_present"].append(name)
                continue

        # Parenthetical
        if PARENTHETICAL_RE.match(line):
            continue

        # Dialogue (follows a character cue)
        if current_character and line.strip():
            dialogue_lines.append(line.strip())
            if current_scene:
                current_scene["dialogue"].append(
                    {"character": current_character, "text": line.strip()}
                )
            continue

        # Empty line resets character cue
        if not line.strip():
            current_character = None
            continue

        # Action line
        if line.strip():
            action_lines.append(line.strip())
            if current_scene:
                current_scene["action"].append(line.strip())

    # Don't forget the last scene
    if current_scene:
        scenes.append(current_scene)

    total_lines = len(text.split("\n"))
    estimated_pages = round(total_lines / LINES_PER_PAGE, 1)

    return {
        "format_detected": "fountain",
        "estimated_pages": estimated_pages,
        "total_scenes": len(scenes),
        "total_dialogue_lines": len(dialogue_lines),
        "total_action_lines": len(action_lines),
        "characters": dict(characters.most_common()),
        "scenes": scenes,
    }


def parse_fdx(file_path: str) -> dict:
    """Parse Final Draft XML (.fdx) file."""
    tree = ET.parse(file_path)
    root = tree.getroot()

    scenes = []
    characters = Counter()
    current_scene = None
    current_character = None
    dialogue_count = 0
    action_count = 0

    for paragraph in root.iter("Paragraph"):
        ptype = paragraph.get("Type", "")
        text_parts = []
        for text_elem in paragraph.iter("Text"):
            if text_elem.text:
                text_parts.append(text_elem.text)
        text = " ".join(text_parts).strip()

        if not text:
            continue

        if ptype == "Scene Heading":
            if current_scene:
                scenes.append(current_scene)
            current_scene = {
                "heading": text,
                "scene_number": len(scenes) + 1,
                "dialogue": [],
                "action": [],
                "characters_present": [],
            }
            current_character = None

        elif ptype == "Character":
            name = re.sub(r"\s*\(.*\)", "", text).strip()
            current_character = name
            characters[name] += 1
            if current_scene and name not in current_scene["characters_present"]:
                current_scene["characters_present"].append(name)

        elif ptype == "Dialogue" and current_character:
            dialogue_count += 1
            if current_scene:
                current_scene["dialogue"].append(
                    {"character": current_character, "text": text}
                )

        elif ptype == "Action":
            action_count += 1
            current_character = None
            if current_scene:
                current_scene["action"].append(text)

        elif ptype == "Transition":
            current_character = None

    if current_scene:
        scenes.append(current_scene)

    # FDX files often have page count metadata
    page_count = None
    for header in root.iter("HeaderAndFooter"):
        # Try to find page count from metadata
        pass

    return {
        "format_detected": "fdx",
        "estimated_pages": page_count or len(scenes) * 1.2,  # rough estimate
        "total_scenes": len(scenes),
        "total_dialogue_lines": dialogue_count,
        "total_action_lines": action_count,
        "characters": dict(characters.most_common()),
        "scenes": scenes,
    }


def parse_plain_text(text: str) -> dict:
    """
    Fallback parser for plain text / PDF-extracted screenplays.
    Uses heuristics: line width, capitalization, indentation.
    """
    # Reuse fountain parser — most plain-text screenplays follow similar conventions
    return parse_fountain(text)


def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from PDF. Requires PyMuPDF (fitz) or pdfplumber."""
    try:
        import fitz  # PyMuPDF

        doc = fitz.open(file_path)
        text = ""
        for page in doc:
            text += page.get_text() + "\n"
        doc.close()
        return text
    except ImportError:
        pass

    try:
        import pdfplumber

        text = ""
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        return text
    except ImportError:
        print(
            "ERROR: PDF parsing requires PyMuPDF or pdfplumber.\n"
            "  pip install PyMuPDF   # or\n"
            "  pip install pdfplumber",
            file=sys.stderr,
        )
        sys.exit(1)


# ---------------------------------------------------------------------------
# Act structure estimation
# ---------------------------------------------------------------------------


def estimate_act_structure(parsed: dict) -> dict:
    """Estimate 3-act structure based on scene distribution and page count."""
    total_pages = parsed["estimated_pages"]
    total_scenes = parsed["total_scenes"]

    if total_scenes == 0:
        return {"act_1": [], "act_2": [], "act_3": []}

    # Standard proportions: Act 1 = 25%, Act 2 = 50%, Act 3 = 25%
    act1_end = int(total_scenes * 0.25)
    act3_start = int(total_scenes * 0.75)

    return {
        "act_1": {
            "scenes": list(range(1, act1_end + 1)),
            "estimated_pages": f"1-{int(total_pages * 0.25)}",
        },
        "act_2": {
            "scenes": list(range(act1_end + 1, act3_start + 1)),
            "estimated_pages": f"{int(total_pages * 0.25)}-{int(total_pages * 0.75)}",
        },
        "act_3": {
            "scenes": list(range(act3_start + 1, total_scenes + 1)),
            "estimated_pages": f"{int(total_pages * 0.75)}-{int(total_pages)}",
        },
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    parser = argparse.ArgumentParser(
        description="Parse a screenplay into structured JSON."
    )
    parser.add_argument("input_file", help="Path to screenplay file (PDF, FDX, TXT, Fountain)")
    parser.add_argument(
        "--output",
        default=".tmp/parsed/",
        help="Output directory (default: .tmp/parsed/)",
    )
    args = parser.parse_args()

    input_path = Path(args.input_file)
    if not input_path.exists():
        print(f"ERROR: File not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    ext = input_path.suffix.lower()

    if ext == ".fdx":
        parsed = parse_fdx(str(input_path))
    elif ext == ".pdf":
        text = extract_text_from_pdf(str(input_path))
        parsed = parse_fountain(text)
        parsed["format_detected"] = "pdf"
    elif ext == ".fountain":
        text = input_path.read_text(encoding="utf-8")
        parsed = parse_fountain(text)
    else:
        # Plain text fallback
        text = input_path.read_text(encoding="utf-8")
        parsed = parse_plain_text(text)
        parsed["format_detected"] = "plain_text"

    # Add act structure estimate
    parsed["act_structure"] = estimate_act_structure(parsed)

    # Add metadata
    parsed["source_file"] = str(input_path)
    parsed["parser_version"] = "1.0.0"

    # Write output
    output_file = output_dir / f"{input_path.stem}_parsed.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(parsed, f, indent=2, ensure_ascii=False)

    print(f"Parsed: {input_path.name}")
    print(f"  Format: {parsed['format_detected']}")
    print(f"  Pages:  ~{parsed['estimated_pages']}")
    print(f"  Scenes: {parsed['total_scenes']}")
    print(f"  Characters: {len(parsed['characters'])}")
    print(f"  Output: {output_file}")


if __name__ == "__main__":
    main()
