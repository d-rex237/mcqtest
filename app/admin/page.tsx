// app/admin/page.tsx
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { UserButton, SignOutButton } from "@clerk/nextjs";

async function getAdminData(clerkId: string) {
  const [
    totalExams,
    examsByStatus,
    totalStudents,
    totalSubmissions,
    allSubmissions,
    exams,
    recentStudents,
    recentResults,
  ] = await Promise.all([
    prisma.exam.count({ where: { creator: { clerkId } } }),

    prisma.exam.groupBy({
      by: ["status"],
      where: { creator: { clerkId } },
      _count: true,
    }),

    prisma.user.count({ where: { role: "STUDENT" } }),

    prisma.submission.count({
      where: { exam: { creator: { clerkId } } },
    }),

    prisma.submission.findMany({
      where: { exam: { creator: { clerkId } } },
      select: { percentage: true },
    }),

    prisma.exam.findMany({
      where: { creator: { clerkId } },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { questions: true, submissions: true } } },
    }),

    prisma.user.findMany({
      where: { role: "STUDENT" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, email: true },
    }),

    prisma.submission.findMany({
      where: { exam: { creator: { clerkId } } },
      orderBy: { submittedAt: "desc" },
      take: 6,
      select: {
        id: true,
        percentage: true,
        passed: true,
        student: { select: { name: true } },
        exam: { select: { title: true } },
      },
    }),
  ]);

  const avgScore =
    allSubmissions.length > 0
      ? Math.round(
          allSubmissions.reduce((s, r) => s + r.percentage, 0) /
            allSubmissions.length,
        )
      : 0;

  const statusMap = Object.fromEntries(
    examsByStatus.map((e) => [e.status, e._count]),
  );

  return {
    stats: {
      totalExams,
      published: statusMap["PUBLISHED"] ?? 0,
      totalStudents,
      totalSubmissions,
      avgScore,
    },
    exams,
    recentStudents,
    recentResults,
  };
}

const statusStyle: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  PUBLISHED:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  CLOSED: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export default async function AdminPage() {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/");

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
    select: { role: true, name: true },
  });

  if (!dbUser || dbUser.role !== "ADMIN") redirect("/students");

  const { stats, exams, recentStudents, recentResults } = await getAdminData(
    clerkUser.id,
  );

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-52 flex flex-col shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 text-[15px] font-semibold">
          MCQ<span className="text-indigo-500">Test</span>
        </div>

        <nav className="flex flex-col gap-0.5 p-3 flex-1 text-sm">
          {[
            { label: "Overview", icon: "layout-dashboard" },
            { label: "Exams", icon: "file-description" },
            { label: "Students", icon: "users" },
            { label: "Results", icon: "chart-bar" },
          ].map(({ label, icon }) => (
            <a
              key={label}
              href={`#${label.toLowerCase()}`}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <i className={`ti ti-${icon} text-base`} aria-hidden />
              {label}
            </a>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <UserButton />
            <div>
              <p className="text-[13px] font-medium text-zinc-800 dark:text-zinc-200">
                {dbUser.name ?? "Admin"}
              </p>
              <p className="text-[11px] text-zinc-400">Administrator</p>
            </div>
          </div>
          <SignOutButton redirectUrl="/">
            <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <i className="ti ti-logout text-base" aria-hidden />
              Sign out
            </button>
          </SignOutButton>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
          <h1 className="text-[15px] font-medium text-zinc-900 dark:text-white">
            Admin dashboard
          </h1>
          <Link
            href="/admin/exams/new"
            className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-400 text-white text-sm px-4 py-1.5 rounded-lg transition-colors"
          >
            <i className="ti ti-plus text-base" aria-hidden /> New exam
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* Stats */}
          <section id="overview">
            <div className="grid grid-cols-4 gap-3">
              {[
                {
                  label: "Total exams",
                  value: stats.totalExams,
                  sub: `${stats.published} published`,
                },
                {
                  label: "Students",
                  value: stats.totalStudents,
                  sub: "registered",
                },
                {
                  label: "Submissions",
                  value: stats.totalSubmissions,
                  sub: "all time",
                },
                {
                  label: "Avg score",
                  value: `${stats.avgScore}%`,
                  sub: "across all exams",
                },
              ].map(({ label, value, sub }) => (
                <div
                  key={label}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4"
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
          </section>

          {/* Exams */}
          <section
            id="exams"
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[13.5px] font-medium text-zinc-900 dark:text-white">
                Exams
              </h2>
              <Link
                href="/admin/exams/new"
                className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-400"
              >
                <i className="ti ti-plus text-sm" aria-hidden /> New
              </Link>
            </div>

            {exams.length === 0 ? (
              <p className="text-sm text-zinc-400 py-8 text-center">
                No exams yet.{" "}
                <Link href="/admin/exams/new" className="text-indigo-500">
                  Create your first one
                </Link>
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800">
                    {["Title", "Questions", "Submissions", "Status", ""].map(
                      (h) => (
                        <th
                          key={h}
                          className="text-left pb-2 text-xs font-normal text-zinc-400 px-2 first:pl-0"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {exams.map((exam) => (
                    <tr
                      key={exam.id}
                      className="border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                    >
                      <td className="py-2.5 pl-0 px-2 font-medium text-zinc-800 dark:text-zinc-200">
                        {exam.title}
                      </td>
                      <td className="py-2.5 px-2 text-zinc-500">
                        {exam._count.questions}
                      </td>
                      <td className="py-2.5 px-2 text-zinc-500">
                        {exam._count.submissions}
                      </td>
                      <td className="py-2.5 px-2">
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusStyle[exam.status]}`}
                        >
                          {exam.status.charAt(0) +
                            exam.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <Link
                          href={`/admin/exams/${exam.id}`}
                          className="text-xs text-indigo-500 hover:text-indigo-400"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* Students + Results */}
          <div className="grid grid-cols-2 gap-6">
            <section
              id="students"
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[13.5px] font-medium text-zinc-900 dark:text-white">
                  Students
                </h2>
                <span className="text-xs text-zinc-400">
                  {stats.totalStudents} total
                </span>
              </div>

              {recentStudents.length === 0 ? (
                <p className="text-sm text-zinc-400 py-6 text-center">
                  No students yet.
                </p>
              ) : (
                <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
                  {recentStudents.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between py-2.5"
                    >
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {s.name ?? "—"}
                      </span>
                      <span className="text-xs text-zinc-400">{s.email}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section
              id="results"
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[13.5px] font-medium text-zinc-900 dark:text-white">
                  Recent results
                </h2>
                <span className="text-xs text-zinc-400">
                  {stats.totalSubmissions} total
                </span>
              </div>

              {recentResults.length === 0 ? (
                <p className="text-sm text-zinc-400 py-6 text-center">
                  No submissions yet.
                </p>
              ) : (
                <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
                  {recentResults.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between py-2.5"
                    >
                      <div>
                        <p className="text-sm text-zinc-800 dark:text-zinc-200">
                          {r.student.name ?? "Student"}
                        </p>
                        <p className="text-xs text-zinc-400">{r.exam.title}</p>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-16 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full">
                          <div
                            className="h-1 rounded-full bg-indigo-500"
                            style={{ width: `${Math.round(r.percentage)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 w-8">
                          {Math.round(r.percentage)}%
                        </span>
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                            r.passed
                              ? "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300"
                              : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                          }`}
                        >
                          {r.passed ? "Pass" : "Fail"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
