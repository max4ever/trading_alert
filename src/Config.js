import { config as loadDotenv } from 'dotenv';

export class Config {
  constructor(env = process.env) {
    this.alertUrl = env.ALERT_URL;
    this.symbol = env.SYMBOL || 'TQQQ';
    this.smaPeriod = Number(env.SMA_PERIOD || 200);
    this.alertOn = (env.ALERT_ON || 'always').toLowerCase();

    if (!this.alertUrl) throw new Error('ALERT_URL is missing (see .env.example)');
    if (!Number.isInteger(this.smaPeriod) || this.smaPeriod < 2) {
      throw new Error(`SMA_PERIOD must be an integer >= 2, got "${env.SMA_PERIOD}"`);
    }
    if (!['always', 'above', 'below'].includes(this.alertOn)) {
      throw new Error(`ALERT_ON must be always|above|below, got "${this.alertOn}"`);
    }
  }

  // dotenv leaves already-set env vars alone, so real env wins over the file.
  // That is what we want once this runs in Docker.
  static load(path) {
    loadDotenv({ path, quiet: true });
    return new Config();
  }
}
