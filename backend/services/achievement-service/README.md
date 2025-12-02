## Achievement Service

This service tracks game achievements, issues **star tokens**, and maintains the cross-platform leaderboard for the Steam-like platform.

### Core components
- **Postgres** (or SQLite for dev/tests) stores canonical achievement definitions plus per-user progress rows.
- **Redis sorted sets** (configurable via `ACHIEVEMENT_REDIS_URL`) cache leaderboard scores for fast range queries.
- **Notification Service** is called when an achievement unlocks so users receive in-app toasts/pushes.
- **User Service** lookups decorate leaderboard entries with usernames/display names.

### API (via API Gateway)

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/v1/achievements/achievements` | Register a new achievement definition |
| `PATCH` | `/api/v1/achievements/achievements/{code}` | Update metadata/points for an achievement |
| `GET` | `/api/v1/achievements/achievements` | List configured achievements |
| `GET` | `/api/v1/achievements/achievements/{code}` | Fetch a single achievement |
| `POST` | `/api/v1/achievements/users/{user_id}/progress` | Apply progress deltas, automatically unlocking + awarding tokens |
| `GET` | `/api/v1/achievements/users/{user_id}/overview` | Summarized view of a user’s XP, tokens, and recent unlocks |
| `GET` | `/api/v1/achievements/leaderboard` | Paginated leaderboard sourced from Redis sorted sets |

### Star tokens & scoring
- Every unlock adds the achievement’s `points` to the player’s `total_points`.
- Additional `score_bonus` values (e.g., match XP) can be supplied in the progress payload.
- A star token is minted each time a player crosses a configurable XP threshold (`STAR_TOKEN_SCORE_STEP`, default 500).

### Environment
Set via `docker-compose.yml` or service `.env`:

```
ACHIEVEMENT_DATABASE_URL=postgresql://steam:steam@postgres:5432/achievement_service
ACHIEVEMENT_REDIS_URL=redis://redis:6379/1
NOTIFICATION_SERVICE_URL=http://notification-service:8009
USER_SERVICE_URL=http://user-service:8001
STAR_TOKEN_SCORE_STEP=500
LEADERBOARD_KEY=leaderboard:global
```

### Local development
```bash
cd services/achievement-service
pip install -r requirements.txt
ALEMBIC_CONFIG=alembic.ini alembic upgrade head  # optional once migrations exist
uvicorn app.main:app --reload --port 8011
```

Run tests (SQLite in-memory):

```bash
pytest
```

