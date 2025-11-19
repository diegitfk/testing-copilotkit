# Renderizado de Tool Calls en CopilotKit

## ¿Qué son las Tool Calls?

Las **tool calls** son llamadas que el agente de IA realiza a herramientas específicas durante su ejecución. En nuestro caso, el agente `prodmentor_workflow` llama a herramientas del backend como:

- `call_agent_web_research`: Para realizar búsquedas en internet
- `call_agent_knowledge_research`: Para buscar en la base de conocimiento
- `retrive_research`: Para recuperar resultados de investigaciones ya completadas

## ¿Por qué renderizar Tool Calls?

Renderizar las tool calls en la UI permite:

1. **Transparencia**: El usuario ve qué está haciendo el agente en tiempo real
2. **Feedback visual**: Indicadores de progreso mientras se ejecutan las herramientas
3. **Debug**: Facilita identificar qué herramientas se están usando y con qué parámetros
4. **Mejor UX**: El usuario no se queda sin saber qué está pasando durante esperas largas

## Hook: `useCopilotAction` con `render`

### Sintaxis Básica

```tsx
import { useCopilotAction } from "@copilotkit/react-core";

useCopilotAction({
  name: "nombre_de_la_tool",           // Debe coincidir con el nombre en el backend
  description: "Descripción",           // Para documentación
  available: "disabled",                // "disabled" = solo renderizado, no ejecutable desde frontend
  parameters: [                         // Parámetros que recibe la tool
    {
      name: "param1",
      type: "string",
      description: "Descripción del parámetro"
    }
  ],
  render: ({ status, args, result }) => {
    // Retorna JSX para renderizar la tool call
    return <div>...</div>;
  }
});
```

### Propiedades del Hook

#### 1. `name` (requerido)
- **Tipo**: `string`
- **Descripción**: Nombre de la herramienta. **DEBE** coincidir exactamente con el nombre de la tool en el backend.
- **Ejemplo**: `"call_agent_web_research"`

#### 2. `available`
- **Tipo**: `"enabled" | "disabled" | "remote"`
- **Descripción**: 
  - `"disabled"`: Solo renderizado, no ejecutable
  - `"enabled"`: Puede ser llamada desde el frontend
  - `"remote"`: Solo disponible para agentes remotos
- **Recomendación**: Usar `"disabled"` cuando solo queremos visualizar tool calls del backend

#### 3. `parameters`
- **Tipo**: Array de objetos con `name`, `type`, `description`
- **Descripción**: Define los parámetros que la tool espera recibir
- **Importante**: Los tipos deben coincidir con los del backend

#### 4. `render`
- **Tipo**: Función que retorna JSX
- **Props disponibles**:
  - `status`: Estado actual de la tool call
    - `"inProgress"`: Argumentos están siendo streameados
    - `"executing"`: La herramienta se está ejecutando
    - `"complete"`: Ejecución completada
  - `args`: Argumentos pasados a la tool (pueden estar incompletos en `inProgress`)
  - `result`: Resultado de la ejecución (solo disponible en `complete`)

## Implementación en el Chat

### Web Research Tool

```tsx
useCopilotAction({
  name: "call_agent_web_research",
  available: "disabled",
  parameters: [
    { name: "research_id", type: "string", description: "ID de la investigación" },
    { name: "query", type: "string", description: "Query de búsqueda" }
  ],
  render: ({ status, args }) => (
    <div className="my-2 p-3 border border-blue-300 bg-blue-50 rounded-lg">
      <div className="flex items-center gap-2">
        <span>🌐</span>
        <Badge>Web Research</Badge>
        {status === "inProgress" && (
          <Badge className="animate-pulse">Investigando...</Badge>
        )}
        {status === "complete" && (
          <Badge>✓ Completado</Badge>
        )}
      </div>
      {args.query && <p>Query: {args.query}</p>}
      {args.research_id && <p>ID: {args.research_id.substring(0, 16)}...</p>}
    </div>
  ),
});
```

### Knowledge Research Tool

```tsx
useCopilotAction({
  name: "call_agent_knowledge_research",
  available: "disabled",
  parameters: [
    { name: "research_id", type: "string", description: "ID de la investigación" },
    { name: "query", type: "string", description: "Query de búsqueda" }
  ],
  render: ({ status, args }) => (
    <div className="my-2 p-3 border border-purple-300 bg-purple-50 rounded-lg">
      <div className="flex items-center gap-2">
        <span>📚</span>
        <Badge>Knowledge Research</Badge>
        {status === "inProgress" && (
          <Badge className="animate-pulse">Buscando...</Badge>
        )}
        {status === "complete" && (
          <Badge>✓ Completado</Badge>
        )}
      </div>
      {args.query && <p>Query: {args.query}</p>}
      {args.research_id && <p>ID: {args.research_id.substring(0, 16)}...</p>}
    </div>
  ),
});
```

### Retrive Research Tool

```tsx
useCopilotAction({
  name: "retrive_research",
  available: "disabled",
  parameters: [
    { name: "id_research", type: "string", description: "ID de la investigación a recuperar" }
  ],
  render: ({ status, args, result }) => (
    <div className="my-2 p-3 border border-amber-300 bg-amber-50 rounded-lg">
      <div className="flex items-center gap-2">
        <span>🔍</span>
        <Badge variant="outline">Recuperando Investigación</Badge>
        {status === "inProgress" && (
          <Badge className="animate-pulse">Consultando...</Badge>
        )}
        {status === "executing" && (
          <Badge className="animate-pulse">Recuperando datos...</Badge>
        )}
        {status === "complete" && (
          <Badge>✓ Datos recuperados</Badge>
        )}
      </div>
      {args.id_research && (
        <div>
          <p>Research ID: {args.id_research.substring(0, 24)}...</p>
          {status === "complete" && result && (
            <div className="mt-2 pt-2 border-t">
              <p>Tipo: {result.type_research === "web" ? "🌐 Web" : "📚 Knowledge"}</p>
              {result.agent_name && <p>Agente: {result.agent_name}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  ),
});
```

## Uso del Resultado (`result`)

La tool `retrive_research` es especial porque **retorna datos** que pueden ser mostrados:

```tsx
render: ({ status, args, result }) => {
  // result solo está disponible cuando status === "complete"
  if (status === "complete" && result) {
    return (
      <div>
        <p>Tipo: {result.type_research}</p>
        <p>Agente: {result.agent_name}</p>
        <p>Content: {result.research_content}</p>
        {result.citations?.map(citation => (
          <a href={citation}>{citation}</a>
        ))}
      </div>
    );
  }
  return <LoadingIndicator />;
}
```

### Estructura del resultado en `retrive_research`:

```typescript
{
  agent_name: string;
  type_research: "web" | "knowledge";
  research_content: string;
  citations: string[];
  main_ideas: string[];
}
```

## Cómo se Renderiza

### Mensajes Nuevos (Tiempo Real)

1. **Integración Automática**: CopilotKit detecta automáticamente cuando el backend llama a una herramienta
2. **Matching por Nombre**: Busca un hook `useCopilotAction` con el mismo nombre
3. **Renderizado en el Chat**: El componente renderizado aparece en el flujo del chat como parte del mensaje del asistente
4. **Generative UI**: Se accede mediante `message.generativeUI?.()` en el mensaje

### Mensajes Históricos (Thread Persistence)

**Problema**: Cuando cargas mensajes de un thread existente (persistidos), `message.generativeUI` no existe porque los hooks `useCopilotAction` solo generan UI para mensajes en tiempo real.

**Solución**: Renderizar manualmente los `toolCalls` desde los datos del mensaje.

#### Implementación

```tsx
// 1. Crear función helper para renderizar tool calls
const renderToolCall = (toolCall: any) => {
  const { name, args } = toolCall.function || toolCall;
  const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
  
  switch (name) {
    case "call_agent_web_research":
      return (
        <div className="my-2 p-3 border border-blue-300 bg-blue-50 rounded-lg">
          <Badge>Web Research</Badge>
          <Badge>✓ Completado</Badge>
          {parsedArgs.query && <p>Query: {parsedArgs.query}</p>}
        </div>
      );
    // ... más casos
    default:
      return null;
  }
};

// 2. Usar en el renderizado de mensajes
{messages.map((message) => (
  <Message key={message.id}>
    <MessageContent>
      {message.content}
      
      {/* Renderizar generativeUI si existe (mensajes nuevos) */}
      {message.generativeUI?.()}
      
      {/* Renderizar tool calls manualmente (mensajes históricos) */}
      {!message.generativeUI && message.toolCalls && (
        <div>
          {message.toolCalls.map((toolCall) => renderToolCall(toolCall))}
        </div>
      )}
    </MessageContent>
  </Message>
))}
```

#### Estructura de `message.toolCalls`

```typescript
{
  id: string;
  type: "function";
  function: {
    name: string;           // Nombre de la tool
    arguments: string;      // JSON string con los argumentos
  }
}
```

#### Flujo Completo

```
┌─────────────────────────────────────────────────────┐
│ 1. Usuario carga thread existente                   │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 2. Mensajes históricos tienen toolCalls             │
│    pero NO tienen generativeUI                       │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 3. Detectar: !message.generativeUI &&               │
│              message.toolCalls                       │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 4. renderToolCall(toolCall) genera JSX              │
│    usando el nombre de la tool                       │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 5. Tool calls se muestran visualmente               │
│    como si fueran nuevos                             │
└─────────────────────────────────────────────────────┘
```

### En el código del Chat

```tsx
{messages.map((message) => (
  <Message key={message.id} from={message.role}>
    <MessageContent>
      {message.content}
      
      {/* Renderizar generative UI (incluye tool calls) */}
      {message.role === "assistant" && message.generativeUI?.()}
    </MessageContent>
  </Message>
))}
```

## Mejores Prácticas

### 1. Estados Visuales Claros
```tsx
{status === "inProgress" && (
  <Badge className="animate-pulse">
    <Loader className="size-3 mr-1" />
    Procesando...
  </Badge>
)}
{status === "executing" && (
  <Badge>🔄 Ejecutando...</Badge>
)}
{status === "complete" && (
  <Badge className="bg-green-100">✓ Completado</Badge>
)}
```

### 2. Información Contextual
- Mostrar argumentos relevantes para el usuario
- Usar truncado para IDs largos
- Incluir iconos para identificación rápida

### 3. Diseño Consistente
- Usar colores distintos para diferentes tipos de tools
- Mantener padding y espaciado consistentes
- Usar badges para estados

### 4. Responsive y Accesible
- Asegurar que funcione en móvil
- Usar semántica HTML apropiada
- Incluir loading indicators para accesibilidad

## Hooks Nuevos (CopilotKit v1.50+)

CopilotKit está deprecando `useCopilotAction` en favor de hooks más especializados:

### `useRenderToolCall`
Para renderizar tool calls del backend (reemplazo específico para nuestro caso):

```tsx
import { useRenderToolCall } from "@copilotkit/react-core";

useRenderToolCall({
  name: "tool_name",
  render: ({ status, args, result }) => {
    return <div>...</div>;
  }
});
```

### `useFrontendTool`
Para herramientas que se ejecutan en el frontend con handler:

```tsx
import { useFrontendTool } from "@copilotkit/react-core";

useFrontendTool({
  name: "tool_name",
  parameters: [...],
  handler: async (args) => {
    // Lógica de ejecución
    return result;
  },
  render: ({ status, args, result }) => {
    return <div>...</div>;
  }
});
```

### `useHumanInTheLoop`
Para workflows que requieren input del usuario:

```tsx
import { useHumanInTheLoop } from "@copilotkit/react-core";

useHumanInTheLoop({
  name: "confirm_action",
  parameters: [...],
  render: ({ status, args, respond }) => {
    if (status === "executing" && respond) {
      return (
        <div>
          <button onClick={() => respond({ confirmed: true })}>
            Confirmar
          </button>
        </div>
      );
    }
    return null;
  }
});
```

## Debugging

### Ver Tool Calls en Console
```tsx
useEffect(() => {
  console.log("Messages:", messages);
  messages.forEach(msg => {
    if (msg.toolCalls) {
      console.log("Tool calls:", msg.toolCalls);
    }
  });
}, [messages]);
```

### Verificar Mensajes Históricos con Tool Calls
```tsx
useEffect(() => {
  console.log("=== Messages Debug ===");
  messages.forEach((msg, idx) => {
    if (msg.toolCalls) {
      console.log(`Message ${idx} has toolCalls:`, msg.toolCalls);
      console.log(`Has generativeUI:`, !!msg.generativeUI);
      // Si no tiene generativeUI pero tiene toolCalls = mensaje histórico
      if (!msg.generativeUI) {
        console.log(`⚠️ Historical message - will render manually`);
      }
    }
  });
  console.log("======================");
}, [messages]);
```

### Ver Estado del Agente
```tsx
const { state } = useCoAgent({ name: "prodmentor_workflow" });
console.log("Agent state:", state);
```

### Verificar que Tool Call se Renderiza

1. **Cargar thread con historial**
2. **Abrir DevTools Console**
3. **Buscar logs como**:
   ```
   Message 2 has toolCalls: [{...}]
   Has generativeUI: false
   ⚠️ Historical message - will render manually
   ```
4. **Verificar visualmente** que aparece el card de la tool call en el chat

### Troubleshooting Común

#### Tool Call no se renderiza
- **Verificar**: `message.toolCalls` existe en el mensaje
- **Verificar**: El nombre en `toolCall.function.name` coincide con el case en `renderToolCall`
- **Verificar**: Los argumentos se parsean correctamente (puede ser string o objeto)

#### Tool Call se duplica
- **Causa**: Tanto `generativeUI` como `toolCalls` existen
- **Solución**: Ya está manejado con `!message.generativeUI &&`

#### Argumentos no se muestran
- **Verificar**: Parseo correcto de JSON: `typeof args === 'string' ? JSON.parse(args) : args`
- **Verificar**: Nombres de propiedades coinciden con lo que espera el backend

## Referencias

- [CopilotKit Docs - Tool-based Generative UI](https://docs.copilotkit.ai/langgraph/generative-ui/tool-based)
- [CopilotKit Docs - useCopilotAction](https://docs.copilotkit.ai/reference/hooks/useCopilotAction)
- [CopilotKit Docs - useRenderToolCall](https://docs.copilotkit.ai/reference/hooks/useRenderToolCall)
- [CopilotKit Docs - Headless UI](https://docs.copilotkit.ai/premium/headless-ui)
