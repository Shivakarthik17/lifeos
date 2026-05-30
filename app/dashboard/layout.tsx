import { Suspense } from "react";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";

function ContentFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
    </div>
  );
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-background text-white">
      <Sidebar />
      {/* Extra bottom padding on mobile so content clears the bottom nav. */}
      <main className="pb-20 md:ml-[220px] md:pb-0">
        <Suspense fallback={<ContentFallback />}>{children}</Suspense>
      </main>
      <BottomNav />
    </div>
  );
}
