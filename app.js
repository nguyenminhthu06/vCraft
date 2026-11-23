const app = document.querySelector('#app');
const notice = document.querySelector('#notice');
const storageKey = 'vcraft-demo-v1';
const sample = {
  artisans: [
    {id: 1, name: 'Xưởng Gốm An Thổ', story: 'Gia đình gìn giữ kỹ thuật vuốt tay và men tro truyền thống qua ba thế hệ.', status: 'ACTIVE', visits: true, start: '08:00', end: '17:00', lat: 20.9748, lng: 105.9177, certificate: 'Chứng nhận chất lượng · dữ liệu mẫu'},
    {id: 2, name: 'Nhà Gốm Lam', story: 'Xưởng kết hợp nét vẽ lam truyền thống với các dòng gốm gia dụng đương đại.', status: 'ACTIVE', visits: true, start: '09:00', end: '18:00', lat: 20.977, lng: 105.9205, certificate: 'Chứng nhận chất lượng · dữ liệu mẫu'},
    {id: 3, name: 'Gốm Tân Nghệ', story: 'Xưởng gốm gia đình chuyên dòng men mộc.', status: 'PENDING', visits: false, lat: 20.976, lng: 105.919}
  ],
  products: [
    {id: 1, artisan: 1, name: 'Bình men tro', category: 'Trang trí', price: 420000, style: 'vase', description: 'Dáng bình vuốt tay với lớp men tro xanh rêu.', status: 'PUBLISHED'},
    {id: 2, artisan: 1, name: 'Cốc men mộc', category: 'Gia dụng', price: 85000, style: 'cup', description: 'Cốc gốm nung, bề mặt men mờ và vành tròn.', status: 'PUBLISHED'},
    {id: 3, artisan: 2, name: 'Bát vẽ lam', category: 'Gia dụng', price: 145000, style: 'bowl', description: 'Họa tiết lam được vẽ tay dưới men trong.', status: 'PUBLISHED'}
  ],
  batches: [{token: 'BT-COC-001', product: 2, quantity: 120, status: 'COMPLETED', story: 'Từ đất đã luyện đến mẻ cốc men mộc hoàn thiện.', milestones: [
    {date: '2026-11-10T08:00', name: 'Nhào đất', note: 'Luyện đất để đạt độ dẻo đồng đều.'},
    {date: '2026-11-12T09:30', name: 'Vuốt tạo hình', note: 'Vuốt cốc trên bàn xoay, sau đó hong khô.'},
    {date: '2026-11-15T13:00', name: 'Tráng men và nung', note: 'Kiểm tra lớp men trước khi đưa vào lò.'},
    {date: '2026-11-17T10:30', name: 'Kiểm tra thành phẩm', note: 'Phân loại và kiểm tra từng cốc sau khi ra lò.'}
  ]}, {token: 'BT-BINH-002', product: 1, quantity: 24, status: 'IN_PROGRESS', story: 'Mẻ bình men tro đang được tạo hình tại xưởng An Thổ.', milestones: [
    {date: '2026-11-21T08:00', name: 'Nhào đất', note: 'Nhào đất và chia thành từng phần trước khi vuốt.'},
    {date: '2026-11-22T09:30', name: 'Vuốt tạo hình', note: 'Vuốt thân bình trên bàn xoay, sau đó hong khô.'}
  ]}],
  requests: [{id: 1, name: '5.000 cốc gốm in logo', description: 'Cốc men mộc 300 ml, in logo một màu.', quantity: 5000, unit: 'cốc', category: 'Gia dụng', delivery: '2027-01-20', deadline: '', targets: [1, 2], status: 'ARTISANS_BIDDING', quotes: [
    {artisan: 1, price: 55000, days: 30, note: 'Duyệt mẫu trước sản xuất.', status: 'SUBMITTED'},
    {artisan: 2, price: 59000, days: 24, note: 'Bao gồm đóng gói từng cốc.', status: 'SUBMITTED'}
  ]}],
  orders: [],
  news: [{title: 'Ngày trải nghiệm làm gốm Bát Tràng', body: 'Khách tham quan có thể thử vuốt gốm và tìm hiểu các công đoạn tại xưởng đón khách.', date: '2026-11-20', status: 'PUBLISHED'}],
  notifications: [],
  audit: []
};

function load() {
  let state;
  try {
    state = JSON.parse(localStorage.getItem(storageKey)) || structuredClone(sample);
  } catch {
    state = structuredClone(sample);
  }
  if (!state.journalVersion) {
    const example = sample.batches[1];
    if (!state.batches.some(batch => batch.token === example.token)) state.batches.push(structuredClone(example));
    state.batches.forEach(batch => batch.milestones.forEach((item, index) => {
      item.id ??= index + 1;
      item.images ??= item.image ? [item.image] : [];
      delete item.image;
    }));
    state.journalVersion = 1;
  }
  return state;
}

let db = load();
let role = 'customer';
let artisanId = 1;
let mapId = 1;
let query = {text: '', category: '', artisan: '', page: 1};
let requestId = 1;
let noticeTimer;
let publishedTrace;
const artisan = id => db.artisans.find(row => row.id === Number(id));
const product = id => db.products.find(row => row.id === Number(id));
const active = id => artisan(id)?.status === 'ACTIVE';
const visible = row => row?.status === 'PUBLISHED' && active(row.artisan);
const currentRequest = () => db.requests.find(row => row.id === requestId);
const money = value => new Intl.NumberFormat('vi-VN', {style: 'currency', currency: 'VND'}).format(value);
const number = value => Number(value).toLocaleString('vi-VN');
const next = rows => Math.max(0, ...rows.map(row => row.id)) + 1;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const tagged = value => '<span class="tag">' + esc(value) + '</span>';
const title = (label, heading, intro = '') => '<p class="eyebrow">' + esc(label) + '</p><h1>' + esc(heading) + '</h1>' + (intro ? '<p class="muted">' + esc(intro) + '</p>' : '');
const art = style => '<div class="art ' + esc(style) + '" aria-hidden="true"><span class="pot"></span></div>';
const button = (label, action, id = '', extra = '') => '<button type="button" data-action="' + action + '" data-id="' + esc(id) + '" ' + extra + '>' + esc(label) + '</button>';
const link = (label, route, kind = '') => '<a class="button ' + kind + '" href="#' + esc(route) + '">' + esc(label) + '</a>';
const input = (label, name, type = 'text', attrs = '') => '<label>' + label + '<input name="' + name + '" type="' + type + '" ' + attrs + '></label>';
const options = (values, selected) => values.map(([value, label]) => '<option value="' + esc(value) + '"' + (String(value) === String(selected) ? ' selected' : '') + '>' + esc(label) + '</option>').join('');
const select = (label, name, values, selected) => '<label>' + label + '<select name="' + name + '">' + options(values, selected) + '</select></label>';
const categories = ['Gia dụng', 'Trang trí'].map(value => [value, value]);
const workshopOptions = () => db.artisans.filter(row => active(row.id)).map(row => [row.id, row.name]);
const form = (name, fields, label, id = '') => '<form data-form="' + name + '" data-id="' + esc(id) + '"><div class="fields">' + fields + '</div><button>' + label + '</button></form>';

function notify(message) {
  notice.textContent = message;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { notice.textContent = ''; }, 4500);
}

function audit(message, details = {}) {
  db.audit.unshift({message, date: new Date().toISOString(), actor: role === 'artisan' ? artisan(artisanId).name : role, ...details});
}

function message(to, text, owner = null) {
  db.notifications.unshift({to, text, artisan: owner});
}

function change(fn) {
  db = load();
  try {
    settleDeadlines();
    const result = fn();
    localStorage.setItem(storageKey, JSON.stringify(db));
    render();
    notify(result);
  } catch (error) {
    db = load();
    notify(error.name === 'QuotaExceededError' ? 'Bộ nhớ trình duyệt đã đầy. Thay đổi chưa được lưu.' : error.message);
  }
}

function check(ok, error) {
  if (!ok) throw new Error(error);
}

function opening(row) {
  if (!row.visits) return 'Không đón khách';
  if (!row.start || !row.end) return 'Chưa cập nhật giờ';
  const now = new Intl.DateTimeFormat('en-GB', {timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format();
  return now >= row.start && now < row.end ? 'Đang mở cửa' : 'Đã đóng cửa';
}

function card(row) {
  return '<article class="card"><a href="#product/' + row.id + '">' + art(row.style) + '<div class="pad"><p class="eyebrow">' + esc(row.category) + '</p><h3>' + esc(row.name) + '</h3><p class="muted">' + esc(artisan(row.artisan).name) + '</p><span class="price">' + money(row.price) + '</span></div></a></article>';
}

function home() {
  return '<section class="hero"><div class="hero-copy"><p class="eyebrow">Triển lãm số làng nghề</p><h1>Làng gốm<br>Bát Tràng</h1><p>Gặp những người làm gốm, xem hành trình của từng mẻ nung và kết nối với xưởng cho đơn hàng mua sỉ.</p><div class="actions">' + link('Khám phá sản phẩm', 'catalog') + link('Xem bản đồ', 'village', 'outline') + '</div></div>' + art('vase') + '</section><section class="section"><div class="heading"><h2>Sản phẩm tiêu biểu</h2>' + link('Xem danh mục', 'catalog', 'outline') + '</div><div class="grid">' + db.products.filter(visible).slice(0, 3).map(card).join('') + '</div></section><section class="section"><h2>Từ các xưởng trong làng</h2><div class="grid">' + db.artisans.filter(row => active(row.id)).map(workshopCard).join('') + '</div></section><section class="section"><h2>Tin làng nghề</h2>' + publicNews().slice(0, 1).map(newsCard).join('') + '</section>';
}

function catalog() {
  const rows = db.products.filter(row => visible(row) && (!query.category || row.category === query.category) && (!query.artisan || row.artisan === Number(query.artisan)) && [row.name, row.description, artisan(row.artisan).name].join(' ').toLocaleLowerCase('vi').includes(query.text.trim().toLocaleLowerCase('vi')));
  const pages = Math.max(1, Math.ceil(rows.length / 6));
  query.page = Math.min(query.page, pages);
  return title('Triển lãm số', 'Sản phẩm làng nghề') + '<div class="panel">' + form('search', input('Từ khóa', 'text', 'search', 'value="' + esc(query.text) + '"') + select('Phân loại', 'category', [['', 'Tất cả'], ...categories], query.category) + select('Xưởng', 'artisan', [['', 'Tất cả'], ...workshopOptions()], query.artisan), 'Lọc sản phẩm') + '</div><section class="section"><p class="muted">' + rows.length + ' sản phẩm</p><div class="grid">' + rows.slice((query.page - 1) * 6, query.page * 6).map(card).join('') + '</div>' + (rows.length ? '' : '<p>Không tìm thấy sản phẩm phù hợp.</p>') + (pages > 1 ? '<div class="actions section">' + button('Trang trước', 'page', query.page - 1, query.page === 1 ? 'disabled' : '') + '<span>Trang ' + query.page + ' / ' + pages + '</span>' + button('Trang sau', 'page', query.page + 1, query.page === pages ? 'disabled' : '') + '</div>' : '') + '</section>';
}

function detail(id) {
  const row = product(id);
  if (!visible(row)) return missing();
  const batches = db.batches.filter(batch => batch.product === row.id);
  return '<div class="split">' + ('<div>' + (evidence(row.images, row.name) || art(row.style)) + '</div>') + '<section class="panel">' + title(row.category, row.name, row.description) + '<p class="price">' + money(row.price) + '</p>' + (row.material ? '<p>Vật liệu · ' + esc(row.material) + '</p>' : '') + (row.dimensions ? '<p>Kích thước · ' + esc(row.dimensions) + '</p>' : '') + '<p>Xưởng sản xuất · ' + esc(artisan(row.artisan).name) + '</p><div class="actions">' + link('Xem xưởng', 'artisan/' + row.artisan, 'outline') + link('Yêu cầu báo giá', 'work') + '</div></section></div><section class="section"><h2>Lô sản xuất</h2><div class="actions">' + batches.map(batch => link('Truy xuất ' + batch.token, 'trace/' + encodeURIComponent(batch.token), 'outline')).join('') + (batches.length ? '' : '<p>Chưa có lô công khai.</p>') + '</div></section>';
}

function workshopCard(row) {
  return '<article class="panel"><p>' + tagged(opening(row)) + '</p><h3>' + esc(row.name) + '</h3><p>' + esc(row.story) + '</p>' + link('Xem hồ sơ xưởng', 'artisan/' + row.id, 'outline') + '</article>';
}

function workshop(id) {
  const row = artisan(id);
  if (!active(id)) return missing();
  return title('Virtual Village', row.name, row.story) + evidence(row.images, row.name) + '<div class="split"><div class="panel"><h3>Tham quan xưởng</h3><p>' + tagged(opening(row)) + '</p><p>' + esc(row.start && row.end ? row.start + ' – ' + row.end : 'Chưa cập nhật giờ') + '</p><p>Địa chỉ · ' + esc(row.address || 'Chưa cập nhật') + '</p>' + (row.lat != null && row.lng != null ? '<p>Tọa độ · ' + esc(row.lat) + ', ' + esc(row.lng) + '</p>' : '') + link('Định vị trên bản đồ', 'village/' + row.id, 'outline') + '</div><div class="panel"><h3>Chứng nhận chất lượng</h3><p>' + esc(row.certificate || 'Chưa cập nhật') + '</p><h3>Trải nghiệm</h3><p>' + (row.visits ? esc(row.experience || 'Tìm hiểu các công đoạn và thử tạo hình trên bàn xoay.') : 'Xưởng hiện không đón khách tham quan.') + '</p></div></div><section class="section"><h2>Sản phẩm của xưởng</h2><div class="grid">' + db.products.filter(item => item.artisan === row.id && visible(item)).map(card).join('') + '</div></section>';
}

const chronological = batch => [...batch.milestones].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
const safeImage = value => /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value);
const milestoneTime = date => date.includes('T') ? date.replace('T', ' · ') + ' (giờ Việt Nam)' : date;
const imageTag = (src, label) => safeImage(src) ? '<img loading="lazy" alt="' + esc(label) + '" src="' + esc(src) + '">' : '';
const evidence = (images, label) => images?.length ? '<div class="evidence">' + images.map((src, i) => imageTag(src, label + ' · ảnh ' + (i + 1))).join('') + '</div>' : '';

function publicBatch(batch) {
  const row = product(batch.product);
  if (!visible(row)) return null;
  return {
    token: batch.token, story: batch.story, quantity: batch.quantity, status: batch.status,
    productName: row.name, style: ['cup', 'bowl'].includes(row.style) ? row.style : 'vase',
    workshopName: artisan(row.artisan).name,
    milestones: chronological(batch).map(({date, name, note, images}) => ({date, name, note, images: images.filter(safeImage)}))
  };
}

function trace(token) {
  const batch = db.batches.find(row => row.token === token);
  const view = publishedTrace?.token === token ? publishedTrace : batch && publicBatch(batch);
  if (!view) return missing();
  const steps = view.milestones;
  const complete = view.status === 'COMPLETED';
  const last = steps.at(-1);
  const gallery = (images, label) => '<div class="evidence">' + images.map((src, i) => imageTag(src, label + ' · ảnh ' + (i + 1))).join('') + '</div>';
  return title('Truy xuất nguồn gốc', view.token, view.story) + '<div class="split"><div class="card">' + art(view.style) + '<div class="pad"><h3>' + esc(view.productName) + '</h3><p>' + esc(view.workshopName) + ' · ' + number(view.quantity) + ' sản phẩm</p><p>' + tagged(complete ? 'Đã hoàn thành' : 'Đang sản xuất') + '</p>' + qrPanel(view.token) + '</div></div><div class="panel"><h2>Quy trình sản xuất</h2>' + (steps.length ? '<ol class="timeline">' + steps.map(item => '<li><time datetime="' + esc(item.date) + '">' + esc(milestoneTime(item.date)) + '</time><h3>' + esc(item.name) + '</h3><p>' + esc(item.note) + '</p>' + gallery(item.images, item.name) + '</li>').join('') + '</ol>' : '<p>Chưa có mốc sản xuất.</p>') + '</div></div>' + (complete ? '<section class="panel section"><h2>Thành phẩm cuối cùng</h2><h3>' + esc(view.productName) + '</h3><p>' + (last ? esc(last.note) : 'Lô đã hoàn thành.') + '</p>' + (last?.images.length ? gallery(last.images, 'Thành phẩm ' + view.productName) : '<p class="muted">Mốc cuối chưa có ảnh minh chứng.</p>') + '</section>' : '');
}

function qrPanel(token) {
  const copy = button('Sao chép liên kết lô', 'copy');
  if (!/^https?:$/.test(location.protocol) || !location.origin) {
    return copy + '<p class="muted">Để quét bằng điện thoại, mở demo bằng lệnh <code>node server.js --lan</code> và dùng địa chỉ mạng được in ra.</p>';
  }
  const url = new URL('/', location.origin);
  url.searchParams.set('trace', token);
  const code = qrImage(url.href);
  const batch = db.batches.find(item => item.token === token);
  const canShare = !publishedTrace && role === 'artisan' && batch && active(artisanId) && product(batch.product)?.artisan === artisanId;
  if (!code) return copy + '<p>Địa chỉ quá dài để tạo QR. Hãy dùng địa chỉ mạng ngắn của máy chạy demo.</p>';
  return code + '<div class="actions">' + copy + (canShare ? button('Cập nhật trang cho mã QR', 'publish-trace', token) : '') +
    '</div><p class="muted">Quét trên thiết bị cùng mạng. Sau khi sửa nhật ký, Nghệ nhân chọn cập nhật trang cho mã QR để chia sẻ bản mới.</p>';
}

async function publishTrace(token) {
  const batch = db.batches.find(item => item.token === token);
  if (role !== 'artisan' || !batch || !active(artisanId) || product(batch.product)?.artisan !== artisanId) return;
  const view = publicBatch(batch);
  if (!view) return;
  try {
    const response = await fetch('/public-traces/' + encodeURIComponent(token), {
      method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(view)
    });
    if (!response.ok) throw new Error();
    notify('Trang truy xuất đã được cập nhật cho mã QR.');
  } catch {
    notify('Chưa cập nhật được trang truy xuất. Hãy mở demo bằng server.js.');
  }
}

async function openScannedTrace(token) {
  try {
    const response = await fetch('/public-traces/' + encodeURIComponent(token));
    if (response.ok) publishedTrace = await response.json();
  } catch {
    // The bundled sample remains available when the shared snapshot cannot be loaded.
  }
  render();
}

const publicNews = () => db.news.filter(row => row.status === 'PUBLISHED');
const newsCard = row => '<article class="panel"><p class="eyebrow">' + esc(row.date) + '</p><h3>' + esc(row.title) + '</h3><p>' + esc(row.body) + '</p></article>';
const missing = () => title('vCraft', 'Không tìm thấy nội dung') + link('Về triển lãm', 'home');
const statusLabels = {DRAFT_REQUEST:'Bản nháp', SENT_TO_ARTISANS:'Đã gửi cho xưởng', ARTISANS_BIDDING:'Đang nhận chào giá', BUYER_ACCEPTED:'Đã chọn chào giá', ACCEPTED:'Chờ phân bổ', IN_PRODUCTION:'Đang sản xuất', DELIVERED:'Đã giao', ASSIGNED:'Đã phân công', COMPLETED:'Hoàn thành', SUBMITTED:'Đã gửi', REJECTED:'Đã từ chối', WITHDRAWN:'Đã rút', CANCELLED:'Đã hủy'};
const status = code => tagged(statusLabels[code] || code);
const openRequest = rfq => ['SENT_TO_ARTISANS', 'ARTISANS_BIDDING'].includes(rfq.status);
const accepting = rfq => rfq.status === 'ARTISANS_BIDDING';
const currentQuote = quote => !quote.valid || Date.now() < Date.parse(quote.valid);
Object.assign(statusLabels, {EXPIRED:'Hết hạn', ACTIVE:'Đang hoạt động', PENDING:'Chờ duyệt', SUSPENDED:'Tạm khóa', DRAFT:'Bản nháp', PUBLISHED:'Đã xuất bản', HIDDEN:'Đã ẩn'});

function settleDeadlines() {
  let changed = false;
  for (const request of db.requests.filter(openRequest)) {
    for (const quote of request.quotes) {
      if (quote.status === 'SUBMITTED' && !currentQuote(quote)) {
        quote.status = 'EXPIRED';
        changed = true;
      }
    }
    if (!beforeDeadline(request) && !request.quotes.some(quote => quote.status === 'SUBMITTED')) {
      request.status = 'EXPIRED';
      changed = true;
    }
  }
  return changed;
}

function refreshDeadlines() {
  db = load();
  if (!settleDeadlines()) return;
  try { localStorage.setItem(storageKey, JSON.stringify(db)); } catch {}
  render();
}

const reopenForm = rfq => form('reopen-rfq', input('Hạn nhận mới (giờ Việt Nam)', 'deadline', 'datetime-local', 'required'), 'Mở lại yêu cầu', rfq.id);
const participation = (rfq, owner) => rfq.responses?.[owner];

function rfqAdministration() {
  const rows = db.requests.filter(rfq => openRequest(rfq) || rfq.status === 'EXPIRED');
  return '<section class="panel"><h2>Yêu cầu báo giá</h2>' + (rows.map(rfq => {
    const available = workshopOptions().filter(([id]) => !rfq.targets.includes(id));
    return '<article class="item">' + requestHeader(rfq) + (rfq.status === 'EXPIRED' ? reopenForm(rfq) :
      openRequest(rfq) && beforeDeadline(rfq) && available.length ? form('add-rfq-target', select('Xưởng nhận thêm', 'artisan', available), 'Bổ sung xưởng', rfq.id) : '') + '</article>';
  }).join('') || '<p>Chưa có yêu cầu đang mở hoặc hết hạn.</p>') + '</section>';
}

function requestHeader(rfq) {
  return '<div class="heading"><h3>' + esc(rfq.name) + '</h3>' + status(rfq.status) + '</div><p>' + esc(rfq.description) + '</p><p class="muted">' + number(rfq.quantity) + ' ' + esc(rfq.unit) + ' · ' + esc(rfq.category) + ' · Giao trước ' + esc(rfq.delivery) + (rfq.deadline ? ' · Nhận giá đến ' + esc(rfq.deadline.replace('T', ' ')) : '') + '</p>' + (rfq.budget ? '<p>Ngân sách tham khảo ' + money(rfq.budget) + '</p>' : '');
}

function quoteList(rfq) {
  return rfq.quotes.map(quote => '<div class="item"><div class="heading"><strong>' + esc(artisan(quote.artisan).name) + '</strong>' + status(quote.status) + '</div><p>' + money(quote.price) + ' / ' + esc(rfq.unit) + ' · Tổng ' + money(quote.price * rfq.quantity) + ' · ' + number(quote.days) + ' ngày</p><p>' + esc(quote.note) + '</p>' + (accepting(rfq) && quote.status === 'SUBMITTED' && currentQuote(quote) ? button('Chấp nhận chào giá', 'accept', quote.artisan) : '') + '</div>').join('');
}

function customer() {
  const rfq = currentRequest();
  const create = form('request', input('Tiêu đề', 'name', 'text', 'required maxlength="100"') + input('Số lượng', 'quantity', 'number', 'required min="1" max="1000000"') + input('Đơn vị', 'unit', 'text', 'required maxlength="30" value="cốc"') + input('Ngân sách tham khảo (₫)', 'budget', 'number', 'min="0" max="1000000000000"') + select('Phân loại', 'category', categories) + input('Hạn giao', 'delivery', 'date', 'required') + input('Hạn nhận báo giá (giờ Việt Nam)', 'deadline', 'datetime-local', 'required') + '<label>Đặc tả<textarea name="description" required maxlength="500"></textarea></label>', 'Lưu bản nháp');
  const send = rfq?.status === 'DRAFT_REQUEST' ? '<p>Chọn xưởng nhận yêu cầu</p>' + form('send', workshopOptions().map(([id, name]) => '<label class="check"><input type="checkbox" name="target" value="' + id + '"' + (db.products.some(item => item.artisan === id && visible(item) && item.category === rfq.category) ? ' checked' : '') + '> ' + esc(name) + '</label>').join(''), 'Gửi yêu cầu', rfq.id) : '';
  const targets = rfq?.targets.map(id => '<li>' + esc(artisan(id)?.name) + ' · ' + esc({ACCEPTED:'Đã nhận', DECLINED:'Đã từ chối'}[participation(rfq, id)] || 'Chờ phản hồi') + '</li>').join('');
  return '<div class="panel"><h2>Yêu cầu mua sỉ</h2>' + select('Yêu cầu của bạn', 'request-id', db.requests.map(item => [item.id, item.name]), requestId) + '</div>' + (rfq ? '<section class="panel">' + requestHeader(rfq) + send + (targets ? '<details><summary>Xưởng nhận yêu cầu</summary><ul>' + targets + '</ul></details>' : '') + (rfq.status === 'EXPIRED' ? reopenForm(rfq) : '') + quoteList(rfq) + (rfq.quotes.length ? '' : '<p>Chưa có chào giá.</p>') + (openRequest(rfq) || rfq.status === 'DRAFT_REQUEST' ? button('Hủy yêu cầu', 'cancel-request', rfq.id, 'class="outline"') : '') + '</section>' : '') + orderList('customer') + '<section class="panel"><h3>Tạo yêu cầu báo giá</h3>' + create + '</section>';
}

function orderList(view) {
  const orders = view === 'artisan' ? db.orders.filter(order => order.allocations.some(part => part.artisan === artisanId && part.status !== 'CANCELLED')) : db.orders;
  if (!orders.length) return '';
  return '<section class="panel"><h2>' + (view === 'artisan' ? 'Phần việc được phân bổ' : 'Đơn hàng') + '</h2>' + orders.map(order => {
    const rfq = db.requests.find(row => row.id === order.request);
    const allocations = order.allocations.filter(part => part.status !== 'CANCELLED');
    const total = allocations.reduce((sum, part) => sum + part.quantity, 0);
    const list = allocations.filter(part => view !== 'artisan' || part.artisan === artisanId).map(part => '<div class="item"><div class="heading"><strong>' + esc(artisan(part.artisan).name) + '</strong>' + status(part.status) + '</div><p>' + number(part.quantity) + ' ' + esc(rfq.unit) + (view === 'customer' ? '' : ' · ' + money(part.price) + ' / ' + esc(rfq.unit)) + '</p>' + (view === 'artisan' && order.status === 'IN_PRODUCTION' && part.status !== 'COMPLETED' ? button(part.status === 'ASSIGNED' ? 'Bắt đầu phần việc' : 'Hoàn thành phần việc', 'complete', order.id) : '') + (view === 'admin' && order.status === 'ACCEPTED' ? button('Bỏ phân bổ', 'remove-allocation', order.id + '/' + part.artisan, 'class="outline"') : '') + '</div>').join('');
    const allocationForm = view === 'admin' && order.status === 'ACCEPTED' ? form('allocate', select('Xưởng', 'artisan', workshopOptions()) + input('Số lượng', 'quantity', 'number', 'required min="1"') + input('Đơn giá (₫)', 'price', 'number', 'required min="1" max="1000000000"'), 'Lưu phân bổ', order.id) + '<div class="actions section">' + button('Bắt đầu sản xuất', 'start', order.id, total === rfq.quantity ? '' : 'disabled') + button('Hủy đơn', 'cancel-order', order.id, 'class="outline"') + '</div>' : '';
    return '<div class="item"><div class="heading"><h3>Đơn ' + order.id + ' · ' + esc(rfq.name) + '</h3>' + status(order.status) + '</div><p>Đã phân bổ ' + number(total) + ' / ' + number(rfq.quantity) + ' ' + esc(rfq.unit) + '</p><progress aria-label="Số lượng đã phân bổ" value="' + total + '" max="' + rfq.quantity + '"></progress>' + list + allocationForm + '</div>';
  }).join('') + '</section>';
}

function artisanDesk() {
  const row = artisan(artisanId);
  const picker = '<section class="panel">' + select('Xưởng đang thao tác', 'artisan-id', db.artisans.map(item => [item.id, item.name]), artisanId) + '</section>';
  if (!active(artisanId)) return picker + '<section class="panel"><p>Trạng thái hồ sơ · ' + status(row.status) + '</p><p>Xưởng cần được Ban quản lý kích hoạt trước khi thực hiện nghiệp vụ.</p></section>';
  const requests = db.requests.filter(rfq => rfq.targets.includes(artisanId)).map(rfq => {
    const previous = rfq.quotes.find(item => item.artisan === artisanId);
    const editable = openRequest(rfq) && beforeDeadline(rfq);
    const answer = participation(rfq, artisanId);
    if (editable && answer !== 'ACCEPTED' && previous?.status !== 'SUBMITTED') {
      return '<article class="item">' + requestHeader(rfq) + (answer === 'DECLINED' ? '<p>Xưởng đã từ chối yêu cầu.</p>' : '') +
        '<div class="actions">' + button('Nhận yêu cầu', 'rfq-participation', rfq.id + '/ACCEPTED') +
        (answer === 'DECLINED' ? '' : button('Từ chối yêu cầu', 'rfq-participation', rfq.id + '/DECLINED', 'class="outline"')) + '</div></article>';
    }
    return '<article class="item">' + requestHeader(rfq) + (previous ? '<p>Chào giá của xưởng · ' + money(previous.price) + ' ' + status(previous.status) + '</p>' : '') + (editable ? form('quote', input('Đơn giá (₫)', 'price', 'number', 'required min="1" max="1000000000" value="' + (previous?.price || '') + '"') + input('Số ngày hoàn thành', 'days', 'number', 'required min="1" max="365" value="' + (previous?.days || '') + '"') + input('Điều kiện', 'note', 'text', 'maxlength="300" value="' + esc(previous?.note) + '"') + input('Hiệu lực đến (giờ Việt Nam)', 'valid', 'datetime-local'), 'Gửi chào giá', rfq.id) + (previous?.status === 'SUBMITTED' ? button('Rút chào giá', 'withdraw', rfq.id, 'class="outline"') : '') : '') + '</article>';
  }).join('');
  const goods = db.products.filter(item => item.artisan === artisanId);
  const batches = db.batches.filter(batch => product(batch.product)?.artisan === artisanId).map(batchEditor).join('');
  const journal = '<section class="panel"><h2>Lô và nhật ký sản xuất</h2>' + batches + (goods.length ? form('batch', select('Sản phẩm', 'product', goods.map(item => [item.id, item.name])) + input('Mã lô', 'token', 'text', 'required maxlength="30" pattern="[A-Za-z0-9_-]+"') + input('Số lượng', 'quantity', 'number', 'required min="1" max="1000000"') + input('Câu chuyện lô', 'story', 'text', 'required maxlength="250"'), 'Tạo lô') : '<p>Tạo sản phẩm để bắt đầu ghi nhật ký lô.</p>') + '</section>';
  return picker + journal + '<section class="panel"><h2>Yêu cầu nhận được</h2>' + (requests || '<p>Chưa có yêu cầu được gửi đến xưởng.</p>') + '</section>' + orderList('artisan') + '<section class="panel"><h2>Hồ sơ xưởng</h2>' + form('profile', input('Câu chuyện', 'story', 'text', 'required maxlength="300" value="' + esc(row.story) + '"') + input('Chứng nhận', 'certificate', 'text', 'maxlength="150" value="' + esc(row.certificate) + '"') + input('Mở cửa', 'start', 'time', 'value="' + esc(row.start) + '"') + input('Đóng cửa', 'end', 'time', 'value="' + esc(row.end) + '"') + '<label class="check"><input type="checkbox" name="visits"' + (row.visits ? ' checked' : '') + '>Đón khách</label>', 'Lưu hồ sơ') + '</section><section class="panel"><h2>Sản phẩm của xưởng</h2>' + goods.map(item => '<div class="item heading"><strong>' + esc(item.name) + ' · ' + money(item.price) + '</strong>' + status(item.status) + (item.adminHidden ? '<span>BQL đã ẩn</span>' : button(item.status === 'PUBLISHED' ? 'Ẩn' : 'Xuất bản', 'toggle-product', item.id, 'class="outline"')) + '</div>').join('') + form('product', input('Tên sản phẩm', 'name', 'text', 'required maxlength="100"') + select('Phân loại', 'category', categories) + input('Giá tham khảo (₫)', 'price', 'number', 'required min="1" max="1000000000"') + input('Mô tả', 'description', 'text', 'required maxlength="300"'), 'Tạo sản phẩm nháp') + '</section>';
}

function milestoneFields(item) {
  const at = item ? (item.date.includes('T') ? item.date : item.date + 'T00:00') : '';
  return input('Công đoạn', 'name', 'text', 'required maxlength="100" value="' + esc(item?.name) + '"') +
    input('Thời điểm (giờ Việt Nam)', 'date', 'datetime-local', 'required value="' + esc(at) + '"') +
    '<label>Mô tả<textarea name="note" required maxlength="300">' + esc(item?.note) + '</textarea></label>' +
    input(item ? 'Thêm ảnh minh chứng' : 'Ảnh minh chứng', 'image', 'file', 'multiple accept="image/png,image/jpeg,image/webp"');
}

function batchEditor(batch) {
  const row = product(batch.product);
  const locked = batch.status === 'COMPLETED';
  const steps = chronological(batch).map(item => {
    const key = batch.token + '/' + item.id;
    const gallery = item.images.map((src, index) => '<div>' + imageTag(src, item.name + ' · ảnh ' + (index + 1)) +
      (locked ? '' : button('Xóa ảnh ' + (index + 1), 'delete-image', key + '/' + index, 'class="outline"')) + '</div>').join('');
    return '<li><time datetime="' + esc(item.date) + '">' + esc(milestoneTime(item.date)) + '</time><h3>' + esc(item.name) + '</h3><p>' + esc(item.note) + '</p><div class="evidence">' + gallery + '</div>' +
      (locked ? '' : '<details><summary>Sửa mốc hoặc thêm ảnh</summary>' + form('edit-milestone', milestoneFields(item), 'Lưu thay đổi', key) + '</details>' +
        button('Xóa mốc', 'delete-milestone', key, 'class="outline"')) + '</li>';
  }).join('');
  return '<article class="item batch-editor"><div class="heading"><h3>' + esc(batch.token) + ' · ' + esc(row.name) + '</h3>' + status(batch.status) + '</div><div class="actions">' +
    (visible(row) ? link('Xem trang truy xuất và QR', 'trace/' + encodeURIComponent(batch.token), 'outline') : '') +
    (locked ? '<p>Nhật ký đã khóa sau khi hoàn thành lô.</p>' : button('Hoàn thành lô', 'finish-batch', batch.token)) + '</div>' +
    (steps ? '<ol class="timeline">' + steps + '</ol>' : '<p>Chưa có mốc sản xuất.</p>') +
    (locked ? '' : '<details><summary>Thêm mốc sản xuất</summary><p class="muted">Nội dung được công khai trên trang truy xuất. Mỗi mốc hỗ trợ tối đa 8 ảnh PNG, JPEG hoặc WebP.</p>' + form('milestone', milestoneFields(), 'Thêm mốc', batch.token) + '</details>') + '</article>';
}

function admin() {
  return orderList('admin') + '<section class="panel"><h2>Kiểm duyệt xưởng</h2>' + db.artisans.map(row => '<div class="item"><div class="heading"><strong>' + esc(row.name) + '</strong>' + status(row.status) + '</div><div class="actions">' + (row.status === 'ACTIVE' ? button('Tạm khóa', 'review', row.id + '/SUSPENDED', 'class="outline"') : button('Kích hoạt', 'review', row.id + '/ACTIVE')) + (row.reviewReason ? '<p>' + esc(row.reviewReason) + '</p>' : '') + '</div></div>').join('') + '</section><section class="panel"><h2>Kiểm duyệt sản phẩm</h2>' + db.products.map(row => '<div class="item heading"><strong>' + esc(row.name) + '</strong>' + status(row.status) + (row.status === 'PUBLISHED' ? button('Ẩn sản phẩm', 'hide-product', row.id, 'class="outline"') : '') + '</div>').join('') + '</section><section class="panel"><h2>Tin tức cộng đồng</h2>' + db.news.map((row, i) => '<div class="item heading"><strong>' + esc(row.title) + '</strong>' + status(row.status) + button(row.status === 'PUBLISHED' ? 'Ẩn tin' : 'Xuất bản', 'toggle-news', i, 'class="outline"') + '</div>').join('') + form('news', input('Tiêu đề', 'title', 'text', 'required maxlength="100"') + '<label>Nội dung<textarea name="body" required maxlength="600"></textarea></label>', 'Lưu bản nháp') + '</section><section class="panel"><h2>Nhật ký thao tác</h2>' + (db.audit.length ? '<ul>' + db.audit.map(item => '<li>' + esc(new Date(item.date).toLocaleString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh'})) + ' · ' + esc(item.message) + '</li>').join('') + '</ul>' : '<p>Chưa có thao tác được ghi.</p>') + '</section>';
}

function administrationForms() {
  const pending = db.artisans.filter(row => row.status !== 'ACTIVE').map(row => [row.id, row.name]);
  const inspect = pending.length ? form('reject-workshop', select('Hồ sơ', 'artisan', pending) +
    input('Lý do từ chối', 'reason', 'text', 'required maxlength="180"'), 'Từ chối và gửi lý do') : '';
  const news = db.news.map((row, index) => '<details class="item"><summary>Sửa ' + esc(row.title) + '</summary>' +
    form('edit-news', input('Tiêu đề', 'title', 'text', 'required maxlength="100" value="' + esc(row.title) + '"') +
      '<label>Nội dung<textarea name="body" required maxlength="600">' + esc(row.body) + '</textarea></label>', 'Lưu tin đã sửa', index) + '</details>').join('');
  return '<section class="panel"><h2>Tiếp nhận hồ sơ xưởng</h2>' + form('enroll-workshop',
    input('Tên xưởng', 'name', 'text', 'required maxlength="100"') +
    input('Email đại diện', 'email', 'email', 'required maxlength="100"') +
    input('Giới thiệu xưởng', 'story', 'text', 'required maxlength="300"'), 'Tạo hồ sơ chờ duyệt') +
    (inspect ? '<details class="item"><summary>Từ chối hồ sơ kèm lý do</summary>' + inspect + '</details>' : '') + '</section>' +
    (news ? '<section class="panel"><h2>Sửa nội dung tin</h2>' + news + '</section>' : '');
}

function productEditing() {
  const rows = db.products.filter(row => row.artisan === artisanId);
  if (!rows.length) return '';
  return '<section class="panel"><h2>Chi tiết sản phẩm</h2>' + rows.map(row => '<details class="item"><summary>Sửa ' + esc(row.name) + '</summary>' +
    form('edit-product',
      input('Tên sản phẩm', 'name', 'text', 'required maxlength="100" value="' + esc(row.name) + '"') +
      select('Phân loại', 'category', categories, row.category) +
      input('Giá tham khảo (₫)', 'price', 'number', 'required min="1" max="1000000000" value="' + row.price + '"') +
      input('Vật liệu', 'material', 'text', 'maxlength="80" value="' + esc(row.material) + '"') +
      input('Kích thước', 'dimensions', 'text', 'maxlength="60" value="' + esc(row.dimensions) + '"') +
      '<label>Mô tả<textarea name="description" maxlength="300" required>' + esc(row.description) + '</textarea></label>' +
      input('Ảnh sản phẩm mới (thay bộ ảnh hiện tại)', 'image', 'file', 'multiple accept="image/png,image/jpeg,image/webp"'), 'Lưu sản phẩm', row.id) +
    '</details>').join('') + '</section>';
}

function workshopMedia() {
  const row = artisan(artisanId);
  return '<section class="panel"><h2>Hình ảnh và địa điểm xưởng</h2>' + evidence(row.images, row.name) +
    form('workshop-media', input('Địa chỉ', 'address', 'text', 'maxlength="180" value="' + esc(row.address) + '"') +
      input('Vĩ độ', 'lat', 'number', 'step="any" min="-90" max="90" value="' + esc(row.lat) + '"') +
      input('Kinh độ', 'lng', 'number', 'step="any" min="-180" max="180" value="' + esc(row.lng) + '"') +
      input('Hoạt động trải nghiệm', 'experience', 'text', 'maxlength="200" value="' + esc(row.experience) + '"') +
      input('Ảnh xưởng mới (thay bộ ảnh hiện tại)', 'image', 'file', 'multiple accept="image/png,image/jpeg,image/webp"'), 'Lưu địa điểm và ảnh');
}

function work() {
  const messages = db.notifications.filter(item => item.to === role && (role !== 'artisan' || item.artisan === artisanId));
  return title('vCraft demo', 'Không gian làm việc', 'Chọn vai trò để thử các bước trong cùng một phiên demo.') + '<div class="panel heading">' + select('Vai trò demo', 'role', [['customer','Khách hàng'], ['artisan','Hộ nghề / Nghệ nhân'], ['admin','Ban quản lý']], role) + (messages.length ? '<details><summary>Thông báo (' + messages.length + ')</summary><ul>' + messages.map(item => '<li>' + esc(item.text) + '</li>').join('') + '</ul></details>' : '<span class="muted">Chưa có thông báo</span>') + '</div>' + ({customer, artisan: artisanDesk, admin}[role])() + (role === 'admin' ? rfqAdministration() + administrationForms() : '') + (role === 'artisan' && active(artisanId) ? workshopMedia() + productEditing() : '');
}

function render() {
  const scanned = new URLSearchParams(location.search).get('trace');
  const [route, id] = (location.hash.slice(1) || (scanned ? 'trace/' + encodeURIComponent(scanned) : 'home')).split('/');
  const routes = {home, catalog, village, work, news: () => title('Bát Tràng', 'Tin tức cộng đồng') + (publicNews().map(newsCard).join('') || '<p>Chưa có tin được xuất bản.</p>'), product: detail, artisan: workshop, trace};
  closeVillageMap();
  app.innerHTML = Object.hasOwn(routes, route) ? routes[route](id ? decodeURIComponent(id) : '') : missing();
  if (route === 'village') mountVillageMap(id);
  document.querySelectorAll('.top a[href]').forEach(anchor => {
    if (anchor.hash === '#' + route) anchor.setAttribute('aria-current', 'page');
    else anchor.removeAttribute('aria-current');
  });
}

const beforeDeadline = rfq => !rfq.deadline || Date.now() < Date.parse(rfq.deadline + '+07:00');
const handlers = {
  'rfq-participation'(key) {
    const [id, response] = key.split('/');
    const rfq = db.requests.find(row => row.id === Number(id));
    check(role === 'artisan' && active(artisanId) && rfq?.targets.includes(artisanId) && openRequest(rfq) && beforeDeadline(rfq), 'Yêu cầu không còn nhận phản hồi.');
    check(['ACCEPTED', 'DECLINED'].includes(response) && !rfq.quotes.some(quote => quote.artisan === artisanId && quote.status === 'SUBMITTED'), 'Không thể đổi phản hồi khi chào giá đang có hiệu lực.');
    (rfq.responses ??= {})[artisanId] = response;
    return response === 'ACCEPTED' ? 'Xưởng đã nhận yêu cầu.' : 'Xưởng đã từ chối yêu cầu.';
  },
  accept(id) {
    const rfq = currentRequest();
    check(role === 'customer' && accepting(rfq) && !db.orders.some(order => order.request === rfq.id), 'Yêu cầu này đã được xử lý hoặc chưa có chào giá.');
    const quote = rfq.quotes.find(item => item.artisan === Number(id));
    check(quote?.status === 'SUBMITTED' && currentQuote(quote), 'Chào giá không còn hiệu lực.');
    rfq.status = 'BUYER_ACCEPTED';
    for (const item of rfq.quotes) {
      if (item.status === 'SUBMITTED') item.status = item === quote ? 'ACCEPTED' : (currentQuote(item) ? 'REJECTED' : 'EXPIRED');
    }
    db.orders.push({id: next(db.orders), request: rfq.id, status: 'ACCEPTED', allocations: []});
    message('artisan', 'Khách đã chấp nhận chào giá cho ' + rfq.name, quote.artisan);
    message('admin', 'Đơn mới chờ phân bổ · ' + rfq.name);
    audit('Chấp nhận chào giá và tạo đơn cho ' + rfq.name);
    return 'Đã tạo đơn, chờ Ban quản lý phân bổ.';
  },
  start(id) {
    const order = findOrder(id);
    const rfq = db.requests.find(item => item.id === order?.request);
    check(role === 'admin' && order?.status === 'ACCEPTED', 'Đơn chưa sẵn sàng bắt đầu.');
    check(order.allocations.filter(part => part.status !== 'CANCELLED').reduce((sum, part) => sum + part.quantity, 0) === rfq.quantity, 'Cần phân bổ đủ số lượng đặt.');
    order.status = rfq.status = 'IN_PRODUCTION';
    audit('Bắt đầu sản xuất đơn ' + id);
    return 'Đơn đã chuyển sang sản xuất.';
  },
  complete(id) {
    const order = findOrder(id);
    const part = order?.allocations.find(item => item.artisan === artisanId);
    check(role === 'artisan' && active(artisanId) && order?.status === 'IN_PRODUCTION' && ['ASSIGNED', 'IN_PRODUCTION'].includes(part?.status), 'Phần việc chưa thể cập nhật.');
    part.status = part.status === 'ASSIGNED' ? 'IN_PRODUCTION' : 'COMPLETED';
    if (order.allocations.filter(item => item.status !== 'CANCELLED').every(item => item.status === 'COMPLETED')) {
      order.status = db.requests.find(item => item.id === order.request).status = 'DELIVERED';
      message('customer', 'Đơn ' + id + ' đã giao.');
    }
    audit(artisan(artisanId).name + ' cập nhật phần việc đơn ' + id);
    return order.status === 'DELIVERED' ? 'Tất cả phần việc đã hoàn thành. Đơn đã giao.' : 'Đã cập nhật phần việc.';
  },
  'remove-allocation'(id) {
    const [orderId, owner] = id.split('/');
    const order = findOrder(orderId);
    const part = order?.allocations.find(item => item.artisan === Number(owner));
    check(role === 'admin' && order?.status === 'ACCEPTED' && part, 'Không thể bỏ phân bổ.');
    part.status = 'CANCELLED';
    audit('Bỏ phân bổ đơn ' + orderId + ' cho ' + artisan(owner).name);
    return 'Đã bỏ phân bổ.';
  },
  'cancel-request'(id) {
    const rfq = db.requests.find(item => item.id === Number(id));
    check(role === 'customer' && rfq && (openRequest(rfq) || rfq.status === 'DRAFT_REQUEST'), 'Yêu cầu không thể hủy.');
    rfq.status = 'CANCELLED';
    return 'Đã hủy yêu cầu.';
  },
  'cancel-order'(id) {
    const order = findOrder(id);
    check(role === 'admin' && order?.status === 'ACCEPTED', 'Đơn không thể hủy.');
    order.status = db.requests.find(item => item.id === order.request).status = 'CANCELLED';
    order.allocations.forEach(part => { part.status = 'CANCELLED'; });
    audit('Hủy đơn ' + id);
    return 'Đã hủy đơn.';
  },
  withdraw(id) {
    const rfq = db.requests.find(item => item.id === Number(id));
    const quote = rfq?.quotes.find(item => item.artisan === artisanId);
    check(role === 'artisan' && active(artisanId) && rfq && openRequest(rfq) && beforeDeadline(rfq) && quote?.status === 'SUBMITTED', 'Chào giá không thể rút.');
    quote.status = 'WITHDRAWN';
    return 'Đã rút chào giá.';
  },
  review(id) {
    const [owner, state] = id.split('/');
    const row = artisan(owner);
    check(role === 'admin' && row && ['ACTIVE', 'SUSPENDED'].includes(state), 'Không thể cập nhật hồ sơ.');
    row.status = state;
    audit('Cập nhật hồ sơ ' + row.name + ' · ' + state);
    message('artisan', 'Hồ sơ xưởng chuyển sang ' + state, row.id);
    return 'Đã cập nhật trạng thái xưởng.';
  },
  'toggle-product'(id) {
    const row = product(id);
    check(role === 'artisan' && active(artisanId) && row?.artisan === artisanId && !row.adminHidden, 'Không thể đổi trạng thái sản phẩm.');
    row.status = row.status === 'PUBLISHED' ? 'HIDDEN' : 'PUBLISHED';
    return 'Đã cập nhật sản phẩm.';
  },
  'hide-product'(id) {
    const row = product(id);
    check(role === 'admin' && row?.status === 'PUBLISHED', 'Không thể ẩn sản phẩm.');
    row.status = 'HIDDEN';
    row.adminHidden = true;
    audit('Ẩn sản phẩm ' + row.name);
    return 'Đã ẩn sản phẩm.';
  },
  'finish-batch'(id) {
    const batch = ownBatch(id);
    check(batch.milestones.length, 'Hãy thêm ít nhất một mốc sản xuất.');
    batch.status = 'COMPLETED';
    audit('Hoàn thành lô ' + id);
    return 'Đã hoàn thành lô và khóa nhật ký.';
  },
  'delete-milestone'(key) {
    const {batch, item} = ownMilestone(key);
    batch.milestones = batch.milestones.filter(step => step.id !== item.id);
    journalAudit('MILESTONE_DELETED', 'Xóa mốc ' + item.name, batch, item, item.images.length);
    return 'Đã xóa mốc và ảnh của mốc.';
  },
  'delete-image'(key) {
    const {batch, item, index} = ownMilestone(key);
    check(Number.isInteger(index) && index >= 0 && index < item.images.length, 'Không tìm thấy ảnh.');
    item.images.splice(index, 1);
    journalAudit('MILESTONE_IMAGE_DELETED', 'Xóa ảnh khỏi mốc ' + item.name, batch, item, 1);
    return 'Đã xóa ảnh minh chứng.';
  },
  'toggle-news'(id) {
    const row = db.news[Number(id)];
    check(role === 'admin' && row, 'Không thể cập nhật tin.');
    row.status = row.status === 'PUBLISHED' ? 'HIDDEN' : 'PUBLISHED';
    audit('Cập nhật tin ' + row.title + ' · ' + row.status);
    return 'Đã cập nhật tin.';
  }
};

function findOrder(id) {
  return db.orders.find(row => row.id === Number(id));
}

function ownBatch(token) {
  const batch = db.batches.find(row => row.token === token);
  check(role === 'artisan' && active(artisanId) && batch?.status === 'IN_PROGRESS' && product(batch.product)?.artisan === artisanId, 'Nhật ký lô không thể thay đổi.');
  return batch;
}

function ownMilestone(key) {
  const [token, id, index] = key.split('/');
  const batch = ownBatch(token);
  const item = batch.milestones.find(step => step.id === Number(id));
  check(item, 'Không tìm thấy mốc.');
  return {batch, item, index: Number(index)};
}

function milestoneDetails(data) {
  const name = field(data, 'name');
  const date = field(data, 'date');
  const note = field(data, 'note');
  check(name && /^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(date) && Number.isFinite(Date.parse(date + '+07:00')) && note, 'Nhập công đoạn, thời điểm và mô tả.');
  return {name, date, note};
}

function journalAudit(action, label, batch, item, imageCount = 0) {
  audit(label + ' · ' + batch.token, {action, batchToken: batch.token, milestoneId: item.id, imageCount});
}

function field(data, key) {
  return String(data.get(key) || '').trim();
}

const forms = {
  'enroll-workshop'(data) {
    const name = field(data, 'name');
    const email = field(data, 'email').toLowerCase();
    const story = field(data, 'story');
    check(role === 'admin' && name && story && email.includes('@'), 'Cần tên xưởng, giới thiệu và email đại diện.');
    check(!db.artisans.some(row => row.email === email), 'Email đã có trong hồ sơ xưởng.');
    db.artisans.push({id: next(db.artisans), name, email, story, status:'PENDING', visits:false});
    audit('Tiếp nhận hồ sơ ' + name);
    return 'Đã tạo hồ sơ xưởng chờ duyệt.';
  },
  'reject-workshop'(data) {
    const row = artisan(data.get('artisan'));
    const reason = field(data, 'reason');
    check(role === 'admin' && row && row.status !== 'ACTIVE' && reason, 'Chọn hồ sơ cần từ chối và nhập lý do.');
    row.status = 'REJECTED';
    row.reviewReason = reason;
    audit('Từ chối hồ sơ ' + row.name + ' · ' + reason);
    message('artisan', 'Hồ sơ bị từ chối · ' + reason, row.id);
    return 'Đã lưu lý do và gửi thông báo.';
  },
  'edit-product'(data, id, images = []) {
    const row = product(id);
    const name = field(data, 'name');
    const description = field(data, 'description');
    const price = Number(data.get('price'));
    const category = field(data, 'category');
    check(role === 'artisan' && active(artisanId) && row?.artisan === artisanId, 'Chỉ xưởng sở hữu có thể sửa sản phẩm.');
    check(name && description && Number.isSafeInteger(price) && price > 0 && categories.some(([key]) => key === category), 'Thông tin sản phẩm chưa hợp lệ.');
    Object.assign(row, {name, description, price, category, material: field(data, 'material'), dimensions: field(data, 'dimensions')});
    if (images.length) row.images = images;
    audit('Sửa sản phẩm ' + row.name);
    return 'Đã lưu chi tiết sản phẩm.';
  },
  'workshop-media'(data, id, images = []) {
    const row = artisan(artisanId);
    const lat = field(data, 'lat');
    const lng = field(data, 'lng');
    check(role === 'artisan' && active(artisanId), 'Chỉ xưởng đang hoạt động có thể sửa hồ sơ.');
    check((!lat && !lng) || (lat && lng && Math.abs(Number(lat)) <= 90 && Math.abs(Number(lng)) <= 180), 'Nhập cặp tọa độ hợp lệ.');
    Object.assign(row, {address: field(data, 'address'), lat: lat ? Number(lat) : null, lng: lng ? Number(lng) : null, experience: field(data, 'experience')});
    if (images.length) row.images = images;
    audit('Cập nhật hình ảnh và địa điểm · ' + row.name);
    return 'Đã lưu hồ sơ xưởng.';
  },
  'edit-news'(data, id) {
    const row = db.news[Number(id)];
    const title = field(data, 'title');
    const body = field(data, 'body');
    check(role === 'admin' && row && title && body, 'Cần tiêu đề và nội dung tin.');
    Object.assign(row, {title, body});
    audit('Sửa tin ' + title);
    return 'Đã lưu nội dung tin.';
  },
  'reopen-rfq'(data, id) {
    const rfq = db.requests.find(row => row.id === Number(id));
    const deadline = field(data, 'deadline');
    check(['customer', 'admin'].includes(role) && rfq?.status === 'EXPIRED', 'Chỉ có thể mở lại yêu cầu đã hết hạn.');
    check(Date.parse(deadline + '+07:00') > Date.now() && deadline.slice(0, 10) <= rfq.delivery, 'Hạn mới phải ở tương lai và trước hoặc cùng ngày giao.');
    rfq.deadline = deadline;
    rfq.status = 'SENT_TO_ARTISANS';
    rfq.responses = {};
    rfq.quotes.forEach(quote => { quote.status = 'EXPIRED'; });
    rfq.targets.filter(active).forEach(owner => message('artisan', 'Yêu cầu báo giá mở lại · ' + rfq.name, owner));
    audit('Mở lại yêu cầu ' + rfq.name);
    return 'Đã mở lại yêu cầu báo giá.';
  },
  'add-rfq-target'(data, id) {
    const rfq = db.requests.find(row => row.id === Number(id));
    const owner = Number(data.get('artisan'));
    check(role === 'admin' && rfq && openRequest(rfq) && beforeDeadline(rfq) && active(owner) && !rfq.targets.includes(owner), 'Không thể bổ sung xưởng này.');
    rfq.targets.push(owner);
    message('artisan', 'Yêu cầu báo giá mới · ' + rfq.name, owner);
    audit('Bổ sung ' + artisan(owner).name + ' vào yêu cầu ' + rfq.name);
    return 'Đã bổ sung xưởng.';
  },
  request(data) {
    check(role === 'customer', 'Hãy chọn vai trò khách hàng.');
    const rfq = {id: next(db.requests), name: field(data, 'name'), description: field(data, 'description'), quantity: Number(data.get('quantity')), unit: field(data, 'unit'), category: field(data, 'category'), delivery: field(data, 'delivery'), deadline: field(data, 'deadline'), budget: Number(data.get('budget')) || 0, status: 'DRAFT_REQUEST', targets: [], quotes: []};
    check(rfq.name && rfq.description && rfq.unit && beforeDeadline(rfq) && rfq.delivery >= rfq.deadline.slice(0, 10), 'Nhập đầy đủ đặc tả và chọn hạn giao phù hợp với hạn nhận báo giá.');
    db.requests.push(rfq);
    requestId = rfq.id;
    return 'Đã lưu bản nháp.';
  },
  send(data, id) {
    const rfq = db.requests.find(row => row.id === Number(id));
    const targets = [...new Set(data.getAll('target').map(Number))];
    check(role === 'customer' && rfq?.status === 'DRAFT_REQUEST' && beforeDeadline(rfq), 'Yêu cầu không thể gửi hoặc đã quá hạn.');
    check(targets.length && targets.every(active), 'Chọn ít nhất một xưởng đang hoạt động.');
    rfq.targets = targets;
    rfq.status = 'SENT_TO_ARTISANS';
    targets.forEach(target => message('artisan', 'Yêu cầu báo giá mới · ' + rfq.name, target));
    audit('Gửi yêu cầu ' + rfq.name);
    return 'Đã gửi yêu cầu cho các xưởng đã chọn.';
  },
  quote(data, id) {
    const rfq = db.requests.find(row => row.id === Number(id));
    check(role === 'artisan' && active(artisanId) && rfq?.targets.includes(artisanId) && openRequest(rfq) && beforeDeadline(rfq), 'Xưởng không thể chào giá cho yêu cầu này.');
    check(participation(rfq, artisanId) !== 'DECLINED', 'Hãy nhận yêu cầu trước khi gửi giá.');
    const deadline = field(data, 'valid') || rfq.deadline;
    const valid = deadline ? deadline + '+07:00' : '';
    check(!valid || Date.now() < Date.parse(valid), 'Hiệu lực báo giá phải ở tương lai.');
    const quote = {artisan: artisanId, price: Number(data.get('price')), days: Number(data.get('days')), note: field(data, 'note'), valid, status: 'SUBMITTED'};
    const index = rfq.quotes.findIndex(item => item.artisan === artisanId);
    if (index === -1) rfq.quotes.push(quote);
    else rfq.quotes[index] = quote;
    (rfq.responses ??= {})[artisanId] = 'ACCEPTED';
    rfq.status = 'ARTISANS_BIDDING';
    message('customer', artisan(artisanId).name + ' đã chào giá cho ' + rfq.name);
    return 'Đã gửi chào giá.';
  },
  allocate(data, id) {
    const order = findOrder(id);
    check(role === 'admin' && order?.status === 'ACCEPTED', 'Đơn đã khóa phân bổ.');
    const rfq = db.requests.find(row => row.id === order.request);
    const owner = Number(data.get('artisan'));
    const quantity = Number(data.get('quantity'));
    const price = Number(data.get('price'));
    const other = order.allocations.filter(part => part.artisan !== owner && part.status !== 'CANCELLED').reduce((sum, part) => sum + part.quantity, 0);
    check(active(owner) && Number.isSafeInteger(quantity) && quantity > 0 && price > 0, 'Chọn xưởng đang hoạt động và nhập số lượng, đơn giá hợp lệ.');
    check(other + quantity <= rfq.quantity, 'Tổng phân bổ vượt quá ' + number(rfq.quantity) + ' ' + rfq.unit + '.');
    order.allocations = order.allocations.filter(part => part.artisan !== owner);
    order.allocations.push({artisan: owner, quantity, price, status: 'ASSIGNED'});
    message('artisan', 'Được phân bổ ' + number(quantity) + ' ' + rfq.unit + ' trong đơn ' + id, owner);
    audit('Lưu phân bổ đơn ' + id + ' cho ' + artisan(owner).name + ' · ' + number(quantity));
    return 'Đã lưu phân bổ.';
  },
  profile(data) {
    check(role === 'artisan' && active(artisanId), 'Không thể cập nhật hồ sơ.');
    const start = field(data, 'start');
    const end = field(data, 'end');
    check((!start && !end) || (start && end && start < end), 'Giờ đóng cửa phải sau giờ mở cửa.');
    Object.assign(artisan(artisanId), {story: field(data, 'story'), certificate: field(data, 'certificate'), start, end, visits: data.has('visits')});
    return 'Đã lưu hồ sơ xưởng.';
  },
  product(data) {
    check(role === 'artisan' && active(artisanId), 'Không thể tạo sản phẩm.');
    const category = field(data, 'category');
    db.products.push({id: next(db.products), artisan: artisanId, name: field(data, 'name'), description: field(data, 'description'), category, price: Number(data.get('price')), style: category === 'Gia dụng' ? 'cup' : 'vase', status: 'DRAFT'});
    return 'Đã tạo sản phẩm nháp.';
  },
  batch(data) {
    const row = product(data.get('product'));
    const token = field(data, 'token').toUpperCase();
    check(role === 'artisan' && active(artisanId) && row?.artisan === artisanId, 'Không thể tạo lô cho sản phẩm này.');
    check(/^[A-Z0-9_-]{1,30}$/.test(token) && !db.batches.some(batch => batch.token === token), 'Mã lô không hợp lệ hoặc đã tồn tại.');
    db.batches.push({token, product: row.id, quantity: Number(data.get('quantity')), status: 'IN_PROGRESS', story: field(data, 'story'), milestones: []});
    audit('Tạo lô ' + token);
    return 'Đã tạo lô sản xuất.';
  },
  milestone(data, id, images = []) {
    const batch = ownBatch(id);
    const item = {id: batch.nextMilestoneId ?? next(batch.milestones), ...milestoneDetails(data), images: []};
    check(images.length <= 8 && images.every(safeImage), 'Mỗi mốc chỉ nhận tối đa 8 ảnh hợp lệ.');
    batch.nextMilestoneId = item.id + 1;
    item.images.push(...images);
    batch.milestones.push(item);
    journalAudit('MILESTONE_CREATED', 'Thêm mốc ' + item.name, batch, item, images.length);
    return 'Đã thêm mốc sản xuất.';
  },
  'edit-milestone'(data, key, images = []) {
    const {batch, item} = ownMilestone(key);
    const details = milestoneDetails(data);
    check(item.images.length + images.length <= 8 && images.every(safeImage), 'Mỗi mốc chỉ nhận tối đa 8 ảnh hợp lệ.');
    const edited = Object.keys(details).some(prop => item[prop] !== details[prop]);
    Object.assign(item, details);
    item.images.push(...images);
    if (edited) journalAudit('MILESTONE_UPDATED', 'Sửa mốc ' + item.name, batch, item);
    if (images.length) journalAudit('MILESTONE_IMAGES_ADDED', 'Thêm ảnh cho mốc ' + item.name, batch, item, images.length);
    return edited || images.length ? 'Đã lưu thay đổi.' : 'Mốc chưa có thay đổi.';
  },
  news(data) {
    check(role === 'admin', 'Chỉ Ban quản lý được tạo tin.');
    const date = new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Ho_Chi_Minh'}).format();
    db.news.unshift({title: field(data, 'title'), body: field(data, 'body'), date, status: 'DRAFT'});
    return 'Đã lưu tin nháp.';
  }
};

app.addEventListener('click', event => {
  const element = event.target.closest('button[data-action]');
  if (!element) return;
  const {action, id} = element.dataset;
  if (action === 'pin') {
    mapId = Number(id);
    render();
    app.querySelector('button[data-id="' + mapId + '"]').focus();
  } else if (action === 'page') {
    query.page = Number(id);
    render();
  } else if (action === 'copy') {
    if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(() => notify('Đã sao chép liên kết.'), () => notify('Sao chép địa chỉ từ thanh trình duyệt.'));
    else notify('Sao chép địa chỉ từ thanh trình duyệt.');
  } else if (action === 'publish-trace') {
    void publishTrace(id);
  } else {
    change(() => handlers[action](id));
  }
});

app.addEventListener('change', event => {
  const {name, value} = event.target;
  if (name === 'role') role = value;
  else if (name === 'artisan-id') artisanId = Number(value);
  else if (name === 'request-id') requestId = Number(value);
  else return;
  render();
  app.querySelector('select[name="' + name + '"]').focus();
});

app.addEventListener('submit', async event => {
  event.preventDefault();
  const {form: name, id} = event.target.dataset;
  const data = new FormData(event.target);
  if (name === 'search') {
    query = {text: field(data, 'text'), category: field(data, 'category'), artisan: field(data, 'artisan'), page: 1};
    render();
    return;
  }
  let images = [];
  const files = data.getAll('image').filter(file => file.size);
  if (files.length) {
    if (files.length > 8 || files.some(file => file.size > 5000000 || !['image/png','image/jpeg','image/webp'].includes(file.type))) {
      notify('Chọn tối đa 8 ảnh PNG, JPEG hoặc WebP, mỗi ảnh tối đa 5 MB.');
      return;
    }
    try {
      for (const file of files) images.push(await prepareEvidence(file));
    } catch {
      notify('Không thể đọc ảnh đã chọn.');
      return;
    }
  }
  change(() => forms[name](data, id, images));
});

async function prepareEvidence(file) {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/webp', 0.76);
  } finally {
    bitmap.close();
  }
}

window.addEventListener('hashchange', () => {
  render();
  window.scrollTo(0, 0);
});
window.addEventListener('storage', event => {
  if (event.key === storageKey) {
    db = load();
    render();
  }
});
const scannedToken = new URLSearchParams(location.search).get('trace');
if (settleDeadlines()) {
  try { localStorage.setItem(storageKey, JSON.stringify(db)); } catch {}
}
if (scannedToken && /^https?:$/.test(location.protocol)) void openScannedTrace(scannedToken);
else render();
if (typeof window.setInterval === 'function') window.setInterval(refreshDeadlines, 5 * 60 * 1000);

