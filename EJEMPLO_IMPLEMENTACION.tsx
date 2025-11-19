/**
 * EJEMPLO PRÁCTICO: Integración CopilotKit + LangGraph Platform + AI Elements
 * 
 * Este archivo muestra una implementación completa de cómo usar los AI Elements
 * con streaming desde LangGraph Platform.
 * 
 * NOTA: Este es un archivo de referencia. Copia los fragmentos que necesites
 * a tus archivos reales del proyecto.
 */

// ============================================================================
// 1. ACTUALIZAR app/api/copilotkit/route.ts
// ============================================================================

/**
 * Opción A: Configuración actual mejorada
 */
import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
  LangGraphAgent
} from "@copilotkit/runtime";
import OpenAI from "openai";
import { NextRequest } from "next/server";

// Configurar OpenAI para funciones auxiliares
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});
const serviceAdapter = new OpenAIAdapter({ openai } as any);

// Configurar el runtime con tu agente LangGraph
const runtime = new CopilotRuntime({
  agents: {
    'prodmentor_workflow': new LangGraphAgent({
      deploymentUrl: process.env.LANGGRAPH_DEPLOYMENT_URL || "http://localhost:80/api/agents",
      graphId: 'prodmentor_workflow',
    })
  },
});

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};

// ============================================================================
// 2. TIPOS TYPESCRIPT PARA EL ESTADO DEL AGENTE
// ============================================================================

/**
 * Define el estado de tu agente LangGraph
 * Este tipo debe coincidir con el estado que retorna tu grafo de Python
 */
type ProdMentorState = {
  // Estado del nodo actual
  currentStep?: string;
  currentNode?: string;
  
  // Progreso
  progress?: number;
  
  // Análisis y resultados
  analysis?: string;
  insights?: string[];
  recommendations?: {
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
  }[];
  
  // Pensamiento y razonamiento
  thinking?: string[];
  reasoning?: string;
  
  // Datos del producto (contexto)
  productName?: string;
  productDescription?: string;
  
  // Metadata
  startedAt?: string;
  completedAt?: string;
  error?: string;
};

// ============================================================================
// 3. COMPONENTE PRINCIPAL CON STREAMING COMPLETO
// ============================================================================

"use client";

import { 
  useCoAgent, 
  useCoAgentStateRender, 
  useCopilotAction 
} from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import { 
  ChainOfThought, 
  ChainOfThoughtHeader, 
  ChainOfThoughtContent,
  ChainOfThoughtStep 
} from "@/components/ai-elements/chain-of-thought";
import { 
  Tool, 
  ToolHeader, 
  ToolContent, 
  ToolInput, 
  ToolOutput 
} from "@/components/ai-elements/tool";
import { 
  Message,
  MessageContent,
  MessageResponse 
} from "@/components/ai-elements/message";
import { Loader } from "@/components/ai-elements/loader";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProdMentorPage() {
  // =========================================================================
  // Hook 1: Acceso al estado completo del agente (fuera del chat)
  // =========================================================================
  const { state, running, nodeName } = useCoAgent<ProdMentorState>({
    name: "prodmentor_workflow",
  });

  // =========================================================================
  // Hook 2: Renderizado del estado EN EL CHAT (streaming visual)
  // =========================================================================
  useCoAgentStateRender<ProdMentorState>({
    name: "prodmentor_workflow",
    render: ({ state, nodeName }) => {
      // Solo mostrar si hay estado disponible
      if (!state) return null;
      
      return (
        <div className="space-y-4 my-4">
          {/* Chain of Thought - Muestra el proceso de pensamiento */}
          {state.thinking && state.thinking.length > 0 && (
            <ChainOfThought defaultOpen={true}>
              <ChainOfThoughtHeader>
                🧠 Proceso de Análisis - {nodeName}
              </ChainOfThoughtHeader>
              <ChainOfThoughtContent>
                {state.thinking.map((thought, i) => (
                  <ChainOfThoughtStep
                    key={i}
                    label={thought}
                    status={
                      i === state.thinking!.length - 1 
                        ? "active" 
                        : i < state.thinking!.length - 1
                        ? "complete"
                        : "pending"
                    }
                  />
                ))}
              </ChainOfThoughtContent>
            </ChainOfThought>
          )}

          {/* Barra de progreso */}
          {state.progress !== undefined && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Progreso del análisis</span>
                    <span className="text-muted-foreground">{state.progress}%</span>
                  </div>
                  <Progress value={state.progress} />
                  {state.currentStep && (
                    <p className="text-xs text-muted-foreground">
                      {state.currentStep}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Insights en tiempo real */}
          {state.insights && state.insights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">💡 Insights Descubiertos</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {state.insights.map((insight, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <Badge variant="secondary" className="mt-0.5">
                        {i + 1}
                      </Badge>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Recomendaciones preliminares */}
          {state.recommendations && state.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">🎯 Recomendaciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {state.recommendations.map((rec, i) => (
                  <div key={i} className="border-l-4 pl-3 space-y-1"
                    style={{
                      borderColor: 
                        rec.priority === "high" ? "#ef4444" :
                        rec.priority === "medium" ? "#f59e0b" :
                        "#10b981"
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{rec.title}</span>
                      <Badge 
                        variant={rec.priority === "high" ? "destructive" : "secondary"}
                      >
                        {rec.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {rec.description}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      );
    },
  });

  // =========================================================================
  // Hook 3: Renderizado de Tool Calls individuales
  // =========================================================================
  
  // Tool: analyze_product
  useCopilotAction({
    name: "analyze_product",
    available: "disabled", // Solo renderizar, no permitir llamadas desde UI
    render: ({ status, args, result }) => {
      return (
        <Tool defaultOpen={status !== "complete"}>
          <ToolHeader 
            title="📊 Análisis de Producto"
            type="tool-call"
            state={
              status === "executing" ? "input-available" : 
              status === "complete" ? "output-available" :
              "input-streaming"
            }
          />
          <ToolContent>
            {args && <ToolInput input={args} />}
            {result && (
              <ToolOutput 
                output={result} 
                errorText={undefined}
              />
            )}
          </ToolContent>
        </Tool>
      );
    },
  });

  // Tool: generate_recommendations
  useCopilotAction({
    name: "generate_recommendations",
    available: "disabled",
    render: ({ status, args, result }) => {
      return (
        <Tool defaultOpen={status !== "complete"}>
          <ToolHeader 
            title="🎯 Generador de Recomendaciones"
            type="tool-call"
            state={
              status === "executing" ? "input-available" : 
              status === "complete" ? "output-available" :
              "input-streaming"
            }
          />
          <ToolContent>
            {args && <ToolInput input={args} />}
            {result && (
              <ToolOutput 
                output={result} 
                errorText={undefined}
              />
            )}
          </ToolContent>
        </Tool>
      );
    },
  });

  // Tool: research_market
  useCopilotAction({
    name: "research_market",
    available: "disabled",
    render: ({ status, args, result }) => {
      return (
        <Tool defaultOpen={status !== "complete"}>
          <ToolHeader 
            title="🔍 Investigación de Mercado"
            type="tool-call"
            state={
              status === "executing" ? "input-available" : 
              status === "complete" ? "output-available" :
              "input-streaming"
            }
          />
          <ToolContent>
            {args && <ToolInput input={args} />}
            {result && (
              <ToolOutput 
                output={typeof result === "string" ? result : JSON.stringify(result, null, 2)} 
                errorText={undefined}
              />
            )}
          </ToolContent>
        </Tool>
      );
    },
  });

  // =========================================================================
  // RENDERIZADO DEL LAYOUT PRINCIPAL
  // =========================================================================
  return (
    <div className="h-screen flex">
      {/* Panel izquierdo: Chat */}
      <div className="flex-1 flex flex-col">
        <CopilotChat
          instructions="Eres ProdMentor, un experto en mentoría de productos. Ayuda a los usuarios a mejorar sus productos mediante análisis profundos y recomendaciones accionables."
          labels={{
            title: "ProdMentor AI 🚀",
            initial: "¡Hola! Soy tu mentor de productos. Cuéntame sobre tu producto y te ayudaré a mejorarlo.",
            placeholder: "Describe tu producto...",
          }}
          className="h-full"
        />
      </div>

      {/* Panel derecho: Estado en tiempo real */}
      <div className="w-96 border-l bg-muted/10 overflow-auto">
        <div className="p-4 space-y-4">
          {/* Header del panel */}
          <div className="space-y-2">
            <h2 className="text-lg font-bold">Estado del Agente</h2>
            {running && (
              <div className="flex items-center gap-2 text-sm">
                <Loader className="size-4" />
                <span>Procesando...</span>
              </div>
            )}
            {nodeName && (
              <Badge variant="outline">
                Nodo: {nodeName}
              </Badge>
            )}
          </div>

          {/* Estado actual */}
          {state && (
            <>
              {/* Progreso */}
              {state.progress !== undefined && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Progreso</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Progress value={state.progress} />
                    <p className="text-xs text-muted-foreground mt-2">
                      {state.progress}% completado
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Paso actual */}
              {state.currentStep && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Paso Actual</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{state.currentStep}</p>
                  </CardContent>
                </Card>
              )}

              {/* Insights */}
              {state.insights && state.insights.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Insights ({state.insights.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {state.insights.map((insight, i) => (
                        <li key={i} className="text-xs">
                          • {insight}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Información del producto */}
              {state.productName && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Producto</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Nombre</p>
                      <p className="text-sm font-medium">{state.productName}</p>
                    </div>
                    {state.productDescription && (
                      <div>
                        <p className="text-xs text-muted-foreground">Descripción</p>
                        <p className="text-sm">{state.productDescription}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Debug: Estado completo */}
              <details className="text-xs">
                <summary className="cursor-pointer font-medium mb-2">
                  🐛 Debug - Estado Completo
                </summary>
                <pre className="bg-muted p-2 rounded overflow-auto max-h-96">
                  {JSON.stringify(state, null, 2)}
                </pre>
              </details>
            </>
          )}

          {/* Mensaje cuando no hay estado */}
          {!state && !running && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground text-center">
                  Inicia una conversación para ver el estado del agente
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 4. CONFIGURACIÓN DEL AGENTE EN PYTHON (Referencia)
// ============================================================================

/**
 * En tu archivo agent/graph.py o similar:
 * 
 * ```python
 * from langgraph.graph import StateGraph
 * from typing import TypedDict, Annotated, List, Optional
 * from langgraph.checkpoint.memory import MemorySaver
 * 
 * class ProdMentorState(TypedDict):
 *     messages: Annotated[list, "The messages"]
 *     currentStep: Optional[str]
 *     currentNode: Optional[str]
 *     progress: Optional[int]
 *     analysis: Optional[str]
 *     insights: Optional[List[str]]
 *     recommendations: Optional[List[dict]]
 *     thinking: Optional[List[str]]
 *     reasoning: Optional[str]
 *     productName: Optional[str]
 *     productDescription: Optional[str]
 * 
 * async def analysis_node(state: ProdMentorState):
 *     # Actualizar el estado que se streamea al frontend
 *     return {
 *         "currentStep": "Analizando producto...",
 *         "currentNode": "analysis",
 *         "progress": 25,
 *         "thinking": [
 *             "Identificando características clave",
 *             "Evaluando propuesta de valor",
 *             "Analizando mercado objetivo"
 *         ]
 *     }
 * 
 * async def insights_node(state: ProdMentorState):
 *     return {
 *         "currentStep": "Generando insights...",
 *         "currentNode": "insights",
 *         "progress": 50,
 *         "insights": [
 *             "Fuerte diferenciación en precio",
 *             "Oportunidad en segmento empresarial",
 *             "UX necesita mejoras"
 *         ]
 *     }
 * 
 * async def recommendations_node(state: ProdMentorState):
 *     return {
 *         "currentStep": "Creando recomendaciones...",
 *         "currentNode": "recommendations",
 *         "progress": 75,
 *         "recommendations": [
 *             {
 *                 "title": "Optimizar onboarding",
 *                 "description": "Reducir pasos del 20%",
 *                 "priority": "high"
 *             },
 *             {
 *                 "title": "Expandir funcionalidades",
 *                 "description": "Agregar integraciones",
 *                 "priority": "medium"
 *             }
 *         ]
 *     }
 * 
 * # Construir el grafo
 * workflow = StateGraph(ProdMentorState)
 * workflow.add_node("analysis", analysis_node)
 * workflow.add_node("insights", insights_node)
 * workflow.add_node("recommendations", recommendations_node)
 * 
 * workflow.set_entry_point("analysis")
 * workflow.add_edge("analysis", "insights")
 * workflow.add_edge("insights", "recommendations")
 * workflow.add_edge("recommendations", END)
 * 
 * # IMPORTANTE: Usar checkpointer para persistencia y streaming
 * memory = MemorySaver()
 * app = workflow.compile(checkpointer=memory)
 * ```
 */

// ============================================================================
// 5. VARIABLES DE ENTORNO NECESARIAS
// ============================================================================

/**
 * Crea un archivo .env.local en la raíz del proyecto:
 * 
 * ```bash
 * # LangGraph Platform
 * LANGGRAPH_DEPLOYMENT_URL=http://localhost:80/api/agents
 * LANGSMITH_API_KEY=tu_langsmith_api_key_aqui
 * 
 * # OpenAI (para funciones auxiliares de CopilotKit)
 * OPENAI_API_KEY=tu_openai_api_key_aqui
 * 
 * # CopilotKit Cloud (opcional pero recomendado)
 * NEXT_PUBLIC_CPK_PUBLIC_API_KEY=tu_copilot_cloud_key
 * ```
 */

// ============================================================================
// 6. TIPS Y MEJORES PRÁCTICAS
// ============================================================================

/**
 * 1. STREAMING EFICIENTE:
 *    - Retorna solo los campos que cambiaron en cada nodo
 *    - Usa tipos TypeScript consistentes con tu estado de Python
 *    - Evita retornar objetos muy grandes en cada actualización
 * 
 * 2. PERFORMANCE:
 *    - Usa React.memo en componentes que renderizan estado
 *    - Implementa debouncing si el estado cambia muy rápido
 *    - Considera lazy loading para componentes complejos
 * 
 * 3. UX:
 *    - Muestra loaders mientras el agente procesa
 *    - Usa animaciones suaves para transiciones de estado
 *    - Provee feedback visual del progreso
 *    - Maneja errores gracefully con mensajes útiles
 * 
 * 4. DEBUGGING:
 *    - Usa el panel de debug para ver el estado completo
 *    - Revisa los logs del servidor LangGraph Platform
 *    - Usa las DevTools de React para inspeccionar hooks
 *    - Habilita logging detallado en desarrollo
 * 
 * 5. PRODUCCIÓN:
 *    - Configura timeouts apropiados para tu plataforma
 *    - Usa variables de entorno para configuración
 *    - Implementa manejo de errores robusto
 *    - Considera usar Copilot Cloud para evitar problemas de timeout
 */
