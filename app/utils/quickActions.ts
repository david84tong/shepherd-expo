import * as QuickActions from 'expo-quick-actions';
import { Linking } from 'react-native';
import { analytics } from '../../utils/analytics';

// Define the quick action types
export const QUICK_ACTION_TYPES = {
  REPORT_BUG: 'report_bug',
  SHARE_FEEDBACK: 'share_feedback',
  GET_DISCOUNT: 'get_discount',
} as const;

// Quick action configuration
const quickActionsConfig = [
  {
    id: QUICK_ACTION_TYPES.REPORT_BUG,
    title: '🐞 Report Bug',
    subtitle: 'Sorry! We\'ll respond within 24 hours with a fix',
    icon: 'symbol:ladybug', // iOS SF Symbol
  },
  {
    id: QUICK_ACTION_TYPES.SHARE_FEEDBACK,
    title: '👋 Share Feedback',
    subtitle: 'Are we missing a feature? Let us know and get a free gift',
    icon: 'symbol:message', // iOS SF Symbol
  },
  {
    id: QUICK_ACTION_TYPES.GET_DISCOUNT,
    title: '🎁 Get 80% OFF',
    subtitle: 'Too expensive? We got something for you',
    icon: 'symbol:gift', // iOS SF Symbol
  },
];

// URLs for the forms
const FORM_URLS = {
  [QUICK_ACTION_TYPES.REPORT_BUG]: 'https://www.notion.so/tryshepherd/22a6cf0c24228160961be095f59191b1',
  [QUICK_ACTION_TYPES.SHARE_FEEDBACK]: 'https://tryshepherd.notion.site/2356cf0c2422802d9244d0178f755742?pvs=105',
};

// Deep link for discount action
export const DISCOUNT_DEEP_LINK = 'io.bytehouse://discount';

/**
 * Set up quick actions for the app
 */
export const setupQuickActions = async () => {
  try {
    await QuickActions.setItems(quickActionsConfig);
    console.log('Quick actions set up successfully');
  } catch (error) {
    console.error('Failed to set up quick actions:', error);
  }
};

/**
 * Handle quick action selection
 */
export const handleQuickAction = async (action: QuickActions.Action) => {
  // Track the quick action press
  analytics.trackEvent('quick_action_pressed', {
    action_id: action.id,
    action_title: action.title,
    action_subtitle: action.subtitle,
    source: 'quick_actions'
  });

  // Handle discount action with deep link
  if (action.id === QUICK_ACTION_TYPES.GET_DISCOUNT) {
    try {
      const supported = await Linking.canOpenURL(DISCOUNT_DEEP_LINK);
      if (supported) {
        await Linking.openURL(DISCOUNT_DEEP_LINK);
        // Track successful deep link opening
        analytics.trackEvent('quick_action_deep_link_opened', {
          action_id: action.id,
          deep_link: DISCOUNT_DEEP_LINK,
          success: true
        });
      } else {
        console.error('Cannot open deep link:', DISCOUNT_DEEP_LINK);
        // Track failed deep link opening
        analytics.trackEvent('quick_action_deep_link_failed', {
          action_id: action.id,
          deep_link: DISCOUNT_DEEP_LINK,
          success: false,
          error: 'unsupported_url'
        });
      }
    } catch (error) {
      console.error('Error opening deep link:', error);
      // Track error opening deep link
      analytics.trackEvent('quick_action_deep_link_error', {
        action_id: action.id,
        deep_link: DISCOUNT_DEEP_LINK,
        success: false,
        error: error instanceof Error ? error.message : 'unknown_error'
      });
    }
    return;
  }

  // Handle external form URLs
  const url = FORM_URLS[action.id as keyof typeof FORM_URLS];
  
  if (url) {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        // Track successful form URL opening
        analytics.trackEvent('quick_action_form_opened', {
          action_id: action.id,
          form_url: url,
          success: true
        });
      } else {
        console.error('Cannot open URL:', url);
        // Track failed form URL opening
        analytics.trackEvent('quick_action_form_failed', {
          action_id: action.id,
          form_url: url,
          success: false,
          error: 'unsupported_url'
        });
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      // Track error opening form URL
      analytics.trackEvent('quick_action_form_error', {
        action_id: action.id,
        form_url: url,
        success: false,
        error: error instanceof Error ? error.message : 'unknown_error'
      });
    }
  }
};

/**
 * Initialize quick actions listener
 */
export const initializeQuickActions = () => {
  // Set up the quick actions
  setupQuickActions();

  // Listen for quick action selections
  const subscription = QuickActions.addListener(handleQuickAction);

  // Return the subscription for cleanup
  return subscription;
}; 