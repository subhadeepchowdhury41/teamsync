import { router } from "./trpc";
import { projectRouter } from "./routers/project";
import { dashboardRouter } from "./routers/dashboard";
import { commentRouter } from "./routers/comment";
import { userRouter } from "./routers/user";
import { authRouter } from "./routers/auth";
import { taskRouter } from "./routers/task";
import { tagRouter } from "./routers/tag";

export const appRouter = router({
  project: projectRouter,
  dashboard: dashboardRouter,
  comment: commentRouter,
  user: userRouter,
  auth: authRouter,
  task: taskRouter,
  tag: tagRouter,
});

export type AppRouter = typeof appRouter;
