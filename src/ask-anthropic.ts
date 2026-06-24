import Anthropic from '@anthropic-ai/sdk';
import { getSystemInstructionCoverLetter, getSystemInstructionCV } from './system-instruction';
import { getPromptCoverLetter, getPromptCV } from './prompt';
import { nl2br, getAPIKey, removeMarkdownCodeBlocks } from './utils';

const model_to_use = 'claude-opus-4-8';

export async function getAnthropicCoverLetterResult(
  company: string,
  position: string,
  job: string,
  language: string,
  words: string,
  searchCompanyInfo: boolean,
  dryRun: boolean = false
): Promise<string> {
  if (dryRun) {
    getSystemInstructionCoverLetter(company, job, words, language, searchCompanyInfo);
    return nl2br("Mock Anthropic cover letter response (dry run).");
  }

  const client = new Anthropic({ apiKey: getAPIKey("anthropic") });
  const message = await client.messages.create({
    model: model_to_use,
    max_tokens: 4096,
    system: getSystemInstructionCoverLetter(company, job, words, language, searchCompanyInfo),
    messages: [
      { role: 'user', content: getPromptCoverLetter(language, company, position, words, searchCompanyInfo) }
    ]
  });

  let text = '';
  for (const block of message.content) {
    if (block.type === 'text') {
      text += block.text;
    }
  }
  return nl2br(text);
}

export async function getAnthropicCVResult(
  jobDescription: string,
  position: string,
  language: string,
  dryRun: boolean = false
): Promise<string> {
  if (dryRun) {
    return "<p>Mock Anthropic CV response (dry run).</p>";
  }

  const client = new Anthropic({ apiKey: getAPIKey("anthropic") });
  const message = await client.messages.create({
    model: model_to_use,
    max_tokens: 4096,
    system: getSystemInstructionCV(jobDescription, language),
    messages: [
      { role: 'user', content: getPromptCV(language, jobDescription, position) }
    ]
  });

  let text = '';
  for (const block of message.content) {
    if (block.type === 'text') {
      text += block.text;
    }
  }
  return removeMarkdownCodeBlocks(text);
}

