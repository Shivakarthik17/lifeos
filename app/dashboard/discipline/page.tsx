import DisciplineClient from "./DisciplineClient";

export default function DisciplinePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:px-10 md:py-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Discipline
        </h1>
        <p className="mt-1 text-sm text-muted">
          Build habits, lock the routine, and stack good days.
        </p>
      </header>

      <DisciplineClient />
    </div>
  );
}
