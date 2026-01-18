import { S3Client } from "@aws-sdk/client-s3";
import { env } from "@/env";

export const s3Client = new S3Client({
	region: "auto",
	endpoint: `https://${env.NEXT_PUBLIC_S3_HOST}`,
	credentials: {
		accessKeyId: env.S3_ACCESS_KEY,
		secretAccessKey: env.S3_SECRET_KEY,
	},
	forcePathStyle: true,
});

export const S3_BUCKET = env.S3_BUCKET;
