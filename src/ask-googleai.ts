import { GoogleGenAI } from '@google/genai';
import { getSystemInstructionCoverLetter, getSystemInstructionCV, getBaseCV } from './system-instruction';
import { getCoverLetterConversation, getCVConversation } from './prompt';
import { nl2br, getAPIKey, removeMarkdownCodeBlocks } from './utils';

export const GOOGLEAI_MODEL = 'gemini-3.1-pro-preview';

export async function getGoogleAICoverLetterResult(
  company: string,
  position: string,
  job: string,
  language: string,
  words: string,
  searchCompanyInfo: boolean,
  enableSpecialInstructions: boolean,
  specialInstructions: string,
  dryRun: boolean = false
): Promise<string> {
  if (dryRun) {
    getSystemInstructionCoverLetter(company, language, searchCompanyInfo);
    return nl2br('Mock GoogleAI cover letter response (dry run).');
  }

  const cv = getBaseCV(language);
  const turns = getCoverLetterConversation(
    language,
    cv,
    job,
    position,
    company,
    words,
    searchCompanyInfo,
    enableSpecialInstructions,
    specialInstructions
  );

  const contents = turns.map((turn) => ({
    role: turn.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: turn.content }],
  }));

  const ai = new GoogleGenAI({ apiKey: getAPIKey('googleai') });
  const response = await ai.models.generateContent({
    model: GOOGLEAI_MODEL,
    contents: contents,
    config: {
      systemInstruction: getSystemInstructionCoverLetter(company, language, searchCompanyInfo),
    },
  });

  const text = response.text || '';
  return nl2br(text);
}

export async function getGoogleAICVResult(
  jobDescription: string,
  position: string,
  language: string,
  enableSpecialInstructions: boolean = false,
  specialInstructions: string = '',
  dryRun: boolean = false
): Promise<string> {
  if (dryRun) {
    return '<p>Mock GoogleAI CV response (dry run).</p>';
  }

  const cv = getBaseCV(language);
  const turns = getCVConversation(
    language,
    cv,
    jobDescription,
    position,
    enableSpecialInstructions,
    specialInstructions
  );

  const contents = turns.map((turn) => ({
    role: turn.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: turn.content }],
  }));

  const ai = new GoogleGenAI({ apiKey: getAPIKey('googleai') });
  const response = await ai.models.generateContent({
    model: GOOGLEAI_MODEL,
    contents: contents,
    config: {
      systemInstruction: getSystemInstructionCV(language),
    },
  });

  const text = response.text || '';
  return removeMarkdownCodeBlocks(text);
}

