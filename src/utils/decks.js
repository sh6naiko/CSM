export const canonicalDeckTitle = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
export const deckTitleKey = (value) =>
  canonicalDeckTitle(value).toLocaleLowerCase();
