import { config as loadDotenv } from 'dotenv';

export class Config {
  constructor(env = process.env) {
    // dotenv leaves already-set env vars alone, so real env wins over the file.
    // That is what we want once this runs in Docker.
    loadDotenv({ quiet: true });

    this.alertUrl = env.ALERT_URL;
    this.symbol = env.SYMBOL;
    this.smaPeriod = Number(env.SMA_PERIOD);
    this.forceAlert = env.FORCE_ALERT === 'true';

    for (const key of ['ALERT_URL', 'SYMBOL', 'SMA_PERIOD']) {
      if (!env[key]) throw new Error(`${key} is missing (see .env.example)`);
    }
    if (!Number.isInteger(this.smaPeriod) || this.smaPeriod < 2) {
      throw new Error(`SMA_PERIOD must be an integer >= 2, got "${env.SMA_PERIOD}"`);
    }
  }
}
