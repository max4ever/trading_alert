# trading-alert

Sends a Telegram message when a ticker (default **TQQQ**) **crosses** its
**200-day SMA** — not every day it happens to be above or below one.

Built as small classes, one job each:

| File | Class | Job |
| --- | --- | --- |
| `src/Config.js` | `Config` | Loads `.env` via dotenv, validates settings |
| `src/Logger.js` | `Logger` | Structured pino logging, redacts the bot token |
| `src/YahooClient.js` | `YahooClient` | Fetches daily closes via `yahoo-finance2` |
| `src/SmaChecker.js` | `SmaChecker` | SMA via `trading-signals`, finds the last cross |
| `src/TelegramNotifier.js` | `TelegramNotifier` | Formats the message and calls `ALERT_URL` |
| `src/TradingAlert.js` | `TradingAlert` | Decides whether the cross is worth alerting on |
| `src/index.js` | — | Entry point: builds the objects and runs once |

## How the cross is detected

The run is **stateless**. Nothing is written to disk and no volume is needed —
the container starts clean, checks, and exits.

Each run fetches enough history to compute the SMA for every recent session,
marks each one above or below, and finds the most recent flip. A message goes
out only when that flip is the **latest completed session**. Any other day it
logs the position and sends nothing.

Run it once per trading day, after the close.

## Setup

```bash
cp .env.example .env
```

Edit `.env` and set `ALERT_URL` to your Telegram bot's `sendMessage` endpoint,
including the bot token and chat id:

```
ALERT_URL=https://api.telegram.org/bot<BOT_TOKEN>/sendMessage?chat_id=<CHAT_ID>
```

The alert text is appended automatically as the `text` query parameter, so the
URL needs no placeholder.

<details>
<summary>Getting a bot token and chat id</summary>

1. Message [@BotFather](https://t.me/BotFather) on Telegram, send `/newbot`, and copy the token.
2. Send any message to your new bot.
3. Open `https://api.telegram.org/bot<BOT_TOKEN>/getUpdates` and read `result[0].message.chat.id`.

</details>

## Configuration

Nothing is defaulted in the code — settings live in `.env`, and the run fails
fast if a required one is absent rather than watching some assumed ticker.

| Variable | Required | Meaning |
| --- | --- | --- |
| `ALERT_URL` | yes | Telegram `sendMessage` URL with token and `chat_id` |
| `SYMBOL` | yes | Ticker to watch |
| `SMA_PERIOD` | yes | SMA length in trading days |
| `FORCE_ALERT` | no | `true` sends regardless of any cross — for testing the bot |

## Logging

One JSON object per line on stdout, ready for whatever collects logs in your
cloud. A run is three lines, or two plus an error:

```json
{"level":"info","time":"2026-08-10T09:04:42.591Z","service":"trading-alert","symbol":"TQQQ","close":74.47,"sma":59.8128,"asOf":"2026-08-07","position":"above","barsSinceCross":6,"msg":"TQQQ is above its SMA200"}
{"level":"info","time":"2026-08-10T09:04:42.591Z","service":"trading-alert","barsSinceCross":6,"reason":"last cross was 6 sessions ago","msg":"alert skipped"}
{"level":"info","time":"2026-08-10T09:04:42.591Z","service":"trading-alert","durationMs":396,"alertSent":false,"msg":"run complete"}
```

`ALERT_URL` carries your bot token, so every log path is scrubbed of it before
writing — strings, nested fields, and error stacks alike.

## Run locally

Requires Node >= 22.

```bash
npm install
npm start
```

## Run with Docker

```bash
docker build -t trading-alert .
```

`.env` is deliberately excluded from the image (see `.dockerignore`), so secrets
are passed at run time. Any of these work:

```bash
# 1. an env file
docker run --rm --env-file .env trading-alert

# 2. individual variables
docker run --rm \
  -e ALERT_URL='https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<ID>' \
  -e SYMBOL=TQQQ \
  trading-alert

# 3. docker compose (reads .env via env_file)
docker compose run --rm trading-alert
```

Real environment variables always win over values in `.env`, so `-e` can
override a single setting without editing the file.

## Scheduling

The container is one-shot: it checks, alerts, and exits. Drive it from cron —
this runs at 22:00 on weekdays:

```cron
0 22 * * 1-5 cd /home/maxim/trading_alert && docker run --rm --env-file .env trading-alert >> ~/trading-alert.log 2>&1
```

Run it **after the US close** (21:00 UTC, or 20:00 UTC during daylight saving).
Signals are judged on closing prices, so a run during market hours only ever
sees the previous completed session.

## Notes

- Exits `0` on success, `1` on any failure (bad symbol, network error, missing config).
- Runs as the unprivileged `node` user inside the container.
- Yahoo's API is unofficial and occasionally rate-limits; a retry is worth adding
  if you schedule this frequently.
