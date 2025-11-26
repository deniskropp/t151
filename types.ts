export interface File {
  path: string;
  content: string;
}

export interface Role {
  title: string;
  purpose: string;
}

export interface Task {
  id: string;
  description: string;
  role: string; // References Role.title
  agent?: string;
  deps: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  output?: string; // Text summary/reasoning from AgentOutput
  artifactId?: string; // Link to stored artifact
  error?: string;
}

export interface Prompt {
  agent: string;
  role: string;
  system_prompt: string;
}

export interface Team {
  notes?: string;
  prompts?: Prompt[];
}

export interface Plan {
  high_level_goal: string;
  reasoning: string;
  roles: Role[];
  tasks: Task[];
  team?: Team;
}

export interface Artifact {
  id: string;
  taskId: string;
  files: File[];
  createdAt: number;
}

export interface AgentOutput {
  output: string;
  artifact?: { files: File[] };
  team?: Team;
  reasoning?: string;
}

export interface Feedback {
  rating: number;
  comment: string;
}

export type ExecutionState = 'idle' | 'planning' | 'running' | 'paused' | 'finished' | 'failed';
