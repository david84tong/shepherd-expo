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
  // Check if input is empty
  if (!input.trim()) {
    return { isValid: false, error: 'Name cannot be empty' };
  }

  // Check length (max 16 characters)
  if (input.length > 16) {
    return { isValid: false, error: 'Name must be 16 characters or less' };
  }

  // Check for special characters
  if (SPECIAL_CHARS_REGEX.test(input)) {
    return { isValid: false, error: 'Name cannot contain special characters' };
  }

  // Check for curse words (case insensitive)
  const lowerInput = input.toLowerCase();
  if (CURSE_WORDS.some(word => lowerInput.includes(word))) {
    return { isValid: false, error: 'Name contains inappropriate words' };
  }

  return { isValid: true };
}; 