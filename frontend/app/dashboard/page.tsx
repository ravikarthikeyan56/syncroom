"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Room {
  id: string;
  name: string;
  code: string;
  hostId: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomName, setRoomName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (!stored || !token) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(stored));
    fetchRooms(token);
  }, [router]);

  async function fetchRooms(token: string) {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/rooms/mine`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      if (res.ok) setRooms(data.rooms);
    } catch (err) {
      console.error("Failed to fetch rooms", err);
    }
  }

  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: roomName }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not create room");
        return;
      }

      router.push(`/room/${data.room.id}`);
    } catch (err) {
      setError("Could not connect to server");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinRoom(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/rooms/join`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code: joinCode.toUpperCase() }),
        },
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not join room");
        return;
      }

      router.push(`/room/${data.room.id}`);
    } catch (err) {
      setError("Could not connect to server");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Welcome, {user.name} 👋
            </h1>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Log out
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <form
            onSubmit={handleCreateRoom}
            className="rounded-lg bg-white p-5 shadow"
          >
            <h2 className="mb-3 text-sm font-medium text-gray-900">
              Create a room
            </h2>
            <input
              type="text"
              placeholder="Room name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              required
              className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Create
            </button>
          </form>

          <form
            onSubmit={handleJoinRoom}
            className="rounded-lg bg-white p-5 shadow"
          >
            <h2 className="mb-3 text-sm font-medium text-gray-900">
              Join a room
            </h2>
            <input
              type="text"
              placeholder="Room code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              required
              className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 uppercase focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              Join
            </button>
          </form>
        </div>

        <div className="rounded-lg bg-white p-5 shadow">
          <h2 className="mb-3 text-sm font-medium text-gray-900">Your rooms</h2>
          {rooms.length === 0 ? (
            <p className="text-sm text-gray-500">
              No rooms yet — create or join one above.
            </p>
          ) : (
            <ul className="space-y-2">
              {rooms.map((room) => (
                <li key={room.id}>
                  <button
                    onClick={() => router.push(`/room/${room.id}`)}
                    className="flex w-full items-center justify-between rounded border border-gray-200 px-3 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    <span className="font-medium text-gray-900">
                      {room.name}
                    </span>
                    <span className="text-gray-400">{room.code}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
