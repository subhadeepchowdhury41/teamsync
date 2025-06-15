import { router } from "../trpc";
import { projectRouter } from "./project";
import { taskRouter } from "./task";
import { tagRouter } from "./tag";
import { dashboardRouter } from "./dashboard";
import { userRouter } from "./user";
import { notificationRouter } from "./notification";
import { commentRouter } from "./comment";
import { exampleRouter } from "./example";
import { authRouter } from "./auth";

export const appRouter = router({
  project: projectRouter,
  task: taskRouter,
  tag: tagRouter,
  dashboard: dashboardRouter,
  user: userRouter,
  notification: notificationRouter,
  comment: commentRouter,
  example: exampleRouter,
  auth: authRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter;
