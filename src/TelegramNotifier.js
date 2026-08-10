export class TelegramNotifier {
  #alertUrl;

  constructor(alertUrl) {
    this.#alertUrl = alertUrl;
  }

  #format({ symbol, price, sma, period, position, diffPercent, barsSinceCross, asOf }) {
    const arrow = position === 'above' ? '🟢' : '🔴';
    const sign = diffPercent >= 0 ? '+' : '';

    let headline = `${arrow} ${symbol} crossed ${position.toUpperCase()} its SMA${period}`;
    if (barsSinceCross === null) headline = `${arrow} ${symbol} is ${position} its SMA${period}`;
    else if (barsSinceCross === 1) headline += ' (previous session)';
    else if (barsSinceCross > 1) headline += ` (${barsSinceCross} sessions ago)`;

    const session = asOf ? ` (${asOf.toISOString().slice(0, 10)})` : '';

    return (
      `${headline}\n` +
      `Close${session}: $${price.toFixed(2)}\n` +
      `SMA${period}: $${sma.toFixed(2)}\n` +
      `Diff: ${sign}${diffPercent.toFixed(2)}%`
    );
  }

  // The .env URL already carries the bot token and chat_id; we just add the text.
  async send(result) {
    const url = new URL(this.#alertUrl);
    url.searchParams.set('text', this.#format(result));

    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Alert failed: ${response.status} ${response.statusText} ${body}`.trim());
    }
  }
}
