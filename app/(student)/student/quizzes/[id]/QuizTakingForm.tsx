"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { submitQuiz } from "./actions";

interface QuestionProp {
  id: number;
  question_order: number;
  question_text: string;
  question_type: string;
  points: number;
  options: Record<string, string> | null;
}

export function QuizTakingForm({
  quizId,
  questions,
}: {
  quizId: number;
  questions: QuestionProp[];
}) {
  const [answered, setAnswered] = useState<Set<number>>(new Set());
  const total = questions.length;
  const progress = total ? Math.round((answered.size / total) * 100) : 0;

  function markAnswered(questionId: number) {
    setAnswered((prev) => {
      if (prev.has(questionId)) return prev;
      const next = new Set(prev);
      next.add(questionId);
      return next;
    });
  }

  return (
    <form action={submitQuiz} className="space-y-4">
      <input type="hidden" name="quiz_id" value={quizId} />

      <div className="sticky top-14 z-10 -mx-4 space-y-1 border-b bg-background/95 px-4 py-2 backdrop-blur supports-backdrop-filter:bg-background/70 md:-mx-6 md:px-6">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {answered.size} من {total} سؤال متجاوب
          </span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {questions.map((q, i) => (
        <Card key={q.id}>
          <CardHeader>
            <CardTitle className="text-base">
              {i + 1}. {q.question_text}{" "}
              <span className="text-destructive">*</span>{" "}
              <span className="text-sm font-normal text-muted-foreground">
                ({q.points} درجة)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent onChange={() => markAnswered(q.id)}>
            {q.question_type === "multiple_choice" && (
              <div className="space-y-2">
                {Object.entries(q.options ?? {}).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={`answer_${q.id}`}
                      value={key}
                      required
                    />
                    {key}. {label}
                  </label>
                ))}
              </div>
            )}

            {q.question_type === "checkboxes" && (
              <div className="space-y-2">
                {Object.entries(q.options ?? {}).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name={`answer_${q.id}`} value={key} />
                    {key}. {label}
                  </label>
                ))}
                <p className="text-xs text-muted-foreground">
                  ممكن تختار أكتر من إجابة
                </p>
              </div>
            )}

            {q.question_type === "dropdown" && (
              <select
                name={`answer_${q.id}`}
                required
                dir="rtl"
                className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
                defaultValue=""
              >
                <option value="" disabled>
                  اختر إجابة...
                </option>
                {Object.entries(q.options ?? {}).map(([key, label]) => (
                  <option key={key} value={key}>
                    {key}. {label}
                  </option>
                ))}
              </select>
            )}

            {q.question_type === "true_false" && (
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input type="radio" name={`answer_${q.id}`} value="true" required />
                  صح
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name={`answer_${q.id}`} value="false" required />
                  خطأ
                </label>
              </div>
            )}

            {q.question_type === "short_answer" && (
              <Input name={`answer_${q.id}`} required dir="rtl" />
            )}

            {q.question_type === "essay" && (
              <Textarea name={`answer_${q.id}`} rows={4} required />
            )}
          </CardContent>
        </Card>
      ))}

      <Button type="submit" size="lg">
        تسليم الاختبار
      </Button>
    </form>
  );
}
