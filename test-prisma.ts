import { db } from "./src/server/db";

// Log available models on the Prisma client
console.log("Available models:", Object.keys(db));
