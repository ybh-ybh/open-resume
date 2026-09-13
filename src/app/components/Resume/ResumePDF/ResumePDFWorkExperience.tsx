import { View } from "@react-pdf/renderer";
import {
  ResumePDFBulletList,
  ResumePDFSection,
  ResumePDFSubsectionHeader,
} from "components/Resume/ResumePDF/common";
import { spacing } from "components/Resume/ResumePDF/styles";
import type { ResumeWorkExperience } from "lib/redux/types";

/** 渲染公司、职位、时间与量化成果组成的工作经历 */
export const ResumePDFWorkExperience = ({
  heading,
  workExperiences,
  themeColor,
}: {
  heading: string;
  workExperiences: ResumeWorkExperience[];
  themeColor: string;
}) => (
  <ResumePDFSection themeColor={themeColor} heading={heading}>
    {workExperiences.map(({ company, jobTitle, date, descriptions }, idx) => (
      <View
        key={idx}
        style={{
          paddingTop: idx > 0 ? spacing[0.5] : 0,
          paddingBottom: idx < workExperiences.length - 1 ? spacing[1] : 0,
        }}
      >
        <ResumePDFSubsectionHeader
          title={company}
          subtitle={jobTitle}
          date={date}
          themeColor={themeColor}
        />
        <ResumePDFBulletList items={descriptions} bulletColor={themeColor} />
      </View>
    ))}
  </ResumePDFSection>
);
