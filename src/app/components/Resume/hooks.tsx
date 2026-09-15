import { RefObject, useEffect, useState } from "react";
import { A4_WIDTH_PX, LETTER_WIDTH_PX } from "lib/constants";

// 手动缩放与自动缩放共用的最小比例。
export const MIN_RESUME_SCALE = 0.1;
// 手动缩放与自动缩放共用的最大比例。
export const MAX_RESUME_SCALE = 1.5;
// 缩放滑块与自动宽度计算共用的步长。
export const RESUME_SCALE_STEP = 0.01;

/**
 * useSetDefaultScale sets the largest scale that fits the preview width.
 *
 * It observes the preview container so automatic scaling stays correct when
 * the viewport or surrounding layout changes width.
 */
export const useSetDefaultScale = ({
  setScale,
  documentSize,
  resumeContainerRef,
}: {
  setScale: (scale: number) => void;
  documentSize: string;
  resumeContainerRef: RefObject<HTMLElement>;
}) => {
  // 标记当前是否需要随预览区宽度自动缩放。
  const [scaleOnResize, setScaleOnResize] = useState(true);

  useEffect(() => {
    // 获取用于承载简历的可滚动预览区。
    const resumeContainer = resumeContainerRef.current;

    if (!scaleOnResize || !resumeContainer) {
      return;
    }

    // 按预览区的内容宽度计算不会产生横向滚动条的最大比例。
    const getDefaultScale = () => {
      // 读取预览区在当前断点下生效的左侧起始内边距。
      const containerStyle = window.getComputedStyle(resumeContainer);
      // 子元素从左内边距后开始布局，右边缘到达滚动视口时才会产生横向溢出。
      const leadingPadding = parseFloat(containerStyle.paddingLeft);
      // clientWidth 会自动扣除纵向滚动条占用的宽度。
      const availableWidth = Math.max(
        resumeContainer.clientWidth - leadingPadding,
        0
      );
      // 根据当前纸张类型选择简历的原始像素宽度。
      const resumeWidth =
        documentSize === "A4" ? A4_WIDTH_PX : LETTER_WIDTH_PX;
      // 向下对齐滑块步长，避免四舍五入后产生几像素的横向溢出。
      const widthFitScale =
        Math.floor(availableWidth / resumeWidth / RESUME_SCALE_STEP) *
        RESUME_SCALE_STEP;
      // 限制到滑块支持的范围，并消除浮点运算尾差。
      const defaultScale = Number(
        Math.min(
          MAX_RESUME_SCALE,
          Math.max(MIN_RESUME_SCALE, widthFitScale)
        ).toFixed(2)
      );
      return defaultScale;
    };

    // 将当前预览区宽度对应的自动比例写入状态。
    const setDefaultScale = () => {
      // 计算当前宽度下的目标缩放比例。
      const defaultScale = getDefaultScale();
      setScale(defaultScale);
    };

    // 监听容器而非仅监听窗口，以覆盖布局自身宽度变化的情况。
    const resizeObserver = new ResizeObserver(setDefaultScale);
    setDefaultScale();
    resizeObserver.observe(resumeContainer);

    return () => {
      resizeObserver.disconnect();
    };
  }, [setScale, scaleOnResize, documentSize, resumeContainerRef]);

  return { scaleOnResize, setScaleOnResize };
};
