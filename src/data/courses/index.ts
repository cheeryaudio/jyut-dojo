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

export const courseTopics: CourseTopic[] = [
  { id: "first-words", name: "问候与介绍", subtitle: "早晨！你好！", description: "问候、个人介绍、家人称谓与礼貌请求", scene: 3 },
  { id: "time-plans", name: "时间与计划", subtitle: "聽日幾點見？", description: "日期、报时、邀约、改期与天气", scene: 1 },
  { id: "food-drink", name: "餐饮与点单", subtitle: "唔該，我要…", description: "茶餐厅、饮茶、外卖、饮品与结账", scene: 0 },
  { id: "shopping", name: "街市与购物", subtitle: "呢個幾錢呀？", description: "买菜、试衣、比价、付款与退换货", scene: 2 },
  { id: "getting-around", name: "交通与出行", subtitle: "請問點去呀？", description: "问路、港铁、巴士、的士、机场与酒店", scene: 1 },
  { id: "home", name: "居家生活", subtitle: "我住呢度", description: "地址、看房、家务、报修、快递与邻里", scene: 3 },
  { id: "services", name: "社区办事", subtitle: "唔該，想問吓…", description: "预约、银行、手机服务、诊所与药房", scene: 2 },
  { id: "friends", name: "朋友交往", subtitle: "得閒一齊食飯", description: "兴趣、邀请、聚会、周末安排与节日问候", scene: 0 },
  { id: "work", name: "职场沟通", subtitle: "我哋傾一傾", description: "同事、会议、进度、电话口信与请假", scene: 3 },
  { id: "express-yourself", name: "聊天与表达", subtitle: "我覺得…", description: "经历、原因、比较、观点、商量与道歉", scene: 1 },
];
export const courses = [...firstWordsCourses, ...timePlansCourses, ...foodDrinkCourses, ...shoppingCourses, ...gettingAroundCourses, ...homeCourses, ...servicesCourses, ...friendsCourses, ...workCourses, ...expressYourselfCourses];
export const courseById = new Map(courses.map(course => [course.id, course]));
export const topicById = new Map(courseTopics.map(topic => [topic.id, topic]));
export const uniqueCoursePhrases = new Set(courses.flatMap(course => course.phrases.map(phrase => phrase.hanzi.replace(/[\s，。！？、；：…]/g, "")))).size;
export const uniqueCourseWords = new Set(courses.flatMap(course => course.words.map(word => word.hanzi))).size;
export const courseExerciseCount = courses.reduce((count, course) => count + course.exercises.length, 0);
