import { create } from 'zustand';
import { Plan, Task, Artifact, ExecutionState, Role } from './types';
import * as db from './services/db';

interface AppState {
  // Plan State
  plan: Plan | null;
  setPlan: (plan: Plan) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  addTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  addRole: (role: Role) => void;
  
  // Execution State
  executionState: ExecutionState;
  setExecutionState: (state: ExecutionState) => void;
  
  // Artifacts State
  artifacts: Artifact[];
  addArtifact: (artifact: Artifact) => Promise<void>;
  loadArtifacts: () => Promise<void>;
  clearArtifacts: () => Promise<void>;
  
  // UI State
  activeTab: 'create' | 'edit' | 'execute' | 'artifacts';
  setActiveTab: (tab: 'create' | 'edit' | 'execute' | 'artifacts') => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  plan: null,
  setPlan: (plan) => set({ plan }),
  
  updateTask: (taskId, updates) => set((state) => {
    if (!state.plan) return {};
    const newTasks = state.plan.tasks.map(t => 
      t.id === taskId ? { ...t, ...updates } : t
    );
    return { plan: { ...state.plan, tasks: newTasks } };
  }),

  addTask: (task) => set((state) => {
    if (!state.plan) return {};
    return { plan: { ...state.plan, tasks: [...state.plan.tasks, task] } };
  }),

  deleteTask: (taskId) => set((state) => {
    if (!state.plan) return {};
    return { plan: { ...state.plan, tasks: state.plan.tasks.filter(t => t.id !== taskId) } };
  }),

  addRole: (role) => set((state) => {
    if (!state.plan) return {};
    return { plan: { ...state.plan, roles: [...state.plan.roles, role] } };
  }),

  executionState: 'idle',
  setExecutionState: (executionState) => set({ executionState }),

  artifacts: [],
  addArtifact: async (artifact) => {
    await db.saveArtifact(artifact);
    set((state) => ({ artifacts: [...state.artifacts, artifact] }));
  },
  loadArtifacts: async () => {
    const artifacts = await db.getAllArtifacts();
    set({ artifacts });
  },
  clearArtifacts: async () => {
    await db.clearArtifacts();
    set({ artifacts: [] });
  },

  activeTab: 'create',
  setActiveTab: (activeTab) => set({ activeTab }),
}));