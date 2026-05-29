import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { contracts } from '@/api/dalClient';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle } from 'lucide-react';

/**
 * ContractAcceptDialog — Sprint 14 sözleşme onayı (Sprint 16 popup akışı).
 *
 * Kayıt formundaki "Kayıt Ol" tıklanınca açılır. Aktif sözleşmeleri (rol'e göre
 * CANDIDATE/EDUCATOR + PRIVACY) AÇILDIĞINDA (on-demand) çeker, içeriği popup'ta
 * markdown olarak gösterir, iki ayrı onay checkbox'ı ile kabul aldıktan sonra
 * `onConfirm({ termsId, privacyId })` ile gerçek kaydı tetikler.
 *
 * Önceki tasarımda fetch mount'ta tek sefer yapılıyordu; başarısız olursa form
 * tam sayfa yenilenene kadar kilitleniyordu. Bu akışta fetch her açılışta
 * yeniden yapılır — hata olursa kullanıcı pencereyi kapatıp tekrar açar, kalıcı
 * dead-end yoktur (ayrı bir "tekrar dene" butonu yok).
 *
 * @param {boolean}  open
 * @param {(v:boolean)=>void} onOpenChange
 * @param {boolean}  isEducator       - true → EDUCATOR sözleşmesi, false → CANDIDATE
 * @param {boolean}  submitting       - kayıt isteği sürüyor (confirm butonu spinner)
 * @param {(ids:{termsId:string,privacyId:string})=>void} onConfirm
 */
export function ContractAcceptDialog({ open, onOpenChange, isEducator, submitting, onConfirm }) {
  const { t } = useTranslation(['auth']);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [terms, setTerms] = useState(null);
  const [privacy, setPrivacy] = useState(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  // Her açılışta sözleşmeleri yeniden çek (on-demand). Kapatınca state sıfırlanır.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    setAcceptedTerms(false);
    setAcceptedPrivacy(false);
    const termsType = isEducator ? 'EDUCATOR' : 'CANDIDATE';
    Promise.all([
      contracts.getActive(termsType).catch(() => null),
      contracts.getActive('PRIVACY').catch(() => null),
    ]).then(([tc, pc]) => {
      if (cancelled) return;
      if (!tc || !pc) {
        setLoadError(true);
      } else {
        setTerms(tc);
        setPrivacy(pc);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, isEducator]);

  const canConfirm =
    acceptedTerms && acceptedPrivacy && Boolean(terms?.id) && Boolean(privacy?.id) && !submitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t('auth:register.contractDialog.title', { defaultValue: 'Sözleşmeleri Onayla' })}
          </DialogTitle>
          <DialogDescription>
            {t('auth:register.contractDialog.desc', {
              defaultValue: 'Kaydı tamamlamak için aşağıdaki metinleri okuyup onaylayın.',
            })}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="py-12 flex justify-center" role="status" aria-live="polite">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" aria-hidden="true" />
            <span className="sr-only">
              {t('auth:register.contractDialog.loading', { defaultValue: 'Yükleniyor…' })}
            </span>
          </div>
        )}

        {!loading && loadError && (
          <div
            role="alert"
            className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700 flex gap-2"
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <span>
              {t('auth:register.contractsLoadFailed', {
                defaultValue:
                  'Sözleşme metinleri şu an yüklenemedi. Lütfen pencereyi kapatıp tekrar açın.',
              })}
            </span>
          </div>
        )}

        {!loading && !loadError && terms && privacy && (
          <div className="space-y-4">
            <ContractSection contract={terms} checked={acceptedTerms} onCheck={setAcceptedTerms} />
            <ContractSection
              contract={privacy}
              checked={acceptedPrivacy}
              onCheck={setAcceptedPrivacy}
            />
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {t('auth:register.contractDialog.cancel', { defaultValue: 'Vazgeç' })}
          </Button>
          <Button
            type="button"
            onClick={() => onConfirm({ termsId: terms.id, privacyId: privacy.id })}
            disabled={!canConfirm}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {submitting
              ? t('auth:register.submitting', { defaultValue: 'Kaydediliyor...' })
              : t('auth:register.contractDialog.confirm', {
                  defaultValue: 'Onayla ve Kaydı Tamamla',
                })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Tek sözleşme bölümü: başlık + kaydırılabilir markdown içerik + onay checkbox'ı. */
function ContractSection({ contract, checked, onCheck }) {
  const { t } = useTranslation(['auth']);
  return (
    <div className="rounded-lg border border-slate-200">
      <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 font-medium text-sm text-slate-800">
        {contract.title}
        {contract.version != null && (
          <span className="ml-2 text-xs font-normal text-slate-400">v{contract.version}</span>
        )}
      </div>
      <div className="max-h-44 overflow-y-auto p-4 prose prose-sm prose-slate max-w-none">
        <ReactMarkdown>{contract.content || ''}</ReactMarkdown>
      </div>
      <label className="flex items-center gap-2 px-4 py-3 border-t border-slate-200 cursor-pointer text-sm text-slate-700">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheck(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          aria-required="true"
        />
        {t('auth:register.contractDialog.accept', { defaultValue: 'Okudum, kabul ediyorum.' })}
      </label>
    </div>
  );
}
