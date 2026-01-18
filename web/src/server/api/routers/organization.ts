import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
	organization,
	organizationJoinCodes,
	organizationMembers,
} from "@/server/db/schema";

export const organizationRouter = createTRPCRouter({
	create: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1, "Organization name is required"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const now = new Date();

			// Check if user is a recruiter
			if (!ctx.session.user.isRecruiter) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only recruiters can create organizations",
				});
			}

			// Check if user already belongs to an organization
			const existingMembership = await ctx.db.query.organizationMembers.findFirst(
				{
					where: eq(organizationMembers.userId, ctx.session.user.id),
				},
			);

			if (existingMembership) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "You are already a member of an organization",
				});
			}

			// Create the organization
			const [newOrg] = await ctx.db
				.insert(organization)
				.values({
					name: input.name,
					createdAt: now,
					updatedAt: now,
				})
				.returning();

			if (!newOrg) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create organization",
				});
			}

			// Add the user as an admin member
			await ctx.db.insert(organizationMembers).values({
				organizationId: newOrg.id,
				userId: ctx.session.user.id,
				role: "admin",
				createdAt: now,
				updatedAt: now,
			});

			return { success: true, organizationId: newOrg.id };
		}),

	joinWithCode: protectedProcedure
		.input(
			z.object({
				code: z.string().length(4, "Code must be 4 digits"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const now = new Date();

			// Check if user is a recruiter
			if (!ctx.session.user.isRecruiter) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only recruiters can join organizations",
				});
			}

			// Check if user already belongs to an organization
			const existingMembership = await ctx.db.query.organizationMembers.findFirst(
				{
					where: eq(organizationMembers.userId, ctx.session.user.id),
				},
			);

			if (existingMembership) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "You are already a member of an organization",
				});
			}

			// Find the join code
			const joinCode = await ctx.db.query.organizationJoinCodes.findFirst({
				where: eq(organizationJoinCodes.code, input.code),
			});

			if (!joinCode) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Invalid join code",
				});
			}

			// Add the user as a member
			await ctx.db.insert(organizationMembers).values({
				organizationId: joinCode.organizationId,
				userId: ctx.session.user.id,
				role: "member",
				createdAt: now,
				updatedAt: now,
			});

			return { success: true, organizationId: joinCode.organizationId };
		}),
});
