// services/aiSearch.ts

// ✅ Read from .env
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY; 

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-2.5-flash'; 

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

// --- HELPER: ROBUST JSON EXTRACTION ---
const extractJson = (text: string) => {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[0]); } catch (e2) { return null; }
    }
    return null;
  } catch (e) {
    return null;
  }
};

// --- CORE API CALLER ---
const callGemini = async (promptText: string) => {
  if (!API_KEY) {
    console.error("❌ API Key missing. Check .env");
    return null;
  }

  try {
    const url = `${BASE_URL}/models/${DEFAULT_MODEL}:generateContent?key=${API_KEY}`;
    
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

// --- 1. SEARCH FUNCTION ---
export const parseNaturalQuery = async (query: string): Promise<SearchIntent | null> => {
  try {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    
    const prompt = `
      Context: Today is ${today}. User Query: "${query}"
      Task: Extract search filters.
      OUTPUT RAW JSON ONLY:
      { "day": "Monday"|null, "filterType": "string"|null, "searchKeyword": "string"|null, "timeStart": number|null, "timeEnd": number|null, "targetStatus": "Available"|null }
    `;
    return await callGemini(prompt);
  } catch (e) { return null; }
};

// --- 2. BOOKING FUNCTION ---
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

// --- 3. MAINTENANCE FUNCTION ---
export const analyzeMaintenanceIssue = async (description: string): Promise<MaintenanceAnalysis | null> => {
  try {
    const prompt = `
      User Report: "${description}"
      Task: Analyze issue.
      OUTPUT RAW JSON ONLY:
      { "category": "Equipment", "urgency": "Medium", "summary": "string", "suggestedAction": "string" }
    `;
    return await callGemini(prompt);
  } catch (error) { return null; }
};