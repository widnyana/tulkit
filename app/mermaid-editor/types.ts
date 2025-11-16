export interface MermaidError {
  message: string;
  line?: number;
}

export type ExportFormat = "png" | "svg" | "code";

export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
}
