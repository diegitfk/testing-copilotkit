"use client";
import React, { useState } from "react";
import "@copilotkit/react-ui/styles.css";
import {
  CopilotKit,
  useFrontendTool,
} from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import {Chat} from "@/components/testing/Chat"


export default function AgenticChat() {
  return (
      <Chat />
  );
};

