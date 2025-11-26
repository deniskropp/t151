import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Task } from '../types';
import { Plus, Trash2, Users, ListTodo, Brain } from 'lucide-react';

export const PlanEditor: React.FC = () => {
  const { plan, updateTask, deleteTask, addTask, addRole, setActiveTab } = useAppStore();
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  
  // Temporary state for new task form
  const [newTaskData, setNewTaskData] = useState<Partial<Task>>({ 
    id: '', description: '', role: '', agent: '', deps: [] 
  });

  if (!plan) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">No plan created yet.</p>
        <button 
          onClick={() => setActiveTab('create')}
          className="text-blue-400 hover:underline mt-2"
        >
          Go to Creator
        </button>
      </div>
    );
  }

  const handleAddTask = () => {
    if (!newTaskData.id || !newTaskData.description || !newTaskData.role) return;
    addTask({
      id: newTaskData.id,
      description: newTaskData.description,
      role: newTaskData.role,
      agent: newTaskData.agent,
      deps: newTaskData.deps || [],
      status: 'pending'
    });
    setNewTaskOpen(false);
    setNewTaskData({ id: '', description: '', role: '', agent: '', deps: [] });
  };

  const toggleDep = (targetTaskId: string, depId: string) => {
    const task = plan.tasks.find(t => t.id === targetTaskId);
    if (!task) return;
    
    const newDeps = task.deps.includes(depId)
      ? task.deps.filter(d => d !== depId)
      : [...task.deps, depId];
    
    updateTask(targetTaskId, { deps: newDeps });
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
      
      {/* Sidebar (Roles & Reasoning) */}
      <div className="lg:col-span-4 space-y-4">
        
        {/* Reasoning Block */}
        <div className="bg-surface border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2 text-purple-400 font-semibold">
                <Brain size={20} />
                <h2>Reasoning</h2>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed italic">
                {plan.reasoning || "No reasoning provided."}
            </p>
        </div>

        {/* Roles Block */}
        <div className="bg-surface border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4 text-blue-400 font-semibold">
            <Users size={20} />
            <h2>Roles</h2>
          </div>
          <div className="space-y-3">
            {plan.roles.map((role, idx) => (
              <div key={idx} className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                <div className="font-medium text-slate-200">{role.title}</div>
                <div className="text-xs text-slate-500 mt-1">{role.purpose}</div>
              </div>
            ))}
            <button 
              className="w-full py-2 text-sm border border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 rounded-lg transition-colors"
              onClick={() => {
                const title = prompt("Role Title");
                const purpose = prompt("Role Purpose");
                if (title && purpose) addRole({ title, purpose });
              }}
            >
              + Add Role
            </button>
          </div>
        </div>
      </div>

      {/* Tasks Column */}
      <div className="lg:col-span-8 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-teal-400 font-semibold text-xl">
            <ListTodo size={24} />
            <h2>Execution Plan</h2>
          </div>
          <button 
            onClick={() => setActiveTab('execute')}
            className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-medium text-sm shadow-lg transition-all"
          >
            Review & Execute &rarr;
          </button>
        </div>

        <div className="space-y-4 pb-20">
          {plan.tasks.map((task) => (
            <div key={task.id} className="bg-surface border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors group">
              <div className="flex justify-between items-start mb-2">
                <div className="flex flex-wrap items-center gap-2">
                   <span className="bg-slate-900 text-slate-400 text-xs px-2 py-1 rounded font-mono border border-slate-800">
                    {task.id}
                   </span>
                   <span className="bg-blue-900/30 text-blue-300 text-xs px-2 py-1 rounded border border-blue-900/50">
                    Role: {task.role}
                   </span>
                   {task.agent && (
                    <span className="bg-purple-900/30 text-purple-300 text-xs px-2 py-1 rounded border border-purple-900/50">
                        Agent: {task.agent}
                    </span>
                   )}
                </div>
                <button 
                  onClick={() => deleteTask(task.id)}
                  className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              
              <textarea 
                className="w-full bg-transparent text-slate-200 border-none focus:ring-0 p-0 resize-none h-auto text-sm"
                value={task.description}
                onChange={(e) => updateTask(task.id, { description: e.target.value })}
                rows={2}
              />

              {/* Dependencies UI */}
              <div className="mt-3 pt-3 border-t border-slate-800">
                <p className="text-xs text-slate-500 mb-2">Depends on:</p>
                <div className="flex flex-wrap gap-2">
                  {plan.tasks
                    .filter(t => t.id !== task.id)
                    .map(potentialDep => (
                      <button
                        key={potentialDep.id}
                        onClick={() => toggleDep(task.id, potentialDep.id)}
                        className={`text-xs px-2 py-1 rounded transition-colors border ${
                          task.deps.includes(potentialDep.id)
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-600'
                        }`}
                      >
                        {potentialDep.id}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          ))}

          {/* Add Task Button */}
          {!newTaskOpen ? (
            <button 
              onClick={() => setNewTaskOpen(true)}
              className="w-full py-3 border-2 border-dashed border-slate-700 rounded-xl text-slate-400 hover:text-white hover:border-slate-500 hover:bg-slate-800/50 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={20} /> Add Task
            </button>
          ) : (
            <div className="bg-surface border border-blue-500/50 rounded-xl p-4 shadow-2xl">
              <h3 className="text-sm font-bold text-blue-400 mb-3">New Task</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                 <input 
                    placeholder="Task ID (e.g. design_mock)"
                    className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white"
                    value={newTaskData.id}
                    onChange={e => setNewTaskData({...newTaskData, id: e.target.value})}
                 />
                 <select
                    className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white"
                    value={newTaskData.role}
                    onChange={e => setNewTaskData({...newTaskData, role: e.target.value})}
                 >
                    <option value="">Select Role</option>
                    {plan.roles.map(r => <option key={r.title} value={r.title}>{r.title}</option>)}
                 </select>
                 <input
                    placeholder="Agent Name (Optional)"
                    className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white"
                    value={newTaskData.agent}
                    onChange={e => setNewTaskData({...newTaskData, agent: e.target.value})}
                 />
              </div>
              <textarea 
                 placeholder="Description"
                 className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white mb-3"
                 value={newTaskData.description}
                 onChange={e => setNewTaskData({...newTaskData, description: e.target.value})}
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setNewTaskOpen(false)} className="px-3 py-1 text-sm text-slate-400 hover:text-white">Cancel</button>
                <button onClick={handleAddTask} className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm">Add</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
