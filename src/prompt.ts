export function getPromptCoverLetter(language: string, company: string, position: string, words: string, searchCompanyInfo: boolean): string { // Renamed from getPrompt
  if (language === 'French') {
    if (searchCompanyInfo && company && company !== 'Unknown') {
      return 'Écris une lettre de motivation de ' + words + ' mots pour postuler au poste "' + position + '" dans la société "' + company + '".';
    }
    return 'Écris une lettre de motivation de ' + words + ' mots pour postuler au poste "' + position + '".';
  }
  if (language === 'English') {
    if (searchCompanyInfo && company && company !== 'Unknown') {
      return 'Write a ' + words + ' words cover letter to apply for the "' + position + '" position at the "' + company + '" company.';
    }
    return 'Write a ' + words + ' words cover letter to apply for the "' + position + '" position.';
  }
  return '';
}

// New function for CV prompt
export function getPromptCV(language: string, jobDescription: string, position: string): string {
  if (language === 'French') {
    return `En te basant sur la description de poste suivante pour le rôle de "${position}", génère un CV personnalisé. La description de poste est : "${jobDescription}".`;
  }
  if (language === 'English') {
    return `Based on the following job description for the "${position}" role, generate a tailored CV. The job description is: "${jobDescription}".`;
  }
  return '';
}

