import React, { useEffect, useRef } from 'react';
import { usePlacement, useSuperwallEvents, useUser } from 'expo-superwall';
import analytics from '~/utils/analytics';
import { setPresentPlacementImpl, setUserAttributesImplFn } from '~/app/utils/superwallBridge';
import useSubscriptionStore from '~/app/stores/subscriptionStore';

const SuperwallHandler: React.FC = () => {
	const { registerPlacement } = usePlacement();
	const userApi = useUser() as any;
	const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		setPresentPlacementImpl(async (placement: string, params?: Record<string, any>) => {
			await registerPlacement({ placement, ...params });
		});
		setUserAttributesImplFn(async (attrs: Record<string, any>) => {
			if (userApi?.update) {
				await userApi.update(attrs);
			} else if (userApi?.setAttributes) {
				await userApi.setAttributes(attrs);
			}
		});
	}, [registerPlacement, userApi]);

	useSuperwallEvents(((eventInfo: any) => {
		try {
			analytics.logEvent('superwall_event', {
				type: (eventInfo as any)?.event?.type ?? 'unknown',
				data: eventInfo,
			});
			// After any paywall interaction, refresh subscription status
			if (refreshTimeoutRef.current) {
				clearTimeout(refreshTimeoutRef.current);
			}
			refreshTimeoutRef.current = setTimeout(() => {
				useSubscriptionStore.getState().forceRefreshProStatus();
				refreshTimeoutRef.current = null;
			}, 1000);
		} catch {}
	}) as any);

	// Cleanup any pending timeout on unmount to avoid leaking timers across app sessions
	useEffect(() => {
		return () => {
			if (refreshTimeoutRef.current) {
				clearTimeout(refreshTimeoutRef.current);
				refreshTimeoutRef.current = null;
			}
		};
	}, []);

	return null;
};

export default SuperwallHandler;
