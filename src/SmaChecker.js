import { SMA } from 'trading-signals';

export class SmaChecker {
  constructor(period = 200) {
    this.period = period;
  }

  average(closes) {
    if (closes.length < this.period) {
      throw new Error(`Need ${this.period} closes for the SMA, got ${closes.length}`);
    }

    // Feed the whole series; the last value is the SMA over the final `period` bars.
    const sma = new SMA(this.period);
    let result = null;
    for (const close of closes) {
      result = sma.update(close, false);
    }

    if (result === null) throw new Error(`SMA${this.period} did not stabilise`);
    return Number(result);
  }

  check({ symbol, price, closes }) {
    const sma = this.average(closes);
    return {
      symbol,
      price,
      sma,
      period: this.period,
      position: price >= sma ? 'above' : 'below',
      diffPct: ((price - sma) / sma) * 100,
    };
  }
}
