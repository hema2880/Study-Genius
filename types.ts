
export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  FLASHCARD = 'flashcard',
  OPEN_ENDED = 'open_ended',
  SHORT_QUIZ = 'short_quiz',      // New: Mixed (MC + TF + Open)
  COMPREHENSIVE = 'comprehensive' // New: Mixed (Harder, More Qs)
}

export enum Difficulty {
  EASY = 'Easy',
  MEDIUM = 'Medium',
  HARD = 'Hard',
  MIXED = 'Mixed', // New: Custom distribution
}

export type AppLanguage = 'ar' | 'en';
export type AIProvider = 'gemini' | 'groq' | 'custom';

export interface GradingResult {
  verdict: 'Correct' | 'Incorrect';
  similarity_score: number;
  feedback: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  bloomLevel?: string;
  userAnswer?: string;
  isCorrect?: boolean;
  gradingResult?: GradingResult;
  scientificWarning?: string | null;
  // SRS Fields
  srsStatus?: 'learning' | 'review' | 'mastered';
  nextReviewDate?: number;
  easeFactor?: number;
  interval?: number;
}

export interface QuizSettings {
  questionType: QuestionType;
  difficulty: Difficulty;
  quantity: number;
  maxMode?: boolean; // New: Exhaustive mode
  language: string;
  thinkingMode?: boolean; // New: Thinking Mode
  distribution?: {
    multipleChoice: number;
    trueFalse: number;
    openEnded: number;
  };
  difficultyDistribution?: {
    easy: number;
    medium: number;
    hard: number;
  };
}

export interface Quiz {
  id: string;
  title: string;
  createdAt: number;
  questions: Question[];
  settings: QuizSettings;
  score?: number;
  completed: boolean;
  timeSpentSeconds: number;
}

export interface StudyGuide {
  id: string;
  title: string;
  content: string; // Markdown content
  createdAt: number;
  topics: string[];
}

export interface UserProfile {
  xp: number;
  level: number;
  streak: number;
  lastStudyDate: number;
}

export interface Mistake {
  id: string;
  questionId: string;
  quizTitle: string; 
  question: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  timestamp: number;
}

export enum InputMode {
  TOPIC = 'TOPIC',
  TEXT = 'TEXT',
  FILE = 'FILE',
  URL = 'URL',
}

export interface FileData {
  id: string;
  name: string;
  mimeType: string;
  data: string; // Base64
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface CalendarEvent {
  title: string;
  start: string;
  allDay: boolean;
  description: string;
  color?: string;
}
