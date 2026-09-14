import { StyleSheet } from "@react-pdf/renderer";

// Tailwindcss Spacing Design System: https://tailwindcss.com/docs/theme#spacing
// It is converted from rem to pt (1rem = 12pt) since https://react-pdf.org/styling only accepts pt unit
export const spacing = {
  0: "0",
  0.5: "1.5pt",
  0.25: "0.75pt",
  1: "3pt",
  1.5: "4.5pt",
  2: "6pt",
  2.5: "7.5pt",
  3: "9pt",
  3.5: "10.5pt",
  4: "12pt",
  5: "15pt",
  6: "18pt",
  7: "21pt",
  8: "24pt",
  9: "27pt",
  10: "30pt",
  11: "33pt",
  12: "36pt",
  14: "42pt",
  16: "48pt",
  20: "60pt",
  24: "72pt",
  28: "84pt",
  32: "96pt",
  36: "108pt",
  40: "120pt",
  44: "132pt",
  48: "144pt",
  52: "156pt",
  56: "168pt",
  60: "180pt",
  64: "192pt",
  72: "216pt",
  80: "240pt",
  96: "288pt",
  full: "100%",
} as const;

/** 图三风格使用的固定中性色与强调色 */
export const resumeColors = {
  ink: "#18222C",
  body: "#344454",
  muted: "#667788",
  border: "#DCE7EE",
  surface: "#F3F7FA",
  dateSurface: "#EAF5FA",
  dateText: "#3B86A9",
  achievement: "#D94C48",
  white: "#FFFFFF",
} as const;

/** A4 中文技术简历的页面与章节留白 */
export const resumeLayout = {
  pagePaddingX: "28pt",
  pagePaddingTop: "22pt",
  pagePaddingBottom: "24pt",
  sectionSpacing: "3.6pt",
} as const;

/** PDF 与 iframe 预览共用的基础布局样式 */
export const styles = StyleSheet.create({
  flexRow: {
    display: "flex",
    flexDirection: "row",
  },
  flexRowBetween: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  flexCol: {
    display: "flex",
    flexDirection: "column",
  },
  icon: {
    width: "10pt",
    height: "10pt",
    fill: resumeColors.ink,
  },
});
