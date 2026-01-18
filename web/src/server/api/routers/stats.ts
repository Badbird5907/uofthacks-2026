import { createTRPCRouter, protectedProcedure } from "../trpc";
import { organizationMembers } from "@/server/db/schema";
import { TRPCError } from "@trpc/server";

export const statsRouter = createTRPCRouter({
	get: protectedProcedure.query(async ({ ctx }) => {
    const member = await ctx.db.query.organizationMembers.findFirst({
      where: (organizationMembers, { eq }) => eq(organizationMembers.userId, ctx.session.user.id),
      with: {
        organization: true,
      },
    });
    if (!member || !member.organization) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Organization not found",
      });
    }

    // open job postings, num candidates, num interviews, num shortlisted
    return {}
    
	}),
});