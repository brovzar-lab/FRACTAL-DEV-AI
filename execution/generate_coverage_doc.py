"""
generate_coverage_doc.py — Generate a screenplay coverage/analysis report.

Takes parsed screenplay JSON (from parse_screenplay.py) and produces
a structured coverage report as a local Markdown file. Can be extended
to push to Google Docs via the Google Docs API.

Usage:
    python execution/generate_coverage_doc.py .tmp/parsed/my_script_parsed.json
    python execution/generate_coverage_doc.py .tmp/parsed/my_script_parsed.json --genre thriller
    python execution/generate_coverage_doc.py .tmp/parsed/my_script_parsed.json --output .tmp/coverage/

Environment:
    GOOGLE_CREDENTIALS_PATH, GOOGLE_TOKEN_PATH — for Google Docs output (optional)
"""

import argparse
import json
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path


# ---------------------------------------------------------------------------
# Analysis functions
# ---------------------------------------------------------------------------


def analyze_pacing(parsed: dict) -> dict:
    """Analyze pacing based on scene lengths and dialogue density."""
    scenes = parsed.get("scenes", [])
    if not scenes:
        return {"status": "no_scenes", "notes": []}

    scene_lengths = []
    for scene in scenes:
        length = len(scene.get("dialogue", [])) + len(scene.get("action", []))
        scene_lengths.append({"scene": scene["scene_number"], "heading": scene["heading"], "lines": length})

    avg_length = sum(s["lines"] for s in scene_lengths) / len(scene_lengths) if scene_lengths else 0
    long_scenes = [s for s in scene_lengths if s["lines"] > avg_length * 2.5]

    notes = []
    if long_scenes:
        for s in long_scenes:
            notes.append(f"Scene {s['scene']} ({s['heading']}) is {s['lines']} lines — consider trimming")

    total_dialogue = parsed.get("total_dialogue_lines", 0)
    total_action = parsed.get("total_action_lines", 0)
    total = total_dialogue + total_action
    dialogue_ratio = total_dialogue / total if total > 0 else 0

    if dialogue_ratio > 0.7:
        notes.append("Heavy dialogue (>70%) — may feel stagey. Add visual storytelling.")
    elif dialogue_ratio < 0.3:
        notes.append("Light dialogue (<30%) — ensure characters are still distinct and developed.")

    return {
        "avg_scene_length_lines": round(avg_length, 1),
        "long_scenes": long_scenes,
        "dialogue_ratio": round(dialogue_ratio, 2),
        "action_ratio": round(1 - dialogue_ratio, 2),
        "notes": notes,
    }


def analyze_characters(parsed: dict) -> dict:
    """Analyze character dialogue distribution and presence."""
    characters = parsed.get("characters", {})
    if not characters:
        return {"status": "no_characters", "notes": []}

    total_appearances = sum(characters.values())
    distribution = {}
    for name, count in characters.items():
        distribution[name] = {
            "dialogue_cues": count,
            "percentage": round(count / total_appearances * 100, 1),
        }

    # Check for protagonist dominance
    sorted_chars = sorted(distribution.items(), key=lambda x: x[1]["dialogue_cues"], reverse=True)
    notes = []

    if sorted_chars and sorted_chars[0][1]["percentage"] > 50:
        notes.append(
            f"{sorted_chars[0][0]} dominates dialogue ({sorted_chars[0][1]['percentage']}%). "
            f"Ensure supporting characters have distinct voices."
        )

    # Characters with very few lines may be cuttable
    minor_chars = [name for name, data in distribution.items() if data["dialogue_cues"] <= 2]
    if minor_chars:
        notes.append(f"Characters with 1-2 lines (consider combining or cutting): {', '.join(minor_chars)}")

    return {
        "total_speaking_characters": len(characters),
        "distribution": distribution,
        "notes": notes,
    }


def analyze_structure(parsed: dict) -> dict:
    """Evaluate against standard screenplay structure."""
    pages = parsed.get("estimated_pages", 0)
    scenes = parsed.get("total_scenes", 0)
    act_structure = parsed.get("act_structure", {})

    notes = []

    # Page count check
    if pages < 85:
        notes.append(f"Short at ~{pages} pages. Features typically run 90-120 pages.")
    elif pages > 130:
        notes.append(f"Long at ~{pages} pages. Consider trimming — most specs should be under 120.")

    # Scene count check
    if scenes > 0:
        pages_per_scene = pages / scenes
        if pages_per_scene > 4:
            notes.append(f"Avg {pages_per_scene:.1f} pages/scene — some scenes may be too long.")
        elif pages_per_scene < 0.8:
            notes.append(f"Avg {pages_per_scene:.1f} pages/scene — rapid cutting may hurt emotional beats.")

    return {
        "estimated_pages": pages,
        "total_scenes": scenes,
        "act_structure": act_structure,
        "notes": notes,
    }


def generate_rating(structure_notes: list, pacing_notes: list, character_notes: list) -> str:
    """Generate overall PASS/CONSIDER/RECOMMEND rating."""
    total_flags = len(structure_notes) + len(pacing_notes) + len(character_notes)
    if total_flags <= 2:
        return "RECOMMEND"
    elif total_flags <= 5:
        return "CONSIDER"
    else:
        return "PASS"


# ---------------------------------------------------------------------------
# Report generation
# ---------------------------------------------------------------------------


def generate_markdown_report(parsed: dict, genre: str = "unspecified") -> str:
    """Generate full coverage report as Markdown."""
    structure = analyze_structure(parsed)
    pacing = analyze_pacing(parsed)
    characters = analyze_characters(parsed)
    rating = generate_rating(structure["notes"], pacing["notes"], characters["notes"])

    source = Path(parsed.get("source_file", "unknown")).stem
    date = datetime.now().strftime("%Y-%m-%d")

    report = f"""# Screenplay Coverage: {source}

**Date:** {date}
**Genre:** {genre}
**Format detected:** {parsed.get('format_detected', 'unknown')}
**Rating:** **{rating}**

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Estimated pages | ~{structure['estimated_pages']} |
| Total scenes | {structure['total_scenes']} |
| Speaking characters | {characters.get('total_speaking_characters', 'N/A')} |
| Dialogue/Action ratio | {pacing.get('dialogue_ratio', 'N/A')} / {pacing.get('action_ratio', 'N/A')} |
| Overall rating | {rating} |

---

## Structural Analysis

"""
    if structure["notes"]:
        for note in structure["notes"]:
            report += f"- {note}\n"
    else:
        report += "- Structure looks solid. No major flags.\n"

    report += f"""
### Act Breakdown (Estimated)
- **Act 1** (Setup): Scenes {structure['act_structure'].get('act_1', {}).get('scenes', ['?'])[0] if structure['act_structure'].get('act_1', {}).get('scenes') else '?'}-{structure['act_structure'].get('act_1', {}).get('scenes', ['?'])[-1] if structure['act_structure'].get('act_1', {}).get('scenes') else '?'}
- **Act 2** (Confrontation): Scenes {structure['act_structure'].get('act_2', {}).get('scenes', ['?'])[0] if structure['act_structure'].get('act_2', {}).get('scenes') else '?'}-{structure['act_structure'].get('act_2', {}).get('scenes', ['?'])[-1] if structure['act_structure'].get('act_2', {}).get('scenes') else '?'}
- **Act 3** (Resolution): Scenes {structure['act_structure'].get('act_3', {}).get('scenes', ['?'])[0] if structure['act_structure'].get('act_3', {}).get('scenes') else '?'}-{structure['act_structure'].get('act_3', {}).get('scenes', ['?'])[-1] if structure['act_structure'].get('act_3', {}).get('scenes') else '?'}

---

## Pacing Analysis

"""
    report += f"- Average scene length: {pacing.get('avg_scene_length_lines', 'N/A')} lines\n"
    report += f"- Dialogue ratio: {pacing.get('dialogue_ratio', 'N/A')}\n\n"

    if pacing["notes"]:
        report += "### Flags\n"
        for note in pacing["notes"]:
            report += f"- {note}\n"
    else:
        report += "Pacing looks balanced.\n"

    report += """
---

## Character Analysis

"""
    dist = characters.get("distribution", {})
    if dist:
        report += "| Character | Dialogue Cues | % of Total |\n"
        report += "|-----------|--------------|------------|\n"
        for name, data in sorted(dist.items(), key=lambda x: x[1]["dialogue_cues"], reverse=True)[:15]:
            report += f"| {name} | {data['dialogue_cues']} | {data['percentage']}% |\n"
        report += "\n"

    if characters.get("notes"):
        report += "### Flags\n"
        for note in characters["notes"]:
            report += f"- {note}\n"

    report += """
---

## Recommendations

"""
    all_notes = structure["notes"] + pacing["notes"] + characters.get("notes", [])
    if all_notes:
        for i, note in enumerate(all_notes, 1):
            report += f"{i}. {note}\n"
    else:
        report += "No major issues found. Script is in good shape.\n"

    report += f"\n---\n*Generated by FRACTAL DEV-AI — parse_screenplay.py v{parsed.get('parser_version', '1.0.0')}*\n"

    return report


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    parser = argparse.ArgumentParser(description="Generate screenplay coverage report.")
    parser.add_argument("parsed_json", help="Path to parsed screenplay JSON")
    parser.add_argument("--genre", default="unspecified", help="Genre for context")
    parser.add_argument("--output", default=".tmp/coverage/", help="Output directory")
    args = parser.parse_args()

    parsed_path = Path(args.parsed_json)
    if not parsed_path.exists():
        print(f"ERROR: File not found: {parsed_path}", file=sys.stderr)
        sys.exit(1)

    parsed = json.loads(parsed_path.read_text())
    report = generate_markdown_report(parsed, args.genre)

    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    source_name = Path(parsed.get("source_file", "unknown")).stem
    output_file = output_dir / f"{source_name}_coverage.md"
    output_file.write_text(report)

    print(f"Coverage report generated: {output_file}")
    print(f"Rating: {report.split('**Rating:** **')[1].split('**')[0]}")


if __name__ == "__main__":
    main()
