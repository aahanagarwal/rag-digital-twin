"use client";
import { useState } from "react";
import ChatInterface from "./components/ChatInterface";
import MemoryDashboard from "./components/MemoryDashboard";

export default function Home() {
  const [session, setSession] = useState<{
    userId: string;
    sessionId: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#000000] text-white p-4 font-sans selection:bg-white/30 selection:text-white">
        <h1 className="text-3xl font-medium tracking-tight mb-8 text-neutral-100">
          Digital Twin: Richard Feynman
        </h1>
        <div className="bg-[#0A0A0A] p-8 rounded-xl w-full max-w-sm border border-neutral-800/50 shadow-2xl">
          <h2 className="text-sm font-medium tracking-wide mb-6 text-neutral-400 uppercase">
            Initialize Profile
          </h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const username = formData.get("username") as string;
              if (username) {
                setIsLoading(true);
                try {
                  const backendUrl =
                    process.env.NEXT_PUBLIC_BACKEND_URL ||
                    "http://localhost:8000";
                  const res = await fetch(`${backendUrl}/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: username }),
                  });
                  if (res.ok) {
                    setSession({
                      userId: username,
                      sessionId: `sess_${Date.now()}`,
                    });
                  } else {
                    console.error("Login failed");
                  }
                } catch (err) {
                  console.error(err);
                } finally {
                  setIsLoading(false);
                }
              }
            }}
            className="space-y-5">
            <div>
              <input
                type="text"
                name="username"
                required
                disabled={isLoading}
                placeholder="Enter username..."
                className="w-full px-4 py-3 bg-transparent border border-neutral-800 rounded-lg text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 transition-all disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-white hover:bg-neutral-200 text-black text-sm font-medium rounded-lg transition-colors flex items-center justify-center disabled:opacity-50">
              {isLoading ? "Authenticating..." : "Connect"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen lg:h-screen lg:w-screen lg:overflow-hidden p-4 md:p-8 flex flex-col items-center justify-center bg-[#000000] relative selection:bg-white/30 selection:text-white">
      {/* Subtle white radial glow instead of amber */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/[0.02] blur-[100px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-7xl flex-1 min-h-0 flex flex-col lg:flex-row gap-8 justify-center items-stretch z-10 relative">
        {/* Left Side: The Chat Interface */}
        <div className="flex-1 w-full flex justify-center">
          <ChatInterface
            userId={session.userId}
            sessionId={session.sessionId}
          />
        </div>

        {/* Right Side: The Memory Dashboard */}
        <div className="w-full lg:w-1/3 flex justify-center">
          <MemoryDashboard userId={session.userId} />
        </div>
      </div>
    </main>
  );
}
