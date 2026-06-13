// app/page.tsx
import { SignUpButton, SignInButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const clerkUser = await currentUser();

  if (clerkUser) {
    const userEmail = clerkUser.emailAddresses[0]?.emailAddress;
    const adminEmails =
      process.env.ADMIN_EMAIL?.split(",").map((e) => e.trim()) ?? [];
    const isAdmin = adminEmails.includes(userEmail ?? "");

    if (isAdmin) {
      await prisma.user.upsert({
        where: { clerkId: clerkUser.id },
        update: { role: "ADMIN" },
        create: {
          clerkId: clerkUser.id,
          email: userEmail ?? "",
          name: clerkUser.fullName ?? clerkUser.username ?? "Admin",
          role: "ADMIN",
        },
      });
      redirect("/admin");
    }

    await prisma.user.upsert({
      where: { clerkId: clerkUser.id },
      update: {},
      create: {
        clerkId: clerkUser.id,
        email: userEmail ?? "",
        name: clerkUser.fullName ?? clerkUser.username ?? "Student",
        role: "STUDENT",
      },
    });

    redirect("/students");
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-zinc-800">
        <span className="text-lg font-semibold tracking-tight text-white">
          MCQ<span className="text-indigo-400">Test</span>
        </span>
        <SignInButton mode="modal">
          <button className="text-sm text-zinc-400 hover:text-white transition-colors">
            Sign in
          </button>
        </SignInButton>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-8">
        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 text-sm text-indigo-400">
          Built for educators & students
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight max-w-2xl leading-tight">
          Create and take <span className="text-indigo-400">MCQ exams</span>{" "}
          with ease
        </h1>

        <p className="text-zinc-400 text-lg max-w-md">
          Admins build exams. Students take them. Results are instant. No setup,
          no friction.
        </p>

        <SignUpButton mode="modal">
          <button className="bg-indigo-500 hover:bg-indigo-400 transition-colors text-white font-medium px-8 py-3 rounded-lg text-base">
            Get started free
          </button>
        </SignUpButton>
      </div>

      <footer className="text-center text-zinc-600 text-sm py-6">
        © {new Date().getFullYear()} MCQTest
      </footer>
    </main>
  );
}
