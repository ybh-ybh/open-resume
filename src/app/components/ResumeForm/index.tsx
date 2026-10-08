"use client";
import { useState } from "react";
import { useAppSelector } from "lib/redux/hooks";
import { ResumeManager, ResumeStorageNotice } from "components/ResumeManager";
import { ShowForm, selectFormsOrder } from "lib/redux/settingsSlice";
import { ProfileForm } from "components/ResumeForm/ProfileForm";
import { WorkExperiencesForm } from "components/ResumeForm/WorkExperiencesForm";
import { EducationsForm } from "components/ResumeForm/EducationsForm";
import { ProjectsForm } from "components/ResumeForm/ProjectsForm";
import { SkillsForm } from "components/ResumeForm/SkillsForm";
import { ThemeForm } from "components/ResumeForm/ThemeForm";
import { CustomForm } from "components/ResumeForm/CustomForm";
import { FlexboxSpacer } from "components/FlexboxSpacer";
import { cx } from "lib/cx";

const formTypeToComponent: { [type in ShowForm]: () => JSX.Element } = {
  workExperiences: WorkExperiencesForm,
  educations: EducationsForm,
  projects: ProjectsForm,
  skills: SkillsForm,
  custom: CustomForm,
};

export const ResumeForm = () => {
  // 切换记录时重建表单局部状态及照片异步处理组件。
  const activeResumeId = useAppSelector(
    (state) => state.collection.activeResumeId
  );
  const formsOrder = useAppSelector(selectFormsOrder);
  const [isHover, setIsHover] = useState(false);

  return (
    <div
      className={cx(
        "flex justify-center scrollbar-thin scrollbar-track-gray-100 md:h-[calc(100vh-var(--top-nav-bar-height))] md:justify-end md:overflow-y-scroll",
        isHover ? "scrollbar-thumb-gray-200" : "scrollbar-thumb-gray-100"
      )}
      onMouseOver={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
    >
      <section className="flex w-full min-w-0 max-w-2xl flex-col gap-8 p-[var(--resume-padding)]">
        <ResumeManager />
        <ResumeStorageNotice />
        <div key={activeResumeId} className="flex flex-col gap-8">
          <ProfileForm />
          {formsOrder.map((form) => {
            // 根据当前简历独立保存的板块顺序渲染表单。
            const Component = formTypeToComponent[form];
            return <Component key={form} />;
          })}
          <ThemeForm />
          <br />
        </div>
      </section>
      <FlexboxSpacer maxWidth={50} className="hidden md:block" />
    </div>
  );
};
