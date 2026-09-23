"use client";
import { useState, useMemo, useRef } from "react";
import { ResumePDFPreviewCSR } from "components/Resume/ResumePDFPreview";
import { ResumePDF } from "components/Resume/ResumePDF";
import {
  ResumeControlBarCSR,
  ResumeControlBarBorder,
} from "components/Resume/ResumeControlBar";
import { FlexboxSpacer } from "components/FlexboxSpacer";
import { useAppSelector } from "lib/redux/hooks";
import { selectResume } from "lib/redux/resumeSlice";
import { selectSettings } from "lib/redux/settingsSlice";
import {
  useRegisterReactPDFFont,
  useRegisterReactPDFHyphenationCallback,
} from "components/fonts/hooks";
import { NonEnglishFontsCSSLazyLoader } from "components/fonts/NonEnglishFontsCSSLoader";

export const Resume = () => {
  const [scale, setScale] = useState(0.8);
  // 保存下载组件生成的 PDF 二进制数据，供右侧多页预览稳定读取。
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  // 引用实际可滚动的预览区，供自动缩放计算可用宽度。
  const resumeContainerRef = useRef<HTMLElement>(null);
  const resume = useAppSelector(selectResume);
  const settings = useAppSelector(selectSettings);
  const document = useMemo(
    () => <ResumePDF resume={resume} settings={settings} isPDF={true} />,
    [resume, settings]
  );

  useRegisterReactPDFFont();
  useRegisterReactPDFHyphenationCallback(settings.fontFamily);

  return (
    <>
      <NonEnglishFontsCSSLazyLoader />
      <div className="relative flex justify-center md:justify-start">
        <FlexboxSpacer maxWidth={50} className="hidden md:block" />
        <div className="relative min-w-0 flex-1">
          <section
            ref={resumeContainerRef}
            className="h-[calc(100vh-var(--top-nav-bar-height)-var(--resume-control-bar-height))] overflow-auto md:p-[var(--resume-padding)]"
          >
            <ResumePDFPreviewCSR
              pdfBlob={pdfBlob}
              documentSize={settings.documentSize}
              scale={scale}
            />
          </section>
          <ResumeControlBarCSR
            scale={scale}
            setScale={setScale}
            documentSize={settings.documentSize}
            resumeContainerRef={resumeContainerRef}
            document={document}
            fileName={resume.profile.name + " - 简历"}
            onPdfBlobChange={setPdfBlob}
          />
        </div>
        <ResumeControlBarBorder />
      </div>
    </>
  );
};
