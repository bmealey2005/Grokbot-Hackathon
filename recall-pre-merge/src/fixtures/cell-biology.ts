import type { Deck } from "@/lib/schema";

export const SAMPLE_DECK_ID = "cell-biology-basics";

/** Fixed timestamp so fixture tests and the sample deck stay stable. */
export const SAMPLE_DECK_CREATED_AT = Date.parse("2026-01-15T00:00:00.000Z");

export const sampleDeck: Deck = {
  id: SAMPLE_DECK_ID,
  title: "Cell Biology Basics",
  createdAt: SAMPLE_DECK_CREATED_AT,
  concepts: [
    {
      id: "mitochondria",
      term: "Mitochondrion",
      definition:
        "A double-membraned organelle that produces most of a eukaryotic cell's ATP through cellular respiration.",
      facts: [
        "The inner membrane is folded into cristae, which increases the surface area for the electron transport chain.",
        "The mitochondrial matrix holds the enzymes of the Krebs (citric acid) cycle.",
        "Mitochondria contain their own circular DNA and divide by binary fission.",
      ],
      related: ["atp", "chloroplast", "enzyme"],
    },
    {
      id: "chloroplast",
      term: "Chloroplast",
      definition:
        "The organelle in plant and algal cells where photosynthesis converts light energy into chemical energy stored in glucose.",
      facts: [
        "Thylakoid membranes contain chlorophyll and host the light-dependent reactions.",
        "The Calvin cycle fixes carbon dioxide into sugar in the stroma.",
        "Chloroplasts contain their own DNA, evidence of an endosymbiotic origin.",
      ],
      related: ["mitochondria", "atp", "enzyme"],
    },
    {
      id: "nucleus",
      term: "Nucleus",
      definition:
        "The membrane-bound compartment that stores a eukaryotic cell's chromosomes and controls gene expression.",
      facts: [
        "A double nuclear envelope, pierced by nuclear pores, separates the nucleoplasm from the cytosol.",
        "The nucleolus assembles ribosomal subunits.",
        "DNA is packaged with histone proteins into chromatin.",
      ],
      related: ["dna", "ribosome", "mitosis"],
    },
    {
      id: "ribosome",
      term: "Ribosome",
      definition:
        "The ribonucleoprotein machine that translates messenger RNA into a polypeptide chain.",
      facts: [
        "A ribosome has a large and a small subunit, both made of rRNA and proteins.",
        "Free ribosomes make proteins that stay in the cytosol; rough-ER ribosomes make proteins for membranes or secretion.",
        "Translation reads mRNA codons in the 5' to 3' direction.",
      ],
      related: ["nucleus", "dna", "enzyme"],
    },
    {
      id: "cell-membrane",
      term: "Cell membrane",
      definition:
        "A selectively permeable phospholipid bilayer that encloses the cell and regulates what enters and leaves.",
      facts: [
        "Each phospholipid has a hydrophilic head and two hydrophobic tails, so the bilayer blocks most polar molecules.",
        "Integral membrane proteins form channels, carriers, and receptors.",
        "Cholesterol modulates membrane fluidity in animal cells.",
      ],
      related: ["osmosis", "diffusion"],
    },
    {
      id: "osmosis",
      term: "Osmosis",
      definition:
        "The net diffusion of water across a selectively permeable membrane from lower solute concentration toward higher solute concentration.",
      facts: [
        "In a hypotonic solution an animal cell swells and may lyse, while a plant cell becomes turgid.",
        "In a hypertonic solution water leaves the cell, and a plant cell undergoes plasmolysis.",
        "Aquaporins speed water movement but do not change the direction of osmosis.",
      ],
      related: ["diffusion", "cell-membrane"],
    },
    {
      id: "mitosis",
      term: "Mitosis",
      definition:
        "Division of a eukaryotic nucleus that produces two genetically identical diploid daughter nuclei.",
      facts: [
        "The stages are prophase, metaphase, anaphase, and telophase, followed by cytokinesis.",
        "Sister chromatids separate at the centromere during anaphase.",
        "Mitosis is used for growth, repair, and asexual reproduction, not for making gametes.",
      ],
      related: ["meiosis", "nucleus", "dna"],
    },
    {
      id: "meiosis",
      term: "Meiosis",
      definition:
        "A two-division process that produces four haploid nuclei and introduces genetic variation in gametes.",
      facts: [
        "Homologous chromosomes pair and can cross over during prophase I.",
        "Homologous chromosomes separate in meiosis I; sister chromatids separate in meiosis II.",
        "The chromosome number is halved, so fertilization restores the diploid number.",
      ],
      related: ["mitosis", "dna", "nucleus"],
    },
    {
      id: "dna",
      term: "DNA",
      definition:
        "Deoxyribonucleic acid, the double-stranded molecule that stores genetic information in the sequence of its bases.",
      facts: [
        "Complementary base pairing is adenine with thymine and guanine with cytosine.",
        "The two strands are antiparallel and held together by hydrogen bonds.",
        "Replication is semiconservative: each daughter molecule has one old strand and one new strand.",
      ],
      related: ["nucleus", "mitosis", "ribosome"],
    },
    {
      id: "enzyme",
      term: "Enzyme",
      definition:
        "A biological catalyst, usually a protein, that speeds a reaction by lowering its activation energy without being consumed.",
      facts: [
        "Substrate molecules bind at the active site, often by induced fit.",
        "Each enzyme has an optimum temperature and pH; extremes can denature it.",
        "Competitive inhibitors bind the active site, while noncompetitive inhibitors bind elsewhere.",
      ],
      related: ["atp", "mitochondria", "ribosome"],
    },
    {
      id: "atp",
      term: "ATP",
      definition:
        "Adenosine triphosphate, the cell's short-term energy currency, made of adenine, ribose, and three phosphate groups.",
      facts: [
        "Hydrolysis of the terminal phosphate releases energy for cellular work and produces ADP plus inorganic phosphate.",
        "ATP synthase makes ATP as protons flow back into the mitochondrial matrix or the chloroplast stroma.",
        "Cells do not store large amounts of ATP; they regenerate it continuously.",
      ],
      related: ["mitochondria", "chloroplast", "enzyme"],
    },
    {
      id: "diffusion",
      term: "Diffusion",
      definition:
        "The net movement of particles from a region of higher concentration to a region of lower concentration.",
      facts: [
        "Diffusion is passive: it requires no metabolic energy.",
        "A steeper gradient, a higher temperature, and smaller molecules increase the rate.",
        "Facilitated diffusion uses membrane proteins but still moves substances down their gradient.",
      ],
      related: ["osmosis", "cell-membrane"],
    },
  ],
};
