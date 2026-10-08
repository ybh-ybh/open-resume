import { initialResumeState } from "lib/redux/resumeSlice";
import { initialSettings, type Settings } from "lib/redux/settingsSlice";
import type { Resume } from "lib/redux/types";
import { deepClone } from "lib/deep-clone";

/** 一份简历的完整编辑数据。 */
export interface ResumeDocument {
  id: string;
  name: string;
  resume: Resume;
  settings: Settings;
}

/** 浏览器持久化的版本化简历集合。 */
export interface ResumeCollection {
  version: 2;
  activeResumeId: string;
  resumes: ResumeDocument[];
}

/** 生成只作为记录标识使用的 ID。 */
export const createResumeId = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/** 创建独立的默认空白简历。 */
export const createBlankResume = (name = "默认简历"): ResumeDocument => ({
  id: createResumeId(),
  name,
  resume: deepClone(initialResumeState),
  settings: deepClone(initialSettings),
});

/** 从一份记录建立非空集合。 */
export const createCollection = (
  document: ResumeDocument
): ResumeCollection => ({
  version: 2,
  activeResumeId: document.id,
  resumes: [document],
});

/** 获取当前简历，调用者仅传入经过校验的集合。 */
export const getActiveResume = (collection: ResumeCollection) =>
  collection.resumes.find(
    (document) => document.id === collection.activeResumeId
  )!;

/** 生成尚未使用的默认名称。 */
export const getAvailableResumeName = (
  collection: ResumeCollection,
  base = "简历"
) => {
  // 已使用的名称用于避免默认名称重复。
  const names = new Set(collection.resumes.map((document) => document.name));
  if (!names.has(base)) return base;
  // 同名时依次添加数字后缀。
  let index = 2;
  while (names.has(`${base} ${index}`)) index++;
  return `${base} ${index}`;
};

/** 校验并归一化用户输入的名称。 */
export const normalizeResumeName = (name: string) => {
  // 去除名称两端空白，禁止保存空名称。
  const normalized = name.trim();
  if (!normalized) throw new Error("请输入简历名称");
  return normalized;
};

/** 追加一份简历并切换到新增记录。 */
export const appendResume = (
  collection: ResumeCollection,
  document: ResumeDocument
): ResumeCollection => ({
  ...collection,
  activeResumeId: document.id,
  resumes: [
    ...collection.resumes,
    { ...document, name: normalizeResumeName(document.name) },
  ],
});

/** 删除当前记录，始终留下至少一份可编辑的简历。 */
export const removeActiveResume = (
  collection: ResumeCollection
): ResumeCollection => {
  // 其他简历保持原来的创建顺序。
  const remaining = collection.resumes.filter(
    (document) => document.id !== collection.activeResumeId
  );
  return remaining.length
    ? { ...collection, resumes: remaining, activeResumeId: remaining[0].id }
    : createCollection(createBlankResume());
};

/** 把显示名称转换为可跨平台使用的 PDF 文件名。 */
export const getResumeFileName = (name: string) => {
  // 替换路径字符、控制字符和 Windows 不允许的结尾。
  const safeName = name
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/[. ]+$/, "");
  // Windows 保留设备名需加前缀，即使它带扩展名也不能直接使用。
  const fileName = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(
    safeName
  )
    ? `简历-${safeName}`
    : safeName;
  return `${fileName || "简历"}.pdf`;
};
