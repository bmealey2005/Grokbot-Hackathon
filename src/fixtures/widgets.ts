import type { Level, QuestionEnvelope, QuestionRequest, WidgetSpec } from "@/lib/schema";

export const multipleChoiceSpec = {
  widget: "multipleChoice",
  props: {
    prompt: "Which organelle produces most of a eukaryotic cell's ATP?",
    options: [
      "The nucleus, where ribosomal subunits are assembled",
      "The chloroplast, where the Calvin cycle fixes carbon",
      "The mitochondrion, where cellular respiration is completed",
      "The ribosome, where mRNA is translated into protein",
    ],
    correctIndex: 2,
    explanation:
      "Mitochondria run the Krebs cycle and the electron transport chain, producing most of the cell's ATP. Chloroplasts also make ATP, but that ATP is used inside the chloroplast during photosynthesis.",
  },
} satisfies WidgetSpec;

export const trueFalseSpec = {
  widget: "trueFalse",
  props: {
    statement:
      "During mitosis, homologous chromosomes separate and the daughter cells become haploid.",
    answer: false,
    explanation:
      "Homologous chromosomes separate in meiosis I. Mitosis separates sister chromatids and keeps the diploid chromosome number.",
  },
} satisfies WidgetSpec;

export const clozeSpec = {
  widget: "cloze",
  props: {
    text: "In DNA, adenine pairs with {{blank}} and guanine pairs with {{blank}}.",
    answers: [
      ["thymine", "Thymine", "T"],
      ["cytosine", "Cytosine", "C"],
    ],
    explanation:
      "Complementary base pairing is adenine–thymine and guanine–cytosine. The strands are held together by hydrogen bonds.",
  },
} satisfies WidgetSpec;

export const typeAnswerSpec = {
  widget: "typeAnswer",
  props: {
    prompt:
      "What process moves water across a selectively permeable membrane toward a higher solute concentration?",
    accepted: ["osmosis", "Osmosis"],
    explanation:
      "Osmosis is the diffusion of water across a selectively permeable membrane, from lower solute concentration toward higher solute concentration.",
  },
} satisfies WidgetSpec;

export const matchPairsSpec = {
  widget: "matchPairs",
  props: {
    prompt: "Match each organelle to its role.",
    pairs: [
      { left: "Mitochondrion", right: "Produces most of the cell's ATP" },
      { left: "Chloroplast", right: "Carries out photosynthesis" },
      { left: "Ribosome", right: "Translates mRNA into protein" },
      { left: "Nucleus", right: "Stores the chromosomes" },
    ],
  },
} satisfies WidgetSpec;

export const orderStepsSpec = {
  widget: "orderSteps",
  props: {
    prompt: "Order the stages of mitosis from first to last.",
    steps: ["Prophase", "Metaphase", "Anaphase", "Telophase"],
    explanation:
      "Chromosomes condense in prophase, line up in metaphase, sister chromatids separate in anaphase, and two nuclei form in telophase.",
  },
} satisfies WidgetSpec;

export const sliderSpec = {
  widget: "slider",
  props: {
    prompt:
      "About how many ATP molecules does the aerobic respiration of one glucose molecule yield?",
    min: 0,
    max: 40,
    answer: 30,
    tolerance: 2,
    unit: "ATP",
    explanation:
      "Aerobic respiration of one glucose yields about 30 to 32 ATP. Answers from 28 through 32 count as correct here.",
  },
} satisfies WidgetSpec;

export const explainSpec = {
  widget: "explain",
  props: {
    prompt: "In your own words, explain how an enzyme speeds up a reaction.",
    rubric: [
      "It lowers the activation energy of the reaction",
      "The substrate binds at the active site",
      "The enzyme is not consumed by the reaction",
    ],
  },
} satisfies WidgetSpec;

export const widgetSpecs = {
  multipleChoice: multipleChoiceSpec,
  trueFalse: trueFalseSpec,
  cloze: clozeSpec,
  typeAnswer: typeAnswerSpec,
  matchPairs: matchPairsSpec,
  orderSteps: orderStepsSpec,
  slider: sliderSpec,
  explain: explainSpec,
} satisfies Record<WidgetSpec["widget"], WidgetSpec>;

/** Level 1 recognize, level 2 recall, level 3 apply. The stub cycles within the level. */
export const WIDGETS_BY_LEVEL: Record<Level, WidgetSpec["widget"][]> = {
  1: ["multipleChoice", "trueFalse"],
  2: ["cloze", "typeAnswer", "matchPairs"],
  3: ["orderSteps", "slider", "explain"],
};

export function chooseFixtureWidget(
  level: Level,
  recentWidgets: readonly string[],
): WidgetSpec["widget"] {
  const options = WIDGETS_BY_LEVEL[level];
  const unused = options.find((name) => !recentWidgets.includes(name));
  if (unused) return unused;
  return options[recentWidgets.length % options.length];
}

/** Fixture-backed question until Agent 3's generator replaces this route. */
export function envelopeFromFixture(request: QuestionRequest): QuestionEnvelope {
  const widget = chooseFixtureWidget(request.level, request.recentWidgets);
  return {
    conceptIds: [request.concept.id],
    level: request.level,
    spec: widgetSpecs[widget],
  };
}
