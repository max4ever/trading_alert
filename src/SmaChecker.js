import { SMA } from 'trading-signals';

export class SmaChecker {
  constructor(period) {
    this.period = period;
  }

  // SMA value for every bar, aligned to `closes`. null until enough inputs.
  series(closes) {
    if (closes.length < this.period) {
      throw new Error(`Need ${this.period} closes for the SMA, got ${closes.length}`);
    }

    const sma = new SMA(this.period);
    return closes.map((close) => {
      const value = sma.update(close, false);
      return value === null ? null : Number(value);
    });
  }

  average(closes) {
    const series = this.series(closes);
    return series[series.length - 1];
  }

  check({ symbol, price, closes, asOf }) {
    const smaSeries = this.series(closes);
    const sma = smaSeries[smaSeries.length - 1];

    // above/below for each bar we have an SMA for, all on a closing basis.
    const positions = closes.map((close, i) =>
      smaSeries[i] === null ? null : close >= smaSeries[i] ? 'above' : 'below',
    );
    const position = positions[positions.length - 1];

    // Walk back to the most recent flip. 0 = crossed on the latest bar (today),
    // 1 = the bar before it, and so on. null = no cross in the data we hold.
    let barsSinceCross = null;
    const last = positions.length - 1;
    for (let i = last; i > 0; i--) {
      if (positions[i - 1] === null) break;
      if (positions[i] !== positions[i - 1]) {
        barsSinceCross = last - i;
        break;
      }
    }

    return {
      symbol,
      price,
      sma,
      asOf,
      period: this.period,
      position,
      diffPct: ((price - sma) / sma) * 100,
      barsSinceCross,
    };
  }
}
