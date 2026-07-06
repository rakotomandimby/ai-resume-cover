# **Objective:** Enhance the cover letter generation by adding an optional field for special instructions that will influence the AI API prompt.

**Overview:**

- In the main page (index.ejs), there is an input field for the company name. Whether or not a company name is provided will affect how the prompt is constructed.
- We plan to add an additional optional field for special instructions. This new field will allow users to customize the generated cover letter further.

**Functionality and Behavior:**

- **By Default:** The special instruction option is enabled.
- **When Enabled:**  
  - The user can type in custom guidance in a text area.
  - This custom instruction will be appended as an extra dialogue turn in the multi-turn prompt sent to the AI.
- **When Disabled:**  
  - If the user opts to disable this option via a checkbox, the text area will become read-only and remain empty and cleared from any previous input.
  - As a result, no extra dialogue turn for special instructions will be included in the prompt.

Tell me the full new contents of the files that I need to modify or create to implement this feature.


# GGL Enhance cover letter generation with an optional special instructions field

I implement this feature by adding a checkbox and a textarea for special instructions in the HTML template, updating the Express router to extract these fields from the request body, and updating the multi-turn prompt builder to append the special instructions as a dedicated dialogue turn if they are enabled and provided. I also update the OpenAI, Gemini, and Anthropic wrapper functions to accept these new parameters and pass them down to the prompt builder.

Here is the list of files that are being modified:
- `views/index.ejs`
- `src/prompt.ts`
- `src/index.ts`
- `src/ask-openai.ts`
- `src/ask-gemini.ts`
- `src/ask-anthropic.ts`

---

### 1. `views/index.ejs`

I update the frontend template to include a checkbox to enable/disable special instructions and a textarea for custom guidance. I also add the client-side JavaScript logic to handle enabling and disabling the special instructions textarea. When disabled, the textarea is made read-only and cleared.

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/css/flag-icons.min.css" />
    <title>Job Application Assistant</title>
  </head>
  <body>

    <div class="container">

      <% if (typeof envErrors !== 'undefined' && envErrors.length > 0) { %>
        <div class="alert alert-danger mt-3" role="alert">
          <h4 class="alert-heading">Configuration Error!</h4>
          <p>The application has detected the following configuration issues. Please resolve them for full functionality:</p>
          <hr>
          <ul>
            <% envErrors.forEach(function(error) { %>
              <li><%- error %></li>
            <% }); %>
          </ul>
        </div>
      <% } %>

      <% if (!isInitialLoad) { %>
      <h2 class="mt-4">Generated Documents</h2>
      <% } %>

      <!-- New Row for CV Results -->
      <% if (!isInitialLoad) { %>
      <h3 class="mt-3">Tailored CVs</h3>
      <div class="row">
        <% if (selectedCombination === 'openai-gemini' || selectedCombination === 'gemini-anthropic') { %>
        <div class="col-md-6">
          <div class="card">
            <div class="card-header">
              Gemini CV Result
            </div>
            <div class="card-body" id="geminiCVResult">
              <% if (results.geminiCV.status === 'error') { %>
                <div class="alert alert-danger mb-0"><%= results.geminiCV.content %></div>
              <% } else if (results.geminiCV.status === 'idle') { %>
                <p class="text-muted mb-0"><%= results.geminiCV.content %></p>
              <% } else { %>
                <%- results.geminiCV.content %>
              <% } %>
            </div>
          </div>
        </div>
        <% } %>

        <% if (selectedCombination === 'openai-gemini' || selectedCombination === 'openai-anthropic') { %>
        <div class="col-md-6">
          <div class="card">
            <div class="card-header">
              OpenAI CV Result
            </div>
            <div class="card-body" id="openAICVResult">
              <% if (results.openAICV.status === 'error') { %>
                <div class="alert alert-danger mb-0"><%= results.openAICV.content %></div>
              <% } else if (results.openAICV.status === 'idle') { %>
                <p class="text-muted mb-0"><%= results.openAICV.content %></p>
              <% } else { %>
                <%- results.openAICV.content %>
              <% } %>
            </div>
          </div>
        </div>
        <% } %>

        <% if (selectedCombination === 'openai-anthropic' || selectedCombination === 'gemini-anthropic') { %>
        <div class="col-md-6">
          <div class="card">
            <div class="card-header">
              Anthropic CV Result
            </div>
            <div class="card-body" id="anthropicCVResult">
              <% if (results.anthropicCV.status === 'error') { %>
                <div class="alert alert-danger mb-0"><%= results.anthropicCV.content %></div>
              <% } else if (results.anthropicCV.status === 'idle') { %>
                <p class="text-muted mb-0"><%= results.anthropicCV.content %></p>
              <% } else { %>
                <%- results.anthropicCV.content %>
              <% } %>
            </div>
          </div>
        </div>
        <% } %>
      </div>
      <% } %>

      <!-- Existing Row for Cover Letter Results -->
      <% if (!isInitialLoad) { %>
      <h3 class="mt-4">Cover Letters</h3>
      <div class="row mt-3">
        <% if (selectedCombination === 'openai-gemini' || selectedCombination === 'gemini-anthropic') { %>
        <div class="col-md-6">
          <div class="card">
            <div class="card-header">
              Gemini Cover Letter Result
            </div>
            <div class="card-body" id="geminiCoverLetterResult" style="white-space: pre-wrap;">
              <% if (results.geminiCoverLetter.status === 'error') { %>
                <div class="alert alert-danger mb-0"><%= results.geminiCoverLetter.content %></div>
              <% } else if (results.geminiCoverLetter.status === 'idle') { %>
                <p class="text-muted mb-0"><%= results.geminiCoverLetter.content %></p>
              <% } else { %>
                <%- results.geminiCoverLetter.content %>
              <% } %>
            </div>
          </div>
        </div>
        <% } %>

        <% if (selectedCombination === 'openai-gemini' || selectedCombination === 'openai-anthropic') { %>
        <div class="col-md-6">
          <div class="card">
            <div class="card-header">
              OpenAI Cover Letter Result
            </div>
            <div class="card-body" id="openAICoverLetterResult" style="white-space: pre-wrap;">
              <% if (results.openAICoverLetter.status === 'error') { %>
                <div class="alert alert-danger mb-0"><%= results.openAICoverLetter.content %></div>
              <% } else if (results.openAICoverLetter.status === 'idle') { %>
                <p class="text-muted mb-0"><%= results.openAICoverLetter.content %></p>
              <% } else { %>
                <%- results.openAICoverLetter.content %>
              <% } %>
            </div>
          </div>
        </div>
        <% } %>

        <% if (selectedCombination === 'openai-anthropic' || selectedCombination === 'gemini-anthropic') { %>
        <div class="col-md-6">
          <div class="card">
            <div class="card-header">
              Anthropic Cover Letter Result
            </div>
            <div class="card-body" id="anthropicCoverLetterResult" style="white-space: pre-wrap;">
              <% if (results.anthropicCoverLetter.status === 'error') { %>
                <div class="alert alert-danger mb-0"><%= results.anthropicCoverLetter.content %></div>
              <% } else if (results.anthropicCoverLetter.status === 'idle') { %>
                <p class="text-muted mb-0"><%= results.anthropicCoverLetter.content %></p>
              <% } else { %>
                <%- results.anthropicCoverLetter.content %>
              <% } %>
            </div>
          </div>
        </div>
        <% } %>
      </div>
      <% } %>

      <h2 class="mt-4">Generate Documents</h2>

      <% if (typeof formError !== 'undefined' && formError) { %>
        <div class="alert alert-danger mt-3" role="alert">
          <%- formError %>
        </div>
      <% } %>

      <form class="mt-4" action="/" method="POST">
        <input type="hidden" name="_csrf" value="<%= csrfToken %>">
        
        <div class="mb-3">
          <label for="token" class="form-label">Token</label>
          <input type="text" class="form-control" id="token" placeholder="Enter token" name="token" >
        </div>
        <div class="mb-3">
          <label for="company" class="form-label">Company name</label>
          <input type="text" class="form-control" id="company" placeholder="Enter company name" name="company" >
        </div>
        <div class="mb-3 form-check">
          <input type="checkbox" class="form-check-input" id="searchCompany" name="searchCompany" value="true" checked>
          <label class="form-check-label" for="searchCompany">Attempt to use specific information about the company (if name provided)</label>
        </div>
        <div class="mb-3 form-check">
          <input type="checkbox" class="form-check-input" id="enableSpecialInstructions" name="enableSpecialInstructions" value="true" checked>
          <label class="form-check-label" for="enableSpecialInstructions">Add special instructions / custom guidance for the cover letter</label>
        </div>
        <div class="mb-3">
          <label for="specialInstructions" class="form-label" id="specialInstructionsLabel">Special instructions</label>
          <textarea id="specialInstructions" class="form-control" rows="3" name="specialInstructions" placeholder="E.g., emphasize my leadership skills, keep the tone very enthusiastic, etc."></textarea>
        </div>
        <div class="mb-3">
          <label for="position" class="form-label">Position</label>
          <input type="text" class="form-control" id="position" placeholder="Enter position" name="position">
        </div>
        <div class="mb-3">
          <label for="job" class="form-label">Job description (will be used for CV and Cover Letter)</label>
          <textarea id="job" class="form-control" rows="15" name="job" placeholder="Paste the full job description here..."></textarea>
        </div>
        <div class="mb-3">
          <label class="form-label">Language</label>
          <div class="border p-2 rounded">
            <div class="form-check form-check-inline">
              <input class="form-check-input" type="radio" id="languageen" name="language" value="English" checked>
              <label class="form-check-label" for="languageen">
                <span class="fi fi-gb me-2"></span>English
              </label>
            </div>
            <div class="form-check form-check-inline">
              <input class="form-check-input" type="radio" id="languagefr" name="language" value="French">
              <label class="form-check-label" for="languagefr">
                <span class="fi fi-fr me-2"></span>French
              </label>
            </div>
          </div>
        </div>
        <div class="mb-3">
          <label class="form-label">Number of words (for Cover Letter)</label>
          <div class="border p-2 rounded">
            <div class="form-check form-check-inline">
              <input class="form-check-input" type="radio" name="words" id="words100" value="100" checked>
              <label class="form-check-label" for="words100">100</label>
            </div>
            <div class="form-check form-check-inline">
              <input class="form-check-input" type="radio" name="words" id="words200" value="200">
              <label class="form-check-label" for="words200">200</label>
            </div>
            <div class="form-check form-check-inline">
              <input class="form-check-input" type="radio" name="words" id="words300" value="300">
              <label class="form-check-label" for="words300">300</label>
            </div>
          </div>
        </div>
        <div class="mb-3">
          <label class="form-label">API Providers (Select exactly two)</label>
          <div class="border p-2 rounded">
            <div class="form-check form-check-inline">
              <input class="form-check-input" type="radio" name="providersCombination" id="comboOpenAIGemini" value="openai-gemini" <%= selectedCombination === 'openai-gemini' ? 'checked' : '' %>>
              <label class="form-check-label" for="comboOpenAIGemini">OpenAI & Gemini</label>
            </div>
            <div class="form-check form-check-inline">
              <input class="form-check-input" type="radio" name="providersCombination" id="comboOpenAIAnthropic" value="openai-anthropic" <%= selectedCombination === 'openai-anthropic' ? 'checked' : '' %>>
              <label class="form-check-label" for="comboOpenAIAnthropic">OpenAI & Anthropic</label>
            </div>
            <div class="form-check form-check-inline">
              <input class="form-check-input" type="radio" name="providersCombination" id="comboGeminiAnthropic" value="gemini-anthropic" <%= selectedCombination === 'gemini-anthropic' ? 'checked' : '' %>>
              <label class="form-check-label" for="comboGeminiAnthropic">Gemini & Anthropic</label>
            </div>
          </div>
        </div>
        <button type="submit" class="btn btn-primary">Generate</button>
      </form>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>

    <script>
      document.addEventListener('DOMContentLoaded', function() {
        const searchCompanyCheckbox = document.getElementById('searchCompany');
        const companyInput = document.getElementById('company');
        const companyLabel = document.querySelector('label[for="company"]');

        function updateCompanyInputState() {
          if (searchCompanyCheckbox.checked) {
            companyInput.disabled = false;
            companyInput.placeholder = "Enter company name (required for company-specific info)";
            companyLabel.textContent = "Company name (required for search)";
            if (companyInput.value === 'Unknown') {
              companyInput.value = '';
            }
          } else {
            companyInput.disabled = true;
            companyInput.placeholder = "Company information will not be used";
            companyLabel.textContent = "Company name (will not be used)";
            companyInput.value = 'Unknown';
          }
        }

        searchCompanyCheckbox.addEventListener('change', updateCompanyInputState);
        updateCompanyInputState();

        const enableSpecialInstructionsCheckbox = document.getElementById('enableSpecialInstructions');
        const specialInstructionsTextarea = document.getElementById('specialInstructions');
        const specialInstructionsLabel = document.getElementById('specialInstructionsLabel');

        function updateSpecialInstructionsState() {
          if (enableSpecialInstructionsCheckbox.checked) {
            specialInstructionsTextarea.readOnly = false;
            specialInstructionsTextarea.placeholder = "E.g., emphasize my leadership skills, keep the tone very enthusiastic, etc.";
            specialInstructionsLabel.textContent = "Special instructions";
          } else {
            specialInstructionsTextarea.value = '';
            specialInstructionsTextarea.readOnly = true;
            specialInstructionsTextarea.placeholder = "Special instructions are disabled";
            specialInstructionsLabel.textContent = "Special instructions (disabled)";
          }
        }

        enableSpecialInstructionsCheckbox.addEventListener('change', updateSpecialInstructionsState);
        updateSpecialInstructionsState();
      });
    </script>
  </body>
</html>
```

---

### 2. `src/prompt.ts`

I update `getCoverLetterConversation` to accept `enableSpecialInstructions` and `specialInstructions`. If `enableSpecialInstructions` is `true` and `specialInstructions` is a non-empty string, I append an extra conversation turn containing the user's custom instructions.

```typescript
export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export function getCoverLetterConversation(
  language: string,
  cv: string,
  job: string,
  position: string,
  company: string,
  words: string,
  searchCompanyInfo: boolean,
  enableSpecialInstructions?: boolean,
  specialInstructions?: string
): ConversationTurn[] {
  if (language === 'French') {
    const finalPrompt = (searchCompanyInfo && company && company !== 'Unknown')
      ? `S'il te plaît, rédiges une lettre de motivation de ${words} mots en ${language} pour postuler au poste de "${position}" au sein de l'entreprise "${company}".`
      : `S'il te plaît, rédiges une lettre de motivation de ${words} mots en ${language} pour postuler au poste de "${position}".`;

    const turns: ConversationTurn[] = [
      { role: 'user', content: "Peux-tu m'aider à rédiger une lettre de motivation ?" },
      { role: 'assistant', content: "Bien sûr, veuillez fournir votre historique professionnel source." },
      { role: 'user', content: cv },
      { role: 'assistant', content: "Merci. Maintenant, veuillez fournir la description du poste." },
      { role: 'user', content: job },
      { role: 'assistant', content: "C'est noté. Que voulez-vous que je fasse ensuite ?" },
      { role: 'user', content: finalPrompt }
    ];

    if (enableSpecialInstructions && specialInstructions && specialInstructions.trim() !== '') {
      turns.push(
        { role: 'assistant', content: "Entendu. Y a-t-il des instructions particulières ou des directives que je devrais suivre lors de la rédaction ?" },
        { role: 'user', content: specialInstructions.trim() }
      );
    }

    return turns;
  } else {
    const finalPrompt = (searchCompanyInfo && company && company !== 'Unknown')
      ? `Please write a ${words} words cover letter in ${language} to apply for the "${position}" position at the "${company}" company.`
      : `Please write a ${words} words cover letter in ${language} to apply for the "${position}" position.`;

    const turns: ConversationTurn[] = [
      { role: 'user', content: "Can you help me write a cover letter?" },
      { role: 'assistant', content: "Sure, please provide your source professional history." },
      { role: 'user', content: cv },
      { role: 'assistant', content: "Thank you. Now please provide the job description." },
      { role: 'user', content: job },
      { role: 'assistant', content: "Got it. What would you like me to do next?" },
      { role: 'user', content: finalPrompt }
    ];

    if (enableSpecialInstructions && specialInstructions && specialInstructions.trim() !== '') {
      turns.push(
        { role: 'assistant', content: "Understood. Are there any specific instructions or guidelines I should follow while writing?" },
        { role: 'user', content: specialInstructions.trim() }
      );
    }

    return turns;
  }
}

// Multi-step CV prompting process:
// 1. user: ask for help generating a tailored CV (hardcoded)
// 2. assistant: ask for the source professional history (hardcoded)
// 3. user: provide the source professional history (from the markdown CV file)
// 4. assistant: ask for the job description (hardcoded)
// 5. user: provide the job description (from the web form input)
// 6. assistant: ask what to do next (hardcoded)
// 7. user: ask for the tailored CV based on the position and job description
export function getCVConversation(
  language: string,
  cv: string,
  job: string,
  position: string
): ConversationTurn[] {
  if (language === 'French') {
    return [
      { role: 'user', content: "Peux-tu m'aider à générer un CV personnalisé ?" },
      { role: 'assistant', content: "Bien sûr, veuillez fournir votre historique professionnel source." },
      { role: 'user', content: cv },
      { role: 'assistant', content: "Merci. Maintenant, veuillez fournir la description du poste." },
      { role: 'user', content: job },
      { role: 'assistant', content: "C'est noté. Que voulez-vous que je fasse ensuite ?" },
      { role: 'user', content: `En te basant sur la description de poste fournie pour le rôle de "${position}", génère un CV personnalisé.` }
    ];
  } else {
    return [
      { role: 'user', content: "Can you help me generate a tailored CV?" },
      { role: 'assistant', content: "Sure, please provide your source professional history." },
      { role: 'user', content: cv },
      { role: 'assistant', content: "Thank you. Now please provide the job description." },
      { role: 'user', content: job },
      { role: 'assistant', content: "Got it. What would you like me to do next?" },
      { role: 'user', content: `Based on the provided job description for the "${position}" role, generate a tailored CV.` }
    ];
  }
}
```

---

### 3. `src/index.ts`

I update the POST route handler to extract `enableSpecialInstructions` and `specialInstructions` from `req.body`, and pass them to the cover letter generator functions for OpenAI, Gemini, and Anthropic.

```typescript
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
    ? getGeminiCVResult(job, position, language, dryRun)
    : Promise.resolve('Not selected');

  const openAICVPromise = runOpenAI
    ? getOpenAICVResult(job, position, language, dryRun)
    : Promise.resolve('Not selected');

  const anthropicCVPromise = runAnthropic
    ? getAnthropicCVResult(job, position, language, dryRun)
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
```

---

### 4. `src/ask-openai.ts`

I update `getOpenAICoverLetterResult` to accept the two new parameters `enableSpecialInstructions` and `specialInstructions`, passing them down when creating the conversation turns array.

```typescript
import OpenAI from 'openai';
import { getCoverLetterConversation, getCVConversation } from './prompt';
import { getSystemInstructionCoverLetter, getSystemInstructionCV, getBaseCV } from './system-instruction';
import { nl2br, nullToEmptyString, getAPIKey, removeMarkdownCodeBlocks } from './utils';

const model_to_use = 'gpt-5.5';  

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
    model: model_to_use
  });  
  
  const content = chatCompletion.choices?.[0]?.message?.content ?? null;
  return nl2br(nullToEmptyString(content));
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
  
  const content = chatCompletion.choices?.[0]?.message?.content ?? null;
  return removeMarkdownCodeBlocks(nullToEmptyString(content));
}
```

---

### 5. `src/ask-gemini.ts`

I update `getGeminiCoverLetterResult` to accept the two new parameters `enableSpecialInstructions` and `specialInstructions`, passing them down when constructing the multi-turn prompt conversation turns.

```typescript
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
```

---

### 6. `src/ask-anthropic.ts`

I update `getAnthropicCoverLetterResult` to accept the two new parameters `enableSpecialInstructions` and `specialInstructions`, passing them down when creating the conversation turns array.

```typescript
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
  dryRun: boolean = false
): Promise<string> {
  if (dryRun) {
    return "<p>Mock Anthropic CV response (dry run).</p>";
  }

  const cv = getBaseCV(language);
  const turns = getCVConversation(language, cv, jobDescription, position);
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
```

GoogleAI gemini-3.5-flash (14.1k in, 10.3k out)


