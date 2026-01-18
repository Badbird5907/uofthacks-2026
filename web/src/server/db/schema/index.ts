import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { account, session, user } from "./auth";

export * from "./auth";

export const organization = pgTable("organization", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull(),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

export const organizationMembers = pgTable("organization_members", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").references(() => organization.id),
	userId: text("user_id").references(() => user.id),
	role: text("role").notNull(),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

export const organizationJoinCodes = pgTable("organization_join_codes", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id").references(() => organization.id),
	code: text("code").notNull(),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

export const candidateProfile = pgTable("candidate_profile", {
	// this is the info the user will provide when they sign up as a candidate
	id: uuid("id").primaryKey().defaultRandom(),
	userId: text("user_id").references(() => user.id),

	firstName: text("first_name").notNull(),
	lastName: text("last_name").notNull(),
	phone: text("phone").notNull(),
	linkedin: text("linkedin").notNull(),
	github: text("github").notNull(),
	twitter: text("twitter").notNull(),
	portfolio: text("portfolio").notNull(),
	resume: text("resume").notNull(),
	extraLinks: text("extra_links").array().notNull(),
	skills: text("skills").notNull(),
	experience: text("experience").notNull(),

	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

export const jobHistory = pgTable("job_history", {
	id: uuid("id").primaryKey().defaultRandom(),
	candidateProfileId: uuid("candidate_profile_id")
		.references(() => candidateProfile.id, { onDelete: "cascade" })
		.notNull(),

	companyName: text("company_name").notNull(),
	jobTitle: text("job_title").notNull(),
	startDate: text("start_date").notNull(),
	endDate: text("end_date"), // null if current job
	description: text("description").notNull(),

	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

export const education = pgTable("education", {
	id: uuid("id").primaryKey().defaultRandom(),
	candidateProfileId: uuid("candidate_profile_id")
		.references(() => candidateProfile.id, { onDelete: "cascade" })
		.notNull(),

	institution: text("institution").notNull(),
	degree: text("degree").notNull(),
	fieldOfStudy: text("field_of_study").notNull(),
	startDate: text("start_date").notNull(),
	endDate: text("end_date"), // null if currently attending
	description: text("description"),

	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

export const jobPosting = pgTable("job_posting", {
	id: uuid("id").primaryKey().defaultRandom(),
	organizationId: uuid("organization_id")
		.references(() => organization.id, { onDelete: "cascade" })
		.notNull(),

	title: text("title").notNull(),
	description: text("description").notNull(), // markdown content
	location: text("location").notNull(),
	workMode: text("work_mode").notNull(), // 'remote' | 'hybrid' | 'on-site'
	salary: text("salary"), // optional salary range
	type: text("type").notNull(), // 'full-time' | 'part-time' | 'contract' | 'internship'
	status: text("status").notNull().default("draft"), // 'draft' | 'active' | 'closed'

	interviewQuestions: text("interview_questions").array().notNull(), // questions for AI video interview
	notes: text("notes"), // extra notes for AI interviewer

	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

export const applicantResponse = pgTable("applicant_response", {
	id: uuid("id").primaryKey().defaultRandom(),
	jobPostingId: uuid("job_posting_id")
		.references(() => jobPosting.id, { onDelete: "cascade" })
		.notNull(),
	candidateProfileId: uuid("candidate_profile_id")
		.references(() => candidateProfile.id, { onDelete: "cascade" })
		.notNull(),

	recordingUrl: text("recording_url").notNull(), // URL to the interview recording
	transcriptResponses: text("transcript_responses").array().notNull(), // Array of responses matching question order

	status: text("status").notNull().default("pending"), // 'pending' | 'reviewed' | 'accepted' | 'rejected'

	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

export const organizationRelations = relations(organization, ({ many }) => ({
	members: many(organizationMembers),
	jobPostings: many(jobPosting),
}));

export const organizationMembersRelations = relations(
	organizationMembers,
	({ one }) => ({
		organization: one(organization, {
			fields: [organizationMembers.organizationId],
			references: [organization.id],
		}),
		user: one(user, {
			fields: [organizationMembers.userId],
			references: [user.id],
		}),
	}),
);

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),

	organizations: many(organizationMembers),
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id],
	}),
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id],
	}),
}));

export const candidateProfileRelations = relations(
	candidateProfile,
	({ one, many }) => ({
		user: one(user, {
			fields: [candidateProfile.userId],
			references: [user.id],
		}),
		jobHistory: many(jobHistory),
		education: many(education),
		applicantResponses: many(applicantResponse),
	}),
);

export const jobHistoryRelations = relations(jobHistory, ({ one }) => ({
	candidateProfile: one(candidateProfile, {
		fields: [jobHistory.candidateProfileId],
		references: [candidateProfile.id],
	}),
}));

export const educationRelations = relations(education, ({ one }) => ({
	candidateProfile: one(candidateProfile, {
		fields: [education.candidateProfileId],
		references: [candidateProfile.id],
	}),
}));

export const jobPostingRelations = relations(jobPosting, ({ one, many }) => ({
	organization: one(organization, {
		fields: [jobPosting.organizationId],
		references: [organization.id],
	}),
	applicantResponses: many(applicantResponse),
}));

export const applicantResponseRelations = relations(
	applicantResponse,
	({ one }) => ({
		jobPosting: one(jobPosting, {
			fields: [applicantResponse.jobPostingId],
			references: [jobPosting.id],
		}),
		candidateProfile: one(candidateProfile, {
			fields: [applicantResponse.candidateProfileId],
			references: [candidateProfile.id],
		}),
	}),
);
