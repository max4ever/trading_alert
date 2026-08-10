import pino from 'pino';

export class Logger {
  // Telegram bot tokens look like `bot123456789:AAH...`, and ALERT_URL contains one.
  static #BOT_TOKEN = /bot\d+:[A-Za-z0-9_-]+/g;

  // One JSON object per line on stdout: what every cloud log collector wants,
  // and a handful of lines per run, so there is nothing to tune.
  constructor() {
    // Bound here because logMethod needs `this` to stay the pino logger.
    const scrub = (value) => this.#scrub(value);

    this.pino = pino({
      level: 'info',
      base: { service: 'trading-alert' },
      // Collectors group by level name, not pino's numeric default.
      formatters: { level: (label) => ({ level: label }) },
      timestamp: pino.stdTimeFunctions.isoTime,
      hooks: {
        logMethod(args, method) {
          return method.apply(this, args.map(scrub));
        },
      },
    });
  }

  // Walks strings, arrays, plain objects and Errors so a token cannot reach the
  // logs as a nested field or buried in a stack trace.
  #scrub(value, depth = 0) {
    if (typeof value === 'string') return value.replace(Logger.#BOT_TOKEN, 'bot<redacted>');
    if (!value || typeof value !== 'object' || depth > 4) return value;

    if (value instanceof Error) {
      // Mutated in place; pino's error serializer needs a real Error.
      value.message = this.#scrub(value.message, depth + 1);
      if (value.stack) value.stack = this.#scrub(value.stack, depth + 1);
      return value;
    }

    if (Array.isArray(value)) return value.map((v) => this.#scrub(v, depth + 1));

    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, this.#scrub(v, depth + 1)]),
    );
  }

  info(fields, message) {
    this.pino.info(fields, message);
  }

  error(fields, message) {
    this.pino.error(fields, message);
  }
}
