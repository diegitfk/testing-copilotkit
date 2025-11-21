import {
  CopilotRuntime,
  copilotRuntimeNextJSAppRouterEndpoint,
  LangGraphAgent,
  OpenAIAdapter
} from "@copilotkit/runtime";
import OpenAI from "openai";
import { NextRequest } from "next/server";
import { Client } from "@langchain/langgraph-sdk";

let serviceAdapter: OpenAIAdapter;

export const POST = async (req: NextRequest) => {
  try {
    // Validar OPENAI_API_KEY
    if (!process.env.OPENAI_API_KEY) {
      console.error("\n❌ ERROR: OPENAI_API_KEY no está configurada");
      console.error("📝 Por favor crea un archivo .env.local en la raíz del proyecto con:");
      console.error("   OPENAI_API_KEY=sk-proj-tu-api-key-aqui\n");
      
      return new Response(
        JSON.stringify({ 
          error: "OPENAI_API_KEY no está configurada. Revisa la consola del servidor para más detalles." 
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Extraer el token de autorización del request
    const authHeader = req.headers.get("authorization");
    console.log("[CopilotKit] Authorization header:", authHeader ? "✓ Present" : "✗ Missing");
    
    // Extraer threadId si existe en los headers o body
    const contentType = req.headers.get("content-type");
    let threadId: string | null = null;
    
    if (contentType?.includes("application/json")) {
      try {
        const body = await req.clone().json();
        threadId = body.threadId || null;
        if (threadId) {
          console.log("[CopilotKit] Thread ID:", threadId);
        }
      } catch (e) {
        // Ignorar errores de parsing
      }
    }

    // Crear cliente con headers de autorización si existen
    const langgraphClient = new Client({
      apiUrl: "http://localhost:80/api/agents",
      defaultHeaders: authHeader ? {
        "Authorization": authHeader
      } : {}
    });

    console.log("[CopilotKit] LangGraph client configured for:", "http://localhost:80/api/agents");
    console.log("[CopilotKit] Thread ID from frontend:", threadId || "Not provided");

    // Configurar OpenAI adapter para features adicionales (Singleton)
    if (!serviceAdapter) {
      const openai = new OpenAI({ 
        apiKey: process.env.OPENAI_API_KEY
      });
      
      serviceAdapter = new OpenAIAdapter({ 
        openai: openai as any,
        model: "gpt-4o-mini"
      });
      console.log("[CopilotKit] OpenAI adapter initialized ✓");
    }

    // Crear runtime con el agente configurado
    // NOTA: CopilotRuntime se recrea por request para inyectar el cliente de LangGraph con los headers de autorización del usuario
    const runtime = new CopilotRuntime({
      agents: {
        'prodmentor_workflow': new LangGraphAgent({
          deploymentUrl: "http://localhost:80/api/agents",
          client: langgraphClient as any,
          graphId: 'prodmentor_workflow',
        }),
        'fast_assistant_sale': new LangGraphAgent({
          deploymentUrl: "http://localhost:80/api/agents",
          client: langgraphClient as any,
          graphId: 'fast_assistant_sale',
        })
      },
    });

    console.log("[CopilotKit] Runtime initialized successfully ✓");
    console.log("[CopilotKit] Agent configuration:", {
      graphId: 'prodmentor_workflow',
      deploymentUrl: "http://localhost:80/api/agents"
    });

    const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
      runtime,
      serviceAdapter,
      endpoint: "/api/copilotkit",
    });

    return handleRequest(req);
  } catch (error) {
    console.error("[CopilotKit] Error in POST handler:", error);
    throw error;
  }
};