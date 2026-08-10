# trading-alert

Checks whether a ticker (default **TQQQ**) is trading above or below its **200-day SMA**
and sends the result to Telegram.

Built as small classes, one job each:

| File | Class | Job |
| --- | --- | --- |
| `src/Config.js` | `Config` | Loads `.env` via dotenv, validates settings |
| `src/YahooClient.js` | `YahooClient` | Fetches daily closes via `yahoo-finance2` |
| `src/SmaChecker.js` | `SmaChecker` | Computes the SMA via `trading-signals`, returns above/below |
| `src/TelegramNotifier.js` | `TelegramNotifier` | Appends the message to `ALERT_URL` and calls it |
| `src/index.js` | `TradingAlert` | Wires the four together |

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

| Variable | Default | Meaning |
| --- | --- | --- |
| `ALERT_URL` | *(required)* | Telegram `sendMessage` URL with token and `chat_id` |
| `SYMBOL` | `TQQQ` | Ticker to watch |
| `SMA_PERIOD` | `200` | SMA length in trading days |
| `ALERT_ON` | `always` | `always`, `above`, or `below` — when to actually send |

`ALERT_ON=always` messages you on every run. Use `below` to be told only when
the ticker drops under its SMA.

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
  -e ALERT_ON=below \
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

## Notes

- Exits `0` on success, `1` on any failure (bad symbol, network error, missing config).
- Runs as the unprivileged `node` user inside the container.
- Yahoo's API is unofficial and occasionally rate-limits; a retry is worth adding
  if you schedule this frequently.
