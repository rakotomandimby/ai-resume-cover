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
Tell me the "npm install" commands to issue.
Provide the **full new contents** of every modified file identified above. 
Do not provide snippets or partial code; give complete, ready-to-use file versions including all necessary imports and dependencies required to make this configuration work immediately upon execution (assuming `os.environ` is used for secrets).

**Constraints:**
- Maintain existing functionality in non-Google sections.
- Ensure compatibility with existing project calls, structure and dependencies. 
- If specific SDK versions are not provided, assume the latest compatible version for Vertex AI Node client.


# GGL Complete Google Gemini Integration Using the Google Gen AI SDK with API Key Authentication

I implement the Google Gemini integration using the `@google/genai` SDK with API key authentication sourced from the `GOOGLEAI_API_KEY` environment variable. I replace the legacy OAuth-focused `@google-cloud/aiplatform` dependency with `@google/genai`, and implement `getGoogleAICoverLetterResult` and `getGoogleAICVResult` in `src/ask-googleai.ts` using multi-turn conversation formatting, system instructions, and post-processing with `nl2br` and `removeMarkdownCodeBlocks`.

### Installation Commands

Run the following commands in your project root to install `@google/genai` and remove the unused `@google-cloud/aiplatform` package:

```bash
npm install @google/genai
npm uninstall @google-cloud/aiplatform
```

---

### Files Modified

1. `package.json`
2. `src/ask-googleai.ts`

---

### `package.json`

```json
{
  "name": "openai-test-01",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "build": "rm -rfv dist && mkdir -pv dist/views && cp -rv views/* dist/views/ && /home/mihamina/Apps/node/bin/npx tsc",
    "start": "rm -rfv dist && mkdir -pv dist/views && cp -rv views/* dist/views/ && /home/mihamina/Apps/node/bin/npx tsc && /home/mihamina/Apps/node/bin/node dist/index.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "devDependencies": {
    "@types/node": "^20.19.43",
    "ts-node": "^10.9.2",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.9.3"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.105.0",
    "@google/genai": "^0.1.1",
    "@types/cookie-parser": "^1.4.10",
    "@types/csurf": "^1.11.5",
    "@types/express": "^5.0.6",
    "body-parser": "^2.3.0",
    "cookie-parser": "^1.4.7",
    "csurf": "^1.11.0",
    "ejs": "^3.1.10",
    "express": "^5.2.1",
    "openai": "^5.23.2",
    "typescript-language-server": "^4.4.1"
  },
  "overrides": {
    "@types/express-serve-static-core": "*"
  }
}
```

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
    return nl2br("Mock GoogleAI cover letter response (dry run).");
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

  const contents = turns.map(turn => ({
    role: turn.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: turn.content }]
  }));

  const ai = new GoogleGenAI({ apiKey: getAPIKey("googleai") });
  const response = await ai.models.generateContent({
    model: GOOGLEAI_MODEL,
    contents: contents,
    config: {
      systemInstruction: getSystemInstructionCoverLetter(company, language, searchCompanyInfo)
    }
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
    return "<p>Mock GoogleAI CV response (dry run).</p>";
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

  const contents = turns.map(turn => ({
    role: turn.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: turn.content }]
  }));

  const ai = new GoogleGenAI({ apiKey: getAPIKey("googleai") });
  const response = await ai.models.generateContent({
    model: GOOGLEAI_MODEL,
    contents: contents,
    config: {
      systemInstruction: getSystemInstructionCV(language)
    }
  });

  const text = response.text || '';
  return removeMarkdownCodeBlocks(text);
}
```

---

### Explanations

1. I instantiate `GoogleGenAI` using `{ apiKey: getAPIKey("googleai") }`, which extracts the key from the `GOOGLEAI_API_KEY` environment variable without requiring OAuth2 tokens.
2. I map the conversation turns from `getCoverLetterConversation` and `getCVConversation` into the structure expected by the Gemini API (`role: 'user' | 'model'` with `parts: [{ text }]`).
3. I configure system instructions using `config.systemInstruction` on the `generateContent` call.
4. I post-process the generated cover letter text using `nl2br` and the CV HTML output using `removeMarkdownCodeBlocks`, matching the behavior of the OpenAI and Anthropic integrations.

GoogleAI gemini-3.7-flash-high (11.9k in, 1.60k out)


