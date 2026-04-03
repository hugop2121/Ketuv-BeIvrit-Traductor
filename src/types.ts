export interface WordAnalysis {
  word: string;
  root: string;
  lexicalForm: string;
  category: string;
  morphology: string; // e.g., "Verb, Qal, Perfect, 3ms"
  function: string;
  transliteration: string;
  pronunciation: string;
}

export interface VerseData {
  book: string;
  chapter: number;
  verse: number;
  hebrewText: string;
  words: WordAnalysis[];
  aiTranslation: string;
  aiExplanation: string;
}

export interface UserTranslation {
  id?: string;
  userId: string;
  book: string;
  chapter: number;
  verse: number;
  translation: string;
  updatedAt: any;
}

export interface VerseNote {
  id?: string;
  userId: string;
  book: string;
  chapter: number;
  verse: number;
  content: string;
  updatedAt: any;
}
