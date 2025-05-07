/**
 * Utility function to convert string values to boolean
 * Used in navigation params handling
 */
export function toBool(value: string | string[] | undefined): boolean {
  if (!value) return false;
  
  const stringValue = Array.isArray(value) ? value[0] : value;
  
  return stringValue === 'true' || stringValue === '1' || stringValue === 'yes';
}