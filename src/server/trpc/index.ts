import { router } from "./trpc";
import { projectsRouter } from "./routers/projects";
import { dashboardRouter } from "./routers/dashboard";
import { commentRouter } from "./routers/comment";
import { userRouter } from "./routers/user";

export const appRouter = router({
  project: projectsRouter,
  dashboard: dashboardRouter,
  comment: commentRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
