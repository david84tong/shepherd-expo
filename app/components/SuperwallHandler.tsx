import React, { useEffect } from 'react';
import { usePlacement, useSuperwallEvents, useUser } from 'expo-superwall';
import analytics from '~/utils/analytics';
import { setPresentPlacementImpl, setUserAttributesImplFn } from '~/app/utils/superwallBridge';
import useSubscriptionStore from '~/app/stores/subscriptionStore';

const SuperwallHandler: React.FC = () => {
	const { registerPlacement } = usePlacement();
	const { setAttributes } = useUser();

	useEffect(() => {
		setPresentPlacementImpl(async (placement: string, params?: Record<string, any>) => {
			await registerPlacement({ placement, ...params });
		});
		setUserAttributesImplFn(async (attrs: Record<string, any>) => {
			await setAttributes(attrs);
		});
	}, [registerPlacement, setAttributes]);

	useSuperwallEvents((eventInfo) => {
		try {
			analytics.logEvent('superwall_event', {
				type: (eventInfo as any)?.event?.type ?? 'unknown',
				data: eventInfo,
			});
			// After any paywall interaction, refresh subscription status
			setTimeout(() => {
				useSubscriptionStore.getState().forceRefreshProStatus();
			}, 1000);
		} catch {}
	});

	return null;
};

export default SuperwallHandler;