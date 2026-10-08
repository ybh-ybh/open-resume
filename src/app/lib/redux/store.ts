import {
  combineReducers,
  configureStore,
  createAction,
  type AnyAction,
  type Middleware,
  type ThunkAction,
} from "@reduxjs/toolkit";
import resumeReducer from "lib/redux/resumeSlice";
import settingsReducer from "lib/redux/settingsSlice";
import type { Resume } from "lib/redux/types";
import type { Settings } from "lib/redux/settingsSlice";
import {
  getActiveResume,
  type ResumeCollection,
} from "lib/redux/resume-collection";
import { saveResumeCollection } from "lib/redux/local-storage";

/** 存储状态不进入持久化数据，用于初始化门控和错误提示。 */
export interface StorageStatus {
  ready: boolean;
  blocked: boolean;
  error: string;
}

/** 保留现有内容和设置接口，增加集合及存储状态。 */
export interface RootState {
  resume: Resume;
  settings: Settings;
  collection: ResumeCollection;
  storage: StorageStatus;
}

/** 原子恢复集合及当前简历，避免订阅者看到半份数据。 */
export const restoreCollection =
  createAction<ResumeCollection>("collection/restore");
/** 更新不需要持久化的保存状态。 */
export const setStorageStatus =
  createAction<Partial<StorageStatus>>("storage/status");
/** 沿用现有的内容与设置 reducer。 */
const workspaceReducer = combineReducers({
  resume: resumeReducer,
  settings: settingsReducer,
});

/** 统一处理当前工作区投影和集合，所有变化只有一次 Redux 提交。 */
export const rootReducer = (
  state: RootState | undefined,
  action: AnyAction
): RootState => {
  if (restoreCollection.match(action)) {
    // 恢复已经校验的数据；初始化写入失败另由保存状态提示。
    const active = getActiveResume(action.payload);
    return {
      resume: active.resume,
      settings: active.settings,
      collection: action.payload,
      storage: { ready: true, blocked: false, error: "" },
    };
  }
  // 初始工作区不写入存储，等待客户端完成读取。
  const workspace = workspaceReducer(
    state ? { resume: state.resume, settings: state.settings } : undefined,
    action
  );
  if (!state)
    return {
      ...workspace,
      collection: { version: 2, activeResumeId: "", resumes: [] },
      storage: { ready: false, blocked: false, error: "" },
    };
  if (setStorageStatus.match(action))
    return {
      ...state,
      storage: { ...state.storage, ...action.payload },
    };
  if (
    workspace.resume === state.resume &&
    workspace.settings === state.settings
  )
    return state;
  return {
    ...state,
    ...workspace,
    collection: state.storage.ready
      ? {
          ...state.collection,
          resumes: state.collection.resumes.map((document) =>
            document.id === state.collection.activeResumeId
              ? { ...document, ...workspace }
              : document
          ),
        }
      : state.collection,
  };
};

/** 将存储异常转换为用户可以采取行动的提示。 */
export const getStorageErrorMessage = (error: unknown) =>
  error instanceof DOMException && error.name === "QuotaExceededError"
    ? "浏览器存储空间不足，修改暂未保存。请释放空间后重试。"
    : "无法保存到浏览器，修改暂未保存。请检查浏览器存储权限后重试。";

/** 编辑完成后同步保存；管理动作已提前保存，不重复写入。 */
const persistenceMiddleware: Middleware<{}, RootState> =
  (api) => (next) => (action) => {
    // 保存前的引用用于排除无关动作和状态提示动作。
    const previousCollection = api.getState().collection;
    // 先提交编辑以保留保存失败时的内存数据。
    const result = next(action);
    // 只在初始化完成后保存实际编辑产生的集合变化。
    const state = api.getState();
    if (
      state.storage.ready &&
      !state.storage.blocked &&
      state.collection !== previousCollection &&
      !restoreCollection.match(action)
    ) {
      try {
        saveResumeCollection(state.collection);
        if (state.storage.error) api.dispatch(setStorageStatus({ error: "" }));
      } catch (error) {
        api.dispatch(
          setStorageStatus({ error: getStorageErrorMessage(error) })
        );
      }
    }
    return result;
  };

/** 创建可独立验证的应用 store。 */
export const createAppStore = () =>
  configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(persistenceMiddleware),
  });

/** 当前浏览器会话共用的 Redux store。 */
export const store = createAppStore();
/** 保持原有的 dispatch 类型接口。 */
export type AppDispatch = typeof store.dispatch;
/** 返回成功状态的集合管理动作类型。 */
export type CollectionThunk = ThunkAction<
  boolean,
  RootState,
  unknown,
  AnyAction
>;
