import YahooFinance from 'yahoo-finance2';

export class YahooClient {
  #yf;

  constructor(options = {}) {
    this.#yf = new YahooFinance({ suppressNotices: ['yahooSurvey'], ...options });
  }

  // Returns daily closes oldest -> newest, plus the latest close.
  // `minBars` is in trading days; ~252 of those fit in a calendar year, so we
  // ask for a wider calendar window and let the buffer absorb holidays.
  async getDailyCloses(symbol, minBars) {
    const calendarDays = Math.ceil(minBars * 1.6) + 30;
    const period1 = new Date(Date.now() - calendarDays * 24 * 60 * 60 * 1000);

    const { meta, quotes } = await this.#yf.chart(symbol, { period1, interval: '1d' });

    // Yahoo pads the series with nulls on holidays / the in-progress bar.
    const bars = quotes.filter((q) => typeof q.close === 'number');
    if (bars.length === 0) throw new Error(`No closing prices returned for ${symbol}`);

    const latest = bars[bars.length - 1];

    // Signals are judged on closes, not on meta.regularMarketPrice: that is the
    // live intraday price while the market is open, which would fire on a dip
    // that recovers by the bell. Outside hours it is only the last close
    // rounded to 2dp anyway. `asOf` says which session the signal refers to.
    return {
      symbol: meta?.symbol ?? symbol,
      price: latest.close,
      asOf: latest.date,
      closes: bars.map((q) => q.close),
    };
  }
}
