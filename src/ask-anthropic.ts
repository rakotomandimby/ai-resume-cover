import Anthropic from '@anthropic-ai/sdk';
import { getSystemInstructionCoverLetter, getSystemInstructionCV, getBaseCV } from './system-instruction';
import { getCoverLetterConversation, getCVConversation } from './prompt';
import { nl2br, getAPIKey, removeMarkdownCodeBlocks } from './utils';

const model_to_use = 'claude-opus-4-8';

export async function getAnthropicCoverLetterResult(
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
    return nl2br("Mock Anthropic cover letter response (dry run).");
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
  const messages = turns.map(turn => ({
    role: turn.role,
    content: turn.content
  }));

  const client = new Anthropic({ apiKey: getAPIKey("anthropic") });
  const message = await client.messages.create({
    model: model_to_use,
    max_tokens: 4096,
    system: getSystemInstructionCoverLetter(company, language, searchCompanyInfo),
    messages: messages
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
  enableSpecialInstructions: boolean = false,
  specialInstructions: string = '',
  dryRun: boolean = false
): Promise<string> {
  if (dryRun) {
    return "<p>Mock Anthropic CV response (dry run).</p>";
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
  const messages = turns.map(turn => ({
    role: turn.role,
    content: turn.content
  }));

  const client = new Anthropic({ apiKey: getAPIKey("anthropic") });
  const message = await client.messages.create({
    model: model_to_use,
    max_tokens: 4096,
    system: getSystemInstructionCV(language),
    messages: messages
  });

  let text = '';
  for (const block of message.content) {
    if (block.type === 'text') {
      text += block.text;
    }
  }
  return removeMarkdownCodeBlocks(text);
}

