# Google provider : Switch to the Vertex AI API

I must switch to the Vertex AI API for generating content using the Gemini model.
Below is an example of how to make a request to the Vertex AI API using `curl` to generate content with the Vertex AI Gemini model.

```bash
API_KEY="YOUR_API_KEY"
MODEL_ID="gemini-2.5-flash-lite"

curl -X POST \
  -H "Content-Type: application/json" \
  "https://aiplatform.googleapis.com/v1/publishers/google/models/${MODEL_ID}:generateContent?key=${API_KEY}" \
  -d '{
    "contents": [{
      "role": "user",
      "parts": [{
        "text": "How does AI work?"
      }]
    }]
  }'
```

And the response is:

```javascript
{
  "candidates": [
    {
      "content": {
        "role": "model",
        "parts": [
          {
            "text": "That's a fantastic and very broad question!"
          }
        ]
      },
      "finishReason": "STOP",
      "avgLogprobs": -0.2157300616235284
    }
  ],
  "usageMetadata": {
    "promptTokenCount": 5,
    "candidatesTokenCount": 1805,
    "totalTokenCount": 1810,
    "trafficType": "ON_DEMAND",
    "promptTokensDetails": [
      {
        "modality": "TEXT",
        "tokenCount": 5
      }
    ],
    "candidatesTokensDetails": [
      {
        "modality": "TEXT",
        "tokenCount": 1805
      }
    ]
  },
  "modelVersion": "gemini-2.5-flash-lite",
  "createTime": "2026-08-17T06:53:29.513084Z",
  "responseId": "6a-CaryoH6Ou1t8P9eOI4QU"
}


```

Make the necessary changes in the Google parts of the code in order to switch to the Vertex AI API for generating content.

Tell me the full new contents of the files I need to change in order to make the switch to the Vertex AI API for generating content using the Gemini model. 


# GGL Switch Google provider implementation to Vertex AI REST API

I update the Google Gemini integration to use the Google Cloud Vertex AI REST API endpoint instead of the `@google/genai` SDK. I replace the previous interactions client with direct HTTP POST requests to `https://aiplatform.googleapis.com/v1/publishers/google/models/${GOOGLEAI_MODEL}:generateContent?key=${API_KEY}`, map conversation turns into Vertex AI contents objects with `user` and `model` roles, include system instructions, and parse the generated text from the response candidates.

### Files modified

- `src/ask-googleai.ts`

---

### `src/ask-googleai.ts`

```typescript
import { getSystemInstructionCoverLetter, getSystemInstructionCV, getBaseCV } from './system-instruction';
import { getCoverLetterConversation, getCVConversation } from './prompt';
import { nl2br, getAPIKey, removeMarkdownCodeBlocks } from './utils';

export const GOOGLEAI_MODEL = 'gemini-2.5-flash-lite';

interface VertexAIPart {
  text: string;
}

interface VertexAIContent {
  role: 'user' | 'model';
  parts: VertexAIPart[];
}

interface VertexAIRequest {
  systemInstruction?: {
    parts: VertexAIPart[];
  };
  contents: VertexAIContent[];
}

interface VertexAICandidate {
  content?: {
    role?: string;
    parts?: VertexAIPart[];
  };
  finishReason?: string;
}

interface VertexAIResponse {
  candidates?: VertexAICandidate[];
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

async function callVertexAI(
  systemInstruction: string,
  contents: VertexAIContent[]
): Promise<string> {
  const apiKey = getAPIKey('googleai');
  if (!apiKey) {
    throw new Error('GOOGLEAI_API_KEY is not set or empty.');
  }

  const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/${GOOGLEAI_MODEL}:generateContent?key=${apiKey}`;

  const requestBody: VertexAIRequest = {
    contents,
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vertex AI API request failed with status ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as VertexAIResponse;
  const parts = data.candidates?.[0]?.content?.parts;
  const text = parts?.map((part) => part.text).join('') || '';
  return text;
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

  const contents: VertexAIContent[] = turns.map((turn) => ({
    role: turn.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: turn.content }],
  }));

  const systemInstruction = getSystemInstructionCoverLetter(company, language, searchCompanyInfo);
  const text = await callVertexAI(systemInstruction, contents);
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

  const contents: VertexAIContent[] = turns.map((turn) => ({
    role: turn.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: turn.content }],
  }));

  const systemInstruction = getSystemInstructionCV(language);
  const text = await callVertexAI(systemInstruction, contents);
  return removeMarkdownCodeBlocks(text);
}
```

### Explanations

1. **API Endpoint & Model Configuration**: I update `GOOGLEAI_MODEL` to `gemini-2.5-flash-lite` and target the Vertex AI generateContent endpoint: `https://aiplatform.googleapis.com/v1/publishers/google/models/${GOOGLEAI_MODEL}:generateContent?key=${apiKey}`.
2. **Payload Structure**: I transform multi-turn conversations from `getCoverLetterConversation` and `getCVConversation` into Vertex AI `contents` arrays with `role: 'user' | 'model'` and `parts: [{ text: ... }]`. I pass the system prompt using the `systemInstruction` property.
3. **HTTP Fetch & Response Handling**: I use standard `fetch` to POST the JSON payload, check for HTTP errors, and extract the generated text from `candidates[0].content.parts`.
4. **Post-processing**: I preserve the existing post-processing pipelines (`nl2br` for cover letters and `removeMarkdownCodeBlocks` for CVs) and keep dry-run handling intact.

GoogleAI gemini-3.7-flash-high (12.3k in, 1.45k out)


