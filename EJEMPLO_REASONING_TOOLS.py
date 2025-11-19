"""
EJEMPLO COMPLETO: Reasoning con Tool Calls
==========================================

Este es un ejemplo completo y funcional de cómo implementar reasoning
usando tools normales de LangChain que se renderizan automáticamente
en el frontend con CopilotKit.

Los tool calls quedan respaldados en el thread automáticamente.
"""

from typing import Optional, Annotated, TypedDict
from operator import add
from langchain.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import create_react_agent
from langchain_core.messages import SystemMessage, BaseMessage


# ============================================================================
# 1. DEFINIR LAS TOOLS DE REASONING
# ============================================================================

@tool
def thinking_tool(
    title: str,
    thought: str,
    action: Optional[str] = None,
    confidence: float = 0.8,
) -> str:
    """
    Permite al agente pensar en voz alta sobre el problema.
    
    Usa esta tool cuando necesites:
    - Descomponer problemas complejos
    - Planear tu estrategia antes de actuar
    - Reflexionar sobre lo que has aprendido
    - Evaluar diferentes enfoques
    
    Args:
        title: Título corto y descriptivo del pensamiento
        thought: El pensamiento completo y detallado del agente
        action: Siguiente acción que planeas tomar (opcional)
        confidence: Tu nivel de confianza en este pensamiento (0-1)
    
    Returns:
        Confirmación de que el pensamiento fue registrado
    
    Example:
        thinking_tool(
            title="Analizando el problema",
            thought="El usuario quiere optimizar costos. Primero debo identificar los servicios más costosos.",
            action="Solicitar lista de servicios AWS",
            confidence=0.9
        )
    """
    return f"✓ Pensamiento '{title}' registrado (confianza: {int(confidence * 100)}%)"


@tool
def analyze_tool(
    title: str,
    analysis_result: str,
    analysis: str,
    next_action: str = "continue",
    confidence: float = 0.8
) -> str:
    """
    Permite al agente analizar resultados obtenidos.
    
    Usa esta tool cuando necesites:
    - Interpretar datos que obtuviste
    - Extraer conclusiones de resultados
    - Identificar patrones en información
    - Decidir próximos pasos basándote en datos
    
    Args:
        title: Título corto del análisis
        analysis_result: Los datos o resultados que estás analizando
        analysis: Tu análisis detallado e interpretación
        next_action: Qué acción recomiendas tomar después
        confidence: Tu nivel de confianza en el análisis (0-1)
    
    Returns:
        Confirmación de que el análisis fue completado
    
    Example:
        analyze_tool(
            title="Análisis de costos AWS",
            analysis_result="EC2: $2,000/mes, S3: $500/mes, RDS: $300/mes",
            analysis="EC2 representa el 71% del costo total. Las instancias están sobredimensionadas para la carga actual.",
            next_action="Proponer rightsizing de instancias EC2",
            confidence=0.85
        )
    """
    return f"✓ Análisis '{title}' completado (confianza: {int(confidence * 100)}%)"


# ============================================================================
# 2. DEFINIR EL ESTADO DEL AGENTE
# ============================================================================

class AgentState(TypedDict):
    """Estado del agente con mensajes"""
    messages: Annotated[list[BaseMessage], add]


# ============================================================================
# 3. CREAR EL AGENTE CON LAS TOOLS
# ============================================================================

def create_reasoning_agent():
    """
    Crea un agente con capacidades de reasoning usando tools.
    Los tool calls se renderizan automáticamente en el frontend.
    """
    
    # System prompt que instruye al agente sobre cuándo usar las tools
    system_prompt = """Eres un asistente experto que piensa cuidadosamente antes de actuar.

Tienes acceso a dos herramientas especiales para comunicar tu razonamiento:

1. **thinking_tool**: Úsala cuando necesites pensar en voz alta
   - ANTES de responder preguntas complejas
   - Para descomponer problemas en partes manejables
   - Para planear tu estrategia
   - Para reflexionar sobre lo que has aprendido
   
   Ejemplo: Si el usuario pregunta algo complejo, PRIMERO usa thinking_tool
   para planear tu enfoque, LUEGO actúa.

2. **analyze_tool**: Úsala cuando necesites analizar resultados
   - DESPUÉS de obtener datos (búsquedas, cálculos, etc.)
   - Para interpretar información
   - Para extraer conclusiones
   - Para decidir próximos pasos basándote en datos
   
   Ejemplo: Después de buscar información, usa analyze_tool para
   interpretarla antes de responder al usuario.

IMPORTANTE:
- Estas herramientas son VISIBLES para el usuario en el chat
- Úsalas para mostrar tu proceso de razonamiento
- Sé específico y claro
- No uses estas tools para cosas triviales
- Usa thinking_tool ANTES de actuar en problemas complejos
- Usa analyze_tool DESPUÉS de obtener datos

FLUJO RECOMENDADO para preguntas complejas:
1. thinking_tool → planear enfoque
2. Ejecutar acciones necesarias
3. analyze_tool → interpretar resultados
4. Responder al usuario con conclusiones
"""
    
    # Crear el modelo
    model = ChatOpenAI(model="gpt-4", temperature=0.7)
    
    # Crear agente con las tools
    agent = create_react_agent(
        model=model,
        tools=[thinking_tool, analyze_tool],
        state_schema=AgentState,
    )
    
    # Wrapper para agregar el system prompt
    def agent_with_prompt(state: AgentState):
        # Agregar system prompt al inicio si no existe
        messages = state["messages"]
        if not any(isinstance(m, SystemMessage) for m in messages):
            messages = [SystemMessage(content=system_prompt)] + messages
        
        return agent.invoke({"messages": messages})
    
    return agent_with_prompt


# ============================================================================
# 4. EJEMPLO DE USO
# ============================================================================

if __name__ == "__main__":
    """
    Ejemplo de cómo usar el agente.
    En producción, esto se integraría con CopilotKit.
    """
    
    agent = create_reasoning_agent()
    
    # Ejemplo 1: Pregunta compleja
    print("=" * 80)
    print("EJEMPLO 1: Pregunta compleja")
    print("=" * 80)
    
    response = agent({
        "messages": [
            ("user", "¿Cómo puedo optimizar los costos de mi infraestructura AWS?")
        ]
    })
    
    print("\nRespuesta:")
    for message in response["messages"]:
        if hasattr(message, "content"):
            print(f"{message.__class__.__name__}: {message.content[:200]}...")
    
    # Ejemplo 2: Análisis de datos
    print("\n" + "=" * 80)
    print("EJEMPLO 2: Análisis de datos")
    print("=" * 80)
    
    response = agent({
        "messages": [
            ("user", """Analiza estos datos de ventas:
            Enero: $10,000
            Febrero: $12,000
            Marzo: $9,000
            Abril: $15,000
            Mayo: $18,000
            
            ¿Qué tendencias observas?""")
        ]
    })
    
    print("\nRespuesta:")
    for message in response["messages"]:
        if hasattr(message, "content"):
            print(f"{message.__class__.__name__}: {message.content[:200]}...")


# ============================================================================
# 5. INTEGRACIÓN CON COPILOTKIT
# ============================================================================

"""
Para integrarlo con CopilotKit, necesitas servir el agente usando AG-UI:

from copilotkit.langgraph import copilotkit_customize_config
from langgraph.checkpoint.memory import MemorySaver

# Agregar checkpointer para mantener estado
checkpointer = MemorySaver()
agent_with_checkpoint = agent.compile(checkpointer=checkpointer)

# Servir con FastAPI
from fastapi import FastAPI
from copilotkit.integrations.fastapi import add_fastapi_endpoint

app = FastAPI()

add_fastapi_endpoint(
    app,
    agent_with_checkpoint,
    "/copilotkit"
)

# En el frontend (ya está implementado):
# useReasoningToolRenderer() en Chat.tsx
"""


# ============================================================================
# 6. TIPS Y MEJORES PRÁCTICAS
# ============================================================================

"""
TIPS:

1. Nombres de tools:
   - Deben coincidir EXACTAMENTE entre backend y frontend
   - Backend: @tool def thinking_tool(...)
   - Frontend: useCopilotAction({ name: "thinking_tool" })

2. System prompt:
   - Sé específico sobre CUÁNDO usar cada tool
   - Da ejemplos concretos
   - Explica el flujo recomendado

3. Argumentos de tools:
   - Usa tipos de Python claros (str, int, float, Optional)
   - Agrega descripciones detalladas en el docstring
   - Los argumentos se muestran en tiempo real en el frontend

4. Testing:
   - Prueba primero con preguntas directas: "usa thinking_tool para..."
   - Luego prueba con preguntas que requieran el tool naturalmente
   - Observa los logs para ver cuándo el agente usa cada tool

5. Personalización:
   - Edita ReasoningToolRenderer.tsx para cambiar estilos
   - Agrega más tools siguiendo el mismo patrón
   - Cada tool puede tener su propio componente visual
"""
