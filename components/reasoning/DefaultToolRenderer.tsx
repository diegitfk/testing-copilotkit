"use client"

import { useDefaultTool } from "@copilotkit/react-core";
import {
    Tool,
    ToolContent,
    ToolHeader,
    ToolInput,
    ToolOutput,
} from "@/components/ai-elements/tool";
import type { ToolUIPart } from "ai";

/**
 * Hook que usa useDefaultTool para capturar TODAS las tool calls del backend
 * que no tienen un renderer específico.
 * 
 * A diferencia de useRenderToolCall que requiere especificar el nombre de la tool,
 * useDefaultTool actúa como un "catch-all" para cualquier tool.
 * 
 * IMPORTANTE:
 * - Este renderer captura cualquier tool que NO tenga su propio useRenderToolCall
 * - Es útil para debugging o para mostrar tools genéricas
 * - Tiene acceso a: name, args, status, y result de la tool call
 * 
 * Mapeo de estados:
 * - "inProgress" → "input-streaming" (si no hay args completos) o "input-available" (si hay args)
 * - "complete" → "output-available" (con resultado exitoso)
 * - Error → "output-error"
 */
export function useDefaultToolRenderer() {
    console.log('[DefaultToolRenderer] Hook inicializado');
    
    useDefaultTool({
        render: ({ name, args, status, result }) => {
            console.group(`[DefaultToolRenderer] Rendering tool: ${name}`);
            console.log('Status:', status);
            console.log('Args:', args);
            console.log('Result:', result);
            
            // Determinar el estado de la tool según el status de CopilotKit
            let toolState: ToolUIPart["state"];
            const hasArgs = args && Object.keys(args).length > 0;
            
            console.log('Has Args:', hasArgs);
            console.log('Args keys:', args ? Object.keys(args) : 'N/A');
                        
            if (status === "inProgress") {
                // Si está en progreso, determinamos si tenemos argumentos completos
                toolState = hasArgs ? "input-available" : "input-streaming";
                console.log('→ Tool state (inProgress):', toolState);
            } else if (status === "complete") {
                // Si está completo, mostramos el resultado
                toolState = "output-available";
                console.log('→ Tool state (complete):', toolState);
            } else {
                // Estado por defecto
                toolState = "input-available";
                console.log('→ Tool state (default):', toolState);
            }
            
            console.log('Final tool state:', toolState);
            console.groupEnd();
            
            // Construir el tipo de tool (requerido por ToolHeader)
            const toolType = `tool-${name}` as const;
            
            console.log('[DefaultToolRenderer] Rendering UI components:');
            console.log('  - Tool type:', toolType);
            console.log('  - Will render ToolInput:', true);
            console.log('  - Will render ToolOutput:', status === "complete");
            
            if (status === "complete") {
                const outputValue = typeof result === 'string' 
                    ? result 
                    : JSON.stringify(result, null, 2);
                console.log('  - Output value:', outputValue);
            }
            
            return (
                <Tool defaultOpen={true}>
                    <ToolHeader
                        state={toolState}
                        title={name}
                        type={toolType}
                    />
                    <ToolContent>
                        {/* Mostrar los argumentos de entrada */}
                        <ToolInput input={args || {}} />
                        
                        {/* Mostrar el resultado solo si está completo */}
                        {status === "complete" && (
                            <ToolOutput
                                errorText={undefined}
                                output={
                                    typeof result === 'string' 
                                        ? result 
                                        : JSON.stringify(result, null, 2)
                                }
                            />
                        )}
                    </ToolContent>
                </Tool>
            );
        },
    });
}

/**
 * Componente wrapper opcional para usar en tu página.
 * Solo necesitas agregarlo una vez en tu árbol de componentes.
 */
export function DefaultToolProvider({ children }: { children: React.ReactNode }) {
    console.log('[DefaultToolProvider] Componente montado');
    useDefaultToolRenderer();
    return <>{children}</>;
}
