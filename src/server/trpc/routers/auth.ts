import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { hash } from "bcrypt";
import { router, publicProcedure } from "../trpc";

export const authRouter = router({
  // Register a new user
  register: publicProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Invalid email address"),
        password: z.string().min(6, "Password must be at least 6 characters"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { name, email, password } = input;

      try {
        // Check if user already exists
        const existingUser = await ctx.db.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Email already in use",
          });
        }

        // Hash the password
        const hashedPassword = await hash(password, 12);

        // Create the user
        const user = await ctx.db.user.create({
          data: {
            name,
            email,
            hashedPassword,
          },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        });

        return {
          id: user.id,
          name: user.name || "",
          email: user.email || "",
          avatar_url: user.image,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        
        console.error("Registration error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create user",
        });
      }
    }),
});
