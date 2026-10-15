import { Form, FormSection } from "components/ResumeForm/Form";
import {
  Input,
  BulletListTextarea,
  INPUT_CLASS_NAME,
} from "components/ResumeForm/Form/InputGroup";
import type { CreateHandleChangeArgsWithDescriptions } from "components/ResumeForm/types";
import { useAppDispatch, useAppSelector } from "lib/redux/hooks";
import {
  changeWorkExperiences,
  selectWorkExperiences,
} from "lib/redux/resumeSlice";
import type { ResumeWorkExperience } from "lib/redux/types";

/** 编辑工作经历，并为每家公司单独选择标题颜色。 */
export const WorkExperiencesForm = () => {
  // 当前简历的工作经历列表。
  const workExperiences = useAppSelector(selectWorkExperiences);
  // 将字段修改提交到简历状态并自动保存。
  const dispatch = useAppDispatch();

  // 多条工作经历时允许删除。
  const showDelete = workExperiences.length > 1;

  return (
    <Form form="workExperiences" addButtonText="添加工作">
      {workExperiences.map(
        ({ company, companyColor, jobTitle, date, descriptions }, idx) => {
          // 复用统一字段更新逻辑，颜色与公司名称一起保存在当前经历中。
          const handleWorkExperienceChange = (
            ...[
              field,
              value,
            ]: CreateHandleChangeArgsWithDescriptions<ResumeWorkExperience>
          ) => {
            // TS doesn't support passing union type to single call signature
            // https://github.com/microsoft/TypeScript/issues/54027
            // any is used here as a workaround
            dispatch(changeWorkExperiences({ idx, field, value } as any));
          };
          // 第一条经历不能上移。
          const showMoveUp = idx !== 0;
          // 最后一条经历不能下移。
          const showMoveDown = idx !== workExperiences.length - 1;

          return (
            <FormSection
              key={idx}
              form="workExperiences"
              idx={idx}
              showMoveUp={showMoveUp}
              showMoveDown={showMoveDown}
              showDelete={showDelete}
              deleteButtonTooltipText="删除工作"
            >
              <div className="col-span-full flex items-end gap-2">
                <Input
                  label="公司"
                  labelClassName="min-w-0 flex-1"
                  name="company"
                  placeholder="可汗学院"
                  value={company}
                  onChange={handleWorkExperienceChange}
                />
                <label className="w-24 shrink-0">
                  <span className="sr-only">公司名称颜色</span>
                  <select
                    name="companyColor"
                    className={`${INPUT_CLASS_NAME} bg-white`}
                    value={companyColor || "#000000"}
                    onChange={(event) =>
                      handleWorkExperienceChange(
                        "companyColor",
                        event.target.value
                      )
                    }
                  >
                    <option value="#000000">黑色</option>
                    <option value="#DC2626">红色</option>
                  </select>
                </label>
              </div>
              <Input
                label="职位"
                labelClassName="col-span-4"
                name="jobTitle"
                placeholder="软件工程师"
                value={jobTitle}
                onChange={handleWorkExperienceChange}
              />
              <Input
                label="日期"
                labelClassName="col-span-2"
                name="date"
                placeholder="2022年6月 - 至今"
                value={date}
                onChange={handleWorkExperienceChange}
              />
              <BulletListTextarea
                label="工作成果"
                labelClassName="col-span-full"
                name="descriptions"
                placeholder="每行一项，建议使用“成果标题：具体说明”"
                value={descriptions}
                onChange={handleWorkExperienceChange}
              />
            </FormSection>
          );
        }
      )}
    </Form>
  );
};
