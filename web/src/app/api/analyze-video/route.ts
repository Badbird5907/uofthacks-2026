import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { auth } from "@/server/better-auth";

export interface VideoAnalysisResult {
	body_language: number;
	clarity: number;
	confidence: number;
	eye_contact: number;
	key_points: string[];
	keywords: string;
	speech_rate: number;
	voice_tone: number;
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
		const { video_url } = body as { video_url?: string };

		if (!video_url) {
			return NextResponse.json(
				{ error: "video_url is required" },
				{ status: 400 }
			);
		}

		// POST to TwelveLabs microservice
		const analysisResponse = await fetch(`${env.TWELVELABS_MICROSERVICE_URL}/upload`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ video_url }),
		});

		if (!analysisResponse.ok) {
			console.error("TwelveLabs microservice error:", analysisResponse.status);
			return NextResponse.json(
				{ error: "Failed to analyze video" },
				{ status: 500 }
			);
		}

		const data = (await analysisResponse.json()) as VideoAnalysisResult;
		return NextResponse.json(data);
	} catch (error) {
		console.error("Error in analyze-video:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
