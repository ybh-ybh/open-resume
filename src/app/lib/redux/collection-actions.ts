import { deepClone } from "lib/deep-clone";
import {
  appendResume,
  createBlankResume,
  createCollection,
  createResumeId,
  getActiveResume,
  normalizeResumeName,
  removeActiveResume,
  type ResumeCollection,
} from "lib/redux/resume-collection";
import {
  loadResumeCollection,
  saveResumeCollection,
} from "lib/redux/local-storage";
import {
  getStorageErrorMessage,
  restoreCollection,
  setStorageStatus,
  type CollectionThunk,
} from "lib/redux/store";
import type { Resume } from "lib/redux/types";
import type { Settings } from "lib/redux/settingsSlice";

/** 读取完成后才恢复整套状态；重复调用不会覆盖当前内存编辑。 */
export const initializeCollection =
  (): CollectionThunk => (dispatch, getState) => {
    if (getState().storage.ready) return true;
    // 读取错误和写入错误必须区分，损坏的数据绝不能被空白简历覆盖。
    let collection: ResumeCollection;
    try {
      collection =
        loadResumeCollection() ?? createCollection(createBlankResume());
    } catch {
      dispatch(
        setStorageStatus({
          blocked: true,
          error:
            "无法读取已保存的简历，数据可能损坏或浏览器存储不可用。原始数据已保留，请检查后重试。",
        })
      );
      return false;
    }
    // 有效数据即使暂时无法保存也允许编辑，错误提示持续显示。
    dispatch(restoreCollection(collection));
    return dispatch(retrySaveCollection());
  };

/** 重试保存内存中的最新内容，不从磁盘覆盖未保存的编辑。 */
export const retrySaveCollection =
  (): CollectionThunk => (dispatch, getState) => {
    // 未读成功时重试读取，不能直接写默认内容。
    const state = getState();
    if (!state.storage.ready) return dispatch(initializeCollection());
    try {
      saveResumeCollection(state.collection);
      dispatch(setStorageStatus({ error: "" }));
      return true;
    } catch (error) {
      dispatch(setStorageStatus({ error: getStorageErrorMessage(error) }));
      return false;
    }
  };

/** 管理操作先持久化最新集合，再原子提交；失败时当前编辑保持不变。 */
const changeCollection =
  (
    transform: (collection: ResumeCollection) => ResumeCollection
  ): CollectionThunk =>
  (dispatch, getState) => {
    // 状态读取必须发生在操作执行时，包含所有刚刚编辑的内容。
    const state = getState();
    if (!state.storage.ready || state.storage.blocked) return false;
    try {
      // 目标集合携带其他记录及当前最新编辑，无需分多次保存。
      const collection = transform(state.collection);
      saveResumeCollection(collection);
      dispatch(restoreCollection(collection));
      return true;
    } catch (error) {
      dispatch(setStorageStatus({ error: getStorageErrorMessage(error) }));
      return false;
    }
  };

/** 从默认内容和默认排版新建空白简历。 */
export const createResume = (name: string): CollectionThunk =>
  changeCollection((collection) =>
    appendResume(collection, createBlankResume(normalizeResumeName(name)))
  );

/** 完整复制当前简历，深拷贝保证内容、照片和设置独立。 */
export const duplicateResume = (name: string): CollectionThunk =>
  changeCollection((collection) =>
    appendResume(collection, {
      ...deepClone(getActiveResume(collection)),
      id: createResumeId(),
      name: normalizeResumeName(name),
    })
  );

/** 同时切换内容、排版和持久化的当前 ID。 */
export const switchResume = (id: string): CollectionThunk =>
  changeCollection((collection) => {
    if (!collection.resumes.some((document) => document.id === id)) {
      throw new Error("简历不存在");
    }
    return { ...collection, activeResumeId: id };
  });

/** 修改管理名称，保持个人信息中的姓名不变。 */
export const renameResume = (name: string): CollectionThunk =>
  changeCollection((collection) => ({
    ...collection,
    resumes: collection.resumes.map((document) =>
      document.id === collection.activeResumeId
        ? { ...document, name: normalizeResumeName(name) }
        : document
    ),
  }));

/** 删除当前简历，必要时自动生成新的空白简历。 */
export const deleteResume = (): CollectionThunk =>
  changeCollection(removeActiveResume);

/** 导入页无需 Provider，调用此动作追加已解析的简历并同步会话状态。 */
export const importResume =
  (name: string, resume: Resume, settings: Settings): CollectionThunk =>
  (dispatch, getState) => {
    // 从未进入制作页时先读取已有数据，首次导入不额外创建空白简历。
    let existing: ResumeCollection | undefined;
    try {
      existing = getState().storage.ready
        ? getState().collection
        : loadResumeCollection();
    } catch {
      dispatch(
        setStorageStatus({
          blocked: true,
          error: "无法读取已有简历，导入已停止，原始数据已保留。",
        })
      );
      return false;
    }
    // 导入记录与解析器返回的对象隔离。
    const document = {
      id: createResumeId(),
      name: normalizeResumeName(name),
      resume: deepClone(resume),
      settings: deepClone(settings),
    };
    // 单次写入确保原有简历不会被导入覆盖。
    const collection = existing
      ? appendResume(existing, document)
      : createCollection(document);
    try {
      saveResumeCollection(collection);
      dispatch(restoreCollection(collection));
      return true;
    } catch (error) {
      dispatch(setStorageStatus({ error: getStorageErrorMessage(error) }));
      return false;
    }
  };
