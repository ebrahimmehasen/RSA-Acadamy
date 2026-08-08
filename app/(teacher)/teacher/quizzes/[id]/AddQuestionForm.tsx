"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { addQuestion } from "../actions";

const TYPE_LABELS: Record<string, string> = {
  multiple_choice: "اختيار من متعدد",
  checkboxes: "مربعات اختيار (أكتر من إجابة)",
  dropdown: "قائمة منسدلة",
  true_false: "صح / خطأ",
  short_answer: "إجابة قصيرة",
  essay: "مقالي",
};

export function AddQuestionForm({ quizId }: { quizId: number }) {
  const [type, setType] = useState("multiple_choice");
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">إضافة سؤال</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          ref={formRef}
          action={async (formData) => {
            await addQuestion(formData);
            formRef.current?.reset();
            setType("multiple_choice");
          }}
          className="space-y-4"
        >
          <input type="hidden" name="quiz_id" value={quizId} />

          <div className="space-y-2">
            <Label htmlFor="question_text">نص السؤال</Label>
            <Textarea id="question_text" name="question_text" rows={2} required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="question_type">نوع السؤال</Label>
              <select
                id="question_type"
                name="question_type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
              >
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="points">الدرجة</Label>
              <Input id="points" name="points" type="number" min={1} defaultValue={1} dir="ltr" />
            </div>
          </div>

          {type === "multiple_choice" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input name="option_a" placeholder="اختيار A" />
              <Input name="option_b" placeholder="اختيار B" />
              <Input name="option_c" placeholder="اختيار C" />
              <Input name="option_d" placeholder="اختيار D" />
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="correct_answer_mc">الإجابة الصحيحة (A/B/C/D)</Label>
                <Input id="correct_answer_mc" name="correct_answer" maxLength={1} dir="ltr" />
              </div>
            </div>
          )}

          {type === "dropdown" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input name="option_a" placeholder="اختيار A" />
              <Input name="option_b" placeholder="اختيار B" />
              <Input name="option_c" placeholder="اختيار C" />
              <Input name="option_d" placeholder="اختيار D" />
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="correct_answer_dd">الإجابة الصحيحة (A/B/C/D)</Label>
                <Input id="correct_answer_dd" name="correct_answer" maxLength={1} dir="ltr" />
              </div>
            </div>
          )}

          {type === "checkboxes" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input name="option_a" placeholder="اختيار A" />
              <Input name="option_b" placeholder="اختيار B" />
              <Input name="option_c" placeholder="اختيار C" />
              <Input name="option_d" placeholder="اختيار D" />
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="correct_answer_cb">
                  الإجابات الصحيحة (افصل بفاصلة، مثال: A,C)
                </Label>
                <Input id="correct_answer_cb" name="correct_answer" dir="ltr" />
              </div>
            </div>
          )}

          {type === "true_false" && (
            <div className="space-y-2">
              <Label htmlFor="correct_answer_tf">الإجابة الصحيحة</Label>
              <select
                id="correct_answer_tf"
                name="correct_answer"
                className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
              >
                <option value="true">صح</option>
                <option value="false">خطأ</option>
              </select>
            </div>
          )}

          {type === "short_answer" && (
            <div className="space-y-2">
              <Label htmlFor="correct_answer_sa">الإجابة الصحيحة (نص مطابق)</Label>
              <Input id="correct_answer_sa" name="correct_answer" />
            </div>
          )}

          {type === "essay" && (
            <p className="text-sm text-muted-foreground">
              هيتم تصحيح السؤال ده يدويًا بعد التسليم
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="attachment">مرفق (اختياري — صورة أو PDF)</Label>
            <Input
              id="attachment"
              name="attachment"
              type="file"
              accept="image/*,application/pdf"
            />
          </div>

          <Button type="submit" size="sm">
            إضافة السؤال
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
