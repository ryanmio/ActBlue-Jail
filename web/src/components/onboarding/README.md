# Onboarding Components

Non-intrusive onboarding flow with toast notification, multi-step modal, and comprehensive welcome page.

## Components

### `useOnboardingState.ts`
Hook that manages localStorage state for onboarding interactions.

**Returns:**
- `shouldShowToast`: Boolean indicating if toast should be shown (no prior interaction)
- `markDismissed()`: Records that user dismissed the toast
- `markClicked()`: Records that user clicked the toast CTA
- `hasEverInteracted`: Boolean indicating any prior interaction

**Storage:**
- Key: `abj_onboarding_state_v1`
- Format: `{ status: "dismissed" | "clicked", ts: number }`

### `OnboardingToast.tsx`
Small, non-intrusive CTA toast in top-right corner.

**Props:**
- `onClick`: Handler for when user clicks "See how it works"
- `onDismiss`: Handler for when user dismisses the toast

**Behavior:**
- Fades in 500ms after mount
- Positioned top-right on desktop, adjusts for mobile
- Dismissible with X button
- Only shows if user hasn't interacted before

### `OnboardingModal.tsx`
Accessible multi-step dialog explaining the product.

**Props:**
- `open`: Boolean controlling visibility
- `onOpenChange`: Handler for open state changes
- `videoUrl?`: Optional video URL (renders video player when provided)

**Steps:**
1. What is AB Jail?
2. How to use it
3. What happens next
4. Privacy notice

**Features:**
- Radix UI Dialog (accessible, focus trap, ESC to close)
- Step indicators with direct navigation
- "Back" / "Next" / "Got it" navigation
- Link to full welcome page
- Resets to step 1 when closed

## Usage

### In page component:

```tsx
import { useOnboardingState } from "@/components/onboarding/useOnboardingState";
import { OnboardingToast } from "@/components/onboarding/OnboardingToast";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";

export default function Page() {
  const { shouldShowToast, markDismissed, markClicked } = useOnboardingState();
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Support ?onboarding=open
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams?.get("onboarding") === "open") {
      setIsOnboardingOpen(true);
    }
  }, [searchParams]);

  return (
    <>
      {shouldShowToast && (
        <OnboardingToast
          onClick={() => {
            markClicked();
            setIsOnboardingOpen(true);
          }}
          onDismiss={markDismissed}
        />
      )}

      <OnboardingModal
        open={isOnboardingOpen}
        onOpenChange={setIsOnboardingOpen}
      />

      {/* Rest of page */}
    </>
  );
}
```

### In menu:

```tsx
<DropdownMenuItem
  onSelect={(e) => {
    e.preventDefault();
    setIsOnboardingOpen(true);
  }}
>
  How it works
</DropdownMenuItem>
```

## Deep linking

Navigate to `/?onboarding=open` to open the modal directly.

## Future: Video support

To add a video to the modal, pass the `videoUrl` prop:

```tsx
<OnboardingModal
  open={isOnboardingOpen}
  onOpenChange={setIsOnboardingOpen}
  videoUrl="https://example.com/video.mp4"
/>
```

The video will appear on the first step with native controls.

## Accessibility

- Radix Dialog provides ARIA attributes, focus management, and keyboard navigation
- Step indicators are buttons with aria-labels
- Current step has `aria-current="step"`
- Reduced motion: Radix animations respect `prefers-reduced-motion`
- Close on ESC key
- Focus trap inside modal

## Mobile behavior

- Toast positioned to avoid header collision
- Modal scrollable on small screens
- Touch-friendly button sizes
- Responsive text sizes

