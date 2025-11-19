# 📚 Aprendizajes: Integración de CopilotKit con LangGraph

Este documento recopila todo el conocimiento adquirido durante el desarrollo de la integración de CopilotKit con LangGraph Platform, incluyendo hooks, patrones de diseño, y mejores prácticas.

---

## 📑 Tabla de Contenidos

1. [Hooks de CopilotKit](#hooks-de-copilotkit)
2. [Integración con LangGraph](#integración-con-langgraph)
3. [Manejo de Estado del Agente](#manejo-de-estado-del-agente)
4. [Persistencia y Threads](#persistencia-y-threads)
5. [Autenticación JWT](#autenticación-jwt)
6. [Renderizado de UI](#renderizado-de-ui)
7. [Mejores Prácticas](#mejores-prácticas)

---

## 🎣 Hooks de CopilotKit

### `useCopilotChatHeadless_c`

Hook principal para crear una interfaz de chat completamente headless (sin UI predefinida).

#### Características:
```tsx
const {
  messages,           // Array de mensajes del chat
  sendMessage,        // Función para enviar mensajes
  isLoading,          // Estado de carga
  stopGeneration,     // Detener generación actual
  reloadMessages,     // Recargar mensaje específico
  deleteMessage,      // Eliminar mensaje
  setMessages,        // Reemplazar todos los mensajes
  suggestions,        // Sugerencias disponibles
  generateSuggestions,// Generar nuevas sugerencias
  interrupt,          // Interrupciones HITL (Human-in-the-Loop)
} = useCopilotChatHeadless_c();
```

#### Ventajas:
- ✅ Control total sobre la UI
- ✅ Personalización completa del diseño
- ✅ Acceso a funcionalidades avanzadas (HITL, suggestions)
- ✅ Integración con sistemas de diseño propios

#### Uso Básico:
```tsx
// Enviar mensaje
sendMessage({
  id: Date.now().toString(),
  role: "user",
  content: "Tu mensaje aquí",
});

// Detener generación
stopGeneration();
```

---

### `useCoAgent`

Hook para acceder al **estado del agente FUERA del chat**.

#### Propósito Principal:
**Renderizar información del agente en cualquier parte de tu UI**, no solo dentro del flujo de mensajes.

#### Uso:
```tsx
const { state, running, agentSession } = useCoAgent<ProdMentorState>({ 
  name: "prodmentor_workflow" 
});

// state contiene el estado completo del agente
// running indica si el agente está procesando
// agentSession contiene metadata de la sesión
```

#### Casos de Uso Ideales:
- 🎯 **Paneles laterales** con información del agente
- 🎯 **Dashboards** con métricas del agente
- 🎯 **Widgets independientes** que muestren el estado
- 🎯 **Indicadores de progreso** personalizados

#### Ejemplo Real (Panel Lateral):
```tsx
export function Chat() {
  const { state } = useCoAgent<ProdMentorState>({ 
    name: "prodmentor_workflow" 
  });
  
  const hasResearchResults = 
    (state.web_research_results && Object.keys(state.web_research_results).length > 0) ||
    (state.knowledge_research_results && Object.keys(state.knowledge_research_results).length > 0);
  
  return (
    <div className="flex h-screen">
      {/* Panel lateral independiente */}
      {hasResearchResults && (
        <div className="w-96 border-r">
          <h2>Resultados de Investigación</h2>
          {/* Renderizar web_research_results */}
          {/* Renderizar knowledge_research_results */}
        </div>
      )}
      
      {/* Chat principal */}
      <div className="flex-1">
        {/* Mensajes del chat */}
      </div>
    </div>
  );
}
```

---

### `useCoAgentStateRender`

Hook para renderizar el **estado del agente DENTRO de los mensajes** del chat.

#### Propósito Principal:
**Insertar UI del estado del agente como parte del flujo de conversación**.

#### Diferencia Clave con `useCoAgent`:
| `useCoAgent` | `useCoAgentStateRender` |
|--------------|-------------------------|
| Renderiza **FUERA** del chat | Renderiza **DENTRO** del chat |
| Panel lateral, widgets, dashboards | Como un mensaje más en la conversación |
| Siempre visible si hay estado | Aparece como parte del flujo de mensajes |

#### Uso:
```tsx
useCoAgentStateRender<ProdMentorState>({
  name: "prodmentor_workflow",
  render: ({ state }) => {
    if (!state) return null;
    
    return (
      <div className="my-4">
        <h3>Estado del Agente</h3>
        {/* Renderizar información del estado */}
      </div>
    );
  },
});
```

#### Cuándo Usar Cada Uno:
- **`useCoAgent`** → Panel lateral, dashboard, indicadores independientes
- **`useCoAgentStateRender`** → Mostrar estado como un mensaje en el chat

---

## 🔗 Integración con LangGraph

### Configuración del Backend

#### 1. Configuración del Runtime (`/api/copilotkit/route.ts`)

```typescript
import { CopilotRuntime, LangGraphAgent, OpenAIAdapter } from "@copilotkit/runtime";
import { Client } from "@langchain/langgraph-sdk";

export async function POST(req: Request) {
  // 1. Extraer headers de autenticación
  const authHeader = req.headers.get("authorization");
  
  // 2. Crear cliente de LangGraph con headers
  const lgClient = new Client({
    apiUrl: "http://localhost:80/api/agents",
    defaultHeaders: authHeader ? { Authorization: authHeader } : {},
  });
  
  // 3. Configurar el agente
  const lgAgent = new LangGraphAgent({
    name: "prodmentor_workflow",
    description: "Agente de análisis de productos",
    client: lgClient,
    graphId: "prodmentor_workflow",
    deploymentUrl: "http://localhost:80/api/agents",
  });
  
  // 4. Configurar OpenAI Adapter para features adicionales
  const openaiAdapter = new OpenAIAdapter();
  
  // 5. Crear runtime
  const runtime = new CopilotRuntime({
    agents: [lgAgent],
  });
  
  // 6. Manejar request
  const { handleRequest } = runtime.forwardOpenAIRequest(
    openaiAdapter,
    req
  );
  
  return handleRequest();
}
```

#### 2. Configuración del Frontend (`/app/layout.tsx`)

```tsx
<CopilotKit
  threadId="3fa85f64-5717-4562-b3fc-2c963f66afa6"
  runtimeUrl="/api/copilotkit"
  publicApiKey={process.env.NEXT_PUBLIC_CPK_PUBLIC_API_KEY}
  agent="prodmentor_workflow"  // ⚠️ IMPORTANTE: Especificar el agente
  headers={{
    Authorization: `Bearer ${CLIENT_JWT}`
  }}
>
  {children}
</CopilotKit>
```

#### ⚠️ Error Común: Olvidar `agent` prop

**Problema:**
```tsx
// ❌ Sin especificar el agente
<CopilotKit runtimeUrl="/api/copilotkit">
  {children}
</CopilotKit>

// Resultado: useCoAgent no puede encontrar el agente
const { state } = useCoAgent({ name: "prodmentor_workflow" });
// state = {} (vacío)
```

**Solución:**
```tsx
// ✅ Especificar el agente correctamente
<CopilotKit 
  runtimeUrl="/api/copilotkit"
  agent="prodmentor_workflow"  // 👈 Esto es crucial
>
  {children}
</CopilotKit>

// Ahora funciona correctamente
const { state } = useCoAgent({ name: "prodmentor_workflow" });
// state = { messages: [...], web_research_results: {...}, ... }
```

---

## 🗂️ Manejo de Estado del Agente

### Estructura del Estado en Python (LangGraph)

```python
from typing import Annotated
from typing_extensions import TypedDict
from langgraph.graph.message import add_messages

class ProdmentorAssistantState(TypedDict):
    messages: Annotated[list, add_messages]
    web_research_results: dict[str, dict]
    knowledge_research_results: dict[str, dict]
```

### Estructura del Estado en TypeScript (Frontend)

```typescript
type ResearchResultItem = {
  agent_name: string;
  type_research: "web" | "knowledge";
  research_content: string;        // Contenido completo (Markdown)
  citations: string[];             // URLs de fuentes
  main_ideas: string[];            // Ideas principales
  [key: string]: any;
};

type ProdMentorState = {
  messages?: Array<{
    role: string;
    content: string;
    id: string;
  }>;
  web_research_results?: {
    [research_id: string]: ResearchResultItem;
  };
  knowledge_research_results?: {
    [research_id: string]: ResearchResultItem;
  };
};
```

### Sincronización de Estado

#### Python → TypeScript
El estado de Python se serializa automáticamente como JSON y llega al frontend:

```python
# Python (Backend)
state = {
    "web_research_results": {
        "uuid-123": {
            "agent_name": "web_research_agent",
            "type_research": "web",
            "research_content": "# Análisis...",
            "citations": ["https://example.com"],
            "main_ideas": ["Idea 1", "Idea 2"]
        }
    }
}
```

```typescript
// TypeScript (Frontend)
const { state } = useCoAgent<ProdMentorState>({ name: "prodmentor_workflow" });

// state.web_research_results contiene exactamente lo mismo que en Python
console.log(state.web_research_results);
// {
//   "uuid-123": {
//     agent_name: "web_research_agent",
//     type_research: "web",
//     research_content: "# Análisis...",
//     citations: ["https://example.com"],
//     main_ideas: ["Idea 1", "Idea 2"]
//   }
// }
```

#### Importante: Tipos Deben Coincidir
Los tipos de TypeScript deben reflejar **exactamente** la estructura que viene de Python.

---

## 🔄 Persistencia y Threads

### Thread ID

El `threadId` identifica una conversación específica y permite cargar el historial de mensajes.

#### Configuración:
```tsx
<CopilotKit
  threadId="3fa85f64-5717-4562-b3fc-2c963f66afa6"  // UUID del thread
  runtimeUrl="/api/copilotkit"
  agent="prodmentor_workflow"
>
  {children}
</CopilotKit>
```

#### Cómo Funciona:
1. El frontend envía el `threadId` en cada request
2. El backend extrae el `threadId` del request body
3. LangGraph usa el `threadId` para:
   - Cargar mensajes previos del thread
   - Cargar el estado guardado del thread
   - Persistir nuevos mensajes y estado

### Persistencia en Python (LangGraph)

```python
from langgraph.checkpoint.postgres import PostgresSaver

# Configurar checkpointer para persistencia
checkpointer = PostgresSaver.from_conn_string(DATABASE_URL)

# Crear el grafo con persistencia
graph = workflow.compile(checkpointer=checkpointer)
```

### Estado Inicial vs Estado Persistido

#### Estado Inicial (Sin persistencia):
```typescript
// Al montar el componente por primera vez
const { state } = useCoAgent({ name: "prodmentor_workflow" });
console.log(state);
// {} (vacío hasta que /api/copilotkit compile)
```

#### Estado Persistido (Con threadId):
```typescript
// Con threadId válido y persistencia activa
const { state } = useCoAgent({ name: "prodmentor_workflow" });
console.log(state);
// {
//   messages: [...],  // Mensajes previos del thread
//   web_research_results: {...},  // Resultados guardados
//   knowledge_research_results: {...}
// }
```

---

## 🔐 Autenticación JWT

### Flujo de Autenticación

```
Frontend → Backend (CopilotKit) → LangGraph Platform
   JWT  →      Forward JWT      →    Validar JWT
```

#### 1. Frontend (`app/layout.tsx`)
```tsx
const CLIENT_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

<CopilotKit
  headers={{
    Authorization: `Bearer ${CLIENT_JWT}`
  }}
>
  {children}
</CopilotKit>
```

#### 2. Backend (`app/api/copilotkit/route.ts`)
```typescript
// Extraer el header de autorización
const authHeader = req.headers.get("authorization");

// Forwarding al cliente de LangGraph
const lgClient = new Client({
  apiUrl: "http://localhost:80/api/agents",
  defaultHeaders: authHeader ? { 
    Authorization: authHeader  // Forward del JWT
  } : {},
});
```

#### 3. LangGraph Platform
- Recibe el JWT
- Valida el token
- Autoriza el acceso al thread y agent

### Errores Comunes de Autenticación

#### Error: 401 Unauthorized
```
HTTP 401: Unauthorized - Token expired or invalid
```

**Causas:**
- JWT expirado
- JWT malformado
- JWT no enviado

**Solución:**
- Generar nuevo JWT válido
- Verificar que se está forwarding correctamente
- Revisar logs de LangGraph Platform

---

## 🎨 Renderizado de UI

### Panel Lateral con `useCoAgent`

```tsx
export function Chat() {
  const { state } = useCoAgent<ProdMentorState>({ 
    name: "prodmentor_workflow" 
  });
  
  const hasResearchResults = 
    (state.web_research_results && Object.keys(state.web_research_results).length > 0);
  
  return (
    <div className="flex h-screen">
      {/* Panel Lateral */}
      {hasResearchResults && (
        <div className="w-96 border-r">
          <ScrollArea className="flex-1 p-4">
            {Object.entries(state.web_research_results).map(([id, result]) => (
              <ResearchCard 
                key={id} 
                id={id} 
                data={result} 
                onClick={() => openModal(id, result)}
              />
            ))}
          </ScrollArea>
        </div>
      )}
      
      {/* Chat Principal */}
      <div className="flex-1">
        {/* Chat UI */}
      </div>
    </div>
  );
}
```

### Modal de Detalle

```tsx
const [selectedResearch, setSelectedResearch] = useState<{
  id: string;
  data: ResearchResultItem;
  type: "web" | "knowledge";
} | null>(null);

// Tarjeta clickeable
<div 
  onClick={() => setSelectedResearch({ id, data: result, type: "web" })}
  className="cursor-pointer hover:shadow-md"
>
  {/* Preview de la investigación */}
</div>

// Modal
<Dialog open={!!selectedResearch} onOpenChange={(open) => !open && setSelectedResearch(null)}>
  <DialogContent className="max-w-4xl">
    {/* Contenido completo de la investigación */}
  </DialogContent>
</Dialog>
```

### Renderizado de Markdown

```tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

<div className="prose prose-sm dark:prose-invert max-w-none">
  <ReactMarkdown remarkPlugins={[remarkGfm]}>
    {research_content}
  </ReactMarkdown>
</div>
```

#### Configuración de Tailwind Typography

```css
/* globals.css */
@plugin "@tailwindcss/typography";

/* Estilos personalizados */
.prose h1 { @apply text-2xl font-bold mb-4 mt-6; }
.prose h2 { @apply text-xl font-bold mb-3 mt-5; }
.prose code { @apply bg-muted px-1 py-0.5 rounded text-sm font-mono; }
```

---

## ✅ Mejores Prácticas

### 1. Siempre Especifica el `agent` Prop
```tsx
// ✅ Correcto
<CopilotKit agent="prodmentor_workflow">

// ❌ Incorrecto (useCoAgent no funcionará)
<CopilotKit>
```

### 2. Tipos Deben Coincidir con Python
```typescript
// TypeScript debe reflejar EXACTAMENTE la estructura de Python
type ResearchResultItem = {
  research_content: string;  // No "content"
  citations: string[];       // No "sources"
  main_ideas: string[];      // No "ideas"
}
```

### 3. Manejo de Estado Asíncrono
```tsx
// Usar useEffect para monitorear cambios de estado
useEffect(() => {
  console.log("Estado actualizado:", state);
}, [state]);
```

### 4. Scroll en Modales
```tsx
// ✅ Usar div con overflow-y-auto
<div className="max-h-[calc(90vh-120px)] overflow-y-auto">
  {/* Contenido */}
</div>

// ❌ No usar ScrollArea sin altura definida
<ScrollArea className="flex-1">  // No funciona correctamente
```

### 5. Forward de Headers
```typescript
// Siempre forward los headers de autorización
const authHeader = req.headers.get("authorization");

const lgClient = new Client({
  defaultHeaders: authHeader ? { Authorization: authHeader } : {},
});
```

### 6. Debugging
```tsx
// Agregar logs para debugging
useEffect(() => {
  console.log("=== Agent State Debug ===");
  console.log("State:", state);
  console.log("Running:", running);
  console.log("========================");
}, [state, running]);
```

---

## 🐛 Errores Comunes y Soluciones

### Error: Estado Vacío en `useCoAgent`

**Problema:**
```typescript
const { state } = useCoAgent({ name: "prodmentor_workflow" });
console.log(state);  // {} vacío
```

**Causa:** Falta el prop `agent` en `<CopilotKit>`

**Solución:**
```tsx
<CopilotKit agent="prodmentor_workflow">
```

---

### Error: Thread ID No Se Envía

**Problema:**
```
[CopilotKit] Thread ID from frontend: Not provided
```

**Causa:** El `threadId` no se extrae del request body

**Solución:**
```typescript
// Backend debe extraer threadId del body
const body = await req.json();
const threadId = body.threadId;
console.log("Thread ID:", threadId);
```

---

### Error: 401 Unauthorized

**Problema:**
```
HTTP 401: Unauthorized from LangGraph
```

**Causa:** JWT expirado o no forwarded

**Solución:**
1. Generar nuevo JWT
2. Verificar forward en backend:
```typescript
const authHeader = req.headers.get("authorization");
const lgClient = new Client({
  defaultHeaders: { Authorization: authHeader }
});
```

---

### Error: Tipos No Coinciden

**Problema:**
```typescript
// TypeScript espera "summary" pero Python envía "research_content"
result.summary  // undefined
```

**Causa:** Desincronización entre tipos de TS y estructura de Python

**Solución:**
- Revisar la estructura exacta que envía Python
- Actualizar tipos de TypeScript para que coincidan

---

## 📝 Checklist de Implementación

### Backend
- [ ] Configurar `LangGraphAgent` con `graphId` y `deploymentUrl`
- [ ] Crear `Client` de LangGraph con headers de auth
- [ ] Forward headers de autorización correctamente
- [ ] Configurar `OpenAIAdapter` para features adicionales
- [ ] Agregar logging para debugging

### Frontend
- [ ] Configurar `<CopilotKit>` con `agent`, `threadId`, y `headers`
- [ ] Definir tipos que coincidan con Python
- [ ] Usar `useCoAgent` para estado fuera del chat
- [ ] Usar `useCoAgentStateRender` para estado dentro del chat
- [ ] Implementar UI responsive y con scroll funcional

### Persistencia
- [ ] Configurar checkpointer en Python
- [ ] Usar `threadId` consistente en frontend
- [ ] Verificar que el estado se carga correctamente

---

## 🎯 Conclusión

Durante este proyecto aprendimos:

1. **Diferencia clave entre hooks:**
   - `useCoAgent` → Estado FUERA del chat (paneles, dashboards)
   - `useCoAgentStateRender` → Estado DENTRO del chat (como mensaje)

2. **Importancia del prop `agent`:**
   - Sin él, `useCoAgent` no puede encontrar el estado del agente

3. **Sincronización de tipos:**
   - TypeScript debe reflejar exactamente la estructura de Python

4. **Forward de autenticación:**
   - Los headers deben propagarse desde frontend → backend → LangGraph

5. **UI patterns:**
   - Paneles laterales para estado persistente
   - Modales para contenido detallado
   - Markdown rendering para contenido rico

Este conocimiento es fundamental para cualquier integración de CopilotKit con LangGraph o agentes personalizados.

---

**Fecha de creación:** 12 de Noviembre, 2025  
**Proyecto:** ProdMentor AI - Integración CopilotKit + LangGraph  
**Stack:** Next.js 16, React 19, CopilotKit 1.10.6, LangGraph SDK 1.0.0
