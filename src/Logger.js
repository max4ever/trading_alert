import pino from 'pino';

// Telegram bot tokens look like `bot123456789:AAH...`. ALERT_URL contains one,
// so scrub it from anything on its way to the logs.
const BOT_TOKEN = /bot\d+:[A-Za-z0-9_-]+/g;

export class Logger {
  // Walks strings, arrays, plain objects and Errors so a token cannot slip
  // through as a nested field rather than a bare message.
  static redact(value, depth = 0) {
    if (typeof value === 'string') return value.replace(BOT_TOKEN, 'bot<redacted>');
    if (!value || typeof value !== 'object' || depth > 4) return value;

    if (value instanceof Error) {
      // Mutated in place; pino's error serializer needs a real Error.
      value.message = Logger.redact(value.message, depth + 1);
      if (value.stack) value.stack = Logger.redact(value.stack, depth + 1);
      return value;
    }

    if (Array.isArray(value)) return value.map((v) => Logger.redact(v, depth + 1));

    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, Logger.redact(v, depth + 1)]),
    );
  }

  static create(env = process.env) {
    const options = {
      level: env.LOG_LEVEL || 'info',
      base: { service: 'trading-alert' },
      // Cloud log collectors group by level name, not pino's numeric default.
      formatters: { level: (label) => ({ level: label }) },
      timestamp: pino.stdTimeFunctions.isoTime,
      hooks: {
        logMethod(args, method) {
          return method.apply(this, args.map(Logger.redact));
        },
      },
    };

    // JSON on stdout is what we want in the cloud; pretty output is for local runs.
    if (env.LOG_PRETTY === 'true') {
      try {
        return pino({
          ...options,
          transport: { target: 'pino-pretty', options: { colorize: true, singleLine: true } },
        });
      } catch {
        // pino-pretty is a devDependency and absent from the image; fall back to JSON.
      }
    }

    return pino(options);
  }
}
