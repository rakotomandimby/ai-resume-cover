import OpenAI from 'openai';
import { getPromptCoverLetter, getPromptCV } from './prompt';
import { getSystemInstructionCoverLetter, getSystemInstructionCV } from './system-instruction';
import { nl2br, nullToEmptyString, getAPIKey, removeMarkdownCodeBlocks } from './utils';

const model_to_use = 'gpt-5.4';  

export async function getOpenAICoverLetterResult(company: string, position: string, job: string, language: string, words: string, searchCompanyInfo: boolean, dryRun: boolean = false): Promise<string> {
  if (dryRun) {
    getSystemInstructionCoverLetter(company, job, words, language, searchCompanyInfo);
    return nl2br("Mock OpenAI cover letter response (dry run).");
  }

  const openai = new OpenAI({apiKey: getAPIKey("openai")});
  const chatCompletion = await openai.chat.completions.create({
    messages: [
      {role: 'system', content: getSystemInstructionCoverLetter(company, job, words, language, searchCompanyInfo)},
      {role: 'user', content: getPromptCoverLetter(language, company, position, words)}
    ],
    model: model_to_use});  
  return nl2br( nullToEmptyString(chatCompletion.choices[0].message.content));
}

export async function getOpenAICVResult(jobDescription: string, position: string, language: string, dryRun: boolean = false): Promise<string> {
  if (dryRun) {
    return "<p>Mock OpenAI CV response (dry run).</p>";
  }

  const openai = new OpenAI({apiKey: getAPIKey("openai")});
  const chatCompletion = await openai.chat.completions.create({
    messages: [
      {role: 'system', content: getSystemInstructionCV(jobDescription, language)},
      {role: 'user', content: getPromptCV(language, jobDescription, position)}
    ],
    model: model_to_use});
  return removeMarkdownCodeBlocks(nullToEmptyString(chatCompletion.choices[0].message.content));
}

