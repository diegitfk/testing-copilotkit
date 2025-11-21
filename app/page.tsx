"use client";
import React from "react";
import "@copilotkit/react-ui/styles.css";
import { CopilotChat } from "@copilotkit/react-ui";
import { NewChat } from "@/components/testing/NewChat";
import { useCustomToolRender } from "@/components/tools/ToolRender";
export default function AgenticChat() {
  // Register custom tool renders so CopilotChat can use them
  useCustomToolRender();
  return (
    <div className="h-screen w-full flex flex-col">
      <NewChat />
    </div>
  );
};

