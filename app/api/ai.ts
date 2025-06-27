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

interface DevotionalAIResponse {
  title: string;
  context: string;
  prayer: string;
  reflectionPrompt: string;
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

// Helper function to check network connectivity
export async function checkNetworkConnectivity(): Promise<boolean> {
  try {
    // Try to fetch a simple resource to check connectivity
    const response = await fetch('https://www.google.com/favicon.ico', {
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
