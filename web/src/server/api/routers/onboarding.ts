import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { generateObject } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { env } from "@/env";
import { S3_BUCKET, s3Client } from "@/lib/s3";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { candidateProfile, jobHistory } from "@/server/db/schema";

const google = createGoogleGenerativeAI({
	apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export const candidateProfileSchema = z.object({
	firstName: z.string().min(1, "First name is required"),
	lastName: z.string().min(1, "Last name is required"),
	phone: z.string().min(1, "Phone is required"),
	linkedin: z.string().url("Please enter a valid URL").or(z.literal("")),
	github: z.string().url("Please enter a valid URL").or(z.literal("")),
	twitter: z.string().url("Please enter a valid URL").or(z.literal("")),
	portfolio: z.string().url("Please enter a valid URL").or(z.literal("")),
	resume: z.string().min(1, "Resume is required"),
	extraLinks: z.array(z.string().url()).default([]),
	skills: z.string().min(1, "Skills are required"),
	experience: z.string().min(1, "Experience is required"),
});

export type CandidateProfileInput = z.infer<typeof candidateProfileSchema>;

// Schema for job history item (used in parsing and input)
export const jobHistoryItemSchema = z.object({
	companyName: z.string().min(1, "Company name is required"),
	jobTitle: z.string().min(1, "Job title is required"),
	startDate: z.string().min(1, "Start date is required"),
	endDate: z.string().nullable(),
	description: z.string().min(1, "Description is required"),
});

// Schema with optional ID for existing entries
export const jobHistoryInputSchema = jobHistoryItemSchema.extend({
	id: z.string().optional(),
});

export type JobHistoryItem = z.infer<typeof jobHistoryItemSchema>;
export type JobHistoryInput = z.infer<typeof jobHistoryInputSchema>;

// Schema for AI-parsed resume data
const resumeParseJobHistorySchema = z.object({
	companyName: z.string().describe("Name of the company"),
	jobTitle: z.string().describe("Job title or role"),
	startDate: z.string().describe("Start date (e.g., 'Jan 2020' or '2020')"),
	endDate: z
		.string()
		.nullable()
		.describe("End date (null if current position)"),
	description: z.string().describe("Brief description of responsibilities"),
});

const resumeParseSchema = z.object({
	firstName: z.string().nullable().describe("First name of the candidate"),
	lastName: z.string().nullable().describe("Last name of the candidate"),
	phone: z.string().nullable().describe("Phone number"),
	linkedin: z.string().nullable().describe("LinkedIn profile URL"),
	github: z.string().nullable().describe("GitHub profile URL"),
	twitter: z.string().nullable().describe("Twitter/X profile URL"),
	portfolio: z
		.string()
		.nullable()
		.describe("Personal portfolio or website URL"),
	skills: z
		.string()
		.nullable()
		.describe("Comma-separated list of technical skills"),
	experience: z
		.string()
		.nullable()
		.describe("Brief summary of work experience"),
	jobHistory: z
		.array(resumeParseJobHistorySchema)
		.nullable()
		.describe("List of job history entries from the resume"),
});

export type ParsedResumeData = z.infer<typeof resumeParseSchema>;

export const onboardingRouter = createTRPCRouter({
	getCandidateProfile: protectedProcedure.query(async ({ ctx }) => {
		const profile = await ctx.db.query.candidateProfile.findFirst({
			where: eq(candidateProfile.userId, ctx.session.user.id),
		});
		return profile;
	}),

	getResumeUploadUrl: protectedProcedure
		.input(
			z.object({
				filename: z.string(),
				contentType: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const timestamp = Date.now();
			const sanitizedFilename = input.filename.replace(/[^a-zA-Z0-9.-]/g, "_");
			const key = `resumes/${ctx.session.user.id}/${timestamp}-${sanitizedFilename}`;

			const command = new PutObjectCommand({
				Bucket: S3_BUCKET,
				Key: key,
				ContentType: input.contentType,
			});

			const uploadUrl = await getSignedUrl(s3Client, command, {
				expiresIn: 300, // 5 minutes
			});

			const fileUrl = `https://${env.NEXT_PUBLIC_S3_HOST}/${S3_BUCKET}/${key}`;

			return {
				uploadUrl,
				fileUrl,
				key,
			};
		}),

	parseResume: protectedProcedure
		.input(
			z.object({
				resumeUrl: z.string().url(),
				key: z.string(),
			}),
		)
		.mutation(async ({ input }): Promise<ParsedResumeData> => {
			try {
				// Fetch the PDF from S3
				const command = new GetObjectCommand({
					Bucket: S3_BUCKET,
					Key: input.key,
				});

				const response = await s3Client.send(command);
				const pdfBuffer = await response.Body?.transformToByteArray();

				if (!pdfBuffer) {
					throw new Error("Failed to fetch resume from storage");
				}

				// Convert to base64 for Gemini
				const base64Pdf = Buffer.from(pdfBuffer).toString("base64");

				// Use Gemini Flash to parse the resume
				const { object: output } = await generateObject({
					model: google("gemini-2.0-flash"),
					schema: resumeParseSchema,
					messages: [
						{
							role: "user",
							content: [
								{
									type: "text",
									text: `Extract the following information from this resume PDF. Return null for any fields you cannot find:
- firstName: The candidate's first name
- lastName: The candidate's last name  
- phone: Phone number (format in the format +1 (123) 456-7890)
- linkedin: LinkedIn profile URL if present in the format https://www.linkedin.com/in/johndoe
- github: GitHub profile URL if present in the format https://github.com/johndoe
- twitter: Twitter/X profile URL if present in the format https://x.com/johndoe
- portfolio: Personal website or portfolio URL if present in the format https://johndoe.com
- skills: A comma-separated list of technical skills mentioned
- experience: A brief 1-2 sentence summary of their work experience
- jobHistory: An array of job history entries, each with:
  - companyName: Name of the company
  - jobTitle: Job title or role
  - startDate: Start date (e.g., 'Jan 2020' or '2020')
  - endDate: End date (null if current position)
  - description: Brief description of responsibilities

Be accurate and only extract information that is clearly present in the resume. **FOR ALL URLS, MAKE SURE TO INCLUDE THE HTTPS:// OR HTTP://**.`,
								},
								{
									type: "file",
									data: `data:application/pdf;base64,${base64Pdf}`,
									mediaType: "application/pdf",
								},
							],
						},
					],
				});

				return (
					output ?? {
						firstName: null,
						lastName: null,
						phone: null,
						linkedin: null,
						github: null,
						twitter: null,
						portfolio: null,
						skills: null,
						experience: null,
						jobHistory: null,
					}
				);
			} catch (error) {
				console.error("Error parsing resume:", error);
				// Return empty data on error so user can fill manually
				return {
					firstName: null,
					lastName: null,
					phone: null,
					linkedin: null,
					github: null,
					twitter: null,
					portfolio: null,
					skills: null,
					experience: null,
					jobHistory: null,
				};
			}
		}),

	createCandidateProfile: protectedProcedure
		.input(
			candidateProfileSchema.extend({
				jobHistory: z.array(jobHistoryItemSchema).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const now = new Date();
			const { jobHistory: jobHistoryInput, ...profileData } = input;

			// Check if profile already exists
			const existing = await ctx.db.query.candidateProfile.findFirst({
				where: eq(candidateProfile.userId, ctx.session.user.id),
			});

			let profileId: string;

			if (existing) {
				// Update existing profile
				await ctx.db
					.update(candidateProfile)
					.set({
						...profileData,
						updatedAt: now,
					})
					.where(eq(candidateProfile.userId, ctx.session.user.id));
				profileId = existing.id;

				// Delete existing job history and replace with new
				await ctx.db
					.delete(jobHistory)
					.where(eq(jobHistory.candidateProfileId, existing.id));
			} else {
				// Create new profile
				const [newProfile] = await ctx.db
					.insert(candidateProfile)
					.values({
						userId: ctx.session.user.id,
						...profileData,
						createdAt: now,
						updatedAt: now,
					})
					.returning({ id: candidateProfile.id });
				profileId = newProfile!.id;
			}

			// Insert job history entries if provided
			if (jobHistoryInput && jobHistoryInput.length > 0) {
				await ctx.db.insert(jobHistory).values(
					jobHistoryInput.map((job) => ({
						candidateProfileId: profileId,
						companyName: job.companyName,
						jobTitle: job.jobTitle,
						startDate: job.startDate,
						endDate: job.endDate,
						description: job.description,
						createdAt: now,
						updatedAt: now,
					})),
				);
			}

			return { success: true, profileId };
		}),

	getJobHistory: protectedProcedure.query(async ({ ctx }) => {
		const profile = await ctx.db.query.candidateProfile.findFirst({
			where: eq(candidateProfile.userId, ctx.session.user.id),
		});

		if (!profile) {
			return [];
		}

		const jobs = await ctx.db.query.jobHistory.findMany({
			where: eq(jobHistory.candidateProfileId, profile.id),
		});

		return jobs;
	}),

	addJobHistory: protectedProcedure
		.input(jobHistoryItemSchema)
		.mutation(async ({ ctx, input }) => {
			const profile = await ctx.db.query.candidateProfile.findFirst({
				where: eq(candidateProfile.userId, ctx.session.user.id),
			});

			if (!profile) {
				throw new Error("Candidate profile not found");
			}

			const now = new Date();
			const [newJob] = await ctx.db
				.insert(jobHistory)
				.values({
					candidateProfileId: profile.id,
					...input,
					createdAt: now,
					updatedAt: now,
				})
				.returning();

			return newJob;
		}),

	deleteJobHistory: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const profile = await ctx.db.query.candidateProfile.findFirst({
				where: eq(candidateProfile.userId, ctx.session.user.id),
			});

			if (!profile) {
				throw new Error("Candidate profile not found");
			}

			// Ensure the job history belongs to this user's profile
			const job = await ctx.db.query.jobHistory.findFirst({
				where: eq(jobHistory.id, input.id),
			});

			if (!job || job.candidateProfileId !== profile.id) {
				throw new Error("Job history entry not found");
			}

			await ctx.db.delete(jobHistory).where(eq(jobHistory.id, input.id));

			return { success: true };
		}),
});
