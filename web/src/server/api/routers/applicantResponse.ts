import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
	applicantResponse,
	jobPosting,
	organizationMembers,
} from "@/server/db/schema";

const responseStatusSchema = z.enum(["pending", "reviewed", "accepted", "rejected"]);

export type ResponseStatus = z.infer<typeof responseStatusSchema>;

async function getUserOrganization(ctx: {
	db: typeof import("@/server/db").db;
	session: { user: { id: string; isRecruiter?: boolean | null } };
}) {
	if (!ctx.session.user.isRecruiter) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Only recruiters can access responses",
		});
	}

	const membership = await ctx.db.query.organizationMembers.findFirst({
		where: eq(organizationMembers.userId, ctx.session.user.id),
	});

	if (!membership || !membership.organizationId) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "You must belong to an organization to view responses",
		});
	}

	return membership.organizationId;
}

export const applicantResponseRouter = createTRPCRouter({
	list: protectedProcedure
		.input(
			z
				.object({
					status: responseStatusSchema.optional(),
				})
				.optional()
		)
		.query(async ({ ctx, input }) => {
			const organizationId = await getUserOrganization(ctx);

			// Get all job postings for this organization
			const orgJobs = await ctx.db.query.jobPosting.findMany({
				where: eq(jobPosting.organizationId, organizationId),
				columns: { id: true },
			});

			const jobIds = orgJobs.map((j) => j.id);

			if (jobIds.length === 0) {
				return [];
			}

			// Get all responses for those jobs
			const responses = await ctx.db.query.applicantResponse.findMany({
				where: input?.status
					? and(
							eq(applicantResponse.status, input.status),
							// Filter by job IDs in the organization
							// Using a subquery approach since we can't use `in` directly
						)
					: undefined,
				orderBy: (applicantResponse, { desc }) => [
					desc(applicantResponse.createdAt),
				],
				with: {
					candidateProfile: {
						with: {
							user: {
								columns: {
									id: true,
									name: true,
									email: true,
									image: true,
								},
							},
						},
					},
					jobPosting: {
						columns: {
							id: true,
							title: true,
							organizationId: true,
						},
					},
				},
			});

			// Filter to only include responses for jobs in this organization
			const filteredResponses = responses.filter(
				(r) => r.jobPosting.organizationId === organizationId
			);

			// Apply status filter if provided
			if (input?.status) {
				return filteredResponses.filter((r) => r.status === input.status);
			}

			return filteredResponses;
		}),

	getById: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const organizationId = await getUserOrganization(ctx);

			const response = await ctx.db.query.applicantResponse.findFirst({
				where: eq(applicantResponse.id, input.id),
				with: {
					candidateProfile: {
						with: {
							user: {
								columns: {
									id: true,
									name: true,
									email: true,
									image: true,
								},
							},
							jobHistory: true,
							education: true,
						},
					},
					jobPosting: true,
				},
			});

			if (!response) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Response not found",
				});
			}

			// Verify the job belongs to the user's organization
			if (response.jobPosting.organizationId !== organizationId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You do not have access to this response",
				});
			}

			return response;
		}),

	updateStatus: protectedProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				status: responseStatusSchema,
			})
		)
		.mutation(async ({ ctx, input }) => {
			const organizationId = await getUserOrganization(ctx);

			// First verify the response exists and belongs to org
			const existingResponse = await ctx.db.query.applicantResponse.findFirst({
				where: eq(applicantResponse.id, input.id),
				with: {
					jobPosting: {
						columns: {
							organizationId: true,
						},
					},
				},
			});

			if (!existingResponse) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Response not found",
				});
			}

			if (existingResponse.jobPosting.organizationId !== organizationId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You do not have access to this response",
				});
			}

			// Update the status
			const [updated] = await ctx.db
				.update(applicantResponse)
				.set({
					status: input.status,
					updatedAt: new Date(),
				})
				.where(eq(applicantResponse.id, input.id))
				.returning();

			return updated;
		}),
});
