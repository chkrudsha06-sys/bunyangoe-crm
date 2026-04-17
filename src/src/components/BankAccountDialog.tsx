"use client";

import { useState, useEffect, useRef } from "react";
import { X, Search, Check } from "lucide-react";
import { BANK_LIST, GROUP_LABELS, searchBanks, findBankByCode, findBankByName, Bank } from "@/lib/banks";
import { supabase } from "@/lib/supabase";

interface BankAccountDialogProps {
  open: boolean;
  onClose: () => void;
  contactId: number;
  initial: {
    bank_holder: string | null;
    bank_code: string | null;
    bank_name: string | null;
    bank_account: string | null;
  };
  onSaved: () => void;
}

export default function BankAccountDialog({
  open, onClose, contactId, initial, onSaved,
}: BankAccountDialogProps) {
  const [holder, setHolder]       = useState("");
  const [bankCode, setBankCode]   = useState("");
  const [bankName, setBankName]   = useState("");
  const [account, setAccount]     = useState("");
  const [query, setQuery]         = useState("");
  const [showList, setShowList]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // 팝업 열릴 때 기존값 로드
  useEffect(() => {
    if (open) {
      setHolder(initial.bank_holder || "");
      setBankCode(initial.bank_code || "");
      setBankName(initial.bank_name || "");
      setAccount(initial.bank_account || "");
      setQuery(initial.bank_name || "");
      setShowList(false);
    }
  }, [open, initial]);

  // 바깥 클릭 시 리스트 닫기
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(e.target as Node)) {
        setShowList(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (!open) return null;

  const filtered = searchBanks(query);

  // 그룹별로 묶기
  const grouped: Record<string, Bank[]> = {};
  filtered.forEach(b => {
    if (!grouped[b.group]) grouped[b.group] = [];
    grouped[b.group].push(b);
  });

  const pickBank = (b: Bank) => {
    setBankCode(b.code);
    setBankName(b.name);
    setQuery(b.name);
    setShowList(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await supabase.from("contacts").update({
      bank_holder: holder || null,
      bank_code:   bankCode || null,
      bank_name:   bankName || null,
      bank_account: account || null,
    }).eq("id", contactId);
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-800">계좌정보 입력</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-400">
            <X size={18}/>
          </button>
        </div>

        {/* 본문 */}
        <div className="p-5 space-y-4">
          {/* 예금주 */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">예금주</label>
            <input value={holder} onChange={e=>setHolder(e.target.value)}
              placeholder="예: 홍길동"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"/>
          </div>

          {/* 은행코드 + 은행명 */}
          <div className="grid grid-cols-5 gap-2">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">은행코드</label>
              <input value={bankCode} readOnly
                placeholder="자동"
                className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed text-center font-mono"/>
            </div>
            <div className="col-span-3 relative" ref={listRef}>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">은행명</label>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input
                  value={query}
                  onChange={e => {
                    setQuery(e.target.value);
                    setShowList(true);
                    // 입력 중에는 아직 확정 X (리스트에서 선택 시 확정)
                    const match = findBankByName(e.target.value);
                    if (match) { setBankCode(match.code); setBankName(match.name); }
                    else { setBankCode(""); setBankName(""); }
                  }}
                  onFocus={() => setShowList(true)}
                  placeholder="은행명 검색"
                  className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                />
              </div>

              {/* 은행 리스트 드롭다운 */}
              {showList && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl">
                  {filtered.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-slate-400">검색 결과 없음</div>
                  ) : (
                    (["major","local","foreign","saving","securities"] as Bank["group"][]).map(g => {
                      const list = grouped[g];
                      if (!list || list.length === 0) return null;
                      return (
                        <div key={g}>
                          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 bg-slate-50 sticky top-0">
                            {GROUP_LABELS[g]}
                          </div>
                          {list.map(b => (
                            <button key={b.code}
                              onClick={() => pickBank(b)}
                              className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-blue-50 transition-colors">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-mono text-slate-400 w-8">{b.code}</span>
                                <span className="text-slate-700">{b.name}</span>
                              </div>
                              {bankCode === b.code && <Check size={14} className="text-blue-500"/>}
                            </button>
                          ))}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 계좌번호 */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">계좌번호</label>
            <input value={account} onChange={e=>setAccount(e.target.value)}
              placeholder="예: 123-456-789012"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 font-mono"/>
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 bg-slate-50 border-t border-slate-100">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100">
            취소
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? "저장 중..." : "완료"}
          </button>
        </div>
      </div>
    </div>
  );
}
