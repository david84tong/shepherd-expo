# Language Detection System

This system automatically detects the user's device language and sets the app's default language accordingly. If the user's device language is supported by the app, it will be used. If not, the app falls back to English.

## Supported Languages

Currently, the app supports the following languages:
- **English** (en) - Default fallback
- **Spanish** (es) - Español
- **Portuguese** (pt) - Português
- **Dutch** (nl) - Nederlands
- **French** (fr) - Français
- **German** (de) - Deutsch

## How It Works

### 1. Device Language Detection
When a user first installs the app:
1. The system checks the device's locale setting
2. If the device language is supported (e.g., French), it uses that language
3. If the device language is not supported (e.g., Urdu), it falls back to English
4. The detected language is stored in AsyncStorage for future app launches

### 2. Language Persistence
- User's language preference is stored in AsyncStorage
- On subsequent app launches, the stored preference is used
- Users can manually change the language, and this preference is saved

## Usage Examples

### Basic Usage in Components

```typescript
import { useLanguageDetection } from '../app/hooks/useLanguageDetection';
import { setAppLanguage } from '../app/utils/languageUtils';
import i18n from '../app/utils/i18n';

const MyComponent = () => {
  const { detectedLanguage, isLanguageSupported } = useLanguageDetection();

  const changeLanguage = async (languageCode: string) => {
    await setAppLanguage(languageCode);
  };

  return (
    <View>
      <Text>Device Language: {detectedLanguage}</Text>
      <Text>Is Supported: {isLanguageSupported ? 'Yes' : 'No'}</Text>
      <Text>Current App Language: {i18n.locale}</Text>
    </View>
  );
};
```

### Using Translations

```typescript
import i18n from '../app/utils/i18n';

// Use translations
<Text>{i18n.t('welcome_message')}</Text>
```

### Language Selection UI

```typescript
import { getSupportedLanguagesList, getLanguageDisplayName } from '../app/utils/i18n';

const LanguageSelector = () => {
  const languages = getSupportedLanguagesList();
  
  return (
    <View>
      {languages.map((lang) => (
        <TouchableOpacity key={lang.code} onPress={() => setAppLanguage(lang.code)}>
          <Text>{lang.name}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};
```

## API Reference

### `useLanguageDetection` Hook

Returns:
- `detectedLanguage`: The language code detected from the device
- `isLanguageSupported`: Boolean indicating if the detected language is supported
- `isLoading`: Boolean indicating if detection is in progress
- `supportedLanguages`: Array of all supported languages
- `getLanguageDisplayName`: Function to get display name for a language code

### `setAppLanguage(language: SupportedLanguage)`

Sets the app language and stores the preference.

### `getCurrentAppLanguage()`

Gets the currently stored app language preference.

### `resetToDeviceLanguage()`

Resets the language to the device default and removes stored preference.

### `detectDeviceLanguage()`

Detects the best language to use based on device locale.

### `getSupportedLanguagesList()`

Returns an array of supported languages with their display names.

## Testing Different Languages

To test the language detection:

1. **iOS Simulator**: Go to Settings > General > Language & Region
2. **Android Emulator**: Go to Settings > System > Languages & input > Languages
3. **Physical Device**: Change the device language in system settings

## Adding New Languages

To add support for a new language:

1. Create a new JSON file in `locales/` (e.g., `it.json` for Italian)
2. Add the language to `SUPPORTED_LANGUAGES` in `app/utils/i18n.ts`
3. Import the new language file in `app/utils/i18n.ts`
4. Add the language to the i18n instance

Example:
```typescript
// In app/utils/i18n.ts
import it from '../../locales/it.json';

export const SUPPORTED_LANGUAGES = {
  en: 'English',
  es: 'Español',
  // ... other languages
  it: 'Italiano', // Add new language
} as const;

const i18n = new I18n({ en, es, pt, nl, fr, de, it }); // Add to i18n instance
``` 