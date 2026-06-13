"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createExam } from "./actions";

type Option = { id: string; optionText: string; isCorrect: boolean };
type Question = {
  id: string;
  questionText: string;
  marks: number;
  options: Option[];
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function emptyQuestion(): Question {
  return {
    id: uid(),
    questionText: "",
    marks: 1,
    options: [
      { id: uid(), optionText: "", isCorrect: false },
      { id: uid(), optionText: "", isCorrect: false },
      { id: uid(), optionText: "", isCorrect: false },
      { id: uid(), optionText: "", isCorrect: false },
    ],
  };
}

export default function NewExamPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [passingMarks, setPassingMarks] = useState(0);
  const [durationMins, setDurationMins] = useState<number | "">("");
  const [questions, setQuestions] = useState<Question[]>([emptyQuestion()]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Question helpers
  const updateQuestion = (id: string, text: string) =>
    setQuestions((qs) =>
      qs.map((q) => (q.id === id ? { ...q, questionText: text } : q)),
    );

  const updateMarks = (id: string, marks: number) =>
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, marks } : q)));

  const removeQuestion = (id: string) =>
    setQuestions((qs) => qs.filter((q) => q.id !== id));

  const addQuestion = () => setQuestions((qs) => [...qs, emptyQuestion()]);

  // Option helpers
  const updateOption = (qId: string, oId: string, text: string) =>
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === qId
          ? {
              ...q,
              options: q.options.map((o) =>
                o.id === oId ? { ...o, optionText: text } : o,
              ),
            }
          : q,
      ),
    );

  const setCorrect = (qId: string, oId: string) =>
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === qId
          ? {
              ...q,
              options: q.options.map((o) => ({
                ...o,
                isCorrect: o.id === oId,
              })),
            }
          : q,
      ),
    );

  const addOption = (qId: string) =>
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === qId
          ? {
              ...q,
              options: [
                ...q.options,
                { id: uid(), optionText: "", isCorrect: false },
              ],
            }
          : q,
      ),
    );

  const removeOption = (qId: string, oId: string) =>
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === qId
          ? { ...q, options: q.options.filter((o) => o.id !== oId) }
          : q,
      ),
    );

  const totalMarks = questions.reduce((s, q) => s + q.marks, 0);

  async function handleSubmit(status: "DRAFT" | "PUBLISHED") {
    setError("");

    if (!title.trim()) return setError("Title is required.");
    if (questions.some((q) => !q.questionText.trim()))
      return setError("All questions must have text.");
    if (questions.some((q) => q.options.length < 2))
      return setError("Each question needs at least 2 options.");
    if (questions.some((q) => !q.options.some((o) => o.isCorrect)))
      return setError("Each question must have one correct answer selected.");
    if (questions.some((q) => q.options.some((o) => !o.optionText.trim())))
      return setError("All options must have text.");

    setSaving(true);
    try {
      await createExam({
        title: title.trim(),
        description: description.trim() || undefined,
        totalMarks,
        passingMarks,
        durationMins: durationMins !== "" ? Number(durationMins) : undefined,
        status,
        questions: questions.map((q, qi) => ({
          questionText: q.questionText,
          marks: q.marks,
          order: qi,
          options: q.options.map((o, oi) => ({
            optionText: o.optionText,
            isCorrect: o.isCorrect,
            order: oi,
          })),
        })),
      });
      // Redirect here, after the server action resolves successfully.
      // redirect() cannot be called inside the server action when the
      // client wraps the call in try/catch — it throws internally and
      // gets caught as an error, suppressing navigation.
      router.push("/admin");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setSaving(false);
    }
  }

  const inputCls =
    "w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-400";
  const labelCls = "block text-xs text-zinc-500 dark:text-zinc-400 mb-1.5";

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 text-[15px] font-semibold">
          MCQ<span className="text-indigo-500">Test</span>
        </div>
        <nav className="flex flex-col gap-0.5 p-3 flex-1 text-sm">
          {[
            { label: "Overview", href: "/admin", icon: "layout-dashboard" },
            { label: "Exams", href: "/admin#exams", icon: "file-description" },
            { label: "Students", href: "/admin#students", icon: "users" },
            { label: "Results", href: "/admin#results", icon: "chart-bar" },
          ].map(({ label, href, icon }) => (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <i className={`ti ti-${icon} text-base`} aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/admin"
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              ← Back
            </Link>
            <span className="text-zinc-300 dark:text-zinc-600">/</span>
            <span className="font-medium text-zinc-900 dark:text-white">
              New exam
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleSubmit("DRAFT")}
              disabled={saving}
              className="px-4 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              Save as draft
            </button>
            <button
              onClick={() => handleSubmit("PUBLISHED")}
              disabled={saving}
              className="px-4 py-1.5 text-sm rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Publish"}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 max-w-3xl w-full mx-auto">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Exam details */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col gap-4">
            <h2 className="text-[13.5px] font-medium text-zinc-900 dark:text-white">
              Exam details
            </h2>

            <div>
              <label className={labelCls}>Title</label>
              <input
                className={inputCls}
                placeholder="e.g. Biology Midterm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>Description (optional)</label>
              <textarea
                className={inputCls}
                rows={2}
                placeholder="What is this exam about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Total marks (auto)</label>
                <input
                  className={`${inputCls} bg-zinc-50 dark:bg-zinc-800 text-zinc-400`}
                  value={totalMarks}
                  readOnly
                />
              </div>
              <div>
                <label className={labelCls}>Passing marks</label>
                <input
                  className={inputCls}
                  type="number"
                  min={0}
                  value={passingMarks}
                  onChange={(e) => setPassingMarks(Number(e.target.value))}
                />
              </div>
              <div>
                <label className={labelCls}>Duration (mins, optional)</label>
                <input
                  className={inputCls}
                  type="number"
                  min={1}
                  placeholder="No limit"
                  value={durationMins}
                  onChange={(e) =>
                    setDurationMins(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                />
              </div>
            </div>
          </div>

          {/* Questions */}
          {questions.map((q, qi) => (
            <div
              key={q.id}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-2.5 py-0.5 rounded-full">
                  Q{qi + 1}
                </span>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-zinc-400">Marks</label>
                  <input
                    type="number"
                    min={1}
                    value={q.marks}
                    onChange={(e) => updateMarks(q.id, Number(e.target.value))}
                    className="w-14 px-2 py-1 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  {questions.length > 1 && (
                    <button
                      onClick={() => removeQuestion(q.id)}
                      className="text-xs text-red-500 hover:text-red-400 border border-red-200 dark:border-red-800 px-2 py-1 rounded-lg transition-colors"
                    >
                      <i className="ti ti-trash text-sm" aria-hidden />
                    </button>
                  )}
                </div>
              </div>

              <input
                className={inputCls}
                placeholder="Enter question text…"
                value={q.questionText}
                onChange={(e) => updateQuestion(q.id, e.target.value)}
              />

              <div className="flex flex-col gap-2">
                {q.options.map((o) => (
                  <div
                    key={o.id}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm transition-colors ${
                      o.isCorrect
                        ? "border-teal-400 bg-teal-50 dark:bg-teal-900/20 dark:border-teal-700"
                        : "border-zinc-200 dark:border-zinc-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`correct-${q.id}`}
                      checked={o.isCorrect}
                      onChange={() => setCorrect(q.id, o.id)}
                      className="accent-indigo-500 shrink-0"
                    />
                    <input
                      className="flex-1 bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none text-sm placeholder:text-zinc-400"
                      placeholder="Option text…"
                      value={o.optionText}
                      onChange={(e) => updateOption(q.id, o.id, e.target.value)}
                    />
                    {q.options.length > 2 && (
                      <button
                        onClick={() => removeOption(q.id, o.id)}
                        className="text-zinc-300 hover:text-red-400 transition-colors"
                        aria-label="Remove option"
                      >
                        <i className="ti ti-x text-sm" aria-hidden />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={() => addOption(q.id)}
                className="self-start text-xs text-indigo-500 hover:text-indigo-400 flex items-center gap-1 transition-colors"
              >
                <i className="ti ti-plus text-sm" aria-hidden /> Add option
              </button>
            </div>
          ))}

          {/* Add question */}
          <button
            onClick={addQuestion}
            className="w-full py-4 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 text-sm text-zinc-500 dark:text-zinc-400 hover:border-indigo-400 hover:text-indigo-500 flex items-center justify-center gap-2 transition-colors"
          >
            <i className="ti ti-plus text-base" aria-hidden /> Add question
          </button>
        </main>
      </div>
    </div>
  );
}
