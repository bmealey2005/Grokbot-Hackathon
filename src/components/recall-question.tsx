"use client";

import { type FormEvent, type ReactNode, useState } from "react";
import { gradeAnswer } from "@/lib/aiClient";
import { type AnswerResult, type WidgetSpec } from "@/lib/schema";
import { type SessionCurrent } from "@/lib/session";
import { Action, Icon } from "./recall-primitives";

function rotate<T>(items: T[]): T[] {
  return items.length > 1 ? [...items.slice(1), items[0]] : items;
}

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/[.!?]+$/, "");
}

function answered(score: number, feedback?: string): AnswerResult {
  return { score, correct: score === 1, feedback };
}

export function Question({ current, finish, isLoading, onContinue, evidence }: {
  current: SessionCurrent;
  finish: boolean;
  isLoading: boolean;
  onContinue: (result: AnswerResult) => void;
  evidence: ReactNode;
}) {
  const { spec } = current.envelope;
  const [choice, setChoice] = useState<number | null>(null);
  const [inputs, setInputs] = useState<string[]>([]);
  const [ordered, setOrdered] = useState(() => spec.widget === "orderSteps" ? rotate(spec.props.steps) : []);
  const [slider, setSlider] = useState(() => spec.widget === "slider" ? Math.round((spec.props.min + spec.props.max) / 2) : 0);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [openEvidence, setOpenEvidence] = useState(false);

  function setInput(index: number, value: string) {
    setInputs((previous) => {
      const next = [...previous];
      next[index] = value;
      return next;
    });
  }

  function move(index: number, delta: number) {
    setOrdered((previous) => {
      const next = [...previous];
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      return next;
    });
  }

  async function check(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (result || checking) return;
    switch (spec.widget) {
      case "multipleChoice":
        setResult(answered(Number(choice === spec.props.correctIndex), spec.props.explanation));
        return;
      case "trueFalse":
        setResult(answered(Number((choice === 0) === spec.props.answer), spec.props.explanation));
        return;
      case "cloze":
        setResult(answered(spec.props.answers.filter((accepted, index) => accepted.some((answer) => normalize(answer) === normalize(inputs[index] ?? ""))).length / Math.max(1, spec.props.answers.length), spec.props.explanation));
        return;
      case "typeAnswer":
        setResult(answered(Number(spec.props.accepted.some((answer) => normalize(answer) === normalize(inputs[0] ?? ""))), spec.props.explanation));
        return;
      case "matchPairs":
        setResult(answered(spec.props.pairs.filter((pair, index) => pair.right === inputs[index]).length / spec.props.pairs.length,
          spec.props.pairs.map(({ left, right }) => `${left}: ${right}`).join(" · ")));
        return;
      case "orderSteps":
        setResult(answered(spec.props.steps.filter((step, index) => step === ordered[index]).length / spec.props.steps.length, spec.props.explanation));
        return;
      case "slider":
        setResult(answered(Number(Math.abs(slider - spec.props.answer) <= spec.props.tolerance), spec.props.explanation));
        return;
      case "explain":
        setChecking(true);
        try {
          setResult(await gradeAnswer({ concept: current.concept, prompt: spec.props.prompt, rubric: spec.props.rubric, answer: inputs[0] ?? "" }));
        } catch {
          setResult(answered(0, current.concept.definition));
        } finally {
          setChecking(false);
        }
    }
  }

  function controls(widget: WidgetSpec): ReactNode {
    switch (widget.widget) {
      case "multipleChoice":
      case "trueFalse": {
        const options = widget.widget === "multipleChoice" ? widget.props.options : ["True", "False"];
        return options.map((option, index) => <button className="recall-option" key={index} type="button" aria-pressed={choice === index} disabled={Boolean(result)} onClick={() => setChoice(index)}><span className="recall-choice-letter">{String.fromCharCode(65 + index)}</span>{option}</button>);
      }
      case "cloze":
        return widget.props.answers.map((_, index) => <label key={index}>Blank {index + 1}<input value={inputs[index] ?? ""} onChange={(event) => setInput(index, event.target.value)} disabled={Boolean(result)} /></label>);
      case "typeAnswer":
      case "explain":
        return <label>Your answer<textarea rows={3} value={inputs[0] ?? ""} onChange={(event) => setInput(0, event.target.value)} disabled={Boolean(result)} /></label>;
      case "matchPairs": {
        const options = rotate(widget.props.pairs.map((pair) => pair.right));
        return widget.props.pairs.map((pair, index) => <label key={index} className="recall-pair">{pair.left}<select value={inputs[index] ?? ""} onChange={(event) => setInput(index, event.target.value)} disabled={Boolean(result)}><option value="">Choose a match</option>{options.map((option, index) => <option key={index}>{option}</option>)}</select></label>);
      }
      case "orderSteps":
        return <ol className="recall-order">{ordered.map((item, index) => <li key={item}><span className="recall-choice-letter">{index + 1}</span><span>{item}</span><div>
          <button type="button" aria-label={`Move ${item} up`} disabled={index === 0 || Boolean(result)} onClick={() => move(index, -1)}><Icon kind="up" /></button>
          <button type="button" aria-label={`Move ${item} down`} disabled={index === ordered.length - 1 || Boolean(result)} onClick={() => move(index, 1)}><Icon kind="down" /></button>
        </div></li>)}</ol>;
      case "slider":
        return <label>Value <output>{slider} {widget.props.unit}</output><input type="range" min={widget.props.min} max={widget.props.max} value={slider} onChange={(event) => setSlider(Number(event.target.value))} disabled={Boolean(result)} /></label>;
    }
  }

  let ready = true;
  if (spec.widget === "multipleChoice" || spec.widget === "trueFalse") ready = choice !== null;
  if (spec.widget === "cloze") ready = spec.props.answers.every((_, index) => Boolean(inputs[index]?.trim()));
  if (spec.widget === "matchPairs") ready = spec.props.pairs.every((_, index) => Boolean(inputs[index]));
  if (spec.widget === "typeAnswer" || spec.widget === "explain") ready = Boolean(inputs[0]?.trim());
  const prompt = spec.widget === "cloze" ? spec.props.text.replaceAll("{{blank}}", "____") : spec.widget === "trueFalse" ? spec.props.statement : spec.props.prompt;

  return (
    <article className="recall-question-grid">
      <form onSubmit={check} className="recall-question">
        <h1>{prompt}</h1>
        <div className="recall-question-controls">{controls(spec)}</div>
        {result ? <>
          <div className={`recall-feedback ${result.correct ? "recall-feedback-correct" : ""}`} role="status">
            <strong>{result.correct ? "Correct" : result.score > 0 ? "Partly correct" : "Keep practicing"}</strong>
            {result.feedback && <p>{result.feedback}</p>}
          </div>
          <div className="recall-actions">
            <Action type="button" disabled={isLoading} onClick={() => onContinue(result)}>{finish ? "See results" : "Next question"}<Icon kind="arrow" /></Action>
            <Action type="button" className="recall-secondary" aria-expanded={openEvidence} onClick={() => setOpenEvidence(!openEvidence)}><Icon kind="book" />{openEvidence ? "Hide evidence" : "View evidence"}</Action>
          </div>
        </> : <div className="recall-actions"><Action type="submit" disabled={!ready || checking || isLoading} loading={checking}>Check answer</Action></div>}
      </form>
      {openEvidence && evidence}
    </article>
  );
}
