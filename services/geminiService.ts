
import { GoogleGenAI, Type } from "@google/genai";
import type { Keywords, Experience, Education, ContactInfo, RefinedResume, AtsScanResult } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Utility to safely parse JSON from model responses, 
 * handling potential markdown code blocks or leading/trailing whitespace.
 */
function safeJsonParse(text: string | undefined): any {
  if (!text) throw new Error("Empty response from AI");
  const cleaned = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON Parse Error. Raw Text:", text);
    // If it's a large string, just log the beginning and end
    if (text.length > 1000) {
      console.error("Text start:", text.substring(0, 500));
      console.error("Text end:", text.substring(text.length - 500));
    }
    throw new Error("The AI provided an invalid data format. This often happens with very long resumes; try shortening your input.");
  }
}

export async function fetchJdFromUrl(url: string): Promise<{ text: string; sourceUrl: string }> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Extract the full job description details (responsibilities, requirements, benefits) from this URL: ${url}. 
    Provide the output as clean, concise plain text.`,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text || "Could not retrieve description.";
  const sourceUrl = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.[0]?.web?.uri || url;
  return { text, sourceUrl };
}

export async function extractKeywords(jd: string): Promise<Keywords> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Extract ATS keywords from this job description. Return ONLY JSON.
    JD: ${jd}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hard_skills: { type: Type.ARRAY, items: { type: Type.STRING } },
          strategic_skills: { type: Type.ARRAY, items: { type: Type.STRING } },
          soft_skills: { type: Type.ARRAY, items: { type: Type.STRING } },
          qualifications: { type: Type.ARRAY, items: { type: Type.STRING } },
          action_verbs: { type: Type.ARRAY, items: { type: Type.STRING } },
          jd_phrases: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["hard_skills", "strategic_skills", "soft_skills", "qualifications", "action_verbs", "jd_phrases"]
      }
    }
  });
  return safeJsonParse(response.text);
}

export async function parseResume(base64Data: string, mimeType: string): Promise<any> {
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType: mimeType } },
        { text: `Parse this resume into structured JSON. Extract ALL experiences with verbatim bullets. Be precise and concise.` }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          contact: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              email: { type: Type.STRING },
              phone: { type: Type.STRING },
              location: { type: Type.STRING },
              linkedin: { type: Type.STRING },
              portfolio: { type: Type.STRING }
            }
          },
          experiences: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                company: { type: Type.STRING },
                title: { type: Type.STRING },
                startDate: { type: Type.STRING },
                endDate: { type: Type.STRING },
                bullets: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          },
          skills: { type: Type.STRING },
          education: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                school: { type: Type.STRING },
                degree: { type: Type.STRING },
                startDate: { type: Type.STRING },
                endDate: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  });
  return safeJsonParse(response.text);
}

export async function generateTailoredResume(data: { contactInfo: ContactInfo, experiences: Experience[], skills: string, education: Education[], keywords: Keywords }): Promise<RefinedResume> {
  // To avoid hitting token limits, we pass a slightly more focused prompt
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `You are an expert ATS resume writer. Tailor the following resume data to match the provided keywords.
    Rules:
    1. Each bullet MUST start with a strong past-tense action verb.
    2. Numeric metrics MUST be wrapped in ** for bold (e.g. "**$62M**").
    3. Each bullet max 120 chars. Keep bullet lists to roughly 3-5 per role for brevity.
    4. Weave keywords naturally.
    
    Data: ${JSON.stringify(data)}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          experiences: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                company: { type: Type.STRING },
                title: { type: Type.STRING },
                startDate: { type: Type.STRING },
                endDate: { type: Type.STRING },
                bullets: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          },
          suggested_skills: { type: Type.STRING },
          ats_tips: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["experiences", "suggested_skills", "ats_tips"]
      }
    }
  });
  return safeJsonParse(response.text);
}

export async function performAtsScan(jd: string, resume: RefinedResume, keywords: Keywords): Promise<AtsScanResult> {
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `Act as an ATS scanner. Compare the tailored resume against the JD and keywords.
    JD: ${jd.substring(0, 3000)} // Truncate JD to save tokens if it's massive
    Keywords: ${JSON.stringify(keywords)}
    Resume: ${JSON.stringify(resume)}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overall_score: { type: Type.NUMBER },
          keyword_match: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              matched: { type: Type.ARRAY, items: { type: Type.STRING } },
              missing: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          },
          structure: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              checks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    passed: { type: Type.BOOLEAN }
                  }
                }
              }
            }
          },
          recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    }
  });
  return safeJsonParse(response.text);
}
