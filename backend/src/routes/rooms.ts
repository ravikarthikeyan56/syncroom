import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1 — avoids confusion
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Create a room
router.post("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Room name is required" });
    }

    let code = generateRoomCode();
    let existing = await prisma.room.findUnique({ where: { code } });
    while (existing) {
      code = generateRoomCode();
      existing = await prisma.room.findUnique({ where: { code } });
    }

    const room = await prisma.room.create({
      data: {
        name,
        code,
        hostId: req.userId!,
        members: {
          create: { userId: req.userId! },
        },
      },
      include: { members: true },
    });

    res.status(201).json({ room });
  } catch (error) {
    console.error("Create room error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Join a room
router.post("/join", authenticate, async (req: AuthRequest, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Room code is required" });
    }

    const room = await prisma.room.findUnique({ where: { code } });
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    const existingMember = await prisma.roomMember.findUnique({
      where: { userId_roomId: { userId: req.userId!, roomId: room.id } },
    });

    if (existingMember) {
      return res.json({ room }); // already a member, just let them back in
    }

    await prisma.roomMember.create({
      data: { userId: req.userId!, roomId: room.id },
    });

    res.json({ room });
  } catch (error) {
    console.error("Join room error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Get rooms the user belongs to
router.get("/mine", authenticate, async (req: AuthRequest, res) => {
  try {
    const memberships = await prisma.roomMember.findMany({
      where: { userId: req.userId! },
      include: { room: true },
    });

    const rooms = memberships.map((m) => m.room);
    res.json({ rooms });
  } catch (error) {
    console.error("Get rooms error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});
router.get("/:roomId/messages", authenticate, async (req: AuthRequest, res) => {
  try {
    const roomId = req.params.roomId as string;

    const membership = await prisma.roomMember.findUnique({
      where: { userId_roomId: { userId: req.userId!, roomId } },
    });

    if (!membership) {
      return res
        .status(403)
        .json({ error: "You are not a member of this room" });
    }

    const messages = await prisma.message.findMany({
      where: { roomId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });

    res.json({ messages });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

export default router;
