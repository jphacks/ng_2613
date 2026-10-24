import taxImage from "../images/税金.svg";
import pricesImage from "../images/物価賃金.svg";
import budgetImage from "../images/国の財政.svg";
import financeImage from "../images/金融投資.svg";
import workStyleImage from "../images/働き方.svg";
import employmentImage from "../images/雇用.svg";
import industryImage from "../images/産業政策.svg";
import agricultureImage from "../images/農林水産.svg";
import childcareImage from "../images/子育て支援.svg";
import birthrateImage from "../images/少子化.svg";
import schoolImage from "../images/学校教育.svg";
import higherEducationImage from "../images/高等教育.svg";
import pensionImage from "../images/年金.svg";
import medicalImage from "../images/医療.svg";
import nursingImage from "../images/介護.svg";
import welfareImage from "../images/生活支援.svg";
import housingImage from "../images/住まい交通.svg";
import localImage from "../images/地方.svg";
import disasterImage from "../images/防災復興.svg";
import digitalImage from "../images/デジタル.svg";
import securityImage from "../images/治安.svg";
import justiceImage from "../images/司法.svg";
import consumerImage from "../images/消費者保護.svg";
import rightsImage from "../images/人権多様性.svg";
import diplomacyImage from "../images/外交.svg";
import defenseImage from "../images/安全保障防衛.svg";
import foreignResidentsImage from "../images/外国人政策.svg";
import climateImage from "../images/気候変動.svg";
import natureImage from "../images/自然環境.svg";
import electionImage from "../images/選挙制度.svg";
import politicalMoneyImage from "../images/政治と金.svg";
import constitutionImage from "../images/憲法.svg";
import administrationImage from "../images/国会行政.svg";
import type { StaticImageData } from "next/image";

export type Screen = "home" | "topics" | "summary" | "discussion" | "thread" | "vote" | "video" | "login" | "register" | "profile";
export const screens: Screen[] = ["home", "topics", "summary", "discussion", "thread", "vote", "video", "login", "register", "profile"];

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
