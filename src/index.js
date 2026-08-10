import { Config } from './Config.js';
import { YahooClient } from './YahooClient.js';
import { SmaChecker } from './SmaChecker.js';
import { TelegramNotifier } from './TelegramNotifier.js';

class TradingAlert {
  constructor(config, client, checker, notifier) {
    this.config = config;
    this.client = client;
    this.checker = checker;
    this.notifier = notifier;
  }

  static fromEnv() {
    const config = Config.load();
    return new TradingAlert(
      config,
      new YahooClient(),
      new SmaChecker(config.smaPeriod),
      new TelegramNotifier(config.alertUrl),
    );
  }

  shouldAlert(position) {
    return this.config.alertOn === 'always' || this.config.alertOn === position;
  }

  async run() {
    const quote = await this.client.getDailyCloses(this.config.symbol, this.config.smaPeriod);
    const result = this.checker.check(quote);
    const message = TelegramNotifier.format(result);

    console.log(message.replace(/\n/g, ' | '));

    if (!this.shouldAlert(result.position)) {
      console.log(`No alert sent (ALERT_ON=${this.config.alertOn})`);
      return result;
    }

    await this.notifier.send(message);
    console.log('Alert sent.');
    return result;
  }
}

try {
  await TradingAlert.fromEnv().run();
} catch (err) {
  console.error(`trading-alert failed: ${err.message}`);
  process.exit(1);
}

export { TradingAlert };
