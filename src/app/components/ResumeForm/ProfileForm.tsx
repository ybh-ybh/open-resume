import { BaseForm } from "components/ResumeForm/Form";
import { Input, Select, Textarea } from "components/ResumeForm/Form/InputGroup";
import { useAppDispatch, useAppSelector } from "lib/redux/hooks";
import { changeProfile, selectProfile } from "lib/redux/resumeSlice";
import { ResumeProfile } from "lib/redux/types";

/** 到岗状态的可选值。 */
const AVAILABILITY_OPTIONS = [
  { label: "随时到岗", value: "随时到岗" },
  { label: "月内到岗", value: "月内到岗" },
] as const;

export const ProfileForm = () => {
  const profile = useAppSelector(selectProfile);
  const dispatch = useAppDispatch();
  const {
    name,
    age,
    email,
    phone,
    url,
    blogUrl,
    summary,
    workYears,
    education,
    availability,
  } = profile;

  const handleProfileChange = (field: keyof ResumeProfile, value: string) => {
    dispatch(changeProfile({ field, value }));
  };

  return (
    <BaseForm>
      <div className="grid grid-cols-6 gap-3">
        <Input
          label="姓名"
          labelClassName="col-span-4"
          name="name"
          placeholder="张三"
          value={name}
          onChange={handleProfileChange}
        />
        <Input
          label="年龄"
          labelClassName="col-span-2"
          name="age"
          placeholder="23 岁"
          value={age}
          onChange={handleProfileChange}
        />
        <Textarea
          label="个人简介"
          labelClassName="col-span-full"
          name="summary"
          placeholder="热衷让教育对任何人免费的创业者和教育工作者"
          value={summary}
          onChange={handleProfileChange}
        />
        <Input
          label="邮箱"
          labelClassName="col-span-4"
          name="email"
          placeholder="hello@khanacademy.org"
          value={email}
          onChange={handleProfileChange}
        />
        <Input
          label="电话"
          labelClassName="col-span-2"
          name="phone"
          placeholder="(123)456-7890"
          value={phone}
          onChange={handleProfileChange}
        />
        <Input
          label="GitHub链接"
          labelClassName="col-span-3"
          name="url"
          placeholder="github.com/username"
          value={url}
          onChange={handleProfileChange}
        />
        <Input
          label="个人博客"
          labelClassName="col-span-3"
          name="blogUrl"
          placeholder="blog.example.com"
          value={blogUrl}
          onChange={handleProfileChange}
        />
        <Input
          label="工作年限"
          labelClassName="col-span-2"
          name="workYears"
          placeholder="4年"
          value={workYears}
          onChange={handleProfileChange}
        />
        <Input
          label="学历"
          labelClassName="col-span-2"
          name="education"
          placeholder="本科"
          value={education}
          onChange={handleProfileChange}
        />
        <Select
          label="状态"
          labelClassName="col-span-2"
          name="availability"
          placeholder="请选择到岗状态"
          value={availability}
          options={AVAILABILITY_OPTIONS}
          onChange={handleProfileChange}
        />
      </div>
    </BaseForm>
  );
};
