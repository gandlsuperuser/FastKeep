"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  User,
  Send,
  Sparkles,
  X,
  Minimize2,
  Maximize2,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Brain,
  Square,
  RefreshCw,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  { label: "📊 分析财务收支状况", prompt: "请帮我梳理一套评估企业月度财务收支健康度的方法和核心关注指标。" },
  { label: "✉️ 生成催收逾期账单邮件", prompt: "请帮我写一封礼貌但语气坚定的逾期账单催付邮件模版，包含发票号、逾期天数和付款方式占位符。" },
  { label: "📝 规范报价单(Estimate)格式", prompt: "标准的企业服务报价单（Estimate）应该包含哪些核心条款和明细结构？" },
  { label: "💡 增值税与免税处理建议", prompt: "在向跨国客户开具发票时，对于税号（Tax ID）和免税/零税率项通常有哪些注意事项？" },
];

export function AiChatDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "您好！我是 **FastKeep AI 智能助手**（由私有 **Qwen 3.8-27B** 高速模型驱动）。\n\n我可以协助您进行**财务分析、发票与报价单撰写、催款邮件草拟、数据查询**等。请问今天有什么我可以帮您的？",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openReasonings, setOpenReasonings] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      textareaRef.current?.focus();
    }
  }, [isOpen, messages]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleReasoning = (id: string) => {
    setOpenReasonings((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    handleStop();
    setMessages([
      {
        id: "welcome-" + Date.now(),
        role: "assistant",
        content: "对话已重置。您可以随时向我提问财务、发票或业务管理相关问题！",
        timestamp: new Date(),
      },
    ]);
  };

  const sendMessage = async (overrideText?: string) => {
    const textToSend = overrideText || input.trim();
    if (!textToSend || isLoading) return;

    setInput("");
    const userMsgId = "msg-" + Date.now();
    const assistantMsgId = "resp-" + (Date.now() + 1);

    const userMessage: Message = {
      id: userMsgId,
      role: "user",
      content: textToSend,
      timestamp: new Date(),
    };

    const initialAssistantMessage: Message = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      reasoning: "",
      timestamp: new Date(),
    };

    const updatedHistory = [...messages, userMessage];
    setMessages([...updatedHistory, initialAssistantMessage]);
    setIsLoading(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      // Format messages payload for OpenAI compatible API
      const apiMessages = updatedHistory
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, stream: true }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "请求失败" }));
        throw new Error(errData.error || `请求失败 (${res.status})`);
      }

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      let reasoningText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":")) continue;
          if (trimmed === "data: [DONE]") continue;

          if (trimmed.startsWith("data: ")) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              const delta = json.choices?.[0]?.delta;
              if (delta) {
                if (delta.reasoning_content) {
                  reasoningText += delta.reasoning_content;
                }
                if (delta.content) {
                  assistantText += delta.content;
                }
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMsgId
                      ? {
                          ...msg,
                          content: assistantText,
                          reasoning: reasoningText,
                        }
                      : msg
                  )
                );
              }
            } catch {
              // Non-JSON line or chunk boundary, continue
            }
          }
        }
      }

      // If non-streaming JSON came back
      if (!assistantText && !reasoningText && buffer.trim().startsWith("{")) {
        try {
          const json = JSON.parse(buffer.trim());
          const msg = json.choices?.[0]?.message;
          if (msg) {
            assistantText = msg.content || "";
            reasoningText = msg.reasoning_content || "";
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, content: assistantText, reasoning: reasoningText }
                  : m
              )
            );
          }
        } catch {}
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        // User aborted
      } else {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content: `⚠️ **出错了**：${err.message || "无法连接到 AI 服务"}。\n\n请检查服务端是否在线或稍后重试。`,
                }
              : msg
          )
        );
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Trigger Button (Bottom Right) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 group border border-white/20"
          title="打开 FastKeep AI 助手"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <span className="text-sm font-semibold tracking-wide">AI 财务助手</span>
          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-white/20 text-white/90">
            Qwen 3.8
          </span>
        </button>
      )}

      {/* Chat Dialog Window */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-50 flex flex-col bg-card border border-border shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 ease-out backdrop-blur-md",
            isExpanded
              ? "inset-4 sm:inset-10 md:inset-16 w-auto h-auto"
              : "bottom-6 right-6 w-[92vw] sm:w-[460px] h-[640px] max-h-[85vh]"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center shadow-inner">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold tracking-tight text-white">FastKeep AI 智能助手</h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    在线 · 100 tok/s
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono">Qwen3.8-27B · 256K Context</p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-400">
              <button
                onClick={handleClear}
                className="p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="清空对话"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title={isExpanded ? "还原大小" : "全屏放大"}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="关闭"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
            {messages.map((msg) => {
              const isAssistant = msg.role === "assistant";
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-3 text-sm leading-relaxed",
                    isAssistant ? "items-start" : "items-start flex-row-reverse"
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                      isAssistant
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-700 text-white shadow-sm"
                    )}
                  >
                    {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>

                  {/* Message Box */}
                  <div
                    className={cn(
                      "max-w-[85%] group relative",
                      isAssistant ? "text-foreground" : "text-primary-foreground"
                    )}
                  >
                    {/* Reasoning Section (Thinking process) */}
                    {isAssistant && msg.reasoning && (
                      <div className="mb-2 rounded-xl bg-muted/60 border border-border/80 overflow-hidden text-xs">
                        <button
                          onClick={() => toggleReasoning(msg.id)}
                          className="w-full flex items-center justify-between px-3 py-2 text-muted-foreground hover:bg-muted/80 transition-colors font-medium"
                        >
                          <div className="flex items-center gap-1.5">
                            <Brain className="w-3.5 h-3.5 text-indigo-500" />
                            <span>思考过程 (Reasoning)</span>
                          </div>
                          {openReasonings[msg.id] ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                        {openReasonings[msg.id] && (
                          <div className="px-3 py-2 bg-background/50 border-t border-border/50 text-muted-foreground font-mono text-[11px] leading-normal whitespace-pre-wrap">
                            {msg.reasoning}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Main Content */}
                    <div
                      className={cn(
                        "p-3.5 rounded-2xl shadow-sm text-[13.5px] whitespace-pre-wrap break-words leading-relaxed",
                        isAssistant
                          ? "bg-card border border-border text-card-foreground rounded-tl-sm"
                          : "bg-indigo-600 text-white rounded-tr-sm"
                      )}
                    >
                      {msg.content || (
                        <span className="flex items-center gap-1 text-muted-foreground italic text-xs">
                          <Zap className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                          正在思考与生成回复...
                        </span>
                      )}
                    </div>

                    {/* Action Bar */}
                    {isAssistant && msg.content && (
                      <div className="flex items-center gap-2 mt-1 px-1">
                        <button
                          onClick={() => handleCopy(msg.content, msg.id)}
                          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-500">已复制</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>复制</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts (only when messages length is small) */}
          {messages.length <= 2 && (
            <div className="px-4 py-2 border-t border-border/50 bg-muted/10 shrink-0">
              <div className="text-[11px] text-muted-foreground font-medium mb-1.5">快捷提问：</div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(item.prompt)}
                    disabled={isLoading}
                    className="text-xs px-2.5 py-1 rounded-lg bg-card border border-border hover:border-indigo-500/50 hover:bg-indigo-500/10 text-card-foreground transition-colors text-left"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 border-t border-border bg-card shrink-0">
            <div className="relative flex items-end gap-2 bg-muted/40 rounded-xl border border-input focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 p-2 transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="向 Qwen 提问财务、发票或业务问题... (Enter 发送, Shift+Enter 换行)"
                rows={2}
                disabled={isLoading}
                className="w-full resize-none bg-transparent border-0 text-sm focus:outline-none placeholder:text-muted-foreground max-h-32 text-foreground"
              />

              <div className="flex items-center gap-1 self-end">
                {isLoading ? (
                  <button
                    onClick={handleStop}
                    className="p-2 rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition-colors shadow-sm"
                    title="停止生成"
                  >
                    <Square className="w-4 h-4 fill-current" />
                  </button>
                ) : (
                  <button
                    onClick={() => sendMessage()}
                    disabled={!input.trim()}
                    className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                    title="发送"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-muted-foreground">
              <span>Enter 发送 / Shift+Enter 换行</span>
              <span>FastKeep AI · RTX 5090 专线</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
