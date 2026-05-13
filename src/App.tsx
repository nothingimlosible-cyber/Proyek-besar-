import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Send, 
  Terminal, 
  Plus, 
  MessageSquare, 
  Trash2, 
  Menu,
  X,
  Code2,
  Smartphone,
  ChevronRight,
  Loader2,
  Settings,
  Sparkles,
  Command,
  Search,
  BookOpen,
  BrainCircuit,
  MessageCircle,
  Play,
  Copy,
  Check,
  ExternalLink,
  Laptop,
  Layout,
  FolderOpen,
  PieChart,
  Cpu,
  Layers,
  History,
  FileCode,
  Save
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { getChatResponse } from "./services/geminiService";
import { cn } from "./lib/utils";
import { Message, ChatThread, Project, ProjectFile } from "./types";

const STORAGE_KEY = "lite-coder-pro-threads";
const PROJECTS_KEY = "lite-coder-pro-projects";

type ViewMode = "chat" | "studio" | "stats";

const THINKING_STAGES = [
  { icon: <BrainCircuit size={14} />, text: "Menganalisis Permintaan..." },
  { icon: <BookOpen size={14} />, text: "Membaca Dokumentasi..." },
  { icon: <Search size={14} />, text: "Mencari Solusi Terbaik..." },
  { icon: <Code2 size={14} />, text: "Menyusun Blok Kode..." },
  { icon: <MessageCircle size={14} />, text: "Menyiapkan Jawaban..." },
];

interface CodeBlockProps {
  language: string;
  codeString: string;
  onPreview: (code: string, lang: string) => void;
  [key: string]: any;
}

const CodeBlock = ({ language, codeString, onPreview, ...props }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canPreview = ["html", "css", "javascript", "js", "typescript", "ts", "react", "jsx", "tsx"].includes(language.toLowerCase());

  return (
    <div className="relative group my-4 rounded-xl overflow-hidden border border-coder-border shadow-md">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-coder-border">
        <span className="text-[10px] uppercase font-bold text-coder-text-dim tracking-widest">
          {language}
        </span>
        <div className="flex gap-2">
          {canPreview && (
            <button 
              onClick={() => onPreview(codeString, language)}
              className="p-1.5 hover:bg-coder-accent/10 text-coder-accent rounded-md transition-all flex items-center gap-1.5 text-[10px] font-bold"
              title="Preview Live"
            >
              <Play size={10} fill="currentColor" /> RUN
            </button>
          )}
          <button 
            onClick={handleCopy}
            className="p-1.5 hover:bg-slate-200 text-coder-text-dim hover:text-coder-text rounded-md transition-all"
            title="Salin Kode"
          >
            {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
          </button>
        </div>
      </div>
      <SyntaxHighlighter
        style={oneLight as any}
        language={language}
        PreTag="div"
        className="!bg-white !m-0 !p-4 !text-sm custom-scrollbar"
        {...props}
      >
        {codeString}
      </SyntaxHighlighter>
    </div>
  );
};

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>("chat");
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [previewCode, setPreviewCode] = useState<{ code: string; lang: string } | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingStage, setThinkingStage] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      // Threads
      const savedThreads = localStorage.getItem(STORAGE_KEY);
      if (savedThreads) {
        const parsed = JSON.parse(savedThreads);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setThreads(parsed);
          setActiveThreadId(parsed[0].id);
        } else {
          createNewThread();
        }
      } else {
        createNewThread();
      }

      // Projects
      const savedProjects = localStorage.getItem(PROJECTS_KEY);
      if (savedProjects) {
        const parsedP = JSON.parse(savedProjects);
        if (Array.isArray(parsedP)) {
          setProjects(parsedP);
          if (parsedP.length > 0) {
            setActiveProjectId(parsedP[0].id);
            if (parsedP[0].files.length > 0) setActiveFileId(parsedP[0].files[0].id);
          }
        }
      }
    } catch (e) {
      console.error("Error loading data:", e);
      createNewThread();
    }
    
    if (window.innerWidth > 768) {
      setIsSidebarOpen(true);
    }
  }, []);

  // Thinking stage simulator
  useEffect(() => {
    let interval: any;
    if (isLoading) {
      setThinkingStage(0);
      interval = setInterval(() => {
        setThinkingStage((prev) => (prev + 1) % THINKING_STAGES.length);
      }, 2000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Save threads to localStorage
  useEffect(() => {
    if (threads.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
    }
  }, [threads]);

  // Save projects to localStorage
  useEffect(() => {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  }, [projects]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threads, activeThreadId, thinkingStage]);

  const activeThread = threads.find((t) => t.id === activeThreadId);

  const createNewThread = () => {
    const newThread: ChatThread = {
      id: Math.random().toString(36).substring(7),
      title: "Diskusi Baru",
      messages: [],
      updatedAt: Date.now(),
    };
    setThreads([newThread, ...threads]);
    setActiveThreadId(newThread.id);
    setViewMode("chat");
    if (window.innerWidth <= 768) setIsSidebarOpen(false);
  };

  const createNewProject = () => {
    const projectName = prompt("Masukkan Nama Proyek Ambisius Anda:");
    if (!projectName) return;

    const newProject: Project = {
      id: Math.random().toString(36).substring(7),
      name: projectName,
      description: "Basis proyek besar yang sedang dibangun.",
      files: [{ id: '1', name: 'App.tsx', language: 'typescript', content: '// Arsitektur Utama\nexport default function App() {\n  return <div>Hello Studio Pro!</div>;\n}' }],
      updatedAt: Date.now(),
    };
    setProjects([newProject, ...projects]);
    setActiveProjectId(newProject.id);
    setActiveFileId('1');
    setViewMode("studio");
  };

  const addFileToProject = () => {
    if (!activeProjectId) return;
    const fileName = prompt("Nama File (contoh: utils.ts atau Hero.tsx):");
    if (!fileName) return;

    const ext = fileName.split('.').pop() || 'text';
    const newFile: ProjectFile = {
      id: Math.random().toString(36).substring(7),
      name: fileName,
      language: ext === 'ts' || ext === 'tsx' ? 'typescript' : ext === 'js' || ext === 'jsx' ? 'javascript' : ext,
      content: '// File baru dalam proyek ambisius'
    };

    setProjects(prev => prev.map(p => {
      if (p.id === activeProjectId) {
        return { ...p, files: [...p.files, newFile], updatedAt: Date.now() };
      }
      return p;
    }));
    setActiveFileId(newFile.id);
  };

  const updateFileInProject = (fileId: string, newContent: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === activeProjectId) {
        return {
          ...p,
          files: p.files.map(f => f.id === fileId ? { ...f, content: newContent } : f),
          updatedAt: Date.now()
        };
      }
      return p;
    }));
  };

  const exportProject = () => {
    const project = projects.find(p => p.id === activeProjectId);
    if (!project) return;
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${project.name.toLowerCase().replace(/\s+/g, '-')}-litecoder-export.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    alert("Proyek berhasil diexport! Kamu bisa impor ini ke repo GitHub barumu.");
  };

  const deleteThread = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newThreads = threads.filter((t) => t.id !== id);
    setThreads(newThreads);
    if (activeThreadId === id) {
      setActiveThreadId(newThreads.length > 0 ? newThreads[0].id : null);
      if (newThreads.length === 0) createNewThread();
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !activeThreadId || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: Date.now(),
    };

    const currentInput = input;
    setInput("");
    setIsLoading(true);

    const updatedThreads = threads.map((t) => {
      if (t.id === activeThreadId) {
        const newMessages = [...t.messages, userMessage];
        const title = t.messages.length === 0 ? currentInput.slice(0, 30).trim() + (currentInput.length > 30 ? "..." : "") : t.title;
        return { ...t, messages: newMessages, title, updatedAt: Date.now() };
      }
      return t;
    });
    setThreads(updatedThreads);

    try {
      const history = (activeThread?.messages || []).map(m => ({
         role: m.role as "user" | "model",
         content: m.content
      }));
      history.push({ role: "user", content: currentInput });

      const aiResponse = await getChatResponse(history);

      // Handle File Updates from AI
      if (aiResponse && activeProjectId) {
        const fileUpdateRegex = /\[FILE_UPDATE:(.*?)\]\n([\s\S]*?)\[END_FILE_UPDATE\]/g;
        let match;
        const newFiles: {name: string, content: string}[] = [];
        
        while ((match = fileUpdateRegex.exec(aiResponse)) !== null) {
          newFiles.push({ name: match[1], content: match[2].trim() });
        }

        if (newFiles.length > 0) {
          setProjects(prev => prev.map(p => {
            if (p.id === activeProjectId) {
              const updatedFiles = [...p.files];
              newFiles.forEach(nf => {
                const existingIndex = updatedFiles.findIndex(f => f.name === nf.name);
                if (existingIndex !== -1) {
                  updatedFiles[existingIndex] = { ...updatedFiles[existingIndex], content: nf.content };
                } else {
                  updatedFiles.push({
                    id: Math.random().toString(36).substring(7),
                    name: nf.name,
                    language: nf.name.split('.').pop() || 'text',
                    content: nf.content
                  });
                }
              });
              return { ...p, files: updatedFiles, updatedAt: Date.now() };
            }
            return p;
          }));
        }
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "model",
        content: aiResponse || "Waduh, koneksi lagi ngadat nih. Coba lagi ya!",
        timestamp: Date.now(),
      };

      setThreads((prev) =>
        prev.map((t) =>
          t.id === activeThreadId
            ? { ...t, messages: [...t.messages, aiMessage], updatedAt: Date.now() }
            : t
        )
      );
    } catch (error: any) {
      console.error("AI Error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "model",
        content: `Error: ${error.message || "Gagal menghubungi AI. Pastikan GEMINI_API_KEY sudah diset."}`,
        timestamp: Date.now(),
      };
      setThreads((prev) =>
        prev.map((t) =>
          t.id === activeThreadId
            ? { ...t, messages: [...t.messages, errorMessage], updatedAt: Date.now() }
            : t
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white text-coder-text font-sans">
      {/* View Switcher Rail (NavRail) */}
      <nav className="w-16 md:w-20 bg-slate-900 flex flex-col items-center py-6 z-50 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-coder-accent flex items-center justify-center text-white mb-8 shadow-lg shadow-coder-accent/20">
          <Command size={24} />
        </div>
        
        <div className="flex-1 flex flex-col gap-4">
          <RailItem 
            icon={<MessageSquare size={22} />} 
            active={viewMode === "chat"} 
            onClick={() => setViewMode("chat")}
            label="Chat"
          />
          <RailItem 
            icon={<Layout size={22} />} 
            active={viewMode === "studio"} 
            onClick={() => setViewMode("studio")}
            label="Studio"
          />
          <RailItem 
            icon={<PieChart size={22} />} 
            active={viewMode === "stats"} 
            onClick={() => setViewMode("stats")}
            label="Stats"
          />
        </div>

        <button className="p-3 text-slate-500 hover:text-white transition-colors">
          <Settings size={22} />
        </button>
      </nav>

      {/* Sidebar Area */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed md:relative inset-y-0 left-0 w-72 md:w-80 bg-coder-card border-r border-coder-border flex flex-col z-40"
            >
              <div className="p-5 flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-widest text-coder-text-dim">
                  {viewMode === "chat" ? "Diskusi" : viewMode === "studio" ? "Project Studio" : "Performance"}
                </h2>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 hover:bg-slate-200 rounded-lg md:hidden"
                >
                  <X size={20} />
                </button>
              </div>

              {viewMode === "chat" && (
                <>
                  <div className="px-4 mb-4">
                    <button 
                      onClick={createNewThread}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-coder-accent hover:bg-coder-accent-light text-white rounded-xl font-semibold transition-all shadow-md"
                    >
                      <Plus size={18} />
                      <span>Chat Baru</span>
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-1">
                    {threads.map((thread) => (
                      <div
                        key={thread.id}
                        onClick={() => setActiveThreadId(thread.id)}
                        className={cn(
                          "group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
                          activeThreadId === thread.id 
                            ? "bg-coder-accent/5 border border-coder-accent/10 text-coder-accent" 
                            : "text-coder-text-dim hover:bg-slate-100 hover:text-coder-text"
                        )}
                      >
                        <MessageSquare size={16} className="shrink-0" />
                        <span className="flex-1 truncate text-xs font-bold leading-tight">
                          {thread.title}
                        </span>
                        <button
                          onClick={(e) => deleteThread(thread.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {viewMode === "studio" && (
                <>
                  <div className="px-4 mb-4 flex flex-col gap-2">
                    <button 
                      onClick={createNewProject}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl font-semibold transition-all shadow-md"
                    >
                      <Layers size={18} />
                      <span>Proyek Baru</span>
                    </button>
                    <label className="w-full flex items-center justify-center gap-2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs cursor-pointer transition-all border border-slate-200">
                      <FolderOpen size={14} />
                      <span>Import Project</span>
                      <input 
                        type="file" 
                        accept=".json" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              try {
                                const imported = JSON.parse(event.target?.result as string);
                                if (imported.id && imported.files) {
                                  setProjects([imported, ...projects]);
                                  setActiveProjectId(imported.id);
                                  if (imported.files.length > 0) setActiveFileId(imported.files[0].id);
                                  setViewMode("studio");
                                }
                              } catch (err) {
                                alert("Format file tidak valid!");
                              }
                            };
                            reader.readAsText(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-1">
                    {projects.map((project) => (
                      <div
                        key={project.id}
                        onClick={() => setActiveProjectId(project.id)}
                        className={cn(
                          "group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
                          activeProjectId === project.id 
                            ? "bg-slate-900 text-white shadow-lg" 
                            : "text-coder-text-dim hover:bg-slate-100 hover:text-coder-text"
                        )}
                      >
                        <FolderOpen size={16} className="shrink-0" />
                        <span className="flex-1 truncate text-xs font-bold">
                          {project.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="p-5 border-t border-coder-border">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-100">
                  <div className="w-8 h-8 rounded-full bg-coder-accent flex items-center justify-center font-bold text-xs text-white">
                    LP
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold truncate">Lite User</span>
                    <span className="text-[10px] text-coder-text-dim uppercase font-black">LiteCoder v3</span>
                  </div>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col relative min-w-0 bg-white">
        {viewMode === "chat" ? (
          <div className="flex flex-col h-full">
            {/* Header */}
            <Header 
              title={activeThread?.title || "Mulai Coding"} 
              isSidebarOpen={isSidebarOpen} 
              setIsSidebarOpen={setIsSidebarOpen} 
            />
            {/* Chat Content */}
            <ChatArea 
              activeThread={activeThread} 
              isLoading={isLoading} 
              thinkingStage={thinkingStage}
              messagesEndRef={messagesEndRef}
              setInput={setInput}
              setPreviewCode={setPreviewCode}
              setIsPreviewOpen={setIsPreviewOpen}
            />
            {/* Input */}
            <InputBar 
              input={input}
              setInput={setInput}
              isLoading={isLoading}
              handleSend={handleSend}
            />
          </div>
        ) : viewMode === "studio" ? (
          <StudioView 
            project={projects.find(p => p.id === activeProjectId)} 
            activeFileId={activeFileId}
            setActiveFileId={setActiveFileId}
            updateFileInProject={updateFileInProject}
            addFileToProject={addFileToProject}
            exportProject={exportProject}
            setPreviewCode={setPreviewCode}
            setIsPreviewOpen={setIsPreviewOpen}
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
          />
        ) : (
          <StatsView isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
        )}
      </main>

      {/* Preview Panel */}
      <AnimatePresence>
        {isPreviewOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed md:relative inset-0 md:inset-auto md:w-[500px] lg:w-[600px] xl:w-[700px] bg-white border-l border-coder-border flex flex-col z-50 shadow-2xl"
          >
            <div className="h-16 border-b border-coder-border flex items-center justify-between px-4 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-coder-accent/10 text-coder-accent rounded-lg">
                  <Play size={18} fill="currentColor" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Live Execution</h3>
                  <p className="text-[10px] text-coder-text-dim uppercase tracking-widest font-black">Sandbox v3.1</p>
                </div>
              </div>
              <button 
                onClick={() => setIsPreviewOpen(false)}
                className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1">
              <PreviewFrame content={previewCode?.code || ""} language={previewCode?.lang || ""} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RailItem({ icon, active, onClick, label }: { icon: React.ReactNode, active: boolean, onClick: () => void, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "relative group flex flex-col items-center gap-1 p-3 transition-all",
        active ? "text-white" : "text-slate-500 hover:text-slate-300"
      )}
    >
      {active && (
        <motion.div 
          layoutId="rail-active"
          className="absolute inset-y-2 left-0 w-1 bg-coder-accent rounded-r-full" 
        />
      )}
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
        {label}
      </span>
    </button>
  );
}

function Header({ title, isSidebarOpen, setIsSidebarOpen }: any) {
  return (
    <header className="h-16 md:h-20 border-b border-coder-border flex items-center justify-between px-4 md:px-8 bg-white/80 backdrop-blur-xl z-20 sticky top-0">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className={cn(
            "p-2 hover:bg-slate-100 rounded-xl transition-all",
            isSidebarOpen && "md:hidden"
          )}
        >
          <Menu size={22} />
        </button>
        <div className="flex flex-col">
          <h2 className="text-sm md:text-base font-black truncate max-w-[150px] md:max-w-md uppercase tracking-tight">
            {title}
          </h2>
          <div className="flex items-center gap-1.5 font-bold">
            <span className="text-[10px] uppercase tracking-widest text-green-600">Active</span>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-coder-text-dim">
        <span className="hidden sm:flex items-center gap-1.5"><History size={14} /> Synced</span>
        <div className="w-px h-4 bg-coder-border" />
        <span className="text-coder-accent">LiteCoder Studio</span>
      </div>
    </header>
  );
}

function ChatArea({ activeThread, isLoading, thinkingStage, messagesEndRef, setInput, setPreviewCode, setIsPreviewOpen }: any) {
  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
      <div className="max-w-4xl mx-auto w-full min-h-full flex flex-col pt-6 pb-24 px-4 md:px-8">
        {activeThread?.messages.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col items-center justify-center text-center space-y-10 my-auto py-12"
          >
            <div className="w-24 h-24 bg-slate-900 rounded-[32px] flex items-center justify-center text-white rotate-3 shadow-2xl relative">
              <Terminal size={48} />
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-coder-accent rounded-full border-4 border-white flex items-center justify-center">
                <Sparkles size={14} />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic">
                Studio <span className="text-coder-accent">Lite</span>
              </h3>
              <p className="text-coder-text-dim max-w-sm mx-auto text-sm md:text-base font-medium">
                Siap tempur benerin bug, bikin UI keren, atau rancang arsitektur ambisius Anda hari ini.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              <SuggestionCard 
                icon={<Code2 size={18} />}
                title="Arsitektur Aplikasi"
                description="Rancang sistem skala besar"
                onClick={() => setInput("Bantu saya merancang arsitektur aplikasi E-Commerce modern menggunakan arsitektur clean dan modular.")}
              />
              <SuggestionCard 
                icon={<Smartphone size={18} />}
                title="Android Pro Proyek"
                description="Jetpack Compose Animation"
                onClick={() => setInput("Bagaimana cara membuat animasi navigasi yang kompleks di Jetpack Compose untuk aplikasi ambisius?")}
              />
            </div>
          </motion.div>
        )}

        <div className="space-y-10">
          {activeThread?.messages.map((message: any) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex group",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div className={cn(
                "flex flex-col gap-2 max-w-[90%] md:max-w-[85%]",
                message.role === "user" ? "items-end" : "items-start"
              )}>
                <div className={cn(
                  "flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-1",
                  message.role === "user" ? "text-coder-accent" : "text-coder-text-dim"
                )}>
                  {message.role === "user" ? "Developer" : "Studio AI"}
                  <span>•</span>
                  <span className="font-mono text-[9px]">{new Date(message.timestamp).toLocaleTimeString()}</span>
                </div>

                <div className={cn(
                  "rounded-3xl p-5 md:p-8 shadow-sm relative",
                  message.role === "user" 
                    ? "bg-slate-900 text-white rounded-tr-none shadow-xl" 
                    : "bg-slate-50 border border-coder-border rounded-tl-none"
                )}>
                  <div className="markdown-body prose prose-slate prose-sm md:prose-base max-w-none text-left font-medium">
                    <ReactMarkdown
                      components={{
                        code({ node, inline, className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || "");
                          const language = match ? match[1] : "";
                          const codeString = String(children).replace(/\n$/, "");
                          
                          if (!inline && match) {
                            return (
                              <CodeBlock 
                                language={language}
                                codeString={codeString}
                                onPreview={(code, lang) => {
                                  setPreviewCode({ code, lang });
                                  setIsPreviewOpen(true);
                                }}
                                {...props}
                              />
                            );
                          }

                          return (
                            <code className={cn("bg-slate-200 px-1.5 py-0.5 rounded text-coder-accent font-mono text-sm", className)} {...props}>
                              {children}
                            </code>
                          );
                        },
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
              <div className="flex items-center gap-3 px-1">
                 <div className="w-2 h-2 rounded-full bg-coder-accent animate-ping" />
                 <span className="text-[10px] font-black uppercase tracking-tighter text-coder-accent">Studio is Architecting...</span>
              </div>
              <div className="bg-slate-900 rounded-[2rem] rounded-tl-none p-6 max-w-sm shadow-2xl">
                <div className="flex items-center gap-4">
                  <Cpu className="text-coder-accent animate-pulse" size={32} />
                  <div className="flex-1">
                    <p className="text-white text-sm font-bold mb-2">{THINKING_STAGES[thinkingStage].text}</p>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-coder-accent"
                        animate={{ width: ["0%", "100%"] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
        <div ref={messagesEndRef} className="h-12" />
      </div>
    </div>
  );
}

function InputBar({ input, setInput, isLoading, handleSend }: any) {
  return (
    <div className="absolute bottom-0 inset-x-0 p-4 md:p-8 bg-gradient-to-t from-white via-white to-transparent">
      <div className="max-w-4xl mx-auto">
        <div className="relative group bg-white border-2 border-slate-900 rounded-[32px] shadow-2xl p-2 transition-all">
          <div className="flex items-end gap-2 px-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              placeholder="Jelaskan proyek ambisius Anda..."
              className="w-full bg-transparent py-4 px-3 text-sm md:text-base outline-none resize-none custom-scrollbar max-h-40 font-bold"
              style={{ height: 'auto', minHeight: '56px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className={cn(
                "mb-2 p-3 rounded-2xl transition-all shadow-lg active:scale-90",
                input.trim() && !isLoading 
                  ? "bg-slate-900 text-white" 
                  : "bg-slate-100 text-slate-300"
              )}
            >
              <ChevronRight size={28} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StudioView({ project, activeFileId, setActiveFileId, updateFileInProject, addFileToProject, exportProject, setPreviewCode, setIsPreviewOpen, isSidebarOpen, setIsSidebarOpen }: any) {
  if (!project) return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 gap-6">
       <div className="w-24 h-24 bg-slate-200 rounded-[32px] flex items-center justify-center text-slate-400">
          <Layers size={48} />
       </div>
       <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Mulai Proyek Ambisius</h2>
          <p className="text-slate-500 max-w-sm">Anda belum memiliki proyek. Silakan buat satu di sidebar!</p>
       </div>
    </div>
  );

  const activeFile = project.files.find((f: any) => f.id === activeFileId) || project.files[0];

  return (
    <div className="flex-1 flex flex-col h-full bg-white relative">
      <Header title={`Project Architect: ${project.name}`} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-6 gap-6">
        {/* File Navigator */}
        <div className="w-full md:w-64 flex flex-col gap-4">
          <div className="p-5 bg-slate-900 rounded-3xl text-white shadow-xl">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-3">Project Scope</h4>
            <p className="text-xs font-bold leading-relaxed">{project.description}</p>
            <button 
              onClick={exportProject}
              className="mt-4 w-full py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <ExternalLink size={12} /> Export to JSON
            </button>
          </div>
          
          <div className="flex-1 bg-slate-50 rounded-3xl border border-slate-200 p-3 overflow-y-auto">
            <div className="flex items-center justify-between px-3 py-2 mb-3">
               <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Workspace Files</span>
               <button 
                onClick={addFileToProject}
                className="p-1.5 hover:bg-coder-accent/10 text-coder-accent rounded-lg transition-colors"
               >
                 <Plus size={16} />
               </button>
            </div>
            <div className="space-y-2">
              {project.files.map((file: any) => (
                <div 
                  key={file.id} 
                  onClick={() => setActiveFileId(file.id)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer group",
                    activeFileId === file.id 
                      ? "bg-white border-coder-accent shadow-md md:translate-x-1" 
                      : "bg-transparent border-transparent hover:bg-slate-200/50"
                  )}
                >
                  <FileCode size={18} className={activeFileId === file.id ? "text-coder-accent" : "text-slate-400"} />
                  <div className="flex flex-col min-w-0">
                    <span className={cn("text-xs font-bold truncate", activeFileId === file.id ? "text-slate-900" : "text-slate-500")}>
                      {file.name}
                    </span>
                    <span className="text-[9px] uppercase font-black text-slate-400 tracking-tight">{file.language}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex flex-1 flex-col bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5">
          <div className="h-16 border-b border-white/10 flex items-center justify-between px-8 bg-slate-900/50 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-lg shadow-green-500/20" />
                <span className="text-sm font-black text-white italic tracking-tight">{activeFile?.name}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-white/20 uppercase tracking-widest mr-4 hidden sm:block">Editor Mode</span>
              <button className="flex items-center gap-2 px-4 py-2 bg-coder-accent/10 hover:bg-coder-accent text-coder-accent hover:text-white rounded-xl text-xs font-black uppercase transition-all shadow-lg active:scale-95">
                <Save size={16} /> Save
              </button>
            </div>
          </div>
          
          <div className="flex-1 relative overflow-hidden">
            <textarea
              value={activeFile?.content || ""}
              onChange={(e) => updateFileInProject(activeFile.id, e.target.value)}
              className="absolute inset-0 w-full h-full p-8 bg-transparent text-slate-300 font-mono text-sm outline-none resize-none custom-scrollbar focus:bg-slate-900/80 transition-colors"
                spellCheck={false}
            />
          </div>

          <div className="p-5 border-t border-white/10 flex items-center justify-between bg-slate-900">
             <div className="flex items-center gap-4 text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">
                <span>Lines: {(activeFile?.content || "").split('\n').length}</span>
                <span>UTF-8</span>
             </div>
             <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setPreviewCode({ code: activeFile?.content || "", lang: activeFile?.language || "" });
                    setIsPreviewOpen(true);
                  }}
                  className="px-8 py-3 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
                >
                  Run Simulation
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsView({ isSidebarOpen, setIsSidebarOpen }: any) {
  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50">
       <Header title="Performance & Insight" isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
       <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Memory Usage" value="1.2 GB" icon={<Cpu />} color="text-coder-accent" />
          <StatCard title="Total Logic Cycles" value="482k" icon={<Terminal />} color="text-purple-600" />
          <StatCard title="AI Intelligence" value="99.9%" icon={<Sparkles />} color="text-yellow-500" />
          
          <div className="md:col-span-3 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
             <PieChart size={64} className="text-slate-200 mb-4" />
             <h4 className="text-xl font-black uppercase">Data Visualization Unavailable</h4>
             <p className="text-slate-500 text-sm">Integrasikan API untuk melihat throughput data real-time.</p>
          </div>
       </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
       <div className={cn("p-3 w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-4", color)}>
          {icon}
       </div>
       <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{title}</h5>
       <p className="text-3xl font-black">{value}</p>
    </div>
  );
}

function PreviewFrame({ content, language }: { content: string; language: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    let html = "";
    const isHtml = language.toLowerCase() === "html";
    
    if (isHtml) {
      html = content;
    } else if (["css"].includes(language.toLowerCase())) {
      html = `<html><head><style>${content}</style></head><body><div class="p-8"><h1>CSS Preview</h1><p>Edit as HTML for more control.</p></div></body></html>`;
    } else {
      // Basic JS execution (no react bundling here for simplicity, but we can add babel standalone later if needed)
      html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              body { font-family: sans-serif; background: #fff; color: #000; }
            </style>
          </head>
          <body>
            <div id="root"></div>
            <script>
              try {
                ${content}
              } catch (e) {
                document.getElementById('root').innerHTML = '<div style="color: red; padding: 20px;">' + e.message + '</div>';
              }
            </script>
          </body>
        </html>
      `;
    }

    const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
    }
  }, [content, language]);

  return (
    <iframe 
      ref={iframeRef}
      className="w-full h-full border-none bg-white"
      title="Preview"
      sandbox="allow-scripts"
    />
  );
}

function SuggestionCard({ icon, title, description, onClick }: { icon: React.ReactNode, title: string, description: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-4 p-4 text-left bg-white border border-coder-border rounded-2xl hover:border-coder-accent/30 hover:bg-slate-50 transition-all group shadow-sm"
    >
      <div className="p-3 bg-slate-100 rounded-xl text-coder-text-dim group-hover:text-coder-accent transition-colors">
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-bold text-coder-text mb-0.5">{title}</span>
        <span className="text-xs text-coder-text-dim truncate">{description}</span>
      </div>
    </button>
  );
}

