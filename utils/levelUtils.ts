/**
 * Utility functions for calculating level, XP, and related values
 */

/**
 * Calculate XP required for a given level using quadratic scaling formula
 * Level 1: 90 XP
 * Level 2: 240 XP
 * Level 3: 450 XP
 * Level 4: 720 XP
 * etc.
 */
export const calculateExpForLevel = (level: number): number =>
  Math.round(30 * Math.pow(level, 2) + 60 * level);

/**
 * Calculate the current level based on total XP
 * This finds the highest level where XP >= required XP for that level
 */
export const calculateLevelFromXp = (xp: number): number => {
  let level = 1;
  while (xp >= calculateExpForLevel(level)) {
    level++;
  }
  return level - 1 || 1; // Ensure minimum level is 1
}

/**
 * Calculate XP needed for next level
 */
export const calculateXpForNextLevel = (xp: number): number => {
  const currentLevel = calculateLevelFromXp(xp);
  return calculateExpForLevel(currentLevel + 1);
}

/**
 * Calculate XP needed for current level
 */
export const calculateXpForCurrentLevel = (xp: number): number => {
  const currentLevel = calculateLevelFromXp(xp);
  return calculateExpForLevel(currentLevel);
}

/**
 * Calculate progress percentage toward next level (0-100)
 */
export const calculateLevelProgress = (xp: number): number => {
  const currentLevel = calculateLevelFromXp(xp);
  const xpForCurrentLevel = calculateExpForLevel(currentLevel);
  const xpForNextLevel = calculateExpForLevel(currentLevel + 1);
  
  // Calculate progress as a percentage of total XP toward next level XP
  // This matches the displayed ratio in the UI (e.g., 90/240)
  return Math.min((xp / xpForNextLevel) * 100, 100);
}

/**
 * Get all level data in a single object
 */
export const getLevelData = (xp: number) => {
  const level = calculateLevelFromXp(xp);
  const xpForCurrentLevel = calculateExpForLevel(level);
  const xpForNextLevel = calculateExpForLevel(level + 1);
  const xpProgress = xp - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  
  // Calculate progress as a percentage of total XP toward next level XP
  // This matches the displayed ratio in the UI (e.g., 90/240)
  const progress = Math.min((xp / xpForNextLevel) * 100, 100);
  
  return {
    level,
    xp,
    xpForCurrentLevel,
    xpForNextLevel,
    xpProgress,
    xpNeeded,
    progress
  };
} 