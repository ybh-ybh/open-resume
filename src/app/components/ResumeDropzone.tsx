import { useState } from "react";
import { LockClosedIcon } from "@heroicons/react/24/solid";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { parseResumeFromPdf } from "lib/parse-resume-from-pdf";
import { getHasUsedAppBefore } from "lib/redux/local-storage";
import { importResume } from "lib/redux/collection-actions";
import { store } from "lib/redux/store";
import { type ShowForm, initialSettings } from "lib/redux/settingsSlice";
import { useRouter } from "next/navigation";
import addPdfSrc from "public/assets/add-pdf.svg";
import Image from "next/image";
import { cx } from "lib/cx";
import { deepClone } from "lib/deep-clone";

const defaultFileState = {
  name: "",
  size: 0,
  fileUrl: "",
};

export const ResumeDropzone = ({
  onFileUrlChange,
  className,
  playgroundView = false,
}: {
  onFileUrlChange: (fileUrl: string) => void;
  className?: string;
  playgroundView?: boolean;
}) => {
  const [file, setFile] = useState(defaultFileState);
  const [isHoveredOnDropzone, setIsHoveredOnDropzone] = useState(false);
  const [hasNonPdfFile, setHasNonPdfFile] = useState(false);
  // 导入过程中禁用重复点击，并将解析或存储错误留在当前页面。
  const [isImporting, setIsImporting] = useState(false);
  // 错误不会触发跳转，已有数据始终保留。
  const [importError, setImportError] = useState("");
  const router = useRouter();

  const hasFile = Boolean(file.name);

  const setNewFile = (newFile: File) => {
    if (file.fileUrl) {
      URL.revokeObjectURL(file.fileUrl);
    }

    const { name, size } = newFile;
    const fileUrl = URL.createObjectURL(newFile);
    setFile({ name, size, fileUrl });
    onFileUrlChange(fileUrl);
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const newFile = event.dataTransfer.files[0];
    if (newFile.name.endsWith(".pdf")) {
      setHasNonPdfFile(false);
      setNewFile(newFile);
    } else {
      setHasNonPdfFile(true);
    }
    setIsHoveredOnDropzone(false);
  };

  const onInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFile = files[0];
    setNewFile(newFile);
  };

  const onRemove = () => {
    setFile(defaultFileState);
    onFileUrlChange("");
  };

  /** 解析并追加当前 PDF，保存成功后才进入制作页。 */
  const onImportClick = async () => {
    if (isImporting) return;
    setIsImporting(true);
    setImportError("");
    try {
      // PDF 解析结果将作为新的独立简历记录。
      const resume = await parseResumeFromPdf(file.fileUrl);
      // 导入记录使用默认排版，并保留原有板块显示推断。
      const settings = deepClone(initialSettings);

      // Set formToShow settings based on uploaded resume if users have used the app before
      if (getHasUsedAppBefore()) {
        // 根据解析出的内容决定显示哪些板块。
        const sections = Object.keys(settings.formToShow) as ShowForm[];
        // 对应原有导入流程的板块存在性判断。
        const sectionToFormToShow: Record<ShowForm, boolean> = {
          workExperiences: resume.workExperiences.length > 0,
          educations: resume.educations.length > 0,
          projects: resume.projects.length > 0,
          skills: resume.skills.descriptions.length > 0,
          custom: resume.custom.descriptions.length > 0,
        };
        for (const section of sections) {
          settings.formToShow[section] = sectionToFormToShow[section];
        }
      }

      // 导入名称使用文件名，不改变解析得到的个人姓名。
      const name = file.name.replace(/\.pdf$/i, "").trim() || "导入简历";
      if (store.dispatch(importResume(name, resume, settings))) {
        router.push("/resume-builder");
      } else {
        setImportError(store.getState().storage.error);
      }
    } catch {
      setImportError("PDF 导入失败，请检查文件后重试。已有简历已保留。");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div
      className={cx(
        "flex justify-center rounded-md border-2 border-dashed border-gray-300 px-6 ",
        isHoveredOnDropzone && "border-sky-400",
        playgroundView ? "pb-6 pt-4" : "py-12",
        className
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setIsHoveredOnDropzone(true);
      }}
      onDragLeave={() => setIsHoveredOnDropzone(false)}
      onDrop={onDrop}
    >
      <div
        className={cx(
          "text-center",
          playgroundView ? "space-y-2" : "space-y-3"
        )}
      >
        {!playgroundView && (
          <Image
            src={addPdfSrc}
            className="mx-auto h-14 w-14"
            alt="Add pdf"
            aria-hidden="true"
            priority
          />
        )}
        {!hasFile ? (
          <>
            <p
              className={cx(
                "pt-3 text-gray-700",
                !playgroundView && "text-lg font-semibold"
              )}
            >
              Browse a pdf file or drop it here
            </p>
            <p className="flex text-sm text-gray-500">
              <LockClosedIcon className="mr-1 mt-1 h-3 w-3 text-gray-400" />
              File data is used locally and never leaves your browser
            </p>
          </>
        ) : (
          <div className="flex items-center justify-center gap-3 pt-3">
            <div className="pl-7 font-semibold text-gray-900">
              {file.name} - {getFileSizeString(file.size)}
            </div>
            <button
              type="button"
              className="outline-theme-blue rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
              title="Remove file"
              onClick={onRemove}
              disabled={isImporting}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        )}
        <div className="pt-4">
          {!hasFile ? (
            <>
              <label
                className={cx(
                  "within-outline-theme-purple cursor-pointer rounded-full px-6 pb-2.5 pt-2 font-semibold shadow-sm",
                  playgroundView ? "border" : "bg-primary"
                )}
              >
                Browse file
                <input
                  type="file"
                  className="sr-only"
                  accept=".pdf"
                  onChange={onInputChange}
                />
              </label>
              {hasNonPdfFile && (
                <p className="mt-6 text-red-400">Only pdf file is supported</p>
              )}
            </>
          ) : (
            <>
              {!playgroundView && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={onImportClick}
                  disabled={isImporting}
                >
                  {isImporting ? "正在导入…" : "新增简历并继续"}{" "}
                  <span aria-hidden="true">→</span>
                </button>
              )}
              <p className={cx(" text-gray-500", !playgroundView && "mt-6")}>
                Note: {!playgroundView ? "Import" : "Parser"} works best on
                single column resume
              </p>
              {importError && (
                <p role="alert" className="mt-3 text-sm text-red-600">
                  {importError}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const getFileSizeString = (fileSizeB: number) => {
  const fileSizeKB = fileSizeB / 1024;
  const fileSizeMB = fileSizeKB / 1024;
  if (fileSizeKB < 1000) {
    return fileSizeKB.toPrecision(3) + " KB";
  } else {
    return fileSizeMB.toPrecision(3) + " MB";
  }
};
