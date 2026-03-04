# TEDxNewy Salon Topic Voting Demo

Single-page voting prototype for TEDxNewy salon topic exploration.

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000`.

Internal results dashboard:

- `http://localhost:3000/internal-results.html`

## API

- `GET /api/topics` - topic list with vote counts
- `POST /api/vote` - cast a vote with `{ "topicId": "..." }`
- `GET /api/results` - ranked results and total vote count

Votes are stored in local SQLite at `data/votes.db`.
