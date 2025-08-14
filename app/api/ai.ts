import { appLog } from "../helper/helper";
import { useUserStore } from '../stores/userStore';
import { useLanguageStore } from '../stores/languageStore';
import { getStatsigClient } from '../../utils/analytics';

interface BibleVerseContext {
  bookName: string;
  chapter: number;
  verse: number;
  verseText: string;
}

interface AIResponse {
  role: string;
  content: string;
}

export interface DevotionalAIResponse {
  title: string;
  context: string;
  prayer: string;
  reflectionPrompt: string;
  verse?: string;
  bibleReference?: string;
}

interface CheckInData {
  mood: string;
  focus: string;
  struggle: string;
  reflection?: string;
}

interface JournalReflectionData {
  mood: string;
  prayer: string;
}

export interface JournalResponseData {
  response: string;
  verse?: string;
  bibleReference?: string;
}

// Lightweight generation: produce a short prayer (2–3 sentences) and a reflection prompt
export interface QuickPrayerAndPrompt {
  prayer: string;
  reflectionPrompt: string;
}

/**
 * Helper function to get the GPT model from Statsig experiment
 * Defaults to 'gpt-5-nano' if experiment is not available
 */
function getExperimentGptModel(): string {
  const statsigClient = getStatsigClient();
  let modelName = 'gpt-5-nano'; // default
  if (statsigClient) {
    try {
      const gptModelExperiment = statsigClient.getExperiment('gpt-model');
      modelName = gptModelExperiment?.get?.('gptModel', 'gpt-5-nano') || 'gpt-5-nano';
      appLog('🧪 [GPT-MODEL] Using model from experiment:', modelName);
    } catch (error) {
      appLog('🧪 [GPT-MODEL] Error getting experiment, using default:', error);
    }
  }
  return modelName;
}

/**
 * Build GPT API URL with model and conditional params.
 * If model starts with 'gpt-5', append verbosity=low & reasoning_effort=minimal
 */
function buildGptApiUrl(modelName: string): string {
  const base = 'https://shepherd-dev-api.skylar.gg/oai/gpt';
  const isGpt5 = typeof modelName === 'string' && modelName.startsWith('gpt-5');
  const params = new URLSearchParams({ model: modelName });
  if (isGpt5) {
    params.set('verbosity', 'low');
    params.set('reasoning_effort', 'minimal');
  }
  console.log('🧪 [GPT-MODEL] Building API URL with params:', params.toString());
  return `${base}?${params.toString()}`;
}

/**
 * Generate a concise 2–3 sentence prayer and a single-sentence reflection prompt
 * based on the user's mood and raw prayer text. This is faster and cheaper than
 * full devotional generation and is intended for WaterPrayer and Journal flows.
 */
export async function generateQuickPrayerAndPrompt(
  mood: string,
  rawPrayer: string,
  idToken: string
): Promise<QuickPrayerAndPrompt> {
  // Build minimal user context
  const userStore = useUserStore.getState();
  const languageStore = useLanguageStore.getState();
  const userName = userStore.getDisplayName() || 'Friend';
  const userAge = userStore.getAgeRange() || '';
  const denomination = userStore.getDenomination() || '';
  const familiarity = userStore.getExperienceLevel() || 'new';
  const language = languageStore.language || 'en';

  const languageInstructions: Record<string, string> = {
    en: 'Respond in English.',
    es: 'Responde en español.',
    pt: 'Responda em português.',
    nl: 'Antwoord in het Nederlands.',
    fr: 'Répondez en français.',
    de: 'Antworten Sie auf Deutsch.'
  };
  const langNote = languageInstructions[language] || languageInstructions.en;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const modelName = getExperimentGptModel();
    const response = await fetch(buildGptApiUrl(modelName), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: `${langNote} You are a concise Christian guide. Create:
1) A 2–3 sentence heartfelt prayer grounded in Scripture themes, personalized to their mood and request.
2) A single-sentence reflection prompt that invites journaling and self-examination.
Keep tone warm and pastoral. Account for denomination and Bible familiarity level.`,
          },
          {
            role: 'user',
            content: `User: ${userName}. Age: ${userAge}. Denomination: ${denomination}. Familiarity: ${familiarity}.
Mood: ${mood}.
Their prayer: "${(rawPrayer || '').trim()}".

Respond as strict JSON with keys: {"prayer": string, "reflectionPrompt": string}.`,
          },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const data: AIResponse = await response.json();
    if (!data || typeof data.content !== 'string') {
      throw new Error('Invalid AI response');
    }
    const content = data.content.trim();
    let parsed: QuickPrayerAndPrompt | null = null;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }
    if (!parsed?.prayer || !parsed?.reflectionPrompt) {
      throw new Error('Missing prayer or reflectionPrompt');
    }
    return parsed;
  } catch (err) {
    appLog('[AI API] Quick generation failed, using local fallback:', err);
    // Simple local fallback
    const cleaned = (rawPrayer || '').trim();
    const prayer = cleaned
      ? `Lord, I lift up this prayer: "${cleaned}". Meet me in this ${mood.toLowerCase()} moment and guide my steps with Your peace. Strengthen my heart to trust You today. Amen.`
      : `Lord, You know my heart and my ${mood.toLowerCase()} feelings. Draw me close and steady my steps in Your presence. Fill me with Your wisdom and peace. Amen.`;
    const reflectionPrompt = cleaned
      ? 'What is one small next step of faith you can take in response to your prayer today?'
      : 'Where do you most need God’s presence and guidance today, and what would trusting Him look like?';
    return { prayer, reflectionPrompt };
  }
}

export async function getBibleVerseAIResponse(
  userQuestion: string,
  verseContext: BibleVerseContext,
  idToken: string,
  language: string = 'en'
): Promise<string> {
  try {
    // Create language-specific system prompt
    const languageInstructions = {
      en: 'Please respond in English.',
      es: 'Por favor responde en español.',
      pt: 'Por favor responda em português.',
      nl: 'Antwoord alstublieft in het Nederlands.',
      fr: 'Veuillez répondre en français.',
      de: 'Bitte antworten Sie auf Deutsch.'
    };

    const languageInstruction = languageInstructions[language as keyof typeof languageInstructions] || languageInstructions.en;

    const modelName = getExperimentGptModel();
    const response = await fetch(buildGptApiUrl(modelName), {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`
      },
      body: JSON.stringify({
        "messages": [
          {
            "role": "system",
            "content": `You are a Bible study assistant helping with ${verseContext.bookName} ${verseContext.chapter}:${verseContext.verse}: "${verseContext.verseText}". ${languageInstruction}`
          },
          {
            "role": "user",
            "content": userQuestion
          }
        ]
      })
    });

    const data: AIResponse = await response.json();

    // Validate response structure
    if (!data || !data.role || typeof data.content !== 'string') {
      console.error('Invalid API response structure:', data);
      throw new Error('Invalid API response format');
    }

    return data.content;
  } catch (error) {
    console.error('Error calling AI API:', error);
    throw error;
  }
}

export async function createDevotionalFromVerse(
  verseContext: BibleVerseContext,
  idToken: string
): Promise<DevotionalAIResponse> {
  try {
    appLog('[AI API] Starting devotional creation for:', {
      book: verseContext.bookName,
      chapter: verseContext.chapter,
      verse: verseContext.verse,
      verseTextLength: verseContext.verseText.length
    });

    // Check network connectivity first
    const isConnected = await checkNetworkConnectivity();
    appLog('[AI API] Network connectivity check:', isConnected);
    
    if (!isConnected) {
      appLog('[AI API] No network connectivity, using fallback devotional');
      return createFallbackDevotional(verseContext);
    }

    // Get user onboarding data from user store
    const userStore = useUserStore.getState();
    const languageStore = useLanguageStore.getState();
    
    // Extract user onboarding information
    const userName = userStore.getDisplayName() || 'Friend';
    const userAge = userStore.getAgeRange() || '';
    const userDenomination = userStore.getDenomination() || '';
    const userBibleFamiliarity = userStore.getExperienceLevel() || 'new';
    const userLanguage = languageStore.language || 'en';
    
    appLog('[AI API] User context for verse devotional:', {
      name: userName,
      age: userAge,
      denomination: userDenomination,
      bibleFamiliarity: userBibleFamiliarity,
      language: userLanguage
    });

    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      appLog('[AI API] Request timeout after 60 seconds');
      controller.abort();
    }, 60000); // 60 second timeout

    try {
      appLog('[AI API] Making fetch request to API...');
      
      // Build user context for the prompt
      let userContext = '';
      if (userName && userName !== 'Anonymous User') {
        userContext += ` Their name is ${userName}.`;
      }
      if (userAge) {
        userContext += ` They are in the ${userAge} age range.`;
      }
      if (userDenomination) {
        userContext += ` They identify as ${userDenomination}.`;
      }
      if (userBibleFamiliarity) {
        const familiarityDescription = userBibleFamiliarity === 'new' ? 'new to the Bible' : 
                                     userBibleFamiliarity === 'growing' ? 'growing in Bible knowledge' : 
                                     userBibleFamiliarity === 'mature' ? 'mature in Bible knowledge' : 
                                     'familiar with the Bible';
        userContext += ` They are ${familiarityDescription}.`;
      }
      if (userLanguage && userLanguage !== 'en') {
        const languageNames: Record<string, string> = {
          'es': 'Spanish',
          'fr': 'French',
          'de': 'German',
          'pt': 'Portuguese',
          'nl': 'Dutch'
        };
        const languageName = languageNames[userLanguage] || userLanguage;
        userContext += ` They primarily speak ${languageName}.`;
      }

      const modelName = getExperimentGptModel();
    const response = await fetch(buildGptApiUrl(modelName), {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          "messages": [
            {
              "role": "system",
              "content": `You are a Christian devotional writer who creates personalized devotionals based on the Bible verse: ${verseContext.bookName} ${verseContext.chapter}:${verseContext.verse} - "${verseContext.verseText}".${userContext}

Please respond with a JSON object containing exactly these four fields:
- "title": A compelling, short title (3-6 words) for this devotional that captures the main theme
- "context": 4-5 sentences explaining the historical and spiritual context of this verse, written at an appropriate level for their Bible familiarity
- "prayer": A heartfelt prayer (1-2 sentences) related to this verse that someone could pray
- "reflectionPrompt": A thoughtful question or prompt (1-2 sentences) to help someone reflect on how this verse applies to their life

Make sure your response is valid JSON format and is personalized to their spiritual background and experience level.`
            },
            {
              "role": "user",
              "content": `Create a devotional for ${verseContext.bookName} ${verseContext.chapter}:${verseContext.verse}`
            }
          ]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      appLog('[AI API] Fetch request completed');

      appLog('[AI API] Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AI API] HTTP error:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText || 'No error details available'
        });
        
        // If it's a 500 error, try to return a fallback instead of throwing
        if (response.status === 500) {
          appLog('[AI API] Server error (500) detected, using fallback devotional');
          return createFallbackDevotional(verseContext);
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: AIResponse = await response.json();
      appLog('[AI API] Response received:', {
        hasRole: !!data?.role,
        hasContent: !!data?.content,
        contentLength: data?.content?.length
      });

      // Validate response structure
      if (!data || !data.role || typeof data.content !== 'string') {
        console.error('Invalid AI response structure:', data);
        throw new Error('Invalid AI response format');
      }

      // Parse the JSON response from AI
      let devotionalData: DevotionalAIResponse;
      try {
        // Clean up the content - remove any potential whitespace or special characters
        const cleanContent = data.content.trim();
        
        // Check if it looks like JSON
        if (cleanContent && cleanContent.startsWith('{') && cleanContent.endsWith('}')) {
          // Try to parse the JSON
          devotionalData = JSON.parse(cleanContent);
          appLog('[AI API] Successfully parsed devotional JSON');
        } else {
          // Try to extract JSON from the content in case it's wrapped in other text
          const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            devotionalData = JSON.parse(jsonMatch[0]);
            appLog('[AI API] Successfully extracted and parsed JSON from response');
          } else {
            throw new Error('AI response is not in valid JSON format');
          }
        }
      } catch (parseError) {
        console.error('[AI API] Failed to parse AI response as JSON. Parse error:', parseError);
        console.error('[AI API] Raw content that failed to parse:', data.content);
        // Fallback: try to extract content manually or provide defaults
        devotionalData = {
          title: `Reflection on ${verseContext.bookName} ${verseContext.chapter}:${verseContext.verse}`,
          context: data.content.substring(0, 500) + '...', // Use first part as context
          prayer: 'Lord, help me to understand and apply this verse to my life. Amen.',
          reflectionPrompt: 'How can this verse guide my actions today?'
        };
      }

      // Validate the parsed data
      if (!devotionalData.title || !devotionalData.context || !devotionalData.prayer || !devotionalData.reflectionPrompt) {
        throw new Error('AI response missing required devotional fields');
      }

      appLog('[AI API] Devotional created successfully:', {
        title: devotionalData.title,
        contextLength: devotionalData.context.length,
        prayerLength: devotionalData.prayer.length
      });

      return devotionalData;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('[AI API] Fetch error:', fetchError);
      throw fetchError;
    }
  } catch (error) {
    console.error('[AI API] Error creating devotional from verse:', error);
    
    // Check if it's a network error, timeout, or other network-related issue
    if (error instanceof TypeError && error.message.includes('Network error')) {
      appLog('[AI API] Network error detected, using fallback devotional');
      return createFallbackDevotional(verseContext);
    } else if (error instanceof Error && error.name === 'AbortError') {
      appLog('[AI API] Request timeout detected, using fallback devotional');
      return createFallbackDevotional(verseContext);
    } else if (error instanceof Error && error.message.includes('fetch')) {
      appLog('[AI API] Fetch error detected, using fallback devotional');
      return createFallbackDevotional(verseContext);
    }
    
    throw error;
  }
}

// Fallback devotional creation when API is unavailable
function createFallbackDevotional(verseContext: BibleVerseContext): DevotionalAIResponse {
  appLog('[AI API] Creating fallback devotional for:', verseContext);
  
  // Create a simple but meaningful devotional based on the verse
  const fallbackDevotionals = [
    {
      title: `Finding Peace in ${verseContext.bookName}`,
      context: `This verse from ${verseContext.bookName} chapter ${verseContext.chapter} speaks to the timeless wisdom found in Scripture. The words remind us of God's constant presence and guidance in our daily lives.`,
      prayer: `Dear Lord, help me to find meaning and comfort in Your Word. Guide me to apply this verse to my life and trust in Your plan. Amen.`,
      reflectionPrompt: `How can this verse bring comfort or guidance to your current situation?`
    },
    {
      title: `God's Promise in ${verseContext.bookName}`,
      context: `The message in ${verseContext.bookName} ${verseContext.chapter}:${verseContext.verse} reveals God's faithfulness and love for His people. This passage has comforted believers throughout generations.`,
      prayer: `Heavenly Father, thank You for Your Word that speaks to my heart. Help me to trust in Your promises and find strength in this verse. Amen.`,
      reflectionPrompt: `What promise or truth in this verse speaks most to you today?`
    },
    {
      title: `Walking in Faith`,
      context: `This passage from ${verseContext.bookName} teaches us about faith and trust in God. The verse reminds us that God is always with us, guiding our steps and providing for our needs.`,
      prayer: `Lord, increase my faith and help me to trust You more each day. May this verse remind me of Your constant presence and care. Amen.`,
      reflectionPrompt: `How can you exercise more faith in God's guidance today?`
    }
  ];

  // Select a random fallback devotional
  const randomIndex = Math.floor(Math.random() * fallbackDevotionals.length);
  const fallback = fallbackDevotionals[randomIndex];

  // Customize the fallback with the actual verse text
  return {
    title: fallback.title,
    context: `${fallback.context} The verse "${verseContext.verseText}" reminds us of God's love and wisdom.`,
    prayer: fallback.prayer,
    reflectionPrompt: fallback.reflectionPrompt
  };
}

// Create devotional from check-in data
export async function createDevotionalFromCheckIn(
  checkInData: CheckInData,
  idToken: string
): Promise<DevotionalAIResponse> {
  try {
    appLog('[AI API] Creating devotional from check-in:', checkInData);

    // Check network connectivity first
    const isConnected = await checkNetworkConnectivity();
    appLog('[AI API] Network connectivity check:', isConnected);
    
    if (!isConnected) {
      appLog('[AI API] No network connectivity, using fallback devotional');
      return createCheckInFallbackDevotional(checkInData);
    }

    // Get user onboarding data from user store
    const userStore = useUserStore.getState();
    const languageStore = useLanguageStore.getState();
    
    // Extract user onboarding information
    const userName = userStore.getDisplayName() || 'Friend';
    const userAge = userStore.getAgeRange() || '';
    const userDenomination = userStore.getDenomination() || '';
    const userBibleFamiliarity = userStore.getExperienceLevel() || 'new';
    const userLanguage = languageStore.language || 'en';
    
    appLog('[AI API] User context for devotional:', {
      name: userName,
      age: userAge,
      denomination: userDenomination,
      bibleFamiliarity: userBibleFamiliarity,
      language: userLanguage
    });

    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      appLog('[AI API] Request timeout after 30 seconds');
      controller.abort();
    }, 30000); // 30 second timeout

    try {
      appLog('[AI API] Making fetch request to API...');
      
      // Build a comprehensive context-aware prompt based on check-in data and user profile
      let promptContext = `The person is feeling ${checkInData.mood.toLowerCase()}.`;
      
      if (checkInData.focus) {
        promptContext += ` They want to focus on ${checkInData.focus.toLowerCase()}.`;
      }
      
      if (checkInData.struggle) {
        promptContext += ` They are currently struggling with ${checkInData.struggle.toLowerCase()}.`;
      }

      if (checkInData.reflection && checkInData.reflection.trim()) {
        promptContext += ` They have shared this reflection/prayer with God: "${checkInData.reflection.trim()}".`;
      }

      // Add user profile context
      let userContext = '';
      if (userName && userName !== 'Anonymous User') {
        userContext += ` Their name is ${userName}.`;
      }
      if (userAge) {
        userContext += ` They are in the ${userAge} age range.`;
      }
      if (userDenomination) {
        userContext += ` They identify as ${userDenomination}.`;
      }
      if (userBibleFamiliarity) {
        const familiarityDescription = userBibleFamiliarity === 'new' ? 'new to the Bible' : 
                                     userBibleFamiliarity === 'growing' ? 'growing in Bible knowledge' : 
                                     userBibleFamiliarity === 'mature' ? 'mature in Bible knowledge' : 
                                     'familiar with the Bible';
        userContext += ` They are ${familiarityDescription}.`;
      }
      if (userLanguage && userLanguage !== 'en') {
        const languageNames: Record<string, string> = {
          'es': 'Spanish',
          'fr': 'French',
          'de': 'German',
          'pt': 'Portuguese',
          'nl': 'Dutch'
        };
        const languageName = languageNames[userLanguage] || userLanguage;
        userContext += ` They primarily speak ${languageName}.`;
      }

      const modelName = getExperimentGptModel();
    const response = await fetch(buildGptApiUrl(modelName), {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          "messages": [
            {
              "role": "system",
              "content": `You are a compassionate Christian devotional writer who creates deeply personalized devotionals based on someone's emotional state, spiritual needs, and personal background. 

${promptContext}${userContext}

Create a meaningful devotional that specifically addresses their current emotional state${checkInData.focus ? ', area of focus' : ''}${checkInData.struggle ? ', and struggle' : ''}${checkInData.reflection ? ', and personal reflection/prayer' : ''}, while being mindful of their spiritual background and experience level.

Please respond with a JSON object containing exactly these fields:
- "title": A compelling, short title (3-6 words) that relates to their mood${checkInData.focus ? ' and focus area' : ''}${checkInData.reflection ? ' and reflection/prayer' : ''}
- "context": 4-5 sentences that acknowledge their feelings${checkInData.reflection ? ' and reflection/prayer' : ''} and provide biblical wisdom specific to their situation, written at an appropriate level for their Bible familiarity
- "verse": The actual Bible verse text (not the reference, but the full verse text)
- "bibleReference": The Bible reference (e.g., "Philippians 4:13" or "Romans 8:28")
- "prayer": A heartfelt, personal prayer (2-3 sentences) that specifically addresses their mood${checkInData.focus ? ', focus area' : ''}${checkInData.struggle ? ', struggle' : ''}${checkInData.reflection ? ', and builds upon their personal reflection/prayer' : ''}. This prayer should be suitable for guided prayer meditation and water prayer activities.
- "reflectionPrompt": A thoughtful question or prompt (1-2 sentences) to help them process their emotions and find God's guidance. This should encourage deep personal reflection and journaling about their spiritual journey.

Make sure your response is valid JSON format and is deeply personalized to their specific situation. The verse should be particularly relevant to their current emotional state and needs. The prayer should be meaningful for meditation and the reflection prompt should inspire thoughtful writing. Consider their denomination and Bible familiarity when choosing language and theological depth.`
            },
            {
              "role": "user",
              "content": `Create a personalized devotional for someone who is feeling ${checkInData.mood.toLowerCase()}${checkInData.focus ? `, wants to focus on ${checkInData.focus.toLowerCase()}` : ''}${checkInData.struggle ? `, and is struggling with ${checkInData.struggle.toLowerCase()}` : ''}${checkInData.reflection ? `, and has shared this reflection/prayer: "${checkInData.reflection.trim()}"` : ''}.`
            }
          ]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      appLog('[AI API] Fetch request completed');

      appLog('[AI API] Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AI API] HTTP error:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText || 'There was an error in generating the text completion response'
        });
        
        // If it's a 500 error, try to return a fallback instead of throwing
        if (response.status === 500) {
          appLog('[AI API] Server error (500) detected, using fallback devotional');
          return createCheckInFallbackDevotional(checkInData);
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: AIResponse = await response.json();
      appLog('[AI API] Response received:', {
        hasRole: !!data?.role,
        hasContent: !!data?.content,
        contentLength: data?.content?.length
      });

      // Validate response structure
      if (!data || !data.role || typeof data.content !== 'string') {
        console.error('Invalid AI response structure:', data);
        throw new Error('Invalid AI response format');
      }

      // Parse the JSON response from AI
      let devotionalData: DevotionalAIResponse;
      try {
        // Clean up the content - remove any potential whitespace or special characters
        const cleanContent = data.content.trim();
        
        // Check if it looks like JSON
        if (cleanContent && cleanContent.startsWith('{') && cleanContent.endsWith('}')) {
          // Try to parse the JSON
          devotionalData = JSON.parse(cleanContent);
          appLog('[AI API] Successfully parsed check-in devotional JSON');
          appLog('[AI API] Parsed devotional data:', devotionalData);
        } else {
          // Try to extract JSON from the content in case it's wrapped in other text
          const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            devotionalData = JSON.parse(jsonMatch[0]);
            appLog('[AI API] Successfully extracted and parsed JSON from response');
            appLog('[AI API] Parsed devotional data:', devotionalData);
          } else {
            throw new Error('AI response is not in valid JSON format');
          }
        }
      } catch (parseError) {
        console.error('[AI API] Failed to parse AI response as JSON. Parse error:', parseError);
        console.error('[AI API] Raw content that failed to parse:', data.content);
        // Fallback to check-in based devotional
        return createCheckInFallbackDevotional(checkInData);
      }

      // Validate the parsed data
      if (!devotionalData.title || !devotionalData.context || !devotionalData.prayer || !devotionalData.reflectionPrompt) {
        throw new Error('AI response missing required devotional fields');
      }

      appLog('[AI API] Custom devotional created successfully:', {
        title: devotionalData.title,
        contextLength: devotionalData.context.length,
        prayerLength: devotionalData.prayer.length
      });

      return devotionalData;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('[AI API] Fetch error:', fetchError);
      throw fetchError;
    }
  } catch (error) {
    console.error('[AI API] Error creating devotional from check-in:', error);
    
    // Log detailed error info for debugging
    if (error instanceof Error) {
      console.error('[AI API] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    // Always return fallback devotional for any error to ensure user gets content
    appLog('[AI API] Returning fallback devotional due to error');
    return createCheckInFallbackDevotional(checkInData);
  }
}

// Fallback devotional creation based on check-in data
function createCheckInFallbackDevotional(checkInData: CheckInData): DevotionalAIResponse {
  appLog('[AI API] Creating fallback devotional for check-in:', checkInData);
  
  // Create mood-specific devotionals
  const moodDevotionals: Record<string, Partial<DevotionalAIResponse>> = {
    'Great': {
      title: 'Rejoicing in God\'s Goodness',
      context: 'When we feel great, it\'s a wonderful opportunity to praise God for His blessings. Your positive mood is a gift to be celebrated and shared with others.',
      verse: 'This is the day that the Lord has made; let us rejoice and be glad in it.',
      bibleReference: 'Psalm 118:24',
      prayer: 'Thank You, Lord, for this day of joy and blessing. Help me to use this positive energy to serve You and encourage others. May my joy be a reflection of Your goodness. Amen.',
      reflectionPrompt: 'How can you share your joy with someone who might need encouragement today? What specific blessings has God given you that you can celebrate?'
    },
    'good': {
      title: 'Grateful for Today',
      context: 'Feeling good is a reminder of God\'s daily mercies. When we\'re in a good place emotionally, we can more easily see God\'s hand at work in our lives.',
      verse: 'Give thanks in all circumstances; for this is the will of God in Christ Jesus for you.',
      bibleReference: '1 Thessalonians 5:18',
      prayer: 'Lord, thank You for this sense of well-being. Help me to remain grateful and mindful of Your presence throughout this day. Amen.',
      reflectionPrompt: 'What specific blessings can you thank God for today?'
    },
    'meh': {
      title: 'Finding Peace in the Middle',
      context: 'Sometimes we feel neither great nor terrible - just "meh." God meets us in these ordinary moments too. Even in the mundane, God is working.',
      verse: 'Not that I am speaking of being in need, for I have learned in whatever situation I am to be content.',
      bibleReference: 'Philippians 4:11',
      prayer: 'Lord, help me find Your presence in this ordinary day. Give me eyes to see Your work even when I don\'t feel particularly inspired. Amen.',
      reflectionPrompt: 'What small act of faithfulness can you commit to today, regardless of how you feel?'
    },
    'meb': {
      title: 'Finding Peace in the Middle',
      context: 'Sometimes we feel neither great nor terrible - just "meh." God meets us in these ordinary moments too. Even in the mundane, God is working.',
      verse: 'Not that I am speaking of being in need, for I have learned in whatever situation I am to be content.',
      bibleReference: 'Philippians 4:11',
      prayer: 'Lord, help me find Your presence in this ordinary day. Give me eyes to see Your work even when I don\'t feel particularly inspired. Amen.',
      reflectionPrompt: 'What small act of faithfulness can you commit to today, regardless of how you feel?'
    },
    'bad': {
      title: 'God\'s Comfort in Difficulty',
      context: 'When we\'re having a bad day, God draws especially near. Your struggles don\'t push God away - they invite His comfort and strength into your life.',
      verse: 'The Lord is near to the brokenhearted and saves the crushed in spirit.',
      bibleReference: 'Psalm 34:18',
      prayer: 'Lord, I\'m struggling today. Please wrap me in Your comfort and give me the strength to persevere. Fill my heart with Your peace and remind me that You are always near. Amen.',
      reflectionPrompt: 'What would it look like to invite God into your difficult emotions today? How might God be using this challenge to grow your faith?'
    },
    'veryBad': {
      title: 'Hope in the Darkness',
      context: 'In our darkest moments, God\'s light shines brightest. You are not alone in this struggle.',
      verse: 'Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me; your rod and your staff, they comfort me.',
      bibleReference: 'Psalm 23:4',
      prayer: 'Father, I feel overwhelmed. Please hold me close and remind me of Your unfailing love and presence. Amen.',
      reflectionPrompt: 'Can you name one small thing you\'re grateful for, even in this difficult time?'
    },
    'angry': {
      title: 'Processing Anger with God',
      context: 'Anger is a valid emotion that even Jesus experienced. God understands your frustration and wants to help you process it in healthy ways.',
      verse: 'Be angry and do not sin; do not let the sun go down on your anger.',
      bibleReference: 'Ephesians 4:26',
      prayer: 'Lord, I bring my anger to You. Help me to process these feelings wisely and find Your peace. Amen.',
      reflectionPrompt: 'What is your anger trying to tell you, and how might God be inviting you to respond?'
    }
  };

  // Get the base devotional for the mood (handle case variations)
  const moodKey = checkInData.mood.toLowerCase();
  const baseDevotional = moodDevotionals[checkInData.mood] || 
                        moodDevotionals[moodKey] || 
                        moodDevotionals['meh'] || 
                        moodDevotionals['meb'];
  
  // Customize based on focus area if provided
  if (checkInData.focus) {
    const focusAdditions: Record<string, string> = {
      'peace': ' Focus on God\'s peace that surpasses all understanding.',
      'gratitude': ' Cultivate a heart of thanksgiving in all circumstances.',
      'humility': ' Remember that God opposes the proud but gives grace to the humble.',
      'compassion': ' Show the same compassion to others that Christ has shown to you.',
      'courage': ' Be strong and courageous, for the Lord your God is with you.',
      'faith': ' Trust in the Lord with all your heart and lean not on your own understanding.',
      'patience': ' Wait on the Lord; be of good courage, and He shall strengthen your heart.'
    };
    
    const focusAddition = focusAdditions[checkInData.focus.toLowerCase()] || '';
    if (baseDevotional.context) {
      baseDevotional.context += focusAddition;
    }
  }
  
  // Add struggle-specific content if provided
  if (checkInData.struggle) {
    baseDevotional.prayer = baseDevotional.prayer?.replace('Amen.', `Give me victory over ${checkInData.struggle.toLowerCase()}. Amen.`);
  }

  // Add reflection/prayer-specific content if provided
  if (checkInData.reflection && checkInData.reflection.trim()) {
    const userReflection = checkInData.reflection.trim();
    baseDevotional.context += ` I hear your reflection: "${userReflection.length > 100 ? userReflection.substring(0, 100) + '...' : userReflection}" Know that I am listening and responding to your heart.`;
    baseDevotional.prayer = `Lord, I join with this reflection: "${userReflection.length > 50 ? userReflection.substring(0, 50) + '...' : userReflection}" ${baseDevotional.prayer?.replace('Lord, ', '') || 'Amen.'}`;
  }
  
  const result = {
    title: baseDevotional.title || 'God Meets You Today',
    context: baseDevotional.context || 'God is with you in this moment, ready to meet you exactly where you are.',
    verse: baseDevotional.verse || 'The Lord is near to all who call on him, to all who call on him in truth.',
    bibleReference: baseDevotional.bibleReference || 'Psalm 145:18',
    prayer: baseDevotional.prayer || 'Lord, meet me where I am today and guide my steps. Amen.',
    reflectionPrompt: baseDevotional.reflectionPrompt || 'How is God inviting you to grow today?'
  };
  
  appLog('[AI API] Fallback devotional result:', result);
  
  return result;
}

// Helper function to check network connectivity
export async function checkNetworkConnectivity(): Promise<boolean> {
  try {
    // Try to fetch a simple resource to check connectivity
    await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache'
    });
    return true;
  } catch (error) {
    appLog('[AI API] Network connectivity check failed:', error);
    return false;
  }
}

// Create AI response to journal reflection
export async function createJournalResponse(
  journalData: JournalReflectionData,
  idToken: string
): Promise<JournalResponseData> {
  try {
    appLog('[AI API] Creating journal response for:', {
      mood: journalData.mood,
      prayerLength: journalData.prayer.length
    });

    // Check network connectivity first
    const isConnected = await checkNetworkConnectivity();
    appLog('[AI API] Network connectivity check:', isConnected);
    
    if (!isConnected) {
      appLog('[AI API] No network connectivity, using fallback journal response');
      return createJournalFallbackResponse(journalData);
    }

    // Get user onboarding data from user store
    const userStore = useUserStore.getState();
    const languageStore = useLanguageStore.getState();
    
    // Extract user onboarding information
    const userName = userStore.getDisplayName() || 'Friend';
    const userAge = userStore.getAgeRange() || '';
    const userDenomination = userStore.getDenomination() || '';
    const userBibleFamiliarity = userStore.getExperienceLevel() || 'new';
    const userLanguage = languageStore.language || 'en';
    
    appLog('[AI API] User context for journal response:', {
      name: userName,
      age: userAge,
      denomination: userDenomination,
      bibleFamiliarity: userBibleFamiliarity,
      language: userLanguage
    });

    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      appLog('[AI API] Request timeout after 30 seconds');
      controller.abort();
    }, 30000); // 30 second timeout

    try {
      appLog('[AI API] Making fetch request to API...');
      
      // Build user context for the prompt
      let userContext = '';
      if (userName && userName !== 'Anonymous User') {
        userContext += ` Their name is ${userName}.`;
      }
      if (userAge) {
        userContext += ` They are in the ${userAge} age range.`;
      }
      if (userDenomination) {
        userContext += ` They identify as ${userDenomination}.`;
      }
      if (userBibleFamiliarity) {
        const familiarityDescription = userBibleFamiliarity === 'new' ? 'new to the Bible' : 
                                     userBibleFamiliarity === 'growing' ? 'growing in Bible knowledge' : 
                                     userBibleFamiliarity === 'mature' ? 'mature in Bible knowledge' : 
                                     'familiar with the Bible';
        userContext += ` They are ${familiarityDescription}.`;
      }
      if (userLanguage && userLanguage !== 'en') {
        const languageNames: Record<string, string> = {
          'es': 'Spanish',
          'fr': 'French',
          'de': 'German',
          'pt': 'Portuguese',
          'nl': 'Dutch'
        };
        const languageName = languageNames[userLanguage] || userLanguage;
        userContext += ` They primarily speak ${languageName}.`;
      }

      const modelName = getExperimentGptModel();
    const response = await fetch(buildGptApiUrl(modelName), {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          "messages": [
            {
              "role": "system",
              "content": `You are a compassionate Christian spiritual advisor responding to someone's prayer and request. The person is feeling ${journalData.mood.toLowerCase()} and has shared this prayer with you: "${journalData.prayer}".${userContext}

              Respond as if God is speaking through you with compassion, wisdom, and biblical truth. Your response should:
              1. Acknowledge their feelings and prayer with empathy
              2. Offer biblical comfort, guidance, or encouragement specific to their request
              3. Include a relevant Bible verse that speaks to their situation
              4. Be warm, personal, and pastorally sensitive

              Please respond with a JSON object containing exactly these fields:
              - "response": A compassionate, biblical response (4-5 sentences) that directly addresses their prayer and emotional state, with the final sentence as a call to action for them / pep talk of some sort to make them ready to tackle the day.
              - "verse": The actual Bible verse text (not the reference, but the full verse text)
              - "bibleReference": The Bible reference (e.g., "Philippians 4:13" or "Matthew 11:28")

              Make sure your response feels personal and directly relevant to their specific prayer and mood. Keep in mind their age as well. If they are under 24, make sure to use Gen Z language. Consider their denomination and Bible familiarity when choosing language and theological depth.`
            },
            {
              "role": "user",
              "content": `Please respond to this prayer from someone who is feeling ${journalData.mood.toLowerCase()}: "${journalData.prayer}. Please make sure to prioritize their prayer first."`
            }
          ]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      appLog('[AI API] Fetch request completed');

      appLog('[AI API] Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AI API] HTTP error:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText || 'No error details available'
        });
        
        // If it's a 500 error, try to return a fallback instead of throwing
        if (response.status === 500) {
          appLog('[AI API] Server error (500) detected, using fallback journal response');
          return createJournalFallbackResponse(journalData);
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: AIResponse = await response.json();
      appLog('[AI API] Response received:', {
        hasRole: !!data?.role,
        hasContent: !!data?.content,
        contentLength: data?.content?.length
      });

      // Validate response structure
      if (!data || !data.role || typeof data.content !== 'string') {
        console.error('Invalid AI response structure:', data);
        throw new Error('Invalid AI response format');
      }

      // Parse the JSON response from AI
      let journalResponseData: JournalResponseData;
      try {
        // Clean up the content - remove any potential whitespace or special characters
        const cleanContent = data.content.trim();
        
        // Check if it looks like JSON
        if (cleanContent && cleanContent.startsWith('{') && cleanContent.endsWith('}')) {
          // Try to parse the JSON
          journalResponseData = JSON.parse(cleanContent);
          appLog('[AI API] Successfully parsed journal response JSON');
        } else {
          // Try to extract JSON from the content in case it's wrapped in other text
          const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            journalResponseData = JSON.parse(jsonMatch[0]);
            appLog('[AI API] Successfully extracted and parsed JSON from response');
          } else {
            throw new Error('AI response is not in valid JSON format');
          }
        }
      } catch (parseError) {
        console.error('[AI API] Failed to parse AI response as JSON. Parse error:', parseError);
        console.error('[AI API] Raw content that failed to parse:', data.content);
        // Fallback: use the raw content as response
        journalResponseData = {
          response: data.content,
          verse: 'The Lord is near to all who call on him, to all who call on him in truth.',
          bibleReference: 'Psalm 145:18'
        };
      }

      // Validate the parsed data
      if (!journalResponseData.response) {
        throw new Error('AI response missing required response field');
      }

      appLog('[AI API] Journal response created successfully:', {
        responseLength: journalResponseData.response.length,
        hasVerse: !!journalResponseData.verse,
        hasBibleReference: !!journalResponseData.bibleReference
      });

      return journalResponseData;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('[AI API] Fetch error:', fetchError);
      throw fetchError;
    }
  } catch (error) {
    console.error('[AI API] Error creating journal response:', error);
    
    // Check if it's a network error, timeout, or other network-related issue
    if (error instanceof TypeError && error.message.includes('Network error')) {
      appLog('[AI API] Network error detected, using fallback journal response');
      return createJournalFallbackResponse(journalData);
    } else if (error instanceof Error && error.name === 'AbortError') {
      appLog('[AI API] Request timeout detected, using fallback journal response');
      return createJournalFallbackResponse(journalData);
    } else if (error instanceof Error && error.message.includes('fetch')) {
      appLog('[AI API] Fetch error detected, using fallback journal response');
      return createJournalFallbackResponse(journalData);
    }
    
    throw error;
  }
}

// Fallback journal response creation when API is unavailable
function createJournalFallbackResponse(journalData: JournalReflectionData): JournalResponseData {
  appLog('[AI API] Creating fallback journal response for:', journalData);
  
  // Create mood-specific responses
  const moodResponses: Record<string, Partial<JournalResponseData>> = {
    'Great': {
      response: 'I hear the joy in your heart, and it brings Me great delight. Your gratitude and excitement are a beautiful offering. Continue to walk in this joy, sharing it with others and remembering that all good gifts come from above.',
      verse: 'Every good gift and every perfect gift is from above, coming down from the Father of lights, with whom there is no variation or shadow due to change.',
      bibleReference: 'James 1:17'
    },
    'good': {
      response: 'I see your heart seeking Me, and I am pleased. In this good place you find yourself, remember to give thanks and to be a light to those around you. Your contentment is a testimony to My faithfulness.',
      verse: 'Give thanks in all circumstances; for this is the will of God in Christ Jesus for you.',
      bibleReference: '1 Thessalonians 5:18'
    },
    'meh': {
      response: 'Even in the ordinary moments, I am with you. Your honest heart touches Me, and I want you to know that I see you in the mundane. Trust that I am working even when you cannot feel it.',
      verse: 'And we know that for those who love God all things work together for good, for those who are called according to his purpose.',
      bibleReference: 'Romans 8:28'
    },
    'meb': {
      response: 'Even in the ordinary moments, I am with you. Your honest heart touches Me, and I want you to know that I see you in the mundane. Trust that I am working even when you cannot feel it.',
      verse: 'And we know that for those who love God all things work together for good, for those who are called according to his purpose.',
      bibleReference: 'Romans 8:28'
    },
    'bad': {
      response: 'My heart aches with yours in this difficult time. You are not alone in your struggles - I am closer to you now than ever. Let Me carry your burdens and give you the peace that surpasses understanding.',
      verse: 'Cast all your anxieties on him, because he cares for you.',
      bibleReference: '1 Peter 5:7'
    },
    'veryBad': {
      response: 'In your deepest pain, I am holding you close. Your tears are precious to Me, and I have not forgotten you. Even in this darkness, My love for you remains unchanging. Trust that this season will pass.',
      verse: 'Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me; your rod and your staff, they comfort me.',
      bibleReference: 'Psalm 23:4'
    },
    'angry': {
      response: 'I understand your anger and frustration. Bring these feelings to Me without shame - I can handle your honest emotions. Let Me transform this energy into something that brings healing and justice.',
      verse: 'Be angry and do not sin; do not let the sun go down on your anger.',
      bibleReference: 'Ephesians 4:26'
    }
  };

  // Get the base response for the mood
  const moodKey = journalData.mood.toLowerCase();
  const baseResponse = moodResponses[journalData.mood] || 
                      moodResponses[moodKey] || 
                      {
                        response: 'Thank you for sharing your heart with Me. I hear every word of your prayer and I am with you in this moment. Trust that I am working all things together for your good.',
                        verse: 'The Lord is near to all who call on him, to all who call on him in truth.',
                        bibleReference: 'Psalm 145:18'
                      };

  // Customize the response based on specific prayer content if possible
  const prayerLower = journalData.prayer.toLowerCase();
  
  if (prayerLower.includes('healing') || prayerLower.includes('health')) {
    baseResponse.verse = 'But he was pierced for our transgressions; he was crushed for our iniquities; upon him was the chastisement that brought us peace, and with his wounds we are healed.';
    baseResponse.bibleReference = 'Isaiah 53:5';
  } else if (prayerLower.includes('strength') || prayerLower.includes('help')) {
    baseResponse.verse = 'I can do all things through him who strengthens me.';
    baseResponse.bibleReference = 'Philippians 4:13';
  } else if (prayerLower.includes('peace') || prayerLower.includes('anxiety') || prayerLower.includes('worry')) {
    baseResponse.verse = 'Peace I leave with you; my peace I give to you. Not as the world gives do I give to you. Let not your hearts be troubled, neither let them be afraid.';
    baseResponse.bibleReference = 'John 14:27';
  } else if (prayerLower.includes('forgiveness') || prayerLower.includes('forgive')) {
    baseResponse.verse = 'If we confess our sins, he is faithful and just to forgive us our sins and to cleanse us from all unrighteousness.';
    baseResponse.bibleReference = '1 John 1:9';
  } else if (prayerLower.includes('guidance') || prayerLower.includes('direction') || prayerLower.includes('wisdom')) {
    baseResponse.verse = 'Trust in the Lord with all your heart, and do not lean on your own understanding. In all your ways acknowledge him, and he will make straight your paths.';
    baseResponse.bibleReference = 'Proverbs 3:5-6';
  }

  const result: JournalResponseData = {
    response: baseResponse.response || 'Thank you for sharing your heart with Me. I hear you and I am with you.',
    verse: baseResponse.verse || 'The Lord is near to all who call on him, to all who call on him in truth.',
    bibleReference: baseResponse.bibleReference || 'Psalm 145:18'
  };
  
  appLog('[AI API] Fallback journal response result:', result);
  
  return result;
}

// Default export for Expo Router compatibility
export default {}
