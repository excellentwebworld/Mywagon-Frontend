/**
 * greekUppercase.js
 *
 * Converts text to uppercase with proper Greek handling:
 * - Removes accent marks (τόνος) from uppercase Greek letters
 * - ΠΑΡΑΛΑΒΉ → ΠΑΡΑΛΑΒΗ (correct)
 * - Preserves diaeresis (¨) in uppercase: ΜΑΪΟΥ stays ΜΑΪΟΥ
 *
 * Use this instead of CSS text-transform: uppercase for any
 * text that may contain Greek characters.
 */

const ACCENT_MAP = {
  'Ά': 'Α', 'Έ': 'Ε', 'Ή': 'Η', 'Ί': 'Ι', 'Ό': 'Ο', 'Ύ': 'Υ', 'Ώ': 'Ω',
  'ά': 'Α', 'έ': 'Ε', 'ή': 'Η', 'ί': 'Ι', 'ό': 'Ο', 'ύ': 'Υ', 'ώ': 'Ω',
  'ΐ': 'Ϊ', 'ΰ': 'Ϋ',
};

export function toUpperGreek(str) {
  if (!str) return '';
  return str.toUpperCase().replace(/[ΆΈΉΊΌΎΏ]/g, (ch) => ACCENT_MAP[ch] || ch);
}
