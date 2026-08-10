# trading-alert

Sends you a Telegram message when a ticker **crosses** its 200-day SMA — on the
day it happens, and never on the days it doesn't.

Run it once per trading day. Most days it does nothing but log the position.

## Setup

```bash
cp .env.example .env
```

Set `ALERT_URL` to your bot's `sendMessage` endpoint, with the token and chat id
already in it:

```
ALERT_URL=https://api.telegram.org/bot<BOT_TOKEN>/sendMessage?chat_id=<CHAT_ID>
```

The alert text is appended as the `text` parameter, so the URL needs no
placeholder.

<details>
<summary>Getting a bot token and chat id</summary>

1. Message [@BotFather](https://t.me/BotFather), send `/newbot`, copy the token.
2. Send any message to your new bot.
3. Open `https://api.telegram.org/bot<BOT_TOKEN>/getUpdates` and read
   `result[0].message.chat.id`.

</details>

Then check it works — this sends a message immediately, cross or not:

```bash
FORCE_ALERT=true npm start
```

## Configuration

`ALERT_URL` is the only one you must set — it is the only value that cannot
have a sensible default.

| Variable | Required | Default | Meaning |
| --- | --- | --- | --- |
| `ALERT_URL` | **yes** | — | Telegram `sendMessage` URL with token and `chat_id` |
| `SYMBOL` | no | `TQQQ` | Ticker to watch |
| `SMA_PERIOD` | no | `200` | SMA length in trading days |
| `FORCE_ALERT` | no | off | `true` sends regardless of any cross — for testing |

## Running it

Locally (needs Node >= 22):

```bash
npm install
npm start
```

With Docker:

```bash
docker build -t trading-alert .
docker run --rm --env-file .env trading-alert
```

`.env` is kept out of the image, so pass secrets at run time. Individual
variables work too, and override the file:

```bash
docker run --rm --env-file .env -e SYMBOL=SPY trading-alert
```

There is also `docker compose run --rm trading-alert`, which reads `.env` for you.

## Scheduling

The container checks, alerts, and exits — nothing is written to disk and no
volume is needed. Run it once per trading day, **after the US close** (21:00
UTC, or 20:00 UTC during daylight saving), since signals are judged on closing
prices:

```cron
0 22 * * 1-5 cd /home/maxim/trading_alert && docker run --rm --env-file .env trading-alert >> ~/trading-alert.log 2>&1
```

## When you get a message

Only when the latest close is the session the ticker flipped sides:

> 🔴 TQQQ crossed BELOW its SMA200
> Close (2026-08-07): $58.10
> SMA200: $59.81
> Diff: -2.86%

Every other day it stays quiet. Each run works this out from the price history
it just fetched, so there is no state to lose between runs — but it also means a
**day the run fails is a cross you never hear about**. Check the logs if it
matters to you.

## Logs

One JSON object per line on stdout, ready for whatever collects logs in your
cloud. A quiet day looks like this:

```json
{"level":"info","time":"2026-08-10T09:16:00Z","service":"trading-alert","symbol":"TQQQ","close":74.47,"sma":59.8128,"asOf":"2026-08-07","position":"above","barsSinceCross":6,"msg":"TQQQ is above its SMA200"}
{"level":"info","time":"2026-08-10T09:16:00Z","service":"trading-alert","reason":"last cross was 6 sessions ago","msg":"alert skipped"}
{"level":"info","time":"2026-08-10T09:16:00Z","service":"trading-alert","durationMs":337,"alertSent":false,"msg":"run complete"}
```

Exit code is `0` on success and `1` on any failure, so cron or a cloud scheduler
can spot a broken run. Your bot token is scrubbed from every log line.

## Notes

- Prices come from Yahoo's unofficial API, which occasionally rate-limits; a
  retry is worth adding if you run this more than daily.
- The container runs as an unprivileged user.
