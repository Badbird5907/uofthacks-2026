export default function CandidateDashboardPage() {
	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-bold">Candidate Dashboard</h1>
			<p className="text-muted-foreground">
				Welcome to your dashboard. Here you can manage your job applications and profile.
			</p>
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				<div className="rounded-lg border bg-card p-6">
					<h3 className="font-semibold">Applications</h3>
					<p className="text-3xl font-bold">0</p>
					<p className="text-sm text-muted-foreground">Active applications</p>
				</div>
				<div className="rounded-lg border bg-card p-6">
					<h3 className="font-semibold">Interviews</h3>
					<p className="text-3xl font-bold">0</p>
					<p className="text-sm text-muted-foreground">Scheduled interviews</p>
				</div>
				<div className="rounded-lg border bg-card p-6">
					<h3 className="font-semibold">Profile Views</h3>
					<p className="text-3xl font-bold">0</p>
					<p className="text-sm text-muted-foreground">This month</p>
				</div>
			</div>
		</div>
	);
}
