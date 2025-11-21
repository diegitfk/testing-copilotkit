import React from "react";
import { Search, Globe, Loader2 } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  raw_content?: string;
  score: number;
}

interface TavilyResponse {
  query: string;
  results: TavilyResult[];
  images?: any[];
  response_time: number;
}

interface TavilySearchResultsProps {
  status: "inProgress" | "complete" | "error";
  args: {
    query: string;
    [key: string]: any;
  };
  result?: TavilyResponse | string;
}

export function TavilySearchResults({ status, args, result }: TavilySearchResultsProps) {
  const parsedResult = React.useMemo(() => {
    if (!result) return null;
    if (typeof result === "string") {
      try {
        // Check if it looks like JSON before parsing to avoid syntax errors on plain text
        const trimmed = result.trim();
        if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
           return JSON.parse(result) as TavilyResponse;
        }
        // If not JSON, it might be a plain text error or message. 
        // We return null or handle it if needed, but for now let's avoid the crash.
        return null;
      } catch (e) {
        console.warn("Failed to parse Tavily result as JSON", e);
        return null;
      }
    }
    return result as TavilyResponse;
  }, [result]);

  const isLoading = status === "inProgress";
  const results = parsedResult?.results || [];
  const hasResults = results.length > 0;

  const getHostname = (url: string) => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  };

  return (
    <div className="w-full max-w-full font-sans text-sm space-y-3">
      {/* Header Row */}
      <div className="flex items-center gap-2 text-muted-foreground dark:text-gray-400">
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          <Search className="w-4 h-4 shrink-0" />
        )}
        <div className="flex items-center gap-1 overflow-hidden">
          <span className="whitespace-nowrap shrink-0">
            {isLoading ? "Buscando" : "Búsqueda:"}
          </span>
          <span className="font-medium truncate text-foreground dark:text-white">
            {args.query}
          </span>
        </div>
      </div>

      {/* Results Row - Horizontal Scroll */}
      {(hasResults || isLoading) && (
        <div className="relative w-full">
          {hasResults ? (
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex items-center gap-2 pb-2">
                {results.map((item, index) => {
                  const hostname = getHostname(item.url);
                  const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;

                  return (
                    <a
                      key={index}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={item.title}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full",
                        "bg-muted text-muted-foreground border border-border",
                        "dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
                        "hover:bg-accent hover:text-accent-foreground transition-colors",
                        "dark:hover:bg-gray-700 dark:hover:text-white",
                        "text-xs font-medium no-underline shrink-0"
                      )}
                    >
                      <img 
                        src={faviconUrl} 
                        alt="" 
                        className="w-3.5 h-3.5 opacity-80 shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <Globe className="w-3.5 h-3.5 text-muted-foreground hidden shrink-0" />
                      <span className="truncate max-w-[150px]">{hostname}</span>
                    </a>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          ) : isLoading && (
            <div className="flex gap-2 overflow-hidden opacity-50">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-8 w-32 bg-muted dark:bg-gray-800 rounded-full animate-pulse shrink-0" />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
