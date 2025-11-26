import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store';
import { executeTaskWithAgent } from '../services/geminiService';
import { Task, Artifact } from '../types';
import { Play, Pause, CheckCircle2, Circle, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

export const PlanExecutor: React.FC = () => {
  const { 
    plan, 
    updateTask, 
    artifacts, 
    addArtifact, 
    executionState, 
    setExecutionState, 
    setActiveTab 
  } = useAppStore();
  
  const [currentRunningTaskId, setCurrentRunningTaskId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [plan, currentRunningTaskId]);

  if (!plan) return <div className="p-8 text-center text-slate-400">No plan loaded.</div>;

  const isTaskReady = (task: Task) => {
    if (task.status !== 'pending') return false;
    const deps = task.deps;
    if (deps.length === 0) return true;
    
    // Check if all dependencies are completed
    return deps.every(depId => {
      const t = plan.tasks.find(pt => pt.id === depId);
      return t && t.status === 'completed';
    });
  };

  const runStep = async () => {
    if (executionState !== 'running') return;

    // Find next ready task
    const readyTask = plan.tasks.find(isTaskReady);

    if (!readyTask) {
      // Check if all completed
      const allCompleted = plan.tasks.every(t => t.status === 'completed');
      if (allCompleted) {
        setExecutionState('finished');
      } else {
        const anyFailed = plan.tasks.some(t => t.status === 'failed');
        if (anyFailed) {
            setExecutionState('paused'); // Pause on error
        }
      }
      return;
    }

    // Execute Task
    setCurrentRunningTaskId(readyTask.id);
    updateTask(readyTask.id, { status: 'running' });

    try {
      // Match Role title
      const role = plan.roles.find(r => r.title === readyTask.role);
      if (!role) throw new Error(`Role ${readyTask.role} not found in plan`);

      // Filter relevant artifacts (simple strategy: all previous artifacts)
      const relevantArtifacts = artifacts; 

      const result = await executeTaskWithAgent(readyTask, role, plan.high_level_goal, relevantArtifacts);

      let artifactId = undefined;

      // Handle Artifact creation if files are present
      if (result.artifact && result.artifact.files && result.artifact.files.length > 0) {
        const newArtifact: Artifact = {
          id: crypto.randomUUID(),
          taskId: readyTask.id,
          files: result.artifact.files,
          createdAt: Date.now()
        };
        await addArtifact(newArtifact);
        artifactId = newArtifact.id;
      }

      updateTask(readyTask.id, { 
        status: 'completed', 
        output: result.output, // Summary
        artifactId: artifactId
      });
      
    } catch (error: any) {
      console.error(error);
      updateTask(readyTask.id, { status: 'failed', error: error.message });
      setExecutionState('paused');
    } finally {
      setCurrentRunningTaskId(null);
    }
  };

  // Run Loop
  useEffect(() => {
    if (executionState === 'running' && !currentRunningTaskId) {
      const timer = setTimeout(runStep, 1000); // Small delay for visual pacing
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executionState, currentRunningTaskId, plan]);

  const progress = Math.round(
    (plan.tasks.filter(t => t.status === 'completed').length / plan.tasks.length) * 100
  );

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 h-full flex flex-col gap-6">
      
      {/* Control Panel */}
      <div className="bg-surface border border-slate-700 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Execution Controller</h2>
          <div className="text-sm text-slate-400 flex items-center gap-2">
            Status: 
            <span className={`uppercase font-bold ${
              executionState === 'running' ? 'text-green-400' : 
              executionState === 'failed' ? 'text-red-400' : 'text-slate-300'
            }`}>
              {executionState}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {executionState === 'running' ? (
             <button 
                onClick={() => setExecutionState('paused')}
                className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-white px-6 py-3 rounded-lg font-bold transition-all"
             >
               <Pause fill="currentColor" /> Pause
             </button>
          ) : executionState === 'finished' ? (
            <button 
                onClick={() => setActiveTab('artifacts')}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold transition-all"
             >
               View Artifacts <ArrowRight />
             </button>
          ) : (
            <button 
                onClick={() => setExecutionState('running')}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg font-bold transition-all shadow-lg shadow-green-900/20"
             >
               <Play fill="currentColor" /> {executionState === 'idle' ? 'Start Execution' : 'Resume'}
             </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-900 rounded-full h-4 overflow-hidden border border-slate-700">
        <div 
          className="bg-gradient-to-r from-blue-500 to-teal-400 h-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Task List / Console */}
      <div 
        ref={scrollRef}
        className="flex-1 bg-slate-950 rounded-xl border border-slate-800 overflow-y-auto p-4 space-y-2 font-mono text-sm shadow-inner"
        style={{ minHeight: '400px' }}
      >
        {plan.tasks.map((task) => (
          <div 
            key={task.id} 
            className={`p-3 rounded border transition-all ${
              task.status === 'running' ? 'bg-blue-900/20 border-blue-500/50' :
              task.status === 'completed' ? 'bg-green-900/10 border-green-900/30' :
              task.status === 'failed' ? 'bg-red-900/10 border-red-900/30' :
              'bg-transparent border-transparent text-slate-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {task.status === 'pending' && <Circle size={16} className="text-slate-600"/>}
                {task.status === 'running' && <Loader2 size={16} className="animate-spin text-blue-400"/>}
                {task.status === 'completed' && <CheckCircle2 size={16} className="text-green-500"/>}
                {task.status === 'failed' && <AlertCircle size={16} className="text-red-500"/>}
                
                <span className={`font-semibold ${
                  task.status === 'pending' ? 'text-slate-500' : 'text-slate-200'
                }`}>[{task.id}]</span>
                <span className="text-slate-400">{task.description}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-xs px-2 py-1 bg-slate-900 rounded text-slate-500 border border-slate-800">
                    {task.role}
                </span>
                {task.agent && (
                    <span className="text-xs px-2 py-1 bg-purple-900/20 rounded text-purple-400 border border-purple-900/30">
                        {task.agent}
                    </span>
                )}
              </div>
            </div>
            
            {task.error && (
              <div className="mt-2 ml-7 text-red-400 text-xs">
                Error: {task.error}
              </div>
            )}

            {task.output && (
                 <div className="mt-2 ml-7 p-2 bg-slate-900/50 rounded text-slate-300 text-xs border border-slate-800/50 whitespace-pre-wrap">
                    {task.output}
                 </div>
            )}
            
            {task.status === 'running' && (
               <div className="mt-2 ml-7 text-blue-400 text-xs animate-pulse">
                 Agent is working...
               </div>
            )}
          </div>
        ))}
        {plan.tasks.length === 0 && <div className="text-slate-600 text-center italic">No tasks in plan</div>}
      </div>
    </div>
  );
};
