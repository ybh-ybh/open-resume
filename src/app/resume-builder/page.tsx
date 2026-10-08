"use client";
import { Provider } from "react-redux";
import { store } from "lib/redux/store";
import { ResumeForm } from "components/ResumeForm";
import { Resume } from "components/Resume";
import { useAppSelector, useSetInitialStore } from "lib/redux/hooks";
import { ResumeStorageNotice } from "components/ResumeManager";

/** 读取完成前不挂载表单和 PDF，避免初始空白内容触发保存或生成。 */
const ResumeBuilder = () => {
  useSetInitialStore();
  // 读取成功后才开放编辑。
  const ready = useAppSelector((state) => state.storage.ready);
  // 每次切换重建预览和下载实例，隔离上一份简历的异步结果。
  const activeResumeId = useAppSelector(
    (state) => state.collection.activeResumeId
  );
  // 读取失败时显示保留原始数据的提示。
  const blocked = useAppSelector((state) => state.storage.blocked);
  if (!ready)
    return (
      <main className="mx-auto max-w-2xl p-6">
        <ResumeStorageNotice />
        {!blocked && (
          <p role="status" className="text-gray-500">
            正在读取简历…
          </p>
        )}
      </main>
    );
  return (
    <main className="relative h-full w-full overflow-hidden bg-gray-50">
      <div className="grid grid-cols-3 md:grid-cols-6">
        <div className="col-span-3">
          <ResumeForm />
        </div>
        <div className="col-span-3">
          <Resume key={activeResumeId} />
        </div>
      </div>
    </main>
  );
};

export default function Create() {
  return (
    <Provider store={store}>
      <ResumeBuilder />
    </Provider>
  );
}
