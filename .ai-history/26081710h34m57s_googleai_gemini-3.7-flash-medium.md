# Task: Migrate Google Cloud Vertex AI Integration using API Key Authentication

**Objective:**  
Update all existing code configurations related to Google's services (Vertex AI) in my project to utilize API key authentication for content generation using the Gemini model, not using any OAuth2-based setups.

**Authentication Requirements:**
- **Method**: Strictly use a `GOOGLEAI_API_KEY` environment variable or configuration parameter.
- **Exclusion**: do not use methods that require OAuth2 tokens
- **Target Model**: Ensure the API call is routed specifically through Vertex AI using the Gemini model name/configuration.

**Exclusions:**
- Do not use `vertexAI` attribute in the configuration because Object literal may only specify known properties, but 'vertexAI' does not exist in type 'GoogleGenAIOptions'.


**Deliverables:**  
Provide the **full new contents** of every modified file identified above. Do not provide snippets or partial code; give complete, ready-to-use file versions including all necessary imports and dependencies required to make this configuration work immediately upon execution (assuming `os.environ` is used for secrets).

**Constraints:**
- Maintain existing functionality in non-Google sections.
- Ensure backward compatibility where possible regarding API calls (only changing auth headers/keys internally).
- If specific SDK versions are not provided, assume the latest compatible version for Vertex AI Node client.


# GGL Migrate Google Generative AI integration to use API key authentication without vertexAI client options

I update the Google Generative AI client configuration to authenticate strictly using the API key obtained via the `GOOGLEAI_API_KEY` environment variable, removing the unsupported `vertexAI` option from the `GoogleGenAI` initialization while maintaining compatibility with the Gemini model interactions API.

### Modified files

- `src/ask-googleai.ts`

---

### `src/ask-googleai.ts`

```typescript
import { GoogleGenAI } from "@google/genai";
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
  
  // Map the multi-step conversation turns into a structured prompt string for GoogleAI (Gemini model)
  const prompt = turns.map(turn => `${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.content}`).join('\n\n');

  const client = new GoogleGenAI({
    apiKey: getAPIKey("googleai"),
  });
  const interaction = await client.interactions.create({
    model: GOOGLEAI_MODEL,
    systemInstruction: getSystemInstructionCoverLetter(company, language, searchCompanyInfo),
    input: prompt
  });
  
  const lastStep = interaction.steps?.at(-1) as any;
  const text = lastStep?.content?.[0]?.text || "";
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

  // Map the multi-step conversation turns into a structured prompt string for GoogleAI (Gemini model)
  const prompt = turns.map(turn => `${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.content}`).join('\n\n');

  const client = new GoogleGenAI({
    apiKey: getAPIKey("googleai"),
  });
  const interaction = await client.interactions.create({
    model: GOOGLEAI_MODEL,
    systemInstruction: getSystemInstructionCV(language),
    input: prompt
  });
  
  const lastStep = interaction.steps?.at(-1) as any;
  const text = lastStep?.content?.[0]?.text || "";
  return removeMarkdownCodeBlocks(text);
}
```

### Explanations

I remove the invalid `vertexAI: true` attribute from `GoogleGenAI` initialization in both `getGoogleAICoverLetterResult` and `getGoogleAICVResult`. I pass the API key retrieved by `getAPIKey("googleai")` directly to the `GoogleGenAI` constructor, satisfying the API key authentication requirement while targeting the configured Gemini model (`gemini-3.1-pro-preview`). I also use `systemInstruction` in the `client.interactions.create` call to conform to the SDK specification.

GoogleAI gemini-3.7-flash-medium (12.1k in, 1.00k out)


