import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { auth } from "@/server/better-auth";
import { getCandidateInfo } from "@/lib/candidate-info";
import type { ScrapedCandidateInfo } from "@/lib/scraper/types";
import { db } from "@/server/db";

interface ScraperResponse {
	status: "processing" | "complete";
	result?: ScrapedCandidateInfo;
}

export async function POST(request: NextRequest) {
	try {
		// Verify authentication
		const session = await auth.api.getSession({
			headers: request.headers,
		});

		if (!session?.user) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		// Verify user is a recruiter
		if (!session.user.isRecruiter) {
			return NextResponse.json(
				{ error: "Only recruiters can access this endpoint" },
				{ status: 403 }
			);
		}

	const body = await request.json();
	const { candidateId } = body as { candidateId?: string };

	if (!candidateId) {
		return NextResponse.json(
			{ error: "candidateId is required" },
			{ status: 400 }
		);
	}

	// Try to find candidate by candidate profile ID first, then by user ID
	const existingCandidate = await db.query.candidateProfile.findFirst({
		where: (candidateProfile, { eq, or }) => or(
			eq(candidateProfile.id, candidateId),
			eq(candidateProfile.userId, candidateId)
		),
	});

	if (!existingCandidate || !existingCandidate.userId) {
		return NextResponse.json(
			{ error: "Candidate not found" },
			{ status: 404 }
		);
	}

	// Fetch candidate data
	let candidateData;
	try {
		candidateData = await getCandidateInfo(existingCandidate.userId);
	} catch(e) {
		console.error("Error in process-profile:", e);
		return NextResponse.json(
			{ error: "Candidate not found" },
			{ status: 404 }
		);
	}

		// POST to scraper microservice
		const scraperResponse = await fetch(env.SCRAPER_MICROSERVICE_URL + "/api/process-profile", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(candidateData),
		});

		if (!scraperResponse.ok) {
			console.error("Scraper microservice error:", scraperResponse.status);
			return NextResponse.json(
				{ error: "Failed to process profile" },
				{ status: 500 }
			);
		}

		const data = (await scraperResponse.json()) as ScraperResponse;
		return NextResponse.json(data);
	} catch (error) {
		console.error("Error in process-profile:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
