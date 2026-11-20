import { widgetSpecs } from "@/fixtures/widgets";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWidget } from "./registry";

describe("renderWidget", () => {
  it("renders every fixture widget", () => {
    for (const spec of Object.values(widgetSpecs)) {
      const view = render(renderWidget(spec, () => {}));
      expect(view.container.querySelector(`[data-widget="${spec.widget}"]`)).toBeTruthy();
      view.unmount();
    }
  });

  it("grades multiple choice and reveals the explanation", () => {
    const onSubmit = vi.fn();
    render(renderWidget(widgetSpecs.multipleChoice, onSubmit));
    fireEvent.click(screen.getByRole("radio", { name: /mitochondrion/i }));
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ correct: true, score: 1, feedback: expect.stringContaining("Mitochondria") }),
    );
  });

  it("gives cloze credit for a one-letter typo", () => {
    const onSubmit = vi.fn();
    render(renderWidget(widgetSpecs.cloze, onSubmit));
    fireEvent.change(screen.getByLabelText("Blank 1"), { target: { value: "thymne" } });
    fireEvent.change(screen.getByLabelText("Blank 2"), { target: { value: "cytosine" } });
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ correct: true, score: 1 }));
  });
});
