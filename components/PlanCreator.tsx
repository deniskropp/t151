import React, { useState } from 'react';
import { useAppStore } from '../store';
import { generatePlanFromGoal } from '../services/geminiService';
import { Sparkles, Loader2, AlertCircle, Upload, X, File as FileIcon } from 'lucide-react';
import { File as AppFile } from '../types';

export const PlanCreator: React.FC = () => {
  const [goal, setGoal] = useState('');
  const [files, setFiles] = useState<AppFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const setPlan = useAppStore(state => state.setPlan);
  const setActiveTab = useAppStore(state => state.setActiveTab);
  const addArtifact = useAppStore(state => state.addArtifact);
  const clearArtifacts = useAppStore(state => state.clearArtifacts);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles: AppFile[] = [];
      for (const file of Array.from(e.target.files)) {
        try {
          const content = await file.text();
          newFiles.push({ path: file.name, content });
        } catch (err) {
          console.error("Failed to read file", file.name, err);
        }
      }
      setFiles(prev => [...prev, ...newFiles]);
      // Reset input
      e.target.value = ''; 
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (!goal.trim()) return;
    
    setIsLoading(true);
    setError(null);
    try {
      // Clear previous execution data for a fresh start
      await clearArtifacts();

      const plan = await generatePlanFromGoal(goal, files);
      setPlan(plan);

      // Save initial files as context artifact if present
      if (files.length > 0) {
        await addArtifact({
            id: crypto.randomUUID(),
            taskId: 'initial-context',
            files: files,
            createdAt: Date.now()
        });
      }

      setActiveTab('edit');
    } catch (e: any) {
      setError(e.message || "Failed to generate plan. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
          What do you want to build?
        </h1>
        <p className="text-slate-400 text-lg">
          Describe your objective, upload context files, and our AI agents will orchestrate a plan for you.
        </p>
      </div>

      <div className="bg-surface rounded-xl p-6 border border-slate-700 shadow-xl space-y-4">
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
            High Level Goal
            </label>
            <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g., Create a React landing page for a coffee shop with a hero section and menu list..."
            className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-4 text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
            />
        </div>

        {/* File Upload Section */}
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
                Context Files (Optional)
            </label>
            <div className="flex items-center gap-4">
                 <label className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg cursor-pointer transition-colors text-sm text-slate-300">
                    <Upload size={16} />
                    <span>Upload Files</span>
                    <input 
                        type="file" 
                        multiple 
                        className="hidden" 
                        onChange={handleFileChange}
                    />
                 </label>
                 <span className="text-xs text-slate-500">
                    Upload code, docs, or data to help the planner.
                 </span>
            </div>
            
            {files.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {files.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-300">
                            <FileIcon size={12} className="text-blue-400"/>
                            <span className="max-w-[150px] truncate">{file.path}</span>
                            <button onClick={() => removeFile(idx)} className="hover:text-red-400 transition-colors">
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
        
        {error && (
          <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-4 rounded-lg flex items-center gap-2">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={isLoading || !goal.trim()}
          className={`w-full py-4 rounded-lg flex items-center justify-center gap-3 font-semibold text-lg transition-all ${
            isLoading || !goal.trim()
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-500/20'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" />
              Thinking...
            </>
          ) : (
            <>
              <Sparkles />
              Generate Plan
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-400 text-sm">
        <div className="bg-surface/50 p-4 rounded-lg border border-slate-800">
          <strong className="text-slate-200 block mb-1">Define Goal</strong>
          Input a clear objective for the system.
        </div>
        <div className="bg-surface/50 p-4 rounded-lg border border-slate-800">
          <strong className="text-slate-200 block mb-1">AI Planning</strong>
          Gemini breaks it down into roles and tasks.
        </div>
        <div className="bg-surface/50 p-4 rounded-lg border border-slate-800">
          <strong className="text-slate-200 block mb-1">Execute</strong>
          Agents run locally in the browser context.
        </div>
      </div>
    </div>
  );
};