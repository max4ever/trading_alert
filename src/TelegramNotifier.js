export class TelegramNotifier {
  constructor(alertUrl) {
    this.alertUrl = alertUrl;
  }

  // The .env URL already carries the bot token and chat_id; we just add the text.
  async send(message) {
    const url = new URL(this.alertUrl);
    url.searchParams.set('text', message);

    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Alert failed: ${res.status} ${res.statusText} ${body}`.trim());
    }
  }

  static format({ symbol, price, sma, period, position, diffPct }) {
    const arrow = position === 'above' ? '🟢' : '🔴';
    const sign = diffPct >= 0 ? '+' : '';
    return (
      `${arrow} ${symbol} is ${position} its SMA${period}\n` +
      `Price: $${price.toFixed(2)}\n` +
      `SMA${period}: $${sma.toFixed(2)}\n` +
      `Diff: ${sign}${diffPct.toFixed(2)}%`
    );
  }
}
