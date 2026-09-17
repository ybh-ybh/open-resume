import { View } from "@react-pdf/renderer";
import {
  ResumePDFIcon,
  type IconType,
} from "components/Resume/ResumePDF/common/ResumePDFIcon";
import { styles, spacing } from "components/Resume/ResumePDF/styles";
import {
  ResumePDFLink,
  ResumePDFSection,
  ResumePDFText,
} from "components/Resume/ResumePDF/common";
import { resumeColors } from "components/Resume/ResumePDF/styles";
import type { ResumeProfile } from "lib/redux/types";

type ProfileEntry = {
  key: string;
  value: string;
  iconType?: IconType;
  linkType?: "email" | "phone" | "url";
};

/** 渲染一行基础信息，并保持每行内部的分隔线一致。 */
const ResumePDFProfileRow = ({
  entries,
  themeColor,
  isPDF,
}: {
  entries: ProfileEntry[];
  themeColor: string;
  isPDF: boolean;
}) => (
  <View
    style={{
      ...styles.flexRow,
      flexWrap: "wrap",
      alignItems: "center",
      marginTop: spacing[1],
    }}
  >
    {entries.map((entry, idx) => {
      // 只有邮箱、电话和链接字段需要生成可点击链接。
      const content = (
        <ResumePDFText
          themeColor={entry.key === "blog" ? themeColor : undefined}
          style={{
            marginLeft: entry.iconType ? spacing[1] : 0,
            textDecoration: entry.key === "blog" ? "underline" : "none",
          }}
        >
          {entry.value}
        </ResumePDFText>
      );
      // 根据字段类型生成联系方式对应的地址。
      const linkedContent = entry.linkType ? (
        <ResumePDFLink
          src={getProfileLink(entry.value, entry.linkType)}
          isPDF={isPDF}
        >
          {content}
        </ResumePDFLink>
      ) : (
        content
      );

      return (
        <View
          key={entry.key}
          style={{
            ...styles.flexRow,
            alignItems: "center",
            marginRight: spacing[2],
          }}
        >
          {idx > 0 && (
            <ResumePDFText
              style={{
                color: resumeColors.muted,
                marginRight: spacing[2],
              }}
            >
              |
            </ResumePDFText>
          )}
          {entry.iconType && (
            <ResumePDFIcon type={entry.iconType} isPDF={isPDF} />
          )}
          {linkedContent}
        </View>
      );
    })}
  </View>
);

export const ResumePDFProfile = ({
  profile,
  themeColor,
  isPDF,
}: {
  profile: ResumeProfile;
  themeColor: string;
  isPDF: boolean;
}) => {
  // 基础信息按用户指定的两行顺序排列。
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
  // 第一行只放年龄、电话和邮箱。
  const firstRowEntries = (
    [
      { key: "age", value: age, iconType: "age" },
      { key: "phone", value: phone, iconType: "phone", linkType: "phone" },
      { key: "email", value: email, iconType: "email", linkType: "email" },
    ] as ProfileEntry[]
  ).filter(({ value }) => Boolean(value));
  // 第二行依次放工作年限、学历、到岗状态、GitHub 和个人博客。
  const secondRowEntries = (
    [
      { key: "workYears", value: formatWorkYears(workYears) },
      { key: "education", value: education },
      { key: "availability", value: availability },
      {
        key: "github",
        value: url,
        iconType: getUrlIconType(url),
        linkType: "url",
      },
      { key: "blog", value: blogUrl, iconType: "url", linkType: "url" },
    ] as ProfileEntry[]
  ).filter(({ value }) => Boolean(value));

  return (
    <ResumePDFSection style={{ marginTop: spacing[0] }}>
      <ResumePDFText
        bold={true}
        style={{
          color: resumeColors.ink,
          fontSize: "22pt",
          letterSpacing: "1.2pt",
          lineHeight: 1.15,
        }}
      >
        {name}
      </ResumePDFText>
      <ResumePDFProfileRow
        entries={firstRowEntries}
        themeColor={themeColor}
        isPDF={isPDF}
      />
      <ResumePDFProfileRow
        entries={secondRowEntries}
        themeColor={themeColor}
        isPDF={isPDF}
      />
      {Boolean(summary) && (
        <ResumePDFText
          style={{
            color: resumeColors.muted,
            fontSize: "9pt",
            lineHeight: 1.4,
            marginTop: spacing[0.5],
          }}
        >
          {summary}
        </ResumePDFText>
      )}
    </ResumePDFSection>
  );
};

/** 根据链接内容选择 GitHub、LinkedIn 或普通链接图标。 */
const getUrlIconType = (value: string): IconType => {
  if (value.includes("github")) return "url_github";
  if (value.includes("linkedin")) return "url_linkedin";
  return "url";
};

/** 将简历中的链接字段转换成可点击地址。 */
const getProfileLink = (value: string, linkType: "email" | "phone" | "url") => {
  if (linkType === "email") return `mailto:${value}`;
  if (linkType === "phone") return `tel:${value.replace(/[^\d+]/g, "")}`;
  return value.startsWith("http") ? value : `https://${value}`;
};

/** 为工作年限补齐参考图中的“经验”后缀，同时避免重复添加。 */
const formatWorkYears = (value: string) => {
  const normalizedValue = value.trim();
  if (!normalizedValue || normalizedValue.endsWith("经验")) {
    return normalizedValue;
  }
  return `${normalizedValue}经验`;
};
