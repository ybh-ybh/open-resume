import { Text, View } from "@react-pdf/renderer";
import {
  ResumePDFNumberedList,
  ResumePDFSection,
  ResumePDFSubsectionHeader,
  ResumePDFSummaryBlock,
  ResumePDFText,
} from "components/Resume/ResumePDF/common";
import {
  getSafeSpacingInPt,
  resumeColors,
  spacing,
  styles,
} from "components/Resume/ResumePDF/styles";
import { DEFAULT_PROJECT_SPACING } from "lib/redux/settingsSlice";
import type { ResumeProject } from "lib/redux/types";

/** 渲染项目标题、概述、技术栈和成果，信息层级对齐参考图三 */
export const ResumePDFProject = ({
  heading,
  projects,
  themeColor,
  projectSpacing,
}: {
  heading: string;
  projects: ResumeProject[];
  themeColor: string;
  projectSpacing: string;
}) => (
  <ResumePDFSection themeColor={themeColor} heading={heading}>
    <View style={{ ...styles.flexCol }}>
      {projects.map(
        ({ project, date, summary, techStack, descriptions }, idx) => (
          <View
            key={idx}
            style={{
              paddingTop: idx > 0 ? "4pt" : 0,
              paddingBottom:
                idx < projects.length - 1
                  ? getSafeSpacingInPt(projectSpacing, DEFAULT_PROJECT_SPACING)
                  : 0,
              borderBottom:
                idx < projects.length - 1
                  ? `1pt solid ${resumeColors.border}`
                  : "none",
            }}
          >
            <ResumePDFSubsectionHeader
              title={project}
              date={date}
              themeColor={themeColor}
            />
            <View
              style={{
                ...styles.flexCol,
                gap: spacing[1],
                marginTop: spacing[1],
              }}
            >
              <ResumePDFSummaryBlock summary={summary} />
              {Boolean(techStack) && (
                <ResumePDFText
                  themeColor={themeColor}
                  style={{ lineHeight: 1.3 }}
                >
                  <Text style={{ fontWeight: "bold" }}>技术栈：</Text>
                  {techStack}
                </ResumePDFText>
              )}
            </View>
            <ResumePDFNumberedList items={descriptions} />
          </View>
        )
      )}
    </View>
  </ResumePDFSection>
);
