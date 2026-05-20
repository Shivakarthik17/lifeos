import MindClient from "./MindClient";

export default function MindPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:px-10 md:py-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Mind
        </h1>
        <p className="mt-1 text-sm text-muted">
          Meditate, journal, focus, and stay mindful of screen time.
        </p>
      </header>

      <MindClient />
    </div>
  );
}
