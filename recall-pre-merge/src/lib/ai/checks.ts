import type { Level, QuestionRequest, WidgetSpec } from "@/lib/schema";

const LEVEL_WIDGETS: Record<Level, WidgetSpec["widget"][]> = {
  1: ["multipleChoice", "trueFalse"],
  2: ["cloze", "typeAnswer", "matchPairs"],
  3: ["orderSteps", "slider", "explain", "multipleChoice"],
};

/** Widgets allowed for this level, skipping recent ones unless nothing else fits. */
export function allowedWidgets(level: Level, recentWidgets: readonly string[]): WidgetSpec["widget"][] {
  const pool = LEVEL_WIDGETS[level];
  const fresh = pool.filter((name) => !recentWidgets.includes(name));
  return fresh.length > 0 ? fresh : [...pool];
}

function uniqueFolded(values: string[]): boolean {
  const folded = values.map((value) => value.trim().toLowerCase());
  return new Set(folded).size === folded.length;
}

/** Semantic checks the zod union does not express. Messages are fed back on retry. */
export function widgetIssues(
  spec: WidgetSpec,
  req: Pick<QuestionRequest, "level" | "recentWidgets">,
): string[] {
  const issues: string[] = [];
  const allowed = allowedWidgets(req.level, req.recentWidgets);
  if (!allowed.includes(spec.widget)) {
    issues.push(`Widget "${spec.widget}" is not allowed right now. Choose one of: ${allowed.join(", ")}.`);
  }

  switch (spec.widget) {
    case "multipleChoice": {
      const { options, correctIndex } = spec.props;
      if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
        issues.push(`correctIndex must be an integer from 0 to ${options.length - 1}.`);
      }
      if (!uniqueFolded(options)) issues.push("options must be unique.");
      if (options.some((option) => /all of the above|none of the above/i.test(option))) {
        issues.push('Do not use "all of the above" or "none of the above".');
      }
      break;
    }
    case "cloze": {
      const blanks = spec.props.text.match(/\{\{blank\}\}/g)?.length ?? 0;
      if (blanks !== spec.props.answers.length) {
        issues.push(
          `cloze has ${blanks} {{blank}} markers but answers.length is ${spec.props.answers.length}. They must match.`,
        );
      }
      if (spec.props.answers.some((accepted) => accepted.length === 0 || accepted.some((answer) => !answer.trim()))) {
        issues.push("Each blank needs at least one non-empty accepted answer.");
      }
      break;
    }
    case "slider": {
      const { min, max, answer, tolerance } = spec.props;
      if (!(min < max)) issues.push("slider min must be less than max.");
      if (answer < min || answer > max) issues.push("slider answer must be within [min, max].");
      if (tolerance < 0) issues.push("slider tolerance must be >= 0.");
      break;
    }
    case "explain": {
      if (spec.props.rubric.length < 2 || spec.props.rubric.length > 4) {
        issues.push("explain rubric must have 2 to 4 concrete points.");
      }
      break;
    }
    case "orderSteps": {
      if (!uniqueFolded(spec.props.steps)) issues.push("orderSteps steps must be unique.");
      break;
    }
    case "typeAnswer": {
      if (spec.props.accepted.length === 0 || spec.props.accepted.every((answer) => !answer.trim())) {
        issues.push("typeAnswer needs at least one accepted answer.");
      }
      break;
    }
    case "matchPairs": {
      if (!uniqueFolded(spec.props.pairs.map((pair) => pair.left))) {
        issues.push("matchPairs left values must be unique.");
      }
      if (!uniqueFolded(spec.props.pairs.map((pair) => pair.right))) {
        issues.push("matchPairs right values must be unique.");
      }
      break;
    }
    default:
      break;
  }

  return issues;
}
