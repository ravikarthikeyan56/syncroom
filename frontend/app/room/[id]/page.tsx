"use client";
import VideoPlayer from "@/components/VideoPlayer";
import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getSocket } from "@/lib/socket";
import Slideshow from "@/components/Slideshow";
interface Message {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string };
}

export default function RoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [userId, setUserId] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (!token || !storedUser) {
      router.push("/login");
      return;
    }
    setUserId(JSON.parse(storedUser).id);

    // Fetch message history first
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/rooms/${roomId}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.messages) setMessages(data.messages);
      })
      .catch((err) => console.error("Failed to load messages", err))
      .finally(() => setLoading(false));

    const socket = getSocket();
    socket.connect();

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join-room", roomId);
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("new-message", (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.off("new-message");
      socket.disconnect();
    };
  }, [router, roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    const socket = getSocket();
    socket.emit("send-message", {
      roomId,
      userId,
      content: input,
    });

    setInput("");
  }

  if (loading) return null;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 p-8">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
        <button
          onClick={() => router.push("/dashboard")}
          className="mb-4 text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back to dashboard
        </button>

        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Room {roomId}</h1>
          <span
            className={`text-sm ${connected ? "text-green-600" : "text-red-600"}`}
          >
            {connected ? "● Connected" : "● Disconnected"}
          </span>
        </div>
        <div className="mb-4">
          <VideoPlayer roomId={roomId} />
          <div className="mb-4">
            <Slideshow roomId={roomId} />
          </div>
        </div>
        <div className="flex flex-1 flex-col rounded-lg bg-white shadow">
          <div
            className="flex-1 space-y-3 overflow-y-auto p-4"
            style={{ maxHeight: "400px" }}
          >
            {messages.length === 0 ? (
              <p className="text-sm text-gray-400">
                No messages yet — say hello!
              </p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={
                    msg.user.id === userId ? "text-right" : "text-left"
                  }
                >
                  <p className="text-xs text-gray-500">{msg.user.name}</p>
                  <p
                    className={`inline-block rounded-lg px-3 py-2 text-sm ${
                      msg.user.id === userId
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    {msg.content}
                  </p>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={handleSend}
            className="flex gap-2 border-t border-gray-200 p-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
