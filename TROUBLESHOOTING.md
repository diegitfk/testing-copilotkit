# 🔧 Troubleshooting & FAQ - CopilotKit + LangGraph Platform

## 🚨 Problemas Comunes y Soluciones

### 1. El estado del agente no se actualiza en tiempo real

**Síntomas:**
- `useCoAgent` retorna estado vacío o desactualizado
- `useCoAgentStateRender` no se ejecuta cuando el agente procesa

**Soluciones:**

#### A. Verificar que el agente usa un checkpointer
```python
# ❌ INCORRECTO - Sin checkpointer
from langgraph.graph import StateGraph

workflow = StateGraph(MyState)
# ... agregar nodos
app = workflow.compile()  # Sin persistencia

# ✅ CORRECTO - Con checkpointer
from langgraph.checkpoint.memory import MemorySaver

workflow = StateGraph(MyState)
# ... agregar nodos
memory = MemorySaver()
app = workflow.compile(checkpointer=memory)  # Con persistencia
```

#### B. Verificar que los nodos retornan estado válido
```python
# ❌ INCORRECTO - Modificar state directamente
async def my_node(state: MyState):
    state["field"] = "value"  # Esto no funciona
    return state

# ✅ CORRECTO - Retornar nuevo estado
async def my_node(state: MyState):
    return {
        "field": "value",
        "anotherField": "another value"
    }
```

#### C. Verificar el nombre del agente
```typescript
// El nombre debe coincidir exactamente
// Backend (route.ts)
const runtime = new CopilotRuntime({
  agents: {
    'prodmentor_workflow': new LangGraphAgent({ ... })
    //  ↑ Este nombre debe coincidir ↓
  },
});

// Frontend (page.tsx)
useCoAgent<State>({
  name: "prodmentor_workflow"  // ← Mismo nombre exacto
});
```

---

### 2. Tool calls no se renderizan

**Síntomas:**
- `useCopilotAction` con `render` no muestra nada
- Las herramientas se ejecutan pero no aparece UI personalizada

**Soluciones:**

#### A. Verificar que el nombre coincide
```typescript
// El nombre del tool en Python debe coincidir EXACTAMENTE
// Backend Python
@tool
def analyze_product(product: str):
    """Analizar producto"""
    return analysis

// Frontend TypeScript
useCopilotAction({
  name: "analyze_product",  // ← Mismo nombre exacto
  available: "disabled",
  render: ({ status, args, result }) => { ... }
});
```

#### B. Usar `available: "disabled"` para solo renderizar
```typescript
// ❌ INCORRECTO - Permite llamadas desde UI
useCopilotAction({
  name: "analyze_product",
  handler: () => "...",  // El frontend puede llamar esto
  render: ({ ... }) => { ... }
});

// ✅ CORRECTO - Solo renderiza llamadas del agente
useCopilotAction({
  name: "analyze_product",
  available: "disabled",  // No permite llamadas desde UI
  render: ({ ... }) => { ... }
});
```

#### C. Verificar el estado del tool
```typescript
useCopilotAction({
  name: "my_tool",
  available: "disabled",
  render: ({ status, args, result }) => {
    console.log("Tool status:", status);  // Debug
    console.log("Tool args:", args);      // Debug
    console.log("Tool result:", result);  // Debug
    
    // Asegurarse de retornar JSX válido
    return <div>Tool renderizado</div>;
  }
});
```

---

### 3. Error de conexión con LangGraph Platform

**Síntomas:**
- `Error: Failed to connect to LangGraph Platform`
- `ECONNREFUSED localhost:80`
- Timeout al hacer requests

**Soluciones:**

#### A. Verificar que LangGraph Platform está ejecutándose
```bash
# Verificar si el servidor está corriendo
curl http://localhost:80/api/agents
# Debería retornar lista de agentes disponibles

# O verificar con docker
docker ps | grep langgraph
```

#### B. Verificar la URL de deployment
```typescript
// .env.local
LANGGRAPH_DEPLOYMENT_URL=http://localhost:80/api/agents

// Si usas Docker en Mac/Windows, puede ser:
LANGGRAPH_DEPLOYMENT_URL=http://host.docker.internal:80/api/agents

// Si está en producción:
LANGGRAPH_DEPLOYMENT_URL=https://tu-deployment.langgraph.cloud/api/agents
```

#### C. Verificar puertos expuestos (Docker)
```yaml
# docker-compose.yml
services:
  langgraph:
    image: your-langgraph-image
    ports:
      - "80:8000"  # Exponer puerto correcto
    environment:
      - PORT=8000
```

---

### 4. Errores de tipos TypeScript

**Síntomas:**
- `Property 'X' does not exist on type 'State'`
- El estado parece tener campos pero TypeScript no los reconoce

**Soluciones:**

#### A. Definir tipos consistentes
```typescript
// ✅ CORRECTO - Tipo explícito
type MyAgentState = {
  field1: string;
  field2?: number;  // Opcional
  field3: string[];
};

useCoAgent<MyAgentState>({
  name: "my_agent"
});

useCoAgentStateRender<MyAgentState>({
  name: "my_agent",
  render: ({ state }) => {
    // TypeScript sabe que state.field1 existe
    return <div>{state.field1}</div>;
  }
});
```

#### B. Hacer campos opcionales si no siempre están presentes
```typescript
type AgentState = {
  // ❌ INCORRECTO - Campo requerido que puede no existir
  currentStep: string;
  
  // ✅ CORRECTO - Campo opcional
  currentStep?: string;
};
```

#### C. Usar type guards para campos complejos
```typescript
type AgentState = {
  recommendations?: Array<{
    title: string;
    priority: string;
  }>;
};

useCoAgentStateRender<AgentState>({
  name: "my_agent",
  render: ({ state }) => {
    // ✅ Type guard
    if (!state.recommendations?.length) {
      return null;
    }
    
    return (
      <div>
        {state.recommendations.map((rec, i) => (
          <div key={i}>{rec.title}</div>
        ))}
      </div>
    );
  }
});
```

---

### 5. Streaming muy lento o intermitente

**Síntomas:**
- Actualizaciones del estado tardan varios segundos
- El UI se congela durante el streaming
- Eventos de streaming se pierden

**Soluciones:**

#### A. Optimizar tamaño del estado
```python
# ❌ INCORRECTO - Retornar todo el estado siempre
async def my_node(state: MyState):
    return {
        "messages": state["messages"],  # Lista grande
        "field1": "value1",
        "field2": "value2",
        # ... muchos campos
    }

# ✅ CORRECTO - Retornar solo cambios
async def my_node(state: MyState):
    return {
        "currentStep": "Procesando...",
        "progress": 50
        # Solo los campos que cambiaron
    }
```

#### B. Usar React.memo para componentes pesados
```typescript
import { memo } from "react";

// ✅ Memorizar componente de renderizado
const HeavyStateRender = memo(({ state }: { state: AgentState }) => {
  return (
    <div>
      {/* Renderizado complejo */}
    </div>
  );
});

useCoAgentStateRender<AgentState>({
  name: "my_agent",
  render: ({ state }) => <HeavyStateRender state={state} />
});
```

#### C. Debounce de actualizaciones rápidas
```typescript
import { useMemo } from "react";
import debounce from "lodash/debounce";

function MyComponent() {
  const { state } = useCoAgent<AgentState>({
    name: "my_agent"
  });
  
  // Debounce actualizaciones cada 200ms
  const debouncedState = useMemo(
    () => debounce((s: AgentState) => {
      // Procesar estado
    }, 200),
    []
  );
  
  useEffect(() => {
    if (state) {
      debouncedState(state);
    }
  }, [state]);
  
  // ...
}
```

---

### 6. Error: "Cannot read property 'X' of undefined"

**Síntomas:**
- Error al intentar acceder a propiedades del estado
- El componente crashea cuando el agente empieza a ejecutarse

**Soluciones:**

#### A. Usar optional chaining
```typescript
// ❌ INCORRECTO - Puede crashear
useCoAgentStateRender({
  name: "my_agent",
  render: ({ state }) => {
    return <div>{state.field.nested.value}</div>;
  }
});

// ✅ CORRECTO - Safe access
useCoAgentStateRender({
  name: "my_agent",
  render: ({ state }) => {
    return <div>{state?.field?.nested?.value ?? "N/A"}</div>;
  }
});
```

#### B. Validar existencia antes de renderizar
```typescript
useCoAgentStateRender({
  name: "my_agent",
  render: ({ state }) => {
    // ✅ Early return si no hay datos
    if (!state || !state.field) {
      return null;
    }
    
    return <div>{state.field.value}</div>;
  }
});
```

---

### 7. Timeout en serverless (Vercel, AWS Lambda)

**Síntomas:**
- `Function timeout after 10s`
- Streaming se corta antes de completarse
- Solo funciona localmente, no en producción

**Soluciones:**

#### A. Aumentar timeout en Vercel
```json
// vercel.json
{
  "functions": {
    "app/api/copilotkit/route.ts": {
      "maxDuration": 60
    }
  }
}
```

#### B. Usar Copilot Cloud (recomendado)
```typescript
// app/layout.tsx
<CopilotKit
  publicApiKey={process.env.NEXT_PUBLIC_CPK_PUBLIC_API_KEY}
  // No necesitas runtimeUrl, Copilot Cloud maneja todo
>
  {children}
</CopilotKit>
```

#### C. Dividir procesamiento en chunks más pequeños
```python
# En tu agente LangGraph
async def long_process_node(state: MyState):
    # ❌ INCORRECTO - Todo de una vez
    result = await process_everything()
    
    # ✅ CORRECTO - En chunks con yields
    for i, chunk in enumerate(chunks):
        result = await process_chunk(chunk)
        # Actualizar estado frecuentemente
        yield {
            "progress": (i + 1) / len(chunks) * 100,
            "currentChunk": i + 1
        }
```

---

## 📚 FAQ

### ¿Puedo usar múltiples agentes simultáneamente?

Sí, puedes registrar múltiples agentes:

```typescript
const runtime = new CopilotRuntime({
  agents: {
    'agent1': new LangGraphAgent({ ... }),
    'agent2': new LangGraphAgent({ ... }),
  },
});

// En el frontend
useCoAgent<State1>({ name: "agent1" });
useCoAgent<State2>({ name: "agent2" });
```

### ¿Cómo manejo errores del agente?

```typescript
type AgentState = {
  error?: string;
};

useCoAgentStateRender<AgentState>({
  name: "my_agent",
  render: ({ state }) => {
    if (state?.error) {
      return (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      );
    }
    // ... renderizado normal
  }
});
```

### ¿Puedo pausar/cancelar la ejecución del agente?

CopilotKit no tiene API directa para esto, pero puedes:

1. Implementar Human-in-the-Loop con `interrupt()`
2. Usar flags en el estado para controlar el flujo
3. Cerrar el thread desde el backend si es necesario

### ¿Cómo debug el streaming?

```typescript
useCoAgent<AgentState>({
  name: "my_agent",
  onStateChange: (newState) => {
    console.log("Estado actualizado:", newState);
  }
});

// O en useCoAgentStateRender
useCoAgentStateRender<AgentState>({
  name: "my_agent",
  render: ({ state, nodeName }) => {
    console.log("Renderizando nodo:", nodeName);
    console.log("Estado actual:", state);
    return <div>...</div>;
  }
});
```

### ¿Funciona con otros frameworks además de LangGraph?

Sí, CopilotKit soporta:
- LangGraph (Python y JS)
- Mastra
- Pydantic AI
- Google ADK
- Agno
- LlamaIndex
- CrewAI
- AutoGen2

Pero este documento se enfoca en LangGraph Platform.

### ¿Necesito Copilot Cloud para que funcione?

No, puedes hacer self-hosting completo. Copilot Cloud es opcional pero ofrece:
- Sin problemas de timeout en serverless
- Mejor observabilidad
- Features premium (headless UI, etc.)
- Free tier disponible

---

## 🎯 Checklist de Verificación

Antes de reportar un problema, verifica:

- [ ] El servidor LangGraph Platform está ejecutándose
- [ ] `LANGGRAPH_DEPLOYMENT_URL` apunta al endpoint correcto
- [ ] El agente usa `checkpointer` (MemorySaver u otro)
- [ ] Los nombres de agentes/tools coinciden exactamente entre frontend y backend
- [ ] Los tipos TypeScript están correctamente definidos
- [ ] Estás usando optional chaining (`?.`) para acceder a campos opcionales
- [ ] Los componentes AI Elements están correctamente importados
- [ ] Las variables de entorno están cargadas (`.env.local`)
- [ ] El puerto no está siendo usado por otro proceso
- [ ] Las versiones de paquetes son compatibles

---

## 🔗 Enlaces Útiles

- [CopilotKit Docs](https://docs.copilotkit.ai)
- [LangGraph Platform Docs](https://langchain-ai.github.io/langgraph/concepts/langgraph_platform)
- [CopilotKit GitHub Issues](https://github.com/CopilotKit/CopilotKit/issues)
- [LangGraph GitHub](https://github.com/langchain-ai/langgraph)
- [Discord de CopilotKit](https://discord.gg/copilotkit)

---

## 📝 Reportar Problemas

Si ninguna solución funcionó, reporta el problema con:

1. **Descripción clara** del problema
2. **Código relevante** (frontend y backend)
3. **Mensajes de error** completos
4. **Versiones** de paquetes (`package.json` y `requirements.txt`)
5. **Pasos para reproducir** el problema
6. **Lo que ya intentaste** de este documento

Lugar para reportar:
- GitHub Issues: https://github.com/CopilotKit/CopilotKit/issues
- Discord: https://discord.gg/copilotkit
