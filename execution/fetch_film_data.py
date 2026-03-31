"""
fetch_film_data.py — Fetch film metadata from TMDB (The Movie Database).

Handles: search by title, genre discovery, box office data, cast, ratings.
Includes rate-limit throttling (40 req/10s) and local caching.

Usage:
    python execution/fetch_film_data.py search "Arrival"
    python execution/fetch_film_data.py genre "Science Fiction" --years 2015-2025 --limit 20
    python execution/fetch_film_data.py details 329865

Environment:
    TMDB_API_KEY or TMDB_READ_ACCESS_TOKEN in .env
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

try:
    import requests
except ImportError:
    print("ERROR: requests library required.\n  pip install requests", file=sys.stderr)
    sys.exit(1)

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass  # .env loading is optional if vars are set in shell


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

TMDB_BASE = "https://api.themoviedb.org/3"
CACHE_DIR = Path(".tmp/comps/cache")
RATE_LIMIT_CALLS = 40
RATE_LIMIT_WINDOW = 10  # seconds

_call_timestamps: list[float] = []


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------


def get_headers() -> dict:
    """Build auth headers from environment."""
    token = os.getenv("TMDB_READ_ACCESS_TOKEN")
    if token:
        return {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        }

    api_key = os.getenv("TMDB_API_KEY")
    if api_key:
        # API key goes as query param, handled in _get()
        return {"Accept": "application/json"}

    print(
        "ERROR: Set TMDB_API_KEY or TMDB_READ_ACCESS_TOKEN in .env",
        file=sys.stderr,
    )
    sys.exit(1)


def _api_key_param() -> dict:
    """Return api_key query param if using key-based auth."""
    key = os.getenv("TMDB_API_KEY")
    if key and not os.getenv("TMDB_READ_ACCESS_TOKEN"):
        return {"api_key": key}
    return {}


# ---------------------------------------------------------------------------
# Rate limiting
# ---------------------------------------------------------------------------


def _throttle():
    """Enforce TMDB rate limit: 40 requests per 10 seconds."""
    now = time.time()
    # Remove timestamps outside the window
    while _call_timestamps and _call_timestamps[0] < now - RATE_LIMIT_WINDOW:
        _call_timestamps.pop(0)

    if len(_call_timestamps) >= RATE_LIMIT_CALLS:
        sleep_time = RATE_LIMIT_WINDOW - (now - _call_timestamps[0]) + 0.1
        if sleep_time > 0:
            print(f"  (rate limit — waiting {sleep_time:.1f}s)", file=sys.stderr)
            time.sleep(sleep_time)

    _call_timestamps.append(time.time())


# ---------------------------------------------------------------------------
# Caching
# ---------------------------------------------------------------------------


def _cache_path(key: str) -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    safe_key = "".join(c if c.isalnum() or c in "-_" else "_" for c in key)
    return CACHE_DIR / f"{safe_key}.json"


def _get_cached(key: str) -> dict | None:
    path = _cache_path(key)
    if path.exists():
        age_hours = (time.time() - path.stat().st_mtime) / 3600
        if age_hours < 24:  # Cache valid for 24h
            return json.loads(path.read_text())
    return None


def _set_cache(key: str, data: dict):
    path = _cache_path(key)
    path.write_text(json.dumps(data, indent=2))


# ---------------------------------------------------------------------------
# API calls
# ---------------------------------------------------------------------------


def _get(endpoint: str, params: dict | None = None) -> dict:
    """Make a GET request to TMDB with rate limiting and caching."""
    params = params or {}
    params.update(_api_key_param())

    cache_key = f"{endpoint}_{'_'.join(f'{k}={v}' for k, v in sorted(params.items()))}"
    cached = _get_cached(cache_key)
    if cached:
        return cached

    _throttle()
    url = f"{TMDB_BASE}{endpoint}"
    resp = requests.get(url, headers=get_headers(), params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    _set_cache(cache_key, data)
    return data


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------


def search_films(query: str, year: int | None = None) -> list[dict]:
    """Search TMDB for films matching a query."""
    params = {"query": query, "include_adult": "false"}
    if year:
        params["year"] = str(year)

    data = _get("/search/movie", params)
    results = []
    for film in data.get("results", [])[:10]:
        results.append(
            {
                "id": film["id"],
                "title": film["title"],
                "release_date": film.get("release_date", ""),
                "overview": film.get("overview", "")[:200],
                "vote_average": film.get("vote_average"),
                "vote_count": film.get("vote_count"),
                "genre_ids": film.get("genre_ids", []),
            }
        )
    return results


def get_film_details(movie_id: int) -> dict:
    """Get full details for a film by TMDB ID."""
    data = _get(f"/movie/{movie_id}", {"append_to_response": "credits,release_dates"})

    # Extract key cast
    cast = []
    for member in data.get("credits", {}).get("cast", [])[:10]:
        cast.append(
            {
                "name": member["name"],
                "character": member.get("character", ""),
                "order": member.get("order"),
            }
        )

    # Extract director
    directors = [
        c["name"]
        for c in data.get("credits", {}).get("crew", [])
        if c.get("job") == "Director"
    ]

    return {
        "id": data["id"],
        "title": data["title"],
        "tagline": data.get("tagline", ""),
        "overview": data.get("overview", ""),
        "release_date": data.get("release_date", ""),
        "runtime": data.get("runtime"),
        "budget": data.get("budget", 0),
        "revenue": data.get("revenue", 0),
        "genres": [g["name"] for g in data.get("genres", [])],
        "vote_average": data.get("vote_average"),
        "vote_count": data.get("vote_count"),
        "status": data.get("status"),
        "original_language": data.get("original_language"),
        "directors": directors,
        "cast": cast,
        "roi": (
            round(data.get("revenue", 0) / data["budget"], 2)
            if data.get("budget")
            else None
        ),
    }


def discover_by_genre(
    genre_name: str, year_start: int = 2015, year_end: int = 2025, limit: int = 20
) -> list[dict]:
    """Discover films by genre within a year range."""
    # First, get genre ID
    genres_data = _get("/genre/movie/list")
    genre_id = None
    for g in genres_data.get("genres", []):
        if g["name"].lower() == genre_name.lower():
            genre_id = g["id"]
            break

    if not genre_id:
        available = [g["name"] for g in genres_data.get("genres", [])]
        print(f"ERROR: Genre '{genre_name}' not found. Available: {available}", file=sys.stderr)
        sys.exit(1)

    results = []
    page = 1
    while len(results) < limit and page <= 5:
        data = _get(
            "/discover/movie",
            {
                "with_genres": str(genre_id),
                "primary_release_date.gte": f"{year_start}-01-01",
                "primary_release_date.lte": f"{year_end}-12-31",
                "sort_by": "revenue.desc",
                "page": str(page),
            },
        )
        for film in data.get("results", []):
            if len(results) >= limit:
                break
            results.append(
                {
                    "id": film["id"],
                    "title": film["title"],
                    "release_date": film.get("release_date", ""),
                    "vote_average": film.get("vote_average"),
                    "overview": film.get("overview", "")[:200],
                }
            )
        page += 1

    return results


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    parser = argparse.ArgumentParser(description="Fetch film data from TMDB.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # search
    sp_search = subparsers.add_parser("search", help="Search for a film by title")
    sp_search.add_argument("query", help="Film title to search")
    sp_search.add_argument("--year", type=int, help="Filter by release year")

    # details
    sp_details = subparsers.add_parser("details", help="Get full details by TMDB ID")
    sp_details.add_argument("movie_id", type=int, help="TMDB movie ID")

    # genre
    sp_genre = subparsers.add_parser("genre", help="Discover films by genre")
    sp_genre.add_argument("genre_name", help="Genre name (e.g., 'Science Fiction')")
    sp_genre.add_argument("--years", default="2015-2025", help="Year range (e.g., 2015-2025)")
    sp_genre.add_argument("--limit", type=int, default=20, help="Max results")

    args = parser.parse_args()

    if args.command == "search":
        results = search_films(args.query, args.year)
        print(json.dumps(results, indent=2))

    elif args.command == "details":
        details = get_film_details(args.movie_id)
        print(json.dumps(details, indent=2))

    elif args.command == "genre":
        year_start, year_end = map(int, args.years.split("-"))
        results = discover_by_genre(args.genre_name, year_start, year_end, args.limit)
        print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
