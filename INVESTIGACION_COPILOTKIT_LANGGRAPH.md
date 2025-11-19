# Investigación: Integración CopilotKit + LangGraph Platform + AI Elements

## 📋 Resumen Ejecutivo

Esta investigación documenta cómo integrar CopilotKit con un servidor de LangGraph Platform y cómo implementar streaming personalizado utilizando AI Elements en tu aplicación Next.js.

---

## 🏗️ Arquitectura Actual

### Tu Configuración Actual

```typescript
// app/api/copilotkit/route.ts
const runtime = new CopilotRuntime({
  agents: {
    'prodmentor_workflow': new LangGraphAgent({
      deploymentUrl: "http://localhost:80/api/agents",
      graphId: 'prodmentor_workflow',
    })
  },
});
```

**Componentes Disponibles:**
- ✅ AI Elements en `components/ai-elements/`
- ✅ CopilotKit configurado en `layout.tsx`
- ✅ LangGraphAgent básico configurado

---

## 🔌 Integración con LangGraph Platform

### 1. Configuración Mejorada del Runtime

CopilotKit ofrece dos formas de conectar con LangGraph Platform:

#### Opción A: Usando `LangGraphAgent` (Tu configuración actual)

```typescript
// app/api/copilotkit/route.ts
import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
  LangGraphAgent
} from "@copilotkit/runtime";
import { Client } from "@langchain/langgraph-sdk";

const runtime = new CopilotRuntime({
  agents: {
    'prodmentor_workflow': new LangGraphAgent({
      deploymentUrl: process.env.LANGGRAPH_DEPLOYMENT_URL || "http://localhost:80/api/agents",
      graphId: 'prodmentor_workflow',
      // Opcional: Cliente personalizado
      // client: new Client({ apiUrl: "..." })
    })
  },
});
```

#### Opción B: Usando `langGraphPlatformEndpoint` (Recomendado para producción)

```typescript
// app/api/copilotkit/route.ts
import {
  CopilotRuntime,
  copilotRuntimeNextJSAppRouterEndpoint,
  ExperimentalEmptyAdapter,
  langGraphPlatformEndpoint,
} from "@copilotkit/runtime";

const serviceAdapter = new ExperimentalEmptyAdapter();

const runtime = new CopilotRuntime({
  remoteEndpoints: [
    langGraphPlatformEndpoint({
      deploymentUrl: process.env.LANGGRAPH_DEPLOYMENT_URL || "http://localhost:80/api/agents",
      langsmithApiKey: process.env.LANGSMITH_API_KEY || "",
      agents: [{
        name: 'prodmentor_workflow',
        description: 'Agente para mentoría de productos'
      }]
    }),
  ],
});
```

### 2. Variables de Entorno

Crea/actualiza tu archivo `.env.local`:

```bash
# LangGraph Platform
LANGGRAPH_DEPLOYMENT_URL=http://localhost:80/api/agents
LANGSMITH_API_KEY=tu_api_key_aqui

# OpenAI (para funciones auxiliares)
OPENAI_API_KEY=tu_openai_key

# CopilotKit (opcional pero recomendado)
NEXT_PUBLIC_CPK_PUBLIC_API_KEY=tu_copilot_cloud_key
```

---

## 🌊 Streaming Personalizado con AI Elements

### 1. Renderizado de Estado del Agente (Agentic Generative UI)

Usa `useCoAgentStateRender` para mostrar el estado del agente en tiempo real:

```typescript
// app/page.tsx o tu componente principal
import { useCoAgentStateRender } from "@copilotkit/react-core";

type ProdMentorState = {
  currentStep?: string;
  analysis?: string;
  suggestions?: string[];
  progress?: number;
};

function MainComponent() {
  useCoAgentStateRender<ProdMentorState>({
    name: "prodmentor_workflow",
    render: ({ state, nodeName, running }) => {
      if (!running) return null;
      
      return (
        <div className="flex flex-col gap-4 p-4 border rounded-lg bg-secondary/10">
          <div className="flex items-center gap-2">
            <Loader className="size-4 animate-spin" />
            <span className="font-medium">
              {nodeName}: {state.currentStep || 'Procesando...'}
            </span>
          </div>
          
          {state.progress !== undefined && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${state.progress}%` }}
              />
            </div>
          )}
          
          {state.suggestions && state.suggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Sugerencias:</p>
              {state.suggestions.map((suggestion, i) => (
                <p key={i} className="text-sm text-muted-foreground">
                  • {suggestion}
                </p>
              ))}
            </div>
          )}
        </div>
      );
    },
  });
  
  return <div>{/* Tu UI */}</div>;
}
```

### 2. Renderizado de Tool Calls (Tool-based Generative UI)

Renderiza las llamadas a herramientas usando `useCopilotAction`:

```typescript
// app/page.tsx
import { useCopilotAction } from "@copilotkit/react-core";
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from "@/components/ai-elements/tool";

function MainComponent() {
  // Renderizar tool calls del agente
  useCopilotAction({
    name: "analyze_product",
    available: "disabled", // Solo para renderizar, no para llamar desde el frontend
    render: ({ status, args, result }) => {
      return (
        <Tool defaultOpen={status !== "complete"}>
          <ToolHeader 
            title="Análisis de Producto"
            type="tool-call"
            state={status === "executing" ? "input-available" : "output-available"}
          />
          <ToolContent>
            <ToolInput input={args} />
            {result && <ToolOutput output={result} errorText={undefined} />}
          </ToolContent>
        </Tool>
      );
    },
  });
  
  return <div>{/* Tu UI */}</div>;
}
```

### 3. Chain of Thought Streaming

Usa el componente `ChainOfThought` para mostrar el proceso de pensamiento:

```typescript
// app/page.tsx
import { 
  ChainOfThought, 
  ChainOfThoughtHeader, 
  ChainOfThoughtContent,
  ChainOfThoughtStep 
} from "@/components/ai-elements/chain-of-thought";

function MainComponent() {
  useCoAgentStateRender<ProdMentorState>({
    name: "prodmentor_workflow",
    render: ({ state }) => {
      return (
        <ChainOfThought defaultOpen={true}>
          <ChainOfThoughtHeader>
            Proceso de Mentoría
          </ChainOfThoughtHeader>
          <ChainOfThoughtContent>
            <ChainOfThoughtStep
              label="Análisis inicial"
              status={state.currentStep === "analysis" ? "active" : "complete"}
              description="Evaluando el producto y contexto"
            />
            <ChainOfThoughtStep
              label="Generación de insights"
              status={
                state.currentStep === "insights" ? "active" : 
                state.currentStep === "analysis" ? "pending" : 
                "complete"
              }
              description="Identificando oportunidades de mejora"
            />
            <ChainOfThoughtStep
              label="Recomendaciones"
              status={state.currentStep === "recommendations" ? "active" : "pending"}
              description="Creando plan de acción"
            />
          </ChainOfThoughtContent>
        </ChainOfThought>
      );
    },
  });
  
  return <div>{/* Tu UI */}</div>;
}
```

### 4. Acceso al Estado Fuera del Chat

```typescript
// app/page.tsx
import { useCoAgent } from "@copilotkit/react-core";

function Dashboard() {
  const { state, running } = useCoAgent<ProdMentorState>({
    name: "prodmentor_workflow",
  });
  
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        {/* Vista principal del chat */}
        <CopilotChat />
      </div>
      
      <div className="space-y-4">
        {/* Panel lateral con estado en tiempo real */}
        <div className="p-4 border rounded-lg">
          <h3 className="font-bold mb-2">Estado del Agente</h3>
          {running && <Loader className="animate-spin" />}
          <pre className="text-xs">
            {JSON.stringify(state, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
```

---

## 🎨 Componentes AI Elements Disponibles

Tu proyecto ya incluye estos componentes listos para usar:

### 1. Message Components
```typescript
import { 
  Message, 
  MessageContent, 
  MessageResponse 
} from "@/components/ai-elements/message";
```

### 2. Tool Rendering
```typescript
import { 
  Tool, 
  ToolHeader, 
  ToolContent, 
  ToolInput, 
  ToolOutput 
} from "@/components/ai-elements/tool";
```

### 3. Chain of Thought
```typescript
import { 
  ChainOfThought, 
  ChainOfThoughtStep 
} from "@/components/ai-elements/chain-of-thought";
```

### 4. Context Display
```typescript
import { 
  Context, 
  ContextTrigger, 
  ContextContent 
} from "@/components/ai-elements/context";
```

### 5. Otros Componentes
- `Artifact` - Para mostrar artefactos generados
- `Loader` - Indicadores de carga personalizados
- `Queue` - Sistema de colas de tareas
- `Plan` - Renderizado de planes paso a paso
- `Reasoning` - Muestra el razonamiento del modelo

---

## 📊 Configuración del Agente LangGraph (Python)

Para que el streaming funcione correctamente, tu agente LangGraph debe emitir estados intermedios:

```python
# agent/graph.py
from langgraph.graph import StateGraph
from typing import TypedDict, Annotated
from langgraph.checkpoint.memory import MemorySaver

class AgentState(TypedDict):
    messages: Annotated[list, "The messages in the conversation"]
    current_step: str
    analysis: str
    suggestions: list[str]
    progress: int

# Nodo que emite estado intermedio
async def analysis_node(state: AgentState):
    # Actualiza el estado que se streamea al frontend
    return {
        "current_step": "Analizando producto...",
        "progress": 30
    }

async def insights_node(state: AgentState):
    # El estado se actualiza en tiempo real
    return {
        "current_step": "Generando insights...",
        "progress": 60,
        "suggestions": ["Mejorar UX", "Optimizar performance"]
    }

# Construir el grafo
workflow = StateGraph(AgentState)
workflow.add_node("analysis", analysis_node)
workflow.add_node("insights", insights_node)
workflow.set_entry_point("analysis")
workflow.add_edge("analysis", "insights")

# Importante: Usar checkpointer para persistencia
memory = MemorySaver()
app = workflow.compile(checkpointer=memory)
```

---

## 🔧 Configuración Avanzada

### 1. Emit Intermediate State (Streaming de Tool Arguments)

Para hacer streaming de argumentos de herramientas parciales:

```python
# En tu configuración de LangGraph Platform
copilotkit_config = {
    "emit_intermediate_state": [
        {
            "state_key": "analysis_draft",
            "tool": "analyze_product",
            "tool_argument": "draft"
        }
    ]
}
```

Y en el frontend:

```typescript
useCoAgentStateRender<{ analysis_draft?: string }>({
  name: "prodmentor_workflow",
  render: ({ state }) => {
    if (!state.analysis_draft) return null;
    
    return (
      <div className="p-4 border rounded-lg">
        <h4 className="font-medium mb-2">Análisis en Progreso</h4>
        <MessageResponse>
          {state.analysis_draft}
        </MessageResponse>
      </div>
    );
  },
});
```

### 2. Human-in-the-Loop (HITL)

Implementa interrupciones para obtener feedback del usuario:

```typescript
// Frontend
import { useLangGraphInterruptRender } from "@copilotkit/react-core";

function MyComponent() {
  const interruptUI = useLangGraphInterruptRender();
  
  return (
    <div>
      {interruptUI}
      <CopilotChat />
    </div>
  );
}
```

```python
# Backend (LangGraph)
from langgraph.types import interrupt

async def review_node(state: AgentState):
    # Pausar para revisión humana
    human_feedback = interrupt({
        "question": "¿Estás de acuerdo con este análisis?",
        "options": ["Sí, continuar", "No, revisar"]
    })
    
    return {
        "feedback": human_feedback,
        "current_step": "Procesando feedback..."
    }
```

### 3. Múltiples Agentes

```typescript
// app/api/copilotkit/route.ts
const runtime = new CopilotRuntime({
  agents: {
    'prodmentor_workflow': new LangGraphAgent({
      deploymentUrl: "http://localhost:80/api/agents",
      graphId: 'prodmentor_workflow',
    }),
    'research_agent': new LangGraphAgent({
      deploymentUrl: "http://localhost:80/api/agents",
      graphId: 'research_workflow',
    })
  },
});
```

---

## 🚀 Ejemplo Completo de Integración

```typescript
// app/page.tsx
"use client";

import { useCoAgent, useCoAgentStateRender, useCopilotAction } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import { 
  ChainOfThought, 
  ChainOfThoughtHeader, 
  ChainOfThoughtContent,
  ChainOfThoughtStep 
} from "@/components/ai-elements/chain-of-thought";
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Loader } from "@/components/ai-elements/loader";

type ProdMentorState = {
  currentStep?: string;
  analysis?: string;
  suggestions?: string[];
  progress?: number;
  thinking?: string[];
};

export default function Page() {
  // Acceso al estado del agente
  const { state, running } = useCoAgent<ProdMentorState>({
    name: "prodmentor_workflow",
  });

  // Renderizado en el chat
  useCoAgentStateRender<ProdMentorState>({
    name: "prodmentor_workflow",
    render: ({ state, nodeName, running }) => {
      if (!running) return null;
      
      return (
        <ChainOfThought defaultOpen={true}>
          <ChainOfThoughtHeader>
            Proceso de Mentoría - {nodeName}
          </ChainOfThoughtHeader>
          <ChainOfThoughtContent>
            {state.thinking?.map((thought, i) => (
              <ChainOfThoughtStep
                key={i}
                label={thought}
                status={i === state.thinking!.length - 1 ? "active" : "complete"}
              />
            ))}
          </ChainOfThoughtContent>
        </ChainOfThought>
      );
    },
  });

  // Renderizado de tool calls
  useCopilotAction({
    name: "analyze_product",
    available: "disabled",
    render: ({ status, args, result }) => (
      <Tool defaultOpen={status !== "complete"}>
        <ToolHeader 
          title="Análisis de Producto"
          type="tool-call"
          state={status === "executing" ? "input-available" : "output-available"}
        />
        <ToolContent>
          <ToolInput input={args} />
          {result && <ToolOutput output={result} errorText={undefined} />}
        </ToolContent>
      </Tool>
    ),
  });

  return (
    <div className="grid grid-cols-3 gap-4 h-screen p-4">
      {/* Panel de Chat */}
      <div className="col-span-2">
        <CopilotChat
          instructions="Ayúdame a mejorar mi producto con mentoría experta"
          labels={{
            title: "ProdMentor AI",
            initial: "¡Hola! Cuéntame sobre tu producto para comenzar."
          }}
        />
      </div>
      
      {/* Panel de Estado */}
      <div className="space-y-4 overflow-auto">
        <div className="p-4 border rounded-lg bg-card">
          <h3 className="font-bold mb-2">Estado del Agente</h3>
          {running && (
            <div className="flex items-center gap-2 mb-4">
              <Loader className="size-4" />
              <span className="text-sm">Procesando...</span>
            </div>
          )}
          
          {state.progress !== undefined && (
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Progreso</span>
                <span>{state.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${state.progress}%` }}
                />
              </div>
            </div>
          )}
          
          {state.currentStep && (
            <div className="mb-4">
              <p className="text-sm font-medium">Paso Actual:</p>
              <p className="text-sm text-muted-foreground">{state.currentStep}</p>
            </div>
          )}
          
          {state.suggestions && state.suggestions.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Sugerencias:</p>
              <ul className="space-y-1">
                {state.suggestions.map((suggestion, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    • {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {/* Debug Panel */}
        <details className="p-4 border rounded-lg bg-muted">
          <summary className="cursor-pointer font-medium">
            Debug Info
          </summary>
          <pre className="text-xs mt-2 overflow-auto">
            {JSON.stringify(state, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
```

---

## 📚 Recursos Adicionales

### Documentación Oficial
- [CopilotKit LangGraph Integration](https://docs.copilotkit.ai/langgraph)
- [LangGraph Platform Docs](https://langchain-ai.github.io/langgraph/concepts/langgraph_platform)
- [CopilotKit Generative UI](https://docs.copilotkit.ai/langgraph/generative-ui)

### Ejemplos en GitHub
- [CopilotKit AI Travel App](https://github.com/CopilotKit/CopilotKit/tree/main/examples/coagents-travel)
- [CopilotKit Starter Template](https://github.com/CopilotKit/CopilotKit/tree/main/examples/coagents-starter)

### APIs Principales
- `useCoAgent` - Acceso al estado del agente
- `useCoAgentStateRender` - Renderizado en el chat
- `useCopilotAction` - Renderizado de tool calls
- `useLangGraphInterruptRender` - Human-in-the-loop

---

## ✅ Checklist de Implementación

- [ ] Configurar variables de entorno
- [ ] Actualizar endpoint de CopilotKit con LangGraphAgent
- [ ] Definir tipos TypeScript para el estado del agente
- [ ] Implementar `useCoAgentStateRender` para streaming en el chat
- [ ] Agregar renderizado de tool calls con `useCopilotAction`
- [ ] Crear panel lateral con estado en tiempo real usando `useCoAgent`
- [ ] Configurar agente LangGraph para emitir estados intermedios
- [ ] Implementar Chain of Thought si es necesario
- [ ] Agregar HITL para pasos que requieren confirmación del usuario
- [ ] Probar el streaming completo end-to-end

---

## 🐛 Troubleshooting Común

### El estado no se actualiza en tiempo real
- Verifica que tu agente LangGraph esté usando un `checkpointer`
- Asegúrate de que los nodos retornen objetos de estado válidos
- Confirma que el `graphId` coincida con el nombre del grafo en LangGraph

### Tool calls no se renderizan
- El nombre en `useCopilotAction` debe coincidir exactamente con el nombre del tool en LangGraph
- Usa `available: "disabled"` si solo quieres renderizar sin permitir llamadas desde el frontend

### Problemas de conexión con LangGraph Platform
- Verifica que `deploymentUrl` apunte al endpoint correcto
- Si usas Docker, asegúrate de que los puertos estén correctamente expuestos
- Revisa los logs del servidor LangGraph Platform

---

**Fecha de creación:** 2025-01-12
**Versión de CopilotKit:** 1.10.6
**Autor:** Investigación técnica para proyecto testing-copilotkit
