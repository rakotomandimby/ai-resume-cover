import { GoogleGenAI } from "@google/genai";
import { getSystemInstructionCoverLetter, getSystemInstructionCV } from './system-instruction';
import { getPromptCoverLetter, getPromptCV } from './prompt';
import { nl2br, getAPIKey, removeMarkdownCodeBlocks } from './utils';

const model_to_use = 'gemini-3.1-pro-preview';

export async function getGeminiCoverLetterResult(company: string, position: string, job: string, language: string, words: string, searchCompanyInfo: boolean): Promise<string> {
  const client = new GoogleGenAI({ apiKey: getAPIKey("gemini") });
  const interaction = await client.interactions.create({
    model: model_to_use,
    system_instruction: getSystemInstructionCoverLetter(company, job, words, language, searchCompanyInfo),
    input: getPromptCoverLetter(language, company, position, words)
  });
  
  const lastStep = interaction.steps.at(-1);
  const text = lastStep?.type === 'model_output' ? ((lastStep.content?.[0] as any)?.text || "") : "";
  return nl2br(text);
}

export async function getGeminiCVResult(jobDescription: string, position: string, language: string): Promise<string> {
  const client = new GoogleGenAI({ apiKey: getAPIKey("gemini") });
  const interaction = await client.interactions.create({
    model: model_to_use,
    system_instruction: getSystemInstructionCV(jobDescription, language),
    input: getPromptCV(language, jobDescription, position)
  });
  
  const lastStep = interaction.steps.at(-1);
  const text = lastStep?.type === 'model_output' ? ((lastStep.content?.[0] as any)?.text || "") : "";
  return removeMarkdownCodeBlocks(text);
}
