import { createBrowserRouter } from "react-router-dom";
import { lazy, Suspense, type ReactNode } from "react";
import { AppShell } from "./components/AppShell";

const HomePage = lazy(() => import("./pages/HomePage").then((module) => ({ default: module.HomePage })));
const LearningPathPage = lazy(() => import("./pages/LearningPathPage").then((module) => ({ default: module.LearningPathPage })));
const ProgressPage = lazy(() => import("./pages/ProgressPage").then((module) => ({ default: module.ProgressPage })));
const ReviewPage = lazy(() => import("./pages/ReviewPage").then((module) => ({ default: module.ReviewPage })));
const ScenarioCatalogPage = lazy(() => import("./pages/ScenarioCatalogPage").then((module) => ({ default: module.ScenarioCatalogPage })));
const ScenarioLessonPage = lazy(() => import("./pages/ScenarioLessonPage").then((module) => ({ default: module.ScenarioLessonPage })));
const ScenarioQuizPage = lazy(() => import("./pages/ScenarioQuizPage").then((module) => ({ default: module.ScenarioQuizPage })));
const ToneDojoPage = lazy(() => import("./pages/ToneDojoPage").then((module) => ({ default: module.ToneDojoPage })));
const DeepLessonPage = lazy(() => import("./pages/DeepLessonPage").then((module) => ({ default: module.DeepLessonPage })));
const DiagnosticPage = lazy(() => import("./pages/DiagnosticPage").then((module) => ({ default: module.DiagnosticPage })));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage").then((module) => ({ default: module.PrivacyPage })));
const CourseLessonPage = lazy(() => import("./pages/CourseLessonPage").then((module) => ({ default: module.CourseLessonPage })));
const SavedExpressionsPage = lazy(() => import("./pages/SavedExpressionsPage").then((module) => ({ default: module.SavedExpressionsPage })));
const ReadersPage = lazy(() => import("./pages/ReadersPage").then((module) => ({ default: module.ReadersPage })));
const ReaderPage = lazy(() => import("./pages/ReaderPage").then((module) => ({ default: module.ReaderPage })));
const ExpressionsPage = lazy(() => import("./pages/ExpressionsPage").then((module) => ({ default: module.ExpressionsPage })));

const page = (content: ReactNode) => <Suspense fallback={<section className="py-10" aria-busy="true"><div className="h-10 w-56 animate-pulse rounded-xl bg-stone-200 dark:bg-stone-800" /><div className="mt-7 h-80 animate-pulse rounded-2xl bg-stone-200 dark:bg-stone-800" /></section>}>{content}</Suspense>;

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: page(<HomePage />) },
      { path: "path", element: page(<LearningPathPage />) },
      { path: "diagnostic", element: page(<DiagnosticPage />) },
      { path: "learn/:unitId", element: page(<DeepLessonPage />) },
      { path: "tones", element: page(<ToneDojoPage />) },
      { path: "scenarios", element: page(<ScenarioCatalogPage />) },
      { path: "courses/:courseId", element: page(<CourseLessonPage />) },
      { path: "saved", element: page(<SavedExpressionsPage />) },
      { path: "readers", element: page(<ReadersPage />) },
      { path: "readers/:readerId", element: page(<ReaderPage />) },
      { path: "expressions", element: page(<ExpressionsPage />) },
      { path: "scenarios/:scenarioId", element: page(<ScenarioLessonPage />) },
      { path: "scenarios/:scenarioId/quiz", element: page(<ScenarioQuizPage />) },
      { path: "review", element: page(<ReviewPage />) },
      { path: "progress", element: page(<ProgressPage />) },
      { path: "privacy", element: page(<PrivacyPage />) },
    ],
  },
]);
