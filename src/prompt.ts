export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

// Multi-step cover letter prompting process:
// 1. user: ask for help writing a cover letter (hardcoded)
// 2. assistant: ask for the source professional history (hardcoded)
// 3. user: provide the source professional history (from the markdown CV file)
// 4. assistant: ask for the job description (hardcoded)
// 5. user: provide the job description (from the web form input)
// 6. assistant: ask what to do next (hardcoded)
// 7. user: ask for the cover letter with language, word count, position, company
export function getCoverLetterConversation(
  language: string,
  cv: string,
  job: string,
  position: string,
  company: string,
  words: string,
  searchCompanyInfo: boolean
): ConversationTurn[] {
  if (language === 'French') {
    const finalPrompt = (searchCompanyInfo && company && company !== 'Unknown')
      ? `S'il te plaît, rédiges une lettre de motivation de ${words} mots pour postuler au poste de "${position}" au sein de l'entreprise "${company}".`
      : `S'il te plaît, rédiges une lettre de motivation de ${words} mots pour postuler au poste de "${position}".`;

    return [
      { role: 'user', content: "Peux-tu m'aider à rédiger une lettre de motivation ?" },
      { role: 'assistant', content: "Bien sûr, veuillez fournir votre historique professionnel source." },
      { role: 'user', content: cv },
      { role: 'assistant', content: "Merci. Maintenant, veuillez fournir la description du poste." },
      { role: 'user', content: job },
      { role: 'assistant', content: "C'est noté. Que voulez-vous que je fasse ensuite ?" },
      { role: 'user', content: finalPrompt }
    ];
  } else {
    const finalPrompt = (searchCompanyInfo && company && company !== 'Unknown')
      ? `Please write a ${words} words cover letter to apply for the "${position}" position at the "${company}" company.`
      : `Please write a ${words} words cover letter to apply for the "${position}" position.`;

    return [
      { role: 'user', content: "Can you help me write a cover letter?" },
      { role: 'assistant', content: "Sure, please provide your source professional history." },
      { role: 'user', content: cv },
      { role: 'assistant', content: "Thank you. Now please provide the job description." },
      { role: 'user', content: job },
      { role: 'assistant', content: "Got it. What would you like me to do next?" },
      { role: 'user', content: finalPrompt }
    ];
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

