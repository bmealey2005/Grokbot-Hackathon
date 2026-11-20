import { allowedWidgets } from "@/lib/ai/checks";
import type { Level, QuestionEnvelope, QuestionRequest, WidgetSpec } from "@/lib/schema";
import {
  clozeSpec,
  explainSpec,
  matchPairsSpec,
  multipleChoiceSpec,
  orderStepsSpec,
  sliderSpec,
  trueFalseSpec,
  typeAnswerSpec,
} from "./widgets";

export interface BankItem {
  conceptId: string;
  levels: Level[];
  spec: WidgetSpec;
}

const osmosisChoice = {
  widget: "multipleChoice",
  props: {
    prompt: "Which description matches osmosis?",
    options: [
      "Water diffuses toward the side with more solute",
      "Any solute spreads until its concentration is even",
      "A protein pump spends ATP to move ions uphill",
      "Sister chromatids separate and move to opposite poles",
    ],
    correctIndex: 0,
    explanation:
      "Osmosis is the diffusion of water across a selectively permeable membrane toward higher solute concentration. Diffusion of the solute itself is not osmosis.",
  },
} satisfies WidgetSpec;

const enzymeScenario = {
  widget: "multipleChoice",
  props: {
    prompt:
      "A cell raises the temperature far above an enzyme's optimum and the reaction slows to a stop. What happened?",
    options: [
      "The enzyme was used up because catalysts are reactants",
      "The active site changed shape, so the substrate no longer fits",
      "The enzyme started storing ATP instead of binding substrate",
      "The reaction's activation energy fell to zero on its own",
    ],
    correctIndex: 1,
    explanation:
      "Extremes of temperature denature an enzyme, changing the active site. The enzyme is a catalyst, so it is not consumed, and it does not store ATP.",
  },
} satisfies WidgetSpec;

const dnaStrands = {
  widget: "trueFalse",
  props: {
    statement: "The two strands of DNA run in opposite directions and are held together by hydrogen bonds.",
    answer: true,
    explanation: "The strands are antiparallel. Complementary bases pair, and hydrogen bonds hold those pairs together.",
  },
} satisfies WidgetSpec;

const diffusionEnergy = {
  widget: "trueFalse",
  props: {
    statement: "Diffusion requires the cell to spend ATP, because particles will not move on their own.",
    answer: false,
    explanation:
      "Diffusion is passive. Particles move from higher concentration to lower concentration with no metabolic energy.",
  },
} satisfies WidgetSpec;

const mitosisCloze = {
  widget: "cloze",
  props: {
    text: "Mitosis separates sister chromatids during {{blank}}, then two nuclei form during {{blank}}.",
    answers: [
      ["anaphase", "Anaphase"],
      ["telophase", "Telophase"],
    ],
    explanation:
      "Sister chromatids separate at the centromere in anaphase. Telophase rebuilds two nuclei, and cytokinesis divides the cytoplasm.",
  },
} satisfies WidgetSpec;

const osmosisCloze = {
  widget: "cloze",
  props: {
    text: "In a {{blank}} solution an animal cell swells, and in a {{blank}} solution it loses water.",
    answers: [
      ["hypotonic", "Hypotonic"],
      ["hypertonic", "Hypertonic"],
    ],
    explanation:
      "A hypotonic solution has a lower solute concentration than the cell, so water enters. A hypertonic solution draws water out.",
  },
} satisfies WidgetSpec;

const chloroplastType = {
  widget: "typeAnswer",
  props: {
    prompt: "Which organelle converts light energy into chemical energy stored in glucose?",
    accepted: ["chloroplast", "Chloroplast", "chloroplasts"],
    explanation: "Chloroplasts carry out photosynthesis. The light reactions occur in the thylakoids and the Calvin cycle in the stroma.",
  },
} satisfies WidgetSpec;

const ribosomeType = {
  widget: "typeAnswer",
  props: {
    prompt: "What machine translates messenger RNA into a polypeptide?",
    accepted: ["ribosome", "Ribosome", "a ribosome"],
    explanation: "A ribosome is made of rRNA and protein. It reads mRNA codons from 5' to 3' and builds the chain.",
  },
} satisfies WidgetSpec;

const tonicityPairs = {
  widget: "matchPairs",
  props: {
    prompt: "Match each solution with what it does to an animal cell.",
    pairs: [
      { left: "Hypotonic", right: "Water enters and the cell may lyse" },
      { left: "Hypertonic", right: "Water leaves and the cell shrinks" },
      { left: "Isotonic", right: "Water enters and leaves at the same rate" },
    ],
  },
} satisfies WidgetSpec;

const divisionPairs = {
  widget: "matchPairs",
  props: {
    prompt: "Match each division event with the process that does it.",
    pairs: [
      { left: "Sister chromatids separate once", right: "Mitosis" },
      { left: "Homologous chromosomes separate", right: "Meiosis I" },
      { left: "Four haploid nuclei result", right: "Meiosis" },
      { left: "Two diploid nuclei result", right: "Mitosis, including cytokinesis" },
    ],
  },
} satisfies WidgetSpec;

const meiosisOrder = {
  widget: "orderSteps",
  props: {
    prompt: "Order these meiosis events from first to last.",
    steps: [
      "Homologous chromosomes pair and can cross over",
      "Homologous chromosomes separate",
      "Sister chromatids separate",
      "Four haploid nuclei are present",
    ],
    explanation:
      "Pairing and crossing over happen in prophase I. Homologs separate in meiosis I, sister chromatids separate in meiosis II, and the result is four haploid nuclei.",
  },
} satisfies WidgetSpec;

const photosynthesisOrder = {
  widget: "orderSteps",
  props: {
    prompt: "Order the photosynthesis events from first to last.",
    steps: [
      "Pigments in the thylakoid membrane absorb light",
      "The light reactions form ATP and NADPH",
      "The Calvin cycle fixes carbon dioxide in the stroma",
    ],
    explanation:
      "Light is captured in the thylakoids. Those reactions supply ATP and NADPH, which the Calvin cycle uses in the stroma to fix carbon dioxide.",
  },
} satisfies WidgetSpec;

const phosphateSlider = {
  widget: "slider",
  props: {
    prompt: "How many phosphate groups does one molecule of ATP contain?",
    min: 0,
    max: 5,
    answer: 3,
    tolerance: 0,
    unit: "phosphate groups",
    explanation: "ATP is adenosine triphosphate: adenine, ribose, and three phosphate groups.",
  },
} satisfies WidgetSpec;

const meiosisCountSlider = {
  widget: "slider",
  props: {
    prompt: "How many haploid nuclei does one round of meiosis produce?",
    min: 0,
    max: 8,
    answer: 4,
    tolerance: 0,
    unit: "nuclei",
    explanation: "Meiosis is two divisions and produces four haploid nuclei. Fertilization later restores the diploid number.",
  },
} satisfies WidgetSpec;

const osmosisExplain = {
  widget: "explain",
  props: {
    prompt: "Explain why water moves into an animal cell placed in a hypotonic solution.",
    rubric: [
      "The solution has a lower solute concentration than the cell",
      "Water moves across the selectively permeable membrane toward higher solute",
      "The movement is osmosis and does not require cellular energy",
    ],
  },
} satisfies WidgetSpec;

const cristaeExplain = {
  widget: "explain",
  props: {
    prompt: "Explain how cristae help a mitochondrion make ATP.",
    rubric: [
      "The inner membrane folds into cristae",
      "The folds increase membrane surface area",
      "More surface area holds more electron-transport chain proteins",
    ],
  },
} satisfies WidgetSpec;

/** Three specs per widget, tied to Cell Biology Basics concept ids. */
export const questionBank: BankItem[] = [
  { conceptId: "mitochondria", levels: [1], spec: multipleChoiceSpec },
  { conceptId: "osmosis", levels: [1], spec: osmosisChoice },
  { conceptId: "enzyme", levels: [3], spec: enzymeScenario },
  { conceptId: "mitosis", levels: [1], spec: trueFalseSpec },
  { conceptId: "dna", levels: [1], spec: dnaStrands },
  { conceptId: "diffusion", levels: [1], spec: diffusionEnergy },
  { conceptId: "dna", levels: [2], spec: clozeSpec },
  { conceptId: "mitosis", levels: [2], spec: mitosisCloze },
  { conceptId: "osmosis", levels: [2], spec: osmosisCloze },
  { conceptId: "osmosis", levels: [2], spec: typeAnswerSpec },
  { conceptId: "chloroplast", levels: [2], spec: chloroplastType },
  { conceptId: "ribosome", levels: [2], spec: ribosomeType },
  { conceptId: "mitochondria", levels: [2], spec: matchPairsSpec },
  { conceptId: "osmosis", levels: [2], spec: tonicityPairs },
  { conceptId: "mitosis", levels: [2], spec: divisionPairs },
  { conceptId: "mitosis", levels: [3], spec: orderStepsSpec },
  { conceptId: "meiosis", levels: [3], spec: meiosisOrder },
  { conceptId: "chloroplast", levels: [3], spec: photosynthesisOrder },
  { conceptId: "atp", levels: [3], spec: sliderSpec },
  { conceptId: "atp", levels: [3], spec: phosphateSlider },
  { conceptId: "meiosis", levels: [3], spec: meiosisCountSlider },
  { conceptId: "enzyme", levels: [3], spec: explainSpec },
  { conceptId: "osmosis", levels: [3], spec: osmosisExplain },
  { conceptId: "mitochondria", levels: [3], spec: cristaeExplain },
];

export function specsForWidget(widget: WidgetSpec["widget"]): WidgetSpec[] {
  return questionBank.filter((item) => item.spec.widget === widget).map((item) => item.spec);
}

/**
 * A canned question for this concept, level, and recent-widget list.
 * Returns null when the sample deck has nothing that fits, so the caller can build a typeAnswer.
 */
export function matchingQuestionFixture(req: QuestionRequest): QuestionEnvelope | null {
  const allowed = new Set(allowedWidgets(req.level, req.recentWidgets));
  const hit = questionBank.find(
    (item) => item.conceptId === req.concept.id && item.levels.includes(req.level) && allowed.has(item.spec.widget),
  );
  if (!hit) return null;
  return {
    conceptIds: [req.concept.id],
    level: req.level,
    spec: hit.spec,
  };
}
