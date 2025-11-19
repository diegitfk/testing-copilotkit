"use client"

import { useRenderToolCall } from "@copilotkit/react-core";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ai-elements/reasoning";
import { Brain, Lightbulb } from "lucide-react";

/**
 * Hook para renderizar tool calls de reasoning en el chat.
 * 
 * Los tool calls quedan automáticamente respaldados en el thread.
 * Esta es la forma oficial y recomendada de hacer reasoning con CopilotKit.
 * 
 * IMPORTANTE: 
 * - Los parámetros aquí definidos son solo para renderizado en el frontend
 * - El backend debe SIEMPRE retornar un string válido (nunca null) de las tool functions
 * - useRenderToolCall solo RENDERIZA las tool calls, no las ejecuta
 */
export function useReasoningToolRenderer() {
    // ===== RENDERIZAR THINKING TOOL =====
    useRenderToolCall({
        name: "thinking_tool",
        description: "Renderiza los pensamientos del agente en el chat",
        available: "disabled", // Solo para renderizar, no llamar desde el frontend
        parameters: [
            { name: "title", type: "string", description: "Título del pensamiento", required: true },
            { name: "thought", type: "string", description: "El pensamiento completo", required: true },
            { name: "action", type: "string", description: "Siguiente acción", required: false },
            { name: "confidence", type: "number", description: "Nivel de confianza (0-1)", required: false },
        ],
        render: ({ status, args , result }) => {
            const confidence = args.confidence as number || 0.8;
            const isStreaming = status === "inProgress";
            
            // Construir el contenido como string
            let content = `**${args.title as string}**\n\n${args.thought as string}`;
            
            if (args.action) {
                content += `\n\n**Siguiente acción:** ${args.action as string}`;
            }
            
            if (status === "complete") {
                content += `\n\n_Confianza: ${Math.round(confidence * 100)}%_`;
            }
            
            return (
                <Reasoning isStreaming={isStreaming} defaultOpen={true}>
                    <ReasoningTrigger>
                        <Brain className="size-4" />
                        <span>{isStreaming ? "Pensando..." : `Pensamiento: ${args.title as string}`}</span>
                    </ReasoningTrigger>
                    <ReasoningContent>{content}</ReasoningContent>
                </Reasoning>
            );
        },
    });

    // ===== RENDERIZAR ANALYZE TOOL =====
    useRenderToolCall({
        name: "analyze_tool",
        description: "Renderiza los análisis del agente en el chat",
        available: "disabled", // Solo para renderizar, no llamar desde el frontend
        parameters: [
            { name: "title", type: "string", description: "Título del análisis", required: true },
            { name: "analisis_result", type: "string", description: "Resultado analizado", required: false },
            { name: "analysis", type: "string", description: "El análisis detallado", required: true },
            { name: "next_action", type: "string", description: "Próxima acción", required: false },
            { name: "confidence", type: "number", description: "Nivel de confianza (0-1)", required: false },
        ],
        render: ({ status, args }) => {
            const confidence = args.confidence as number || 0.8;
            const isStreaming = status === "inProgress";
            
            // Construir el contenido como string
            let content = `**${args.title as string}**\n\n`;
            
            if (args.analisis_result) {
                content += `**Resultado:**\n${args.analisis_result as string}\n\n`;
            }
            
            if (args.analysis) {
                content += `**Análisis:**\n${args.analysis as string}\n\n`;
            }
            
            if (args.next_action) {
                content += `**Siguiente acción:** ${args.next_action as string}\n\n`;
            }
            
            if (status === "complete") {
                content += `_Confianza: ${Math.round(confidence * 100)}%_`;
            }
            
            return (
                <Reasoning isStreaming={isStreaming} defaultOpen={true}>
                    <ReasoningTrigger>
                        <Lightbulb className="size-4" />
                        <span>{isStreaming ? "Analizando..." : `Análisis: ${args.title as string}`}</span>
                    </ReasoningTrigger>
                    <ReasoningContent>{content}</ReasoningContent>
                </Reasoning>
            );
        },
    });
}

/**
 * Componente wrapper opcional para usar en tu página.
 * Solo necesitas agregarlo una vez en tu árbol de componentes.
 */
export function ReasoningToolProvider({ children }: { children: React.ReactNode }) {
    useReasoningToolRenderer();
    return <>{children}</>;
}
