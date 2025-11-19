# Thread Persistence y Tool Calls

## Problema

Cuando cargas un thread existente con mensajes históricos, las tool calls **NO se renderizan automáticamente** porque:

1. Los hooks `useCopilotAction` solo generan `generativeUI` para mensajes nuevos en tiempo real
2. Los mensajes históricos tienen `toolCalls` pero no tienen `generativeUI`
3. Sin `generativeUI`, no hay nada que mostrar visualmente

## Solución Implementada

### 1. Función Helper para Renderizar

```tsx
const renderToolCall = (toolCall: any) => {
  const { name, args } = toolCall.function || toolCall;
  const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
  
  switch (name) {
    case "call_agent_web_research":
      return <WebResearchCard {...parsedArgs} />;
    case "call_agent_knowledge_research":
      return <KnowledgeResearchCard {...parsedArgs} />;
    case "retrive_research":
      return <RetriveResearchCard {...parsedArgs} />;
    default:
      return null;
  }
};
```

### 2. Renderizado Condicional

```tsx
{messages.map((message) => (
  <Message key={message.id}>
    <MessageContent>
      {message.content}
      
      {/* Mensajes NUEVOS - usar generativeUI */}
      {message.generativeUI?.()}
      
      {/* Mensajes HISTÓRICOS - renderizar manualmente */}
      {!message.generativeUI && message.toolCalls && (
        <div className="space-y-2 mt-2">
          {message.toolCalls.map((toolCall) => renderToolCall(toolCall))}
        </div>
      )}
    </MessageContent>
  </Message>
))}
```

## Flujo de Trabajo

### Mensaje Nuevo (Tiempo Real)
```
Usuario envía mensaje
    ↓
Agente llama tool "call_agent_web_research"
    ↓
useCopilotAction detecta el nombre
    ↓
Genera generativeUI con render()
    ↓
message.generativeUI?.() renderiza el componente
```

### Mensaje Histórico (Thread Load)
```
Cargar thread existente
    ↓
Mensajes tienen toolCalls pero NO generativeUI
    ↓
Detectar: !message.generativeUI && message.toolCalls
    ↓
renderToolCall(toolCall) basado en nombre
    ↓
Renderizar componente manualmente
```

## Ventajas de esta Implementación

✅ **Doble cobertura**: Funciona tanto para mensajes nuevos como históricos  
✅ **Sin duplicación**: La condición `!message.generativeUI` previene renders duplicados  
✅ **Consistencia visual**: Mismos estilos para nuevos e históricos  
✅ **Fácil mantenimiento**: Un solo lugar para agregar nuevas tools  
✅ **Debugging incorporado**: Logs para identificar mensajes históricos

## Estructura de Datos

### message.toolCalls (LangGraph)

```typescript
[
  {
    id: "call_abc123",
    type: "function",
    function: {
      name: "call_agent_web_research",
      arguments: '{"query":"React best practices","research_id":"xyz789"}'
    }
  }
]
```

### Después del Parseo

```typescript
{
  name: "call_agent_web_research",
  args: {
    query: "React best practices",
    research_id: "xyz789"
  }
}
```

## Debugging

### Console Logs Automáticos

El componente ya incluye logs:

```typescript
useEffect(() => {
  console.log("=== Messages Debug ===");
  messages.forEach((msg, idx) => {
    if (msg.toolCalls) {
      console.log(`Message ${idx} has toolCalls:`, msg.toolCalls);
      console.log(`Has generativeUI:`, !!msg.generativeUI);
    }
  });
}, [messages]);
```

### Ejemplo de Output

```
=== Messages Debug ===
Message 0 has toolCalls: [{id: "call_123", ...}]
Has generativeUI: false
Message 2 has toolCalls: [{id: "call_456", ...}]
Has generativeUI: true
======================
```

- **Mensaje 0**: Histórico → se renderiza manualmente
- **Mensaje 2**: Nuevo → usa generativeUI

## Agregar Nueva Tool

Para agregar soporte a una nueva tool:

```tsx
const renderToolCall = (toolCall: any) => {
  // ... código existente ...
  
  switch (name) {
    // ... casos existentes ...
    
    case "nueva_tool":  // ← Agregar aquí
      return (
        <div className="my-2 p-3 border rounded-lg">
          <Badge>Nueva Tool</Badge>
          {parsedArgs.param1 && <p>{parsedArgs.param1}</p>}
        </div>
      );
    
    default:
      return null;
  }
};
```

## Consideraciones Importantes

### ⚠️ Parseo de Argumentos

Siempre verificar el tipo antes de parsear:

```tsx
const parsedArgs = typeof args === 'string' 
  ? JSON.parse(args)  // LangGraph envía como string
  : args;              // Algunos frameworks envían como objeto
```

### ⚠️ Estado "Complete"

Los mensajes históricos siempre muestran estado "complete" porque ya fueron ejecutados:

```tsx
<Badge variant="secondary" className="bg-green-100 text-green-800">
  ✓ Completado
</Badge>
```

### ⚠️ Nombres de Propiedades

Los nombres de propiedades en `parsedArgs` deben coincidir **exactamente** con los del backend:

```python
# Backend
@tool
def call_agent_web_research(request: str, tool_call_id: str):
    ...
```

```tsx
// Frontend - debe usar "request" NO "query"
parsedArgs.request  // ✓ Correcto
parsedArgs.query    // ✗ Incorrecto
```

## Testing

### Caso 1: Thread Nuevo
1. Enviar mensaje que dispare tool calls
2. Verificar que se renderizan con `generativeUI`
3. Console debe mostrar `Has generativeUI: true`

### Caso 2: Thread Histórico
1. Recargar página con thread existente
2. Tool calls deben aparecer inmediatamente
3. Console debe mostrar `Has generativeUI: false`

### Caso 3: Ambos en un Thread
1. Cargar thread histórico
2. Enviar nuevo mensaje con tool call
3. Históricos: render manual, Nuevos: generativeUI
4. Sin duplicación visual

## Referencias

- [Implementación en Chat.tsx](../components/testing/Chat.tsx#L54-L129)
- [Documentación completa](./tool-calls-rendering.md)
- [CopilotKit Headless UI](https://docs.copilotkit.ai/premium/headless-ui)
