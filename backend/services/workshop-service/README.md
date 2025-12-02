## Workshop Service

Steam Workshop–style user generated content pipeline: upload, moderation, voting, and distribution of mods/items.

### Features
- **Submissions**: creators upload metadata + files, optionally via `/items/upload` (multipart) or JSON if they already host the content elsewhere.
- **Automatic review**: heuristic scanner flags suspicious titles/descriptions (keywords, length) and defers to moderators.
- **Moderation workflow**: `/items/{id}/moderation` lets admins approve/reject/archived submissions with reason logging.
- **Voting & stats**: up/down votes, download counters, visibility filters, tagged browsing.

### API Overview (`/api/v1/workshop`)

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/items` | Submit metadata-only mod (requires bearer token) |
| `POST` | `/items/upload` | Multipart upload with JSON metadata + binary file |
| `GET` | `/items` | List/filter mods by status, visibility, search |
| `GET` | `/items/{id}` | Retrieve mod detail |
| `PUT` | `/items/{id}` | Update own submission |
| `POST` | `/items/{id}/votes` | Up/down vote |
| `POST` | `/items/{id}/moderation` | Approve / reject / archive (moderator) |
| `POST` | `/items/{id}/download` | Increment download counter and return file/URL |

### Environment
```
WORKSHOP_DATABASE_URL=postgresql://steam:steam@postgres:5432/workshop_service
WORKSHOP_SERVICE_PORT=8014
WORKSHOP_STORAGE_PATH=/data/workshop_uploads
WORKSHOP_MAX_FILE_MB=500
WORKSHOP_BANNED_KEYWORDS=hack,cheat,malware,nsfw
WORKSHOP_AUTO_APPROVAL_SCORE=0.75
```

Mount `WORKSHOP_STORAGE_PATH` via Docker volume so uploads persist. For production you can swap in S3/MinIO by changing `storage.py`.

### Running locally
```bash
cd services/workshop-service
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8014
```

Run tests:

```bash
PYTHONPATH=services/workshop-service pytest services/workshop-service/tests
```

