import { Router, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db/prisma.js";
import { config } from "../config.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError, optText, prismaCode } from "../lib/http.js";
import type { User } from "../generated/prisma/client.js";

const router = Router();

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: config.isProd,
  maxAge: 8 * 60 * 60 * 1000,
};

const publicUser = (u: User) => ({
  id: u.id,
  email: u.email,
  username: u.username,
  displayName: u.displayName,
  bio: u.bio,
  role: u.role,
});

function startSession(res: Response, user: User) {
  const token = jwt.sign({ sub: String(user.id) }, config.jwtSecret, {
    expiresIn: "8h",
  });
  res.cookie("token", token, cookieOpts);
}

router.post("/register", async (req, res) => {
  const { email, username, displayName, password } = req.body ?? {};
  if (
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    throw new HttpError(400, "A valid email is required");
  }
  if (typeof username !== "string" || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    throw new HttpError(
      400,
      "Username must be 3-20 letters, numbers or underscores",
    );
  }
  if (
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 72
  ) {
    throw new HttpError(400, "Password must be 8-72 characters");
  }
  const name = optText(displayName, "Display name", 60) ?? username;
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        username: username.toLowerCase(),
        displayName: name,
        passwordHash,
      },
    });
    startSession(res, user);
    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    if (prismaCode(err) === "P2002")
      throw new HttpError(409, "Email or username already taken");
    throw err;
  }
});

router.post("/login", async (req, res) => {
  const { identifier, password } = req.body ?? {};
  if (
    typeof identifier !== "string" ||
    typeof password !== "string" ||
    !identifier ||
    !password
  ) {
    throw new HttpError(400, "Email/username and password required");
  }
  const id = identifier.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: id }, { username: id }] },
  });
  const ok =
    user &&
    user.isActive &&
    (await bcrypt.compare(password, user.passwordHash));
  if (!user || !ok) throw new HttpError(401, "Invalid credentials");

  startSession(res, user);
  res.json({ user: publicUser(user) });
});

router.post("/logout", (_req, res) => {
  res
    .clearCookie("token", { ...cookieOpts, maxAge: undefined })
    .json({ ok: true });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
  if (!user) throw new HttpError(401, "User not found");
  res.json({ user: publicUser(user) });
});

router.patch("/me", requireAuth, async (req, res) => {
  const displayName = optText(req.body?.displayName, "Display name", 60);
  if (displayName === null)
    throw new HttpError(400, "Display name cannot be empty");
  const bio = optText(req.body?.bio, "Bio", 500);
  const user = await prisma.user.update({
    where: { id: req.user!.sub },
    data: { displayName, bio },
  });
  res.json({ user: publicUser(user) });
});

export default router;
