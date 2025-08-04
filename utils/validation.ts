// List of common curse words to filter out
const CURSE_WORDS = [
  'fuck', 'shit', 'ass', 'bitch', 'damn', 'hell', 'crap', 'piss', 'dick', 'cock',
  'pussy', 'cunt', 'whore', 'slut', 'bastard', 'motherfucker', 'fucker', 'shithead',
  'dumbass', 'jackass', 'douchebag', 'douche', 'twat', 'wank', 'wanker', 'fag', 'faggot',
  'nigger', 'nigga', 'retard', 'retarded', 'idiot', 'stupid', 'dumb', 'moron'
];

// Regular expression to match special characters
const SPECIAL_CHARS_REGEX = /[?()\-+!@#$%^&*_=+[\]{};:'"\\|,.<>\/]/;

/**
 * Validates a username or lamb name
 * @param input The input string to validate
 * @returns An object containing validation result and error message if any
 */
export const validateName = (input: string): { isValid: boolean; error?: string } => {
  // Import i18n dynamically to avoid circular dependencies
  const i18n = require('../app/utils/i18n').default;
  
  // Check if input is empty
  if (!input.trim()) {
    return { isValid: false, error: i18n.t('validation_name_empty') };
  }

  // Check length (max 16 characters)
  if (input.length > 16) {
    return { isValid: false, error: i18n.t('validation_name_too_long') };
  }

  // Check for special characters
  if (SPECIAL_CHARS_REGEX.test(input)) {
    return { isValid: false, error: i18n.t('validation_name_special_chars') };
  }

  // Check for curse words (case insensitive)
  const lowerInput = input.toLowerCase();
  if (CURSE_WORDS.some(word => lowerInput.includes(word))) {
    return { isValid: false, error: i18n.t('validation_name_inappropriate') };
  }

  return { isValid: true };
};

/**
 * Validates a username with uniqueness checking
 * @param input The input string to validate
 * @param isUnique Whether the username is unique (from Firestore check)
 * @returns An object containing validation result and error message if any
 */
export const validateUsername = (
  input: string, 
  isUnique: boolean = true
): { isValid: boolean; error?: string } => {
  // Import i18n dynamically to avoid circular dependencies
  const i18n = require('../app/utils/i18n').default;
  
  console.log('🔍 validateUsername called with:', { input, isUnique });
  
  // First check basic validation
  const basicValidation = validateName(input);
  console.log('🔍 Basic validation result:', basicValidation);
  
  if (!basicValidation.isValid) {
    return basicValidation;
  }

  // Check if username is unique
  if (!isUnique) {
    console.log('❌ Username is not unique, returning taken error');
    return { isValid: false, error: i18n.t('validation_username_taken') };
  }

  console.log('✅ Username is valid and unique');
  return { isValid: true };
}; 