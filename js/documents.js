/* =======================================
   BuilderOffice - Document Management Module
   문서 관리 (세금계산서, 거래명세서, 사진, 도면 등)
   ======================================= */

var Documents = {
    typeFilter: 'all',

    render: function () {
        var docs = Store.getDocuments();
        var esc = Store.escapeHtml;
        var filtered = this.typeFilter === 'all' ? docs : docs.filter(function (d) { return d.type === Documents.typeFilter; });

        var typeOpts = '';
        for (var t = 0; t < Store.DOCUMENT_TYPES.length; t++) {
            var sel = this.typeFilter === Store.DOCUMENT_TYPES[t] ? ' selected' : '';
            typeOpts += '<option value="' + esc(Store.DOCUMENT_TYPES[t]) + '"' + sel + '>' + esc(Store.DOCUMENT_TYPES[t]) + '</option>';
        }

        var rows = '';
        if (filtered.length > 0) {
            for (var i = 0; i < filtered.length; i++) {
                var d = filtered[i];
                var typeIcon = { '세금계산서': '🧾', '거래명세서': '📃', '영수증': '🧾', '계약서': '📝', '도면': '📐', '안전서류': '🦺', '사진': '📷', '공문': '📨', '기타': '📄' };

                rows += '<tr>' +
                    '<td><span style="font-size:1.2em;">' + (typeIcon[d.type] || '📄') + '</span></td>' +
                    '<td style="font-weight:600;color:var(--text-primary);">' + esc(d.name) + '</td>' +
                    '<td><span class="badge badge-blue">' + esc(d.type) + '</span></td>' +
                    '<td>' + esc(d.siteName || '-') + '</td>' +
                    '<td>' + esc(d.uploadDate || '-') + '</td>' +
                    '<td>' + esc(d.uploader || '-') + '</td>' +
                    '<td>' + esc(d.fileSize || '-') + '</td>' +
                    '<td>' + esc(d.linkedTo || '-') + '</td>' +
                    '<td><div class="action-btns">' +
                    '<button class="action-btn edit" onclick="Documents.showDetail(\'' + d.id + '\')" title="상세">👁️</button>' +
                    '<button class="action-btn delete" onclick="Documents.confirmDelete(\'' + d.id + '\')" title="삭제">🗑️</button>' +
                    '</div></td>' +
                    '</tr>';
            }
        } else {
            rows = '<tr><td colspan="9"><div class="empty-state"><div class="empty-icon">📂</div><p>등록된 문서가 없습니다</p>' +
                '<button class="btn btn-primary" onclick="Documents.showUploadModal()">문서 업로드하기</button></div></td></tr>';
        }

        return '<div class="stat-cards">' +
            '<div class="stat-card"><div class="stat-icon blue">📂</div><div class="stat-info"><div class="stat-label">총 문서</div><div class="stat-value">' + docs.length + '건</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon green">🧾</div><div class="stat-info"><div class="stat-label">세금계산서</div><div class="stat-value">' + docs.filter(function (d) { return d.type === '세금계산서'; }).length + '건</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon orange">🦺</div><div class="stat-info"><div class="stat-label">안전서류</div><div class="stat-value">' + docs.filter(function (d) { return d.type === '안전서류'; }).length + '건</div></div></div>' +
            '</div>' +
            '<div class="card">' +
            '<div class="toolbar">' +
            '<div class="toolbar-left">' +
            '<select class="filter-select" onchange="Documents.setTypeFilter(this.value)"><option value="all">전체 유형</option>' + typeOpts + '</select>' +
            '<span style="color:var(--text-muted);font-size:13px;">' + filtered.length + '건</span>' +
            '</div>' +
            '<button class="btn btn-primary" onclick="Documents.showUploadModal()">📤 문서 업로드</button>' +
            '</div>' +
            '<div class="table-container"><table><thead><tr><th></th><th>문서명</th><th>유형</th><th>현장</th><th>업로드일</th><th>등록자</th><th>용량</th><th>연결</th><th>작업</th></tr></thead>' +
            '<tbody>' + rows + '</tbody></table></div>' +
            '</div>';
    },

    setTypeFilter: function (val) {
        this.typeFilter = val;
        App.refreshPage();
    },

    showUploadModal: function () {
        var sites = Store.getSites();
        var esc = Store.escapeHtml;

        var siteOpts = '<option value="">선택하세요</option>';
        for (var i = 0; i < sites.length; i++) {
            siteOpts += '<option value="' + esc(sites[i].name) + '">' + esc(sites[i].name) + '</option>';
        }

        var typeOpts = '';
        for (var t = 0; t < Store.DOCUMENT_TYPES.length; t++) {
            typeOpts += '<option value="' + esc(Store.DOCUMENT_TYPES[t]) + '">' + esc(Store.DOCUMENT_TYPES[t]) + '</option>';
        }

        var html = '<div class="modal-header"><h3>📤 문서 업로드</h3><button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
            '<div class="modal-body">' +
            '<div class="form-group"><label>문서명 *</label><input type="text" class="form-control" id="docName" placeholder="예: 2026년 3월 철근 세금계산서"></div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>문서 유형</label><select class="form-control" id="docType">' + typeOpts + '</select></div>' +
            '<div class="form-group"><label>관련 현장</label><select class="form-control" id="docSite">' + siteOpts + '</select></div>' +
            '</div>' +
            '<div class="form-group"><label>파일 첨부</label>' +
            '<div class="wi-photo-area"><div class="wi-photo-placeholder" onclick="App.showToast(\'파일 업로드는 서버 연동 후 활성화됩니다.\', \'info\')"><span>📎</span><p>파일 선택 (프로토타입)</p></div></div>' +
            '</div>' +
            '<div class="form-group"><label>연결 항목</label><input type="text" class="form-control" id="docLinked" placeholder="예: 자재비 - 철근 D16"></div>' +
            '<div class="form-group"><label>비고</label><input type="text" class="form-control" id="docNote" placeholder="메모"></div>' +
            '</div>' +
            '<div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">취소</button><button class="btn btn-primary" onclick="Documents.saveDocument()">업로드</button></div>';
        App.showModal(html);
    },

    saveDocument: function () {
        var name = document.getElementById('docName').value.trim();
        if (!name) { App.showToast('문서명을 입력해주세요.', 'error'); return; }

        Store.addDocument({
            name: name,
            type: document.getElementById('docType').value,
            siteName: document.getElementById('docSite').value,
            uploadDate: Store.getToday(),
            uploader: (App.currentUser && App.currentUser.name) || '사용자',
            fileSize: '-',
            linkedTo: document.getElementById('docLinked').value.trim(),
            note: document.getElementById('docNote').value.trim()
        });

        App.closeModal();
        App.refreshPage();
        App.showToast('문서가 등록되었습니다.', 'success');
    },

    showDetail: function (id) {
        var d = Store.getDocuments().find(function (x) { return x.id === id; });
        if (!d) return;
        var esc = Store.escapeHtml;
        var row = function (label, val) {
            return '<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-color);"><span style="color:var(--text-muted);">' + label + '</span><span style="color:var(--text-primary);font-weight:600;">' + val + '</span></div>';
        };

        var html = '<div class="modal-header"><h3>📄 문서 상세</h3><button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
            '<div class="modal-body"><div style="display:grid;gap:0;">' +
            row('문서명', esc(d.name)) +
            row('유형', '<span class="badge badge-blue">' + esc(d.type) + '</span>') +
            row('현장', esc(d.siteName || '-')) +
            row('업로드일', esc(d.uploadDate || '-')) +
            row('등록자', esc(d.uploader || '-')) +
            row('용량', esc(d.fileSize || '-')) +
            row('연결 항목', esc(d.linkedTo || '-')) +
            row('비고', esc(d.note || '-')) +
            '</div></div>' +
            '<div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">닫기</button></div>';
        App.showModal(html);
    },

    confirmDelete: function (id) {
        if (confirm('이 문서를 삭제하시겠습니까?')) {
            Store.deleteDocument(id);
            App.refreshPage();
            App.showToast('문서가 삭제되었습니다.', 'info');
        }
    }
};
