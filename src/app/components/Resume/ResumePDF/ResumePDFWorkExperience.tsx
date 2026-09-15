import { View } from "@react-pdf/renderer";
import {
  ResumePDFBulletList,
  ResumePDFSection,
  ResumePDFSubsectionHeader,
} from "components/Resume/ResumePDF/common";
import { getSafeSpacingInPt, styles } from "components/Resume/ResumePDF/styles";
import { DEFAULT_WORK_EXPERIENCE_SPACING } from "lib/redux/settingsSlice";
import type { ResumeWorkExperience } from "lib/redux/types";

/** 渲染公司、职位、时间与量化成果组成的工作经历 */
export const ResumePDFWorkExperience = ({
  heading,
  workExperiences,
  themeColor,
  bodyFontSize,
  workExperienceSpacing,
}: {
  heading: string;
  workExperiences: ResumeWorkExperience[];
  themeColor: string;
  bodyFontSize: string;
  workExperienceSpacing: string;
}) => (
  <ResumePDFSection themeColor={themeColor} heading={heading}>
    <View style={{ ...styles.flexCol }}>
      {workExperiences.map(({ company, jobTitle, date, descriptions }, idx) => (
        <View
          key={idx}
          style={{
            paddingBottom:
              idx < workExperiences.length - 1
                ? getSafeSpacingInPt(
                    workExperienceSpacing,
                    DEFAULT_WORK_EXPERIENCE_SPACING
                  )
                : 0,
          }}
        >
          <ResumePDFSubsectionHeader
            title={company}
            subtitle={jobTitle}
            date={date}
            themeColor={themeColor}
            titleFontSize={`${bodyFontSize}pt`}
          />
          <ResumePDFBulletList items={descriptions} bulletColor={themeColor} />
        </View>
      ))}
    </View>
  </ResumePDFSection>
);
