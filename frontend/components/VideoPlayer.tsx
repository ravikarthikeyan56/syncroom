"use client";

import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";

interface VideoPlayerProps {
  roomId: string;
}

export default function VideoPlayer({ roomId }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const ignoreNextEvent = useRef(false);

  useEffect(() => {
    const socket = getSocket();

    socket.on(
      "media-state",
      (state: {
        mediaUrl: string | null;
        isPlaying: boolean;
        currentTime: number;
      }) => {
        if (state.mediaUrl) setVideoUrl(state.mediaUrl);
        const video = videoRef.current;
        if (!video) return;

        ignoreNextEvent.current = true;
        video.currentTime = state.currentTime;
        if (state.isPlaying) video.play();
        else video.pause();
      },
    );

    socket.on("media-play", (data: { currentTime: number }) => {
      const video = videoRef.current;
      if (!video) return;
      ignoreNextEvent.current = true;
      video.currentTime = data.currentTime;
      video.play();
    });

    socket.on("media-pause", (data: { currentTime: number }) => {
      const video = videoRef.current;
      if (!video) return;
      ignoreNextEvent.current = true;
      video.currentTime = data.currentTime;
      video.pause();
    });

    socket.on("media-seek", (data: { currentTime: number }) => {
      const video = videoRef.current;
      if (!video) return;
      ignoreNextEvent.current = true;
      video.currentTime = data.currentTime;
    });

    socket.emit("get-media-state", roomId);

    return () => {
      socket.off("media-state");
      socket.off("media-play");
      socket.off("media-pause");
      socket.off("media-seek");
    };
  }, [roomId]);

  function handleSetVideo(e: React.FormEvent) {
    e.preventDefault();
    if (!urlInput.trim()) return;
    const socket = getSocket();
    socket.emit("set-video", { roomId, mediaUrl: urlInput });
    setUrlInput("");
  }

  function handlePlay() {
    if (ignoreNextEvent.current) {
      ignoreNextEvent.current = false;
      return;
    }
    const socket = getSocket();
    socket.emit("media-play", {
      roomId,
      currentTime: videoRef.current?.currentTime || 0,
    });
  }

  function handlePause() {
    if (ignoreNextEvent.current) {
      ignoreNextEvent.current = false;
      return;
    }
    const socket = getSocket();
    socket.emit("media-pause", {
      roomId,
      currentTime: videoRef.current?.currentTime || 0,
    });
  }

  function handleSeeked() {
    if (ignoreNextEvent.current) {
      ignoreNextEvent.current = false;
      return;
    }
    const socket = getSocket();
    socket.emit("media-seek", {
      roomId,
      currentTime: videoRef.current?.currentTime || 0,
    });
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <form onSubmit={handleSetVideo} className="mb-3 flex gap-2">
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="Paste a direct video URL (.mp4)"
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Load
        </button>
      </form>

      {videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          className="w-full rounded"
          onPlay={handlePlay}
          onPause={handlePause}
          onSeeked={handleSeeked}
        />
      ) : (
        <p className="py-12 text-center text-sm text-gray-400">
          No video loaded — paste a URL above
        </p>
      )}
    </div>
  );
}
