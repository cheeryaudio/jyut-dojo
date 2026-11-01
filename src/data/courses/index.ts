import type { CourseTopic } from "../../types/course";
import { firstWordsCourses } from "./first-words";
import { timePlansCourses } from "./time-plans";
import { foodDrinkCourses } from "./food-drink";
import { shoppingCourses } from "./shopping";
import { gettingAroundCourses } from "./getting-around";
import { homeCourses } from "./home";
import { servicesCourses } from "./services";
import { friendsCourses } from "./friends";
import { workCourses } from "./work";
import { expressYourselfCourses } from "./express-yourself";
import { expansionACourses } from "./expansion-a";
import { expansionBCourses } from "./expansion-b";
import { expansionCCourses } from "./expansion-c";

export const courseTopics: CourseTopic[] = [
  { id: "first-words", name: "问候与介绍", subtitle: "早晨！你好！", description: "问候、人物介绍、联系方式与礼貌请求", scene: 3 },
  { id: "time-plans", name: "时间与计划", subtitle: "聽日幾點見？", description: "日期、报时、邀约、营业时间与行程安排", scene: 1 },
  { id: "food-drink", name: "餐饮与点单", subtitle: "唔該，我要…", description: "点单、订位、面包蛋糕、下厨与结账", scene: 0 },
  { id: "shopping", name: "街市与购物", subtitle: "呢個幾錢呀？", description: "街市、衣物、网购、家居用品与手机维修", scene: 2 },
  { id: "getting-around", name: "交通与出行", subtitle: "請問點去呀？", description: "问路、公共交通、渡轮、火车与无障碍路线", scene: 1 },
  { id: "home", name: "居家生活", subtitle: "我住呢度", description: "看房、家务、搬家、室友与分类回收", scene: 3 },
  { id: "services", name: "社区办事", subtitle: "唔該，想問吓…", description: "预约、银行、诊所、理发、邮局与图书馆", scene: 2 },
  { id: "friends", name: "朋友交往", subtitle: "得閒一齊食飯", description: "邀请、聚会、电影、运动与宠物话题", scene: 0 },
  { id: "work", name: "职场沟通", subtitle: "我哋傾一傾", description: "同事、会议、面试、文件打印与工作交接", scene: 3 },
  { id: "express-yourself", name: "聊天与表达", subtitle: "我覺得…", description: "经历、观点、分歧、建议与事物描述", scene: 1 },
];
export const courses = [...firstWordsCourses, ...timePlansCourses, ...foodDrinkCourses, ...shoppingCourses, ...gettingAroundCourses, ...homeCourses, ...servicesCourses, ...friendsCourses, ...workCourses, ...expressYourselfCourses, ...expansionACourses, ...expansionBCourses, ...expansionCCourses];
export const courseById = new Map(courses.map(course => [course.id, course]));
export const topicById = new Map(courseTopics.map(topic => [topic.id, topic]));
export const uniqueCoursePhrases = new Set(courses.flatMap(course => course.phrases.map(phrase => phrase.hanzi.replace(/[\s，。！？、；：…]/g, "")))).size;
export const uniqueCourseWords = new Set(courses.flatMap(course => course.words.map(word => word.hanzi))).size;
export const courseExerciseCount = courses.reduce((count, course) => count + course.exercises.length, 0);
