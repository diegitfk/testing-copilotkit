"use client"

import { useState, useRef, useEffect } from "react";
import { useCopilotChatHeadless_c, useCoAgent, useCopilotAction, useCoAgentStateRender } from "@copilotkit/react-core";
import { 
    Message, 
    MessageContent,
    MessageResponse 
} from "@/components/ai-elements/message";
import {
    PromptInput,
    PromptInputTextarea,
    PromptInputSubmit,
} from '@/components/ai-elements/prompt-input';
import { Loader } from "@/components/ai-elements/loader";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useReasoningToolRenderer } from '@/components/reasoning/ReasoningToolRenderer';
import { useDefaultToolRenderer } from '@/components/reasoning/DefaultToolRenderer';

// Tipo que coincide EXACTAMENTE con ProdmentorAssistantState de Python
// La estructura viene de las tools call_agent_web_research y call_agent_knowledge_research
type ResearchResultItem = {
    agent_name: string;
    type_research: "web" | "knowledge";
    research_content: string;        // El contenido completo de la investigación (Markdown)
    citations: string[];             // URLs de las fuentes
    main_ideas: string[];            // Lista de ideas principales
    [key: string]: any;              // Otros campos adicionales
};

type ProdMentorState = {
    messages: Array<any>;
    // web_research_results es un dict donde la key es el research_id
    web_research_results?: {
        [research_id: string]: ResearchResultItem;
    };
    // knowledge_research_results tiene la misma estructura
    knowledge_research_results?: {
        [research_id: string]: ResearchResultItem;
    };
    // Progreso opcional del agente (0-100)
    progress?: number;
};

export function Chat() {
    const [input, setInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Estado para el modal de investigación
    const [selectedResearch, setSelectedResearch] = useState<{
        id: string;
        data: ResearchResultItem;
        type: "web" | "knowledge";
    } | null>(null);

    // Hook headless principal - Te da control total del chat
    const {
        messages,           // Array de mensajes
        sendMessage,        // Función para enviar mensajes
        isLoading,          // Si está procesando
        stopGeneration,     // Detener generación
        reloadMessages,     // Recargar mensaje específico
        deleteMessage,      // Eliminar mensaje
        setMessages,        // Reemplazar todos los mensajes
        suggestions,        // Sugerencias disponibles
        generateSuggestions,// Generar sugerencias
        interrupt,          // Contenido de interrupción (HITL)
    } = useCopilotChatHeadless_c();

    // Estado del agente LangGraph
    const { state, running  , nodeName} = useCoAgent<ProdMentorState>({
        name: "prodmentor_workflow",
        config : {
            streamSubgraphs : true
        }
    });

    // Hook para renderizar tool calls de reasoning
    // Los tool calls quedan automáticamente respaldados en el thread    
    // Hook para renderizar TODAS las demás tool calls que no tienen renderer específico
    // Actúa como "catch-all" para debugging y visualización de tools genéricas
    useReasoningToolRenderer()
    useDefaultToolRenderer();

    // Auto-scroll al final cuando hay nuevos mensajes
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Handler para enviar mensajes
    const handleSend = () => {
        if (input.trim() && !isLoading) {
            sendMessage({
                id: Date.now().toString(),
                role: "user",
                content: input,
            });
            setInput("");
        }
    };

    // Handler para el Enter
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Verificar si hay research results para mostrar el panel lateral
    const hasResearchResults = (state.web_research_results && Object.keys(state.web_research_results).length > 0) ||
                               (state.knowledge_research_results && Object.keys(state.knowledge_research_results).length > 0);

    return (
        <div className="flex h-screen">
            {/* Panel Lateral de Research Results */}
            {hasResearchResults && (
                <div className="w-96 border-r flex flex-col bg-gray-50 dark:bg-gray-900">
                    <div className="border-b p-4">
                        <h2 className="font-bold text-lg">📊 Resultados de Investigación</h2>
                        <p className="text-xs text-muted-foreground mt-1">
                            Información recopilada por el agente
                        </p>
                    </div>
                    
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                            {/* Web Research Results */}
                            {state.web_research_results && Object.keys(state.web_research_results).length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Badge variant="default">🌐 Web Research</Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {Object.keys(state.web_research_results).length} resultado(s)
                                        </span>
                                    </div>
                                    <div className="space-y-3">
                                        {Object.entries(state.web_research_results).map(([research_id, result]) => (
                                            <div 
                                                key={research_id} 
                                                className="bg-white dark:bg-gray-800 p-3 rounded-lg border shadow-sm cursor-pointer hover:shadow-md hover:border-blue-400 transition-all"
                                                onClick={() => setSelectedResearch({ id: research_id, data: result, type: "web" })}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <Badge variant="outline" className="text-xs">
                                                        {result.agent_name}
                                                    </Badge>
                                                    <span className="text-xs text-blue-600 font-medium">👆 Click para ver más</span>
                                                </div>
                                                
                                                {/* Ideas Principales */}
                                                {result.main_ideas && result.main_ideas.length > 0 && (
                                                    <div className="mb-3">
                                                        <p className="text-xs font-semibold mb-2">💡 Ideas Principales:</p>
                                                        <ul className="space-y-1">
                                                            {result.main_ideas.slice(0, 2).map((idea: string, i: number) => (
                                                                <li key={i} className="text-xs text-muted-foreground pl-2">
                                                                    • {idea.substring(0, 100)}...
                                                                </li>
                                                            ))}
                                                        </ul>
                                                        {result.main_ideas.length > 2 && (
                                                            <p className="text-xs text-muted-foreground mt-1 pl-2">
                                                                +{result.main_ideas.length - 2} más
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                                
                                                {/* Fuentes */}
                                                {result.citations && result.citations.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {result.citations.slice(0, 3).map((citation: string, i: number) => (
                                                            <a
                                                                key={i}
                                                                href={citation}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-xs text-blue-600 hover:underline"
                                                            >
                                                                🔗 {new URL(citation).hostname}
                                                            </a>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {/* Knowledge Research Results */}
                            {state.knowledge_research_results && Object.keys(state.knowledge_research_results).length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Badge variant="secondary">📚 Knowledge Research</Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {Object.keys(state.knowledge_research_results).length} resultado(s)
                                        </span>
                                    </div>
                                    <div className="space-y-3">
                                        {Object.entries(state.knowledge_research_results).map(([research_id, result]) => (
                                            <div 
                                                key={research_id} 
                                                className="bg-white dark:bg-gray-800 p-3 rounded-lg border shadow-sm cursor-pointer hover:shadow-md hover:border-purple-400 transition-all"
                                                onClick={() => setSelectedResearch({ id: research_id, data: result, type: "knowledge" })}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <Badge variant="outline" className="text-xs">
                                                        {result.agent_name}
                                                    </Badge>
                                                    <span className="text-xs text-purple-600 font-medium">👆 Click para ver más</span>
                                                </div>
                                                
                                                {/* Ideas Principales */}
                                                {result.main_ideas && result.main_ideas.length > 0 && (
                                                    <div className="mb-3">
                                                        <p className="text-xs font-semibold mb-2">💡 Ideas Principales:</p>
                                                        <ul className="space-y-1">
                                                            {result.main_ideas.slice(0, 2).map((idea: string, i: number) => (
                                                                <li key={i} className="text-xs text-muted-foreground pl-2">
                                                                    • {idea.substring(0, 100)}...
                                                                </li>
                                                            ))}
                                                        </ul>
                                                        {result.main_ideas.length > 2 && (
                                                            <p className="text-xs text-muted-foreground mt-1 pl-2">
                                                                +{result.main_ideas.length - 2} más
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                                
                                                {/* Fuentes */}
                                                {result.citations && result.citations.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {result.citations.slice(0, 3).map((citation: string, i: number) => (
                                                            <a
                                                                key={i}
                                                                href={citation}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-xs text-blue-600 hover:underline"
                                                            >
                                                                📄 {new URL(citation).hostname}
                                                            </a>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            )}
            
            {/* Chat Principal */}
            <div className="flex flex-col flex-1">
            {/* Header */}
            <div className="border-b p-4 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold">ProdMentor AI 🚀</h1>
                    <p className="text-sm text-muted-foreground">
                        Chat Headless con LangGraph
                    </p>
                </div>
                
                {/* Estado del agente */}
                <div className="flex items-center gap-2">
                    {running && (
                        <>
                            <Loader className="size-4" />
                            <Badge variant="secondary">Procesando</Badge>
                        </>
                    )}
                    {state?.progress !== undefined && (
                        <Badge variant="outline">
                            {state.progress}%
                        </Badge>
                    )}
                </div>
            </div>

            {/* Área de mensajes */}
            <ScrollArea className="flex-1 p-4">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="max-w-md space-y-4">
                            <h2 className="text-2xl font-bold">
                                ¡Bienvenido a ProdMentor! 👋
                            </h2>
                            <p className="text-muted-foreground">
                                Cuéntame sobre tu producto y te ayudaré a mejorarlo 
                                con análisis experto y recomendaciones accionables.
                            </p>
                            <div className="flex flex-wrap gap-2 justify-center">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setInput("Analiza mi aplicación SaaS de gestión de proyectos");
                                    }}
                                >
                                    Analizar SaaS
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setInput("Dame feedback sobre mi e-commerce de productos artesanales");
                                    }}
                                >
                                    Feedback E-commerce
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setInput("Necesito ideas para mejorar mi app móvil");
                                    }}
                                >
                                    Mejorar App
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages
                            .filter(msg => msg.role === "user" || msg.role === "assistant" || msg.role === "system")
                            .map((message) => (
                            <Message key={message.id} from={message.role as "user" | "assistant" | "system"}>
                                <MessageContent>
                                    {message.role === "assistant" ? (
                                        <MessageResponse>
                                            {message.content}
                                        </MessageResponse>
                                    ) : (
                                        <p className="text-sm">{message.content}</p>
                                    )}
                                    
                                    {/* Renderizar generativeUI - incluye tool calls automáticamente */}
                                    {message.role === "assistant" && message.generativeUI?.()}
                                </MessageContent>
                            </Message>
                        ))}
                        
                        {/* Renderizar interrupciones (Human-in-the-Loop) */}
                        {interrupt && (
                            <Message from="assistant">
                                <MessageContent>
                                    {interrupt}
                                </MessageContent>
                            </Message>
                        )}
                        
                        {/* Indicador de carga */}
                        {isLoading && !interrupt && (
                            <Message from="assistant">
                                <MessageContent>
                                    <div className="flex items-center gap-2">
                                        <Loader className="size-4" />
                                        <span className="text-sm text-muted-foreground">
                                            Pensando...
                                        </span>
                                    </div>
                                </MessageContent>
                            </Message>
                        )}
                        
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </ScrollArea>

            {/* Input area */}
            <div className="border-t p-4">
                <div className="flex gap-2">
                    <PromptInput className="flex-1" onSubmit={handleSend}>
                        <PromptInputTextarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Describe tu producto..."
                            rows={2}
                            disabled={isLoading}
                        />
                    </PromptInput>
                    
                    <div className="flex flex-col gap-2">
                        <PromptInputSubmit
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                        >
                            Enviar
                        </PromptInputSubmit>
                        
                        {isLoading && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={stopGeneration}
                            >
                                Detener
                            </Button>
                        )}
                    </div>
                </div>
                
                {/* Debug info */}
                {state && (
                    <details className="mt-2 text-xs">
                        <summary className="cursor-pointer text-muted-foreground">
                            Debug: Estado del agente
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded overflow-auto max-h-32">
                            {JSON.stringify(state, null, 2)}
                        </pre>
                    </details>
                )}
            </div>
            </div>
            
            {/* Modal de Detalle de Investigación */}
            <Dialog open={!!selectedResearch} onOpenChange={(open) => !open && setSelectedResearch(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {selectedResearch?.type === "web" ? "🌐" : "📚"} 
                            {selectedResearch?.type === "web" ? "Web Research" : "Knowledge Research"}
                            <Badge variant="outline" className="ml-2">
                                {selectedResearch?.data.agent_name}
                            </Badge>
                        </DialogTitle>
                        <DialogDescription>
                            ID: {selectedResearch?.id.substring(0, 16)}...
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="max-h-[calc(90vh-120px)] overflow-y-auto pr-4">
                        <div className="space-y-6">
                            {/* Ideas Principales */}
                            {selectedResearch?.data.main_ideas && selectedResearch.data.main_ideas.length > 0 && (
                                <div>
                                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                                        💡 Ideas Principales
                                        <Badge variant="secondary">{selectedResearch.data.main_ideas.length}</Badge>
                                    </h3>
                                    <ul className="space-y-3">
                                        {selectedResearch.data.main_ideas.map((idea: string, i: number) => (
                                            <li key={i} className="text-sm pl-4 border-l-2 border-blue-500 py-2">
                                                <span className="font-medium text-blue-600">Idea {i + 1}:</span> {idea}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            
                            {/* Contenido Completo */}
                            {selectedResearch?.data.research_content && (
                                <div>
                                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                                        📄 Contenido Completo
                                    </h3>
                                    <div className="prose prose-sm dark:prose-invert max-w-none bg-gray-50 dark:bg-gray-900 p-6 rounded-lg border">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {selectedResearch.data.research_content}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            )}
                            
                            {/* Fuentes/Citations */}
                            {selectedResearch?.data.citations && selectedResearch.data.citations.length > 0 && (
                                <div>
                                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                                        🔗 Fuentes
                                        <Badge variant="secondary">{selectedResearch.data.citations.length}</Badge>
                                    </h3>
                                    <div className="space-y-2">
                                        {selectedResearch.data.citations.map((citation: string, i: number) => (
                                            <a
                                                key={i}
                                                href={citation}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline p-2 bg-gray-50 dark:bg-gray-900 rounded border"
                                            >
                                                <span className="font-medium">🔗 {i + 1}.</span>
                                                <span className="truncate">{citation}</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default Chat;