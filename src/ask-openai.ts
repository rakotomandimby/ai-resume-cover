import OpenAI from 'openai';
import { getCoverLetterConversation, getCVConversation } from './prompt';
import { getSystemInstructionCoverLetter, getSystemInstructionCV, getBaseCV } from './system-instruction';
import { nl2br, nullToEmptyString, getAPIKey, removeMarkdownCodeBlocks } from './utils';

const model_to_use = 'gpt-5.4';  

export async function getOpenAICoverLetterResult(
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
    return nl2br("Mock OpenAI cover letter response (dry run).");
  }

  const cv = getBaseCV(language);
  const turns = getCoverLetterConversation(language, cv, job, position, company, words, searchCompanyInfo);
  const messages = [
    { role: 'system' as const, content: getSystemInstructionCoverLetter(company, language, searchCompanyInfo) },
    ...turns.map(turn => ({
      role: turn.role,
      content: turn.content
    }))
  ];

  const openai = new OpenAI({ apiKey: getAPIKey("openai") });
  const chatCompletion = await openai.chat.completions.create({
    messages: messages,
    model: model_to_use
  });  
  return nl2br(nullToEmptyString(chatCompletion.choices[0].message.content));
}

export async function getOpenAICVResult(
  jobDescription: string,
  position: string,
  language: string,
  dryRun: boolean = false
): Promise<string> {
  if (dryRun) {
    return "<p>Mock OpenAI CV response (dry run).</p>";
  }

  const cv = getBaseCV(language);
  const turns = getCVConversation(language, cv, jobDescription, position);
  const messages = [
    { role: 'system' as const, content: getSystemInstructionCV(language) },
    ...turns.map(turn => ({
      role: turn.role,
      content: turn.content
    }))
  ];

  const openai = new OpenAI({ apiKey: getAPIKey("openai") });
  const chatCompletion = await openai.chat.completions.create({
    messages: messages,
    model: model_to_use
  });
  return removeMarkdownCodeBlocks(nullToEmptyString(chatCompletion.choices[0].message.content));
}

