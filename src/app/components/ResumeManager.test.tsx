import { fireEvent, render, screen, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { ResumeManager, ResumeStorageNotice } from "components/ResumeManager";
import { createAppStore } from "lib/redux/store";
import { initializeCollection } from "lib/redux/collection-actions";

/** 创建独立初始化状态，并挂载真实菜单和存储提示。 */
const renderManager = () => {
  // 每次渲染都使用独立集合和真实 localStorage。
  const app = createAppStore();
  app.dispatch(initializeCollection());
  render(
    <Provider store={app}>
      <ResumeManager />
      <ResumeStorageNotice />
    </Provider>
  );
  return app;
};

beforeEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

it("空白名称不可提交，取消不创建，Escape 恢复焦点", () => {
  // 观察取消前后的记录数量。
  const app = renderManager();
  // 菜单触发按钮是关闭后的焦点目标。
  const trigger = screen.getByRole("button", { name: "默认简历" });
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole("menuitem", { name: "新建空白简历" }));
  // 名称输入自动获得焦点。
  const input = screen.getByRole("textbox", { name: "简历名称" });
  expect(document.activeElement).toBe(input);
  fireEvent.change(input, { target: { value: "   " } });
  expect(
    (screen.getByRole("button", { name: "保存" }) as HTMLButtonElement).disabled
  ).toBe(true);
  fireEvent.keyDown(input, { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(trigger);
  expect(app.getState().collection.resumes).toHaveLength(1);
});

it("新建、重命名、切换和删除确认均使用集合动作", () => {
  // 菜单操作和 Redux 内容使用真实集成。
  const app = renderManager();
  fireEvent.click(screen.getByRole("button", { name: "默认简历" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "新建空白简历" }));
  fireEvent.change(screen.getByRole("textbox", { name: "简历名称" }), {
    target: { value: " 前端岗位 " },
  });
  fireEvent.click(screen.getByRole("button", { name: "保存" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "前端岗位" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "重命名简历" }));
  fireEvent.change(screen.getByRole("textbox", { name: "简历名称" }), {
    target: { value: "全栈岗位" },
  });
  fireEvent.click(screen.getByRole("button", { name: "保存" }));
  fireEvent.click(screen.getByRole("button", { name: "全栈岗位" }));
  fireEvent.click(screen.getByRole("menuitemradio", { name: "默认简历" }));
  expect(app.getState().collection.resumes).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "默认简历" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "删除当前简历" }));
  expect(document.activeElement).toBe(
    screen.getByRole("button", { name: "取消" })
  );
  fireEvent.click(screen.getByRole("button", { name: "取消" }));
  expect(app.getState().collection.resumes).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "默认简历" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "删除当前简历" }));
  fireEvent.click(screen.getByRole("button", { name: "确认删除" }));
  expect(app.getState().collection.resumes).toHaveLength(1);
  expect(screen.getByRole("button", { name: "全栈岗位" })).toBeTruthy();
});

it("菜单方向键导航、弹窗焦点循环及取消恢复焦点", () => {
  renderManager();
  // 触发按钮支持方向键展开。
  const trigger = screen.getByRole("button", { name: "默认简历" });
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  expect(document.activeElement).toBe(
    screen.getByRole("menuitemradio", { name: "默认简历" })
  );
  fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
  expect(document.activeElement).toBe(
    screen.getByRole("menuitem", { name: "新建空白简历" })
  );
  fireEvent.click(screen.getByRole("menuitem", { name: "复制当前简历" }));
  // 从最后一个按钮按 Tab 必须回到名称输入。
  const save = screen.getByRole("button", { name: "保存" });
  save.focus();
  fireEvent.keyDown(save, { key: "Tab" });
  expect(document.activeElement).toBe(
    screen.getByRole("textbox", { name: "简历名称" })
  );
  fireEvent.keyDown(document.activeElement!, { key: "Tab", shiftKey: true });
  expect(document.activeElement).toBe(save);
  fireEvent.click(screen.getByRole("button", { name: "取消" }));
  expect(document.activeElement).toBe(trigger);
});

it("保存失败保留弹窗输入和当前记录，恢复权限后可提交", () => {
  // 测试真实 localStorage 异常和弹窗错误展示。
  const app = renderManager();
  fireEvent.click(screen.getByRole("button", { name: "默认简历" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "复制当前简历" }));
  fireEvent.change(screen.getByRole("textbox", { name: "简历名称" }), {
    target: { value: "待保存副本" },
  });
  // 存储临时不可用时操作不应关闭。
  const failure = jest
    .spyOn(Storage.prototype, "setItem")
    .mockImplementation(() => {
      throw new Error("denied");
    });
  fireEvent.click(screen.getByRole("button", { name: "保存" }));
  expect(
    within(screen.getByRole("dialog")).getByRole("alert").textContent
  ).toContain("无法保存");
  expect(
    (screen.getByRole("textbox", { name: "简历名称" }) as HTMLInputElement)
      .value
  ).toBe("待保存副本");
  expect(app.getState().collection.resumes).toHaveLength(1);
  failure.mockRestore();
  fireEvent.click(screen.getByRole("button", { name: "保存" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(app.getState().collection.resumes).toHaveLength(2);
});
