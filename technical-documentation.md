# Technical documentation

## Application overview

This application is a Node.js/TypeScript Express web application that generates two job-application documents from a submitted job description:

- a tailored CV;
- a cover letter.

For each submission, the application requests both documents from two LLM providers:

- OpenAI, through the `openai` SDK;
- Google Gemini, through the `@google/generative-ai` SDK.

The generated results are rendered in the `views/index.ejs` page in four panels:

- Gemini CV result;
- OpenAI CV result;
- Gemini cover letter result;
- OpenAI cover letter result.

## Runtime configuration

The application expects these environment variables:

- `OPENAI_API_KEY`: API key used by the OpenAI SDK.
- `GOOGLEAI_API_KEY`: API key used by the Google Generative AI SDK.
- `AUTH_TOKEN`: static token that must match the submitted form token before generation is allowed.
- `PORT`: optional HTTP port. Defaults to `3000`.

If `OPENAI_API_KEY` or `GOOGLEAI_API_KEY` is missing, the application still starts but displays configuration warnings. If `AUTH_TOKEN` is missing or empty, submissions are rejected.

## Web request flow

`src/index.ts` defines the HTTP server.

### `GET /`

The application renders the form and initializes all generation panels with an `idle` status.

### `POST /`

The application reads these form fields:

- `token`: must match `AUTH_TOKEN`;
- `company`: company name;
- `searchCompany`: when equal to `true`, company-specific information is requested;
- `position`: job title or position;
- `job`: full job description;
- `language`: expected to be `English` or `French`;
- `words`: target word count for the cover letter.

The request is rejected before calling any LLM when:

- required fields are missing;
- `searchCompany` is enabled but `company` is missing;
- `AUTH_TOKEN` is not configured;
- the submitted token does not match `AUTH_TOKEN`;
- CSRF validation fails.

When validation succeeds, four LLM calls are launched concurrently with `Promise.allSettled`:

- `getGeminiCVResult(job, position, language)`;
- `getOpenAICVResult(job, position, language)`;
- `getGeminiCoverLetterResult(companyForProcessing, position, job, language, words, searchCompanyInfo)`;
- `getOpenAICoverLetterResult(companyForProcessing, position, job, language, words, searchCompanyInfo)`.

Each fulfilled LLM call becomes a `{ status: "success", content: string }` result. Each rejected LLM call becomes a `{ status: "error", content: string }` result with an error message for the UI.

## Prompt construction

Prompt text is split between:

- `src/prompt.ts`, which builds user prompts;
- `src/system-instruction.ts`, which builds system instructions and embeds the candidate base CV.

The base CV files are read synchronously from:

- `src/cv-en.md`;
- `src/cv-fr.md`.

### Cover letter prompts

For cover letters, the user prompt asks the model to write a cover letter for the selected language, word count, position, and company.

The system instruction tells the model to:

- act as the candidate;
- use the submitted job description;
- use the candidate base CV;
- write in first person;
- avoid Markdown;
- output plain text.

The returned cover letter text is post-processed with `nl2br`, which replaces line breaks with `<br>`.

Current implementation note: the optional company-knowledge sentence in `getSystemInstructionCoverLetter(...)` is included only when `searchCompanyInfo` is `true` and the `company` argument is exactly `Unknown`. In the normal checked-form path, the submitted company name is passed instead, so that optional sentence is usually omitted.

### CV prompts

For CVs, the user prompt asks the model to generate a tailored CV for the selected language, position, and job description.

The system instruction tells the model to:

- act as an expert CV writer;
- tailor the base CV to the submitted job description;
- highlight matching skills and experiences;
- produce a complete professional CV;
- output an HTML fragment only;
- omit `html`, `head`, `title`, `body`, and `br` tags;
- avoid Markdown and triple backtick code fences.

The returned CV text is post-processed with `removeMarkdownCodeBlocks`, which removes opening Markdown code fences such as ```` ```html ```` and closing ```` ``` ```` markers.

## OpenAI API interaction

OpenAI calls are implemented in `src/ask-openai.ts`.

### SDK and model

The application creates a new OpenAI client for each call:

- SDK: `openai`;
- API key source: `getAPIKey("openai")`, which reads `OPENAI_API_KEY`;
- model: `gpt-5.4`.

### Request format

The application uses the Chat Completions API through:

```text
openai.chat.completions.create(...)
```

The request contains:

- `model`: `gpt-5.4`;
- `messages`: an array with exactly two messages:
  - a `system` message containing the generated system instruction;
  - a `user` message containing the generated user prompt.

The application does not set a JSON schema, `response_format`, tools, function calls, temperature, streaming, or token limits.

### Expected OpenAI response format

The application expects the SDK call to resolve to a Chat Completion object with at least this structure:

```text
{
  choices: [
    {
      message: {
        content: string | null
      }
    }
  ]
}
```

Only one response property path is used:

```text
chatCompletion.choices[0].message.content
```

No other OpenAI response properties are read. In particular, the application does not inspect:

- `id`;
- `object`;
- `created`;
- `model`;
- `usage`;
- `choices[*].index`;
- `choices[*].finish_reason`;
- `choices[*].logprobs`;
- any refusal, annotation, or metadata fields.

### OpenAI cover letter handling

`getOpenAICoverLetterResult(...)` reads:

```text
chatCompletion.choices[0].message.content
```

Then it applies:

1. `nullToEmptyString(...)`: converts `null` content to an empty string;
2. `nl2br(...)`: converts newline characters to `<br>`.

The function returns the resulting string to the Express route.

The expected model output is plain text, not Markdown and not JSON.

### OpenAI CV handling

`getOpenAICVResult(...)` reads:

```text
chatCompletion.choices[0].message.content
```

Then it applies:

1. `nullToEmptyString(...)`: converts `null` content to an empty string;
2. `removeMarkdownCodeBlocks(...)`: removes Markdown code fence markers.

The function returns the resulting string to the Express route.

The expected model output is an HTML fragment, not a full HTML document and not JSON.

## Gemini API interaction

Gemini calls are implemented in `src/ask-gemini.ts`.

### SDK and model

The application creates a new Google Generative AI client for each call:

- SDK: `@google/generative-ai`;
- API key source: `getAPIKey("gemini")`, which reads `GOOGLEAI_API_KEY`;
- model: `gemini-3.1-pro-preview`.

### Request format

The application creates a generative model with:

- `model`: `gemini-3.1-pro-preview`;
- `systemInstruction`: the generated system instruction.

It then calls:

```text
model.generateContent(prompt)
```

where `prompt` is the generated user prompt string.

The application does not set a JSON schema, generation config, safety settings, tools, function declarations, streaming, or token limits.

### Expected Gemini response format

The application expects `generateContent(...)` to resolve to an object with at least this structure:

```text
{
  response: {
    text: () => string
  }
}
```

The application uses these response properties and methods:

```text
result.response
result.response.text()
```

No other Gemini response properties are read. In particular, the application does not inspect:

- candidates;
- parts;
- finish reasons;
- safety ratings;
- prompt feedback;
- usage metadata;
- citations;
- grounding metadata.

The SDK's `response.text()` method is responsible for extracting the text from the Gemini response.

### Gemini cover letter handling

`getGeminiCoverLetterResult(...)` reads:

```text
const response = result.response;
const text = response.text();
```

Then it applies:

```text
nl2br(text)
```

The function returns the resulting string to the Express route.

The expected model output is plain text, not Markdown and not JSON.

### Gemini CV handling

`getGeminiCVResult(...)` reads:

```text
const response = result.response;
const text = response.text();
```

Then it applies:

```text
removeMarkdownCodeBlocks(text)
```

The function returns the resulting string to the Express route.

The expected model output is an HTML fragment, not a full HTML document and not JSON.

## Response rendering

The Express route stores each generated value in a `GenerationResult` object:

```text
{
  status: "idle" | "success" | "error",
  content: string
}
```

`views/index.ejs` renders successful LLM content unescaped with EJS `<%- ... %>`. This allows CV HTML fragments and cover-letter `<br>` tags to be rendered as markup.

Error and idle messages are rendered differently:

- errors are shown inside Bootstrap danger alerts;
- idle messages are shown as muted text.

## Important implementation details and limitations

- LLM responses are expected to be text strings. The application does not request or parse JSON from either provider.
- The only OpenAI completion content consumed is `choices[0].message.content`.
- The only Gemini content consumed is the return value of `response.text()`.
- There is no validation that the returned CV is safe or valid HTML.
- There is no validation that the returned cover letter is plain text.
- If OpenAI returns `null` content, the application converts it to an empty string.
- If Gemini returns an empty string through `response.text()`, the empty string is rendered as the result.
- If the first OpenAI choice is missing, or if Gemini's response object does not provide `text()`, the corresponding promise rejects and the UI shows an error for that provider/document.
- The application launches all four LLM requests independently, so one failed provider or document does not prevent successful results from the others from being displayed.
