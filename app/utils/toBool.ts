export function toBool(val: unknown): boolean {
    if (Array.isArray(val)) val = val[0];
    if (val === true || val === 1) return true;
    if (typeof val === 'string' && (val === 'true' || val === '1')) return true;
    return false;
}