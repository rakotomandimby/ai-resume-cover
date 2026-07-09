import fs from 'fs';

export function getBaseCV(language: string): string {
  if (language === 'French') {
    return fs.readFileSync('./src/cv-fr.md', 'utf8');
  }
  return fs.readFileSync('./src/cv-en.md', 'utf8');
}

export function getSystemInstructionCoverLetter(company: string, language: string, searchCompanyInfo: boolean): string {
  const shouldIncludeCompanySearch = searchCompanyInfo; 
  const company_search_fr = shouldIncludeCompanySearch
    ? 'Prends ce que tu sais sur la société "' + company + '". '
    : '';
  const company_search_en = shouldIncludeCompanySearch
    ? 'Grab what you have about the company "' + company + '". '
    : '';

  let system_instruction_fr = (): string => {
    return '# Instructions pour Lettre de Motivation\n\n'
      + 'Agis en tant que chercheur d\'emploi qui veut rédiger une lettre de motivation qui sera utile pour obtenir un emploi. '
      + company_search_fr
      + 'Tu vas rédiger une lettre de motivation avec des mots qui sont significatifs pour un responsable des ressources humaines.\n\n'
      + 'Parles à la première personne, tu es le candidat. Pour formatter ta réponse, n\'utilises pas Markdown, utilises simplement du texte brut.'
      + 'N\'utilises pas d\'intensificateurs. Évites les adjectifs et adverbes qui servent uniquement à renforcer une affirmation (par exemple : vif, particulièrement, parfaitement, profondément, fortement, véritablement, très, extrêmement), sauf s\'ils apportent une information factuelle indispensable. Préféres un style sobre, neutre et factuel.';
  }

  let system_instruction_en = (): string => {
    return '# Cover Letter Instructions\n\n'
      + 'Act as a job seeker who needs to write a cover letter that will be valuable to get a job. '
      + company_search_en
      + 'Write a cover letter with words that are meaningful to human resource staff.\n\n'
      + 'You will talk in the first person, as you are the candidate. For formatting your answer, do not use Markdown, just plain text.'
      + 'Do not use intensifiers. Avoid adjectives and adverbs whose primary purpose is to strengthen a statement (e.g., strongly, particularly, perfectly, deeply, highly, truly, very, extremely), unless they convey essential factual information. Prefer a restrained, neutral, and factual writing style.';
  }

  if (language === 'French') {
    return system_instruction_fr();
  }
  if (language === 'English') {
    return system_instruction_en();
  }
  return '';
}

export function getSystemInstructionCV(language: string): string {
  let system_instruction_fr = (): string => {
    return '# Instructions pour Génération de CV\n\n'
      + ' Tu es un expert en rédaction de CV. Ta tâche est de créer un CV sur mesure basé sur le CV de base fourni et la description de poste spécifique. \n'
      + ' Le CV doit mettre en évidence les compétences et expériences pertinentes du CV de base qui correspondent aux exigences du poste. \n'
      + ' Réorganise et reformule les sections du CV de base pour les aligner étroitement avec la description de poste. \n'
      + ' Assure-toi que le résultat est un CV complet, professionnel et optimisé pour le poste.\n\n'
      + ' Toujours inclure les mois et les années dans les dates du CV.\n\n'
      + ' Le CV généré doit être formaté en tant que fragment HTML sans la balise HTML, ni la balise HEAD, ni la balise  TITLE, ni la balise BODY, ni la balise BR .'
      + ' Ne pas utiliser de balise STYLE, ni de styles dans les attributs style.'
      + ' Il ne faut mettre aucun élément Markdown dans la réponse: ne jamais mettre de triple apostrophe inversées.';
  }

  let system_instruction_en = (): string => {
    return '# CV Generation Instructions\n\n'
      + ' You are an expert CV writer. Your task is to create a tailored CV based on the provided base CV and the specific job description.\n'
      + ' The CV should highlight relevant skills and experiences from the base CV that match the job requirements.\n'
      + ' Reorganize and rephrase sections of the base CV to align closely with the job description.\n'
      + ' Ensure the output is a complete, professional CV optimized for the position.\n\n'
      + ' Always incluce the months and years in the dates of the CV.\n\n'
      + ' The generated CV should be formatted as an HTML fragment without the HTML tag , nor the HEAD tag , nor the TITLE tag , nor the BODY tag, nor the BR tag.'
      + ' Do not use any STYLE tag, nor inline styles in the style attribute.'
      + ' Do not put any Markdown elements in the answer: do not put triple backticks.';
  }

  if (language === 'French') {
    return system_instruction_fr();
  }
  if (language === 'English') {
    return system_instruction_en();
  }
  return '';
}

