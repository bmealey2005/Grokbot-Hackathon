/** Matches the reading textarea and the upload size check in the library. */
export const MAX_NOTE_LENGTH = 40_000;

/** Rough byte ceiling for .txt/.md before reading the whole file. */
export const MAX_TEXT_FILE_BYTES = MAX_NOTE_LENGTH * 4;

/** PDFs carry fonts and images, so the byte cap is higher than the text cap. */
export const MAX_PDF_BYTES = 10 * 1024 * 1024;

export const NOTES_FILE_TYPE_ERROR = "Choose a .pdf, .txt, or .md file.";
export const NOTES_TOO_LONG_ERROR = "Choose a reading under 40,000 characters.";
export const PDF_TOO_LARGE_ERROR = "This PDF is too large. Choose one under 10 MB, or paste the notes.";
export const PDF_NO_TEXT_ERROR =
  "This PDF has no extractable text. It may be a scanned image. Paste the notes instead.";
export const PDF_TRUNCATED_NOTICE = "Only the first 40,000 characters were imported.";
export const NOTES_OPEN_ERROR = "The reading couldn’t be opened. You can paste its text instead.";

/**
 * Join one string per PDF page with newlines, then keep at most `maxLength` characters.
 */
export function joinPageText(
  pages: readonly string[],
  maxLength = MAX_NOTE_LENGTH,
): { text: string; truncated: boolean } {
  const joined = pages.join("\n");
  if (joined.length <= maxLength) return { text: joined, truncated: false };
  return { text: joined.slice(0, maxLength), truncated: true };
}

export function notesFileKind(file: { name: string; type: string }): "pdf" | "text" | null {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (
    file.type === "text/plain" ||
    file.type === "text/markdown" ||
    file.type === "text/x-markdown" ||
    name.endsWith(".txt") ||
    name.endsWith(".md")
  ) {
    return "text";
  }
  return null;
}

export function titleFromNotesFile(name: string): string {
  return name.replace(/\.(pdf|txt|md)$/i, "");
}
