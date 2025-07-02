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

    const response = await fetch('https://shepherd-dev-api.skylar.gg/oai/gpt?model=gpt-4.1-mini', {
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
    console.log('[AI API] Starting devotional creation for:', {
      book: verseContext.bookName,
      chapter: verseContext.chapter,
      verse: verseContext.verse,
      verseTextLength: verseContext.verseText.length
    });

    // Check network connectivity first
    const isConnected = await checkNetworkConnectivity();
    console.log('[AI API] Network connectivity check:', isConnected);
    
    if (!isConnected) {
      console.log('[AI API] No network connectivity, using fallback devotional');
      return createFallbackDevotional(verseContext);
    }

    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('[AI API] Request timeout after 30 seconds');
      controller.abort();
    }, 30000); // 30 second timeout

    try {
      console.log('[AI API] Making fetch request to API...');
      const response = await fetch('https://shepherd-dev-api.skylar.gg/oai/gpt?model=gpt-4.1-mini', {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          "messages": [
            {
              "role": "system",
              "content": `You are a Christian devotional writer. Create a meaningful devotional based on the Bible verse: ${verseContext.bookName} ${verseContext.chapter}:${verseContext.verse} - "${verseContext.verseText}". 

Please respond with a JSON object containing exactly these four fields:
- "title": A compelling, short title (3-6 words) for this devotional that captures the main theme
- "context": 4-5 sentences explaining the historical and spiritual context of this verse
- "prayer": A heartfelt prayer (2-3 sentences) related to this verse that someone could pray
- "reflectionPrompt": A thoughtful question or prompt (1-2 sentences) to help someone reflect on how this verse applies to their life

Make sure your response is valid JSON format.`
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
      console.log('[AI API] Fetch request completed');

      console.log('[AI API] Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AI API] HTTP error:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: AIResponse = await response.json();
      console.log('[AI API] Response received:', {
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
        if (data.content && data.content.startsWith('{') && data.content.endsWith('}')) {
          devotionalData = JSON.parse(data.content);
        } else {
          throw new Error('AI response is not in valid JSON format');
        }

        
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', data.content);
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

      console.log('[AI API] Devotional created successfully:', {
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
      console.log('[AI API] Network error detected, using fallback devotional');
      return createFallbackDevotional(verseContext);
    } else if (error instanceof Error && error.name === 'AbortError') {
      console.log('[AI API] Request timeout detected, using fallback devotional');
      return createFallbackDevotional(verseContext);
    } else if (error instanceof Error && error.message.includes('fetch')) {
      console.log('[AI API] Fetch error detected, using fallback devotional');
      return createFallbackDevotional(verseContext);
    }
    
    throw error;
  }
}

// Fallback devotional creation when API is unavailable
function createFallbackDevotional(verseContext: BibleVerseContext): DevotionalAIResponse {
  console.log('[AI API] Creating fallback devotional for:', verseContext);
  
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
    console.log('[AI API] Creating devotional from check-in:', checkInData);

    // Check network connectivity first
    const isConnected = await checkNetworkConnectivity();
    console.log('[AI API] Network connectivity check:', isConnected);
    
    if (!isConnected) {
      console.log('[AI API] No network connectivity, using fallback devotional');
      return createCheckInFallbackDevotional(checkInData);
    }

    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('[AI API] Request timeout after 30 seconds');
      controller.abort();
    }, 30000); // 30 second timeout

    try {
      console.log('[AI API] Making fetch request to API...');
      
      // Build a context-aware prompt based on check-in data
      let promptContext = `The person is feeling ${checkInData.mood.toLowerCase()}.`;
      
      if (checkInData.focus) {
        promptContext += ` They want to focus on ${checkInData.focus.toLowerCase()}.`;
      }
      
      if (checkInData.struggle) {
        promptContext += ` They are currently struggling with ${checkInData.struggle.toLowerCase()}.`;
      }

      const response = await fetch('https://shepherd-dev-api.skylar.gg/oai/gpt?model=gpt-4.1-mini', {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          "messages": [
            {
              "role": "system",
              "content": `You are a compassionate Christian devotional writer who creates personalized devotionals based on someone's emotional state and spiritual needs. ${promptContext}

Create a meaningful devotional that specifically addresses their current emotional state${checkInData.focus ? ', area of focus' : ''}${checkInData.struggle ? ', and struggle' : ''}.

Please respond with a JSON object containing exactly these fields:
- "title": A compelling, short title (3-6 words) that relates to their mood${checkInData.focus ? ' and focus area' : ''}
- "context": 4-5 sentences that acknowledge their feelings and provide biblical wisdom specific to their situation
- "verse": The actual Bible verse text (not the reference, but the full verse text)
- "bibleReference": The Bible reference (e.g., "Philippians 4:13" or "Romans 8:28")
- "prayer": A heartfelt prayer (2-3 sentences) that specifically addresses their mood${checkInData.focus ? ', focus area' : ''}${checkInData.struggle ? ', and struggle' : ''}
- "reflectionPrompt": A thoughtful question or prompt (1-2 sentences) to help them process their emotions and find God's guidance

Make sure your response is valid JSON format and is deeply personalized to their specific situation. The verse should be particularly relevant to their current emotional state and needs.`
            },
            {
              "role": "user",
              "content": `Create a personalized devotional for someone who is feeling ${checkInData.mood.toLowerCase()}${checkInData.focus ? `, wants to focus on ${checkInData.focus.toLowerCase()}` : ''}${checkInData.struggle ? `, and is struggling with ${checkInData.struggle.toLowerCase()}` : ''}.`
            }
          ]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('[AI API] Fetch request completed');

      console.log('[AI API] Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AI API] HTTP error:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: AIResponse = await response.json();
      console.log('[AI API] Response received:', {
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
        if (data.content && data.content.startsWith('{') && data.content.endsWith('}')) {
          devotionalData = JSON.parse(data.content);
          
          // Log the parsed data to debug
          console.log('[AI API] Parsed devotional data:', devotionalData);
        } else {
          throw new Error('AI response is not in valid JSON format');
        }
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', data.content);
        // Fallback to check-in based devotional
        return createCheckInFallbackDevotional(checkInData);
      }

      // Validate the parsed data
      if (!devotionalData.title || !devotionalData.context || !devotionalData.prayer || !devotionalData.reflectionPrompt) {
        throw new Error('AI response missing required devotional fields');
      }

      console.log('[AI API] Custom devotional created successfully:', {
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
    
    // Return fallback devotional for any error
    return createCheckInFallbackDevotional(checkInData);
  }
}

// Fallback devotional creation based on check-in data
function createCheckInFallbackDevotional(checkInData: CheckInData): DevotionalAIResponse {
  console.log('[AI API] Creating fallback devotional for check-in:', checkInData);
  
  // Create mood-specific devotionals
  const moodDevotionals: Record<string, Partial<DevotionalAIResponse>> = {
    'Great': {
      title: 'Rejoicing in God\'s Goodness',
      context: 'When we feel great, it\'s a wonderful opportunity to praise God for His blessings. Your positive mood is a gift to be celebrated and shared with others.',
      verse: 'This is the day that the Lord has made; let us rejoice and be glad in it.',
      bibleReference: 'Psalm 118:24',
      prayer: 'Thank You, Lord, for this day of joy and blessing. Help me to use this positive energy to serve You and encourage others. Amen.',
      reflectionPrompt: 'How can you share your joy with someone who might need encouragement today?'
    },
    'good': {
      title: 'Grateful for Today',
      context: 'Feeling good is a reminder of God\'s daily mercies. When we\'re in a good place emotionally, we can more easily see God\'s hand at work in our lives.',
      verse: 'Give thanks in all circumstances; for this is the will of God in Christ Jesus for you.',
      bibleReference: '1 Thessalonians 5:18',
      prayer: 'Lord, thank You for this sense of well-being. Help me to remain grateful and mindful of Your presence throughout this day. Amen.',
      reflectionPrompt: 'What specific blessings can you thank God for today?'
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
      prayer: 'Lord, I\'m struggling today. Please wrap me in Your comfort and give me the strength to persevere. Amen.',
      reflectionPrompt: 'What would it look like to invite God into your difficult emotions today?'
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

  // Get the base devotional for the mood
  const baseDevotional = moodDevotionals[checkInData.mood] || moodDevotionals['meb'];
  
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
  
  const result = {
    title: baseDevotional.title || 'God Meets You Today',
    context: baseDevotional.context || 'God is with you in this moment, ready to meet you exactly where you are.',
    verse: baseDevotional.verse || 'The Lord is near to all who call on him, to all who call on him in truth.',
    bibleReference: baseDevotional.bibleReference || 'Psalm 145:18',
    prayer: baseDevotional.prayer || 'Lord, meet me where I am today and guide my steps. Amen.',
    reflectionPrompt: baseDevotional.reflectionPrompt || 'How is God inviting you to grow today?'
  };
  
  console.log('[AI API] Fallback devotional result:', result);
  
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
    console.log('[AI API] Network connectivity check failed:', error);
    return false;
  }
}

// Default export for Expo Router compatibility
export default {}
