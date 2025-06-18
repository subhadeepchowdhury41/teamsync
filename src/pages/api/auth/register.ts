import { NextApiRequest, NextApiResponse } from "next";
import { hash } from "bcrypt";
import { db } from "@/server/db-serverless";
import { z } from "zod";

const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Validate the request body
    const { name, email, password } = userSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" });
    }

    // Hash the password
    const hashedPassword = await hash(password, 12);

    // Create the user
    const user = await db.user.create({
      data: {
        name,
        email,
        hashedPassword,
      } as any, // Using type assertion to bypass Prisma type issue
    });

    // Ensure we have valid user data before returning
    if (!user?.id) {
      return res.status(500).json({ error: "Failed to create user" });
    }

    return res.status(201).json({
      user: {
        id: user.id,
        name: user.name || "",
        email: user.email || "",
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error?.errors?.[0]?.message });
    }
    return res.status(500).json({ error: "Something went wrong" });
  }
}
