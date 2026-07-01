import { GoogleGenAI } from "@google/genai";
import { getSystemInstructionCoverLetter, getSystemInstructionCV, getBaseCV } from './system-instruction';
import { getCoverLetterConversation, getCVConversation } from './prompt';
import { nl2br, getAPIKey, removeMarkdownCodeBlocks } from './utils';

const model_to_use = 'gemini-3.1-pro-preview';

export async function getGeminiCoverLetterResult(
  company: string,
  position: string,
  job: string,
  language: string,
  words: string,
  searchCompanyInfo: boolean,
  dryRun: boolean = false
): Promise<string> {
  if (dryRun) {
    getSystemInstructionCoverLetter(company, language, searchCompanyInfo);
    return nl2br("Mock Gemini cover letter response (dry run).");
  }

  const cv = getBaseCV(language);
  const turns = getCoverLetterConversation(language, cv, job, position, company, words, searchCompanyInfo);
  
  // Map the multi-step conversation turns into a structured prompt string for Gemini
  const prompt = turns.map(turn => `${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.content}`).join('\n\n');

  const client = new GoogleGenAI({ apiKey: getAPIKey("gemini") });
  const interaction = await client.interactions.create({
    model: model_to_use,
    system_instruction: getSystemInstructionCoverLetter(company, language, searchCompanyInfo),
    input: prompt
  });
  
  const lastStep = interaction.steps?.at(-1) as any;
  const text = lastStep?.content?.[0]?.text || "";
  return nl2br(text);
}

export async function getGeminiCVResult(
  jobDescription: string,
  position: string,
  language: string,
  dryRun: boolean = false
): Promise<string> {
  if (dryRun) {
    return "<p>Mock Gemini CV response (dry run).</p>";
  }

  const cv = getBaseCV(language);
  const turns = getCVConversation(language, cv, jobDescription, position);

  // Map the multi-step conversation turns into a structured prompt string for Gemini
  const prompt = turns.map(turn => `${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.content}`).join('\n\n');

  const client = new GoogleGenAI({ apiKey: getAPIKey("gemini") });
  const interaction = await client.interactions.create({
    model: model_to_use,
    system_instruction: getSystemInstructionCV(language),
    input: prompt
  });
  
  const lastStep = interaction.steps?.at(-1) as any;
  const text = lastStep?.content?.[0]?.text || "";
  return removeMarkdownCodeBlocks(text);
}

