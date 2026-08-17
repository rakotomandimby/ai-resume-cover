export function nullToEmptyString(str: string | null): string {
  if (str === null) { return "";}
  else { return str;}
}

export function nl2br(str: string): string {
  return str.replace(/(?:\r\n|\r|\n)/g, '<br>');
}

export function getAPIKey(providerName: string): string {
  if (providerName === "openai") {
    if (process.env["OPENAI_API_KEY"] === undefined) {return "";}
    else {return process.env["OPENAI_API_KEY"];}
  }
  else if (providerName === "googleai") {
    if (process.env["GOOGLEAI_API_KEY"] === undefined) {return "";}
    else {return process.env["GOOGLEAI_API_KEY"];}
  }
  else if (providerName === "anthropic") {
    if (process.env["ANTHROPIC_API_KEY"] === undefined) {return "";}
    else {return process.env["ANTHROPIC_API_KEY"];}
  }
  else {return "";}
}

export function getAuthToken(): string | null {
  const token = process.env["AUTH_TOKEN"];
  if (token === undefined || token === "") {
    // Log a warning on the server side for critical missing configuration
    console.warn("CRITICAL: AUTH_TOKEN environment variable is not set or is empty. Application security is compromised.");
    return null;
  }
  return token;
}


export function removeMarkdownCodeBlocks(text: string): string {
  // Remove the opening code block with language name
  text = text.replace(/```[a-zA-Z]*\n/g, '');
  // Remove the closing code block
  text = text.replace(/```/g, '');
  return text;
}

