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

export const organizationRelations = relations(organization, ({ many }) => ({
	members: many(organizationMembers),
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
	}),
);

export const jobHistoryRelations = relations(jobHistory, ({ one }) => ({
	candidateProfile: one(candidateProfile, {
		fields: [jobHistory.candidateProfileId],
		references: [candidateProfile.id],
	}),
}));
