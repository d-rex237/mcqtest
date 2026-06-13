// app/students/exams/[examId]/actions.ts
"use server";

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function submitExam(
  examId: string,
  answers: Record<string, string>, // { [questionId]: optionId }
) {
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error("Unauthorized");

  const student = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
    select: { id: true, role: true },
  });

  if (!student || student.role !== "STUDENT") throw new Error("Forbidden");

  // Check not already submitted
  const existing = await prisma.submission.findUnique({
    where: { examId_studentId: { examId, studentId: student.id } },
  });
  if (existing) throw new Error("Already submitted");

  // Fetch exam with questions + correct options
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      questions: {
        include: { options: true },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!exam) throw new Error("Exam not found");
  if (exam.status !== "PUBLISHED") throw new Error("Exam is not available");

  // Grade answers
  let score = 0;
  const studentAnswers = exam.questions.map((q) => {
    const chosenOptionId = answers[q.id];
    const chosenOption = q.options.find((o) => o.id === chosenOptionId);
    const isCorrect = chosenOption?.isCorrect ?? false;
    if (isCorrect) score += q.marks;

    return {
      questionId: q.id,
      optionId: chosenOptionId ?? q.options[0].id, // fallback avoids null crash
      isCorrect,
    };
  });

  const totalMarks = exam.questions.reduce((s, q) => s + q.marks, 0);
  const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
  const passed = score >= exam.passingMarks;

  await prisma.submission.create({
    data: {
      examId,
      studentId: student.id,
      score,
      totalMarks,
      percentage,
      passed,
      answers: {
        create: studentAnswers,
      },
    },
  });

  redirect(`/students`);
}
