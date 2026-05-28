/**
 * OnboardingTour analytics testleri.
 *
 * Sprint 11 #6 — Activation funnel ölçümü:
 *   - tour_started + ilk step_viewed mount'ta tetiklenir.
 *   - Sonraki adımlar step_viewed.
 *   - Tamamlama veya atlamada tek event.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// react-i18next minimal mock — t() key'i identity döndürür.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k }),
}));

// Analytics modülünü mockla — eventleri yakalıyoruz.
const trackSpy = vi.fn();
vi.mock('@/lib/analytics', () => ({
  track: (...args) => trackSpy(...args),
}));

// Button shim
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }) => <button {...props}>{children}</button>,
}));

import OnboardingTour from '../OnboardingTour';

const STEPS = [
  { title: 'a.title', description: 'a.desc', illustration: <div>1</div> },
  { title: 'b.title', description: 'b.desc', illustration: <div>2</div> },
  { title: 'c.title', description: 'c.desc', illustration: <div>3</div> },
];

beforeEach(() => {
  trackSpy.mockClear();
});

describe('OnboardingTour analytics', () => {
  it('mount → tour_started + step_viewed(0) tetikler', () => {
    render(<OnboardingTour steps={STEPS} tourKey="ob_test" persona="candidate" />);

    expect(trackSpy).toHaveBeenCalledWith('onboarding_tour_started', {
      tourKey: 'ob_test',
      persona: 'candidate',
      stepCount: 3,
    });
    expect(trackSpy).toHaveBeenCalledWith('onboarding_tour_step_viewed', {
      tourKey: 'ob_test',
      persona: 'candidate',
      stepIndex: 0,
    });
  });

  it('İleri → her adımda step_viewed çağırır', () => {
    render(<OnboardingTour steps={STEPS} tourKey="ob_test" />);
    trackSpy.mockClear();

    fireEvent.click(screen.getByRole('button', { name: /onboarding:ui.next/i }));
    expect(trackSpy).toHaveBeenCalledWith('onboarding_tour_step_viewed', {
      tourKey: 'ob_test',
      persona: null,
      stepIndex: 1,
    });

    fireEvent.click(screen.getByRole('button', { name: /onboarding:ui.next/i }));
    expect(trackSpy).toHaveBeenCalledWith('onboarding_tour_step_viewed', {
      tourKey: 'ob_test',
      persona: null,
      stepIndex: 2,
    });
  });

  it('Son adımda "Hadi Başlayalım" → tour_completed + onComplete', () => {
    const onComplete = vi.fn();
    render(
      <OnboardingTour steps={STEPS} tourKey="ob_test" onComplete={onComplete} />,
    );
    // 2 ileri tıkla → son adıma git
    fireEvent.click(screen.getByRole('button', { name: /onboarding:ui.next/i }));
    fireEvent.click(screen.getByRole('button', { name: /onboarding:ui.next/i }));
    trackSpy.mockClear();

    fireEvent.click(screen.getByRole('button', { name: /onboarding:ui.letsStart/i }));
    expect(trackSpy).toHaveBeenCalledWith('onboarding_tour_completed', {
      tourKey: 'ob_test',
      persona: null,
      totalSteps: 3,
    });
    expect(onComplete).toHaveBeenCalled();
  });

  it('Atla → tour_skipped + onSkip + atStep doğru', () => {
    const onSkip = vi.fn();
    render(
      <OnboardingTour
        steps={STEPS}
        tourKey="ob_test"
        persona="educator"
        onSkip={onSkip}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /onboarding:ui.next/i })); // step 1
    trackSpy.mockClear();

    // 2 element "skip" eşleşir: X butonu (aria-label skipAria) + Atla butonu (text skip).
    // Footer'daki Atla butonunu tam isim ile seç.
    fireEvent.click(screen.getByRole('button', { name: 'onboarding:ui.skip' }));
    expect(trackSpy).toHaveBeenCalledWith('onboarding_tour_skipped', {
      tourKey: 'ob_test',
      persona: 'educator',
      atStep: 1,
      totalSteps: 3,
    });
    expect(onSkip).toHaveBeenCalled();
  });

  it('steps boş ise hiç event çıkmaz', () => {
    render(<OnboardingTour steps={[]} tourKey="empty" />);
    expect(trackSpy).not.toHaveBeenCalled();
  });
});
