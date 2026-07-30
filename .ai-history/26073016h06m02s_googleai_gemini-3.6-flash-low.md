# Objective: Print the used models by each provider 

Currently, when the application is ran, it prints some informative messages on the console.
I want to complete it with the list of used models by each provider.

Tell me the full new contents of the files I need to change in order to achieve what I want.


# GGL Update server startup logging to print the models used by each provider

I update the application to output the models configured for each LLM provider (OpenAI, Gemini, and Anthropic) when starting up the HTTP server in `src/index.ts`. To ensure model names remain centralized and avoid duplicating string constants, I export model name constants (`OPENAI_MODEL`, `GEMINI_MODEL`, `ANTHROPIC_MODEL`) from their respective module files (`src/ask-openai.ts`, `src/ask-gemini.ts`, and `src/ask-anthropic.ts`) and import them into `src/index.ts`.

### Files modified:
- `src/ask-openai.ts`
- `src/ask-gemini.ts`
- `src/ask-anthropic.ts`
- `src/index.ts`

---

### `src/ask-openai.ts`

```typescript
import OpenAI from 'openai';
import { getCoverLetterConversation, getCVConversation } from './prompt';
import { getSystemInstructionCoverLetter, getSystemInstructionCV, getBaseCV } from './system-instruction';
import { nl2br, nullToEmptyString, getAPIKey, removeMarkdownCodeBlocks } from './utils';

export const OPENAI_MODEL = 'gpt-5.6-terra';  

export async function getOpenAICoverLetterResult(
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
    return nl2br("Mock OpenAI cover letter response (dry run).");
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
    model: OPENAI_MODEL
  });  
  
  const content = chatCompletion.choices?.[0]?.message?.content ?? null;
  return nl2br(nullToEmptyString(content));
}

export async function getOpenAICVResult(
  jobDescription: string,
  position: string,
  language: string,
  enableSpecialInstructions: boolean = false,
  specialInstructions: string = '',
  dryRun: boolean = false
): Promise<string> {
  if (dryRun) {
    return "<p>Mock OpenAI CV response (dry run).</p>";
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
    model: OPENAI_MODEL
  });
  
  const content = chatCompletion.choices?.[0]?.message?.content ?? null;
  return removeMarkdownCodeBlocks(nullToEmptyString(content));
}
```

---

### `src/ask-gemini.ts`

```typescript
import { GoogleGenAI } from "@google/genai";
import { getSystemInstructionCoverLetter, getSystemInstructionCV, getBaseCV } from './system-instruction';
import { getCoverLetterConversation, getCVConversation } from './prompt';
import { nl2br, getAPIKey, removeMarkdownCodeBlocks } from './utils';

export const GEMINI_MODEL = 'gemini-3.1-pro-preview';

export async function getGeminiCoverLetterResult(
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
    return nl2br("Mock Gemini cover letter response (dry run).");
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
  
  // Map the multi-step conversation turns into a structured prompt string for Gemini
  const prompt = turns.map(turn => `${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.content}`).join('\n\n');

  const client = new GoogleGenAI({ apiKey: getAPIKey("gemini") });
  const interaction = await client.interactions.create({
    model: GEMINI_MODEL,
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
  enableSpecialInstructions: boolean = false,
  specialInstructions: string = '',
  dryRun: boolean = false
): Promise<string> {
  if (dryRun) {
    return "<p>Mock Gemini CV response (dry run).</p>";
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

  // Map the multi-step conversation turns into a structured prompt string for Gemini
  const prompt = turns.map(turn => `${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.content}`).join('\n\n');

  const client = new GoogleGenAI({ apiKey: getAPIKey("gemini") });
  const interaction = await client.interactions.create({
    model: GEMINI_MODEL,
    system_instruction: getSystemInstructionCV(language),
    input: prompt
  });
  
  const lastStep = interaction.steps?.at(-1) as any;
  const text = lastStep?.content?.[0]?.text || "";
  return removeMarkdownCodeBlocks(text);
}
```

---

### `src/ask-anthropic.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { getSystemInstructionCoverLetter, getSystemInstructionCV, getBaseCV } from './system-instruction';
import { getCoverLetterConversation, getCVConversation } from './prompt';
import { nl2br, getAPIKey, removeMarkdownCodeBlocks } from './utils';

export const ANTHROPIC_MODEL = 'claude-opus-5';

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
    model: ANTHROPIC_MODEL,
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
    model: ANTHROPIC_MODEL,
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
```

---

### `src/index.ts`

```typescript
import express, { NextFunction, Request, Response } from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import { getOpenAICoverLetterResult, getOpenAICVResult, OPENAI_MODEL } from './ask-openai';
import { getGeminiCoverLetterResult, getGeminiCVResult, GEMINI_MODEL } from './ask-gemini';
import { getAnthropicCoverLetterResult, getAnthropicCVResult, ANTHROPIC_MODEL } from './ask-anthropic';
import { getAuthToken } from './utils';

type GenerationStatus = 'idle' | 'success' | 'error';

interface GenerationResult {
  status: GenerationStatus;
  content: string;
}

interface TemplateResults {
  geminiCV: GenerationResult;
  openAICV: GenerationResult;
  anthropicCV: GenerationResult;
  geminiCoverLetter: GenerationResult;
  openAICoverLetter: GenerationResult;
  anthropicCoverLetter: GenerationResult;
}

const createInitialResults = (): TemplateResults => ({
  geminiCV: {
    status: 'idle',
    content: 'Waiting for your job description for CV generation',
  },
  openAICV: {
    status: 'idle',
    content: 'Waiting for your job description for CV generation',
  },
  anthropicCV: {
    status: 'idle',
    content: 'Waiting for your job description for CV generation',
  },
  geminiCoverLetter: {
    status: 'idle',
    content: 'Waiting for your question for Cover Letter',
  },
  openAICoverLetter: {
    status: 'idle',
    content: 'Waiting for your question for Cover Letter',
  },
  anthropicCoverLetter: {
    status: 'idle',
    content: 'Waiting for your question for Cover Letter',
  },
});

const createUniformResults = (status: GenerationStatus, content: string): TemplateResults => ({
  geminiCV: { status, content },
  openAICV: { status, content },
  anthropicCV: { status, content },
  geminiCoverLetter: { status, content },
  openAICoverLetter: { status, content },
  anthropicCoverLetter: { status, content },
});

const mapSettledResult = (
  result: PromiseSettledResult<string>,
  contexts: { logContext: string; userMessagePrefix: string }
): GenerationResult => {
  if (result.status === 'fulfilled') {
    return { status: 'success', content: result.value };
  }

  const reason = result.reason;
  const message = reason instanceof Error ? reason.message : 'Unknown error occurred';
  console.error(`${contexts.logContext}:`, reason);

  return {
    status: 'error',
    content: `${contexts.userMessagePrefix}: ${message}`,
  };
};

const app = express();
const port = process.env.PORT || 3000;

// --- Environment Variable Checks ---
const envErrors: string[] = [];

if (!process.env.OPENAI_API_KEY) {
  envErrors.push('OPENAI_API_KEY is not set. OpenAI features may not work.');
}
if (!process.env.GOOGLEAI_API_KEY) {
  envErrors.push('GOOGLEAI_API_KEY is not set. Google AI features may not work.');
}
if (!process.env.ANTHROPIC_API_KEY) {
  envErrors.push('ANTHROPIC_API_KEY is not set. Anthropic features may not work.');
}

const configuredAuthToken = getAuthToken();
if (!configuredAuthToken) {
  envErrors.push('AUTH_TOKEN is not set or is empty. The application is insecure, and submissions will be blocked.');
}
// --- End Environment Variable Checks ---

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
const csrfProtection = csrf({ cookie: true });

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.static('public'));

app.get('/', csrfProtection, (req: Request, res: Response) => {
  res.render('index', {
    envErrors,
    results: createInitialResults(),
    csrfToken: (req as any).csrfToken(),
    formError: null,
    selectedCombination: 'openai-gemini',
    isInitialLoad: true,
  });
});

app.post('/', csrfProtection, async (req: Request, res: Response) => {
  const csrfTokenValue = (req as any).csrfToken();
  const { job, language, position, words, token: submittedToken, providersCombination } = req.body;
  const companyFromRequest = req.body.company;
  const searchCompanyInfo = req.body.searchCompany === 'true';
  const enableSpecialInstructions = req.body.enableSpecialInstructions === 'true';
  const specialInstructions = req.body.specialInstructions || '';
  const useSeparateCVInstructions = req.body.useSeparateCVInstructions === 'true';
  const cvSpecialInstructions = req.body.cvSpecialInstructions || '';

  // By default, the cover letter special instructions are shared with the CV.
  // When the user opts in to separate CV instructions, use the dedicated CV field instead.
  const enableCVSpecialInstructions = enableSpecialInstructions;
  const effectiveCVSpecialInstructions =
    enableSpecialInstructions && useSeparateCVInstructions ? cvSpecialInstructions : specialInstructions;

  const validCombinations = ['openai-gemini', 'openai-anthropic', 'gemini-anthropic'];
  const selectedCombination = validCombinations.includes(providersCombination) ? providersCombination : 'openai-gemini';

  const baseRenderOptionsForPost = {
    envErrors,
    results: createUniformResults('error', 'An error occurred or input was missing.'),
    csrfToken: csrfTokenValue,
    formError: null as string | null,
    selectedCombination,
    isInitialLoad: false,
  };

  if (!job || !language || !position || !words || submittedToken === undefined) {
    return res.render('index', {
      ...baseRenderOptionsForPost,
      formError: 'Missing required fields: job, language, position, words, or token.',
      results: createUniformResults('error', 'Missing required fields.'),
    });
  }

  if (searchCompanyInfo && !companyFromRequest) {
    return res.render('index', {
      ...baseRenderOptionsForPost,
      formError: "Company name is required when 'Attempt to use specific information' is checked.",
      results: createUniformResults('error', 'Company name required.'),
    });
  }

  const companyForProcessing = searchCompanyInfo ? companyFromRequest! : 'Unknown';

  if (!configuredAuthToken) {
    return res.render('index', {
      ...baseRenderOptionsForPost,
      formError: 'Security Alert: Application AUTH_TOKEN is not configured. Submission rejected.',
      results: createUniformResults('error', 'AUTH_TOKEN not configured.'),
    });
  }

  if (submittedToken !== configuredAuthToken) {
    return res.render('index', {
      ...baseRenderOptionsForPost,
      formError: 'Invalid token.',
      results: createUniformResults('error', 'Invalid token.'),
    });
  }

  const dryRun = false;

  const runGemini = selectedCombination === 'openai-gemini' || selectedCombination === 'gemini-anthropic';
  const runOpenAI = selectedCombination === 'openai-gemini' || selectedCombination === 'openai-anthropic';
  const runAnthropic = selectedCombination === 'openai-anthropic' || selectedCombination === 'gemini-anthropic';

  const geminiCVPromise = runGemini
    ? getGeminiCVResult(
        job,
        position,
        language,
        enableCVSpecialInstructions,
        effectiveCVSpecialInstructions,
        dryRun
      )
    : Promise.resolve('Not selected');

  const openAICVPromise = runOpenAI
    ? getOpenAICVResult(
        job,
        position,
        language,
        enableCVSpecialInstructions,
        effectiveCVSpecialInstructions,
        dryRun
      )
    : Promise.resolve('Not selected');

  const anthropicCVPromise = runAnthropic
    ? getAnthropicCVResult(
        job,
        position,
        language,
        enableCVSpecialInstructions,
        effectiveCVSpecialInstructions,
        dryRun
      )
    : Promise.resolve('Not selected');

  const geminiCoverLetterPromise = runGemini
    ? getGeminiCoverLetterResult(
        companyForProcessing,
        position,
        job,
        language,
        words,
        searchCompanyInfo,
        enableSpecialInstructions,
        specialInstructions,
        dryRun
      )
    : Promise.resolve('Not selected');

  const openAICoverLetterPromise = runOpenAI
    ? getOpenAICoverLetterResult(
        companyForProcessing,
        position,
        job,
        language,
        words,
        searchCompanyInfo,
        enableSpecialInstructions,
        specialInstructions,
        dryRun
      )
    : Promise.resolve('Not selected');

  const anthropicCoverLetterPromise = runAnthropic
    ? getAnthropicCoverLetterResult(
        companyForProcessing,
        position,
        job,
        language,
        words,
        searchCompanyInfo,
        enableSpecialInstructions,
        specialInstructions,
        dryRun
      )
    : Promise.resolve('Not selected');

  const [
    geminiCVResponse,
    openAICVResponse,
    anthropicCVResponse,
    geminiCoverLetterResponse,
    openAICoverLetterResponse,
    anthropicCoverLetterResponse,
  ] = await Promise.allSettled([
    geminiCVPromise,
    openAICVPromise,
    anthropicCVPromise,
    geminiCoverLetterPromise,
    openAICoverLetterPromise,
    anthropicCoverLetterPromise,
  ]);

  const finalResults: TemplateResults = {
    geminiCV: mapSettledResult(geminiCVResponse, {
      logContext: 'Error with Gemini CV generation',
      userMessagePrefix: 'Error generating CV with Gemini',
    }),
    openAICV: mapSettledResult(openAICVResponse, {
      logContext: 'Error with OpenAI CV generation',
      userMessagePrefix: 'Error generating CV with OpenAI',
    }),
    anthropicCV: mapSettledResult(anthropicCVResponse, {
      logContext: 'Error with Anthropic CV generation',
      userMessagePrefix: 'Error generating CV with Anthropic',
    }),
    geminiCoverLetter: mapSettledResult(geminiCoverLetterResponse, {
      logContext: 'Error with Gemini Cover Letter generation',
      userMessagePrefix: 'Error generating Cover Letter with Gemini',
    }),
    openAICoverLetter: mapSettledResult(openAICoverLetterResponse, {
      logContext: 'Error with OpenAI Cover Letter generation',
      userMessagePrefix: 'Error generating Cover Letter with OpenAI',
    }),
    anthropicCoverLetter: mapSettledResult(anthropicCoverLetterResponse, {
      logContext: 'Error with Anthropic Cover Letter generation',
      userMessagePrefix: 'Error generating Cover Letter with Anthropic',
    }),
  };

  res.render('index', {
    envErrors,
    results: finalResults,
    csrfToken: csrfTokenValue,
    formError: null,
    selectedCombination,
    isInitialLoad: false,
  });
});

// CSRF error handler middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.code === 'EBADCSRFTOKEN') {
    console.warn('CSRF Token Validation Failed for request to:', req.path);
    res.status(403).render('index', {
      envErrors,
      results: createInitialResults(),
      csrfToken: (req as any).csrfToken ? (req as any).csrfToken() : '',
      formError:
        'Invalid form submission token. Please refresh the page and try again. Ensure cookies are enabled in your browser.',
      selectedCombination: 'openai-gemini',
      isInitialLoad: true,
    });
  } else {
    next(err);
  }
});

app.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`);
  console.log('Configured Models:');
  console.log(`- OpenAI: ${OPENAI_MODEL}`);
  console.log(`- Gemini: ${GEMINI_MODEL}`);
  console.log(`- Anthropic: ${ANTHROPIC_MODEL}`);
  if (envErrors.length > 0) {
    console.warn('--- Configuration Issues Detected ---');
    envErrors.forEach((err) => console.warn(`- ${err}`));
    console.warn('------------------------------------');
  }
});
```

GoogleAI gemini-3.6-flash-low (11.7k in, 5.50k out)


