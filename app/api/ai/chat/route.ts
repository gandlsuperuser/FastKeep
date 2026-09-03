import { NextResponse } from "next/server";

const LLM_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.ifun.gg/v1";
const LLM_API_KEY = process.env.OPENAI_API_KEY || "sk-m_XPOMeld8jC58LJ1UFw_BWKFd3MLIRo";
const LLM_MODEL = process.env.LLM_MODEL || "qwen3.8-27b-exl3-3.5bpw-wm";

export async function POST(req: Request) {
  try {
    const { messages, stream = true } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid request: 'messages' array is required." },
        { status: 400 }
      );
    }

    // System prompt tailored for FastKeep Accounting SaaS
    const systemMessage = {
      role: "system",
      content: `你是 FastKeep 智能财务与企业管理助手。
FastKeep 是一款功能强大的财务与记账 SaaS 平台（支持发票 Invoices、客户 Customers、估价单 Estimates、产品库 Products、银行账户及对账、多租户组织管理等）。
你的职责是：
1. 协助用户解答关于发票、税务、记账、催款、财务报表、客户管理等方面的问题；
2. 帮助用户草拟商务邮件、催收通知、合同备注条款及业务备忘录；
3. 以专业、清晰、亲切且高效的语气回答，合理使用 Markdown 列表、表格和加粗突出重点。`,
    };

    const fullMessages = [systemMessage, ...messages];

    const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: fullMessages,
        stream: stream,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `LLM 服务端响应异常 (${response.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMsg = errorJson.error?.message || errorJson.error || errorMsg;
      } catch {
        if (response.status === 502) errorMsg = "模型服务端正在维护或重启中 (502)";
        if (response.status === 429) errorMsg = "请求并发排队或超过限额 (429)";
      }
      return NextResponse.json({ error: errorMsg }, { status: response.status });
    }

    if (!stream) {
      const data = await response.json();
      return NextResponse.json(data);
    }

    // Stream SSE back to client
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        if (!response.body) {
          controller.close();
          return;
        }

        const reader = response.body.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            controller.enqueue(encoder.encode(chunk));
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("AI Chat Route Error:", error);
    return NextResponse.json(
      { error: error.message || "内部服务器错误" },
      { status: 500 }
    );
  }
}
