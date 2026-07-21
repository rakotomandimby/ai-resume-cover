import express, { NextFunction, Request, Response } from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import { getOpenAICoverLetterResult, getOpenAICVResult } from './ask-openai';
import { getGeminiCoverLetterResult, getGeminiCVResult } from './ask-gemini';
import { getAnthropicCoverLetterResult, getAnthropicCVResult } from './ask-anthropic';
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
  if (envErrors.length > 0) {
    console.warn('--- Configuration Issues Detected ---');
    envErrors.forEach((err) => console.warn(`- ${err}`));
    console.warn('------------------------------------');
  }
});

