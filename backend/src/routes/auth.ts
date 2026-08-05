import bcrypt from "bcrypt";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../db";
import { AppError } from "../middleware/errorHandler";

export const authRouter = Router();

const signupSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, hyphens only"),
  email: z.email(),
  password: z.string().min(8),
});

authRouter.post("/signup", async (req, res, next) => {
  try {
    const { username, email, password } = signupSchema.parse(req.body);

    const existing = await prisma.host.findFirst({
      where: { OR: [{ username }, { email }] },
    });
    if (existing) throw new AppError("Username or email already taken", 409);

    const passwordHash = await bcrypt.hash(password, 12);

    const host = await prisma.host.create({
      data: {
        username,
        email,
        passwordHash,
        availability: {
          mon: [["09:00", "17:00"]],
          tue: [["09:00", "17:00"]],
          wed: [["09:00", "17:00"]],
          thu: [["09:00", "17:00"]],
          fri: [["09:00", "17:00"]],
        },
        slotDurationMins: 30,
      },
    });

    const token = signToken(host.id);
    res.status(201).json({ token, host: { id: host.id, username: host.username } });
  } catch (err) {
    next(err);
  }
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string(),
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const host = await prisma.host.findUnique({ where: { email } });
    if (!host) throw new AppError("Invalid credentials", 401);

    const valid = await bcrypt.compare(password, host.passwordHash);
    if (!valid) throw new AppError("Invalid credentials", 401);

    const token = signToken(host.id);
    res.json({ token, host: { id: host.id, username: host.username } });
  } catch (err) {
    next(err);
  }
});

function signToken(hostId: string) {
  return jwt.sign({ hostId }, process.env.JWT_SECRET!, { expiresIn: "7d" });
}