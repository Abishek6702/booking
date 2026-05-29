declare module "jspdf" {
  export class jsPDF {
    setFontSize(size: number): this;
    text(text: string, x: number, y: number): this;
    setTextColor(ch1: number, ch2?: number, ch3?: number, ch4?: number): this;
    save(filename: string): void;
  }

  export default jsPDF;
}
