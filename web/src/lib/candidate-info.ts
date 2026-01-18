import { db } from "@/server/db";

export const getCandidateInfo = async (userId: string) => {
  const user = await db.query.candidateProfile.findFirst({
    where: (candidateProfile, { eq }) => eq(candidateProfile.userId, userId),
    with: {
      user: true,
      jobHistory: true,
      education: true,
    }
  })
  if (!user) {
    throw new Error("User not found");
  }
  
  return user;
}