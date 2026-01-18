import { db } from "@/server/db";
import { candidateProfile, organizationMembers } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export type OnboardingStatus = {
  isComplete: boolean;
  needsRoleSelection: boolean;
  needsCandidateProfile: boolean;
  needsRecruiterOrg: boolean;
  isRecruiter: boolean | null;
};

export async function getOnboardingStatus(user: {
  id: string;
  isRecruiter?: boolean | null;
}): Promise<OnboardingStatus> {
  const isRecruiter = user.isRecruiter ?? null;
  
  // Step 1: Check if role is selected
  if (isRecruiter === null) {
    return {
      isComplete: false,
      needsRoleSelection: true,
      needsCandidateProfile: false,
      needsRecruiterOrg: false,
      isRecruiter: null,
    };
  }

  // Step 2: If recruiter, check if they have an organization
  if (isRecruiter === true) {
    const membership = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, user.id),
    });

    if (!membership) {
      return {
        isComplete: false,
        needsRoleSelection: false,
        needsCandidateProfile: false,
        needsRecruiterOrg: true,
        isRecruiter: true,
      };
    }

    return {
      isComplete: true,
      needsRoleSelection: false,
      needsCandidateProfile: false,
      needsRecruiterOrg: false,
      isRecruiter: true,
    };
  }

  // Step 3: If candidate, check if profile exists
  const profile = await db.query.candidateProfile.findFirst({
    where: eq(candidateProfile.userId, user.id),
  });

  if (!profile) {
    return {
      isComplete: false,
      needsRoleSelection: false,
      needsCandidateProfile: true,
      needsRecruiterOrg: false,
      isRecruiter: false,
    };
  }

  return {
    isComplete: true,
    needsRoleSelection: false,
    needsCandidateProfile: false,
    needsRecruiterOrg: false,
    isRecruiter: false,
  };
}
