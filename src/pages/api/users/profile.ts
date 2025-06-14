import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth";
import { db } from "@/server/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // GET - Fetch user profile
  if (req.method === "GET") {
    try {
      // Define type for our SQL query result
      type UserProfile = {
        id: string;
        name: string;
        email: string;
        avatar_url: string | null;
      };
      
      // Fetch user profile using raw SQL
      const users = await db.$queryRaw<UserProfile[]>`
        SELECT id, name, email, image as avatar_url
        FROM "User"
        WHERE id = ${session.user.id}
      `;

      if (!users || users.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      return res.status(200).json(users[0]);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return res.status(500).json({ error: "Failed to fetch user profile" });
    }
  }

  // PUT - Update user profile
  if (req.method === "PUT") {
    try {
      const { name, avatar_url } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }

      const now = new Date().toISOString();

      // Update user profile using raw SQL
      await db.$executeRaw`
        UPDATE "User"
        SET name = ${name},
            image = ${avatar_url || null},
            updated_at = ${now}::timestamp
        WHERE id = ${session.user.id}
      `;

      // Fetch updated user profile
      type UserProfile = {
        id: string;
        name: string;
        email: string;
        avatar_url: string | null;
      };
      
      const updatedUser = await db.$queryRaw<UserProfile[]>`
        SELECT id, name, email, image as avatar_url
        FROM "User"
        WHERE id = ${session.user.id}
      `;

      return res.status(200).json(updatedUser[0]);
    } catch (error) {
      console.error("Error updating user profile:", error);
      return res.status(500).json({ error: "Failed to update user profile" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
