import { Config } from './Config.js';
import { Logger } from './Logger.js';
import { YahooClient } from './YahooClient.js';
import { SmaChecker } from './SmaChecker.js';
import { TelegramNotifier } from './TelegramNotifier.js';

class TradingAlert {
  constructor(config, client, checker, notifier, log) {
    this.config = config;
    this.client = client;
    this.checker = checker;
    this.notifier = notifier;
    this.log = log;
  }

  static fromEnv(log) {
    const config = new Config();
    return new TradingAlert(
      config,
      new YahooClient(),
      new SmaChecker(config.smaPeriod),
      new TelegramNotifier(config.alertUrl),
      log,
    );
  }

  shouldAlert(position) {
    return this.config.alertOn === 'always' || this.config.alertOn === position;
  }

  async run() {
    const { symbol, smaPeriod, alertOn } = this.config;
    this.log.info({ symbol, smaPeriod, alertOn }, 'check started');

    const fetchedAt = Date.now();
    const quote = await this.client.getDailyCloses(symbol, smaPeriod);
    this.log.debug(
      { symbol, bars: quote.closes.length, fetchMs: Date.now() - fetchedAt },
      'closes fetched',
    );

    const result = this.checker.check(quote);
    this.log.info(
      {
        symbol: result.symbol,
        price: Number(result.price.toFixed(4)),
        sma: Number(result.sma.toFixed(4)),
        period: result.period,
        position: result.position,
        diffPct: Number(result.diffPct.toFixed(4)),
        bars: quote.closes.length,
      },
      `${result.symbol} is ${result.position} its SMA${result.period}`,
    );

    if (!this.shouldAlert(result.position)) {
      this.log.info({ position: result.position, alertOn }, 'alert skipped');
      return { ...result, alertSent: false };
    }

    const sentAt = Date.now();
    await this.notifier.send(TelegramNotifier.format(result));
    this.log.info({ sendMs: Date.now() - sentAt }, 'alert sent');

    return { ...result, alertSent: true };
  }
}

Config.loadDotenv();
const log = Logger.create();
const startedAt = Date.now();

try {
  const result = await TradingAlert.fromEnv(log).run();
  log.info(
    { durationMs: Date.now() - startedAt, alertSent: result.alertSent, position: result.position },
    'run complete',
  );
} catch (err) {
  log.error(
    {
      err: Logger.redact(err.message),
      stack: Logger.redact(err.stack),
      durationMs: Date.now() - startedAt,
    },
    'run failed',
  );
  process.exit(1);
}

export { TradingAlert };
