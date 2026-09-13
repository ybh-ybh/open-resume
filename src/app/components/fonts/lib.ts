"use client";
import {
  ENGLISH_FONT_FAMILIES,
  NON_ENGLISH_FONT_FAMILIES,
} from "components/fonts/constants";

/**
 * 返回简历编辑器可用的全部字体。
 * 中文简历默认使用思源黑体，因此不再依赖浏览器语言决定是否加载中文字体。
 */
export const getAllFontFamiliesToLoad = () => {
  return [...ENGLISH_FONT_FAMILIES, ...NON_ENGLISH_FONT_FAMILIES];
};
