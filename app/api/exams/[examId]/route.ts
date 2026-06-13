// app/api/exams/[examId]/route.ts
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ examId: string }> },
) {
  const { examId } = await params;

  const clerkUser = await currentUser();
  if (!clerkUser)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const student = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
    select: { id: true, role: true },
  });

  if (!student || student.role !== "STUDENT")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await prisma.submission.findUnique({
    where: { examId_studentId: { examId, studentId: student.id } },
  });
  if (existing)
    return NextResponse.json({ error: "Already submitted" }, { status: 400 });

  const exam = await prisma.exam.findUnique({
    where: { id: examId, status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      description: true,
      totalMarks: true,
      passingMarks: true,
      durationMins: true,
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          questionText: true,
          marks: true,
          order: true,
          options: {
            orderBy: { order: "asc" },
            select: { id: true, optionText: true, order: true },
            // isCorrect intentionally NOT selected
          },
        },
      },
    },
  });

  if (!exam)
    return NextResponse.json({ error: "Exam not found" }, { status: 404 });

  const shuffled = {
    ...exam,
    questions: [...exam.questions]
      .sort(() => Math.random() - 0.5)
      .map((q) => ({
        ...q,
        options: [...q.options].sort(() => Math.random() - 0.5),
      })),
  };

  return NextResponse.json(shuffled);
}
