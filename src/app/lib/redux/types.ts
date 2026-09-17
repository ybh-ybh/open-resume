export interface ResumeProfile {
  name: string;
  /** 经压缩后的个人照片 data URL */
  photo: string;
  /** 年龄信息，按用户输入原样展示 */
  age: string;
  /** 工作年限，例如“4年”或“4年经验” */
  workYears: string;
  /** 最高学历，例如“本科” */
  education: string;
  /** 到岗状态，例如“随时到岗”或“月内到岗” */
  availability: string;
  email: string;
  phone: string;
  /** GitHub 或其他主要代码主页地址 */
  url: string;
  /** 个人博客地址 */
  blogUrl: string;
  summary: string;
}

export interface ResumeWorkExperience {
  company: string;
  jobTitle: string;
  date: string;
  descriptions: string[];
}

export interface ResumeEducation {
  school: string;
  degree: string;
  date: string;
  gpa: string;
  descriptions: string[];
}

export interface ResumeProject {
  project: string;
  date: string;
  /** 项目背景与业务目标 */
  summary: string;
  /** 项目使用的技术与基础设施 */
  techStack: string;
  descriptions: string[];
}

export interface FeaturedSkill {
  skill: string;
  rating: number;
}

export interface ResumeSkills {
  featuredSkills: FeaturedSkill[];
  descriptions: string[];
}

export interface ResumeCustom {
  descriptions: string[];
}

export interface Resume {
  profile: ResumeProfile;
  workExperiences: ResumeWorkExperience[];
  educations: ResumeEducation[];
  projects: ResumeProject[];
  skills: ResumeSkills;
  custom: ResumeCustom;
}

export type ResumeKey = keyof Resume;
