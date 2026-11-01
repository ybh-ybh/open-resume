import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { Provider } from "react-redux";
import { ResumeManager, ResumeStorageNotice } from "components/ResumeManager";
import { createAppStore } from "lib/redux/store";
import {
  createResume,
  initializeCollection,
  switchResume,
} from "lib/redux/collection-actions";
import { changeProfile, setResume } from "lib/redux/resumeSlice";
import { changeFormHeading, changeShowForm } from "lib/redux/settingsSlice";

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
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: jest.fn().mockResolvedValue(undefined) },
  });
});

/** 验证导出覆盖所有文字字段，并读取最新编辑而非磁盘旧快照。 */
it("复制全部当前简历文字和隐藏板块，保留原始照片与数据", async () => {
  // 使用真实 Redux 更新覆盖全部内容板块。
  const app = renderManager();
  // 照片编码只在导出中替换，其他字段完整保留。
  const resume = {
    ...app.getState().resume,
    profile: {
      ...app.getState().resume.profile,
      name: "测试姓名",
      age: "23岁",
      workYears: "2年",
      education: "本科",
      availability: "随时到岗",
      email: "test@example.com",
      phone: "123456789",
      url: "https://github.com/example",
      blogUrl: "https://example.com",
      summary: '简介包含"引号"\n和换行',
      photo: "data:image/png;base64,test-photo",
    },
    workExperiences: [
      {
        company: "测试公司",
        companyColor: "#DC2626",
        jobTitle: "开发",
        date: "2024-2026",
        descriptions: ["工作内容"],
      },
    ],
    educations: [
      {
        school: "测试大学",
        degree: "本科",
        date: "2020-2024",
        gpa: "3.8",
        descriptions: ["教育内容"],
      },
    ],
    projects: [
      {
        project: "测试项目",
        date: "2026",
        summary: "项目背景",
        techStack: "React",
        descriptions: ["项目成果"],
      },
    ],
    skills: {
      featuredSkills: [{ skill: "TypeScript", rating: 4 }],
      descriptions: ["专业技能"],
    },
    custom: { descriptions: ["隐藏板块也必须复制"] },
  };
  act(() => {
    app.dispatch(setResume(resume));
    app.dispatch(changeShowForm({ field: "custom", value: false }));
    app.dispatch(changeFormHeading({ field: "custom", value: "获奖经历" }));
  });
  fireEvent.click(screen.getByRole("button", { name: "复制当前简历为 JSON" }));
  await waitFor(() =>
    expect(screen.getByRole("status").textContent).toContain("已复制")
  );
  expect(
    screen.queryByText("已复制简历 JSON，可直接粘贴给大模型。")
  ).toBeNull();
  // 从真实按钮写入的文本解析，验证 JSON 完整性与缩进格式。
  const text = (navigator.clipboard.writeText as jest.Mock).mock.calls[0][0];
  expect(JSON.parse(text)).toEqual({
    name: "默认简历",
    ...resume,
    profile: { ...resume.profile, photo: "已上传照片（不包含图片数据）" },
    sectionHeadings: app.getState().settings.formToHeading,
  });
  expect(text).toContain('\n  "profile": {');
  expect(app.getState().resume).toEqual(resume);
  // 模拟自动保存失败，复制仍应使用内存中刚编辑的内容。
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("denied");
  });
  act(() => {
    app.dispatch(changeProfile({ field: "summary", value: "刚刚修改的简介" }));
  });
  fireEvent.click(screen.getByRole("button", { name: "复制当前简历为 JSON" }));
  await waitFor(() =>
    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(2)
  );
  expect(
    JSON.parse((navigator.clipboard.writeText as jest.Mock).mock.calls[1][0])
      .profile.summary
  ).toBe("刚刚修改的简介");
});

/** 验证简历切换后的导出不混入其他记录。 */
it("切换简历后只复制当前记录，不创建副本", async () => {
  // 保留首份 ID，以便验证切换回去后的复制内容。
  const app = renderManager();
  // 首份简历保持独立的姓名字段。
  const firstId = app.getState().collection.activeResumeId;
  act(() => {
    app.dispatch(changeProfile({ field: "name", value: "第一份姓名" }));
    app.dispatch(createResume("第二份简历"));
    app.dispatch(changeProfile({ field: "name", value: "第二份姓名" }));
  });
  fireEvent.click(screen.getByRole("button", { name: "复制当前简历为 JSON" }));
  await waitFor(() =>
    expect(screen.getByRole("status").textContent).toContain("已复制")
  );
  expect(
    JSON.parse((navigator.clipboard.writeText as jest.Mock).mock.calls[0][0])
      .profile.name
  ).toBe("第二份姓名");
  act(() => {
    app.dispatch(switchResume(firstId));
  });
  fireEvent.click(screen.getByRole("button", { name: "复制当前简历为 JSON" }));
  await waitFor(() =>
    expect(screen.getByRole("status").textContent).toContain("已复制")
  );
  expect(
    JSON.parse((navigator.clipboard.writeText as jest.Mock).mock.calls[1][0])
      .profile.name
  ).toBe("第一份姓名");
  expect(app.getState().collection.resumes).toHaveLength(2);
});

/** 验证成功提示的四秒边界，以及连续复制时重新计时。 */
it("复制成功四秒后恢复文案，再次复制重新计时", async () => {
  jest.useFakeTimers();
  try {
    renderManager();
    // 同一个按钮在计时前后始终保留原位置与交互入口。
    const button = screen.getByRole("button", { name: "复制当前简历为 JSON" });
    fireEvent.click(button);
    await act(async () => {});
    expect(button.textContent).toBe("已复制");
    act(() => {
      jest.advanceTimersByTime(3999);
    });
    expect(button.textContent).toBe("已复制");
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(button.textContent).toBe("复制 JSON");

    fireEvent.click(button);
    await act(async () => {});
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    fireEvent.click(button);
    await act(async () => {});
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(button.textContent).toBe("已复制");
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(button.textContent).toBe("复制 JSON");
  } finally {
    jest.useRealTimers();
  }
});

/** 剪贴板缺失或拒绝访问时应明确失败，恢复后允许重试。 */
it.each(["权限拒绝", "接口不可用"])(
  "剪贴板%s时提示失败并支持重试",
  async (failure) => {
    renderManager();
    if (failure === "权限拒绝") {
      (navigator.clipboard.writeText as jest.Mock).mockRejectedValueOnce(
        new Error("denied")
      );
    } else {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: undefined,
      });
    }
    fireEvent.click(
      screen.getByRole("button", { name: "复制当前简历为 JSON" })
    );
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain("复制失败")
    );
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "复制当前简历为 JSON" })
    );
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain("已复制")
    );
  }
);

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
