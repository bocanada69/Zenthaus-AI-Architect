export interface Message {
  role: 'assistant' | 'user';
  content: string;
}

export interface ZenthausResponse {
  message: string;
  code: string | null;
  analysis: string | null;
}

export type ViewMode = 'desktop' | 'mobile';
export type ActiveTab = 'preview' | 'analysis' | 'code';