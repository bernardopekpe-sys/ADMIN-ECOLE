const UNITS = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
const TEENS = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

function threeDigitsToWords(n: number): string {
  if (n === 0) return '';
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;
  let words = '';

  if (hundreds > 0) {
    words += (hundreds > 1 ? UNITS[hundreds] + ' cent' : 'cent') + (hundreds > 1 && remainder === 0 ? 's' : '');
    if (remainder > 0) words += ' ';
  }

  if (remainder > 0) {
    if (remainder < 10) {
      words += UNITS[remainder];
    } else if (remainder < 20) {
      words += TEENS[remainder - 10];
    } else {
      const tensDigit = Math.floor(remainder / 10);
      const unitDigit = remainder % 10;
      // soixante-dix / quatre-vingt-dix
      if (tensDigit === 7 || tensDigit === 9) {
        words += TENS[tensDigit] + '-' + TEENS[unitDigit];
      } else {
        words += TENS[tensDigit] + (unitDigit > 0 ? '-' + UNITS[unitDigit] : (tensDigit === 8 ? 's' : ''));
      }
    }
  }

  return words;
}

/** Convertit un montant entier en toutes lettres, en français, suffixé "francs CFA". */
export function amountToWordsFr(amount: number): string {
  const n = Math.round(amount);
  if (n === 0) return 'zéro franc CFA';

  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;

  const parts: string[] = [];
  if (millions > 0) parts.push(`${threeDigitsToWords(millions)} million${millions > 1 ? 's' : ''}`);
  if (thousands > 0) parts.push(`${thousands === 1 ? '' : threeDigitsToWords(thousands) + ' '}mille`.trim());
  if (rest > 0) parts.push(threeDigitsToWords(rest));

  const words = parts.join(' ').replace(/\s+/g, ' ').trim();
  const capitalized = words.charAt(0).toUpperCase() + words.slice(1);
  return `${capitalized} franc${n > 1 ? 's' : ''} CFA`;
}
