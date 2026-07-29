# Objective: Improve the CV generation process by introducing an optional field for special instructions that will affect the AI API prompt used for generating both the cover letter and the CV.

**Overview:**  
- There is an optional field for special instructions that allows users to further tailor the cover letter.  
- This same functionality should be applied to the CV generation process. This means that if the user enters any special instructions, they will be forwarded to the AI API to customize the CV accordingly.

**Functionality and Behavior:**  
- By default, if special instructions are provided, they will be used for both the cover letter and the CV generation.  
- However, if the user wants to supply distinct instructions for the CV versus the cover letter, a checkbox can be added. When checked, it will enable separate input fields for each set of special instructions.  
- On the technical side: The naming of these fields and the corresponding parameters in the code must be updated to reflect this new feature.

Tell me the full new contents of the files I need to change in order to achieve what I want.


# ANT Adding optional special instructions to CV generation with an option to provide distinct instructions for CV and cover letter

I implement this feature by extending the existing "special instructions" mechanism so it also applies to CV generation. By default, the special instructions entered by the user are shared between the cover letter and the CV. I add a new checkbox ("Use separate instructions for the CV") that, when checked, reveals a dedicated CV special-instructions textarea. When unchecked, the cover letter special instructions are reused for the CV.

Here is my plan across the layers:

- **`views/index.ejs`**: I rename the existing special instructions section to clarify it drives both documents by default, add a "separate CV instructions" checkbox and a dedicated CV textarea, and update the JavaScript to manage the enable/disable and show/hide logic.
- **`src/index.ts`**: I read the new form fields (`useSeparateCVInstructions`, `cvSpecialInstructions`), compute the effective CV instructions (falling back to the cover letter instructions when not separate), and pass them into the CV generation functions.
- **`src/prompt.ts`**: I extend `getCVConversation(...)` to accept optional special instructions and inject them into the CV conversation turns.
- **`src/ask-openai.ts`, `src/ask-gemini.ts`, `src/ask-anthropic.ts`**: I extend the `getXxxCVResult(...)` signatures to accept the special-instruction parameters and forward them to `getCVConversation(...)`.

Below are the full updated files.

## `views/index.ejs`

I add a "separate CV instructions" checkbox and a CV special-instructions textarea inside the special instructions fieldset, and I update the label text to reflect that the base instructions apply to both documents. I also extend the DOM script to handle the new enable/disable and visibility logic.

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
          <input type="text" class="form-control" id="token" placeholder="Enter token" name="token">
        </div>

        <fieldset class="mb-3 border rounded p-3">
          <legend class="float-none w-auto fs-6 fw-semibold px-2">Company</legend>
          <div class="mb-3 form-check">
            <input type="checkbox" class="form-check-input" id="searchCompany" name="searchCompany" value="true" checked>
            <label class="form-check-label" for="searchCompany">Attempt to use specific information about the company</label>
          </div>
          <div class="mb-0">
            <label for="company" class="form-label">Company name</label>
            <input type="text" class="form-control" id="company" placeholder="Enter company name" name="company">
          </div>
        </fieldset>

        <div class="mb-3">
          <label for="position" class="form-label">Position</label>
          <input type="text" class="form-control" id="position" placeholder="Enter position" name="position">
        </div>

        <div class="mb-3">
          <label for="job" class="form-label">Job description (will be used for CV and Cover Letter)</label>
          <textarea id="job" class="form-control" rows="15" name="job" placeholder="Paste the full job description here..."></textarea>
        </div>

        <fieldset class="mb-3 border rounded p-3">
          <legend class="float-none w-auto fs-6 fw-semibold px-2">Special Instructions</legend>
          <div class="mb-3 form-check">
            <input type="checkbox" class="form-check-input" id="enableSpecialInstructions" name="enableSpecialInstructions" value="true" checked>
            <label class="form-check-label" for="enableSpecialInstructions">Add custom guidance (applied to both the cover letter and the CV by default)</label>
          </div>
          <div class="mb-3">
            <label for="specialInstructions" class="form-label" id="specialInstructionsLabel">Special instructions (cover letter and CV)</label>
            <textarea id="specialInstructions" class="form-control" rows="3" name="specialInstructions" placeholder="E.g., emphasize my leadership skills, keep the tone very enthusiastic, etc."></textarea>
          </div>
          <div class="mb-3 form-check">
            <input type="checkbox" class="form-check-input" id="useSeparateCVInstructions" name="useSeparateCVInstructions" value="true">
            <label class="form-check-label" for="useSeparateCVInstructions">Use separate instructions for the CV</label>
          </div>
          <div class="mb-0" id="cvSpecialInstructionsGroup">
            <label for="cvSpecialInstructions" class="form-label" id="cvSpecialInstructionsLabel">Special instructions (CV only)</label>
            <textarea id="cvSpecialInstructions" class="form-control" rows="3" name="cvSpecialInstructions" placeholder="E.g., prioritize technical stack keywords, reorder experience to match the role, etc."></textarea>
          </div>
        </fieldset>

        <fieldset class="mb-3 border rounded p-3">
          <legend class="float-none w-auto fs-6 fw-semibold px-2">Language</legend>
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
        </fieldset>

        <fieldset class="mb-3 border rounded p-3">
          <legend class="float-none w-auto fs-6 fw-semibold px-2">Number of Words (Cover Letter)</legend>
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
        </fieldset>

        <fieldset class="mb-3 border rounded p-3">
          <legend class="float-none w-auto fs-6 fw-semibold px-2">API Providers</legend>
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
        </fieldset>

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
        const useSeparateCVInstructionsCheckbox = document.getElementById('useSeparateCVInstructions');
        const cvSpecialInstructionsGroup = document.getElementById('cvSpecialInstructionsGroup');
        const cvSpecialInstructionsTextarea = document.getElementById('cvSpecialInstructions');

        function updateSpecialInstructionsState() {
          const enabled = enableSpecialInstructionsCheckbox.checked;

          // Base (shared) special instructions
          if (enabled) {
            specialInstructionsTextarea.disabled = false;
            specialInstructionsTextarea.placeholder = "E.g., emphasize my leadership skills, keep the tone very enthusiastic, etc.";
          } else {
            specialInstructionsTextarea.value = '';
            specialInstructionsTextarea.disabled = true;
            specialInstructionsTextarea.placeholder = "Special instructions are disabled";
          }

          // The "separate CV instructions" option only makes sense when instructions are enabled
          useSeparateCVInstructionsCheckbox.disabled = !enabled;
          if (!enabled) {
            useSeparateCVInstructionsCheckbox.checked = false;
          }

          const useSeparate = enabled && useSeparateCVInstructionsCheckbox.checked;

          // Dedicated CV special instructions
          if (useSeparate) {
            cvSpecialInstructionsGroup.style.display = '';
            cvSpecialInstructionsTextarea.disabled = false;
            cvSpecialInstructionsTextarea.placeholder = "E.g., prioritize technical stack keywords, reorder experience to match the role, etc.";
          } else {
            cvSpecialInstructionsGroup.style.display = 'none';
            cvSpecialInstructionsTextarea.value = '';
            cvSpecialInstructionsTextarea.disabled = true;
          }
        }

        enableSpecialInstructionsCheckbox.addEventListener('change', updateSpecialInstructionsState);
        useSeparateCVInstructionsCheckbox.addEventListener('change', updateSpecialInstructionsState);
        updateSpecialInstructionsState();
      });
    </script>
  </body>
</html>
```

## `src/prompt.ts`

I extend `getCVConversation(...)` to accept optional special instructions and inject them as an extra pair of conversation turns, mirroring the cover letter conversation.

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
      ? `S'il te plaît, rédiges une lettre de motivation de ${words} mots en francais pour postuler au poste de "${position}" au sein de l'entreprise "${company}".`
      : `S'il te plaît, rédiges une lettre de motivation de ${words} mots en francais pour postuler au poste de "${position}".`;

    const turns: ConversationTurn[] = [
      { role: 'user', content: "Peux-tu m'aider à rédiger une lettre de motivation ?" },
      { role: 'assistant', content: "Bien sûr, veuillez fournir votre historique professionnel source." },
      { role: 'user', content: cv },
      { role: 'assistant', content: "Merci. Maintenant, veuillez fournir la description du poste." },
      { role: 'user', content: job },
    ];

    if (enableSpecialInstructions && specialInstructions && specialInstructions.trim() !== '') {
      turns.push(
        { role: 'assistant', content: "Y a-t-il des instructions particulières ou des directives que je devrais suivre lors de la rédaction ?" },
        { role: 'user', content: specialInstructions.trim() }
      );
    }
    turns.push(
      { role: 'assistant', content: "C'est noté. Que voulez-vous que je fasse ensuite ?" },
      { role: 'user', content: finalPrompt }
    );
    return turns;
  } else {
    const finalPrompt = (searchCompanyInfo && company && company !== 'Unknown')
      ? `Please write a ${words} words cover letter in english to apply for the "${position}" position at the "${company}" company.`
      : `Please write a ${words} words cover letter in english to apply for the "${position}" position.`;

    const turns: ConversationTurn[] = [
      { role: 'user', content: "Can you help me write a cover letter?" },
      { role: 'assistant', content: "Sure, please provide your source professional history." },
      { role: 'user', content: cv },
      { role: 'assistant', content: "Thank you. Now please provide the job description." },
      { role: 'user', content: job },
    ];

    if (enableSpecialInstructions && specialInstructions && specialInstructions.trim() !== '') {
      turns.push(
        { role: 'assistant', content: "Are there any specific instructions or guidelines I should follow while writing?" },
        { role: 'user', content: specialInstructions.trim() }
      );
    }
    turns.push(
      { role: 'assistant', content: "Got it. What would you like me to do next?" },
      { role: 'user', content: finalPrompt }
    );
    return turns;
  }
}

// Multi-step CV prompting process:
// 1. user: ask for help generating a tailored CV (hardcoded)
// 2. assistant: ask for the source professional history (hardcoded)
// 3. user: provide the source professional history (from the markdown CV file)
// 4. assistant: ask for the job description (hardcoded)
// 5. user: provide the job description (from the web form input)
// 6. (optional) assistant: ask for special instructions (hardcoded)
// 7. (optional) user: provide the special instructions (from the web form input)
// 8. assistant: ask what to do next (hardcoded)
// 9. user: ask for the tailored CV based on the position and job description
export function getCVConversation(
  language: string,
  cv: string,
  job: string,
  position: string,
  enableSpecialInstructions?: boolean,
  specialInstructions?: string
): ConversationTurn[] {
  if (language === 'French') {
    const turns: ConversationTurn[] = [
      { role: 'user', content: "Peux-tu m'aider à générer un CV personnalisé ?" },
      { role: 'assistant', content: "Bien sûr, veuillez fournir votre historique professionnel source." },
      { role: 'user', content: cv },
      { role: 'assistant', content: "Merci. Maintenant, veuillez fournir la description du poste." },
      { role: 'user', content: job },
    ];

    if (enableSpecialInstructions && specialInstructions && specialInstructions.trim() !== '') {
      turns.push(
        { role: 'assistant', content: "Y a-t-il des instructions particulières ou des directives que je devrais suivre lors de la génération du CV ?" },
        { role: 'user', content: specialInstructions.trim() }
      );
    }
    turns.push(
      { role: 'assistant', content: "C'est noté. Que voulez-vous que je fasse ensuite ?" },
      { role: 'user', content: `En te basant sur la description de poste fournie pour le rôle de "${position}", génère un CV personnalisé en français.` }
    );
    return turns;
  } else {
    const turns: ConversationTurn[] = [
      { role: 'user', content: "Can you help me generate a tailored CV?" },
      { role: 'assistant', content: "Sure, please provide your source professional history." },
      { role: 'user', content: cv },
      { role: 'assistant', content: "Thank you. Now please provide the job description." },
      { role: 'user', content: job },
    ];

    if (enableSpecialInstructions && specialInstructions && specialInstructions.trim() !== '') {
      turns.push(
        { role: 'assistant', content: "Are there any specific instructions or guidelines I should follow while generating the CV?" },
        { role: 'user', content: specialInstructions.trim() }
      );
    }
    turns.push(
      { role: 'assistant', content: "Got it. What would you like me to do next?" },
      { role: 'user', content: `Based on the provided job description for the "${position}" role, generate a tailored CV in english.` }
    );
    return turns;
  }
}
```

## `src/index.ts`

I read the new fields, compute the effective CV instructions (falling back to the cover letter instructions when the "separate CV instructions" checkbox is unchecked), and forward them to the CV generation functions.

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
```

## `src/ask-openai.ts`

I extend `getOpenAICVResult(...)` to accept and forward the special-instruction parameters.

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
    model: model_to_use
  });
  
  const content = chatCompletion.choices?.[0]?.message?.content ?? null;
  return removeMarkdownCodeBlocks(nullToEmptyString(content));
}
```

## `src/ask-gemini.ts`

I extend `getGeminiCVResult(...)` to accept and forward the special-instruction parameters.

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
    model: model_to_use,
    system_instruction: getSystemInstructionCV(language),
    input: prompt
  });
  
  const lastStep = interaction.steps?.at(-1) as any;
  const text = lastStep?.content?.[0]?.text || "";
  return removeMarkdownCodeBlocks(text);
}
```

## `src/ask-anthropic.ts`

I extend `getAnthropicCVResult(...)` to accept and forward the special-instruction parameters.

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
```

## Files modified

- `views/index.ejs`
- `src/prompt.ts`
- `src/index.ts`
- `src/ask-openai.ts`
- `src/ask-gemini.ts`
- `src/ask-anthropic.ts`

## Notes on behavior

- When the user enables special instructions and leaves the "Use separate instructions for the CV" checkbox unchecked, the same text is used for both the cover letter and the CV.
- When the user checks "Use separate instructions for the CV", the dedicated CV textarea becomes visible and its content is used for the CV, while the base textarea still drives the cover letter.
- When special instructions are disabled entirely, the "separate CV instructions" option is disabled and cleared client-side, and the server treats CV instructions as absent (empty string with `enable` following the base flag).
- I kept the new CV parameters optional (with defaults) on all three provider functions to remain backward compatible with any other callers.

Anthropic claude-opus-4-8 (21.8k in, 17.1k out)


