import { config as loadDotenv } from 'dotenv';

export class Config {
  static #REQUIRED = ['ALERT_URL', 'SYMBOL', 'SMA_PERIOD'];

  constructor(env = process.env) {
    // dotenv leaves already-set env vars alone, so real env wins over the file.
    // That is what we want once this runs in Docker.
    loadDotenv({ quiet: true });

    this.#validate(env);

    // Trimmed because a value pasted into a dashboard field often carries
    // whitespace, and a stray space breaks the URL rather than the check.
    this.alertUrl = env.ALERT_URL.trim();
    this.symbol = env.SYMBOL.trim();
    this.smaPeriod = Number(env.SMA_PERIOD);
    this.forceAlert = env.FORCE_ALERT === 'true';
  }

  #validate(env) {
    const missing = Config.#REQUIRED.filter((key) => !env[key]?.trim());
    if (missing.length > 0) {
      const present = Config.#REQUIRED.filter((key) => env[key]?.trim());
      throw new Error(
        `Missing required config: ${missing.join(', ')}. ` +
          `Present: ${present.length > 0 ? present.join(', ') : 'none of them'}. ` +
          `These must reach the process as environment variables (see .env.example).`,
      );
    }

    const period = Number(env.SMA_PERIOD);
    if (!Number.isInteger(period) || period < 2) {
      throw new Error(`SMA_PERIOD must be an integer >= 2, got "${env.SMA_PERIOD}"`);
    }

    // Fail here rather than at send time, with a message that does not echo
    // the token back into the logs.
    try {
      new URL(env.ALERT_URL.trim());
    } catch {
      throw new Error('ALERT_URL is not a valid URL (it should start with https://)');
    }
  }
}
