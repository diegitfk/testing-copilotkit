# Solución Error: Cannot return null for non-nullable field ResultMessageOutput.result

## Diagnóstico del problema

El error `Cannot return null for non-nullable field ResultMessageOutput.result` ocurre porque el **campo `result` en el schema GraphQL de CopilotKit NO es nullable**.

Cuando una tool se ejecuta en el backend, **DEBE** retornar un string válido. Si retorna `None`, `null`, `undefined` o un valor vacío, GraphQL rechaza la respuesta.

## Análisis de `useRenderToolCall`

**IMPORTANTE**: `useRenderToolCall` NO ejecuta las tools, solo las **renderiza en el frontend** cuando el backend las llama.

```typescript
useRenderToolCall({
  name: "analyze_tool",
  parameters: [...],  // ← Estos parámetros son solo para RENDERIZADO
  render: ({ args }) => { ... }  // ← Renderiza, no ejecuta
})
```

- El hook `useRenderToolCall` solo define CÓMO mostrar una tool call en la UI
- Los parámetros definidos aquí son para **tipado y renderizado** en el frontend
- La **ejecución real** ocurre en el backend (LangGraph agent)

## Dónde está el problema

El error ocurre en tu **agente de backend**: `prodmentor_workflow` en `http://localhost:80/api/agents`

### Cómo funciona el flujo:

1. **Backend (LangGraph)**: El agente llama a `thinking_tool("título", "pensamiento", ...)`
2. **Backend (Tool)**: La función tool se ejecuta y retorna un valor
3. **CopilotKit Runtime**: Convierte el resultado a `ResultMessageOutput.result`
4. **GraphQL**: Valida que `result` no sea null (FALLA AQUÍ si es null)
5. **Frontend**: Recibe el evento y `useRenderToolCall` lo renderiza

## Solución en el Backend

Asegúrate de que **TODAS** tus tool functions en el backend **SIEMPRE retornen un string**:

### ✅ CORRECTO

```python
from langchain.tools import tool

@tool
def thinking_tool(
    title: str,
    thought: str,
    action: str = "",
    confidence: float = 0.8
) -> str:  # ← SIEMPRE debe retornar str
    """Tool para pensar en voz alta"""
    # SIEMPRE retornar un string válido
    return f"✓ Pensamiento '{title}' registrado (confianza: {int(confidence * 100)}%)"

@tool
def analyze_tool(
    title: str,
    analysis_result: str,  # ← Cambié de 'result' a 'analysis_result' por claridad
    analysis: str,
    next_action: str = "continue",
    confidence: float = 0.8
) -> str:  # ← SIEMPRE debe retornar str
    """Tool para analizar resultados"""
    # SIEMPRE retornar un string válido
    return f"✓ Análisis '{title}' completado (confianza: {int(confidence * 100)}%)"
```

### ❌ INCORRECTO

```python
@tool
def thinking_tool(...) -> str:
    # ❌ NO retornar None
    return None
    
@tool
def thinking_tool(...) -> str:
    # ❌ NO retornar vacío implícitamente
    pass
    
@tool  
def thinking_tool(...) -> str:
    # ❌ NO retornar empty string sin intención
    return ""  # Solo si realmente quieres esto
    
@tool
def thinking_tool(...):
    # ❌ NO omitir el tipo de retorno
    return "ok"  # Debería especificar -> str
```

## Verificación

Para verificar que tus tools están retornando correctamente:

### 1. En desarrollo local

```python
# Prueba las tools directamente
result = thinking_tool.invoke({
    "title": "Test",
    "thought": "Pensamiento de prueba",
    "action": "continuar",
    "confidence": 0.9
})
print(f"Resultado: {result}")
print(f"Tipo: {type(result)}")
# Debe imprimir: Resultado: ✓ Pensamiento 'Test' registrado (confianza: 90%)
#                Tipo: <class 'str'>
```

### 2. En logs del servidor

Busca en los logs de tu agente LangGraph mensajes como:

```
[Tool] thinking_tool called with args: {...}
[Tool] thinking_tool returned: ✓ Pensamiento ...
```

Si ves `returned: None` o no ves el valor de retorno, ahí está el problema.

### 3. En consola del navegador

Abre DevTools → Console y busca errores de GraphQL con:

```
Cannot return null for non-nullable field ResultMessageOutput.result
```

## Nombres de parámetros reservados

Evita usar estos nombres en los parámetros de tus tools ya que son campos internos de CopilotKit:

- ❌ `result` - Conflicto con ResultMessageOutput.result
- ❌ `status` - Conflicto con estados internos
- ❌ `id` - Conflicto con identificadores internos

Usa alternativas:
- ✅ `analysis_result`, `data_result`, `outcome`, `output`
- ✅ `execution_status`, `tool_status`
- ✅ `item_id`, `request_id`

## Checklist de solución

- [ ] Verificar que todas las tool functions tienen `-> str` como tipo de retorno
- [ ] Verificar que todas las tool functions retornan un string explícitamente
- [ ] No usar `None`, `null` o `pass` sin retorno
- [ ] Evitar parámetros con nombres reservados (`result`, `status`, `id`)
- [ ] Probar las tools directamente para verificar el tipo de retorno
- [ ] Reiniciar el servidor LangGraph después de cambios
- [ ] Verificar logs del backend para confirmar valores de retorno

## Configuración actual

Tu setup actual:
- **Frontend**: Next.js con CopilotKit
- **Backend**: LangGraph agent en `http://localhost:80/api/agents`
- **Agent ID**: `prodmentor_workflow`
- **Tools afectadas**: `thinking_tool`, `analyze_tool`

## Recursos adicionales

- [CopilotKit useRenderToolCall docs](https://docs.copilotkit.ai/reference/hooks/useRenderToolCall)
- [LangGraph Tools docs](https://python.langchain.com/docs/modules/agents/tools/)
- [CopilotKit GraphQL Schema](https://github.com/CopilotKit/CopilotKit/blob/main/packages/runtime/src/graphql/types/copilot-response.type.ts)
