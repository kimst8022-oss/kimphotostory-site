/* 김작가 사진이야기 — 글 목록 필터 + 조회수/좋아요 */
(function () {
  'use strict';

  /* ---------- 1. 카테고리 필터 ---------- */
  function initFilter() {
    var chips = document.querySelectorAll('.chip');
    var grid = document.getElementById('postGrid');
    if (!chips.length || !grid) return;
    var cards = grid.querySelectorAll('.post-card');
    var empty = document.getElementById('emptyNote');

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');
        var key = chip.dataset.filter;
        var shown = 0;
        cards.forEach(function (card) {
          var cats = (card.dataset.cat || '').split(/\s+/);
          var ok = key === 'all' || cats.indexOf(key) !== -1;
          card.style.display = ok ? '' : 'none';
          if (ok) shown++;
        });
        if (empty) empty.hidden = shown > 0;
      });
    });

    // 주소에 ?cat=family 로 들어오면 그 분류로 시작
    var q = new URLSearchParams(location.search).get('cat');
    if (q) {
      var target = document.querySelector('.chip[data-filter="' + q + '"]');
      if (target) target.click();
    }
  }

  /* ---------- 2. 조회수 / 좋아요 ---------- */
  var API = 'https://abacus.jasoncameron.dev';
  var NS = 'kimphotostory';

  function get(key) {
    return fetch(API + '/get/' + NS + '/' + key, { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) { return d.value || 0; })
      .catch(function () { return null; });
  }
  function hit(key) {
    return fetch(API + '/hit/' + NS + '/' + key, { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) { return d.value || 0; })
      .catch(function () { return null; });
  }

  function initPostStats() {
    var wrap = document.querySelector('.post-meta');
    if (!wrap) return;
    var slug = wrap.dataset.post;
    if (!slug) return;

    var viewEl = wrap.querySelector('.pm-views b');
    var likeBtn = wrap.querySelector('.pm-like');
    var likeEl = likeBtn ? likeBtn.querySelector('b') : null;

    // 조회수: 같은 브라우저에서 한 번만 증가
    var seenKey = 'kp-seen-' + slug;
    var firstVisit = !localStorage.getItem(seenKey);
    (firstVisit ? hit('v-' + slug) : get('v-' + slug)).then(function (v) {
      if (v === null) return;
      if (firstVisit) localStorage.setItem(seenKey, '1');
      if (viewEl) viewEl.textContent = v.toLocaleString('ko-KR');
    });

    // 좋아요
    if (!likeBtn) return;
    var likedKey = 'kp-liked-' + slug;
    get('l-' + slug).then(function (v) {
      if (v !== null && likeEl) likeEl.textContent = v.toLocaleString('ko-KR');
      if (localStorage.getItem(likedKey)) likeBtn.classList.add('on');
    });
    likeBtn.addEventListener('click', function () {
      if (localStorage.getItem(likedKey)) {
        likeBtn.classList.remove('on');
        localStorage.removeItem(likedKey);
        // 취소는 감소 API 가 없으므로 화면 숫자만 되돌린다
        get('l-' + slug).then(function (v) {
          if (v !== null && likeEl) likeEl.textContent = (v - 1 > 0 ? v - 1 : 0).toLocaleString('ko-KR');
        });
        return;
      }
      likeBtn.classList.add('on');
      localStorage.setItem(likedKey, '1');
      hit('l-' + slug).then(function (v) {
        if (v !== null && likeEl) likeEl.textContent = v.toLocaleString('ko-KR');
      });
    });
  }

  /* ---------- 3. 공유 ---------- */
  function initShare() {
    var btn = document.querySelector('.pm-share');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var data = { title: document.title, url: location.href };
      if (navigator.share) {
        navigator.share(data).catch(function () {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(location.href).then(function () {
          var old = btn.textContent;
          btn.textContent = '주소 복사됨';
          setTimeout(function () { btn.textContent = old; }, 1600);
        });
      }
    });
  }



  /* ---------- 5. 메뉴 활성 표시 + 브랜드 균형 ---------- */
  function initNavActive() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.main-nav a'));
    if (!links.length) return;
    var ids = links.map(function (a) {
      var h = a.getAttribute('href') || '';
      var i = h.indexOf('#');
      return i >= 0 ? h.slice(i + 1) : '';
    });
    function setActive(id) {
      links.forEach(function (a, k) {
        a.classList.toggle('active', ids[k] === id);
      });
    }
    var hasSections = ids.some(function (id) { return id && document.getElementById(id); });

    if (!hasSections) {
      links.forEach(function (a, k) {
        a.addEventListener('click', function () {
          links.forEach(function (b) { b.classList.remove('active'); });
          a.classList.add('active');
        });
      });
      return;
    }

    if ('IntersectionObserver' in window) {
      var sections = ids.map(function (id) { return document.getElementById(id); }).filter(Boolean);
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) setActive(en.target.id);
        });
      }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
      sections.forEach(function (sec) { obs.observe(sec); });
    }
    links.forEach(function (a, k) {
      a.addEventListener('click', function () { setActive(ids[k]); });
    });
  }

  // 2026-10-22: block 요소의 box 폭이 아니라 '글자 폭'을 재서 두 줄의 폭을 맞춘다.
  function brandTextWidth(el) {
    var r = document.createRange();
    r.selectNodeContents(el);
    var w = r.getBoundingClientRect().width;
    if (!w) {
      var c = document.createElement('span');
      c.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap';
      c.textContent = el.textContent;
      el.appendChild(c); w = c.getBoundingClientRect().width; el.removeChild(c);
    }
    return w;
  }

  function balanceBrand() {
    var copy = document.querySelector('.brand .brand-copy');
    var sub = document.querySelector('.brand .brand-sub');
    if (!copy || !sub) return;
    sub.style.letterSpacing = '0px';
    var wCopy = brandTextWidth(copy);
    var wSub = brandTextWidth(sub);
    var chars = (sub.textContent || '').replace(/\s/g, '').length;
    if (wCopy > 0 && wSub > 0 && chars > 1) {
      // 두 줄의 폭을 같게 — 과하게 벌어지지 않도록 상한을 둔다
      var delta = (wCopy - wSub) / chars;
      sub.style.letterSpacing = Math.max(Math.min(delta, 2), -0.5).toFixed(2) + 'px';
    }
  }


  /* ---------- 6. 예약 폼 → 문자 발송 ---------- */
  function initReserve() {
    var form = document.getElementById('reserveForm');
    if (!form) return;
    var preview = document.getElementById('rfPreview');
    var PHONE = { '의령점': '0555743706', '창원점': '0552878022' };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var kinds = Array.prototype.slice.call(form.querySelectorAll('input[name=kind]:checked')).map(function (i) { return i.value; });
      var name = (form.querySelector('[name=name]').value || '').trim();
      var phone = (form.querySelector('[name=phone]').value || '').trim();
      var people = (form.querySelector('[name=people]').value || '').trim();
      var date = (form.querySelector('[name=date]').value || '').trim();
      var branch = (form.querySelector('input[name=branch]:checked') || {}).value || '의령점';
      var memo = (form.querySelector('[name=memo]').value || '').trim();

      if (!name || !phone) { alert('이름과 연락처를 적어 주세요.'); return; }
      if (!kinds.length) { alert('촬영 종류를 하나 이상 골라 주세요.'); return; }

      var lines = [
        '[예약 문의] ' + branch,
        '촬영: ' + kinds.join(', '),
        '이름: ' + name,
        '연락처: ' + phone
      ];
      if (people) lines.push('인원수: ' + people + '명');
      if (date) lines.push('희망 날짜: ' + date.replace(/-/g, '.'));
      if (memo) lines.push('요청: ' + memo);

      var text = lines.join('\n');
      preview.hidden = false;
      preview.textContent = text;
      var a = document.createElement('a');
      a.className = 'rf-send';
      a.href = 'sms:' + PHONE[branch] + '?&body=' + encodeURIComponent(text);
      a.textContent = '문자 앱으로 보내기 →';
      preview.appendChild(a);
      preview.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }


  /* ---------- 7. 상단 공유 버튼 ---------- */
  function toast(msg) {
    var el = document.querySelector('.share-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'share-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('on'); }, 1900);
  }
  function initTopShare() {
    var btn = document.querySelector('.share-top');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var data = { title: document.title, url: location.href };
      if (navigator.share) {
        navigator.share(data).catch(function () {});
        return;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(location.href).then(function () {
          toast('링크가 복사되었습니다');
        }).catch(function () { toast(location.href); });
      } else {
        toast(location.href);
      }
    });
  }

  function boot() {
    initFilter();
    initPostStats();
    initShare();
    initNavActive();
    balanceBrand();
    initReserve();
    initTopShare();
    window.addEventListener('resize', balanceBrand);
  }
  if (document.readyState !== 'loading') boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();

(function(){
  var modal=document.getElementById('bizModal');
  if(!modal) return;
  function open(e){ if(e) e.preventDefault(); modal.hidden=false; document.body.classList.add('biz-open'); }
  function close(){ modal.hidden=true; document.body.classList.remove('biz-open'); }
  document.addEventListener('click',function(e){
    if(e.target.closest('[data-biz-open]')) open(e);
    else if(e.target.closest('[data-biz-close]')) close();
  });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape') close(); });
})();
