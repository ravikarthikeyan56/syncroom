"use client";

import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";

interface SlideshowProps {
  roomId: string;
}

export default function Slideshow({ roomId }: SlideshowProps) {
  const [slides, setSlides] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [urlInput, setUrlInput] = useState("");
  const [pendingSlides, setPendingSlides] = useState<string[]>([]);

  useEffect(() => {
    const socket = getSocket();

    socket.on(
      "media-state",
      (state: {
        mediaType: string;
        mediaUrl: string | null;
        slideIndex: number;
      }) => {
        if (state.mediaType === "slideshow" && state.mediaUrl) {
          setSlides(JSON.parse(state.mediaUrl));
          setCurrentIndex(state.slideIndex);
        }
      },
    );

    socket.on("slide-change", (data: { slideIndex: number }) => {
      setCurrentIndex(data.slideIndex);
    });

    return () => {
      socket.off("media-state");
      socket.off("slide-change");
    };
  }, [roomId]);

  function handleAddSlide(e: React.FormEvent) {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setPendingSlides((prev) => [...prev, urlInput]);
    setUrlInput("");
  }

  function handlePublishSlideshow() {
    if (pendingSlides.length === 0) return;
    const socket = getSocket();
    socket.emit("set-slideshow", { roomId, slides: pendingSlides });
    setPendingSlides([]);
  }

  function goToSlide(index: number) {
    if (index < 0 || index >= slides.length) return;
    setCurrentIndex(index);
    const socket = getSocket();
    socket.emit("slide-change", { roomId, slideIndex: index });
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      {slides.length === 0 ? (
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">
            Build a slideshow (paste image URLs)
          </p>
          <form onSubmit={handleAddSlide} className="mb-2 flex gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Image URL"
              className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Add
            </button>
          </form>
          {pendingSlides.length > 0 && (
            <div>
              <p className="mb-2 text-xs text-gray-500">
                {pendingSlides.length} slide(s) added
              </p>
              <button
                onClick={handlePublishSlideshow}
                className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Start slideshow for everyone
              </button>
            </div>
          )}
        </div>
      ) : (
        <div>
          <img
            src={slides[currentIndex]}
            alt={`Slide ${currentIndex + 1}`}
            className="w-full rounded"
            style={{ maxHeight: "400px", objectFit: "contain" }}
          />
          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={() => goToSlide(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 disabled:opacity-50"
            >
              ← Previous
            </button>
            <span className="text-sm text-gray-500">
              {currentIndex + 1} / {slides.length}
            </span>
            <button
              onClick={() => goToSlide(currentIndex + 1)}
              disabled={currentIndex === slides.length - 1}
              className="rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
