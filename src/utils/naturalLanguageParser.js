import { getTodayDateStr } from './dateHelpers';

/**
 * Natural Language Expense Parser
 * Parses plain text input into a structured expense object.
 */
const CATEGORY_KEYWORDS = {
  food: ['coffee', 'lunch', 'dinner', 'breakfast', 'tea', 'snacks', 'food', 'restaurant', 'burger', 'pizza', 'swiggy', 'zomato', 'cafe', 'eat'],
  transportation: ['taxi', 'cab', 'uber', 'ola', 'metro', 'bus', 'auto', 'fuel', 'petrol', 'diesel', 'train', 'flight', 'fare'],
  shopping: ['clothes', 'shirt', 'shoes', 'amazon', 'flipkart', 'shopping', 'mall', 'wear', 'dress'],
  bills: ['recharge', 'electricity', 'wifi', 'internet', 'bill', 'rent', 'mobile', 'subscription', 'water', 'gas'],
  entertainment: ['movie', 'cinema', 'netflix', 'spotify', 'game', 'concert', 'event', 'show', 'tickets'],
  personal: ['barber', 'haircut', 'salon', 'medicine', 'doctor', 'spa', 'cosmetics', 'gym', 'pharmacy'],
  household: ['groceries', 'milk', 'vegetables', 'fruits', 'supermarket', 'household', 'clean', 'detergent', 'cleaning'],
};

export function parseNaturalLanguageExpense(inputStr) {
  if (!inputStr || typeof inputStr !== 'string') {
    return null;
  }

  const cleanText = inputStr.trim();
  if (!cleanText) return null;

  // 1. Extract Amount (matches numbers, e.g., 250, Rs 250, $250, 250.50)
  const amountMatch = cleanText.match(/(?:(?:rs|inr|\$|€|£)\s*)?(\d+(?:\.\d{1,2})?)/i);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;

  // 2. Extract Date (check for "yesterday" or "today")
  let targetDate = getTodayDateStr();
  if (/\byesterday\b/i.test(cleanText)) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    targetDate = yesterday.toISOString().split('T')[0];
  }

  // 3. Category Detection by Keywords
  let detectedCategory = 'other';
  const lowerText = cleanText.toLowerCase();

  for (const [catId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lowerText.includes(kw))) {
      detectedCategory = catId;
      break;
    }
  }

  // 4. Extract Description (remove common words like "spent", "on", "rs", "for", numbers)
  let description = cleanText
    .replace(/(?:spent|paid|bought|for|on|rs|inr|\$|yesterday|today)\b/gi, '')
    .replace(/\d+(?:\.\d{1,2})?/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!description) {
    description = detectedCategory !== 'other' ? detectedCategory : 'Quick Expense';
  } else {
    // Capitalize first letter
    description = description.charAt(0).toUpperCase() + description.slice(1);
  }

  return {
    description,
    unitPrice: amount,
    quantity: 1,
    totalAmount: amount,
    category: detectedCategory,
    date: targetDate,
    notes: `Quick entry: "${cleanText}"`,
  };
}
