import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { prisma } from "../db/prisma.js";
import type { Role } from "../generated/prisma/client.js";

export interface AuthUser {
  sub: number;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.cookies?.token;
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  let userId: number;
  try {
    const payload = jwt.verify(token, config.jwtSecret) as unknown as {
      sub?: string;
    };
    userId = Number(payload.sub);
  } catch {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }

  req.user = { sub: user.id, role: user.role };
  next();
}

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (req.user && roles.includes(req.user.role)) {
      next();
      return;
    }
    res.status(403).json({ error: "Forbidden" });
  };
