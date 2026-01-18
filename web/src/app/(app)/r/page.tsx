export default function RecruiterDashboardPage() {
	
	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-bold">Recruiter Dashboard</h1>
			<p className="text-muted-foreground">
				Welcome to your dashboard. Here you can manage candidates and job postings.
			</p>
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<div className="rounded-lg border bg-card p-6">
					<h3 className="font-semibold">Active Job Postings</h3>
					<p className="text-3xl font-bold">0</p>
					<p className="text-sm text-muted-foreground">Open positions</p>
				</div>
				<div className="rounded-lg border bg-card p-6">
					<h3 className="font-semibold">Candidates</h3>
					<p className="text-3xl font-bold">0</p>
					<p className="text-sm text-muted-foreground">Total applicants</p>
				</div>
				<div className="rounded-lg border bg-card p-6">
					<h3 className="font-semibold">Interviews</h3>
					<p className="text-3xl font-bold">0</p>
					<p className="text-sm text-muted-foreground">Scheduled this week</p>
				</div>
				<div className="rounded-lg border bg-card p-6">
					<h3 className="font-semibold">Shortlisted</h3>
					<p className="text-3xl font-bold">0</p>
					<p className="text-sm text-muted-foreground">Candidates</p>
				</div>
			</div>
		</div>
	);
}
