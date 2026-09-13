import {
  ResumePDFBulletList,
  ResumePDFSection,
} from "components/Resume/ResumePDF/common";
import type { ResumeSkills } from "lib/redux/types";

/** 渲染专业技能板块，正文遵循参考图二的长句项目符号结构 */
export const ResumePDFSkills = ({
  heading,
  skills,
  themeColor,
  showBulletPoints,
}: {
  heading: string;
  skills: ResumeSkills;
  themeColor: string;
  showBulletPoints: boolean;
}) => (
  <ResumePDFSection themeColor={themeColor} heading={heading}>
    <ResumePDFBulletList
      items={skills.descriptions}
      showBulletPoints={showBulletPoints}
      bulletColor={themeColor}
    />
  </ResumePDFSection>
);
