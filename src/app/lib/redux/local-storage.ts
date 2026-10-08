import { initialResumeState } from "lib/redux/resumeSlice";
import { initialSettings } from "lib/redux/settingsSlice";
import {
  createCollection,
  createResumeId,
  type ResumeCollection,
} from "lib/redux/resume-collection";

/** 新版集合的存储键；旧键仅用于迁移备份。 */
export const COLLECTION_STORAGE_KEY = "open-resume-collection";
/** 旧版单份简历的存储键。 */
export const LEGACY_STORAGE_KEY = "open-resume-state";

/** 判断读取的值是不是普通数据对象。 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/** 依据默认结构校验类型，同时为旧数据补齐新增字段。 */
const normalizeStoredValue = <T>(defaults: T, value: unknown): T => {
  if (value === undefined) return JSON.parse(JSON.stringify(defaults)) as T;
  if (Array.isArray(defaults)) {
    if (!Array.isArray(value)) throw new Error("简历列表字段格式错误");
    // 空默认数组是描述文字列表，非空数组使用首项作为结构模板。
    const itemTemplate = defaults.length ? defaults[0] : "";
    return value.map((item) => normalizeStoredValue(itemTemplate, item)) as T;
  }
  if (isRecord(defaults)) {
    if (!isRecord(value)) throw new Error("简历字段格式错误");
    // 只读取已知字段，避免原型字段及未知结构进入应用状态。
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(defaults)) {
      result[key] = normalizeStoredValue(defaults[key], value[key]);
    }
    return result as T;
  }
  if (typeof defaults !== typeof value) throw new Error("简历字段类型错误");
  return value as T;
};

/** 归一化一份内容和设置，并校验板块顺序。 */
const normalizeWorkspace = (value: unknown) => {
  if (!isRecord(value) || !isRecord(value.resume)) {
    throw new Error("缺少有效的简历内容");
  }
  // 补齐包括数组内条目在内的所有新增字段。
  const resume = normalizeStoredValue(initialResumeState, value.resume);
  // 每份简历独立恢复其排版设置。
  const settings = normalizeStoredValue(initialSettings, value.settings);
  if (
    new Set(settings.formsOrder).size !== settings.formsOrder.length ||
    settings.formsOrder.some(
      (form) => !initialSettings.formsOrder.includes(form)
    )
  ) {
    throw new Error("简历板块顺序格式错误");
  }
  // 老版本未包含的新增板块追加到末尾，保留用户原有排序。
  settings.formsOrder = [
    ...settings.formsOrder,
    ...initialSettings.formsOrder.filter(
      (form) => !settings.formsOrder.includes(form)
    ),
  ];
  return { resume, settings };
};

/** 校验版本、记录标识及当前项，损坏数据不作为空集合处理。 */
export const normalizeCollection = (value: unknown): ResumeCollection => {
  if (
    !isRecord(value) ||
    value.version !== 2 ||
    typeof value.activeResumeId !== "string" ||
    !Array.isArray(value.resumes) ||
    !value.resumes.length
  )
    throw new Error("简历集合格式错误");
  // 标识集合用于拒绝会导致错误切换的重复 ID。
  const ids = new Set<string>();
  // 所有记录都需有效，不能悄悄丢弃损坏的简历。
  const resumes = value.resumes.map((document) => {
    if (
      !isRecord(document) ||
      typeof document.id !== "string" ||
      !document.id ||
      typeof document.name !== "string" ||
      !document.name.trim() ||
      ids.has(document.id)
    )
      throw new Error("简历记录格式错误");
    ids.add(document.id);
    return {
      id: document.id,
      name: document.name.trim(),
      ...normalizeWorkspace(document),
    };
  });
  if (!ids.has(value.activeResumeId)) throw new Error("当前简历不存在");
  return { version: 2, activeResumeId: value.activeResumeId, resumes };
};

/** 读取新集合，或将有效旧数据转换为待持久化的第一份简历。 */
export const loadResumeCollection = (): ResumeCollection | undefined => {
  // 新键存在时必须以它为准，包括内容损坏的情况。
  const savedCollection = localStorage.getItem(COLLECTION_STORAGE_KEY);
  if (savedCollection !== null)
    return normalizeCollection(JSON.parse(savedCollection));
  // 旧数据保留原键，只有新集合写入成功后才算迁移完成。
  const legacyState = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (legacyState === null) return undefined;
  return createCollection({
    id: createResumeId(),
    name: "默认简历",
    ...normalizeWorkspace(JSON.parse(legacyState)),
  });
};

/** 单次原子写入整套集合；失败交给界面处理，不能静默吞掉。 */
export const saveResumeCollection = (collection: ResumeCollection) => {
  localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(collection));
};

/** 导入页只判断是否存在数据，不触发迁移，也不覆盖损坏数据。 */
export const getHasUsedAppBefore = () => {
  try {
    return (
      localStorage.getItem(COLLECTION_STORAGE_KEY) !== null ||
      localStorage.getItem(LEGACY_STORAGE_KEY) !== null
    );
  } catch {
    return false;
  }
};
