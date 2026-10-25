import type { StaticImageData } from "next/image";
import agricultureImage from "../images/agriculture-forestry-fisheries.svg";
import climateImage from "../images/climate-change.svg";
import constitutionImage from "../images/constitution.svg";
import consumerImage from "../images/consumer-protection.svg";
import birthrateImage from "../images/declining-birthrate.svg";
import digitalImage from "../images/digital.svg";
import diplomacyImage from "../images/diplomacy.svg";
import disasterImage from "../images/disaster-prevention-recovery.svg";
import nursingImage from "../images/elderly-care.svg";
import electionImage from "../images/electoral-system.svg";
import employmentImage from "../images/employment.svg";
import energyImage from "../images/energy.svg";
import financeImage from "../images/finance-investment.svg";
import foreignResidentsImage from "../images/foreign-resident-policy.svg";
import medicalImage from "../images/healthcare.svg";
import higherEducationImage from "../images/higher-education.svg";
import housingImage from "../images/housing-transport.svg";
import rightsImage from "../images/human-rights-diversity.svg";
import industryImage from "../images/industrial-policy.svg";
import justiceImage from "../images/judiciary.svg";
import welfareImage from "../images/livelihood-support.svg";
import localImage from "../images/local-government.svg";
import budgetImage from "../images/national-budget.svg";
import natureImage from "../images/natural-environment.svg";
import childcareImage from "../images/parenting-support.svg";
import administrationImage from "../images/parliament-administration.svg";
import pensionImage from "../images/pensions.svg";
import politicalMoneyImage from "../images/political-funding.svg";
import pricesImage from "../images/prices-wages.svg";
import securityImage from "../images/public-safety.svg";
import schoolImage from "../images/school-education.svg";
import defenseImage from "../images/security-defense.svg";
import taxImage from "../images/tax.svg";
import workStyleImage from "../images/work-styles.svg";

export type Screen =
  | "home" | "topics" | "summary" | "discussion" | "thread" | "new-thread"
  | "vote" | "video" | "login" | "register" | "profile" | "insights";

export const screens: Screen[] = [
  "home", "topics", "summary", "discussion", "thread", "new-thread",
  "vote", "video", "login", "register", "profile", "insights",
];

const middleTopicImages: Record<string, StaticImageData> = {
  "税金": taxImage,
  "物価・賃金": pricesImage,
  "国の財政": budgetImage,
  "金融・投資": financeImage,
  "働き方": workStyleImage,
  "雇用": employmentImage,
  "産業政策": industryImage,
  "農林水産": agricultureImage,
  "子育て支援": childcareImage,
  "少子化": birthrateImage,
  "学校教育": schoolImage,
  "高等教育": higherEducationImage,
  "年金": pensionImage,
  "医療": medicalImage,
  "介護": nursingImage,
  "生活支援": welfareImage,
  "住まい・交通": housingImage,
  "地方": localImage,
  "防災・復興": disasterImage,
  "デジタル": digitalImage,
  "治安": securityImage,
  "司法": justiceImage,
  "消費者保護": consumerImage,
  "人権・多様性": rightsImage,
  "外交": diplomacyImage,
  "安全保障・防衛": defenseImage,
  "外国人政策": foreignResidentsImage,
  "気候変動": climateImage,
  "エネルギー": energyImage,
  "自然環境": natureImage,
  "選挙制度": electionImage,
  "政治とカネ": politicalMoneyImage,
  "憲法": constitutionImage,
  "国会・行政": administrationImage,
};

export function getMiddleTopicImage(name: string) {
  return middleTopicImages[name] ?? null;
}

export const opinionLabels = ["反対", "やや反対", "中立", "やや賛成", "賛成"];
export const opinionColors = ["#ed5374", "#efa1b2", "#d9d9d9", "#83c6e9", "#49a3d3"];
