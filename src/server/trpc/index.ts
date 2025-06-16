import { router } from "./trpc";
import { projectRouter } from "./routers/project";
import { dashboardRouter } from "./routers/dashboard";
import { commentRouter } from "./routers/comment";
import { userRouter } from "./routers/user";
import { taskRouter } from "./routers/task";

export const appRouter = router({
  project: projectRouter,
  dashboard: dashboardRouter,
  comment: commentRouter,
  user: userRouter,
  task: taskRouter,
});

export type AppRouter = typeof appRouter;
