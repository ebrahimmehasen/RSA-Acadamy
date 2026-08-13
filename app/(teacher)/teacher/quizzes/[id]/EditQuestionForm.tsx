"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateQuestion, deleteQuestion } from "../actions";

const OPTION_TYPES = new Set(["multiple_choice", "checkboxes", "dropdown"]);

interface QuestionProp {
  id: number;
  quiz_id: number;
  question_text: string;
  question_type: string;
  points: number;
  options: Record<string, string> | null;
  correct_answer: string | null;
}

export function EditQuestionForm({ question }: { question: QuestionProp }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="flex gap-2">
        <Button variant="outline" size="xs" onClick={() => setOpen(true)}>
          تعديل
        </Button>
        <form action={deleteQuestion}>
          <input type="hidden" name="question_id" value={question.id} />
          <input type="hidden" name="quiz_id" value={question.quiz_id} />
          <Button variant="destructive" size="xs" type="submit">
            حذف
          </Button>
        </form>
      </div>
    );
  }

  const options = question.options ?? {};
  const showOptions = OPTION_TYPES.has(question.question_type);

  return (
    <form
      action={async (formData) => {
        await updateQuestion(formData);
        setOpen(false);
      }}
      className="w-full space-y-3 rounded-lg border bg-muted/30 p-3"
    >
      <input type="hidden" name="question_id" value={question.id} />
      <input type="hidden" name="quiz_id" value={question.quiz_id} />

      <div className="space-y-1">
        <Label htmlFor={`question_text_${question.id}`}>نص السؤال</Label>
        <Textarea
          id={`question_text_${question.id}`}
          name="question_text"
          rows={2}
          defaultValue={question.question_text}
          required
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor={`points_${question.id}`}>الدرجة</Label>
        <Input
          id={`points_${question.id}`}
          name="points"
          type="number"
          min={1}
          defaultValue={question.points}
          dir="ltr"
          className="w-24"
          required
        />
      </div>

      {showOptions && (
        <div className="grid gap-2 sm:grid-cols-2">
          <Input name="option_a" placeholder="اختيار A" defaultValue={options.A ?? ""} />
          <Input name="option_b" placeholder="اختيار B" defaultValue={options.B ?? ""} />
          <Input name="option_c" placeholder="اختيار C" defaultValue={options.C ?? ""} />
          <Input name="option_d" placeholder="اختيار D" defaultValue={options.D ?? ""} />
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor={`correct_answer_${question.id}`}>
              {question.question_type === "checkboxes"
                ? "الإجابات الصحيحة (افصل بفاصلة، مثال: A,C)"
                : "الإجابة الصحيحة (A/B/C/D)"}
            </Label>
            <Input
              id={`correct_answer_${question.id}`}
              name="correct_answer"
              dir="ltr"
              defaultValue={question.correct_answer ?? ""}
              maxLength={question.question_type === "checkboxes" ? undefined : 1}
            />
          </div>
        </div>
      )}

      {question.question_type === "true_false" && (
        <div className="space-y-1">
          <Label htmlFor={`correct_answer_${question.id}`}>الإجابة الصحيحة</Label>
          <select
            id={`correct_answer_${question.id}`}
            name="correct_answer"
            defaultValue={question.correct_answer ?? "true"}
            className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
          >
            <option value="true">صح</option>
            <option value="false">خطأ</option>
          </select>
        </div>
      )}

      {question.question_type === "short_answer" && (
        <div className="space-y-1">
          <Label htmlFor={`correct_answer_${question.id}`}>
            الإجابة الصحيحة (نص مطابق)
          </Label>
          <Input
            id={`correct_answer_${question.id}`}
            name="correct_answer"
            defaultValue={question.correct_answer ?? ""}
          />
        </div>
      )}

      {question.question_type === "essay" && (
        <p className="text-sm text-muted-foreground">
          هيتم تصحيح السؤال ده يدويًا بعد التسليم
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="xs">
          حفظ
        </Button>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => setOpen(false)}
        >
          إلغاء
        </Button>
      </div>
    </form>
  );
}
