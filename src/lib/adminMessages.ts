import type { LocaleCode } from "./types";

// 관리자 UI 라벨은 콘텐츠가 아니라 개발자 소유의 고정 문자열이므로 DB가 아니라
// 코드에 로케일별 사전으로 둔다. 편집 언어(현재 URL 로케일)에 맞춰 문구를 고른다.
// 비기본(non-ko) 언어판을 편집할 때 각 관리자 화면 상단에 뜨는 안내문.

export type AdminNotice = { title: string; bullets: string[] };

function pick<T>(map: Record<LocaleCode, T>, locale: LocaleCode): T {
  return map[locale] ?? map.ko;
}

// 페이지 관리 (목록)
const pages: Record<LocaleCode, AdminNotice> = {
  ko: {
    title: "한국어 언어판",
    bullets: [
      "페이지 생성·삭제·구조(slug/템플릿/정렬)는 한국어 관리자가 관리합니다.",
      "여기서는 각 페이지의 한국어 언어판을 편집합니다.",
    ],
  },
  en: {
    title: "English translation",
    bullets: [
      "Page creation, deletion, and structure (slug/template/order) are managed by the Korean administrator.",
      "Here you edit only the English version of each page.",
    ],
  },
  ja: {
    title: "日本語版の翻訳",
    bullets: [
      "ページの作成・削除・構造（slug/テンプレート/並び順）は韓国語管理者が管理します。",
      "ここでは各ページの日本語版のみを編集します。",
    ],
  },
  zh: {
    title: "中文版翻译",
    bullets: [
      "页面的创建、删除和结构（slug/模板/排序）由韩语管理员管理。",
      "在此仅编辑各页面的中文版。",
    ],
  },
  ru: {
    title: "Перевод на русский",
    bullets: [
      "Создание, удаление и структура страниц (slug/шаблон/порядок) управляются корейским администратором.",
      "Здесь вы редактируете только русскую версию каждой страницы.",
    ],
  },
  kk: {
    title: "Қазақша аудармасы",
    bullets: [
      "Беттерді жасау, жою және құрылымы (slug/үлгі/реттілік) корей әкімшісі басқарады.",
      "Мұнда әр беттің тек қазақша нұсқасын өңдейсіз.",
    ],
  },
  vi: {
    title: "Bản dịch tiếng Việt",
    bullets: [
      "Việc tạo, xóa và cấu trúc trang (slug/mẫu/thứ tự) do quản trị viên tiếng Hàn quản lý.",
      "Tại đây bạn chỉ chỉnh sửa bản tiếng Việt của mỗi trang.",
    ],
  },
};

// 뉴스/글 관리 (목록 + 편집기 공용)
const posts: Record<LocaleCode, AdminNotice> = {
  ko: {
    title: "한국어판 편집",
    bullets: [
      "글 생성·삭제·slug는 한국어 관리자가 관리합니다.",
      "여기서는 한국어판만 입력·수정합니다.",
    ],
  },
  en: {
    title: "Edit English version",
    bullets: [
      "Post creation, deletion, and slug are managed by the Korean administrator.",
      "Here you enter and edit only the English version.",
    ],
  },
  ja: {
    title: "日本語版の編集",
    bullets: [
      "記事の作成・削除・slugは韓国語管理者が管理します。",
      "ここでは日本語版のみを入力・編集します。",
    ],
  },
  zh: {
    title: "编辑中文版",
    bullets: [
      "文章的创建、删除和 slug 由韩语管理员管理。",
      "在此仅录入并编辑中文版。",
    ],
  },
  ru: {
    title: "Редактирование русской версии",
    bullets: [
      "Создание, удаление и slug статей управляются корейским администратором.",
      "Здесь вы вводите и редактируете только русскую версию.",
    ],
  },
  kk: {
    title: "Қазақша нұсқасын өңдеу",
    bullets: [
      "Мақалаларды жасау, жою және slug корей әкімшісі басқарады.",
      "Мұнда тек қазақша нұсқасын енгізіп өңдейсіз.",
    ],
  },
  vi: {
    title: "Chỉnh sửa bản tiếng Việt",
    bullets: [
      "Việc tạo, xóa và slug của bài viết do quản trị viên tiếng Hàn quản lý.",
      "Tại đây bạn chỉ nhập và chỉnh sửa bản tiếng Việt.",
    ],
  },
};

// 메뉴 관리 (라벨 번역)
const menus: Record<LocaleCode, AdminNotice> = {
  ko: {
    title: "한국어 라벨 번역",
    bullets: [
      "메뉴 구조(추가·삭제·정렬·링크)는 한국어 관리자가 관리합니다.",
      "이 화면에서는 각 메뉴의 한국어 라벨만 입력·수정합니다.",
      "번역이 비어 있으면 사이트에서 한국어 라벨로 대체됩니다.",
    ],
  },
  en: {
    title: "English label translation",
    bullets: [
      "Menu structure (add/delete/order/link) is managed by the Korean administrator.",
      "On this screen you edit only the English label of each menu.",
      "If a translation is empty, the Korean label is used on the site.",
    ],
  },
  ja: {
    title: "日本語ラベルの翻訳",
    bullets: [
      "メニュー構造（追加・削除・並び順・リンク）は韓国語管理者が管理します。",
      "この画面では各メニューの日本語ラベルのみを入力・編集します。",
      "翻訳が空の場合、サイトでは韓国語ラベルが使用されます。",
    ],
  },
  zh: {
    title: "中文标签翻译",
    bullets: [
      "菜单结构（添加·删除·排序·链接）由韩语管理员管理。",
      "在此画面仅录入并编辑各菜单的中文标签。",
      "若翻译为空，网站将使用韩语标签代替。",
    ],
  },
  ru: {
    title: "Перевод русских ярлыков",
    bullets: [
      "Структура меню (добавление/удаление/порядок/ссылки) управляется корейским администратором.",
      "На этом экране вы редактируете только русский ярлык каждого меню.",
      "Если перевод пуст, на сайте используется корейский ярлык.",
    ],
  },
  kk: {
    title: "Қазақша жапсырма аудармасы",
    bullets: [
      "Мәзір құрылымын (қосу/жою/реттілік/сілтеме) корей әкімшісі басқарады.",
      "Бұл экранда әр мәзірдің тек қазақша жапсырмасын енгізіп өңдейсіз.",
      "Аударма бос болса, сайтта қазақша жапсырма қолданылады.",
    ],
  },
  vi: {
    title: "Dịch nhãn tiếng Việt",
    bullets: [
      "Cấu trúc menu (thêm/xóa/sắp xếp/liên kết) do quản trị viên tiếng Hàn quản lý.",
      "Ở màn hình này bạn chỉ nhập và chỉnh sửa nhãn tiếng Việt của mỗi menu.",
      "Nếu bản dịch trống, trang web sẽ dùng nhãn tiếng Hàn.",
    ],
  },
};

// 페이지 편집기 낱개 라벨
const pageEditor: Record<LocaleCode, { editHeading: string; metaReadonly: string }> = {
  ko: { editHeading: "언어판 편집", metaReadonly: "(구조는 한국어 관리자 전용 · 읽기 전용)" },
  en: { editHeading: "Version editing", metaReadonly: "(Structure is Korean-admin only · read-only)" },
  ja: { editHeading: "言語版の編集", metaReadonly: "（構造は韓国語管理者専用・読み取り専用）" },
  zh: { editHeading: "语言版编辑", metaReadonly: "（结构仅限韩语管理员·只读）" },
  ru: { editHeading: "Редактирование версии", metaReadonly: "(Структура — только для корейского администратора · только чтение)" },
  kk: { editHeading: "Нұсқаны өңдеу", metaReadonly: "(Құрылым тек корей әкімшісіне арналған · тек оқу)" },
  vi: { editHeading: "Chỉnh sửa bản dịch", metaReadonly: "(Cấu trúc chỉ dành cho quản trị viên tiếng Hàn · chỉ đọc)" },
};

// 공통 크롬: 헤더 · 편집 언어 스위처 · 탭 네비게이션
export type AdminChrome = {
  adminTitle: string;
  loggedInAs: string;
  editLang: string;
  addLang: string;
  addLangTitle: string;
  structureBadge: string;
  hintPrimary: string;
  hintOther: string;
  groupContent: string;
  groupOps: string;
  tabMenus: string;
  tabPages: string;
  tabPosts: string;
  tabFaqs: string;
  tabHero: string;
  tabPartners: string;
  tabRequests: string;
  tabMembers: string;
  tabEmail: string;
  tabInquiries: string;
  tabSatisfaction: string;
  tabStaffEval: string;
};

const chromeMap: Record<LocaleCode, AdminChrome> = {
  ko: {
    adminTitle: "CERINS 관리자", loggedInAs: "로그인 중:",
    editLang: "편집 언어", addLang: "언어 추가", addLangTitle: "언어 추가·관리",
    structureBadge: "구조",
    hintPrimary: "구조(메뉴·페이지·글) 생성/삭제 + 한국어 콘텐츠",
    hintOther: "이 언어의 번역만 편집합니다.",
    groupContent: "콘텐츠", groupOps: "업무",
    tabMenus: "메뉴", tabPages: "페이지", tabPosts: "뉴스", tabFaqs: "FAQ",
    tabHero: "히어로 슬라이드", tabPartners: "파트너", tabRequests: "의뢰 관리",
    tabMembers: "회원", tabEmail: "메일 발송", tabInquiries: "문의",
    tabSatisfaction: "고객만족도", tabStaffEval: "직원평가",
  },
  en: {
    adminTitle: "CERINS Admin", loggedInAs: "Logged in as:",
    editLang: "Editing language", addLang: "Add language", addLangTitle: "Add / manage languages",
    structureBadge: "Structure",
    hintPrimary: "Create/delete structure (menus·pages·posts) + Korean content",
    hintOther: "You edit only this language's translations.",
    groupContent: "Content", groupOps: "Operations",
    tabMenus: "Menus", tabPages: "Pages", tabPosts: "News", tabFaqs: "FAQ",
    tabHero: "Hero slides", tabPartners: "Partners", tabRequests: "Requests",
    tabMembers: "Members", tabEmail: "Email", tabInquiries: "Inquiries",
    tabSatisfaction: "Satisfaction", tabStaffEval: "Staff reviews",
  },
  ja: {
    adminTitle: "CERINS 管理者", loggedInAs: "ログイン中:",
    editLang: "編集言語", addLang: "言語を追加", addLangTitle: "言語の追加・管理",
    structureBadge: "構造",
    hintPrimary: "構造（メニュー・ページ・記事）の作成/削除 + 韓国語コンテンツ",
    hintOther: "この言語の翻訳のみを編集します。",
    groupContent: "コンテンツ", groupOps: "業務",
    tabMenus: "メニュー", tabPages: "ページ", tabPosts: "ニュース", tabFaqs: "FAQ",
    tabHero: "ヒーロースライド", tabPartners: "パートナー", tabRequests: "依頼管理",
    tabMembers: "会員", tabEmail: "メール送信", tabInquiries: "お問い合わせ",
    tabSatisfaction: "顧客満足度", tabStaffEval: "職員評価",
  },
  zh: {
    adminTitle: "CERINS 管理后台", loggedInAs: "登录中:",
    editLang: "编辑语言", addLang: "添加语言", addLangTitle: "添加·管理语言",
    structureBadge: "结构",
    hintPrimary: "结构（菜单·页面·文章）的创建/删除 + 韩语内容",
    hintOther: "仅编辑该语言的翻译。",
    groupContent: "内容", groupOps: "业务",
    tabMenus: "菜单", tabPages: "页面", tabPosts: "新闻", tabFaqs: "FAQ",
    tabHero: "主页轮播", tabPartners: "合作伙伴", tabRequests: "委托管理",
    tabMembers: "会员", tabEmail: "邮件发送", tabInquiries: "咨询",
    tabSatisfaction: "客户满意度", tabStaffEval: "员工评价",
  },
  ru: {
    adminTitle: "CERINS Админ", loggedInAs: "Вход выполнен:",
    editLang: "Язык редактирования", addLang: "Добавить язык", addLangTitle: "Добавить / управлять языками",
    structureBadge: "Структура",
    hintPrimary: "Создание/удаление структуры (меню·страницы·статьи) + корейский контент",
    hintOther: "Вы редактируете только переводы этого языка.",
    groupContent: "Контент", groupOps: "Операции",
    tabMenus: "Меню", tabPages: "Страницы", tabPosts: "Новости", tabFaqs: "FAQ",
    tabHero: "Слайды героя", tabPartners: "Партнёры", tabRequests: "Заявки",
    tabMembers: "Пользователи", tabEmail: "Рассылка", tabInquiries: "Обращения",
    tabSatisfaction: "Удовлетворённость", tabStaffEval: "Оценка персонала",
  },
  kk: {
    adminTitle: "CERINS Әкімші", loggedInAs: "Кірген:",
    editLang: "Өңдеу тілі", addLang: "Тіл қосу", addLangTitle: "Тіл қосу · басқару",
    structureBadge: "Құрылым",
    hintPrimary: "Құрылымды (мәзір·бет·мақала) жасау/жою + корей мазмұны",
    hintOther: "Тек осы тілдің аудармасын өңдейсіз.",
    groupContent: "Мазмұн", groupOps: "Жұмыс",
    tabMenus: "Мәзір", tabPages: "Беттер", tabPosts: "Жаңалықтар", tabFaqs: "FAQ",
    tabHero: "Басты слайдтар", tabPartners: "Серіктестер", tabRequests: "Өтінімдер",
    tabMembers: "Мүшелер", tabEmail: "Пошта жіберу", tabInquiries: "Сұраулар",
    tabSatisfaction: "Қанағаттану", tabStaffEval: "Қызметкерді бағалау",
  },
  vi: {
    adminTitle: "CERINS Quản trị", loggedInAs: "Đang đăng nhập:",
    editLang: "Ngôn ngữ chỉnh sửa", addLang: "Thêm ngôn ngữ", addLangTitle: "Thêm · quản lý ngôn ngữ",
    structureBadge: "Cấu trúc",
    hintPrimary: "Tạo/xóa cấu trúc (menu·trang·bài viết) + nội dung tiếng Hàn",
    hintOther: "Bạn chỉ chỉnh sửa bản dịch của ngôn ngữ này.",
    groupContent: "Nội dung", groupOps: "Nghiệp vụ",
    tabMenus: "Menu", tabPages: "Trang", tabPosts: "Tin tức", tabFaqs: "FAQ",
    tabHero: "Trình chiếu Hero", tabPartners: "Đối tác", tabRequests: "Yêu cầu",
    tabMembers: "Thành viên", tabEmail: "Gửi email", tabInquiries: "Liên hệ",
    tabSatisfaction: "Mức hài lòng", tabStaffEval: "Đánh giá nhân viên",
  },
};

export const chrome = (l: LocaleCode) => pick(chromeMap, l);

// 목록/편집 화면 공통 버튼·상태 문구
export type AdminCommon = {
  loading: string;
  save: string;
  saving: string;
  add: string;
  loadError: string;
  saved: string;
  deleted: string;
};

const commonMap: Record<LocaleCode, AdminCommon> = {
  ko: { loading: "불러오는 중...", save: "저장", saving: "저장 중...", add: "추가", loadError: "불러올 수 없습니다.", saved: "저장했습니다.", deleted: "삭제했습니다." },
  en: { loading: "Loading...", save: "Save", saving: "Saving...", add: "Add", loadError: "Failed to load.", saved: "Saved.", deleted: "Deleted." },
  ja: { loading: "読み込み中...", save: "保存", saving: "保存中...", add: "追加", loadError: "読み込めませんでした。", saved: "保存しました。", deleted: "削除しました。" },
  zh: { loading: "加载中...", save: "保存", saving: "保存中...", add: "添加", loadError: "无法加载。", saved: "已保存。", deleted: "已删除。" },
  ru: { loading: "Загрузка...", save: "Сохранить", saving: "Сохранение...", add: "Добавить", loadError: "Не удалось загрузить.", saved: "Сохранено.", deleted: "Удалено." },
  kk: { loading: "Жүктелуде...", save: "Сақтау", saving: "Сақталуда...", add: "Қосу", loadError: "Жүктеу мүмкін болмады.", saved: "Сақталды.", deleted: "Жойылды." },
  vi: { loading: "Đang tải...", save: "Lưu", saving: "Đang lưu...", add: "Thêm", loadError: "Không thể tải.", saved: "Đã lưu.", deleted: "Đã xóa." },
};

export const common = (l: LocaleCode) => pick(commonMap, l);

// 삭제 확인창 — 항목명 하나
export function confirmDelete(l: LocaleCode, name: string): string {
  const m: Record<LocaleCode, string> = {
    ko: `'${name}'을(를) 삭제할까요?`,
    en: `Delete '${name}'?`,
    ja: `'${name}' を削除しますか？`,
    zh: `确定删除 '${name}' 吗？`,
    ru: `Удалить '${name}'?`,
    kk: `'${name}' жойылсын ба?`,
    vi: `Xóa '${name}'?`,
  };
  return m[l] ?? m.ko;
}

// 삭제 확인창 — 모든 언어판과 함께 삭제(페이지·글)
export function confirmDeleteAllLangs(l: LocaleCode, name: string): string {
  const m: Record<LocaleCode, string> = {
    ko: `'${name}'을(를) 모든 언어판과 함께 삭제합니다. 계속할까요?`,
    en: `Delete '${name}' and all its translations?`,
    ja: `'${name}' をすべての言語版とともに削除します。よろしいですか？`,
    zh: `将删除 '${name}' 及其所有语言版本。确定吗？`,
    ru: `Удалить '${name}' вместе со всеми переводами?`,
    kk: `'${name}' барлық тіл нұсқаларымен бірге жойылады. Жалғастырасыз ба?`,
    vi: `Xóa '${name}' cùng tất cả bản dịch?`,
  };
  return m[l] ?? m.ko;
}

// 삭제 확인창 — 하위 N개 함께 삭제(메뉴)
export function confirmDeleteWithChildren(l: LocaleCode, name: string, count: number): string {
  const m: Record<LocaleCode, string> = {
    ko: `'${name}' 및 하위 ${count}개 메뉴를 함께 삭제합니다. 계속할까요?`,
    en: `Delete '${name}' and its ${count} sub-menu(s)?`,
    ja: `'${name}' と下位 ${count} 件のメニューを一緒に削除します。よろしいですか？`,
    zh: `将删除 '${name}' 及其 ${count} 个子菜单。确定吗？`,
    ru: `Удалить '${name}' и ${count} подменю?`,
    kk: `'${name}' және оның ${count} ішкі мәзірін жоямыз. Жалғастырасыз ба?`,
    vi: `Xóa '${name}' và ${count} menu con?`,
  };
  return m[l] ?? m.ko;
}

// 메일 발송 확인창
export function confirmSendMail(l: LocaleCode, count: number): string {
  const m: Record<LocaleCode, string> = {
    ko: `${count}명에게 메일을 발송할까요?`,
    en: `Send email to ${count} recipient(s)?`,
    ja: `${count}名にメールを送信しますか？`,
    zh: `向 ${count} 人发送邮件吗？`,
    ru: `Отправить письмо ${count} получателям?`,
    kk: `${count} адамға хат жіберілсін бе?`,
    vi: `Gửi email đến ${count} người?`,
  };
  return m[l] ?? m.ko;
}

export const pagesNotice = (l: LocaleCode) => pick(pages, l);
export const postsNotice = (l: LocaleCode) => pick(posts, l);
export const menusNotice = (l: LocaleCode) => pick(menus, l);
export const pageEditorLabels = (l: LocaleCode) => pick(pageEditor, l);
