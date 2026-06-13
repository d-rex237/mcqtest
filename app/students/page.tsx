// app/dashboard/student/page.tsx
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

async function getStudentData(clerkId: string) {
  const student = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true, name: true, role: true },
  });

  if (!student || student.role !== "STUDENT") return null;

  const [submissions, availableExams] = await Promise.all([
    // Past submissions with exam info
    prisma.submission.findMany({
      where: { studentId: student.id },
      orderBy: { submittedAt: "desc" },
      take: 5,
      include: {
        exam: { select: { title: true, passingMarks: true, totalMarks: true } },
      },
    }),

    // Published exams the student hasn't submitted yet
    prisma.exam.findMany({
      where: {
        status: "PUBLISHED",
        submissions: { none: { studentId: student.id } },
      },
      include: {
        _count: { select: { questions: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const avgScore =
    submissions.length > 0
      ? Math.round(
          submissions.reduce((sum, s) => sum + s.percentage, 0) /
            submissions.length,
        )
      : 0;

  return { student, submissions, availableExams, avgScore };
}

export default async function StudentDashboard() {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/");

  const data = await getStudentData(clerkUser.id);
  if (!data) redirect("/admin");

  const { student, submissions, availableExams, avgScore } = data;

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 text-[15px] font-semibold">
          MCQ<span className="text-indigo-500">Test</span>
        </div>

        <nav className="flex flex-col gap-0.5 p-3 flex-1">
          {[
            {
              label: "Dashboard",
              href: "/dashboard/student",
              icon: "layout-dashboard",
            },
            {
              label: "Available exams",
              href: "/dashboard/student/exams",
              icon: "file-description",
            },
            {
              label: "My results",
              href: "/dashboard/student/results",
              icon: "clock-history",
            },
          ].map(({ label, href, icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <i className={`ti ti-${icon} text-base`} aria-hidden />
              {label}
            </Link>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2.5">
          <div>
            <p className="text-[13px] font-medium text-zinc-800 dark:text-zinc-200">
              {student.name ?? "Student"}
            </p>
            <p className="text-[11px] text-zinc-400">Student</p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <h1 className="text-[15px] font-medium text-zinc-900 dark:text-white">
            Dashboard
          </h1>
          <span className="text-sm text-zinc-400">
            Welcome back, {student.name?.split(" ")[0] ?? "there"}
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "Exams taken",
                value: submissions.length,
                sub: "all time",
              },
              {
                label: "Avg score",
                value: `${avgScore}%`,
                sub: "across all exams",
              },
              {
                label: "Available",
                value: availableExams.length,
                sub: "new exams to take",
              },
            ].map(({ label, value, sub }) => (
              <div
                key={label}
                className="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-4"
              >
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                  {label}
                </p>
                <p className="text-2xl font-semibold text-zinc-900 dark:text-white">
                  {value}
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          {/* Available exams */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[13.5px] font-medium text-zinc-900 dark:text-white">
                Available exams
              </h2>
              <Link
                href="/dashboard/student/exams"
                className="text-xs text-indigo-500 hover:text-indigo-400"
              >
                See all
              </Link>
            </div>

            {availableExams.length === 0 ? (
              <p className="text-sm text-zinc-400 py-6 text-center">
                No new exams available right now.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {availableExams.slice(0, 4).map((exam) => (
                  <div
                    key={exam.id}
                    className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-[13.5px] font-medium text-zinc-800 dark:text-zinc-200">
                        {exam.title}
                      </p>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                        New
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      {exam._count.questions} questions
                      {exam.durationMins ? ` · ${exam.durationMins} min` : ""}
                    </p>
                    <Link
                      href={`/students/exams/${exam.id}`}
                      className="mt-1 self-start text-xs bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-1.5 rounded-lg transition-colors"
                    >
                      Start exam
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent results */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[13.5px] font-medium text-zinc-900 dark:text-white">
                Recent results
              </h2>
              <Link
                href="/dashboard/student/results"
                className="text-xs text-indigo-500 hover:text-indigo-400"
              >
                See all
              </Link>
            </div>

            {submissions.length === 0 ? (
              <p className="text-sm text-zinc-400 py-6 text-center">
                No submissions yet. Take your first exam!
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
                {submissions.map((sub) => {
                  const passed =
                    sub.percentage >=
                    (sub.exam.passingMarks / sub.exam.totalMarks) * 100;

                  return (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between py-2.5"
                    >
                      <span className="text-sm text-zinc-800 dark:text-zinc-200">
                        {sub.exam.title}
                      </span>
                      <div className="flex items-center gap-3">
                        {/* Score bar */}
                        <div className="w-20 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full">
                          <div
                            className="h-1 rounded-full bg-indigo-500"
                            style={{ width: `${Math.round(sub.percentage)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 w-9">
                          {Math.round(sub.percentage)}%
                        </span>
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                            passed
                              ? "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300"
                              : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                          }`}
                        >
                          {passed ? "Passed" : "Failed"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
