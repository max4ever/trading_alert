import { config as loadDotenv } from 'dotenv';

export class Config {
  // Only the alert URL is truly per-deployment; the rest have sane defaults so
  // a new deployment needs one variable set, not three.
  static #DEFAULTS = { SYMBOL: 'TQQQ', SMA_PERIOD: '200' };

  constructor(env = process.env) {
    // dotenv leaves already-set env vars alone, so real env wins over the file.
    // That is what we want once this runs in Docker.
    loadDotenv({ quiet: true });

    this.#validate(env);

    // Trimmed because a value pasted into a dashboard field often carries
    // whitespace, and a stray space breaks the URL rather than the check.
    this.alertUrl = env.ALERT_URL.trim();
    this.symbol = env.SYMBOL?.trim() || Config.#DEFAULTS.SYMBOL;
    this.smaPeriod = Number(env.SMA_PERIOD?.trim() || Config.#DEFAULTS.SMA_PERIOD);
    this.forceAlert = env.FORCE_ALERT === 'true';
  }

  #validate(env) {
    if (!env.ALERT_URL?.trim()) {
      throw new Error(
        'ALERT_URL is missing. It must reach the process as an environment ' +
          'variable (see .env.example). SYMBOL and SMA_PERIOD are optional.',
      );
    }

    // Only checked when supplied; an absent value falls back to the default.
    const rawPeriod = env.SMA_PERIOD?.trim();
    if (rawPeriod) {
      const period = Number(rawPeriod);
      if (!Number.isInteger(period) || period < 2) {
        throw new Error(`SMA_PERIOD must be an integer >= 2, got "${env.SMA_PERIOD}"`);
      }
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
