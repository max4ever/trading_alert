import { Config } from './Config.js';
import { Logger } from './Logger.js';
import { SmaChecker } from './SmaChecker.js';
import { TelegramNotifier } from './TelegramNotifier.js';
import { TradingAlert } from './TradingAlert.js';
import { YahooClient } from './YahooClient.js';

const log = new Logger();
const startedAt = Date.now();

try {
  const config = new Config();
  const app = new TradingAlert(
    config,
    new YahooClient(),
    new SmaChecker(config.smaPeriod),
    new TelegramNotifier(config.alertUrl),
    log,
  );

  const result = await app.run();
  log.info(
    {
      durationMs: Date.now() - startedAt,
      alertSent: result.alertSent,
      position: result.position,
      barsSinceCross: result.barsSinceCross,
    },
    'run complete',
  );
} catch (err) {
  log.error({ err, durationMs: Date.now() - startedAt }, 'run failed');
  process.exit(1);
}
