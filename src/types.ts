export interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: number;
}

export interface ChatThread {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

export interface ProjectFile {
  id: string;
  name: string;
  language: string;
  content: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  files: ProjectFile[];
  updatedAt: number;
}
