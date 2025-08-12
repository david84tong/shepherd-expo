# 🧪 Statsig Analytics Integration

Your analytics system now automatically sends events to **THREE platforms simultaneously**:

## 📊 Current Analytics Stack

1. **Mixpanel** - User behavior analytics
2. **Amplitude** - Product analytics  
3. **Statsig** - Experiment analytics (NEW!)

## 🔗 Integration Complete

Every time you call `analytics.trackEvent()` or `trackEvent()`, the event is now automatically sent to all three platforms:

```typescript
// This single call now sends to Mixpanel, Amplitude, AND Statsig!
trackEvent('button_clicked', {
  button_name: 'purchase_button',
  screen: 'checkout',
  user_type: 'premium'
});
```

## 🚀 How It Works

### 1. **Unified Event Logging**
**File:** `utils/analytics.ts` (lines 94-96)
```typescript
amplitudeTrack(eventName, mergedProperties);

// Also log to Statsig
logToStatsig(eventName, eventName, mergedProperties);
```

### 2. **Automatic Client Setup**
**File:** `app/components/StatsigAnalyticsInitializer.tsx`
- Automatically connects Statsig client to analytics system
- Runs early in app lifecycle
- No additional setup needed

### 3. **App Integration**
**File:** `app/_layout.tsx` (lines 936, 1033)
```tsx
<StatsigProviderRN>
  <StatsigAnalyticsInitializer>
    {/* Your entire app */}
  </StatsigAnalyticsInitializer>
</StatsigProviderRN>
```

## 📈 What This Gives You

### **Experiment Event Tracking**
- All user interactions automatically tracked in Statsig
- Use for conversion funnel analysis
- Correlate behavior with experiment variants

### **Rich User Context**
Events include:
- User ID, email, pro status
- Streak days, XP, hearts, level
- Platform (iOS/Android)
- All custom properties you add

### **Example Event Flow**

When a user clicks "Start Reading":

```typescript
// Your existing code (unchanged)
trackEvent('start_reading_clicked', {
  path_id: 'genesis',
  chapter: 1,
  time_of_day: 'morning'
});
```

**What happens automatically:**
1. ✅ **Mixpanel** gets the event
2. ✅ **Amplitude** gets the event  
3. ✅ **Statsig** gets the event (NEW!)
4. ✅ Event includes all user context (streak, level, etc.)

## 🎯 Use Cases for Statsig Events

### **A/B Test Analysis**
```typescript
// Test different onboarding flows
trackEvent('onboarding_completed', {
  variant: 'new_flow_v2',
  completion_time_seconds: 120,
  steps_completed: 5
});
```

### **Feature Adoption**
```typescript
// Track premium feature usage
trackEvent('premium_feature_used', {
  feature: 'custom_devotionals',
  user_tier: 'pro',
  days_since_signup: 14
});
```

### **Conversion Tracking**
```typescript
// Track subscription events
trackEvent('subscription_purchased', {
  plan: 'monthly_premium',
  experiment_variant: 'discount_50_percent',
  conversion_flow: 'paywall_v3'
});
```

## 🔧 Benefits

1. **Zero Code Changes** - Existing analytics calls work unchanged
2. **Automatic Context** - User data automatically included
3. **Experiment Ready** - Events immediately available for analysis
4. **Unified Dashboard** - View all data in Statsig console

## 📊 Statsig Console

Your events will appear in the Statsig console under:
- **Events** tab - See all logged events
- **Metrics** tab - Create conversion metrics
- **Experiments** tab - Use events as success metrics

## Example: Create a Conversion Metric

1. Go to Statsig console
2. Navigate to **Metrics**
3. Create new metric: "Daily Reading Completion"
4. Use event: `reading_completed`
5. Add to experiments as success criteria

Now you can run A/B tests and automatically measure their impact on reading completion rates!

## 🧪 Next Steps

1. **Create experiments** in Statsig console
2. **Use feature gates** in your React components
3. **Set up conversion metrics** using your existing events
4. **Analyze results** with rich user context

Your analytics system is now supercharged for experimentation! 🚀