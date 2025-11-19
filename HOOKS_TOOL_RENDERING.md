# Hooks de Renderizado de Tool Calls

Este documento explica cómo usar `useRenderToolCall` y `useDefaultTool` para renderizar las tool calls del backend en tu aplicación.

## Diferencias clave

### `useRenderToolCall`
- **Uso**: Renderiza una tool **específica** por nombre
- **Selectivo**: Solo captura las tool calls que coincidan con el `name` especificado
- **Personalizado**: Permite UI completamente personalizada por tool
- **Múltiples**: Puedes usar varios `useRenderToolCall` para diferentes tools

### `useDefaultTool`
- **Uso**: Renderiza **todas las tools** que no tienen renderer específico
- **Catch-all**: Actúa como "comodín" para cualquier tool sin renderer
- **Genérico**: UI genérica que funciona para cualquier tool
- **Único**: Solo deberías tener un `useDefaultTool` en tu aplicación

## Arquitectura de tu implementación

```
Backend (LangGraph)
    ↓
    ├─ thinking_tool       → useRenderToolCall (específico)
    ├─ analyze_tool        → useRenderToolCall (específico)
    └─ cualquier_otra_tool → useDefaultTool (catch-all)
```

## Ejemplo de uso

### 1. useReasoningToolRenderer (específico)

Archivo: `/components/reasoning/ReasoningToolRenderer.tsx`

```typescript
export function useReasoningToolRenderer() {
    // Renderiza SOLO thinking_tool
    useRenderToolCall({
        name: "thinking_tool",  // ← Nombre específico
        render: ({ args, status }) => {
            // UI personalizada para thinking_tool
        }
    });

    // Renderiza SOLO analyze_tool
    useRenderToolCall({
        name: "analyze_tool",  // ← Nombre específico
        render: ({ args, status }) => {
            // UI personalizada para analyze_tool
        }
    });
}
```

### 2. useDefaultToolRenderer (catch-all)

Archivo: `/components/reasoning/DefaultToolRenderer.tsx`

```typescript
export function useDefaultToolRenderer() {
    useDefaultTool({
        // NO hay 'name' - captura TODAS las tools
        render: ({ name, args, status, result }) => {
            // UI genérica que funciona para cualquier tool
            return <GenericToolUI name={name} args={args} />
        }
    });
}
```

### 3. Usar ambos en tu componente

Archivo: `/components/testing/Chat.tsx`

```typescript
export function Chat() {
    // Primero las específicas
    useReasoningToolRenderer();
    
    // Luego el catch-all
    useDefaultToolRenderer();
    
    // ... resto del componente
}
```

## Orden de evaluación

1. CopilotKit recibe una tool call del backend (ej: `get_weather`)
2. Busca si existe un `useRenderToolCall` con `name: "get_weather"`
3. Si SÍ existe → Usa ese renderer específico
4. Si NO existe → Usa `useDefaultTool`

## Props disponibles en render

### useRenderToolCall
```typescript
render: ({ status, args, result }) => {
    // status: "inProgress" | "complete" | "executing"
    // args: Objeto con los argumentos pasados a la tool
    // result: El resultado retornado por la tool (solo si complete)
}
```

### useDefaultTool
```typescript
render: ({ name, status, args, result }) => {
    // name: Nombre de la tool que se está ejecutando
    // status: "inProgress" | "complete" | "executing"
    // args: Objeto con los argumentos pasados a la tool
    // result: El resultado retornado por la tool (solo si complete)
}
```

## Cuándo usar cada uno

### Usa `useRenderToolCall` cuando:
- Tienes una tool con UI específica (ej: weather widget, research panel)
- Necesitas acceso a parámetros específicos de la tool
- Quieres control total sobre el diseño
- Es una tool importante que usas frecuentemente

### Usa `useDefaultTool` cuando:
- Quieres ver TODAS las tool calls en desarrollo/debugging
- Necesitas un fallback genérico para tools desconocidas
- Quieres logging/monitoreo de todas las tool calls
- Estás prototipando y no quieres crear renderers específicos aún

## Ejemplo completo: Flujo de ejecución

```
Usuario: "¿Qué tiempo hace en Madrid?"
    ↓
Backend LangGraph ejecuta:
    1. thinking_tool(title="Planeando", thought="Voy a consultar el clima")
       → Renderizado por useReasoningToolRenderer (específico)
    
    2. get_weather(location="Madrid")
       → Renderizado por useDefaultToolRenderer (catch-all)
    
    3. analyze_tool(title="Resultado", analysis="El clima es...")
       → Renderizado por useReasoningToolRenderer (específico)
```

## Debugging

### Ver qué tool se está ejecutando:

```typescript
useDefaultTool({
    render: ({ name, args, status }) => {
        console.log(`Tool: ${name}, Status: ${status}`, args);
        return <YourUI />
    }
});
```

### Verificar si una tool tiene renderer:

Si ves tu tool en `useDefaultTool` pero esperabas verla en `useRenderToolCall`:
1. Verifica que el `name` en `useRenderToolCall` coincida EXACTAMENTE con el nombre del backend
2. El nombre es case-sensitive: `"get_weather"` ≠ `"Get_Weather"`

## Recordatorio importante

**Las tools DEBEN retornar string en el backend:**

```python
# ✅ CORRECTO
@tool
def my_tool(...) -> str:
    return "Tool ejecutada correctamente"

# ❌ INCORRECTO - Causa error GraphQL
@tool
def my_tool(...):
    return None  # ❌ No retornar None
    return Command(...)  # ❌ No retornar objetos complejos
```

El error `Cannot return null for non-nullable field ResultMessageOutput.result` aparece cuando el backend retorna `None` o valores no-string.

## Recursos

- [Documentación oficial useRenderToolCall](https://docs.copilotkit.ai/reference/hooks/useRenderToolCall)
- [Documentación oficial useDefaultTool](https://docs.copilotkit.ai/reference/hooks/useDefaultTool)
- [Tutorial Backend Tools](https://docs.copilotkit.ai/langgraph/generative-ui/backend-tools)
