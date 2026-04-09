import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Download, 
  Square, 
  Monitor, 
  Smartphone, 
  Settings, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Wand2,
  Layout,
  Circle,
  Minus
} from 'lucide-react';
import { GoogleGenAI, Type, Content } from "@google/genai";
import { Message, ViewMode, ActiveTab, ZenthausResponse } from './types';

// --- CONFIGURATION ---

const SYSTEM_PROMPT = `
Eres "Zenthaus", una máquina de diseño estructural y arquitecto web de élite inspirado en los principios de la Bauhaus.

TU FILOSOFÍA:
- "Design. Systemized."
- La forma sigue a la función.
- Diseño como sistema, no como decoración.
- Minimalismo radical, precisión geométrica y claridad estructural.

TU OBJETIVO:
Interactuar con el usuario para obtener información sobre su negocio y generar una Landing Page en un ÚNICO archivo HTML que incluya CSS (Tailwind vía CDN) y JS necesario.

ESTILO DE COMPORTAMIENTO:
1. Sé corto, directo y casi arquitectónico. Sin ruido innecesario.
2. Actúa como un consultor estructural: sugiere sistemas de diseño limpios y funcionales.
3. Genera código que se sienta "Estructurado", "Bauhaus Moderno" y "Preciso".

REQUISITOS DEL CÓDIGO HTML GENERADO:
1. Estilo Zenthaus: Grid visible, mucho espacio vacío, composición asimétrica pero balanceada.
2. Paleta de colores: Fondo Ocaso (#353238), Texto Crema Suave (#F9E7C8). Acentos (Durazno #F2B8A2, Rosa Ceniza #B08686, Malva #72616E) usados con extrema moderación para puntos de enfoque.
3. Tipografía: Space Grotesk (Primary), Inter (Secondary). Uso de MAYÚSCULAS para énfasis estructural.
4. Elementos: Bordes finos (1px), líneas horizontales/verticales, formas geométricas claras. Evita bordes redondeados excesivos y sombras suaves.

REQUISITOS DEL ANÁLISIS (JSON):
Devuelve un análisis crítico enfocado en Estructura, Jerarquía Visual y Funcionalidad.

FORMATO DE RESPUESTA (JSON PURO):
{
  "message": "Respuesta directa y arquitectónica...",
  "code": "HTML completo...",
  "analysis": "Markdown..."
}
`;

const INITIAL_CODE = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ZENTHAUS | Design. Systemized.</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;500;700&display=swap');
        body { 
            font-family: 'Space Grotesk', sans-serif; 
            background-color: #353238; 
            color: #F9E7C8;
            background-image: radial-gradient(circle at 1px 1px, rgba(249,231,200,0.05) 1px, transparent 0);
            background-size: 60px 60px;
        }
        .bauhaus-grid {
            display: grid;
            grid-template-columns: repeat(12, 1fr);
            gap: 1px;
            background-color: rgba(249, 231, 200, 0.1);
        }
        .bauhaus-cell {
            background-color: #353238;
            padding: 2rem;
        }
        .accent-peach { border-top: 4px solid #F2B8A2; }
        .accent-rose { color: #B08686; }
        .accent-mauve { background-color: #72616E; }
        .tracking-widest-xl { letter-spacing: 0.2em; }
    </style>
</head>
<body class="min-h-screen flex items-center justify-center p-6">
    <div class="w-full max-w-4xl border border-[#F9E7C8]/10">
        <div class="p-12 space-y-12">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-[#F9E7C8] flex items-center justify-center">
                    <div class="w-6 h-6 bg-[#353238]"></div>
                </div>
                <div class="h-[1px] w-12 bg-[#F9E7C8]/20"></div>
                <div class="w-3 h-3 rounded-full bg-[#F2B8A2]"></div>
                <div class="w-3 h-3 bg-[#B08686]"></div>
                <div class="w-3 h-3 rounded-sm bg-[#72616E]"></div>
            </div>
            
            <div class="space-y-6">
                <h1 class="text-6xl md:text-8xl font-bold tracking-tighter uppercase leading-none">
                    Design.<br/><span class="text-[#F9E7C8]/40">Systemized.</span>
                </h1>
                <p class="text-xl text-[#F9E7C8]/50 max-w-md font-light">
                    Generate structured landing pages with AI. Clean, functional, and built to convert.
                </p>
            </div>

            <div class="pt-12 border-t border-[#F9E7C8]/10 flex justify-between items-end">
                <div class="text-[10px] uppercase tracking-widest text-[#F9E7C8]/30">
                    System Status: Operational<br/>
                    Grid Engine: Active
                </div>
                <div class="text-xs font-medium px-4 py-2 border border-[#F9E7C8]/20 hover:bg-[#F9E7C8] hover:text-[#353238] transition-colors cursor-default">
                    AWAITING INPUT_
                </div>
            </div>
        </div>
    </div>
</body>
</html>
`;

// --- MAIN COMPONENT ---

export default function ZenthausApp() {
  const [apiKey, setApiKey] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'ZENTHAUS SYSTEM INITIALIZED. Describe tu idea para generar una estructura de diseño funcional.' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentCode, setCurrentCode] = useState(INITIAL_CODE);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [activeTab, setActiveTab] = useState<ActiveTab>('preview');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle API Call using @google/genai SDK
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    // Check for API key (prioritize state, fallback to env if user hasn't set it in UI)
    const effectiveKey = apiKey || process.env.API_KEY;

    if (!effectiveKey) {
      alert("Por favor, ingresa tu API Key de Gemini en la configuración (engranaje).");
      setShowSettings(true);
      return;
    }

    const newUserMsg: Message = { role: 'user', content: inputValue };
    setMessages(prev => [...prev, newUserMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Initialize Gemini Client
      const ai = new GoogleGenAI({ apiKey: effectiveKey });

      // Transform chat history for the API
      // Note: System prompt is passed in config, so we only pass conversation history here
      const historyContents: Content[] = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      // Add the new user message to the history for the call
      const requestContents: Content[] = [
        ...historyContents,
        { role: 'user', parts: [{ text: newUserMsg.content }] }
      ];

      // Define the expected response schema
      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          message: { type: Type.STRING, description: "The conversational response to the user." },
          code: { type: Type.STRING, nullable: true, description: "The full HTML code if generated, otherwise null." },
          analysis: { type: Type.STRING, nullable: true, description: "Markdown analysis of the code if generated, otherwise null." }
        },
        required: ["message"]
      };

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: requestContents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          temperature: 0.7, // Balanced creativity for design
        }
      });

      const responseText = response.text;
      
      if (!responseText) {
        throw new Error("No text returned from Gemini API");
      }

      const jsonResponse: ZenthausResponse = JSON.parse(responseText);

      // Update State
      setMessages(prev => [...prev, { role: 'assistant', content: jsonResponse.message }]);
      
      if (jsonResponse.code) {
        setCurrentCode(jsonResponse.code);
        setActiveTab('preview'); 
      }
      
      if (jsonResponse.analysis) {
        setAnalysis(jsonResponse.analysis);
      }

    } catch (error: any) {
      console.error("Gemini API Error:", error);
      let errorMessage = "Ocurrió un error inesperado.";
      if (error instanceof Error) errorMessage = error.message;
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${errorMessage}. Por favor verifica tu API Key o intenta de nuevo.` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([currentCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'landing-page.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex h-screen w-full bg-[#353238] text-[#F9E7C8] font-sans overflow-hidden selection:bg-[#F9E7C8]/20">
      
      {/* --- MODAL CONFIG --- */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#353238]/90 backdrop-blur-sm">
          <div className="bg-[#353238] border border-[#F9E7C8]/10 p-8 rounded-none w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-3 uppercase tracking-widest font-display">
                <Settings className="w-5 h-5 text-[#F9E7C8]" /> Config
              </h3>
              <button onClick={() => setShowSettings(false)} className="text-[#F9E7C8]/50 hover:text-[#F9E7C8] transition-colors"><X size={20}/></button>
            </div>
            <label className="block text-[10px] uppercase tracking-widest text-[#F9E7C8]/50 mb-2">Gemini API Key</label>
            <input 
              type="password" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-transparent border border-[#F9E7C8]/10 rounded-none p-4 text-[#F9E7C8] focus:outline-none focus:border-[#F9E7C8] transition-colors text-sm"
            />
            <p className="text-[10px] text-[#F9E7C8]/30 mt-4 uppercase tracking-tight">Key stored in session memory only.</p>
            <button 
              onClick={() => setShowSettings(false)}
              className="mt-8 w-full bg-[#F9E7C8] text-[#353238] font-bold py-3 rounded-none hover:bg-white transition-colors uppercase tracking-widest text-xs"
            >
              Initialize System
            </button>
          </div>
        </div>
      )}

      {/* --- LEFT PANEL: CHAT --- */}
      <div className="w-full lg:w-[400px] flex flex-col border-r border-[#F9E7C8]/10 bg-[#353238] relative z-10 flex-shrink-0">
        
        {/* Header */}
        <header className="p-6 border-b border-[#F9E7C8]/10 flex justify-between items-center bg-[#353238]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Square className="w-4 h-4 fill-[#F9E7C8]" />
              <span className="w-4 h-[1px] bg-[#F9E7C8]/30 mx-1"></span>
              <Circle className="w-2 h-2 fill-[#F2B8A2] text-[#F2B8A2]" />
              <div className="w-2 h-2 bg-[#B08686]"></div>
              <div className="w-2 h-2 rounded-full bg-[#72616E]"></div>
            </div>
            <span className="font-bold text-lg tracking-[0.2em] font-display uppercase">Zenthaus</span>
          </div>
          <button onClick={() => setShowSettings(true)} className="p-2 text-[#F9E7C8]/50 hover:text-[#F9E7C8] transition-colors">
            <Settings size={18} />
          </button>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-[#F9E7C8]/5">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[90%] p-5 text-sm leading-relaxed border ${
                  msg.role === 'user' 
                    ? 'bg-[#F9E7C8]/5 text-[#F9E7C8] border-[#F9E7C8]/10' 
                    : 'bg-transparent text-[#F9E7C8]/70 border-[#F9E7C8]/5'
                }`}
              >
                <div className="text-[10px] uppercase tracking-widest text-[#F9E7C8]/40 mb-2 font-display">
                  {msg.role === 'user' ? 'User_Input' : 'Zenthaus_Output'}
                </div>
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-transparent p-5 flex items-center gap-3 text-[#F9E7C8]/40 text-[10px] uppercase tracking-widest animate-pulse">
                <Wand2 size={14} />
                <span>Structuring design system...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 bg-[#353238] border-t border-[#F9E7C8]/10">
          <div className="relative">
            <div className="relative flex items-center bg-transparent border border-[#F9E7C8]/10 focus-within:border-[#F9E7C8]/40 transition-colors overflow-hidden">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="PROMPT_IDEA_"
                className="w-full bg-transparent text-[#F9E7C8] p-4 max-h-32 focus:outline-none resize-none text-xs placeholder:text-[#F9E7C8]/20 uppercase tracking-widest"
                rows={1}
              />
              <button 
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="p-4 text-[#F9E7C8]/50 hover:text-[#F9E7C8] transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-[#F9E7C8]/5 flex flex-col gap-2">
            <p className="text-[9px] text-[#F9E7C8]/40 text-center uppercase tracking-[0.2em]">Design. Systemized. v1.0</p>
            <div className="text-[8px] text-[#F9E7C8]/20 text-center uppercase tracking-widest leading-relaxed">
              © 2026 ZENTHAUS AI<br/>
              BUILT IN POSADAS, MISIONES BY ZENTHAUS LABS
            </div>
          </div>
        </div>
      </div>

      {/* --- RIGHT PANEL: WORKSPACE --- */}
      <div className="flex-1 flex flex-col bg-[#353238] relative overflow-hidden">
        
        {/* Toolbar */}
        <div className="h-14 border-b border-[#F9E7C8]/10 flex items-center justify-between px-6 bg-[#353238]">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setActiveTab('preview')}
              className={`text-[10px] uppercase tracking-[0.2em] font-bold transition-all ${activeTab === 'preview' ? 'text-[#F9E7C8] border-b border-[#F9E7C8] pb-4 mt-4' : 'text-[#F9E7C8]/30 hover:text-[#F9E7C8]/50'}`}
            >
              Structure
            </button>
            <button 
              onClick={() => setActiveTab('analysis')}
              className={`text-[10px] uppercase tracking-[0.2em] font-bold transition-all flex items-center gap-2 ${activeTab === 'analysis' ? 'text-[#F9E7C8] border-b border-[#F9E7C8] pb-4 mt-4' : 'text-[#F9E7C8]/30 hover:text-[#F9E7C8]/50'}`}
            >
              Analysis
              {analysis && <span className="w-1 h-1 rounded-full bg-[#F2B8A2]"></span>}
            </button>
            <button 
              onClick={() => setActiveTab('code')}
              className={`text-[10px] uppercase tracking-[0.2em] font-bold transition-all ${activeTab === 'code' ? 'text-[#F9E7C8] border-b border-[#F9E7C8] pb-4 mt-4' : 'text-[#F9E7C8]/30 hover:text-[#F9E7C8]/50'}`}
            >
              Source
            </button>
          </div>

          <div className="flex items-center gap-4">
            {activeTab === 'preview' && (
              <div className="hidden md:flex items-center gap-4 mr-4">
                <button 
                  onClick={() => setViewMode('desktop')} 
                  className={`transition-colors ${viewMode === 'desktop' ? 'text-[#F9E7C8]' : 'text-[#F9E7C8]/30 hover:text-[#F9E7C8]/50'}`}
                >
                  <Monitor size={16} />
                </button>
                <button 
                  onClick={() => setViewMode('mobile')} 
                  className={`transition-colors ${viewMode === 'mobile' ? 'text-[#F9E7C8]' : 'text-[#F9E7C8]/30 hover:text-[#F9E7C8]/50'}`}
                >
                  <Smartphone size={16} />
                </button>
              </div>
            )}
            <button 
              onClick={handleDownload}
              className="flex items-center gap-2 bg-[#F9E7C8] text-[#353238] text-[10px] font-bold px-4 py-2 uppercase tracking-widest hover:bg-white transition-colors"
            >
              <Download size={14} /> Export
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-[#353238] relative overflow-hidden flex justify-center p-8">
          
          {/* VIEW: PREVIEW */}
          {activeTab === 'preview' && (
            <div className={`transition-all duration-700 ease-in-out h-full ${viewMode === 'mobile' ? 'w-[375px]' : 'w-full'}`}>
              <div className="w-full h-full bg-white overflow-hidden border border-[#F9E7C8]/5 shadow-2xl">
                <iframe 
                  srcDoc={currentCode}
                  title="Live Preview"
                  className="w-full h-full"
                  sandbox="allow-scripts" 
                />
              </div>
            </div>
          )}

          {/* VIEW: ANALYSIS */}
          {activeTab === 'analysis' && (
            <div className="w-full max-w-3xl h-full overflow-y-auto pr-2 pb-10">
              <div className="bg-transparent border border-[#F9E7C8]/10 p-10">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-10 h-10 border border-[#F9E7C8]/20 flex items-center justify-center">
                    <CheckCircle2 className="text-[#F9E7C8]" size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-[#F9E7C8] font-display uppercase tracking-widest">Structural Analysis</h2>
                </div>
                
                {analysis ? (
                  <div className="prose prose-invert prose-neutral max-w-none">
                    <div className="whitespace-pre-wrap text-[#F9E7C8]/60 leading-relaxed text-sm font-light">
                      {analysis}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-24 text-[#F9E7C8]/20 flex flex-col items-center">
                    <AlertCircle size={40} className="mb-6 opacity-10" />
                    <p className="text-[10px] uppercase tracking-[0.3em]">Awaiting structural generation_</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW: CODE */}
          {activeTab === 'code' && (
             <div className="w-full h-full bg-[#353238] border border-[#F9E7C8]/10 overflow-hidden relative">
               <pre className="w-full h-full overflow-auto p-8 text-[10px] font-mono text-[#F9E7C8]/30 scrollbar-thin scrollbar-thumb-[#F9E7C8]/5 leading-relaxed">
                 {currentCode}
               </pre>
               <div className="absolute top-4 right-4 px-3 py-1 bg-[#F9E7C8]/5 text-[9px] text-[#F9E7C8]/30 border border-[#F9E7C8]/10 uppercase tracking-widest">Read_Only</div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}