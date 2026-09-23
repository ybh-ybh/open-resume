"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import * as pdfjs from "pdfjs-dist";
// @ts-ignore pdfjs-dist 没有为 webpack worker 入口提供类型声明。
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.entry";
import type {
  PDFDocumentProxy,
  RenderTask,
} from "pdfjs-dist/types/src/display/api";
import {
  A4_HEIGHT_PX,
  A4_WIDTH_PX,
  LETTER_HEIGHT_PX,
  LETTER_WIDTH_PX,
  PX_PER_PT,
} from "lib/constants";

// 配置 PDF.js 使用项目依赖中随包提供的 worker。
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// 单页画布需要的输入参数。
type ResumePDFPageProps = {
  pdfDocument: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  documentSize: string;
};

/**
 * 将 PDF 中的一页绘制到画布，并按屏幕像素密度保持文字清晰。
 */
const ResumePDFPage = ({
  pdfDocument,
  pageNumber,
  scale,
  documentSize,
}: ResumePDFPageProps) => {
  // 保存当前页对应的画布节点。
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // 记录当前页是否仍在渲染，用于显示轻量占位状态。
  const [isRendering, setIsRendering] = useState(true);
  // 根据纸张类型计算页面未缩放时的像素尺寸。
  const pageWidth = documentSize === "A4" ? A4_WIDTH_PX : LETTER_WIDTH_PX;
  // 根据纸张类型计算页面未缩放时的像素高度。
  const pageHeight =
    documentSize === "A4" ? A4_HEIGHT_PX : LETTER_HEIGHT_PX;

  useEffect(() => {
    // 标记异步渲染是否已经失效。
    let isCancelled = false;
    // 保存 PDF.js 渲染任务，便于缩放或卸载时取消旧任务。
    let renderTask: RenderTask | undefined;

    /**
     * 读取指定 PDF 页并绘制到当前画布。
     */
    const renderPage = async () => {
      setIsRendering(true);

      // 获取 PDF 文档中的指定页面。
      const page = await pdfDocument.getPage(pageNumber);
      if (isCancelled) {
        return;
      }

      // 将原有 CSS 像素缩放比例换算为 PDF.js 使用的点缩放比例。
      const viewport = page.getViewport({ scale: scale * PX_PER_PT });
      // 最多使用 2 倍设备像素，兼顾清晰度与多页简历的内存占用。
      const outputScale = Math.min(window.devicePixelRatio || 1, 2);
      // 获取等待绘制的画布。
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      // 获取用于 PDF.js 绘制的二维上下文。
      const canvasContext = canvas.getContext("2d");
      if (!canvasContext) {
        return;
      }

      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      // 高分屏通过变换矩阵提升实际绘制分辨率，但不改变页面布局尺寸。
      const transform =
        outputScale === 1
          ? undefined
          : ([outputScale, 0, 0, outputScale, 0, 0] as const);

      renderTask = page.render({
        canvasContext,
        viewport,
        transform: transform ? [...transform] : undefined,
      });
      await renderTask.promise;

      if (!isCancelled) {
        setIsRendering(false);
      }
    };

    renderPage().catch((error: unknown) => {
      // 缩放时取消旧画布任务属于预期行为，无需向用户显示错误。
      if (!isCancelled) {
        console.error(`无法渲染简历第 ${pageNumber} 页`, error);
        setIsRendering(false);
      }
    });

    return () => {
      isCancelled = true;
      renderTask?.cancel();
    };
  }, [pdfDocument, pageNumber, scale]);

  return (
    <div
      className="relative shrink-0 overflow-hidden bg-white shadow-lg"
      style={{
        width: `${pageWidth * scale}px`,
        height: `${pageHeight * scale}px`,
      }}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`简历第 ${pageNumber} 页`}
        className="block"
      />
      {isRendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-white text-sm text-gray-400">
          正在渲染第 {pageNumber} 页…
        </div>
      )}
    </div>
  );
};

// 多页预览需要的输入参数。
type ResumePDFPreviewProps = {
  pdfBlob: Blob | null;
  scale: number;
  documentSize: string;
};

/**
 * 延迟释放旧文档，确保旧页面画布的取消副作用已经执行完毕。
 */
const scheduleDocumentDestroy = (documentToDestroy: PDFDocumentProxy) => {
  window.setTimeout(() => {
    // 清理阶段的终止异常不应影响当前已经加载完成的新预览。
    void documentToDestroy.destroy().catch(() => undefined);
  }, 0);
};

/**
 * 加载已生成的简历 PDF，并把全部页面按顺序展示在同一滚动区域中。
 */
const ResumePDFPreview = ({
  pdfBlob,
  scale,
  documentSize,
}: ResumePDFPreviewProps) => {
  // 保存当前已经加载完成的 PDF 文档。
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  // 始终指向页面当前正在使用的文档，供替换和卸载时安全释放。
  const activePdfDocumentRef = useRef<PDFDocumentProxy | null>(null);
  // 保存 PDF 加载失败时的提示信息。
  const [loadError, setLoadError] = useState("");
  // 根据纸张类型计算加载占位页的宽度。
  const pageWidth = documentSize === "A4" ? A4_WIDTH_PX : LETTER_WIDTH_PX;
  // 根据纸张类型计算加载占位页的高度。
  const pageHeight =
    documentSize === "A4" ? A4_HEIGHT_PX : LETTER_HEIGHT_PX;

  useEffect(() => {
    if (!pdfBlob) {
      return;
    }

    // 标记本次二进制数据加载是否已被后续更新取代。
    let isCancelled = false;

    setLoadError("");

    /**
     * 将 Blob 转换为 PDF.js 可独立持有的二进制数据并加载文档。
     */
    const loadDocument = async () => {
      // Blob 不会像临时下载 URL 一样在连续编辑时被提前撤销。
      const pdfBuffer = await pdfBlob.arrayBuffer();
      if (isCancelled) {
        return;
      }

      // 为 PDF.js 创建独立数据副本，避免后续 Blob 更新影响当前任务。
      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(pdfBuffer),
      });
      // 等待 PDF.js 完成文档解析。
      const nextDocument = await loadingTask.promise;

      if (isCancelled) {
        // 已过期的加载结果从未交给画布使用，可以直接释放。
        void nextDocument.destroy().catch(() => undefined);
        return;
      }

      setPdfDocument(nextDocument);
    };

    loadDocument().catch((error: unknown) => {
      if (!isCancelled) {
        console.error("无法加载简历预览", error);
        setLoadError("简历预览加载失败，请稍后重试");
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [pdfBlob]);

  useEffect(() => {
    // 读取替换前仍由画布使用的旧文档。
    const previousDocument = activePdfDocumentRef.current;
    activePdfDocumentRef.current = pdfDocument;

    if (previousDocument && previousDocument !== pdfDocument) {
      scheduleDocumentDestroy(previousDocument);
    }
  }, [pdfDocument]);

  useEffect(
    () => () => {
      // 整个预览卸载时释放最后一份仍在使用的 PDF 文档。
      const currentDocument = activePdfDocumentRef.current;
      if (currentDocument) {
        scheduleDocumentDestroy(currentDocument);
      }
    },
    []
  );

  // 根据 PDF 实际页数生成稳定的页码列表。
  const pageNumbers = useMemo(
    () =>
      pdfDocument
        ? Array.from({ length: pdfDocument.numPages }, (_, index) => index + 1)
        : [],
    [pdfDocument]
  );

  if (loadError) {
    return (
      <div
        className="flex items-center justify-center bg-white text-sm text-red-600 shadow-lg"
        style={{
          width: `${pageWidth * scale}px`,
          height: `${pageHeight * scale}px`,
        }}
        role="alert"
      >
        {loadError}
      </div>
    );
  }

  if (!pdfDocument) {
    return (
      <div
        className="flex items-center justify-center bg-white text-sm text-gray-400 shadow-lg"
        style={{
          width: `${pageWidth * scale}px`,
          height: `${pageHeight * scale}px`,
        }}
        aria-live="polite"
      >
        正在生成简历预览…
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-4 pb-4">
      {pageNumbers.map((pageNumber) => (
        <ResumePDFPage
          key={pageNumber}
          pdfDocument={pdfDocument}
          pageNumber={pageNumber}
          scale={scale}
          documentSize={documentSize}
        />
      ))}
    </div>
  );
};

/**
 * PDF.js 依赖浏览器画布与 worker，因此仅在客户端加载多页预览。
 */
export const ResumePDFPreviewCSR = dynamic(
  () => Promise.resolve(ResumePDFPreview),
  {
    ssr: false,
  }
);
