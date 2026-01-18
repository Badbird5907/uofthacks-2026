import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { TRPCError } from "@trpc/server";
import { generateObject } from "ai";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { env } from "@/env";
import { S3_BUCKET, s3Client } from "@/lib/s3";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
	applicantResponse,
	candidateProfile,
	jobPosting,
	organizationMembers,
} from "@/server/db/schema";

const google = createGoogleGenerativeAI({
	apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const workModeSchema = z.enum(["remote", "hybrid", "on-site"]);
const jobTypeSchema = z.enum(["full-time", "part-time", "contract", "internship"]);
const statusSchema = z.enum(["draft", "active", "closed"]);

export type WorkMode = z.infer<typeof workModeSchema>;
export type JobType = z.infer<typeof jobTypeSchema>;
export type JobStatus = z.infer<typeof statusSchema>;

const createJobSchema = z.object({
	title: z.string().min(1, "Title is required"),
	description: z.string().min(1, "Description is required"),
	location: z.string().min(1, "Location is required"),
	workMode: workModeSchema,
	salary: z.string().optional(),
	type: jobTypeSchema,
	status: statusSchema.default("draft"),
	interviewQuestions: z.array(z.string()).min(1, "At least one interview question is required"),
	notes: z.string().optional(),
});

const updateJobSchema = createJobSchema.partial().extend({
	id: z.string().uuid(),
});

async function getUserOrganization(ctx: { db: typeof import("@/server/db").db; session: { user: { id: string; isRecruiter?: boolean | null } } }) {
	if (!ctx.session.user.isRecruiter) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Only recruiters can manage job postings",
		});
	}

	const membership = await ctx.db.query.organizationMembers.findFirst({
		where: eq(organizationMembers.userId, ctx.session.user.id),
	});

	if (!membership || !membership.organizationId) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "You must belong to an organization to manage job postings",
		});
	}

	return membership.organizationId;
}

export const jobPostingRouter = createTRPCRouter({
	list: protectedProcedure
		.input(
			z.object({
				status: statusSchema.optional(),
			}).optional(),
		)
		.query(async ({ ctx, input }) => {
			const organizationId = await getUserOrganization(ctx);

			const conditions = [eq(jobPosting.organizationId, organizationId)];
			if (input?.status) {
				conditions.push(eq(jobPosting.status, input.status));
			}

			const jobs = await ctx.db.query.jobPosting.findMany({
				where: and(...conditions),
				orderBy: (jobPosting, { desc }) => [desc(jobPosting.updatedAt)],
			});

			return jobs;
		}),

	listAll: protectedProcedure.query(async ({ ctx }) => {
		// For candidates, list all active jobs from all organizations
		const jobs = await ctx.db.query.jobPosting.findMany({
			where: eq(jobPosting.status, "active"),
			orderBy: (jobPosting, { desc }) => [desc(jobPosting.updatedAt)],
			with: {
				organization: {
					columns: {
						id: true,
						name: true,
					},
				},
			},
		});

		return jobs;
	}),

	getById: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const organizationId = await getUserOrganization(ctx);

			const job = await ctx.db.query.jobPosting.findFirst({
				where: and(
					eq(jobPosting.id, input.id),
					eq(jobPosting.organizationId, organizationId),
				),
			});

			if (!job) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Job posting not found",
				});
			}

			return job;
		}),

	getByIdPublic: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			// For candidates, allow viewing any active job
			const job = await ctx.db.query.jobPosting.findFirst({
				where: and(
					eq(jobPosting.id, input.id),
					eq(jobPosting.status, "active"),
				),
				with: {
					organization: {
						columns: {
							id: true,
							name: true,
						},
					},
				},
			});

			if (!job) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Job posting not found",
				});
			}

			return job;
		}),

	create: protectedProcedure
		.input(createJobSchema)
		.mutation(async ({ ctx, input }) => {
			const organizationId = await getUserOrganization(ctx);
			const now = new Date();

			const [newJob] = await ctx.db
				.insert(jobPosting)
				.values({
					organizationId,
					title: input.title,
					description: input.description,
					location: input.location,
					workMode: input.workMode,
					salary: input.salary,
					type: input.type,
					status: input.status,
					interviewQuestions: input.interviewQuestions,
					notes: input.notes,
					createdAt: now,
					updatedAt: now,
				})
				.returning();

			if (!newJob) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create job posting",
				});
			}

			return newJob;
		}),

	update: protectedProcedure
		.input(updateJobSchema)
		.mutation(async ({ ctx, input }) => {
			const organizationId = await getUserOrganization(ctx);

			// First check if the job exists and belongs to the user's organization
			const existingJob = await ctx.db.query.jobPosting.findFirst({
				where: and(
					eq(jobPosting.id, input.id),
					eq(jobPosting.organizationId, organizationId),
				),
			});

			if (!existingJob) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Job posting not found",
				});
			}

			const { id, ...updateData } = input;

			const [updatedJob] = await ctx.db
				.update(jobPosting)
				.set({
					...updateData,
					updatedAt: new Date(),
				})
				.where(eq(jobPosting.id, id))
				.returning();

			return updatedJob;
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const organizationId = await getUserOrganization(ctx);

			// First check if the job exists and belongs to the user's organization
			const existingJob = await ctx.db.query.jobPosting.findFirst({
				where: and(
					eq(jobPosting.id, input.id),
					eq(jobPosting.organizationId, organizationId),
				),
			});

			if (!existingJob) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Job posting not found",
				});
			}

			await ctx.db.delete(jobPosting).where(eq(jobPosting.id, input.id));

			return { success: true };
		}),

	getInterviewUploadUrl: protectedProcedure
		.input(
			z.object({
				jobId: z.string().uuid(),
				contentType: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const timestamp = Date.now();
			const key = `interviews/${input.jobId}/${ctx.session.user.id}/${timestamp}.webm`;

			const command = new PutObjectCommand({
				Bucket: S3_BUCKET,
				Key: key,
				ContentType: input.contentType,
			});

			const uploadUrl = await getSignedUrl(s3Client, command, {
				expiresIn: 600, // 10 minutes for larger video files
			});

			const fileUrl = `https://${env.NEXT_PUBLIC_S3_HOST}/${S3_BUCKET}/${key}`;

			return {
				uploadUrl,
				fileUrl,
				key,
			};
		}),

	parseContent: protectedProcedure
		.input(
			z.object({
				content: z.string().optional(),
				fileBase64: z.string().optional(),
				fileType: z.enum(["pdf", "docx"]).optional(),
			}),
		)
		.mutation(async ({ input }) => {
			if (!input.content && !input.fileBase64) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Either content or file must be provided",
				});
			}

			const parseSchema = z.object({
				title: z.string().nullable().describe("Job title extracted from the content"),
				description: z.string().nullable().describe("Full job description formatted in Markdown. Include sections for responsibilities, requirements, qualifications, etc."),
				location: z.string().nullable().describe("Job location (city, state/country)"),
				workMode: z.enum(["remote", "hybrid", "on-site"]).nullable().describe("Work arrangement type"),
				salary: z.string().nullable().describe("Salary range if mentioned (e.g., '$120,000 - $150,000')"),
				type: z.enum(["full-time", "part-time", "contract", "internship"]).nullable().describe("Employment type"),
				interviewQuestions: z.array(z.string()).nullable().describe("5-7 relevant interview questions based on the job requirements. Focus on technical skills, experience, and behavioral questions."),
				notes: z.string().nullable().describe("Suggested notes for the AI interviewer about what to focus on, key qualifications to verify, and red flags to watch for."),
			});

			type ParsedJobData = z.infer<typeof parseSchema>;

			try {
				const messages: Array<{
					role: "user";
					content: Array<{ type: "text"; text: string } | { type: "file"; data: string; mediaType: string }>;
				}> = [];

				const prompt = `You are an AI assistant helping recruiters create job postings. Analyze the provided content and extract/generate the following information:

1. **title**: Extract the job title
2. **description**: Create a well-formatted Markdown job description. Include sections like:
   - About the Role
   - Responsibilities
   - Requirements
   - Nice to Have
   - Benefits (if mentioned)
   Keep the original content but improve formatting with headers, bullet points, and clear structure.
3. **location**: Extract the job location
4. **workMode**: Determine if it's "remote", "hybrid", or "on-site" based on context
5. **salary**: Extract salary information if present
6. **type**: Determine employment type: "full-time", "part-time", "contract", or "internship"
7. **interviewQuestions**: Generate 5-7 relevant interview questions that would help assess candidates for this role. Include a mix of:
   - Technical/skill-based questions
   - Experience-based questions
   - Behavioral questions
   - Problem-solving scenarios
8. **notes**: Write helpful notes for an AI interviewer, including:
   - Key qualifications to verify
   - Important skills to assess
   - Red flags to watch for
   - Suggested follow-up areas

Return null for any fields you cannot determine from the content.`;

				if (input.fileBase64 && input.fileType) {
					const mediaType = input.fileType === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
					messages.push({
						role: "user",
						content: [
							{ type: "text", text: prompt },
							{
								type: "file",
								data: `data:${mediaType};base64,${input.fileBase64}`,
								mediaType,
							},
						],
					});
				} else if (input.content) {
					messages.push({
						role: "user",
						content: [
							{
								type: "text",
								text: `${prompt}\n\nHere is the job posting content:\n\n${input.content}`,
							},
						],
					});
				}

				const { object } = await generateObject({
					model: google("gemini-2.0-flash"),
					schema: parseSchema,
					messages,
				});

				return (object ?? {
					title: null,
					description: null,
					location: null,
					workMode: null,
					salary: null,
					type: null,
					interviewQuestions: null,
					notes: null,
				}) as ParsedJobData;
			} catch (error) {
				console.error("Error parsing job content:", error);
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to parse content with AI",
				});
			}
		}),

	completeInterview: protectedProcedure
		.input(
			z.object({
				jobPostingId: z.string().uuid(),
				recordingUrl: z.string().url(),
				transcriptResponses: z.array(z.string()),//.min(1, "At least one transcript response is required"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Check if the job posting exists and is active
			const job = await ctx.db.query.jobPosting.findFirst({
				where: and(
					eq(jobPosting.id, input.jobPostingId),
					eq(jobPosting.status, "active"),
				),
			});

			if (!job) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Job posting not found or no longer accepting applications",
				});
			}

			// Verify the user has a candidate profile
			const profile = await ctx.db.query.candidateProfile.findFirst({
				where: eq(candidateProfile.userId, ctx.session.user.id),
			});

			if (!profile) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "You must complete your candidate profile before applying to jobs",
				});
			}

			// Verify transcript responses match the number of interview questions
			// if (input.transcriptResponses.length !== job.interviewQuestions.length) {
			// 	throw new TRPCError({
			// 		code: "BAD_REQUEST",
			// 		message: `Expected ${job.interviewQuestions.length} responses, but received ${input.transcriptResponses.length}`,
			// 	});
			// }

			// Check if user has already applied to this job
			const existingApplication = await ctx.db.query.applicantResponse.findFirst({
				where: and(
					eq(applicantResponse.jobPostingId, input.jobPostingId),
					eq(applicantResponse.candidateProfileId, profile.id),
				),
			});

			if (existingApplication) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "You have already applied to this job posting",
				});
			}

			const now = new Date();

			// Insert the applicant response
			const [response] = await ctx.db
				.insert(applicantResponse)
				.values({
					jobPostingId: input.jobPostingId,
					candidateProfileId: profile.id,
					recordingUrl: input.recordingUrl,
					transcriptResponses: input.transcriptResponses,
					status: "pending",
					createdAt: now,
					updatedAt: now,
				})
				.returning();

			if (!response) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to submit interview response",
				});
			}

			return response;
		}),
});
