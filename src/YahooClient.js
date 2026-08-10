import YahooFinance from 'yahoo-finance2';

export class YahooClient {
  constructor(options = {}) {
    this.yf = new YahooFinance({ suppressNotices: ['yahooSurvey'], ...options });
  }

  // Returns daily closes oldest -> newest, plus the latest price.
  // `minBars` is in trading days; ~252 of those fit in a calendar year, so we
  // ask for a wider calendar window and let the buffer absorb holidays.
  async getDailyCloses(symbol, minBars = 200) {
    const calendarDays = Math.ceil(minBars * 1.6) + 30;
    const period1 = new Date(Date.now() - calendarDays * 24 * 60 * 60 * 1000);

    const { meta, quotes } = await this.yf.chart(symbol, { period1, interval: '1d' });

    // Yahoo pads the series with nulls on holidays / the in-progress bar.
    const closes = quotes.map((q) => q.close).filter((c) => typeof c === 'number');
    if (closes.length === 0) throw new Error(`No closing prices returned for ${symbol}`);

    return {
      symbol: meta?.symbol ?? symbol,
      price: meta?.regularMarketPrice ?? closes[closes.length - 1],
      closes,
    };
  }
}
