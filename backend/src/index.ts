import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import authRoutes from "./routes/auth";
import roomRoutes from "./routes/rooms";
import { prisma } from "./lib/prisma";
dotenv.config();

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "http://localhost:3000" },
});

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "SyncRoom backend is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("join-room", (roomId: string) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });

  socket.on(
    "send-message",
    async (data: { roomId: string; userId: string; content: string }) => {
      try {
        const message = await prisma.message.create({
          data: {
            content: data.content,
            userId: data.userId,
            roomId: data.roomId,
          },
          include: { user: { select: { id: true, name: true } } },
        });

        io.to(data.roomId).emit("new-message", message);
      } catch (error) {
        console.error("Send message error:", error);
      }
    },
  );

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
  });
  socket.on("set-video", async (data: { roomId: string; mediaUrl: string }) => {
    try {
      const mediaState = await prisma.mediaState.upsert({
        where: { roomId: data.roomId },
        update: {
          mediaType: "video",
          mediaUrl: data.mediaUrl,
          isPlaying: false,
          currentTime: 0,
        },
        create: {
          roomId: data.roomId,
          mediaType: "video",
          mediaUrl: data.mediaUrl,
        },
      });
      io.to(data.roomId).emit("media-state", mediaState);
    } catch (error) {
      console.error("Set video error:", error);
    }
  });

  socket.on(
    "media-play",
    async (data: { roomId: string; currentTime: number }) => {
      try {
        await prisma.mediaState.update({
          where: { roomId: data.roomId },
          data: { isPlaying: true, currentTime: data.currentTime },
        });
        socket
          .to(data.roomId)
          .emit("media-play", { currentTime: data.currentTime });
      } catch (error) {
        console.error("Media play error:", error);
      }
    },
  );

  socket.on(
    "media-pause",
    async (data: { roomId: string; currentTime: number }) => {
      try {
        await prisma.mediaState.update({
          where: { roomId: data.roomId },
          data: { isPlaying: false, currentTime: data.currentTime },
        });
        socket
          .to(data.roomId)
          .emit("media-pause", { currentTime: data.currentTime });
      } catch (error) {
        console.error("Media pause error:", error);
      }
    },
  );

  socket.on(
    "media-seek",
    async (data: { roomId: string; currentTime: number }) => {
      try {
        await prisma.mediaState.update({
          where: { roomId: data.roomId },
          data: { currentTime: data.currentTime },
        });
        socket
          .to(data.roomId)
          .emit("media-seek", { currentTime: data.currentTime });
      } catch (error) {
        console.error("Media seek error:", error);
      }
    },
  );

  socket.on("get-media-state", async (roomId: string) => {
    try {
      const mediaState = await prisma.mediaState.findUnique({
        where: { roomId },
      });
      if (mediaState) {
        socket.emit("media-state", mediaState);
      }
    } catch (error) {
      console.error("Get media state error:", error);
    }
  });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
