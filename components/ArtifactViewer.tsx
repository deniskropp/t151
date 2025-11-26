import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { Artifact, File } from '../types';
import { FileText, Code, Download, ChevronRight, ChevronDown, Folder, FolderOpen, Package, Archive, Layers, List } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import JSZip from 'jszip';

// --- Tree Data Structure Helpers ---

interface FileNode {
  type: 'file';
  name: string;
  path: string;
  content: string;
  artifactId: string;
}

interface DirNode {
  type: 'dir';
  name: string;
  children: Record<string, TreeNode>;
}

type TreeNode = FileNode | DirNode;

type FileWithMeta = File & { sourceArtifactId: string };

const buildFileTree = (files: FileWithMeta[]): Record<string, TreeNode> => {
  const root: Record<string, TreeNode> = {};

  files.forEach(file => {
    const parts = file.path.split('/');
    let currentLevel = root;

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;

      if (isFile) {
        currentLevel[part] = {
          type: 'file',
          name: part,
          path: file.path,
          content: file.content,
          artifactId: file.sourceArtifactId
        };
      } else {
        if (!currentLevel[part]) {
          currentLevel[part] = {
            type: 'dir',
            name: part,
            children: {}
          };
        }
        currentLevel = (currentLevel[part] as DirNode).children;
      }
    });
  });

  return root;
};

// --- Components ---

const FileIcon = ({ name }: { name: string }) => {
  if (name.endsWith('.json') || name.endsWith('.js') || name.endsWith('.ts') || name.endsWith('.tsx') || name.endsWith('.css') || name.endsWith('.html')) {
    return <Code size={14} className="text-blue-400" />;
  }
  if (name.endsWith('.md')) {
    return <FileText size={14} className="text-yellow-400" />;
  }
  return <FileText size={14} className="text-slate-400" />;
};

const TreeItem: React.FC<{
  node: TreeNode;
  level: number;
  onSelect: (node: FileNode) => void;
  selectedFile: FileNode | null;
}> = ({ node, level, onSelect, selectedFile }) => {
  const [isOpen, setIsOpen] = useState(true);

  if (node.type === 'file') {
    const isSelected = selectedFile?.path === node.path && selectedFile?.artifactId === node.artifactId;
    return (
      <div
        onClick={() => onSelect(node)}
        className={`flex items-center gap-2 py-1 px-2 cursor-pointer rounded-md transition-colors text-sm ${
          isSelected ? 'bg-blue-600/20 text-blue-300' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        <FileIcon name={node.name} />
        <span className="truncate">{node.name}</span>
      </div>
    );
  }

  // Directory
  return (
    <div>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 py-1 px-2 cursor-pointer text-slate-300 hover:text-white transition-colors text-sm font-medium select-none"
        style={{ paddingLeft: `${level * 12}px` }}
      >
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {isOpen ? <FolderOpen size={14} className="text-amber-500" /> : <Folder size={14} className="text-amber-500" />}
        <span className="truncate">{node.name}</span>
      </div>
      {isOpen && (
        <div>
          {Object.values(node.children)
            .sort((a, b) => {
               // Directories first
               if (a.type === 'dir' && b.type === 'file') return -1;
               if (a.type === 'file' && b.type === 'dir') return 1;
               return a.name.localeCompare(b.name);
            })
            .map((child) => (
            <TreeItem 
              key={child.name} 
              node={child} 
              level={level + 1} 
              onSelect={onSelect} 
              selectedFile={selectedFile}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const ArtifactViewer: React.FC = () => {
  const { artifacts } = useAppStore();
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [viewMode, setViewMode] = useState<'task' | 'combined'>('combined');

  // Auto-select first file if nothing selected
  React.useEffect(() => {
    if (!selectedFile && artifacts.length > 0 && artifacts[0].files.length > 0) {
      const firstArtifact = artifacts[0];
      const firstFile = firstArtifact.files[0];
      setSelectedFile({
          type: 'file',
          name: firstFile.path.split('/').pop() || firstFile.path,
          path: firstFile.path,
          content: firstFile.content,
          artifactId: firstArtifact.id
      });
    }
  }, [artifacts, selectedFile]);

  const downloadFile = (file: FileNode) => {
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAllZip = async () => {
    const zip = new JSZip();
    
    if (viewMode === 'combined') {
        // Flat project structure (latest versions)
        const fileMap = new Map<string, string>();
        artifacts.forEach(art => {
            art.files.forEach(f => {
                fileMap.set(f.path, f.content);
            });
        });
        
        fileMap.forEach((content, path) => {
            zip.file(path, content);
        });
        
    } else {
        // Grouped by task
        artifacts.forEach(artifact => {
            const folderName = `Task_${artifact.taskId}_${artifact.id.slice(0, 4)}`;
            const folder = zip.folder(folderName);
            
            if (folder) {
                artifact.files.forEach(file => {
                     folder.file(file.path, file.content);
                });
            }
        });
    }

    try {
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = viewMode === 'combined' ? "Project_Source.zip" : "Artifacts_By_Task.zip";
        a.click();
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error("Failed to generate zip", e);
        alert("Failed to generate ZIP file.");
    }
  };

  const getCombinedFiles = () => {
    const fileMap = new Map<string, FileWithMeta>();
    // Artifacts are strictly ordered by time in the store (append only)
    // So later artifacts naturally overwrite earlier ones for the same path
    artifacts.forEach(art => {
        art.files.forEach(f => {
            fileMap.set(f.path, { ...f, sourceArtifactId: art.id });
        });
    });
    return Array.from(fileMap.values());
  };

  if (artifacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <Package size={48} className="mb-4 opacity-50" />
        <p className="text-lg">No artifacts generated yet.</p>
        <p className="text-sm">Run the execution plan to produce content.</p>
      </div>
    );
  }

  const renderTreeContent = (tree: Record<string, TreeNode>) => {
      return Object.values(tree)
        .sort((a, b) => {
            if (a.type === 'dir' && b.type === 'file') return -1;
            if (a.type === 'file' && b.type === 'dir') return 1;
            return a.name.localeCompare(b.name);
        })
        .map(node => (
            <TreeItem 
            key={node.name} 
            node={node} 
            level={0} 
            onSelect={setSelectedFile} 
            selectedFile={selectedFile} 
            />
        ));
  };

  return (
    <div className="flex h-full border-t border-slate-800">
      {/* Sidebar: File Tree */}
      <div className="w-80 border-r border-slate-800 bg-slate-900/50 flex flex-col flex-shrink-0">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
           <h3 className="font-semibold text-slate-300 flex items-center gap-2 text-sm">
             <Package size={16} />
             Explorer
           </h3>
           <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                    <button 
                        onClick={() => setViewMode('task')}
                        className={`p-1.5 rounded transition-all ${viewMode === 'task' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`}
                        title="Group by Task"
                    >
                        <List size={14} />
                    </button>
                    <button 
                        onClick={() => setViewMode('combined')}
                        className={`p-1.5 rounded transition-all ${viewMode === 'combined' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`}
                        title="Combined Project View"
                    >
                        <Layers size={14} />
                    </button>
                </div>
                <div className="w-px h-4 bg-slate-700"></div>
                <button 
                    onClick={downloadAllZip}
                    title="Download as ZIP"
                    className="text-slate-400 hover:text-white hover:bg-slate-700 p-1.5 rounded transition-colors"
                >
                    <Archive size={16} />
                </button>
           </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {viewMode === 'task' ? (
              artifacts.map(art => {
                const filesWithMeta = art.files.map(f => ({...f, sourceArtifactId: art.id}));
                const tree = buildFileTree(filesWithMeta);
                return (
                    <div key={art.id} className="mb-4">
                        <div className="px-2 py-1 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                            <span>Task: {art.taskId}</span>
                        </div>
                        <div className="pl-1">
                            {renderTreeContent(tree)}
                        </div>
                    </div>
                )
              })
          ) : (
             <div className="mt-2 pl-1">
                 {renderTreeContent(buildFileTree(getCombinedFiles()))}
             </div>
          )}
        </div>
      </div>

      {/* Main Area: File Content */}
      <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
        {selectedFile ? (
          <>
            {/* Toolbar */}
            <div className="h-12 border-b border-slate-800 bg-surface flex items-center justify-between px-6 flex-shrink-0">
                 <div className="flex items-center gap-2 text-sm text-slate-300 font-mono">
                    <FileIcon name={selectedFile.name} />
                    {selectedFile.path}
                 </div>
                 <button 
                    onClick={() => downloadFile(selectedFile)}
                    className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-sm bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-md border border-slate-700"
                 >
                    <Download size={14} /> Download File
                 </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 prose prose-invert max-w-none">
                {selectedFile.name.endsWith('.md') ? (
                     <ReactMarkdown 
                        components={{
                            code(props) {
                                const {children, className, node, ...rest} = props
                                return <code className={`${className} bg-slate-800 px-1.5 py-0.5 rounded text-yellow-200 font-mono text-sm`} {...rest}>{children}</code>
                            },
                            pre(props) {
                                return <pre className="bg-slate-900 p-4 rounded-lg overflow-x-auto border border-slate-800 shadow-inner" {...props} />
                            }
                        }}
                     >
                        {selectedFile.content}
                     </ReactMarkdown>
                ) : (
                    <pre className="bg-slate-900 p-4 rounded-lg overflow-x-auto text-sm font-mono text-slate-300 border border-slate-800 shadow-inner">
                        {selectedFile.content}
                    </pre>
                )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 border border-slate-800">
                <Code size={32} />
            </div>
            <p className="font-medium">Select a file to view content</p>
          </div>
        )}
      </div>
    </div>
  );
};
