import { AlertTriangle, ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";
import { DistributionBarChart } from "./distribution-bar-chart";
import type { QuizPerformanceRow } from "~/services/analyticsService";

type QuizzesPanelProps = {
  title: string;
  description?: string;
  quizzes: QuizPerformanceRow[];
  emptyMessage?: string;
};

/**
 * Per-quiz, per-question, per-option breakdown for the Quizzes tab.
 *
 * Layout: a list of quizzes, each rendered as a native `<details>` element so
 * expand/collapse is built into the platform — no client state, no JS lib,
 * keyboard-accessible by default. Inside an expanded quiz, each question
 * shows its correct rate plus a `DistributionBarChart` of option selections,
 * with the correct option highlighted via the chart's `highlighted` flag.
 *
 * Empty state: when `quizzes.length === 0`, the list is replaced with a
 * centered message inside the same Card so the layout doesn't shift.
 */
export function QuizzesPanel({
  title,
  description,
  quizzes,
  emptyMessage = "This course has no quizzes yet — performance data will appear once you add quizzes and students start attempting them.",
}: QuizzesPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {quizzes.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <ul className="space-y-2">
            {quizzes.map((quiz) => (
              <li key={quiz.quizId}>
                <QuizDetails quiz={quiz} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function QuizDetails({ quiz }: { quiz: QuizPerformanceRow }) {
  const hasAttempts = quiz.totalAttempts > 0;

  return (
    <details className="group rounded-lg border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 hover:bg-muted/30">
        <div className="flex min-w-0 items-center gap-2">
          <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{quiz.quizTitle}</p>
            <p className="text-xs text-muted-foreground">
              {quiz.lessonTitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm tabular-nums">
          {hasAttempts ? (
            <>
              <span className="text-muted-foreground">
                {quiz.totalAttempts} attempt{quiz.totalAttempts === 1 ? "" : "s"}
              </span>
              <span className="font-semibold">
                {Math.round(quiz.passRate * 100)}% pass
              </span>
            </>
          ) : (
            <span className="text-xs italic text-muted-foreground">
              No attempts yet
            </span>
          )}
        </div>
      </summary>

      <div className="border-t border-border p-4">
        {quiz.questions.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            This quiz has no questions yet.
          </p>
        ) : (
          <ol className="space-y-6">
            {quiz.questions.map((question, index) => {
              const attention = getQuestionAttention(
                question.correctRate,
                question.totalAnswers
              );
              const correctRatePercent = Math.round(question.correctRate * 100);

              return (
                <li key={question.questionId}>
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        <span className="text-muted-foreground">
                          Q{index + 1}.
                        </span>{" "}
                        {question.questionText}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-xs tabular-nums">
                      {attention.flag ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive"
                          title={attention.reason}
                        >
                          <AlertTriangle className="size-3" />
                          Needs attention
                        </span>
                      ) : null}
                      <span className="text-muted-foreground">
                        {question.totalAnswers === 0
                          ? "no answers"
                          : `${correctRatePercent}% correct (${question.totalAnswers})`}
                      </span>
                    </div>
                  </div>

                  <DistributionBarChart
                    withCard={false}
                    heightClass="h-40"
                    emptyMessage="No answers to this question yet."
                    data={question.options.map((option) => ({
                      label: option.optionText,
                      value: option.selectedCount,
                      highlighted: option.isCorrect,
                    }))}
                  />
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </details>
  );
}

/**
 * Decide whether a question should be flagged as "needs attention" in the UI.
 *
 * This is the triage logic that turns raw percentages into an instructor-
 * facing prompt. It runs once per question and the result drives a single
 * badge on the question header.
 *
 * Tuning rationale:
 *  - `MIN_SAMPLE = 5` is the smallest sample where 0% can't happen by accident
 *    on a 4-option multiple-choice question. Below it, a single confused
 *    student would tank the rate and trigger a false alarm — common on small
 *    courses just after a launch. We'd rather stay quiet than cry wolf.
 *  - `POOR_THRESHOLD = 0.5` matches the psychometric "item difficulty index"
 *    convention for items that warrant review. Higher thresholds (0.6–0.7)
 *    drift into flagging "hard question" rather than "broken question",
 *    which dilutes the badge.
 *  - Single tier on purpose. A second "egregious" tier creates the "is yellow
 *    worse than orange?" problem and we don't yet have evidence the binary
 *    signal is too coarse. Layering on later is non-breaking.
 */
function getQuestionAttention(
  correctRate: number,
  totalAnswers: number
): { flag: boolean; reason?: string } {
  const MIN_SAMPLE = 5;
  const POOR_THRESHOLD = 0.5;

  if (totalAnswers < MIN_SAMPLE) return { flag: false };
  if (correctRate >= POOR_THRESHOLD) return { flag: false };

  const percent = Math.round(correctRate * 100);
  return {
    flag: true,
    reason: `${percent}% correct across ${totalAnswers} answers — consider rewording the question or its options.`,
  };
}
