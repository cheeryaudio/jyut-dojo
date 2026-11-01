import { Capacitor } from "@capacitor/core";
import { ArrowRight, BookmarkSimple, BookOpen, Check, CheckCircle, CopySimple, DownloadSimple, Repeat, UploadSimple, CaretDown } from "@phosphor-icons/react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { courses, courseById, courseTopics } from "../data/courses";
import { readers } from "../data/readers";
import { exportStudyBackup, importStudyBackupJson } from "../lib/backup";
import { getCourseMistakes } from "../lib/coursePractice";
import { calculateStreak, useActivityStore } from "../stores/activityStore";
import { useCourseStore } from "../stores/courseStore";
import { useReaderStore } from "../stores/readerStore";

const LegacyProgressDetails = lazy(() => import("../components/LegacyProgressDetails").then(module => ({ default: module.LegacyProgressDetails })));

export function ProgressPage() {
  const { progress, bookmarks, phraseReviews, hydrated, hydrate, storageError } = useCourseStore();
  const { dates, hydrate: hydrateActivity } = useActivityStore();
  const readerState = useReaderStore();
  const [showLegacy, setShowLegacy] = useState(false);
  const [activityError, setActivityError] = useState(false);
  const [backupMessage, setBackupMessage] = useState("");
  const [backupError, setBackupError] = useState("");
  const [showTextTransfer, setShowTextTransfer] = useState(false);
  const [backupText, setBackupText] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { void hydrate(); void hydrateActivity().catch(() => setActivityError(true)); void readerState.hydrate(); }, [hydrate, hydrateActivity, readerState.hydrate]);
  const completed = courses.filter(course => progress[course.id]?.completedAt);
  const encounteredWords = new Set(completed.flatMap(course => course.words.map(word => word.hanzi))).size;
  const recent = Object.entries(progress).filter(([id]) => courseById.has(id)).sort((a,b) => b[1].openedAt.localeCompare(a[1].openedAt)).slice(0,4);
  const mistakes = getCourseMistakes(progress);
  const reviewed = Object.keys(phraseReviews).length;
  // Reader progress is independent from lesson completion.
  const readerProgress = readerState.progress;
  const readCount = readers.filter(reader => readerProgress[reader.id]?.completedAt).length;

  const handleExportBackup = async () => {
    setBackupError("");
    setBackupMessage("");
    try {
      const payload = await exportStudyBackup();
      const jsonString = JSON.stringify(payload, null, 2);
      const fileName = `jyut-dojo-backup-${payload.exportedAt.slice(0, 10)}.json`;

      // On Android / mobile WebView, try Web Share API with file or text first
      if (Capacitor.isNativePlatform() || typeof navigator.share === "function") {
        try {
          const file = new File([jsonString], fileName, { type: "application/json" });
          if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: "粤语道场学习备份" });
            setBackupMessage("已调起系统分享保存备份文件。");
            return;
          }
        } catch {
          // Fall through to clipboard / download fallback
        }
      }

      if (Capacitor.isNativePlatform()) {
        setBackupText(jsonString);
        setShowTextTransfer(true);
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(jsonString).catch(() => undefined);
          setBackupMessage("Android 端已自动复制备份 JSON 到剪贴板，也可在下方文本框直接复制保存。");
        } else {
          setBackupMessage("已生成备份 JSON，请在下方文本框全选复制保存。");
        }
        return;
      }

      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setBackupMessage("已导出学习记录备份 JSON 文件。");
    } catch {
      setBackupError("导出备份失败，请稍后重试。");
    }
  };

  const handleCopyBackupText = async () => {
    setBackupError("");
    setBackupMessage("");
    try {
      const payload = await exportStudyBackup();
      const jsonString = JSON.stringify(payload);
      setBackupText(jsonString);
      setShowTextTransfer(true);
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(jsonString);
        setBackupMessage("已复制备份 JSON 到剪贴板，可直接粘贴到手机或电脑恢复。");
      } else {
        setBackupMessage("已生成备份文本，请复制下方文本框内容。");
      }
    } catch {
      setBackupError("生成备份文本失败，请重试。");
    }
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBackupError("");
    setBackupMessage("");
    try {
      const text = await file.text();
      const summary = await importStudyBackupJson(text, "merge");
      setBackupMessage(`已恢复备份：合并后共 ${summary.coursesCount} 节课程记录、${summary.bookmarksCount} 条收藏、${summary.readersCount} 篇短读记录。`);
    } catch (err) {
      setBackupError(err instanceof Error ? err.message : "未能恢复备份文件，请检查文件格式。");
    }
  };

  const handleImportText = async () => {
    if (!backupText.trim()) {
      setBackupError("请先粘贴备份 JSON 内容。");
      return;
    }
    setBackupError("");
    setBackupMessage("");
    try {
      const summary = await importStudyBackupJson(backupText, "merge");
      setBackupMessage(`已从文本恢复备份：合并后共 ${summary.coursesCount} 节课程记录、${summary.bookmarksCount} 条收藏、${summary.readersCount} 篇短读记录。`);
      setShowTextTransfer(false);
    } catch (err) {
      setBackupError(err instanceof Error ? err.message : "备份文本格式不正确。");
    }
  };

  return <div className="progress-page page-enter"><header className="journal-header"><div><h1>学习进度</h1></div><Link className="button-outline" to="/scenarios">浏览课程 <ArrowRight size={17} /></Link></header>
    {storageError && <p className="storage-error" role="status">{storageError}</p>}{activityError && <p className="storage-error" role="status">暂时未能读取连续学习记录，课程记录仍可查看。</p>}
    {!hydrated ? <div className="practice-loading" role="status">正在读取学习记录…</div> : <>
    <div className="learning-stats"><div><span className="small-label">已完成课程</span><strong>{completed.length}<small> / {courses.length}</small></strong></div><div><span className="small-label">已学课程词组</span><strong>{encounteredWords}</strong><span>按词组去重</span></div><div><span className="small-label">连续学习</span><strong>{calculateStreak(dates)}<small> 天</small></strong></div><Link to="/readers"><span className="small-label">生活短读</span><strong>{readCount}<small> / {readers.length}</small></strong><span>篇已读 <ArrowRight size={15} /></span></Link></div>
    <section className="progress-topic-section"><div className="section-heading"><div><h2>课程进度</h2></div><span className="small-label">{completed.length} / {courses.length} 节</span></div><div className="topic-progress-list">{courseTopics.map(topic => {
      const group = courses.filter(course => course.topicId === topic.id);
      const done = group.filter(course => progress[course.id]?.completedAt).length;
      return <article key={topic.id}><div className="topic-progress-heading"><Link to={`/scenarios?topic=${topic.id}`}>{topic.name} <ArrowRight size={15} /></Link><span>{done} / {group.length}</span></div><div className="lesson-stamps">{group.map((course,index) => <Link key={course.id} className={progress[course.id]?.completedAt ? "done" : progress[course.id] ? "started" : ""} to={`/courses/${course.id}`} aria-label={`${course.title}，${progress[course.id]?.completedAt ? "已学完" : progress[course.id] ? "已打开" : "未开始"}`}>{progress[course.id]?.completedAt ? <Check size={17} /> : String(index + 1).padStart(2,"0")}</Link>)}</div></article>;
    })}</div><p className="practice-local-note">✓ 已学完 · 蓝色边框：学习中</p></section>
    <div className="progress-lower-grid"><section><div className="section-heading"><div><h2>最近学习</h2></div></div>{recent.length > 0 ? <div className="recent-course-list">{recent.map(([id,item]) => { const course = courseById.get(id)!; return <Link key={id} to={`/courses/${id}${item.section ? `#${item.section}` : ""}`}><span className="recent-course-icon">{item.completedAt ? <CheckCircle size={21} /> : <BookOpen size={21} />}</span><div><h3>{course.title}</h3><p>{item.completedAt ? "已学完" : `已作答 ${Object.values(item.answers).filter(Boolean).length} / ${course.exercises.length} 题`}</p></div><ArrowRight size={17} /></Link>; })}</div> : <div className="progress-quiet-empty"><BookOpen size={27} /><p>还没有学习记录</p><Link className="text-link" to="/courses/cafe-order">学习点餐课程 <ArrowRight size={16} /></Link></div>}</section>
    <section className="pocket-progress"><div className="section-heading"><div><h2>收藏与温习</h2></div></div><Link to="/saved"><BookmarkSimple size={22} /><div><strong>{bookmarks.length} 条收藏表达</strong></div><ArrowRight size={16} /></Link><Link to="/review"><Repeat size={22} /><div><strong>已温习 {reviewed} 句表达</strong></div><ArrowRight size={16} /></Link><Link to="/review?tab=mistakes"><CheckCircle size={22} /><div><strong>{mistakes.length} 道题待订正</strong></div><ArrowRight size={16} /></Link></section></div>

    <section className="backup-panel" aria-label="学习记录备份与恢复">
      <div>
        <h2>学习记录备份与恢复</h2>
        <p className="small-label">智能合并课程进度、收藏、FSRS 排程、短读与基础词卡记录（自动保留较新与已答对记录，支援文件与剪贴板跨端迁移）。</p>
      </div>
      <div className="backup-actions">
        <button type="button" className="button-outline" onClick={() => void handleExportBackup()}>
          <DownloadSimple size={17} /> 导出备份文件
        </button>
        <button type="button" className="button-outline" onClick={() => fileInputRef.current?.click()}>
          <UploadSimple size={17} /> 导入备份文件
        </button>
        <button type="button" className="button-outline" onClick={() => void handleCopyBackupText()}>
          <CopySimple size={17} /> 复制/粘贴文本备份
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label="选择备份 JSON 文件"
          onChange={e => void handleImportFile(e)}
        />
      </div>
      {showTextTransfer && (
        <div className="backup-text-drawer">
          <textarea
            rows={4}
            value={backupText}
            onChange={e => setBackupText(e.target.value)}
            placeholder="在此粘贴备份 JSON 文本，或复制上方生成的备份内容…"
            aria-label="备份 JSON 文本"
          />
          <div className="backup-text-actions">
            <button type="button" className="button-primary" onClick={() => void handleImportText()}>
              从文本合并恢复
            </button>
            <button type="button" className="button-outline" onClick={() => setShowTextTransfer(false)}>
              收起
            </button>
          </div>
        </div>
      )}
      {backupMessage && <p className="backup-feedback is-success" role="status">{backupMessage}</p>}
      {backupError && <p className="backup-feedback is-error" role="alert">{backupError}</p>}
    </section>
    </>}
    <details className="legacy-progress-panel" onToggle={event => setShowLegacy(event.currentTarget.open)}><summary><span><strong>基础课程与声调记录</strong><span>五级能力、六个情境课及辨调统计</span></span><CaretDown size={19} /></summary>{showLegacy && <Suspense fallback={<p role="status">正在读取基础课程记录…</p>}><LegacyProgressDetails /></Suspense>}</details><p className="progress-storage-note">所有记录仅保存在当前浏览器或设备，清除网站数据后会移除。</p>
  </div>;
}
