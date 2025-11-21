import React from "react";
import { BookOpen, Globe, Loader2, FileText } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface TavilyExtractResultsProps {
  status: "inProgress" | "complete" | "error";
  args: {
    urls: string[];
    [key: string]: any;
  };
  result?: any;
}

export function TavilyExtractResults({ status, args, result }: TavilyExtractResultsProps) {
  const isLoading = status === "inProgress";
  const urls = args.urls || [];
  const hasUrls = urls.length > 0;

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
          <BookOpen className="w-4 h-4 shrink-0" />
        )}
        <div className="flex items-center gap-1 overflow-hidden">
          <span className="whitespace-nowrap shrink-0">
            {isLoading ? "Leyendo páginas más relevantes:" : "Lectura completada:"}
          </span>
          <span className="font-medium truncate text-foreground dark:text-white">
            {urls.length} {urls.length === 1 ? "página" : "páginas"}
          </span>
        </div>
      </div>

      {/* URLs Row - Horizontal Scroll */}
      {hasUrls && (
        <div className="relative w-full">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex items-center gap-2 pb-2">
              {urls.map((url, index) => {
                const hostname = getHostname(url);
                const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;

                return (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full",
                      "bg-muted text-muted-foreground border border-border",
                      "dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
                      "hover:bg-accent hover:text-accent-foreground transition-colors",
                      "dark:hover:bg-gray-700 dark:hover:text-white",
                      "text-xs font-medium no-underline shrink-0",
                      isLoading && "animate-pulse opacity-80"
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
                    <FileText className="w-3.5 h-3.5 text-muted-foreground hidden shrink-0" />
                    <span className="truncate max-w-[150px]">{hostname}</span>
                  </a>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
