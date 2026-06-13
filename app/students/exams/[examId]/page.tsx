// app/students/exams/[examId]/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { submitExam } from "./actions";

type Option = { id: string; optionText: string; order: number };
type Question = {
  id: string;
  questionText: string;
  marks: number;
  order: number;
  options: Option[];
};
type Exam = {
  id: string;
  title: string;
  description: string | null;
  totalMarks: number;
  passingMarks: number;
  durationMins: number | null;
  questions: Question[];
};

export default function ExamPage() {
  const { examId } = useParams<{ examId: string }>();
  const router = useRouter();

  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  useEffect(() => {
    fetch(`/api/exams/${examId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setLoading(false);
          return;
        }
        setExam(data);
        if (data.durationMins) setTimeLeft(data.durationMins * 60);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load exam.");
        setLoading(false);
      });
  }, [examId]);

  const handleSubmit = useCallback(async () => {
    if (!exam) return;
    setSubmitting(true);
    try {
      await submitExam(examId, answers);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Submission failed.");
      setSubmitting(false);
      setConfirmSubmit(false);
    }
  }, [exam, examId, answers]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => (s ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, handleSubmit]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const inputCls =
    "w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-400";

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-sm text-zinc-400">Loading exam…</p>
      </div>
    );

  if (error)
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <p className="text-sm text-red-500 mb-3">{error}</p>
          <Link href="/students" className="text-sm text-indigo-500">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    );

  if (!exam) return null;

  const q = exam.questions[current];
  const answeredCount = Object.keys(answers).length;
  const progressPct = Math.round((answeredCount / exam.questions.length) * 100);
  const isLast = current === exam.questions.length - 1;
  const isTimeLow = timeLeft !== null && timeLeft < 60;

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 text-[15px] font-semibold">
          MCQ<span className="text-indigo-500">Test</span>
        </div>

        {/* Progress */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col gap-2">
          <p className="text-xs text-zinc-500">
            {answeredCount} of {exam.questions.length} answered
          </p>
          <div className="h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full">
            <div
              className="h-1 bg-indigo-500 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Question nav */}
        <div className="p-3 flex flex-wrap gap-1.5 flex-1 content-start">
          {exam.questions.map((question, i) => (
            <button
              key={question.id}
              onClick={() => setCurrent(i)}
              className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                i === current
                  ? "bg-indigo-500 text-white"
                  : answers[question.id]
                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                    : "border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Timer */}
        {timeLeft !== null && (
          <div
            className={`mx-3 mb-3 border rounded-xl p-3 text-center transition-colors ${
              isTimeLow
                ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
                : "border-zinc-200 dark:border-zinc-800"
            }`}
          >
            <p
              className={`text-xs mb-0.5 ${isTimeLow ? "text-red-500" : "text-zinc-400"}`}
            >
              Time remaining
            </p>
            <p
              className={`text-xl font-semibold tabular-nums ${isTimeLow ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-white"}`}
            >
              {formatTime(timeLeft)}
            </p>
          </div>
        )}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-6 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
          <div>
            <p className="text-[15px] font-medium text-zinc-900 dark:text-white">
              {exam.title}
            </p>
            <p className="text-xs text-zinc-400">
              {exam.questions.length} questions · {exam.totalMarks} marks
              {exam.durationMins ? ` · ${exam.durationMins} min` : ""}
            </p>
          </div>
          <button
            onClick={() => setConfirmSubmit(true)}
            disabled={submitting}
            className="px-4 py-1.5 text-sm rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
          >
            Submit exam
          </button>
        </header>

        {/* Question */}
        <main className="flex-1 overflow-y-auto p-6 max-w-2xl w-full mx-auto flex flex-col gap-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-2.5 py-0.5 rounded-full">
                Question {current + 1}
              </span>
              <span className="text-xs text-zinc-400">
                {q.marks} {q.marks === 1 ? "mark" : "marks"}
              </span>
            </div>

            <p className="text-[15px] text-zinc-900 dark:text-zinc-100 leading-relaxed mb-5">
              {q.questionText}
            </p>

            <div className="flex flex-col gap-2">
              {q.options.map((opt) => {
                const selected = answers[q.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() =>
                      setAnswers((a) => ({ ...a, [q.id]: opt.id }))
                    }
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm text-left transition-colors w-full ${
                      selected
                        ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-600 text-indigo-800 dark:text-indigo-200"
                        : "border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center ${
                        selected
                          ? "border-indigo-500 bg-indigo-500"
                          : "border-zinc-300 dark:border-zinc-600"
                      }`}
                    >
                      {selected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </span>
                    {opt.optionText}
                  </button>
                );
              })}
            </div>
          </div>
        </main>

        {/* Bottom nav */}
        <footer className="flex items-center justify-between px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
          <button
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <i className="ti ti-arrow-left text-base" aria-hidden /> Previous
          </button>

          <span className="text-xs text-zinc-400">
            {current + 1} / {exam.questions.length}
          </span>

          {isLast ? (
            <button
              onClick={() => setConfirmSubmit(true)}
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white transition-colors disabled:opacity-50"
            >
              Finish & submit
            </button>
          ) : (
            <button
              onClick={() =>
                setCurrent((c) => Math.min(exam.questions.length - 1, c + 1))
              }
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white transition-colors"
            >
              Next <i className="ti ti-arrow-right text-base" aria-hidden />
            </button>
          )}
        </footer>
      </div>

      {/* Confirm submit modal */}
      {confirmSubmit && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 max-w-sm w-full mx-4 flex flex-col gap-4">
            <h2 className="text-[15px] font-medium text-zinc-900 dark:text-white">
              Submit exam?
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              You have answered {answeredCount} of {exam.questions.length}{" "}
              questions.
              {answeredCount < exam.questions.length && (
                <span className="text-amber-600 dark:text-amber-400">
                  {" "}
                  {exam.questions.length - answeredCount} unanswered.
                </span>
              )}{" "}
              You cannot change your answers after submitting.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmSubmit(false)}
                className="px-4 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-1.5 text-sm rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white transition-colors disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Yes, submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
