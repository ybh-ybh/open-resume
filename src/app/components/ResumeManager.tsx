"use client";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  CheckIcon,
  ChevronDownIcon,
  DocumentDuplicateIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useAppDispatch, useAppSelector } from "lib/redux/hooks";
import {
  createResume,
  deleteResume,
  duplicateResume,
  renameResume,
  retrySaveCollection,
  switchResume,
} from "lib/redux/collection-actions";
import {
  getActiveResume,
  getAvailableResumeName,
} from "lib/redux/resume-collection";

/** 集合读取及保存失败的公共提示。 */
export const ResumeStorageNotice = () => {
  // 保存错误由 Redux 统一管理，弹窗和页面显示同一状态。
  const error = useAppSelector((state) => state.storage.error);
  // 重试时保留当前未保存的内存编辑。
  const dispatch = useAppDispatch();
  if (!error) return null;
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
    >
      <span className="min-w-0 flex-1">{error}</span>
      <button
        type="button"
        onClick={() => dispatch(retrySaveCollection())}
        className="rounded-md border border-red-300 px-3 py-1 font-medium focus-visible:outline focus-visible:outline-2"
      >
        重试
      </button>
    </div>
  );
};

/** 名称弹窗及删除确认的操作类型。 */
type DialogMode = "create" | "duplicate" | "rename" | "delete";
/** 每种操作的中文标题。 */
const DIALOG_TITLES: Record<DialogMode, string> = {
  create: "新建空白简历",
  duplicate: "复制当前简历",
  rename: "重命名简历",
  delete: "删除当前简历",
};
/** 菜单按钮通用样式，保持现有表单视觉。 */
const MENU_ITEM_CLASS =
  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none";

/** 左侧表单顶部的简历切换和管理菜单。 */
export const ResumeManager = () => {
  // 集合只从 Redux 读取，不维护易过期的本地副本。
  const collection = useAppSelector((state) => state.collection);
  // 管理失败时在当前弹窗中显示保存错误。
  const storageError = useAppSelector((state) => state.storage.error);
  // 当前记录提供名称和默认复制名称。
  const active = getActiveResume(collection);
  // 动作负责先保存，再提交整套状态。
  const dispatch = useAppDispatch();
  // 记录下拉菜单是否展开。
  const [menuOpen, setMenuOpen] = useState(false);
  // 弹窗模式为空时不渲染对话框。
  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null);
  // 名称输入保留到用户确认或取消。
  const [name, setName] = useState("");
  // 菜单触发按钮也是弹窗关闭后的焦点恢复位置。
  const triggerRef = useRef<HTMLButtonElement>(null);
  // 下拉菜单区域用于外部点击和键盘导航。
  const menuRef = useRef<HTMLDivElement>(null);
  // 管理组件区域包含菜单触发按钮。
  const managerRef = useRef<HTMLDivElement>(null);
  // 对话框引用用于焦点陷阱。
  const dialogRef = useRef<HTMLDivElement>(null);
  // 名称输入框在弹窗打开时获得焦点。
  const nameRef = useRef<HTMLInputElement>(null);
  // 删除确认默认聚焦取消按钮，避免意外删除。
  const cancelRef = useRef<HTMLButtonElement>(null);

  /** 关闭弹窗并恢复菜单触发按钮的焦点。 */
  const closeDialog = () => {
    setDialogMode(null);
    triggerRef.current?.focus();
  };

  /** 打开操作弹窗，名称预填为当前名称或可用默认名称。 */
  const openDialog = (mode: DialogMode) => {
    setName(
      mode === "rename"
        ? active.name
        : getAvailableResumeName(
            collection,
            mode === "duplicate" ? `${active.name} 副本` : "简历"
          )
    );
    setMenuOpen(false);
    setDialogMode(mode);
  };

  useEffect(() => {
    if (!menuOpen) return;
    menuRef.current
      ?.querySelector<HTMLButtonElement>("[aria-checked='true']")
      ?.focus();
    /** 点击组件外部时关闭菜单，不抢走目标控件的焦点。 */
    const handleOutsideClick = (event: PointerEvent) => {
      if (!managerRef.current?.contains(event.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener("pointerdown", handleOutsideClick);
    return () =>
      document.removeEventListener("pointerdown", handleOutsideClick);
  }, [menuOpen]);

  useEffect(() => {
    if (!dialogMode) return;
    // 锁定背景滚动，并在退出时恢复原值。
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (dialogMode === "delete") cancelRef.current?.focus();
    else {
      nameRef.current?.focus();
      nameRef.current?.select();
    }
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [dialogMode]);

  /** 按方向键循环菜单项，Escape 关闭并恢复触发按钮焦点。 */
  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" || event.key === "Tab") {
      if (event.key === "Escape") event.preventDefault();
      setMenuOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    // 查询当前菜单的全部可聚焦操作，包括简历切换项。
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? []
    );
    // 当前聚焦位置用于向上和向下循环。
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    // 首尾键直接跳转，方向键在菜单首尾循环。
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
        ? items.length - 1
        : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) %
          items.length;
    items[nextIndex]?.focus();
  };

  /** 对话框内捕获 Tab，禁止焦点进入背景表单。 */
  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDialog();
      return;
    }
    if (event.key !== "Tab") return;
    // 仅使用当前可操作控件，禁用的提交按钮不参与焦点循环。
    const controls = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        "input:not(:disabled), button:not(:disabled)"
      ) ?? []
    );
    // 根据 Shift 状态选择循环边界。
    const boundary = event.shiftKey
      ? controls[0]
      : controls[controls.length - 1];
    if (document.activeElement === boundary) {
      event.preventDefault();
      (event.shiftKey ? controls[controls.length - 1] : controls[0])?.focus();
    }
  };

  /** 保存成功才关闭对话框，失败时保留名称输入和当前简历。 */
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!dialogMode || (dialogMode !== "delete" && !name.trim())) return;
    // 根据当前模式创建对应的集合动作。
    const action =
      dialogMode === "create"
        ? createResume(name)
        : dialogMode === "duplicate"
        ? duplicateResume(name)
        : dialogMode === "rename"
        ? renameResume(name)
        : deleteResume();
    if (dispatch(action)) closeDialog();
  };

  return (
    <div ref={managerRef} className="relative min-w-0">
      <div className="mb-2 text-sm font-medium text-gray-500">
        我的简历 · {collection.resumes.length} 份
      </div>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls="resume-menu"
        onClick={() => setMenuOpen(!menuOpen)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setMenuOpen(true);
          }
        }}
        className="flex w-full items-center justify-between gap-3 rounded-md border border-gray-300 bg-white px-3 py-2 text-left font-semibold text-gray-900 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"
      >
        <span className="truncate">{active.name}</span>
        <ChevronDownIcon
          className="h-5 w-5 shrink-0 text-gray-500"
          aria-hidden="true"
        />
      </button>
      {menuOpen && (
        <div
          id="resume-menu"
          ref={menuRef}
          role="menu"
          aria-label="简历管理"
          onKeyDown={handleMenuKeyDown}
          className="absolute left-0 right-0 top-full z-20 mt-2 max-h-[60vh] overflow-y-auto rounded-md border border-gray-200 bg-white p-1 shadow-lg"
        >
          {collection.resumes.map((document) => (
            <button
              key={document.id}
              type="button"
              role="menuitemradio"
              aria-checked={document.id === active.id}
              className={MENU_ITEM_CLASS}
              onClick={() => {
                if (
                  document.id === active.id ||
                  dispatch(switchResume(document.id))
                ) {
                  setMenuOpen(false);
                  triggerRef.current?.focus();
                }
              }}
            >
              <CheckIcon
                className={`h-4 w-4 shrink-0 ${
                  document.id === active.id ? "text-sky-600" : "invisible"
                }`}
                aria-hidden="true"
              />
              <span className="truncate">{document.name}</span>
            </button>
          ))}
          <div role="separator" className="my-1 border-t border-gray-100" />
          <button
            type="button"
            role="menuitem"
            className={MENU_ITEM_CLASS}
            onClick={() => openDialog("create")}
          >
            <PlusIcon className="h-4 w-4" aria-hidden="true" />
            新建空白简历
          </button>
          <button
            type="button"
            role="menuitem"
            className={MENU_ITEM_CLASS}
            onClick={() => openDialog("duplicate")}
          >
            <DocumentDuplicateIcon className="h-4 w-4" aria-hidden="true" />
            复制当前简历
          </button>
          <button
            type="button"
            role="menuitem"
            className={MENU_ITEM_CLASS}
            onClick={() => openDialog("rename")}
          >
            <PencilIcon className="h-4 w-4" aria-hidden="true" />
            重命名简历
          </button>
          <button
            type="button"
            role="menuitem"
            className={`${MENU_ITEM_CLASS} text-red-600`}
            onClick={() => openDialog("delete")}
          >
            <TrashIcon className="h-4 w-4" aria-hidden="true" />
            删除当前简历
          </button>
        </div>
      )}
      {dialogMode &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
            onClick={(event) => {
              if (event.target === event.currentTarget) closeDialog();
            }}
          >
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="resume-dialog-title"
              onKeyDown={handleDialogKeyDown}
              className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
            >
              <h2
                id="resume-dialog-title"
                className="text-lg font-semibold text-gray-900"
              >
                {DIALOG_TITLES[dialogMode]}
              </h2>
              <form onSubmit={handleSubmit}>
                {dialogMode === "delete" ? (
                  <p className="mt-4 break-words text-sm text-gray-600">
                    确认删除“{active.name}”？此操作无法撤销。
                    {collection.resumes.length === 1 &&
                      "删除后会自动创建一份空白简历。"}
                  </p>
                ) : (
                  <label className="mt-4 block text-sm font-medium text-gray-700">
                    简历名称
                    <input
                      ref={nameRef}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                      className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 font-normal text-gray-900 focus:outline-sky-500"
                    />
                    {!name.trim() && (
                      <span className="mt-1 block text-red-600">
                        请输入简历名称
                      </span>
                    )}
                  </label>
                )}
                {storageError && (
                  <p role="alert" className="mt-3 text-sm text-red-600">
                    {storageError}
                  </p>
                )}
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    ref={cancelRef}
                    type="button"
                    onClick={closeDialog}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 focus-visible:outline-sky-500"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={dialogMode !== "delete" && !name.trim()}
                    className={`rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                      dialogMode === "delete"
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-sky-600 hover:bg-sky-700"
                    }`}
                  >
                    {dialogMode === "delete" ? "确认删除" : "保存"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
