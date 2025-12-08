# Game Catalog Seeding

- Ensure `GAME_CATALOG_DATABASE_URL` points to your Postgres instance (e.g. via a `.env` file or environment export) and install dependencies with `pip install -r requirements.txt`.
- Insert the curated Steam cover/hero assets only:
  - `python -m app.seed --curated-only`
- Insert curated assets **and** top up with random sample games to reach `--count` (default 100):
  - `python -m app.seed --count 150`
- The curated rows include the provided library cover (`library_600x900_2x`) and hero (`library_hero_2x`) URLs; rerunning the script is safe and will backfill missing asset fields without duplicating rows.


