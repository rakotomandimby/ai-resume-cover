# Task: Complete the Google parts to use Google Cloud Vertex AI Integration using API Key Authentication

**Objective:**  
Complete existing code related to Google's services (Vertex AI) in my project to utilize API key authentication for content generation using the Gemini model, not using any OAuth2-based setups.

**Authentication Requirements:**
- **Method**: Strictly use a `GOOGLEAI_API_KEY` environment variable or configuration parameter.
- **Exclusion**: do not use methods that require OAuth2 tokens
- **Target Model**: Ensure the API call is routed specifically through Vertex AI using the Gemini model name/configuration.

**Exclusions:**
- Do not use `vertexAI` attribute in the configuration because Object literal may only specify known properties, but 'vertexAI' does not exist in type 'GoogleGenAIOptions'.


**Deliverables:**  
Tell me the "npm install" or "npm remove"  commands to issue.
Provide the **full new contents** of every modified file identified above. 
Do not provide snippets or partial code; give complete, ready-to-use file versions including all necessary imports and dependencies required to make this configuration work immediately upon execution (assuming `os.environ` is used for secrets).

**Constraints:**
- Maintain existing functionality in non-Google sections.
- Ensure compatibility with existing project calls, structure and dependencies. 
- If specific SDK versions are not provided, assume the latest compatible version for Vertex AI Node client.


# GGL Complete Google Gemini integration using API key authentication with the Google Gen AI SDK

I implement the Google Gemini integration in `src/ask-googleai.ts` using the `@google/genai` SDK with API key authentication sourced from `GOOGLEAI_API_KEY`. I map multi-turn conversation turns to Gemini's content structure, pass system instructions through the generation configuration, and format the returned CV and cover letter outputs to maintain consistency with the other providers.

## NPM Commands

No packages need to be added or removed because `@google/genai` is already present in `package.json`. If you need to ensure dependencies are installed, run:

```bash
npm install
```

## Modified Files

- `src/ask-googleai.ts`

---

### `src/ask-googleai.ts`

```typescript
import { GoogleGenAI } from '@google/genai';
import { getSystemInstructionCoverLetter, getSystemInstructionCV, getBaseCV } from './system-instruction';
import { getCoverLetterConversation, getCVConversation } from './prompt';
import { nl2br, getAPIKey, removeMarkdownCodeBlocks } from './utils';

export const GOOGLEAI_MODEL = 'gemini-3.1-pro-preview';

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

  const ai = new GoogleGenAI({ apiKey: getAPIKey('googleai') });
  const response = await ai.models.generateContent({
    model: GOOGLEAI_MODEL,
    contents: contents,
    config: {
      systemInstruction: getSystemInstructionCoverLetter(company, language, searchCompanyInfo),
    },
  });

  const text = response.text || '';
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

  const ai = new GoogleGenAI({ apiKey: getAPIKey('googleai') });
  const response = await ai.models.generateContent({
    model: GOOGLEAI_MODEL,
    contents: contents,
    config: {
      systemInstruction: getSystemInstructionCV(language),
    },
  });

  const text = response.text || '';
  return removeMarkdownCodeBlocks(text);
}
```

## Explanations

1. I import `GoogleGenAI` from `@google/genai` and initialize the client using `{ apiKey: getAPIKey("googleai") }`. This reads `GOOGLEAI_API_KEY` from the environment without using OAuth2 flows or unsupported options.
2. I implement `getGoogleAICoverLetterResult` and `getGoogleAICVResult` to match the exact signatures expected by `src/index.ts`.
3. I map conversation turns generated by `getCoverLetterConversation` and `getCVConversation` into Gemini's format by converting the `'assistant'` role to `'model'`.
4. I provide system instructions via `config.systemInstruction` in `ai.models.generateContent`.
5. I apply `nl2br` on the cover letter output and `removeMarkdownCodeBlocks` on the CV output to align with the application's formatting pipeline.

GoogleAI gemini-3.7-flash-high (11.9k in, 1.08k out)


