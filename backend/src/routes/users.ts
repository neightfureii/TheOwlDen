import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { HttpError, idParam, prismaCode } from "../lib/http.js";
import { Role } from "../generated/prisma/client.js";

const router = Router();
const ROLES: string[] = Object.values(Role);

router.use(requireAuth, requireRole("admin"));

router.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });
  res.json({ users });
});

router.patch("/:id", async (req, res) => {
  const id = idParam(req.params.id);
  if (id === req.user!.sub) {
    throw new HttpError(400, "You can't change your own role or status");
  }
  const { role, isActive } = req.body ?? {};
  if (role !== undefined && !ROLES.includes(role))
    throw new HttpError(400, "Invalid role");
  if (isActive !== undefined && typeof isActive !== "boolean") {
    throw new HttpError(400, "isActive must be true or false");
  }
  try {
    const user = await prisma.user.update({
      where: { id },
      data: { role, isActive },
      select: { id: true, role: true, isActive: true },
    });
    res.json({ user });
  } catch (err) {
    if (prismaCode(err) === "P2025") throw new HttpError(404, "User not found");
    throw err;
  }
});

export default router;
