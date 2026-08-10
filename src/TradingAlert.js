export class TradingAlert {
  #config;
  #client;
  #checker;
  #notifier;
  #log;

  constructor(config, client, checker, notifier, log) {
    this.#config = config;
    this.#client = client;
    this.#checker = checker;
    this.#notifier = notifier;
    this.#log = log;
  }

  // Only the session it actually crossed is worth a message. Nothing is stored
  // between runs: the price history fetched each time says when the cross was.
  #shouldAlert({ barsSinceCross }) {
    if (this.#config.forceAlert) return { send: true, reason: 'forced' };
    if (barsSinceCross === 0) return { send: true, reason: 'crossed on latest session' };
    return {
      send: false,
      reason:
        barsSinceCross === null ? 'no cross found' : `last cross was ${barsSinceCross} sessions ago`,
    };
  }

  async run() {
    const { symbol, smaPeriod } = this.#config;

    const fetchedAt = Date.now();
    const quote = await this.#client.getDailyCloses(symbol, smaPeriod);
    const fetchMs = Date.now() - fetchedAt;

    const result = this.#checker.check(quote);
    this.#log.info(
      {
        symbol: result.symbol,
        close: Number(result.price.toFixed(4)),
        sma: Number(result.sma.toFixed(4)),
        asOf: result.asOf?.toISOString().slice(0, 10),
        period: result.period,
        position: result.position,
        diffPercent: Number(result.diffPercent.toFixed(2)),
        barsSinceCross: result.barsSinceCross,
        bars: quote.closes.length,
        fetchMs,
      },
      `${result.symbol} is ${result.position} its SMA${result.period}`,
    );

    const { send, reason } = this.#shouldAlert(result);
    if (!send) {
      this.#log.info({ barsSinceCross: result.barsSinceCross, reason }, 'alert skipped');
      return { ...result, alertSent: false };
    }

    const sentAt = Date.now();
    await this.#notifier.send(result);
    this.#log.info({ sendMs: Date.now() - sentAt, reason }, 'alert sent');

    return { ...result, alertSent: true };
  }
}
