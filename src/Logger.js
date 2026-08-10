import pino from 'pino';

// Telegram bot tokens look like `bot123456789:AAH...`. ALERT_URL contains one,
// so scrub it from anything on its way to the logs. Walks strings, arrays,
// plain objects and Errors so a token cannot slip through as a nested field.
function scrub(value, depth = 0) {
  if (typeof value === 'string') return value.replace(/bot\d+:[A-Za-z0-9_-]+/g, 'bot<redacted>');
  if (!value || typeof value !== 'object' || depth > 4) return value;

  if (value instanceof Error) {
    // Mutated in place; pino's error serializer needs a real Error.
    value.message = scrub(value.message, depth + 1);
    if (value.stack) value.stack = scrub(value.stack, depth + 1);
    return value;
  }

  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1));

  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, scrub(v, depth + 1)]));
}

export class Logger {
  // One JSON object per line on stdout: what every cloud log collector wants,
  // and a handful of lines per run, so there is nothing to tune.
  constructor() {
    this.pino = pino({
      level: 'info',
      base: { service: 'trading-alert' },
      // Collectors group by level name, not pino's numeric default.
      formatters: { level: (label) => ({ level: label }) },
      timestamp: pino.stdTimeFunctions.isoTime,
      hooks: {
        logMethod(args, method) {
          return method.apply(this, args.map((arg) => scrub(arg)));
        },
      },
    });
  }

  info(fields, message) {
    this.pino.info(fields, message);
  }

  error(fields, message) {
    this.pino.error(fields, message);
  }

  redact(value) {
    return scrub(value);
  }
}
