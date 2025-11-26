import React, { useEffect } from 'react';
import { useAppStore } from './store';
import { PlanCreator } from './components/PlanCreator';
import { PlanEditor } from './components/PlanEditor';
import { PlanExecutor } from './components/PlanExecutor';
import { ArtifactViewer } from './components/ArtifactViewer';
import { LayoutDashboard, Edit3, PlayCircle, FolderOpen, Boxes } from 'lucide-react';

const App: React.FC = () => {
  const { activeTab, setActiveTab, loadArtifacts } = useAppStore();

  useEffect(() => {
    loadArtifacts();
  }, [loadArtifacts]);

  const renderContent = () => {
    switch (activeTab) {
      case 'create': return <PlanCreator />;
      case 'edit': return <PlanEditor />;
      case 'execute': return <PlanExecutor />;
      case 'artifacts': return <ArtifactViewer />;
      default: return <PlanCreator />;
    }
  };

  const TabButton = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all font-medium text-sm md:text-base ${
        activeTab === id
          ? 'border-blue-500 text-blue-400 bg-blue-500/5'
          : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
      }`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-surface/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg text-white">
                <Boxes size={24} />
              </div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                T20 Agent Architect
              </h1>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center">
              <TabButton id="create" label="Plan Creator" icon={LayoutDashboard} />
              <TabButton id="edit" label="Editor" icon={Edit3} />
              <TabButton id="execute" label="Execution" icon={PlayCircle} />
              <TabButton id="artifacts" label="Artifacts" icon={FolderOpen} />
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Navigation (Bottom) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-slate-800 flex justify-around z-50 safe-area-pb">
        <TabButton id="create" label="Plan" icon={LayoutDashboard} />
        <TabButton id="edit" label="Edit" icon={Edit3} />
        <TabButton id="execute" label="Run" icon={PlayCircle} />
        <TabButton id="artifacts" label="Files" icon={FolderOpen} />
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 overflow-y-auto">
            {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
