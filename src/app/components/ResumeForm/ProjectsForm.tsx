import { Form, FormSection } from "components/ResumeForm/Form";
import { Input, Textarea } from "components/ResumeForm/Form/InputGroup";
import type { CreateHandleChangeArgsWithDescriptions } from "components/ResumeForm/types";
import { useAppDispatch, useAppSelector } from "lib/redux/hooks";
import { selectProjects, changeProjects } from "lib/redux/resumeSlice";
import type { ResumeProject } from "lib/redux/types";

/** 渲染项目经历的编辑表单。 */
export const ProjectsForm = () => {
  /** 当前简历中的项目列表。 */
  const projects = useAppSelector(selectProjects);
  /** 用于提交项目字段变更的 Redux 派发函数。 */
  const dispatch = useAppDispatch();
  /** 仅在存在多个项目时显示删除按钮。 */
  const showDelete = projects.length > 1;

  return (
    <Form form="projects" addButtonText="添加项目">
      {/* 逐项渲染可编辑的项目表单。 */}
      {projects.map(
        ({ project, date, summary, techStack, descriptions }, idx) => {
          /** 将当前项目的字段变更同步到 Redux。 */
          const handleProjectChange = (
            ...[
              field,
              value,
            ]: CreateHandleChangeArgsWithDescriptions<ResumeProject>
          ) => {
            dispatch(changeProjects({ idx, field, value } as any));
          };
          /** 将原生文本域中的每一行同步为一条独立职责。 */
          const handleDescriptionsChange = (
            field: "descriptions",
            value: string
          ) => {
            handleProjectChange(field, value.split(/\r?\n/));
          };
          /** 将职责数组转换为原生文本域使用的多行文本。 */
          const descriptionsText = descriptions.join("\n");
          /** 当前项目是否可以上移。 */
          const showMoveUp = idx !== 0;
          /** 当前项目是否可以下移。 */
          const showMoveDown = idx !== projects.length - 1;

          return (
            <FormSection
              key={idx}
              form="projects"
              idx={idx}
              showMoveUp={showMoveUp}
              showMoveDown={showMoveDown}
              showDelete={showDelete}
              deleteButtonTooltipText={"删除项目"}
            >
              <Input
                name="project"
                label="项目名称"
                placeholder="OpenResume"
                value={project}
                onChange={handleProjectChange}
                labelClassName="col-span-4"
              />
              <Input
                name="date"
                label="日期"
                placeholder="2022年冬季"
                value={date}
                onChange={handleProjectChange}
                labelClassName="col-span-2"
              />
              <Textarea
                name="summary"
                label="项目概述"
                placeholder="说明项目服务的业务场景、目标与核心价值"
                value={summary}
                onChange={handleProjectChange}
                labelClassName="col-span-full"
              />
              <Input
                name="techStack"
                label="技术栈"
                placeholder="FastAPI / LangGraph / PostgreSQL / SSE"
                value={techStack}
                onChange={handleProjectChange}
                labelClassName="col-span-full"
              />
              <Textarea
                name="descriptions"
                label="主要职责"
                placeholder="每行一项，建议使用“职责标题：具体说明”"
                value={descriptionsText}
                onChange={handleDescriptionsChange}
                labelClassName="col-span-full"
              />
            </FormSection>
          );
        }
      )}
    </Form>
  );
};
