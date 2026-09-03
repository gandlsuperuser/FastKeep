import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { AiChatDialog } from "@/components/ai/ai-chat-dialog";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block">
        <Sidebar />
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* AI Assistant Chat Floating Widget */}
      <AiChatDialog />
    </div>
  );
}



