// services/aiSearch.ts

// services/aiSearch.ts

// ✅ Read from the .env file
// services/aiSearch.ts

// ✅ Read from .env
// services/aiSearch.ts

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY; 

// --- DEBUGGING LOGS ---
console.log("🔑 API Key Status:", API_KEY ? "Loaded" : "MISSING");
if (API_KEY) {
  console.log("🔑 Key starts with:", API_KEY.substring(0, 5) + "...");
}
// ----------------------

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
// ... rest of code

// ... rest of the code ...
// Cache the model so we don't fetch the list every time
let activeModel: string | null = null;

// --- INTERFACES ---
export interface SearchIntent {
  day?: string;
  filterType?: string;
  searchKeyword?: string;
  timeStart?: number; 
  timeEnd?: number;   
  minCapacity?: number;    
  equipment?: string[];    
  targetStatus?: string;   
}

export interface BookingIntent {
  subject?: string;
  roomName?: string;
  day?: string;
  startTime?: string;
  endTime?: string;
  professor?: string;
  capacity?: number;
}

export interface MaintenanceAnalysis {
  category: string;
  urgency: string;
  summary: string;
  suggestedAction: string;
}

// --- 1. DYNAMIC MODEL SELECTION ---
const getValidModel = async () => {
  if (activeModel) return activeModel;

  try {
    console.log("🔍 Checking available models...");
    const response = await fetch(`${BASE_URL}/models?key=${API_KEY}`);
    const data = await response.json();

    if (data.models) {
      // Filter for models that support text generation
      const availableModels = data.models.filter((m: any) => 
        m.supportedGenerationMethods.includes('generateContent')
      );

      // Priority List based on your logs (Newest to Oldest)
      const preferred = [
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-2.0-flash-001',
        'gemini-flash-latest',
        'gemini-1.5-flash'
      ];

      // Find the first match
      let bestMatch = null;
      for (const pref of preferred) {
        bestMatch = availableModels.find((m: any) => m.name.includes(pref));
        if (bestMatch) break;
      }

      // If no preferred match, take ANY flash model
      if (!bestMatch) {
        bestMatch = availableModels.find((m: any) => m.name.includes('flash'));
      }

      // Final fallback: just take the first available model
      if (!bestMatch && availableModels.length > 0) {
        bestMatch = availableModels[0];
      }

      if (bestMatch) {
        const cleanName = bestMatch.name.replace('models/', '');
        console.log(`✅ Using Model: ${cleanName}`);
        activeModel = cleanName;
        return cleanName;
      }
    }
  } catch (e) {
    console.error("⚠️ Failed to list models.");
  }

  // Hard fallback if the list call fails entirely. 
  // Based on your logs, 'gemini-2.0-flash' is definitely there.
  return 'gemini-2.0-flash'; 
};

// --- HELPER: CLEAN JSON PARSER ---
const extractJson = (text: string) => {
  try {
    return JSON.parse(text);
  } catch (e) {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[0]); } catch (e2) { return null; }
    }
    return null;
  }
};

// --- CORE API CALLER ---
const callGemini = async (promptText: string) => {
  try {
    const modelName = await getValidModel();
    const url = `${BASE_URL}/models/${modelName}:generateContent?key=${API_KEY}`;

    console.log(`🤖 AI Request (${modelName}):`, promptText.substring(0, 30) + "...");

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }]
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("🔴 API Error:", data.error.message);
      return null;
    }

    if (data.candidates && data.candidates.length > 0) {
      const text = data.candidates[0].content.parts[0].text;
      return extractJson(text);
    }
    
    return null;
  } catch (e) { 
    console.error("🔴 Network Error:", e);
    return null; 
  }
};

// --- EXPORTED FUNCTIONS ---

export const parseNaturalQuery = async (query: string): Promise<SearchIntent | null> => {
  try {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    
    const prompt = `
      Context: Today is ${today}. User Query: "${query}"
      Task: Extract search filters.
      Ref Data: Types: ['Lecture Hall', 'Laboratory', 'Computer Lab', 'Seminar Room', 'Auditorium', 'Conference Room']
      
      Rules:
      1. 'day': Convert relative terms to strict Day string.
      2. 'filterType': Match fuzzy to Types. If "room"/"any"/"empty", return "All".
      3. 'searchKeyword': Specific names (e.g. "CL5").
      4. 'timeStart'/'timeEnd': 24h numbers. "12pm" = start:12, end:13.
      5. 'targetStatus': "Available" (default), "Maintenance".
      
      OUTPUT RAW JSON ONLY:
      { "day": "Monday"|null, "filterType": "string"|null, "searchKeyword": "string"|null, "timeStart": number|null, "timeEnd": number|null, "targetStatus": "Available"|null }
    `;
    return await callGemini(prompt);
  } catch (e) { return null; }
};

export const parseBookingIntent = async (query: string): Promise<BookingIntent | null> => {
  try {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    const prompt = `
      Context: Today is ${today}. User Query: "${query}"
      Task: Extract schedule details.
      OUTPUT RAW JSON ONLY:
      { "subject": "string"|null, "roomName": "string"|null, "day": "string"|null, "startTime": "string"|null, "endTime": "string"|null, "professor": "string"|null }
    `;
    return await callGemini(prompt);
  } catch (error) { return null; }
};

export const analyzeMaintenanceIssue = async (description: string): Promise<MaintenanceAnalysis | null> => {
  try {
    const prompt = `
      User Report: "${description}"
      Task: Analyze issue.
      Rules:
      1. Category: Electrical, Plumbing, HVAC, Equipment, Cleaning, Other.
      2. Urgency: Low, Medium, High, Critical.
      OUTPUT RAW JSON ONLY:
      { "category": "Equipment", "urgency": "Medium", "summary": "string", "suggestedAction": "string" }
    `;
    return await callGemini(prompt);
  } catch (error) { return null; }
};