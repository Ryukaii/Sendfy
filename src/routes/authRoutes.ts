// src/routes/authRoutes.ts
import express, { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import redisClient from "../utils/redisClient";

const router = express.Router();

// Rota de Registro
router.post("/register", async (req: Request, res: Response) => {
  const { username, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) throw new Error("Email already in use");

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({ username, email, password: hashedPassword });
  await newUser.save();

  const token = jwt.sign(
    { userId: newUser._id },
    process.env.JWT_SECRET as string,
    { expiresIn: "1h" },
  );
  await redisClient.set(newUser._id.toString(), token, { EX: 3600 });

  res.status(201).json({ token });
});

// Rota de Login
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new Error("Invalid email or password");
  }

  const token = jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET as string,
    { expiresIn: "1h" },
  );
  await redisClient.set(user._id.toString(), token, { EX: 3600 });

  res.json({ token });
});

export default router;
