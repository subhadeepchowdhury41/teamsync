import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth";
import { db } from "@/server/db-serverless";
import { IncomingForm, File, Fields, Files } from "formidable";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Disable the default body parser to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // POST - Upload avatar
  if (req.method === "POST") {
    try {
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), "public", "uploads", "avatars");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Parse the incoming form data
      const form = new IncomingForm({
        uploadDir: uploadsDir,
        keepExtensions: true,
        maxFileSize: 5 * 1024 * 1024, // 5MB
      });

      return new Promise((resolve, reject) => {
        form.parse(req, async (err: Error | null, fields: Fields, files: Files) => {
          if (err) {
            console.error("Error parsing form:", err);
            res.status(500).json({ error: "Failed to upload avatar" });
            return resolve(undefined);
          }

          try {
            const file = files.avatar?.[0];
            if (!file) {
              res.status(400).json({ error: "No file uploaded" });
              return resolve(undefined);
            }

            // Generate a unique filename
            const fileExt = path.extname(file.originalFilename || "");
            const fileName = `${session.user.id}-${uuidv4()}${fileExt}`;
            const newPath = path.join(uploadsDir, fileName);

            // Rename the file to use our generated filename
            fs.renameSync(file.filepath, newPath);

            // Generate the public URL for the avatar
            const avatarUrl = `/uploads/avatars/${fileName}`;

            // Update the user's avatar URL in the database
            const now = new Date().toISOString();
            await db.$executeRaw`
              UPDATE "User"
              SET image = ${avatarUrl},
                  updated_at = ${now}::timestamp
              WHERE id = ${session.user.id}
            `;

            res.status(200).json({ avatarUrl });
            return resolve(undefined);
          } catch (error) {
            console.error("Error handling avatar upload:", error);
            res.status(500).json({ error: "Failed to process avatar upload" });
            return resolve(undefined);
          }
        });
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      return res.status(500).json({ error: "Failed to upload avatar" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
