import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import SignOutButton from "./SignOutButton";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const name = session.user.name ?? session.user.email ?? "there";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070B1A] px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur">
        <h1 className="text-3xl font-semibold text-white">Welcome {name}!</h1>
        <p className="mt-2 text-sm text-white/60">
          You're signed in to LifeOS.
        </p>
        <div className="mt-8">
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
