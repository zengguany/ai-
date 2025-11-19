export interface StoryState {
  image: string | null; // Base64 string
  storyText: string;
  isGenerating: boolean;
  error: string | null;
}

export enum AudioStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  ERROR = 'ERROR'
}