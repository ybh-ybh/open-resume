import { Link, Text, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import { DEBUG_RESUME_PDF_FLAG } from "lib/constants";
import { DEFAULT_FONT_COLOR } from "lib/redux/settingsSlice";
import {
  resumeColors,
  resumeLayout,
  spacing,
  styles,
} from "components/Resume/ResumePDF/styles";

/** 渲染带蓝色标签与延伸分隔线的简历章节 */
export const ResumePDFSection = ({
  themeColor,
  heading,
  style = {},
  children,
}: {
  themeColor?: string;
  heading?: string;
  style?: Style;
  children: React.ReactNode;
}) => (
  <View
    style={{
      ...styles.flexCol,
      gap: spacing[1.5],
      marginTop: resumeLayout.sectionSpacing,
      ...style,
    }}
  >
    {Boolean(heading) && (
      <View style={{ ...styles.flexRow, alignItems: "center" }}>
        <View
          style={{
            backgroundColor: themeColor,
            padding: `${spacing[0.25]} ${spacing[3]}`,
          }}
          debug={DEBUG_RESUME_PDF_FLAG}
        >
          <Text
            style={{
              color: resumeColors.white,
              fontSize: "11.5pt",
              fontWeight: "bold",
              letterSpacing: "0.4pt",
            }}
          >
            {heading}
          </Text>
        </View>
        <View
          style={{
            flexGrow: 1,
            height: "1pt",
            backgroundColor: resumeColors.border,
          }}
        />
      </View>
    )}
    {children}
  </View>
);

/** 渲染支持主题色和局部覆盖的 PDF 文本 */
export const ResumePDFText = ({
  bold = false,
  themeColor,
  style = {},
  children,
}: {
  bold?: boolean;
  themeColor?: string;
  style?: Style;
  children: React.ReactNode;
}) => (
  <Text
    style={{
      color: themeColor || DEFAULT_FONT_COLOR,
      fontWeight: bold ? "bold" : "normal",
      ...style,
    }}
    debug={DEBUG_RESUME_PDF_FLAG}
  >
    {children}
  </Text>
);

/** 将 Markdown 行内加粗语法转换为 React PDF 可渲染的文本节点。 */
const renderMarkdownInline = (text: string, keyPrefix: string) => {
  // 按加粗片段切分文本，保留普通文本与 Markdown 标记之间的原有顺序。
  const segments = text.split(/(\*\*[^*]+\*\*)/g);

  return segments.map((segment, index) => {
    // 判断当前片段是否为一对完整的 Markdown 加粗标记。
    const isBoldSegment = segment.startsWith("**") && segment.endsWith("**");

    if (isBoldSegment) {
      return (
        <Text key={`${keyPrefix}-bold-${index}`} style={{ fontWeight: "bold" }}>
          {segment.slice(2, -2)}
        </Text>
      );
    }

    return <Text key={`${keyPrefix}-text-${index}`}>{segment}</Text>;
  });
};

/** 解析列表项中的 Markdown 无序列表标记与正文。 */
const parseMarkdownListItem = (item: string) => {
  // 去掉用户输入短横线前可能存在的缩进，避免 PDF 中出现额外空白。
  const normalizedItem = item.trimStart();
  // 只识别标准 Markdown 的短横线加空格写法，避免误伤普通连接符。
  const hasMarkdownBullet = normalizedItem.startsWith("- ");

  return {
    hasMarkdownBullet,
    content: hasMarkdownBullet ? normalizedItem.slice(2) : normalizedItem,
  };
};

/** 渲染支持 Markdown 无序列表与加粗的紧凑文本列表。 */
export const ResumePDFBulletList = ({
  items,
  showBulletPoints = true,
  bulletColor = resumeColors.body,
}: {
  items: string[];
  showBulletPoints?: boolean;
  bulletColor?: string;
}) => (
  <View style={{ ...styles.flexCol }}>
    {items.filter(Boolean).map((item, idx) => {
      // 解析当前条目的 Markdown 短横线和正文。
      const parsedItem = parseMarkdownListItem(item);
      // 仅在开启项目符号设置且当前条目带短横线时绘制圆点。
      const shouldRenderBullet =
        showBulletPoints && parsedItem.hasMarkdownBullet;

      return (
        <View style={{ ...styles.flexRow }} key={idx}>
          {shouldRenderBullet && (
            <ResumePDFText
              themeColor={resumeColors.ink}
              style={{
                width: spacing[3],
                fontSize: "10pt",
                lineHeight: 1.3,
              }}
              bold={true}
            >
              {"•"}
            </ResumePDFText>
          )}
          <ResumePDFText
            style={{
              color: resumeColors.body,
              lineHeight: 1.3,
              flexGrow: 1,
              flexBasis: 0,
            }}
          >
            {renderMarkdownInline(parsedItem.content, `bullet-${idx}`)}
          </ResumePDFText>
        </View>
      );
    })}
  </View>
);

/** 将“标题：说明”拆成可强调的成果标题和正文 */
const splitNumberedDescription = (item: string) => {
  // 使用最先出现的中英文冒号作为标题边界。
  const separatorIndex = [item.indexOf("："), item.indexOf(":")]
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0];

  if (separatorIndex === undefined || separatorIndex > 24) {
    return { lead: "", body: item };
  }

  return {
    lead: item.slice(0, separatorIndex + 1),
    body: item.slice(separatorIndex + 1).trimStart(),
  };
};

/** 渲染支持换行的黑色编号职责列表。 */
export const ResumePDFNumberedList = ({ items }: { items: string[] }) => (
  <View style={{ ...styles.flexCol, marginTop: spacing[0.25] }}>
    {items.filter(Boolean).map((item, idx) => {
      // 当前成果的标题与详细说明。
      const { lead, body } = splitNumberedDescription(item);

      return (
        <View key={idx} style={{ ...styles.flexRow }}>
          <ResumePDFText
            themeColor={resumeColors.ink}
            style={{ width: spacing[4], lineHeight: 1.3 }}
          >
            {`${idx + 1}.`}
          </ResumePDFText>
          <ResumePDFText
            style={{
              color: resumeColors.body,
              flexGrow: 1,
              flexBasis: 0,
              lineHeight: 1.3,
            }}
          >
            {lead && (
              <Text
                style={{
                  color: resumeColors.achievement,
                  fontWeight: "bold",
                }}
              >
                {renderMarkdownInline(lead, `number-${idx}-lead`)}
              </Text>
            )}
            {lead
              ? [" ", ...renderMarkdownInline(body, `number-${idx}-body`)]
              : renderMarkdownInline(body, `number-${idx}-body`)}
          </ResumePDFText>
        </View>
      );
    })}
  </View>
);

/** 渲染右侧浅蓝日期胶囊 */
export const ResumePDFDatePill = ({ date }: { date: string }) => {
  if (!date) return null;

  return (
    <View
      style={{
        backgroundColor: resumeColors.dateSurface,
        borderRadius: "10pt",
        padding: `${spacing[0.5]} ${spacing[2.5]}`,
      }}
    >
      <ResumePDFText
        bold={true}
        themeColor={resumeColors.dateText}
        style={{ fontSize: "8.5pt", lineHeight: 1.2 }}
      >
        {date}
      </ResumePDFText>
    </View>
  );
};

/** 渲染带左侧蓝线的经历、项目或教育标题 */
export const ResumePDFSubsectionHeader = ({
  title,
  subtitle,
  date,
  themeColor,
}: {
  title: string;
  subtitle?: string;
  date: string;
  themeColor: string;
}) => (
  <View
    style={{
      ...styles.flexRowBetween,
      alignItems: "center",
      borderLeft: `2pt solid ${themeColor}`,
      paddingLeft: spacing[2],
    }}
  >
    <View style={{ ...styles.flexRow, alignItems: "baseline", flexGrow: 1 }}>
      <ResumePDFText
        bold={true}
        style={{ color: resumeColors.ink, fontSize: "10.5pt" }}
      >
        {title}
      </ResumePDFText>
      {Boolean(subtitle) && (
        <ResumePDFText
          style={{
            color: resumeColors.muted,
            fontSize: "8.5pt",
            marginLeft: spacing[2],
          }}
        >
          {subtitle}
        </ResumePDFText>
      )}
    </View>
    <ResumePDFDatePill date={date} />
  </View>
);

/** 渲染项目目标或概述信息块 */
export const ResumePDFSummaryBlock = ({ summary }: { summary: string }) => {
  if (!summary) return null;

  return (
    <View
      style={{
        backgroundColor: resumeColors.surface,
        borderLeft: `2pt solid ${resumeColors.border}`,
        padding: `${spacing[1.5]} ${spacing[2.5]}`,
      }}
    >
      <ResumePDFText style={{ color: resumeColors.body, lineHeight: 1.3 }}>
        <Text style={{ color: resumeColors.ink, fontWeight: "bold" }}>
          项目概述：
        </Text>
        {summary}
      </ResumePDFText>
    </View>
  );
};

/** 在 PDF 导出时保留邮箱、电话和网站链接 */
export const ResumePDFLink = ({
  src,
  isPDF,
  children,
}: {
  src: string;
  isPDF: boolean;
  children: React.ReactNode;
}) => {
  if (isPDF) {
    return (
      <Link src={src} style={{ textDecoration: "none" }}>
        {children}
      </Link>
    );
  }

  return (
    <a
      href={src}
      style={{ textDecoration: "none" }}
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  );
};

/** 保留旧数据中可能存在的特色技能熟练度展示 */
export const ResumeFeaturedSkill = ({
  skill,
  rating,
  themeColor,
  style = {},
}: {
  skill: string;
  rating: number;
  themeColor: string;
  style?: Style;
}) => (
  <View style={{ ...styles.flexRow, alignItems: "center", ...style }}>
    <ResumePDFText style={{ marginRight: spacing[0.5] }}>{skill}</ResumePDFText>
    {[...Array(5)].map((_, idx) => (
      <View
        key={idx}
        style={{
          height: "7pt",
          width: "7pt",
          marginLeft: "2pt",
          backgroundColor: rating > idx ? themeColor : resumeColors.border,
          borderRadius: "100%",
        }}
      />
    ))}
  </View>
);
