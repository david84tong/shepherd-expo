# Statsig Integration Guide

This guide shows how to use Statsig for A/B testing and feature flags in the Shepherd app.

## Setup Complete ✅

- ✅ Installed `@statsig/react-native-bindings` 
- ✅ Added `react-native-device-info` dependency
- ✅ Created Statsig configuration in `app/utils/statsig.ts`
- ✅ Created custom hooks in `app/hooks/useStatsig.ts`
- ✅ Integrated into app initialization in `app/hooks/initHook.ts`
- ✅ Wrapped app with `StatsigProviderRN` in `app/_layout.tsx`
- ✅ Added debug controls in `components/DebugModal.tsx`
- ✅ Created example component `app/components/StatsigExample.tsx`

## API Key

The app is configured with API key: `client-LAixqahMmfzNlU3BfjILljTL4KaWeGAG0lJhv2pxBAv`

## How to Use

### 1. Feature Gates

Use feature gates to enable/disable features for specific users:

```tsx
import { useFeatureGate } from '../utils/statsig';

function MyComponent() {
  const isNewUIEnabled = useFeatureGate('new_ui_enabled');
  
  return (
    <div>
      {isNewUIEnabled ? <NewUI /> : <OldUI />}
    </div>
  );
}
```

### 2. Experiments

Use experiments to test different variants:

```tsx
import { useStatsigExperiment } from '../hooks/useStatsig';

function MyComponent() {
  const { experiment } = useStatsigExperiment('button_color_test');
  const buttonColor = experiment.button_color || 'blue';
  
  return <Button color={buttonColor}>Click me</Button>;
}
```

### 3. Dynamic Configs

Use configs for dynamic values:

```tsx
import { useStatsigConfig } from '../hooks/useStatsig';

function MyComponent() {
  const { config } = useStatsigConfig('app_settings');
  const maxRetries = config.max_retries || 3;
  
  // Use maxRetries in your logic
}
```

### 4. Event Logging

Log custom events for analytics:

```tsx
import { useStatsigEvents } from '../hooks/useStatsig';

function MyComponent() {
  const { logEvent, logButtonClick } = useStatsigEvents();
  
  const handleClick = () => {
    logButtonClick('purchase_button', 'checkout_screen');
    // or
    logEvent('custom_event', 'value', { metadata: 'here' });
  };
}
```

### 5. Using Statsig Client Directly

For advanced usage, access the client directly:

```tsx
import { useStatsigClient } from '../utils/statsig';

function MyComponent() {
  const { client } = useStatsigClient();
  
  const handleAdvancedCheck = () => {
    if (client) {
      const gate = client.checkGate('advanced_feature');
      const config = client.getConfig('advanced_config');
      const experiment = client.getExperiment('advanced_experiment');
      
      client.logEvent('advanced_interaction', { 
        gate_result: gate,
        config_value: config.value,
        experiment_variant: experiment.value 
      });
    }
  };
}
```

## User Context

The app automatically provides user context to Statsig including:

- User ID (Firebase UID)
- Email (if available)
- Anonymous status
- Pro status
- Streak days
- Total XP
- Hearts count
- Current level
- Onboarding completion
- Selected path ID
- Lamb level

This allows you to target experiments and feature gates based on user attributes.

## Creating Experiments in Statsig Console

1. Go to your Statsig console
2. Create a new feature gate, experiment, or config
3. Set up targeting rules based on user attributes
4. Deploy your changes
5. Use the corresponding hook in your React Native code

## Example Experiments to Create

### Feature Gates
- `new_home_screen` - Test new home screen design
- `premium_features` - Gate premium features
- `debug_mode` - Enable debug features for internal users

### Experiments  
- `onboarding_flow` - Test different onboarding steps
- `lamb_animation_speed` - Test different animation speeds
- `prayer_reminder_frequency` - Test reminder intervals

### Dynamic Configs
- `app_settings` - Dynamic app configuration
- `notification_templates` - Different notification texts
- `api_endpoints` - Switch between API environments

## Testing

Use the debug modal (🧪 Statsig Testing section) to:
- View current feature gate states
- Check experiment values
- Log test events
- Update user context

## Notes

- The integration uses the provider pattern for optimal performance
- User context is automatically synced when user data changes
- All hooks handle loading states automatically
- Events are logged asynchronously
- The app works gracefully if Statsig is unavailable