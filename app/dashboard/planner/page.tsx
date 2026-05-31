import PlannerClient from "./PlannerClient";

export default function PlannerPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:px-10 md:py-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Planner
        </h1>
        <p className="mt-1 text-sm text-muted">
          Your calendar, meetings, and to-dos — all in one place.
        </p>
      </header>

      <PlannerClient />
    </div>
  );
}
