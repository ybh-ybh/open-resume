import { View } from "@react-pdf/renderer";
import {
  ResumePDFBulletList,
  ResumePDFSection,
  ResumePDFSubsectionHeader,
  ResumePDFText,
} from "components/Resume/ResumePDF/common";
import {
  resumeColors,
  spacing,
  styles,
} from "components/Resume/ResumePDF/styles";
import type { ResumeEducation } from "lib/redux/types";

/** 渲染学校、专业、在校时间及补充信息 */
export const ResumePDFEducation = ({
  heading,
  educations,
  themeColor,
  showBulletPoints,
}: {
  heading: string;
  educations: ResumeEducation[];
  themeColor: string;
  showBulletPoints: boolean;
}) => (
  <ResumePDFSection themeColor={themeColor} heading={heading}>
    {educations.map(({ school, degree, date, gpa, descriptions }, idx) => (
      <View
        key={idx}
        wrap={false}
        style={{
          paddingBottom: idx < educations.length - 1 ? spacing[2] : 0,
          borderBottom:
            idx < educations.length - 1
              ? `1pt solid ${resumeColors.border}`
              : "none",
        }}
      >
        <ResumePDFSubsectionHeader
          title={school}
          subtitle={degree}
          date={date}
          themeColor={themeColor}
        />
        {Boolean(gpa) && (
          <View
            style={{
              ...styles.flexRow,
              marginTop: spacing[1],
              paddingLeft: spacing[2.5],
            }}
          >
            <ResumePDFText bold={true} style={{ color: resumeColors.ink }}>
              GPA：
            </ResumePDFText>
            <ResumePDFText style={{ color: resumeColors.body }}>
              {gpa}
            </ResumePDFText>
          </View>
        )}
        {descriptions.some(Boolean) && (
          <View style={{ marginTop: spacing[1], paddingLeft: spacing[2.5] }}>
            <ResumePDFBulletList
              items={descriptions}
              showBulletPoints={showBulletPoints}
              bulletColor={themeColor}
            />
          </View>
        )}
      </View>
    ))}
  </ResumePDFSection>
);
