export const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'Indian Rupee (₹)', locale: 'en-IN' },
  { code: 'USD', symbol: '$', label: 'US Dollar ($)', locale: 'en-US' },
  { code: 'EUR', symbol: '€', label: 'Euro (€)', locale: 'de-DE' },
  { code: 'GBP', symbol: '£', label: 'British Pound (£)', locale: 'en-GB' },
  { code: 'AED', symbol: 'AED', label: 'UAE Dirham (AED)', locale: 'ar-AE' },
  { code: 'SAR', symbol: 'SAR', label: 'Saudi Riyal (SAR)', locale: 'ar-SA' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar (C$)', locale: 'en-CA' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar (A$)', locale: 'en-AU' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen (¥)', locale: 'ja-JP' },
];

export const formatCurrency = (amount, currencyCode = 'INR') => {
  const numericAmount = Number(amount) || 0;
  const currency = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];
  
  // Format with standard number formatting
  const formatted = new Intl.NumberFormat(currency.locale, {
    minimumFractionDigits: numericAmount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
  
  return `${currency.symbol}${formatted}`;
};
