import { onboardingRouter } from "@/server/api/routers/onboarding";
import { organizationRouter } from "@/server/api/routers/organization";
import { jobPostingRouter } from "@/server/api/routers/jobPosting";
import { applicantResponseRouter } from "@/server/api/routers/applicantResponse";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { statsRouter } from "./routers/stats";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
	onboarding: onboardingRouter,
	organization: organizationRouter,
	jobPosting: jobPostingRouter,
	applicantResponse: applicantResponseRouter,
	stats: statsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
