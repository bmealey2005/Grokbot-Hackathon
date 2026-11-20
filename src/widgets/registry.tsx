"use client";

import type { AnswerResult, WidgetSpec } from "@/lib/schema";
import type { ReactNode } from "react";
import { Cloze } from "./Cloze";
import { Explain } from "./Explain";
import { MatchPairs } from "./MatchPairs";
import { MultipleChoice } from "./MultipleChoice";
import { OrderSteps } from "./OrderSteps";
import { Slider } from "./Slider";
import { TrueFalse } from "./TrueFalse";
import { TypeAnswer } from "./TypeAnswer";

export function renderWidget(spec: WidgetSpec, onSubmit: (result: AnswerResult) => void) {
  let widget: ReactNode;
  switch (spec.widget) {
    case "multipleChoice":
      widget = <MultipleChoice spec={spec.props} onSubmit={onSubmit} />;
      break;
    case "trueFalse":
      widget = <TrueFalse spec={spec.props} onSubmit={onSubmit} />;
      break;
    case "cloze":
      widget = <Cloze spec={spec.props} onSubmit={onSubmit} />;
      break;
    case "typeAnswer":
      widget = <TypeAnswer spec={spec.props} onSubmit={onSubmit} />;
      break;
    case "matchPairs":
      widget = <MatchPairs spec={spec.props} onSubmit={onSubmit} />;
      break;
    case "orderSteps":
      widget = <OrderSteps spec={spec.props} onSubmit={onSubmit} />;
      break;
    case "slider":
      widget = <Slider spec={spec.props} onSubmit={onSubmit} />;
      break;
    case "explain":
      widget = <Explain spec={spec.props} onSubmit={onSubmit} />;
      break;
    default: {
      const exhaustive: never = spec;
      return exhaustive;
    }
  }
  return <div data-widget={spec.widget}>{widget}</div>;
}
