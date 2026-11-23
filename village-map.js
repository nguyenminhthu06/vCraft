let closeVillageMap = () => {};
let mapboxLibrary;
function loadMapbox() {
  if (mapboxLibrary) return mapboxLibrary;
  const base = 'https://api.mapbox.com/mapbox-gl-js/v3.35.0/mapbox-gl.';
  mapboxLibrary = new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = base + 'css';
    const script = document.createElement('script');
    script.src = base + 'js';
    script.async = true;
    const ready = element => new Promise((ok, fail) => {
      element.onload = ok;
      element.onerror = fail;
      document.head.append(element);
    });
    Promise.all([ready(css), ready(script)]).then(() => resolve(window.mapboxgl), () => {
      css.remove();
      script.remove();
      mapboxLibrary = undefined;
      reject(new Error('Không tải được Mapbox GL JS.'));
    });
  });
  return mapboxLibrary;
}

function village() {
  return '<section class="village-hub"><header class="heading"><div><p class="eyebrow">Khám phá Bát Tràng</p><h1>Bản đồ xưởng gốm</h1></div>' +
    '<a href="#catalog" class="button outline">Xem sản phẩm</a></header>' +
    '<div class="geo-frame"><div id="geo-view" tabindex="0" role="region" aria-label="Bản đồ đường phố Bát Tràng. Dùng phím mũi tên để di chuyển, dấu cộng và trừ để thu phóng.">' +
    '<img class="geo-local" src="bat-trang-streets.svg" alt="" draggable="false"><div class="geo-pins"></div></div><div class="mapbox-surface" aria-label="Bản đồ Mapbox các xưởng gốm"></div>' +
    '<input class="map-search" id="geo-search" type="search" aria-label="Tìm xưởng trên bản đồ" placeholder="Tìm tên xưởng hoặc địa chỉ…" autocomplete="off">' +
    '<div class="geo-controls"><button type="button" data-geo="plus" aria-label="Phóng to">+</button><button type="button" data-geo="minus" aria-label="Thu nhỏ">−</button>' +
    '<button type="button" data-geo="fit">Xem tất cả ghim</button></div><div class="geo-popup" hidden></div><div class="geo-error" hidden role="status"><span class="geo-source"></span> <button type="button" data-geo="retry">Thử tải lại</button></div>' +
    '<a class="geo-credit" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a></div>' +
    '<section class="panel directory"><div class="heading"><h2>Danh sách xưởng</h2><span id="geo-count" aria-live="polite"></span></div>' +
    '<div class="fields"><label>Trạng thái tham quan<select id="geo-filter">' +
    ['Tất cả','Đang mở cửa','Đã đóng cửa','Không đón khách','Chưa cập nhật giờ'].map(value => '<option>' + value + '</option>').join('') +
    '</select></label></div><div class="directory-scroll"><table><thead><tr><th>Xưởng gốm</th><th>Địa chỉ</th><th>Trạng thái</th><th>Giờ đón khách</th><th>Khám phá</th></tr></thead><tbody id="geo-list"></tbody></table></div></section></section>';
}

function mapPoint(row) {
  const latitude = Math.max(-85.0511, Math.min(85.0511, row.lat)) * Math.PI / 180;
  return {x: (row.lng + 180) / 360, y: (1 - Math.asinh(Math.tan(latitude)) / Math.PI) / 2};
}

function mapLocated(row) {
  return Number.isFinite(row.lat) && Math.abs(row.lat) <= 85.0511 && Number.isFinite(row.lng) && Math.abs(row.lng) <= 180;
}

const foldMapText = text => String(text).toLocaleLowerCase('vi').normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd');
const mapAddress = row => row.address || (row.id <= 2 ? 'Làng gốm Bát Tràng, Hà Nội' : 'Chưa cập nhật');

function workshopPin(row) {
  const words = row.name.trim().split(/\s+/);
  const shortName = words.slice(-2).map(word => Array.from(word)[0]).join('').toLocaleUpperCase('vi');
  const palette = ['#236658', '#754c97', '#24577e', '#9b482e', '#885329'];
  return '<span class="workshop-badge" style="--pin-color:' + palette[(row.id - 1) % palette.length] + '">' + esc(shortName) + '</span>';
}

function mountVillageMap(requestedId) {
  const hub = document.querySelector('.village-hub');
  if (!hub?.querySelector) return;
  const view = hub.querySelector('#geo-view');
  const local = hub.querySelector('.geo-local');
  const northwest = mapPoint({lat:20.998,lng:105.895});
  const southeast = mapPoint({lat:20.957,lng:105.941});
  const pins = hub.querySelector('.geo-pins');
  const popup = hub.querySelector('.geo-popup');
  const list = hub.querySelector('#geo-list');
  const search = hub.querySelector('#geo-search');
  const filter = hub.querySelector('#geo-filter');
  const error = hub.querySelector('.geo-error');
  const stock = db.artisans.filter(row => active(row.id));
  let rows = stock;
  let selected;
  let zoom = 16;
  let center = mapPoint({lat:20.976, lng:105.919});
  let dragging;
  let frame = 0;
  let disposed = false;
  const token = (typeof window !== 'undefined' && window.vCraftMaps?.mapboxToken || '').trim();
  const canLoad = token.startsWith('pk.');
  const mapHost = hub.querySelector('.mapbox-surface');
  let onlineMap, sdk, pending, attempt = 0;
  let sourceStatus = canLoad ? 'Đang tải Mapbox.' : 'Chưa cấu hình public token Mapbox.';
  const markers = new Map();
  function syncMarkers() {
    const ids = new Set();
    for (const row of rows.filter(mapLocated)) {
      ids.add(row.id);
      if (markers.has(row.id)) continue;
      const badge = document.createElement('button');
      badge.type = 'button';
      badge.className = 'mapbox-workshop-pin';
      badge.title = row.name + ' · ' + opening(row);
      badge.setAttribute('aria-label', badge.title);
      badge.innerHTML = workshopPin(row);
      badge.onclick = () => choose(row.id, false);
      const marker = new sdk.Marker({element:badge, anchor:'bottom'}).setLngLat([row.lng,row.lat]).addTo(onlineMap);
      markers.set(row.id, marker);
    }
    for (const [id, marker] of markers) {
      if (!ids.has(id)) { marker.remove(); markers.delete(id); }
    }
  }
  function onlineFocus(row) {
    onlineMap.jumpTo({center:[row.lng,row.lat], zoom:16});
  }
  function removeOnlineMap() {
    for (const marker of markers.values()) marker.remove();
    markers.clear();
    const map = onlineMap || pending;
    onlineMap = pending = null;
    if (map) map.remove();
    hub.classList.remove('uses-mapbox');
    hub.classList.remove('loads-mapbox');
  }
  async function startMapbox() {
    if (!canLoad || pending || onlineMap) return;
    const generation = ++attempt;
    const isCurrent = () => !disposed && generation === attempt;
    const fallback = () => {
      if (!isCurrent()) return;
      ++attempt;
      clearTimeout(timeout);
      removeOnlineMap();
      sourceStatus = 'Mapbox chưa tải được. Kiểm tra kết nối và quyền của token.';
      drawResults();
    };
    const timeout = setTimeout(fallback, 20000);
    try {
      sdk = await loadMapbox();
      if (!isCurrent()) return;
      hub.classList.add('loads-mapbox');
      const map = new sdk.Map({container:mapHost, accessToken:token, style:'mapbox://styles/mapbox/streets-v12',
        center:[105.919,20.976], zoom:15, minZoom:2, maxZoom:19});
      pending = map;
      map.on('error', fallback);
      map.once('load', () => {
        if (!isCurrent()) return;
        clearTimeout(timeout);
        onlineMap = map;
        pending = null;
        hub.classList.add('uses-mapbox');
        map.resize();
        syncMarkers();
        if (selected) onlineFocus(selected);
        else fit();
      });
    } catch { fallback(); }
  }

  function fit() {
    if (onlineMap) {
      const locations = rows.filter(mapLocated);
      if (locations.length === 1) onlineFocus(locations[0]);
      if (locations.length > 1) {
        const bounds = new sdk.LngLatBounds();
        locations.forEach(({lat,lng}) => bounds.extend([lng,lat]));
        onlineMap.fitBounds(bounds, {padding:56, maxZoom:17, duration:0});
      }
      return;
    }
    const points = rows.filter(mapLocated).map(mapPoint);
    if (!points.length) { paint(); return; }
    const xs = points.map(point => point.x), ys = points.map(point => point.y);
    const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
    center = {x:(left + right) / 2, y:(top + bottom) / 2};
    const scale = Math.min(Math.max(80, view.clientWidth - 140) / Math.max(right - left, 1e-10),
      Math.max(80, view.clientHeight - 120) / Math.max(bottom - top, 1e-10));
    zoom = Math.max(2, Math.min(17, Math.floor(Math.log2(scale / 256))));
    paint();
  }

  function paint() {
    if (disposed || onlineMap) return;
    const n = 2 ** zoom, size = 256 * n;
    const w = view.clientWidth, h = view.clientHeight;
    const ox = center.x * size - w / 2, oy = center.y * size - h / 2;
    local.style.left = (northwest.x * size - ox) + 'px';
    local.style.top = (northwest.y * size - oy) + 'px';
    local.style.width = ((southeast.x - northwest.x) * size) + 'px';
    local.style.height = ((southeast.y - northwest.y) * size) + 'px';
    const inside = center.x >= northwest.x && center.x <= southeast.x && center.y >= northwest.y && center.y <= southeast.y;
    hub.querySelector('.geo-source').textContent = sourceStatus + (inside ? ' Đang dùng nền Bát Tràng lưu sẵn.' : ' Ngoài vùng nền lưu sẵn.');
    hub.querySelector('[data-geo="retry"]').hidden = !canLoad;
    error.hidden = false;
    pins.querySelectorAll('button').forEach(pin => {
      pin.style.left = (Number(pin.dataset.x) * size - ox) + 'px';
      pin.style.top = (Number(pin.dataset.y) * size - oy) + 'px';
    });
    hub.querySelector('[data-geo="plus"]').disabled = zoom >= 19;
    hub.querySelector('[data-geo="minus"]').disabled = zoom <= 2;
  }

  function redraw() {
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; paint(); });
  }

  function drawResults() {
    hub.querySelector('#geo-count').textContent = rows.length + ' xưởng';
    list.innerHTML = rows.map(row => '<tr' + (selected?.id === row.id ? ' class="selected"' : '') + '><th scope="row">' + esc(row.name) +
      '</th><td>' + esc(mapAddress(row)) + '</td><td>' + tagged(opening(row)) + '</td><td>' + esc(row.visits && row.start && row.end ? row.start + ' – ' + row.end : '—') +
      '</td><td>' + (mapLocated(row) ? '<button type="button" class="outline" data-locate="' + row.id + '">Định vị</button> ' : '') +
      '<a href="#artisan/' + row.id + '">Hồ sơ xưởng</a></td></tr>').join('') || '<tr><td colspan="5">Không có xưởng phù hợp với bộ lọc.</td></tr>';
    pins.innerHTML = rows.filter(mapLocated).map(row => {
      const {x, y} = mapPoint(row);
      const label = row.name + ' · ' + opening(row);
      return '<button type="button" class="geo-pin' + (selected?.id === row.id ? ' chosen' : '') + '" data-locate="' + row.id +
        '" data-x="' + x + '" data-y="' + y + '" aria-label="' + esc(label) + '" title="' + esc(label) + '">' + workshopPin(row) + '</button>';
    }).join('');
    popup.hidden = !selected;
    if (selected) popup.innerHTML = '<button type="button" class="geo-close" aria-label="Đóng thông tin xưởng" data-geo="close">×</button><strong>' +
      esc(selected.name) + '</strong><p>' + esc(mapAddress(selected)) + '</p>' + tagged(opening(selected)) + ' <a href="#artisan/' + selected.id + '">Xem hồ sơ</a> · <a target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&amp;destination=' + encodeURIComponent(selected.lat + ',' + selected.lng) + '">Chỉ đường Google Maps</a>';
    if (onlineMap) syncMarkers();
    paint();
  }

  function choose(id, fromList) {
    selected = rows.find(row => row.id === Number(id) && mapLocated(row));
    if (!selected) return;
    center = mapPoint(selected);
    zoom = Math.max(zoom, 17);
    if (onlineMap) onlineFocus(selected);
    drawResults();
    if (fromList) (onlineMap ? mapHost : view).scrollIntoView({block:'center', behavior:'instant'});
    popup.querySelector('.geo-close').focus({preventScroll:true});
  }

  function applyFilter() {
    const term = foldMapText(search.value.trim());
    rows = stock.filter(row => foldMapText(row.name + ' ' + mapAddress(row)).includes(term) &&
      (filter.value === 'Tất cả' || opening(row) === filter.value));
    selected = null;
    drawResults();
    fit();
  }

  function move(dx, dy) {
    const size = 256 * 2 ** zoom;
    center = {x:Math.max(0, Math.min(1, center.x + dx / size)), y:Math.max(0, Math.min(1, center.y + dy / size))};
    redraw();
  }

  function changeZoom(delta) { if (onlineMap) { onlineMap.setZoom(onlineMap.getZoom() + delta); return; } zoom = Math.max(2, Math.min(19, zoom + delta)); paint(); }
  search.oninput = applyFilter;
  filter.onchange = applyFilter;
  hub.onclick = event => {
    const btn = event.target.closest('button');
    if (!btn) return;
    if (btn.dataset.geo === 'retry') void startMapbox();
    if (btn.dataset.locate) choose(btn.dataset.locate, list.contains(btn));
    if (btn.dataset.geo === 'plus') changeZoom(1);
    if (btn.dataset.geo === 'minus') changeZoom(-1);
    if (btn.dataset.geo === 'fit') { selected = null; drawResults(); fit(); }
    if (btn.dataset.geo === 'close') { selected = null; drawResults(); (onlineMap ? hub.querySelector('[data-geo="fit"]') : view).focus({preventScroll:true}); }
  };
  view.onpointerdown = event => {
    if (event.target.closest('button') || event.button !== 0 || dragging) return;
    dragging = {x:event.clientX, y:event.clientY, id:event.pointerId};
    view.setPointerCapture(event.pointerId);
  };
  view.onpointermove = event => {
    if (dragging?.id !== event.pointerId) return;
    move(dragging.x - event.clientX, dragging.y - event.clientY);
    dragging.x = event.clientX; dragging.y = event.clientY;
  };
  view.onpointerup = view.onpointercancel = view.onlostpointercapture = () => { dragging = null; };
  view.onkeydown = event => {
    if (event.target !== view) return;
    const shifts = {ArrowLeft:[-90,0], ArrowRight:[90,0], ArrowUp:[0,-90], ArrowDown:[0,90]};
    if (shifts[event.key]) { event.preventDefault(); move(...shifts[event.key]); }
    if (['+','=','-'].includes(event.key)) { event.preventDefault(); changeZoom(event.key === '-' ? -1 : 1); }
  };
  drawResults();
  fit();
  if (requestedId) choose(requestedId, false);
  const observer = new ResizeObserver(redraw);
  observer.observe(view);
  if (canLoad) void startMapbox();
  closeVillageMap = () => {
    disposed = true;
    if (pending || onlineMap) removeOnlineMap();
    observer.disconnect();
    cancelAnimationFrame(frame);
    closeVillageMap = () => {};
  };
}
