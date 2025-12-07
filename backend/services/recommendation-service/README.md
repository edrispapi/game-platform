## Recommendation Service

Smart recommendations that boost revenue and retention by learning from user behaviour and surfacing relevant games.

### Architecture

- **Postgres** stores recommendations, feedback, and aggregated user-game interactions.
- **Collaborative filtering engine** (scikit-learn `TruncatedSVD`) turns the implicit interaction matrix into latent factors and serves personalized candidates.
- **Redis/Kafka optional**: service can still emit events for analytics via `recommendation-events` topic.

### Key API Endpoints (`/api/v1/recommendation`)

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/interactions` | Batch ingest of implicit events (purchased, played, clicked, etc.) |
| `POST` | `/train` | Retrain the CF model from stored interactions and persist the artifact |
| `POST` | `/user/{user_id}/generate` | Run the trained model to create a ranked list, stored via `/batch` |
| `POST` | `/batch` | Upsert 1st-party recommendations (rule-based, editorial) |
| `GET` | `/user/{user_id}` | Fetch active recs for the user |
| `POST` | `/feedback` | Capture user feedback (clicked, wishlisted, purchased) |

### Interaction weights

Weights default to:

```
purchased: 5.0
played: 3.0
wishlisted: 2.0
clicked: 0.5
viewed: 0.3
```

Customize with `INTERACTION_WEIGHTS=purchased:7,clicked:0.2` etc. Each ingested interaction will increment the aggregated score for that user↔game pair before training.

### Training flow

1. Call `/interactions` regularly (from purchase, playtime, wishlist services).
2. Schedule `/train` (e.g., every hour). It builds a sparse matrix and fits SVD with `CF_N_COMPONENTS`.
3. Use `/user/{id}/generate` to produce fresh recs that are immediately stored through `/batch`.
4. Clients query `/user/{id}` via the API Gateway for fast reads.

### Environment

```
RECOMMENDATION_DATABASE_URL=postgresql://steam:steam@postgres:5432/recommendation_service
RECOMMENDATION_MODEL_PATH=/models/recommendation/cf.pkl
CF_N_COMPONENTS=40
CF_MIN_INTERACTIONS=5
CF_MAX_RECOMMENDATIONS=100
INTERACTION_WEIGHTS=purchased:5,wishlisted:2,played:3,clicked:0.5
```

Mount `/models` via Docker volume so the latest artifact survives restarts.

### Local testing

```bash
cd services/recommendation-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8010
```

Run tests:

```bash
PYTHONPATH=services/recommendation-service pytest services/recommendation-service/tests
```

### Database migrations

Generate the schema with Alembic so the `user_game_interactions` table exists before booting the service:

```bash
cd services/recommendation-service
alembic upgrade head
```

If you need to reset a local SQLite database, delete the `app.db`/`*.sqlite` file first.

### Automation & freshness

- **Event forwarding**: have purchase, wishlist, review/playtime services POST to `/api/v1/recommendation/interactions` with the relevant `event_type` so the implicit matrix stays up-to-date.
- **Training cadence**: schedule a cron (e.g., every hour) or a lightweight Celery/Kubernetes Job that invokes `/api/v1/recommendation/train`. Pair it with `/user/{id}/generate` calls after big content drops.
- **Monitoring**: emit metrics around `interactions.created`, training duration, and recommendation coverage so you can detect stale models early.

