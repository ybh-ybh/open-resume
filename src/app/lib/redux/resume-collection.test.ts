import { createAppStore } from "lib/redux/store";
import {
  initializeCollection,
  createResume,
  duplicateResume,
  switchResume,
  renameResume,
  deleteResume,
  importResume,
  retrySaveCollection,
} from "lib/redux/collection-actions";
import {
  changeProfile,
  initialResumeState,
  changeProjects,
} from "lib/redux/resumeSlice";
import { changeSettings, initialSettings } from "lib/redux/settingsSlice";
import {
  COLLECTION_STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  loadResumeCollection,
  normalizeCollection,
} from "lib/redux/local-storage";
import {
  createBlankResume,
  createCollection,
  getResumeFileName,
} from "lib/redux/resume-collection";
import { deepClone } from "lib/deep-clone";

beforeEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

describe("多份简历及持久化", () => {
  it("旧版板块顺序补齐新增板块，保留原有排序", () => {
    localStorage.setItem(
      LEGACY_STORAGE_KEY,
      JSON.stringify({
        resume: initialResumeState,
        settings: {
          formsOrder: ["workExperiences", "educations", "projects", "skills"],
        },
      })
    );
    // 旧版没有自定义板块，迁移后只将缺失板块追加到末尾。
    const app = createAppStore();
    expect(app.dispatch(initializeCollection())).toBe(true);
    expect(app.getState().settings.formsOrder).toEqual([
      "workExperiences",
      "educations",
      "projects",
      "skills",
      "custom",
    ]);
  });
  it("迁移旧数据，补齐数组条目的新增字段，保留旧键", () => {
    // 旧格式故意缺少照片和项目新增字段。
    const legacy = JSON.stringify({
      resume: {
        profile: { name: "旧姓名" },
        projects: [{ project: "旧项目", date: "", descriptions: [] }],
      },
      settings: { themeColor: "#123456" },
    });
    localStorage.setItem(LEGACY_STORAGE_KEY, legacy);
    // 每个测试使用独立 store，模拟首次进入页面。
    const app = createAppStore();
    expect(app.dispatch(initializeCollection())).toBe(true);
    expect(app.getState().collection.resumes).toHaveLength(1);
    expect(app.getState().collection.resumes[0].name).toBe("默认简历");
    expect(app.getState().resume.profile).toMatchObject({
      name: "旧姓名",
      photo: "",
      availability: "随时到岗",
    });
    expect(app.getState().resume.projects[0]).toMatchObject({
      project: "旧项目",
      summary: "",
      techStack: "",
    });
    expect(app.getState().settings.themeColor).toBe("#123456");
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBe(legacy);
    expect(loadResumeCollection()).toEqual(app.getState().collection);
  });

  it("新建隔离内容和设置，刷新恢复最后选择，重复初始化保留内存", () => {
    // 两个 store 分别模拟当前页面和刷新后的页面。
    const app = createAppStore();
    app.dispatch(initializeCollection());
    // 记录第一份 ID，之后回切验证独立性。
    const firstId = app.getState().collection.activeResumeId;
    app.dispatch(changeProfile({ field: "name", value: "甲" }));
    app.dispatch(changeSettings({ field: "fontSize", value: "12" }));
    expect(app.dispatch(createResume("  前端岗位  "))).toBe(true);
    expect(app.getState().resume).toEqual(initialResumeState);
    expect(app.getState().settings).toEqual(initialSettings);
    app.dispatch(changeProfile({ field: "name", value: "乙" }));
    app.dispatch(changeSettings({ field: "themeColor", value: "#112233" }));
    app.dispatch(switchResume(firstId));
    expect(app.getState().resume.profile.name).toBe("甲");
    expect(app.getState().settings.fontSize).toBe("12");
    expect(app.getState().settings.themeColor).toBe(initialSettings.themeColor);
    // 刷新仍恢复第一份，重复初始化不重复创建。
    const refreshed = createAppStore();
    refreshed.dispatch(initializeCollection());
    refreshed.dispatch(initializeCollection());
    expect(refreshed.getState().collection).toEqual(app.getState().collection);
    expect(refreshed.getState().collection.resumes[1].name).toBe("前端岗位");
  });

  it("复制最新内容、照片和设置；修改副本不会影响原件", () => {
    // 复制前的所有编辑都应进入副本。
    const app = createAppStore();
    app.dispatch(initializeCollection());
    // 原件 ID 用于回切。
    const originalId = app.getState().collection.activeResumeId;
    app.dispatch(
      changeProfile({ field: "photo", value: "data:image/jpeg;base64,test" })
    );
    app.dispatch(changeProjects({ idx: 0, field: "summary", value: "原项目" }));
    app.dispatch(changeSettings({ field: "fontSize", value: "11" }));
    app.dispatch(duplicateResume("副本"));
    expect(app.getState().resume.profile.photo).toBe(
      "data:image/jpeg;base64,test"
    );
    expect(app.getState().settings.fontSize).toBe("11");
    app.dispatch(
      changeProjects({ idx: 0, field: "summary", value: "副本项目" })
    );
    app.dispatch(changeSettings({ field: "fontSize", value: "9" }));
    app.dispatch(switchResume(originalId));
    expect(app.getState().resume.projects[0].summary).toBe("原项目");
    expect(app.getState().settings.fontSize).toBe("11");
  });

  it("重命名不改个人姓名；删除当前项回到第一份，最后一份删除生成新空白", () => {
    // 新的空白记录必须拥有新的 ID。
    const app = createAppStore();
    app.dispatch(initializeCollection());
    // 第一份是删除第二份后的选择目标。
    const firstId = app.getState().collection.activeResumeId;
    app.dispatch(changeProfile({ field: "name", value: "张三" }));
    app.dispatch(renameResume("  全栈版本  "));
    expect(app.getState().resume.profile.name).toBe("张三");
    expect(app.getState().collection.resumes[0].name).toBe("全栈版本");
    app.dispatch(createResume("第二份"));
    app.dispatch(deleteResume());
    expect(app.getState().collection.activeResumeId).toBe(firstId);
    app.dispatch(deleteResume());
    expect(app.getState().collection.resumes).toHaveLength(1);
    expect(app.getState().collection.activeResumeId).not.toBe(firstId);
    expect(app.getState().resume).toEqual(initialResumeState);
    expect(loadResumeCollection()).toEqual(app.getState().collection);
  });

  it("导入追加，不覆盖已有内容，首次导入不额外创建空白", () => {
    // 导入数据来自解析器，这里使用独立对象模拟。
    const imported = deepClone(initialResumeState);
    imported.profile.name = "导入姓名";
    // 首次导入直接创建一份。
    const app = createAppStore();
    expect(
      app.dispatch(importResume("文件名称", imported, initialSettings))
    ).toBe(true);
    expect(app.getState().collection.resumes).toHaveLength(1);
    app.dispatch(changeProfile({ field: "name", value: "已编辑" }));
    app.dispatch(importResume("另一份", imported, initialSettings));
    expect(app.getState().collection.resumes).toHaveLength(2);
    expect(app.getState().collection.resumes[0].resume.profile.name).toBe(
      "已编辑"
    );
    expect(app.getState().resume.profile.name).toBe("导入姓名");
    // 未初始化的另一会话也必须读取已有集合再追加。
    const reentered = createAppStore();
    reentered.dispatch(importResume("第三份", imported, initialSettings));
    expect(reentered.getState().collection.resumes).toHaveLength(3);
  });

  it("切换一次性恢复内容和设置，订阅者看不到中间状态", () => {
    // 订阅者模拟 PDF 和其他状态消费者。
    const app = createAppStore();
    app.dispatch(initializeCollection());
    // 第一份内容与排版有明确对应关系。
    const firstId = app.getState().collection.activeResumeId;
    app.dispatch(changeProfile({ field: "name", value: "甲" }));
    app.dispatch(changeSettings({ field: "fontSize", value: "12" }));
    app.dispatch(createResume("第二份"));
    // 保存每次订阅收到的内容及排版组合。
    const observed: string[] = [];
    // 只观察切换动作。
    const unsubscribe = app.subscribe(() =>
      observed.push(
        `${app.getState().resume.profile.name}/${
          app.getState().settings.fontSize
        }`
      )
    );
    app.dispatch(switchResume(firstId));
    unsubscribe();
    expect(observed).toEqual(["甲/12"]);
  });

  it("自动保存失败保留编辑，管理失败不切换，重试保存最新内存", () => {
    // 存储配额不足只影响磁盘保存，内存数据不应回滚。
    const app = createAppStore();
    app.dispatch(initializeCollection());
    // 已保存快照作为失败后的对照。
    const saved = localStorage.getItem(COLLECTION_STORAGE_KEY);
    // 浏览器配额异常用于覆盖真实失败分支。
    const failure = jest
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new DOMException("full", "QuotaExceededError");
      });
    app.dispatch(changeProfile({ field: "name", value: "未保存编辑" }));
    expect(app.getState().resume.profile.name).toBe("未保存编辑");
    expect(app.getState().storage.error).toContain("空间不足");
    expect(app.dispatch(createResume("失败新建"))).toBe(false);
    expect(app.dispatch(deleteResume())).toBe(false);
    expect(app.getState().collection.resumes).toHaveLength(1);
    expect(localStorage.getItem(COLLECTION_STORAGE_KEY)).toBe(saved);
    app.dispatch(initializeCollection());
    expect(app.getState().resume.profile.name).toBe("未保存编辑");
    failure.mockRestore();
    expect(app.dispatch(retrySaveCollection())).toBe(true);
    expect(loadResumeCollection()?.resumes[0].resume.profile.name).toBe(
      "未保存编辑"
    );
    expect(app.getState().storage.error).toBe("");
  });

  it("新集合损坏时不回退旧数据，不覆写，修复后可重试", () => {
    localStorage.setItem(
      LEGACY_STORAGE_KEY,
      JSON.stringify({ resume: initialResumeState, settings: initialSettings })
    );
    localStorage.setItem(COLLECTION_STORAGE_KEY, "{broken");
    // 读取失败必须阻止默认编辑器进入保存流程。
    const app = createAppStore();
    expect(app.dispatch(initializeCollection())).toBe(false);
    expect(app.getState().storage).toMatchObject({
      ready: false,
      blocked: true,
    });
    expect(
      app.dispatch(importResume("文件", initialResumeState, initialSettings))
    ).toBe(false);
    expect(localStorage.getItem(COLLECTION_STORAGE_KEY)).toBe("{broken");
    localStorage.removeItem(COLLECTION_STORAGE_KEY);
    expect(app.dispatch(retrySaveCollection())).toBe(true);
    expect(app.getState().storage.blocked).toBe(false);
  });

  it("初始化前的动作不会自动保存；迁移写入失败保留旧数据并支持重试", () => {
    // 初始化门控防止默认字段提前覆盖存储。
    const app = createAppStore();
    app.dispatch(changeProfile({ field: "name", value: "默认编辑" }));
    expect(localStorage.getItem(COLLECTION_STORAGE_KEY)).toBeNull();
    localStorage.setItem(
      LEGACY_STORAGE_KEY,
      JSON.stringify({ resume: { profile: { name: "旧简历" } } })
    );
    // 迁移写入失败仍展示有效旧数据。
    const failure = jest
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("denied");
      });
    expect(app.dispatch(initializeCollection())).toBe(false);
    expect(app.getState().resume.profile.name).toBe("旧简历");
    expect(app.getState().storage.ready).toBe(true);
    expect(localStorage.getItem(COLLECTION_STORAGE_KEY)).toBeNull();
    failure.mockRestore();
    expect(app.dispatch(retrySaveCollection())).toBe(true);
  });
});

describe("集合格式和导出名称", () => {
  it.each(["../前端:岗位", "CON", "NUL.txt", "   ", "正常简历"])(
    "生成安全的 PDF 文件名：%s",
    (name) => {
      expect(getResumeFileName(name)).toMatch(/\.pdf$/);
      expect(getResumeFileName(name)).not.toMatch(/[<>:"/\\|?*\u0000-\u001f]/);
      expect(getResumeFileName(name)).not.toMatch(/^(con|nul)(?:\.|$)/i);
    }
  );

  it("拒绝重复 ID、无效当前项、字段类型损坏和板块错误", () => {
    // 有效模板用于逐一构造损坏情况。
    const collection = createCollection(createBlankResume());
    expect(() =>
      normalizeCollection({ ...collection, activeResumeId: "missing" })
    ).toThrow();
    expect(() =>
      normalizeCollection({
        ...collection,
        resumes: [collection.resumes[0], collection.resumes[0]],
      })
    ).toThrow();
    // 可修改副本避免改变被冻结的默认值。
    const damaged = deepClone(collection);
    (damaged.resumes[0].resume.profile as any).name = 1;
    expect(() => normalizeCollection(damaged)).toThrow();
    damaged.resumes[0].resume.profile.name = "";
    damaged.resumes[0].settings.formsOrder = ["skills", "skills"];
    expect(() => normalizeCollection(damaged)).toThrow();
  });
});
