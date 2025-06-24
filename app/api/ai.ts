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
      })
    });

    const data: AIResponse = await response.json();

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

    return devotionalData;
  } catch (error) {
    console.error('Error creating devotional from verse:', error);
    throw error;
  }
}
