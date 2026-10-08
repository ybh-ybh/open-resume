import { useEffect } from "react";
import {
  useDispatch,
  useSelector,
  type TypedUseSelectorHook,
} from "react-redux";
import { type RootState, type AppDispatch } from "lib/redux/store";
import { initializeCollection } from "lib/redux/collection-actions";

/** 使用包含集合管理动作的应用 dispatch。 */
export const useAppDispatch: () => AppDispatch = useDispatch;
/** 保持已有表单的类型安全 selector 接口。 */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

/** 客户端初始化一次；自动保存由 store 中间件在读取完成后负责。 */
export const useSetInitialStore = () => {
  // 依赖 Provider 注入的 store，便于独立测试和复用。
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(initializeCollection());
  }, [dispatch]);
};
