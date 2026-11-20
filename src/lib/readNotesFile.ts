import {
  MAX_NOTE_LENGTH,
  MAX_PDF_BYTES,
  MAX_TEXT_FILE_BYTES,
  NOTES_FILE_TYPE_ERROR,
  NOTES_OPEN_ERROR,
  NOTES_TOO_LONG_ERROR,
  PDF_NO_TEXT_ERROR,
  PDF_TOO_LARGE_ERROR,
  PDF_TRUNCATED_NOTICE,
  joinPageText,
  notesFileKind,
  titleFromNotesFile,
} from "./noteText";

export type NotesRead =
  | { ok: true; title: string; text: string; notice: string | null }
  | { ok: false; error: string };

/**
 * pdf.js loads its parser on a worker. The file in `public/` is served as a
 * same-origin module by `next dev` (Turbopack) and by `next start`, so the
 * worker URL does not depend on the bundler rewriting `import.meta.url`.
 */
const PDF_WORKER_SRC = "/pdf.worker.min.mjs";

type PdfTextItem = { str?: unknown; hasEOL?: unknown };

function pageText(items: readonly PdfTextItem[]): string {
  let text = "";
  for (const item of items) {
    if (typeof item.str !== "string") continue;
    text += item.str;
    if (item.hasEOL) text += "\n";
  }
  return text.trim();
}

async function extractPdfPages(data: ArrayBuffer): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
  const task = pdfjs.getDocument({ data: new Uint8Array(data) });
  try {
    const pdf = await task.promise;
    const pages: string[] = [];
    for (let number = 1; number <= pdf.numPages; number += 1) {
      const page = await pdf.getPage(number);
      const content = await page.getTextContent();
      pages.push(pageText(content.items as PdfTextItem[]));
    }
    return pages;
  } finally {
    await task.destroy();
  }
}

export async function readNotesFile(file: File): Promise<NotesRead> {
  const kind = notesFileKind(file);
  if (!kind) return { ok: false, error: NOTES_FILE_TYPE_ERROR };

  if (kind === "text") {
    if (file.size > MAX_TEXT_FILE_BYTES) return { ok: false, error: NOTES_TOO_LONG_ERROR };
    try {
      const contents = await file.text();
      if (contents.length > MAX_NOTE_LENGTH) return { ok: false, error: NOTES_TOO_LONG_ERROR };
      return { ok: true, title: titleFromNotesFile(file.name), text: contents, notice: null };
    } catch {
      return { ok: false, error: NOTES_OPEN_ERROR };
    }
  }

  if (file.size > MAX_PDF_BYTES) return { ok: false, error: PDF_TOO_LARGE_ERROR };
  try {
    const pages = await extractPdfPages(await file.arrayBuffer());
    const { text, truncated } = joinPageText(pages);
    if (!text.trim()) return { ok: false, error: PDF_NO_TEXT_ERROR };
    return {
      ok: true,
      title: titleFromNotesFile(file.name),
      text,
      notice: truncated ? PDF_TRUNCATED_NOTICE : null,
    };
  } catch {
    return { ok: false, error: NOTES_OPEN_ERROR };
  }
}
