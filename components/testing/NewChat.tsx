"use client"

import { useState } from "react";
import { useCopilotChatHeadless_c, useCoAgent } from "@copilotkit/react-core";
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
import { Button } from "@/components/ui/button";
import { useCustomToolRender } from '@/components/tools/ToolRender';
import { Conversation, ConversationContent } from "@/components/ai-elements/conversation";

// Nuevo estado del agente según requerimientos
type NewAgentState = {
    messages: any[]; // Lista de mensajes del agente
    jump_to: string; // String para control de flujo
};

export function NewChat() {
    const [input, setInput] = useState("");

    // 1. Integración del nuevo hook de renderizado de tools
    useCustomToolRender();

    // 2. Hook headless principal para el chat UI
    const {
        messages,
        sendMessage,
        isLoading,
        stopGeneration,
        interrupt,
    } = useCopilotChatHeadless_c();

    // 3. Integración con LangGraph usando el nuevo estado
    const { state, running } = useCoAgent<NewAgentState>({
        name: "prodmentor_workflow", // Mantenemos el nombre del workflow anterior, ajustar si es necesario
        config: {
            streamSubgraphs: true
        }
    });

    const handleSend = async () => {
        if (input.trim() && !isLoading) {
            try {
                await sendMessage({
                    id: Date.now().toString(),
                    role: "user",
                    content: input,
                });
                setInput("");
            } catch (error) {
                console.error("Error sending message:", error);
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="dark flex h-screen bg-background text-foreground">
            <div className="flex flex-col flex-1 max-w-4xl mx-auto w-full border-x shadow-sm overflow-hidden bg-background">
                {/* Header */}
                <div className="border-b p-4 flex items-center justify-between bg-card/50 backdrop-blur dark:bg-slate-950/80">
                    <div>
                        <h1 className="text-xl font-bold dark:text-white">New ProdMentor AI 🚀</h1>
                        <p className="text-sm text-muted-foreground dark:text-gray-400">
                            LangGraph Headless Integration
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {running && (
                            <>
                                <Loader className="size-4 text-blue-500" />
                                <Badge variant="secondary" className="animate-pulse">Procesando</Badge>
                            </>
                        )}
                        {/* Mostrar jump_to si es relevante para debug o UI */}
                        {state?.jump_to && (
                            <Badge variant="outline" className="dark:border-gray-700 dark:text-gray-300">
                                Fase: {state.jump_to}
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Área de mensajes */}
                <Conversation className="flex-1">
                    <ConversationContent className="gap-4 p-4">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center opacity-50 py-20">
                                <h2 className="text-2xl font-bold mb-2 dark:text-gray-200">¡Hola! 👋</h2>
                                <p className="dark:text-gray-400">Estoy listo para ayudarte con tu producto.</p>
                            </div>
                        ) : (
                            <>
                                {messages
                                    .filter(msg => ["user", "assistant", "system"].includes(msg.role))
                                    .map((message, index) => (
                                    <Message key={`${message.id}-${index}`} from={message.role as "user" | "assistant" | "system"}>
                                        <MessageContent>
                                            {message.role === "assistant" ? (
                                                <MessageResponse>
                                                    {message.content}
                                                </MessageResponse>
                                            ) : (
                                                <p className="whitespace-pre-wrap dark:text-gray-200">{message.content}</p>
                                            )}
                                            
                                            {/* Renderizado de Generative UI (Tools) */}
                                            {message.role === "assistant" && message.generativeUI?.()}
                                        </MessageContent>
                                    </Message>
                                ))}
                                
                                {/* Interrupciones (Human-in-the-Loop) */}
                                {interrupt && (
                                    <div className="border-l-4 border-yellow-500 pl-4 py-2 my-4 bg-yellow-500/10 rounded-r">
                                        <p className="font-semibold text-yellow-700 dark:text-yellow-400 mb-2">Intervención requerida:</p>
                                        <p className="dark:text-gray-200">{interrupt}</p>
                                    </div>
                                )}
                                
                                {/* Loading state */}
                                {isLoading && !interrupt && (
                                    <div className="flex items-center gap-2 text-muted-foreground text-sm ml-4">
                                        <Loader className="size-3" />
                                        <span>Escribiendo...</span>
                                    </div>
                                )}
                            </>
                        )}
                    </ConversationContent>
                </Conversation>

                {/* Input Area */}
                <div className="p-4 border-t bg-background dark:border-gray-800">
                    <div className="flex gap-2">
                        <PromptInput className="flex-1" onSubmit={handleSend}>
                            <PromptInputTextarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Escribe tu mensaje..."
                                disabled={isLoading}
                                className="min-h-[50px]"
                            />
                        </PromptInput>
                        
                        <div className="flex flex-col gap-2 justify-end">
                            <PromptInputSubmit
                                onClick={handleSend}
                                disabled={!input.trim() || isLoading}
                            >
                                Enviar
                            </PromptInputSubmit>
                            
                            {isLoading && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={stopGeneration}
                                    className="text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
                                >
                                    Stop
                                </Button>
                            )}
                        </div>
                    </div>
                    
                    {/* Debug State View (Opcional, útil para desarrollo) */}
                    <details className="mt-2 text-xs text-muted-foreground">
                        <summary className="cursor-pointer hover:underline">Dev: Ver Estado</summary>
                        <pre className="mt-2 p-2 bg-muted rounded overflow-auto max-h-32 text-[10px]">
                            {JSON.stringify(state, null, 2)}
                        </pre>
                    </details>
                </div>
            </div>
        </div>
    );
}
