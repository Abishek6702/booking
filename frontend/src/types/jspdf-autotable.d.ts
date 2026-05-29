declare module "jspdf-autotable" {
  import type { jsPDF } from "jspdf";

  interface UserOptions {
    head?: unknown[][];
    body?: unknown[][];
    startY?: number;
    theme?: "striped" | "grid" | "plain";
    headStyles?: Record<string, unknown>;
    styles?: Record<string, unknown>;
    [key: string]: unknown;
  }

  export default function autoTable(doc: jsPDF, options: UserOptions): void;
}
