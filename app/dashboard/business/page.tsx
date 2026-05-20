import BusinessClient from "./BusinessClient";

export default function BusinessPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:px-10 md:py-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Business
        </h1>
        <p className="mt-1 text-sm text-muted">
          Track goals, ideas, tasks, and investments.
        </p>
      </header>

      <BusinessClient />
    </div>
  );
}
