import { act, fireEvent, render, screen } from "@testing-library/react";
import { deserialize, serialize } from "node:v8";
import { Provider } from "react-redux";
import { WorkExperiencesForm } from "components/ResumeForm/WorkExperiencesForm";
import { createAppStore } from "lib/redux/store";
import { initializeCollection } from "lib/redux/collection-actions";
import { COLLECTION_STORAGE_KEY } from "lib/redux/local-storage";
import { moveSectionInForm } from "lib/redux/resumeSlice";

beforeEach(() => localStorage.clear());

beforeAll(() => {
  // jsdom 未提供 structuredClone，使用 Node 序列化保留真实深复制语义。
  global.structuredClone = <T,>(value: T): T => deserialize(serialize(value));
});

it("公司颜色独立更新，随经历移动并在重新加载后恢复", () => {
  // 使用真实 store 和持久化链路验证表单操作。
  const app = createAppStore();
  app.dispatch(initializeCollection());
  render(
    <Provider store={app}>
      <WorkExperiencesForm />
    </Provider>
  );
  expect(
    (
      screen.getByRole("combobox", {
        name: "公司名称颜色",
      }) as HTMLSelectElement
    ).value
  ).toBe("#000000");
  fireEvent.change(screen.getByRole("textbox", { name: "公司" }), {
    target: { value: "红色公司" },
  });
  fireEvent.change(screen.getByRole("combobox", { name: "公司名称颜色" }), {
    target: { value: "#DC2626" },
  });
  fireEvent.click(screen.getByRole("button", { name: "添加工作" }));
  expect(
    app.getState().resume.workExperiences.map((item) => item.companyColor)
  ).toEqual(["#DC2626", "#000000"]);
  act(() => {
    app.dispatch(
      moveSectionInForm({ form: "workExperiences", idx: 0, direction: "down" })
    );
  });
  // 新建 store 模拟刷新，检查从存储中恢复的顺序与颜色。
  const restored = createAppStore();
  restored.dispatch(initializeCollection());
  expect(restored.getState().resume.workExperiences[1]).toMatchObject({
    company: "红色公司",
    companyColor: "#DC2626",
  });
  expect(restored.getState().resume.workExperiences[0].companyColor).toBe(
    "#000000"
  );
});

it("旧简历缺少公司颜色时补齐黑色并保留原内容", () => {
  // 构造历史存储格式，确保新增字段不会使旧简历读取失败。
  const app = createAppStore();
  app.dispatch(initializeCollection());
  // 仅移除颜色字段，其他内容维持现有有效格式。
  const stored = JSON.parse(localStorage.getItem(COLLECTION_STORAGE_KEY)!);
  stored.resumes[0].resume.workExperiences[0].company = "历史公司";
  delete stored.resumes[0].resume.workExperiences[0].companyColor;
  localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(stored));
  // 再次初始化应按默认结构补齐颜色。
  const restored = createAppStore();
  restored.dispatch(initializeCollection());
  expect(restored.getState().resume.workExperiences[0]).toMatchObject({
    company: "历史公司",
    companyColor: "#000000",
  });
});
