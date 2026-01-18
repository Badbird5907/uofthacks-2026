import { db } from "@/server/db";
import { candidateProfile } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export type OnboardingStatus = {
  isComplete: boolean;
  needsRoleSelection: boolean;
  needsCandidateProfile: boolean;
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
      isRecruiter: null,
    };
  }

  // Step 2: If recruiter, onboarding is complete
  if (isRecruiter === true) {
    return {
      isComplete: true,
      needsRoleSelection: false,
      needsCandidateProfile: false,
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
      isRecruiter: false,
    };
  }

  return {
    isComplete: true,
    needsRoleSelection: false,
    needsCandidateProfile: false,
    isRecruiter: false,
  };
}
