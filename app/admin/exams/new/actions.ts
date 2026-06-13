"use server";

import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

type OptionInput = {
  optionText: string;
  isCorrect: boolean;
  order: number;
};

type QuestionInput = {
  questionText: string;
  marks: number;
  order: number;
  options: OptionInput[];
};

type CreateExamInput = {
  title: string;
  description?: string;
  totalMarks: number;
  passingMarks: number;
  durationMins?: number;
  status: "DRAFT" | "PUBLISHED";
  questions: QuestionInput[];
};

export async function createExam(data: CreateExamInput) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) throw new Error("Unauthorized");

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
      select: { id: true, role: true },
    });

    if (!dbUser || dbUser.role !== "ADMIN") throw new Error("Forbidden");

    const totalMarks =
      data.totalMarks || data.questions.reduce((s, q) => s + q.marks, 0);

    await prisma.exam.create({
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        totalMarks,
        passingMarks: data.passingMarks,
        durationMins: data.durationMins || null,
        creatorId: dbUser.id,
        questions: {
          create: data.questions.map((q) => ({
            questionText: q.questionText,
            marks: q.marks,
            order: q.order,
            options: {
              create: q.options.map((o) => ({
                optionText: o.optionText,
                isCorrect: o.isCorrect,
                order: o.order,
              })),
            },
          })),
        },
      },
    });
  } catch (err) {
    console.error("[createExam error]", err); // ← shows in terminal / Vercel logs
    throw err; // re-throw so the client catch block gets it
  }
}
