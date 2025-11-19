# 📖 Referencia API: useCopilotChatHeadless_c

## 🔑 Requisitos Previos

**IMPORTANTE:** `useCopilotChatHeadless_c` es una **feature premium** que requiere un `publicApiKey` gratuito.

```typescript
// app/layout.tsx
import { CopilotKit } from "@copilotkit/react-core";

<CopilotKit publicApiKey={process.env.NEXT_PUBLIC_CPK_PUBLIC_API_KEY}>
  {children}
</CopilotKit>
```

Obtén tu API key gratuita en: https://cloud.copilotkit.ai

---

## 🎯 API Completa

### Tipo de Retorno

```typescript
type UseCopilotChatReturn_c = {
  // 📨 MENSAJES
  messages: Message[];
  sendMessage: (message: Message, options?) => Promise<void>;
  setMessages: (messages: Message[]) => void;
  deleteMessage: (messageId: string) => void;
  
  // 🔄 CONTROL
  reloadMessages: (messageId: string) => Promise<void>;
  stopGeneration: () => void;
  reset: () => void;
  
  // 📊 ESTADO
  isLoading: boolean;
  
  // 💡 SUGERENCIAS
  suggestions: SuggestionItem[];
  setSuggestions: (suggestions: SuggestionItem[]) => void;
  generateSuggestions: () => Promise<void>;
  resetSuggestions: () => void;
  isLoadingSuggestions: boolean;
  
  // 🎭 INTERRUPCIONES (HITL)
  interrupt: string | React.ReactElement | null;
  
  // ⚙️ AVANZADO
  runChatCompletion: () => Promise<Message[]>;
  mcpServers: MCPServerConfig[];
  setMcpServers: (servers: MCPServerConfig[]) => void;
  
  // ⚠️ DEPRECADOS (mantener compatibilidad)
  visibleMessages: DeprecatedGqlMessage[];
  appendMessage: (message: DeprecatedGqlMessage, options?) => Promise<void>;
};
```

---

## 📨 Manejo de Mensajes

### 1. Estructura del Mensaje

```typescript
type Message = {
  id: string;
  role: "user" | "assistant" | "system" | "tool" | "developer";
  content: string;
  
  // Opcionales
  generativeUI?: () => JSX.Element;
  toolCalls?: ToolCall[];
  createdAt?: Date;
};
```

### 2. Enviar Mensajes

```typescript
const { sendMessage } = useCopilotChatHeadless_c();

// ✅ CORRECTO - Formato nuevo
await sendMessage({
  id: Date.now().toString(),
  role: "user",
  content: "Mi mensaje"
});

// ❌ INCORRECTO - No existe método 'append'
// await append(message); // ❌
```

### 3. Leer Mensajes

```typescript
const { messages } = useCopilotChatHeadless_c();

// Los mensajes vienen en formato AG-UI
messages.forEach(msg => {
  console.log(msg.id);       // ID único
  console.log(msg.role);     // "user" | "assistant" | etc
  console.log(msg.content);  // Contenido del mensaje
  
  // Generative UI si existe
  if (msg.generativeUI) {
    const ui = msg.generativeUI();
  }
});
```

### 4. Eliminar Mensajes

```typescript
const { deleteMessage } = useCopilotChatHeadless_c();

// Eliminar por ID
deleteMessage("message-id-123");
```

### 5. Reemplazar Todos los Mensajes

```typescript
const { setMessages } = useCopilotChatHeadless_c();

setMessages([
  { id: "1", role: "user", content: "Hola" },
  { id: "2", role: "assistant", content: "¿Cómo puedo ayudarte?" }
]);
```

---

## 🔄 Control del Chat

### 1. Detener Generación

```typescript
const { stopGeneration, isLoading } = useCopilotChatHeadless_c();

// ✅ CORRECTO
if (isLoading) {
  stopGeneration();
}

// ❌ INCORRECTO - No existe método 'stop'
// stop(); // ❌
```

### 2. Recargar Mensaje

```typescript
const { reloadMessages } = useCopilotChatHeadless_c();

// ✅ CORRECTO - Requiere messageId
await reloadMessages("message-id-123");

// ❌ INCORRECTO - No existe método 'reload' sin parámetros
// await reload(); // ❌
```

### 3. Resetear Chat Completo

```typescript
const { reset } = useCopilotChatHeadless_c();

// Limpia todos los mensajes y estado
reset();
```

---

## 💡 Sugerencias

### 1. Leer Sugerencias

```typescript
const { suggestions } = useCopilotChatHeadless_c();

type SuggestionItem = {
  title: string;
  message: string;
};

suggestions.forEach(suggestion => {
  console.log(suggestion.title);    // Título visible
  console.log(suggestion.message);  // Mensaje a enviar
});
```

### 2. Configurar Sugerencias AI

```typescript
import { useCopilotChatSuggestions } from "@copilotkit/react-ui";

function MyComponent() {
  const { suggestions, generateSuggestions, isLoadingSuggestions } = 
    useCopilotChatHeadless_c();
  
  // Configurar generación automática
  useCopilotChatSuggestions({
    instructions: "Sugiere 3 acciones útiles basadas en el contexto",
    maxSuggestions: 3
  });
  
  // Generar sugerencias manualmente
  const handleGenerate = async () => {
    await generateSuggestions();
  };
  
  return (
    <div>
      {suggestions.map(s => (
        <button key={s.title}>{s.title}</button>
      ))}
      <button onClick={handleGenerate} disabled={isLoadingSuggestions}>
        Generar Sugerencias
      </button>
    </div>
  );
}
```

### 3. Establecer Sugerencias Manualmente

```typescript
const { setSuggestions } = useCopilotChatHeadless_c();

setSuggestions([
  { title: "Analizar producto", message: "Analiza mi producto SaaS" },
  { title: "Dar feedback", message: "Dame feedback sobre mi app" }
]);
```

### 4. Limpiar Sugerencias

```typescript
const { resetSuggestions } = useCopilotChatHeadless_c();

resetSuggestions();
```

---

## 🎭 Interrupciones (Human-in-the-Loop)

### 1. Renderizar Interrupciones

```typescript
const { interrupt, messages } = useCopilotChatHeadless_c();

return (
  <div>
    {messages.map(msg => (
      <div key={msg.id}>{msg.content}</div>
    ))}
    
    {/* Renderizar interrupción si existe */}
    {interrupt && (
      <div className="interrupt-container">
        {interrupt}
      </div>
    )}
  </div>
);
```

### 2. Crear Herramientas con HITL

```typescript
import { useCopilotAction } from "@copilotkit/react-core";

useCopilotAction({
  name: "confirm_action",
  description: "Solicita confirmación del usuario",
  parameters: [
    { name: "action", type: "string", description: "Acción a confirmar" }
  ],
  renderAndWaitForResponse: ({ args, respond, status }) => {
    if (status === "complete") {
      return <div>Confirmado ✓</div>;
    }
    
    return (
      <div>
        <p>¿Confirmas esta acción: {args.action}?</p>
        <button onClick={() => respond("yes")}>Sí</button>
        <button onClick={() => respond("no")}>No</button>
      </div>
    );
  }
});
```

El contenido de `interrupt` será el JSX retornado por `renderAndWaitForResponse`.

---

## ⚙️ Funciones Avanzadas

### 1. Ejecución Manual de Completions

```typescript
const { runChatCompletion } = useCopilotChatHeadless_c();

// Trigger manual de completion
const messages = await runChatCompletion();
console.log(messages); // Array de mensajes generados
```

### 2. Configurar Servidores MCP

```typescript
const { mcpServers, setMcpServers } = useCopilotChatHeadless_c();

setMcpServers([
  {
    name: "my-mcp-server",
    url: "http://localhost:8080/mcp"
  }
]);
```

---

## 📊 Estados de Carga

### isLoading

Indica si el chat está generando una respuesta:

```typescript
const { isLoading } = useCopilotChatHeadless_c();

{isLoading && <Spinner />}
```

### isLoadingSuggestions

Indica si las sugerencias se están generando:

```typescript
const { isLoadingSuggestions } = useCopilotChatHeadless_c();

{isLoadingSuggestions && <p>Generando sugerencias...</p>}
```

---

## 🎨 Ejemplo Completo y Correcto

```typescript
"use client";

import { useState } from "react";
import { useCopilotChatHeadless_c } from "@copilotkit/react-core";

export function MyHeadlessChat() {
  const [input, setInput] = useState("");
  
  const {
    // Mensajes
    messages,
    sendMessage,
    deleteMessage,
    
    // Control
    stopGeneration,
    reloadMessages,
    
    // Estado
    isLoading,
    
    // Sugerencias
    suggestions,
    setSuggestions,
    
    // HITL
    interrupt,
  } = useCopilotChatHeadless_c();
  
  const handleSend = async () => {
    if (input.trim() && !isLoading) {
      await sendMessage({
        id: Date.now().toString(),
        role: "user",
        content: input,
      });
      setInput("");
    }
  };
  
  const handleDelete = (messageId: string) => {
    deleteMessage(messageId);
  };
  
  const handleReload = async (messageId: string) => {
    await reloadMessages(messageId);
  };
  
  return (
    <div className="flex flex-col h-screen">
      {/* Sugerencias */}
      {suggestions.length > 0 && (
        <div className="p-4 border-b">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.title}
              onClick={() => setInput(suggestion.message)}
              className="mr-2 px-3 py-1 bg-gray-100 rounded"
            >
              {suggestion.title}
            </button>
          ))}
        </div>
      )}
      
      {/* Mensajes */}
      <div className="flex-1 overflow-auto p-4">
        {messages
          .filter(m => m.role === "user" || m.role === "assistant")
          .map((message) => (
          <div key={message.id} className="mb-4">
            <div className="flex justify-between">
              <strong>{message.role}:</strong>
              <div>
                {message.role === "assistant" && (
                  <button onClick={() => handleReload(message.id)}>
                    🔄
                  </button>
                )}
                <button onClick={() => handleDelete(message.id)}>
                  🗑️
                </button>
              </div>
            </div>
            <p>{message.content}</p>
            
            {/* Generative UI */}
            {message.generativeUI?.()}
          </div>
        ))}
        
        {/* Interrupción HITL */}
        {interrupt && (
          <div className="p-4 border rounded bg-yellow-50">
            {interrupt}
          </div>
        )}
        
        {/* Loading */}
        {isLoading && !interrupt && (
          <div className="text-gray-500">Pensando...</div>
        )}
      </div>
      
      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Escribe un mensaje..."
            className="flex-1 px-4 py-2 border rounded"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Enviar
          </button>
          {isLoading && (
            <button
              onClick={stopGeneration}
              className="px-4 py-2 bg-red-500 text-white rounded"
            >
              Detener
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## ⚠️ Métodos que NO Existen

Estos métodos **NO existen** en la API (errores comunes):

```typescript
// ❌ NO EXISTE
const { stop } = useCopilotChatHeadless_c();
// ✅ USA: stopGeneration

// ❌ NO EXISTE
const { reload } = useCopilotChatHeadless_c();
// ✅ USA: reloadMessages(messageId)

// ❌ NO EXISTE
const { append } = useCopilotChatHeadless_c();
// ✅ USA: sendMessage(message)

// ❌ NO EXISTE
const { input, setInput } = useCopilotChatHeadless_c();
// ✅ Maneja tu propio estado: useState("")
```

---

## 🔗 Recursos

- **Documentación Oficial**: https://docs.copilotkit.ai/premium/headless-ui
- **Obtener API Key**: https://cloud.copilotkit.ai
- **Referencia Completa**: https://docs.copilotkit.ai/reference/hooks/useCopilotChatHeadless_c
- **Ejemplos**: https://github.com/CopilotKit/CopilotKit/tree/main/examples

---

## 🆚 Diferencias con useCopilotChat

| Feature | useCopilotChat | useCopilotChatHeadless_c |
|---------|---------------|--------------------------|
| Requiere publicApiKey | ❌ No | ✅ Sí (gratuito) |
| Acceso a `messages` | ❌ No | ✅ Sí |
| Acceso a `suggestions` | ❌ No | ✅ Sí |
| Acceso a `interrupt` | ❌ No | ✅ Sí |
| `sendMessage` | ❌ No | ✅ Sí |
| `setMessages` | ❌ No | ✅ Sí |
| `deleteMessage` | ❌ No | ✅ Sí |
| Para UI personalizada | ⚠️ Limitado | ✅ Completo |
| Uso con componentes CopilotChat | ✅ Sí | ✅ Sí |

---

**Última actualización:** Enero 2025  
**Versión de CopilotKit:** 1.10.6+
