/* =======================================
   BuilderOffice - 사진 업로드 위젯

   현장에서 찍은 사진을 일보·문서에 붙인다.
   여러 화면에서 재사용할 수 있도록 위젯 형태로 만든다.

   설계 포인트
   - 폰 사진은 보통 4~8MB다. 그대로 올리면 5GB 무료 용량이 금방 차고
     현장 LTE에서 업로드가 하염없이 걸린다. → 올리기 전에 자동 압축한다.
   - 촬영 방향(EXIF)이 반영되지 않으면 사진이 눕는다. → 회전 보정한다.
   - 통신이 끊기는 현장이 많다. → 실패한 사진은 남겨두고 다시 시도할 수 있게 한다.
   ======================================= */

var Photos = {
    // 긴 변 기준. 1600px면 일보 인쇄·화면 확인에 충분하고 용량은 1/10로 준다.
    MAX_EDGE: 1600,
    JPEG_QUALITY: 0.8,
    MAX_FILES: 20,

    // widgetId → { files: [...], siteName, onChange }
    _widgets: {},
    _seq: 0,

    /**
     * 업로드 위젯 HTML을 만든다.
     * @param {Object} o {id, label, folder}
     */
    render: function (o) {
        o = o || {};
        var id = o.id || ('ph' + (++this._seq));
        if (!this._widgets[id]) {
            this._widgets[id] = { files: [], folder: o.folder || 'photos' };
        }

        return '<div class="photo-widget" id="pw_' + id + '">' +
            '<input type="file" id="pwInput_' + id + '" accept="image/*" multiple ' +
            'style="display:none;" onchange="Photos.onPick(\'' + id + '\', this)">' +
            '<div class="photo-actions">' +
            '<button type="button" class="btn btn-secondary photo-add-btn" ' +
            'onclick="Photos.pick(\'' + id + '\')">📷 사진 추가</button>' +
            '<span class="photo-count" id="pwCount_' + id + '">0장</span>' +
            '</div>' +
            '<div class="photo-grid" id="pwGrid_' + id + '"></div>' +
            '</div>';
    },

    pick: function (id) {
        var el = document.getElementById('pwInput_' + id);
        if (el) el.click();
    },

    onPick: async function (id, input) {
        var w = this._widgets[id];
        if (!w) return;

        var files = Array.prototype.slice.call(input.files || []);
        input.value = '';   // 같은 파일을 다시 골라도 이벤트가 뜨도록 비운다
        if (!files.length) return;

        var room = this.MAX_FILES - w.files.length;
        if (room <= 0) {
            App.showToast('사진은 최대 ' + this.MAX_FILES + '장까지 첨부할 수 있습니다.', 'error');
            return;
        }
        if (files.length > room) {
            App.showToast(room + '장만 추가됩니다. (최대 ' + this.MAX_FILES + '장)', 'info');
            files = files.slice(0, room);
        }

        for (var i = 0; i < files.length; i++) {
            var f = files[i];
            if (!/^image\//.test(f.type)) {
                App.showToast('이미지 파일만 첨부할 수 있습니다: ' + f.name, 'error');
                continue;
            }
            var item = {
                key: 'f' + (++this._seq),
                name: f.name,
                originalSize: f.size,
                status: 'pending',   // pending | uploading | done | error
                progress: 0,
                thumb: '',
                url: '',
                error: ''
            };
            w.files.push(item);
            this._renderGrid(id);

            // 압축 → 업로드를 순차로 진행 (동시에 하면 현장 회선이 막힌다)
            this._process(id, item, f);
        }
    },

    _process: async function (id, item, file) {
        var w = this._widgets[id];
        try {
            item.status = 'uploading';
            this._renderGrid(id);

            var compressed = await this.compress(file);
            item.size = compressed.blob.size;
            item.thumb = compressed.thumbUrl;
            this._renderGrid(id);

            var path = w.folder + '/' + Date.now() + '_' + Math.random().toString(36).slice(2, 7) + '.jpg';
            item.url = await DB.uploadFile(compressed.blob, path);
            item.path = path;
            item.status = 'done';
        } catch (e) {
            item.status = 'error';
            item.error = (e && e.message) ? e.message : '업로드 실패';
            console.warn('[Photos] 업로드 실패', e);
        }
        this._renderGrid(id);
    },

    /**
     * 이미지를 줄이고 JPEG로 다시 인코딩한다.
     * createImageBitmap이 EXIF 회전까지 처리해 준다(미지원 브라우저는 폴백).
     */
    compress: async function (file) {
        var bitmap = null;
        try {
            bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
        } catch (e) {
            bitmap = await this._loadViaImg(file);
        }

        var w = bitmap.width, h = bitmap.height;
        var scale = Math.min(1, this.MAX_EDGE / Math.max(w, h));
        var tw = Math.max(1, Math.round(w * scale));
        var th = Math.max(1, Math.round(h * scale));

        var canvas = document.createElement('canvas');
        canvas.width = tw;
        canvas.height = th;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0, tw, th);
        if (bitmap.close) bitmap.close();

        var blob = await new Promise(function (res) {
            canvas.toBlob(function (b) { res(b); }, 'image/jpeg', Photos.JPEG_QUALITY);
        });
        if (!blob) throw new Error('이미지를 처리하지 못했습니다.');

        // 목록에 보여줄 작은 미리보기
        var tcv = document.createElement('canvas');
        var ts = Math.min(1, 240 / Math.max(tw, th));
        tcv.width = Math.max(1, Math.round(tw * ts));
        tcv.height = Math.max(1, Math.round(th * ts));
        tcv.getContext('2d').drawImage(canvas, 0, 0, tcv.width, tcv.height);

        return { blob: blob, thumbUrl: tcv.toDataURL('image/jpeg', 0.7), width: tw, height: th };
    },

    // createImageBitmap 미지원 환경(구형 iOS 등) 폴백
    _loadViaImg: function (file) {
        return new Promise(function (res, rej) {
            var url = URL.createObjectURL(file);
            var img = new Image();
            img.onload = function () { URL.revokeObjectURL(url); res(img); };
            img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('이미지를 읽지 못했습니다.')); };
            img.src = url;
        });
    },

    _renderGrid: function (id) {
        var w = this._widgets[id];
        var grid = document.getElementById('pwGrid_' + id);
        var cnt = document.getElementById('pwCount_' + id);
        if (!grid || !w) return;

        var done = 0, html = '';
        for (var i = 0; i < w.files.length; i++) {
            var f = w.files[i];
            if (f.status === 'done') done++;

            var overlay = '';
            if (f.status === 'uploading' || f.status === 'pending') {
                overlay = '<div class="photo-overlay"><div class="photo-spinner"></div></div>';
            } else if (f.status === 'error') {
                overlay = '<div class="photo-overlay photo-overlay-error" title="' +
                    Store.escapeHtml(f.error) + '">⚠️<button type="button" class="photo-retry" ' +
                    'onclick="Photos.retry(\'' + id + '\',\'' + f.key + '\')">다시</button></div>';
            }

            var bg = f.thumb
                ? '<img src="' + f.thumb + '" alt="현장 사진">'
                : '<div class="photo-empty">📷</div>';

            html += '<div class="photo-item">' + bg + overlay +
                '<button type="button" class="photo-del" title="삭제" ' +
                'onclick="Photos.remove(\'' + id + '\',\'' + f.key + '\')">✕</button>' +
                (f.size ? '<span class="photo-size">' + Math.round(f.size / 1024) + 'KB</span>' : '') +
                '</div>';
        }

        grid.innerHTML = html;
        if (cnt) {
            var pending = w.files.length - done;
            cnt.textContent = w.files.length + '장' + (pending > 0 ? ' (' + pending + '장 처리 중)' : '');
        }
    },

    remove: function (id, key) {
        var w = this._widgets[id];
        if (!w) return;
        w.files = w.files.filter(function (f) { return f.key !== key; });
        this._renderGrid(id);
    },

    retry: function (id, key) {
        App.showToast('사진을 다시 선택해주세요.', 'info');
        this.remove(id, key);
    },

    /** 업로드가 끝난 사진 목록 (저장할 때 사용) */
    getUploaded: function (id) {
        var w = this._widgets[id];
        if (!w) return [];
        return w.files.filter(function (f) { return f.status === 'done'; })
            .map(function (f) {
                return { url: f.url, path: f.path, name: f.name, size: f.size };
            });
    },

    /** 아직 처리 중인 사진이 있는지 (제출 전 확인용) */
    isBusy: function (id) {
        var w = this._widgets[id];
        if (!w) return false;
        return w.files.some(function (f) { return f.status === 'pending' || f.status === 'uploading'; });
    },

    hasFailed: function (id) {
        var w = this._widgets[id];
        if (!w) return false;
        return w.files.some(function (f) { return f.status === 'error'; });
    },

    reset: function (id) {
        if (this._widgets[id]) this._widgets[id].files = [];
        this._renderGrid(id);
    },

    /** 저장된 사진들을 보기 전용으로 표시 */
    renderGallery: function (photos) {
        if (!photos || !photos.length) return '';
        var html = '<div class="photo-grid photo-grid-view">';
        for (var i = 0; i < photos.length; i++) {
            var p = photos[i];
            html += '<div class="photo-item" onclick="Photos.showFull(\'' +
                encodeURIComponent(p.url) + '\')">' +
                '<img src="' + Store.escapeHtml(p.url) + '" alt="현장 사진" loading="lazy">' +
                '</div>';
        }
        return html + '</div>';
    },

    showFull: function (encodedUrl) {
        var url = decodeURIComponent(encodedUrl);
        App.showModal(
            '<div class="modal-header"><h3>📷 현장 사진</h3>' +
            '<button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
            '<div class="modal-body" style="text-align:center;padding:8px;">' +
            '<img src="' + Store.escapeHtml(url) + '" alt="현장 사진" ' +
            'style="max-width:100%;max-height:70vh;border-radius:10px;">' +
            '</div>' +
            '<div class="modal-footer">' +
            '<a class="btn btn-secondary" href="' + Store.escapeHtml(url) + '" target="_blank" rel="noopener">원본 열기</a>' +
            '<button class="btn btn-primary" onclick="App.closeModal()">닫기</button></div>'
        );
    }
};
