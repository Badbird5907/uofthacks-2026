import { type NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
	// Handle preflight OPTIONS requests
	if (request.method === "OPTIONS") {
		return new NextResponse(null, {
			status: 204,
			headers: {
				"Access-Control-Allow-Credentials": "true",
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET,DELETE,PATCH,POST,PUT,OPTIONS",
				"Access-Control-Allow-Headers":
					"X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
			},
		});
	}

	return NextResponse.next();
}

export const config = {
	matcher: "/api/:path*",
};
