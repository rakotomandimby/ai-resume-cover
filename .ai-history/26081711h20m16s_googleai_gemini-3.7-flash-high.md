# Task: Complete the Google parts to use Google Cloud Vertex AI 

**Objective:**  

Complete existing code related to Google's services (Vertex AI) in my project for content generation using the Gemini model
Documentation tells me that this is how to use the Vertex AI API:

```javascript
const {GoogleGenAI} = require('@google/genai');

const GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT;
const GOOGLE_CLOUD_LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'global';

async function generateContent(
  projectId = GOOGLE_CLOUD_PROJECT,
  location = GOOGLE_CLOUD_LOCATION
) {
  const client = new GoogleGenAI({
    vertexai: true,
    project: projectId,
    location: location,
  });

  const response = await client.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: 'How does AI work?',
  });

  console.log(response.text);

  return response.text;
}
```

**Target Model**: Ensure the API call is routed specifically through Vertex AI using the Gemini model name/configuration.

**Deliverables:**  

Tell me the "npm install" commands to issue.
Provide the **full new contents** of every modified file identified above. 
Do not provide snippets or partial code; give complete, ready-to-use file versions including all necessary imports and dependencies required to make this configuration work immediately upon execution (assuming `os.environ` is used for secrets).

**Constraints:**

- Maintain existing functionality in non-Google sections.
- Ensure compatibility with existing project calls, structure and dependencies. 


# GGL Implement Google Cloud Vertex AI integration with Gemini for CV and cover letter generation

I implement the Google Cloud Vertex AI integration using the `@google/genai` SDK in `src/ask-googleai.ts` and update the environment variable validation in `src/index.ts`. I configure the client to route requests specifically through Vertex AI by enabling `vertexai: true` and utilizing `GOOGLE_CLOUD_PROJECT` and `GOOGLE_CLOUD_LOCATION`. I also convert the multi-turn conversations and system instructions into the format required by `@google/genai` and sanitize the generated outputs using `nl2br` for cover letters and `removeMarkdownCodeBlocks` for CVs.

## List of Modified Files

- `src/ask-googleai.ts`
- `src/index.ts`

## Installation Command

The package `@google/genai` is already defined in your `package.json`. You can install or verify your dependencies with:

```bash
npm install
```

If you ever need to install or update the package explicitly, run:

```bash
npm install @google/genai
```

---

## File Contents

### `src/ask-googleai.ts`

```typescript
import { GoogleGenAI } from '@google/genai';
import { getSystemInstructionCoverLetter, getSystemInstructionCV, getBaseCV } from './system-instruction';
import { getCoverLetterConversation, getCVConversation } from './prompt';
import { nl2br, removeMarkdownCodeBlocks } from './utils';

export const GOOGLEAI_MODEL = 'gemini-3.1-pro-preview';

function getVertexAIClient(): GoogleGenAI {
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  const location = process.env.GOOGLE_CLOUD_LOCATION || 'global';

  return new GoogleGenAI({
    vertexai: true,
    project,
    location,
  });
}

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

  const client = getVertexAIClient();
  const response = await client.models.generateContent({
    model: GOOGLEAI_MODEL,
    contents,
    config: {
      systemInstruction: getSystemInstructionCoverLetter(company, language, searchCompanyInfo),
    },
  });

  const text = response.text ?? '';
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

  const client = getVertexAIClient();
  const response = await client.models.generateContent({
    model: GOOGLEAI_MODEL,
    contents,
    config: {
      systemInstruction: getSystemInstructionCV(language),
    },
  });

  const text = response.text ?? '';
  return removeMarkdownCodeBlocks(text);
}
```

### `src/index.ts`

```typescript
import express, { NextFunction, Request, Response } from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import { getOpenAICoverLetterResult, getOpenAICVResult, OPENAI_MODEL } from './ask-openai';
import { getGoogleAICoverLetterResult, getGoogleAICVResult, GOOGLEAI_MODEL } from './ask-googleai';
import { getAnthropicCoverLetterResult, getAnthropicCVResult, ANTHROPIC_MODEL } from './ask-anthropic';
import { getAuthToken } from './utils';

type GenerationStatus = 'idle' | 'success' | 'error';

interface GenerationResult {
  status: GenerationStatus;
  content: string;
}

interface TemplateResults {
  googleAICV: GenerationResult;
  openAICV: GenerationResult;
  anthropicCV: GenerationResult;
  googleAICoverLetter: GenerationResult;
  openAICoverLetter: GenerationResult;
  anthropicCoverLetter: GenerationResult;
}

const createInitialResults = (): TemplateResults => ({
  googleAICV: {
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
  googleAICoverLetter: {
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
  googleAICV: { status, content },
  openAICV: { status, content },
  anthropicCV: { status, content },
  googleAICoverLetter: { status, content },
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
if (!process.env.GOOGLE_CLOUD_PROJECT && !process.env.GOOGLEAI_API_KEY) {
  envErrors.push('GOOGLE_CLOUD_PROJECT is not set. Google Vertex AI features may not work.');
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
    selectedCombination: 'openai-googleai',
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

  const validCombinations = ['openai-googleai', 'openai-anthropic', 'googleai-anthropic'];
  const selectedCombination = validCombinations.includes(providersCombination) ? providersCombination : 'openai-googleai';

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

  const runGoogleAI = selectedCombination === 'openai-googleai' || selectedCombination === 'googleai-anthropic';
  const runOpenAI = selectedCombination === 'openai-googleai' || selectedCombination === 'openai-anthropic';
  const runAnthropic = selectedCombination === 'openai-anthropic' || selectedCombination === 'googleai-anthropic';

  const googleAICVPromise = runGoogleAI
    ? getGoogleAICVResult(
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

  const googleAICoverLetterPromise = runGoogleAI
    ? getGoogleAICoverLetterResult(
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
    googleAICVResponse,
    openAICVResponse,
    anthropicCVResponse,
    googleAICoverLetterResponse,
    openAICoverLetterResponse,
    anthropicCoverLetterResponse,
  ] = await Promise.allSettled([
    googleAICVPromise,
    openAICVPromise,
    anthropicCVPromise,
    googleAICoverLetterPromise,
    openAICoverLetterPromise,
    anthropicCoverLetterPromise,
  ]);

  const finalResults: TemplateResults = {
    googleAICV: mapSettledResult(googleAICVResponse, {
      logContext: 'Error with GoogleAI CV generation',
      userMessagePrefix: 'Error generating CV with GoogleAI',
    }),
    openAICV: mapSettledResult(openAICVResponse, {
      logContext: 'Error with OpenAI CV generation',
      userMessagePrefix: 'Error generating CV with OpenAI',
    }),
    anthropicCV: mapSettledResult(anthropicCVResponse, {
      logContext: 'Error with Anthropic CV generation',
      userMessagePrefix: 'Error generating CV with Anthropic',
    }),
    googleAICoverLetter: mapSettledResult(googleAICoverLetterResponse, {
      logContext: 'Error with GoogleAI Cover Letter generation',
      userMessagePrefix: 'Error generating Cover Letter with GoogleAI',
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
      selectedCombination: 'openai-googleai',
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
  console.log(`- GoogleAI: ${GOOGLEAI_MODEL}`);
  console.log(`- Anthropic: ${ANTHROPIC_MODEL}`);
  if (envErrors.length > 0) {
    console.warn('--- Configuration Issues Detected ---');
    envErrors.forEach((err) => console.warn(`- ${err}`));
    console.warn('------------------------------------');
  }
});
```

## Explanations

1. I create the `getVertexAIClient` helper in `src/ask-googleai.ts` to instantiate `GoogleGenAI` with `vertexai: true`, `project: process.env.GOOGLE_CLOUD_PROJECT`, and `location: process.env.GOOGLE_CLOUD_LOCATION || 'global'`.
2. I implement `getGoogleAICoverLetterResult` and `getGoogleAICVResult` to map conversation turns to the `role: 'user' | 'model'` structure required by `@google/genai` and supply system instructions in the `config` payload.
3. I apply `nl2br` for cover letters and `removeMarkdownCodeBlocks` for CV results to maintain rendering parity with the other providers.
4. I update `src/index.ts` to check `GOOGLE_CLOUD_PROJECT` for Vertex AI environment configuration warnings.

GoogleAI gemini-3.7-flash-high (11.9k in, 4.26k out)


