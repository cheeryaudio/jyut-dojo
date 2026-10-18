export function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl py-10 md:py-14">
      <p className="font-jyutping text-sm font-bold text-ember-dark dark:text-sky-300">privacy</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">私隱政策</h1>
      <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">生效日期：2026 年 7 月 24 日</p>

      <div className="mt-9 space-y-8 leading-7 text-stone-700 dark:text-stone-300">
        <section>
          <h2 className="text-xl font-black text-ink dark:text-white">簡單講</h2>
          <p className="mt-2">粵語道場毋須開戶口，亦冇廣告或第三方分析工具。學習進度、設定、溫習記錄同發音練習結果，預設只會儲存喺你部裝置。</p>
        </section>

        <section>
          <h2 className="text-xl font-black text-ink dark:text-white">咪高峰同發音練習</h2>
          <p className="mt-2">只有當你主動開始發音練習，應用程式先會要求咪高峰權限。錄音會即時喺裝置上分析音高；粵語道場唔會把錄音上載到我哋嘅伺服器，亦唔會長期保存錄音。你可以隨時喺系統設定撤回咪高峰權限。</p>
        </section>

        <section>
          <h2 className="text-xl font-black text-ink dark:text-white">語音示範</h2>
          <p className="mt-2">部分示範使用應用程式內置音訊，其餘會使用你部裝置或瀏覽器提供嘅文字轉語音服務。粵語道場唔會把示範文字傳送到自設伺服器；裝置語音供應商點樣處理資料，則受該供應商嘅政策約束。</p>
        </section>

        <section>
          <h2 className="text-xl font-black text-ink dark:text-white">本機資料同刪除</h2>
          <p className="mt-2">應用程式會喺本機保存學習目標、每日時數、課堂進度、答題及間隔重溫資料，用途只係提供個人化學習路線。你可以清除瀏覽器網站資料，或者喺 Android「設定 → 應用程式 → 粵語道場 → 儲存空間」清除資料；解除安裝亦會刪除本機資料。</p>
        </section>

        <section>
          <h2 className="text-xl font-black text-ink dark:text-white">網頁主機記錄</h2>
          <p className="mt-2">使用網頁版時，主機供應商可能按一般網站運作需要短暫記錄 IP 位址、瀏覽器類型、請求時間及錯誤記錄。正式網站採用邊間主機及其保存安排，會喺公開版本嘅政策頁補充。</p>
        </section>

        <section>
          <h2 className="text-xl font-black text-ink dark:text-white">政策更新同聯絡</h2>
          <p className="mt-2">功能或資料處理方式有重大改動時，發佈者會更新本頁同生效日期。如有私隱查詢，請使用應用程式商店頁面所列嘅開發人員聯絡資料。</p>
        </section>
      </div>
    </article>
  );
}
