import { useRenderToolCall } from "@copilotkit/react-core";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ai-elements/reasoning";
import { Brain, Lightbulb } from "lucide-react";
import { TavilySearchResults } from "./TavilySearchResults";
import { TavilyExtractResults } from "./TavilyExtractResults";

export function useCustomToolRender(){
    useRenderToolCall({
        name: "thinking_tool",
        description: "Renderiza los pensamientos del agente en el chat",
        parameters: [
            { name: "title", type: "string", description: "Título del pensamiento", required: true },
            { name: "thought", type: "string", description: "El pensamiento completo", required: true },
            { name: "action", type: "string", description: "Siguiente acción", required: false },
            { name: "confidence", type: "number", description: "Nivel de confianza (0-1)", required: false },
        ],
        render: ({ status, args , result }) => {
            const confidence = args.confidence as number || 0.8;
            const isStreaming = status === "inProgress";
            
            // Construir el contenido como string
            let content = `**${args.title as string}**\n\n${args.thought as string}`;
            
            if (args.action) {
                content += `\n\n**Siguiente acción:** ${args.action as string}`;
            }
            
            if (status === "complete") {
                content += `\n\n_Confianza: ${Math.round(confidence * 100)}%_`;
            }
            
            return (
                <Reasoning isStreaming={isStreaming} defaultOpen={true}>
                    <ReasoningTrigger>
                        <Brain className="size-4" />
                        <span>{isStreaming ? "Pensando..." : `Pensamiento: ${args.title as string}`}</span>
                    </ReasoningTrigger>
                    <ReasoningContent>{content}</ReasoningContent>
                </Reasoning>
            );
        },
    });
    useRenderToolCall({
        name: "analyze_tool",
        description: "Renderiza los análisis del agente en el chat",
        parameters: [
            { name: "title", type: "string", description: "Título del análisis", required: true },
            { name: "analisis_result", type: "string", description: "Resultado analizado", required: false },
            { name: "analysis", type: "string", description: "El análisis detallado", required: true },
            { name: "next_action", type: "string", description: "Próxima acción", required: false },
            { name: "confidence", type: "number", description: "Nivel de confianza (0-1)", required: false },
        ],
        render: ({ status, args }) => {
            const confidence = args.confidence as number || 0.8;
            const isStreaming = status === "inProgress";
            
            // Construir el contenido como string
            let content = `**${args.title as string}**\n\n`;
            
            if (args.analisis_result) {
                content += `**Resultado:**\n${args.analisis_result as string}\n\n`;
            }
            
            if (args.analysis) {
                content += `**Análisis:**\n${args.analysis as string}\n\n`;
            }
            
            if (args.next_action) {
                content += `**Siguiente acción:** ${args.next_action as string}\n\n`;
            }
            
            if (status === "complete") {
                content += `_Confianza: ${Math.round(confidence * 100)}%_`;
            }
            
            return (
                <Reasoning isStreaming={isStreaming} defaultOpen={true}>
                    <ReasoningTrigger>
                        <Lightbulb className="size-4" />
                        <span>{isStreaming ? "Analizando..." : `Análisis: ${args.title as string}`}</span>
                    </ReasoningTrigger>
                    <ReasoningContent>{content}</ReasoningContent>
                </Reasoning>
            );
        },
    });
    useRenderToolCall({
        name: "tavily_search",
        description: "A search engine optimized for comprehensive, accurate, and trusted results. Useful for when you need to answer questions about current events.",
        parameters: [
            { name: "query", type: "string", description: "Search query to look up", required: true },
            { name: "include_domains", type: "string[]", description: "A list of domains to restrict search results to.\n\nUse this parameter when:\n1. The user explicitly requests information from specific websites (e.g., \"Find climate data from nasa.gov\")\n2. The user mentions an organization or company without specifying the domain (e.g., \"Find information about iPhones from Apple\")\n\nIn both cases, you should determine the appropriate domains (e.g., [\"nasa.gov\"] or [\"apple.com\"]) and set this parameter.\n\nResults will ONLY come from the specified domains - no other sources will be included.\nDefault is None (no domain restriction).", required: false },
            { name: "exclude_domains", type: "string[]", description: "A list of domains to exclude from search results.\n\nUse this parameter when:\n1. The user explicitly requests to avoid certain websites (e.g., \"Find information about climate change but not from twitter.com\")\n2. The user mentions not wanting results from specific organizations without naming the domain (e.g., \"Find phone reviews but nothing from Apple\")\n\nIn both cases, you should determine the appropriate domains to exclude (e.g., [\"twitter.com\"] or [\"apple.com\"]) and set this parameter.\n\nResults will filter out all content from the specified domains.\nDefault is None (no domain exclusion).", required: false },
            { name: "search_depth", type: "string", description: "Controls search thoroughness and result comprehensiveness.\n\nUse \"basic\" for simple queries requiring quick, straightforward answers.\n\nUse \"advanced\" (default) for complex queries, specialized topics, \nrare information, or when in-depth analysis is needed.", required: false },
            { name: "include_images", type: "boolean", description: "Determines if the search returns relevant images along with text results.\n\nSet to True when the user explicitly requests visuals or when images would \nsignificantly enhance understanding (e.g., \"Show me what black holes look like,\" \n\"Find pictures of Renaissance art\").\n\nLeave as False (default) for most informational queries where text is sufficient.", required: false },
            { name: "time_range", type: "string", description: "Limits results to content published within a specific timeframe.\n\nONLY set this when the user explicitly mentions a time period \n(e.g., \"latest AI news,\" \"articles from last week\").\n\nFor less popular or niche topics, use broader time ranges \n(\"month\" or \"year\") to ensure sufficient relevant results.\n\nOptions: \"day\" (24h), \"week\" (7d), \"month\" (30d), \"year\" (365d).\n\nDefault is None.", required: false },
            { name: "topic", type: "string", description: "Specifies search category for optimized results.\n\nUse \"general\" (default) for most queries, INCLUDING those with terms like \n\"latest,\" \"newest,\" or \"recent\" when referring to general information.\n\nUse \"finance\" for markets, investments, economic data, or financial news.\n\nUse \"news\" ONLY for politics, sports, or major current events covered by \nmainstream media - NOT simply because a query asks for \"new\" information.", required: false },
            { name: "include_favicon", type: "boolean", description: "Determines whether to include favicon URLs for each search result.\n\nWhen enabled, each search result will include the website's favicon URL,\nwhich can be useful for:\n- Building rich UI interfaces with visual website indicators\n- Providing visual cues about the source's credibility or brand\n- Creating bookmark-like displays with recognizable site icons\n\nSet to True when creating user interfaces that benefit from visual branding\nor when favicon information enhances the user experience.\n\nDefault is False to minimize response size and API usage.", required: false },
            { name: "start_date", type: "string", description: "Filters search results to include only content published on or after this date.\n\nUse this parameter when you need to:\n- Find recent developments or updates on a topic\n- Exclude outdated information from search results\n- Focus on content within a specific timeframe\n- Combine with end_date to create a custom date range\n\nFormat must be YYYY-MM-DD (e.g., \"2024-01-15\" for January 15, 2024).\n\nExamples:\n- \"2024-01-01\" - Results from January 1, 2024 onwards\n- \"2023-12-25\" - Results from December 25, 2023 onwards\n\nWhen combined with end_date, creates a precise date range filter.\n\nDefault is None (no start date restriction).", required: false },
            { name: "end_date", type: "string", description: "Filters search results to include only content published on or before this date.\n\nUse this parameter when you need to:\n- Exclude content published after a certain date\n- Study historical information or past events\n- Research how topics were covered during specific time periods\n- Combine with start_date to create a custom date range\n\nFormat must be YYYY-MM-DD (e.g., \"2024-03-31\" for March 31, 2024).\n\nExamples:\n- \"2024-03-31\" - Results up to and including March 31, 2024\n- \"2023-12-31\" - Results up to and including December 31, 2023\n\nWhen combined with start_date, creates a precise date range filter.\nFor example: start_date=\"2024-01-01\", end_date=\"2024-03-31\" \nreturns results from Q1 2024 only.\n\nDefault is None (no end date restriction).", required: false },
        ],
        render: ({ status, args, result }) => {
            return (
                <TavilySearchResults 
                    status={status as "inProgress" | "complete" | "error"} 
                    args={args as any} 
                    result={result} 
                />
            );
        },
    });
    useRenderToolCall({
        name: "tavily_extract",
        description: "Extract web page content from one or more specified URLs using Tavily Extract.",
        available: "enabled", // or "disabled" if needed
        parameters: [
            { name: "urls", type: "string[]", description: "list of urls to extract", required: true },
            { name: "extract_depth", type: "string", description: "Controls the thoroughness of web content extraction.\n\nUse \"basic\" for faster extraction of main text content.\n\nUse \"advanced\" (default) to retrieve comprehensive content including \ntables and embedded elements. Always use \"advanced\" for LinkedIn \nand YouTube URLs for optimal results.\n\nBetter for complex websites but may increase response time.", required: false },
            { name: "include_images", type: "boolean", description: "Determines whether to extract and include images from the source URLs.\n\nSet to True when visualizations are needed for better context or understanding.\n\nDefault is False (extracts text content only).", required: false },
            { name: "include_favicon", type: "boolean", description: "Whether to include the favicon URL for each result.", required: false },
        ],
        render: ({ status, args, result }) => {
            return (
                <TavilyExtractResults 
                    status={status as "inProgress" | "complete" | "error"} 
                    args={args as any} 
                    result={result} 
                />
            );
        },
    });

}