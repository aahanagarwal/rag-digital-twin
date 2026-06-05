"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  MicOff,
  Send,
  Cpu,
  User,
  Loader2,
  Volume2,
  VolumeX,
} from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

interface ChatInterfaceProps {
  userId: string;
  sessionId: string;
}

export default function ChatInterface({
  userId,
  sessionId,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice integration refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // TTS refs and state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [fetchingMessageId, setFetchingMessageId] = useState<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const response = await fetch(`${backendUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          sessionId,
          message: userMessage.content,
        }),
      });

      if (!response.ok) throw new Error("API failed");

      const data = await response.json();

      const assistantMessageId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        { id: assistantMessageId, role: "assistant", content: data.response },
      ]);

      // Auto-play TTS if a voice session was recently active (optional feature)
      // playTTS(data.response, assistantMessageId);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "Apologies, my logic circuits encountered an error.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const toggleRecording = async () => {
    if (isProcessingAudio) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setIsProcessingAudio(false);
      return;
    }
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      });

      mediaRecorder.addEventListener("stop", async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        setIsProcessingAudio(true);

        try {
          const formData = new FormData();
          formData.append("audio", audioBlob, "recording.webm");

          abortControllerRef.current = new AbortController();

          const backendUrl =
            process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
          const response = await fetch(`${backendUrl}/voice/stt`, {
            method: "POST",
            body: formData,
            signal: abortControllerRef.current.signal,
          });

          if (response.ok) {
            const data = await response.json();
            if (data.text) {
              setInput((prev) => (prev + " " + data.text).trim());
            }
          } else {
            console.error("STT API returned an error");
          }
        } catch (error: any) {
          if (error.name === "AbortError") {
            console.log("STT aborted by user");
          } else {
            console.error("Error processing audio:", error);
          }
        } finally {
          setIsProcessingAudio(false);
          // Stop all tracks to release microphone
          stream.getTracks().forEach((track) => track.stop());
        }
      });

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const stopTTS = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingMessageId(null);
  };

  const playTTS = async (text: string, messageId: string) => {
    // If another audio is playing, stop it first
    stopTTS();

    setFetchingMessageId(messageId);
    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const response = await fetch(`${backendUrl}/voice/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error("Failed to fetch TTS");
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => setPlayingMessageId(null);
      audio.onpause = () => setPlayingMessageId(null);

      audioRef.current = audio;
      audio.play();
      setPlayingMessageId(messageId);
    } catch (error) {
      console.error("TTS error:", error);
      setPlayingMessageId(null);
    } finally {
      setFetchingMessageId(null);
    }
  };

  return (
    <div className="flex flex-col h-[500px] lg:h-full w-full bg-[#0A0A0A] border border-neutral-800/50 rounded-2xl overflow-hidden shadow-2xl">
      <div className="p-4 border-b border-neutral-800/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-neutral-900 rounded-lg border border-neutral-800">
            <Cpu className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-white tracking-wide">
              Richard Feynman
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest">
                Active
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
            <Cpu className="w-10 h-10 text-white" />
            <p className="text-xs text-neutral-400 max-w-xs font-mono uppercase tracking-widest">
              Awaiting Input
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`flex items-start gap-3 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              <div
                className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-1 ${
                  msg.role === "user"
                    ? "bg-neutral-800 text-neutral-400"
                    : "bg-white text-black"
                }`}>
                {msg.role === "user" ? (
                  <User className="w-3 h-3" />
                ) : (
                  <Cpu className="w-3 h-3" />
                )}
              </div>
              <div
                className={`p-3.5 ${
                  msg.role === "user"
                    ? "bg-neutral-900 text-neutral-200 rounded-2xl rounded-tr-sm border border-neutral-800"
                    : "bg-transparent text-neutral-300 rounded-2xl rounded-tl-sm border border-neutral-800/50"
                }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </p>
                {msg.role === "assistant" && (
                  <button
                    onClick={() =>
                      playingMessageId === msg.id ? stopTTS() : playTTS(msg.content, msg.id)
                    }
                    disabled={fetchingMessageId === msg.id}
                    className="mt-3 text-[10px] uppercase tracking-widest text-neutral-500 hover:text-white transition-colors flex items-center gap-1.5 disabled:opacity-30 font-medium">
                    {fetchingMessageId === msg.id ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" /> Fetching
                        Audio
                      </>
                    ) : playingMessageId === msg.id ? (
                      <>
                        <VolumeX className="w-3 h-3" /> Stop Audio
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3 h-3" /> Play Audio
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-center gap-3 max-w-[85%] flex-row">
              <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-1 bg-white text-black opacity-50">
                <Cpu className="w-3 h-3" />
              </div>
              <div className="p-4 bg-transparent border border-neutral-800/50 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-neutral-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-neutral-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-neutral-600 rounded-full animate-bounce"></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-[#0A0A0A] border-t border-neutral-800/50">
        <div className="flex items-end gap-3">
          <button
            onClick={toggleRecording}
            className={`h-[48px] w-[48px] flex items-center justify-center rounded-xl transition-all flex-shrink-0 ${
              isRecording
                ? "bg-white text-black animate-pulse"
                : isProcessingAudio
                  ? "bg-neutral-800 text-neutral-400 border border-neutral-700 animate-pulse"
                  : "bg-transparent text-neutral-500 hover:text-white border border-neutral-800 hover:bg-neutral-900"
            }`}
            title={
              isProcessingAudio
                ? "Stop Processing"
                : isRecording
                  ? "Stop Recording"
                  : "Start Recording"
            }>
            {isRecording ? (
              <Mic className="w-4 h-4" />
            ) : isProcessingAudio ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MicOff className="w-4 h-4" />
            )}
          </button>

          <div className="flex-1 relative flex flex-col justify-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                isProcessingAudio ? "Transcribing..." : "Type a message..."
              }
              className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl px-4 py-3.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors resize-none min-h-[48px] max-h-[120px]"
              rows={1}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping || isProcessingAudio}
            className="h-[48px] w-[48px] flex items-center justify-center bg-white text-black rounded-xl hover:bg-neutral-200 disabled:opacity-30 disabled:hover:bg-white disabled:cursor-not-allowed transition-colors flex-shrink-0">
            {isTyping ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
