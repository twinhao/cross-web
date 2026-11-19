<script lang="ts">
	import PageIntro from "#lib/components/public/PageIntro.svelte";
	import PublicFrame from "#lib/components/public/PublicFrame.svelte";
	import Seo from "#lib/components/Seo.svelte";

	let { data } = $props();

	// 內容需與 App Store 隱私權營養標示、實際蒐集與刪除行為一致（docs/appstore/ios）
	const h2 = "mb-2 text-lg font-semibold text-foreground";
	const list = "mt-2 list-inside list-disc space-y-1";
</script>

<Seo {...data.seo} />

<PublicFrame>
	<PageIntro eyebrow="CROSS / 使用說明與政策" title="隱私權政策" />
	<div class="home-container py-10 sm:py-14">
		<div class="mx-auto max-w-3xl">
			<div
				class="policy-body space-y-7 rounded-3xl border border-border bg-card p-6 text-base leading-8 text-muted-foreground sm:p-9"
			>
				<p>
					Cross（以下稱「本服務」）由 Twinhao 經營，包含網站 cross.twinhao.com 及 Cross iOS／Android App。
					本政策說明我們蒐集哪些個人資料、如何使用與保護，以及您依個人資料保護法享有的權利。
				</p>

				<section>
					<h2 class={h2}>1. 我們蒐集的資料</h2>
					<ul class={list}>
						<li><strong class="text-foreground">帳號資料</strong>：透過 Apple 或 Google 登入時取得的電子郵件與名稱，以及您自行填寫的顯示名稱、手機號碼。</li>
						<li><strong class="text-foreground">看診人資料</strong>：姓名、身分證／居留證／護照號碼、生日、性別、電話及與您的關係。證件號碼以加密方式保存，畫面僅顯示末 4 碼。</li>
						<li><strong class="text-foreground">預約資料</strong>：預約的院所、服務、醫師與時段，您填寫的備註（可能包含症狀描述），以及報到、叫號與看診狀態。</li>
						<li><strong class="text-foreground">裝置資料</strong>：推播通知與即時動態（動態島）所需的裝置識別碼。</li>
						<li><strong class="text-foreground">使用資料</strong>：收藏與最近瀏覽的院所。院所頁瀏覽次數僅以加鹽雜湊後的匿名識別碼統計，無法回推到個人。</li>
						<li><strong class="text-foreground">院所資料</strong>：院所申請加入或使用後台時，提供的院所名稱、聯絡人、電話、電子郵件與人員帳號。</li>
					</ul>
					<p class="mt-2">我們不蒐集精確位置、通訊錄或相簿內容；院所上傳 Logo 或環境照片時，僅存取您選取的檔案。</p>
				</section>

				<section>
					<h2 class={h2}>2. 使用目的</h2>
					<ul class={list}>
						<li>建立與確認預約，並讓院所核對看診人身分</li>
						<li>發送預約成功、看診前一天提醒與叫號進度等通知</li>
						<li>提供預約紀錄、收藏等會員功能</li>
						<li>院所管理預約、排班與營運統計</li>
						<li>客戶服務、帳號安全與防止濫用</li>
					</ul>
					<p class="mt-2">我們不會將您的個人資料用於廣告，也不進行跨 App 或跨網站追蹤。</p>
				</section>

				<section>
					<h2 class={h2}>3. 資料提供對象</h2>
					<ul class={list}>
						<li><strong class="text-foreground">您預約的院所</strong>：取得該筆預約及看診人資料，用於安排看診。</li>
						<li>
							<strong class="text-foreground">協助我們提供服務的廠商</strong>：僅在提供服務所需範圍內處理資料，包括 Google Cloud（後端主機，臺灣）、Neon（資料庫，新加坡）、Cloudflare（網站與檔案儲存）、Resend（電子郵件）、Apple 與 Google（推播通知）。院所申請加入時，聯絡資訊會透過 Telegram 通知本公司業務人員以便聯繫。
						</li>
						<li>依法令要求或司法機關依法調閱時。</li>
					</ul>
					<p class="mt-2">除上述情形或經您同意外，我們不會將個人資料提供、出售給第三方。</p>
				</section>

				<section>
					<h2 class={h2}>4. 資料保護</h2>
					<p>
						資料傳輸全程使用加密連線（HTTPS／TLS），證件號碼另以加密保存，iOS App 的登入權杖存放於系統鑰匙圈。
						後台依角色限制可存取的資料範圍。
					</p>
				</section>

				<section>
					<h2 class={h2}>5. 保存期間與刪除帳號</h2>
					<p>
						帳號存續期間我們會保存您的資料。您可隨時在 App 的「我的 → 刪除帳號」刪除帳號，刪除後會立即移除會員帳號、看診人資料、收藏、最近瀏覽與推播裝置資料。
					</p>
					<p class="mt-2">
						已在院所建立的就診與預約紀錄屬於院所的醫療營運紀錄，依醫療相關法規可能需保存一定期間，刪除帳號時會解除與您帳號的連結並停用，由該院所依法保存；如需刪除或更正，請直接聯繫該院所，或來信由我們協助轉達。
					</p>
				</section>

				<section>
					<h2 class={h2}>6. 您的權利</h2>
					<p>依個人資料保護法第 3 條，您可以就您的個人資料：</p>
					<ul class={list}>
						<li>查詢、閱覽或請求製給複製本</li>
						<li>請求補充或更正</li>
						<li>請求停止蒐集、處理或利用</li>
						<li>請求刪除</li>
					</ul>
					<p class="mt-2">多數資料可直接在 App「我的」頁面修改或刪除；其他請求請來信，我們會在確認身分後處理。</p>
				</section>

				<section>
					<h2 class={h2}>7. Cookie 與本機儲存</h2>
					<p>網站使用瀏覽器本機儲存保存登入狀態與顯示偏好（如深色模式），不使用廣告或第三方追蹤 Cookie。</p>
				</section>

				<section>
					<h2 class={h2}>8. 未成年人</h2>
					<p>未滿 18 歲者請在法定代理人同意下使用；家長可在自己的帳號中為子女新增看診人並代為預約。</p>
				</section>

				<section>
					<h2 class={h2}>9. 政策更新</h2>
					<p>本政策可能因法令或服務調整而更新，更新後會公告於本頁；重大變更將另以 App 或電子郵件通知。</p>
				</section>

				<section>
					<h2 class={h2}>10. 聯絡我們</h2>
					<p>
						個人資料相關問題請來信
						<a class="font-medium text-primary underline-offset-4 hover:underline" href="mailto:office@twinhao.com">office@twinhao.com</a>，
						或參考<a class="text-primary underline-offset-4 hover:underline" href="/support">客服與支援</a>。
					</p>
				</section>
			</div>

			<p class="mt-6 text-center text-xs text-muted-foreground">最後更新日期：2026 年 11 月 17 日</p>
		</div>
	</div>
</PublicFrame>
