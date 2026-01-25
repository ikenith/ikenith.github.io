
export type LogType = 'info' | 'success' | 'warning' | 'error';

export interface ActivityLog {
  id: number;
  timestamp: string;
  message: string;
  type: LogType;
}

export interface DraftData {
  title: string;
  date: string;
  content: string;
  imageOption: 'upload' | 'url' | 'none';
  imageUrl: string;
  croppedImageData: string | null;
  filename: string;
  isEditing: boolean;
  postSha: string | null;
  imageSha: string | null;
}

export interface Draft {
  id: string;
  name: string;
  data: DraftData;
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  name: string;
  title: string;
  date: string;
  image: string | null;
  sha: string;
  content: string;
}

export interface Toast {
  id: string;
  message: string;
  type: LogType;
}
