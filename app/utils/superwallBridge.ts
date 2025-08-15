export type PresentPlacementFn = (placement: string, params?: Record<string, any>) => Promise<void>;

let presentPlacementImpl: PresentPlacementFn | null = null;
let setUserAttributesImpl: ((attrs: Record<string, any>) => Promise<void>) | null = null;

export const setPresentPlacementImpl = (fn: PresentPlacementFn) => {
	presentPlacementImpl = fn;
};

export const setUserAttributesImplFn = (fn: (attrs: Record<string, any>) => Promise<void>) => {
	setUserAttributesImpl = fn;
};

export async function presentSuperwallPlacement(placement: string, params?: Record<string, any>) {
	if (!presentPlacementImpl) throw new Error('Superwall not ready');
	return presentPlacementImpl(placement, params);
}

export async function setSuperwallUserAttributes(attrs: Record<string, any>) {
	if (!setUserAttributesImpl) return; // ignore silently until ready
	return setUserAttributesImpl(attrs);
}
