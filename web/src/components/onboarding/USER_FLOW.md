# Onboarding User Flow

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User Lands on Homepage                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
           ┌─────────────────────────────┐
           │ Check localStorage for      │
           │ abj_onboarding_state_v1     │
           └──────────┬──────────────────┘
                      │
            ┌─────────┴─────────┐
            │                   │
      Found │                   │ Not Found
            │                   │
            ▼                   ▼
  ┌──────────────────┐  ┌──────────────────┐
  │  No toast shown  │  │ Toast appears    │
  │                  │  │ (after 500ms)    │
  └──────────────────┘  └────────┬─────────┘
                                 │
                    ┌────────────┼────────────┐
                    │                         │
              User clicks                User dismisses
                    │                         │
                    ▼                         ▼
         ┌──────────────────────┐  ┌──────────────────────┐
         │ Modal opens          │  │ Save "dismissed"     │
         │ Save "clicked"       │  │ to localStorage      │
         │ to localStorage      │  │ Toast disappears     │
         └──────────────────────┘  └──────────────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │ Step 1: What is AB   │
         │       Jail?          │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │ Step 2: How to use   │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │ Step 3: What happens │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │ Step 4: Privacy      │
         └──────────┬───────────┘
                    │
         ┌──────────┴──────────┐
         │                     │
    Click "Got it"      Click "Full guide"
         │                     │
         ▼                     ▼
  ┌──────────────┐      ┌──────────────┐
  │ Close modal  │      │ Navigate to  │
  │              │      │  /welcome    │
  └──────────────┘      └──────────────┘
```

## Alternative Entry Points

### Via Menu (Any Time)
```
User clicks hamburger menu
         │
         ▼
Clicks "How it works"
         │
         ▼
Modal opens
(Does NOT record to localStorage)
```

### Via Deep Link
```
User visits /?onboarding=open
         │
         ▼
Modal opens automatically
(Does NOT modify localStorage)
```

### Direct to Guide
```
User visits /welcome
         │
         ▼
Full guide page loads
(Static page, no JS required)
```

## State Transitions

### localStorage States
```
┌─────────────────────────────────────────────────────────┐
│                    No localStorage                       │
│  (First visit or cleared data)                          │
│  → Show toast                                            │
└─────────────────────┬───────────────────────────────────┘
                      │
           ┌──────────┴──────────┐
           │                     │
    User clicks toast     User dismisses toast
           │                     │
           ▼                     ▼
┌──────────────────┐  ┌──────────────────────────┐
│ State: "clicked" │  │   State: "dismissed"     │
│ → Hide toast     │  │   → Hide toast           │
│ → Show modal     │  │                          │
└──────────────────┘  └──────────────────────────┘

Both states persist across sessions
Toast will never reappear (until localStorage cleared)
```

## Component Interactions

```
┌──────────────────────────────────────────────────────────┐
│                        Home Page                          │
│                                                           │
│  ┌────────────────────┐                                  │
│  │ useOnboardingState │                                  │
│  │ Hook               │                                  │
│  └─────────┬──────────┘                                  │
│            │                                              │
│  ┌─────────┴─────────┐                                   │
│  │ shouldShowToast?  │                                   │
│  └─────────┬─────────┘                                   │
│            │                                              │
│       Yes  │  No                                          │
│  ┌─────────┴─────────┐                                   │
│  │                   │                                   │
│  ▼                   ▼                                   │
│ ┌──────────────┐   (Nothing)                            │
│ │OnboardingToast│                                        │
│ └──────┬───────┘                                         │
│        │                                                 │
│        │ onClick/onDismiss                               │
│        │                                                 │
│        ▼                                                 │
│ ┌──────────────────┐                                    │
│ │ OnboardingModal  │◄──── Menu "How it works"          │
│ │ (Radix Dialog)   │                                    │
│ └──────────────────┘                                    │
│        │                                                 │
│        │ Link to                                         │
│        ▼                                                 │
│   /welcome page                                          │
└──────────────────────────────────────────────────────────┘
```

## User Personas

### Persona 1: Confused First-Timer (Target)
```
Lands on page → Sees toast → Clicks it
       ↓
Modal opens with clear explanation
       ↓
Reads 4 steps, understands the tool
       ↓
Clicks "Got it" → Ready to upload
```

### Persona 2: Dismissive User
```
Lands on page → Sees toast → Dismisses it
       ↓
Starts using tool without guidance
       ↓
If confused later, clicks "How it works" in menu
```

### Persona 3: Detail-Oriented User
```
Lands on page → Sees toast → Clicks it
       ↓
Modal opens
       ↓
Clicks "Full guide" → /welcome page
       ↓
Reads comprehensive documentation
```

### Persona 4: Returning User
```
Lands on page → No toast (already clicked/dismissed)
       ↓
Uses tool confidently
       ↓
If needed, "How it works" always available in menu
```

## Timing

```
Page Load
    │
    ├─ 0ms:     Component mounts
    ├─ 0ms:     Check localStorage
    ├─ 500ms:   Toast fades in (if needed)
    │
User Interaction
    │
    ├─ Click:   Modal opens instantly
    ├─ Step:    Smooth transition (200ms)
    ├─ Close:   Modal fades out (200ms)
```

## Mobile vs Desktop

### Desktop
- Toast: Top-right, fixed position
- Modal: Centered, max-width 600px
- Menu: Dropdown from hamburger

### Mobile
- Toast: Top-right, respects safe area
- Modal: Full-width, scrollable
- Menu: Fullscreen overlay
- Touch targets: 44x44px minimum

## Edge Cases Handled

1. **No JavaScript**: Menu links to `/welcome` page
2. **No localStorage**: Toast shows every time
3. **Slow network**: Suspense fallback prevents hydration errors
4. **Multiple tabs**: Each tab tracks independently
5. **Mid-session param**: `?onboarding=open` works anytime
6. **Keyboard navigation**: Full tab/ESC support
7. **Screen readers**: ARIA labels and live regions

## Success Metrics (Optional to Track)

1. **Engagement Rate**: % of users who click toast
2. **Dismissal Rate**: % of users who dismiss toast
3. **Modal Completion**: % who reach "Got it"
4. **Guide Clicks**: % who visit `/welcome`
5. **Upload Rate**: % who upload after seeing onboarding

## Future Enhancements

1. **Video Tutorial**: Add `videoUrl` prop to modal
2. **Interactive Tour**: Highlight upload area, menu, etc.
3. **Progress Tracking**: Show completion badges
4. **A/B Testing**: Test different copy variations
5. **Analytics**: Track engagement metrics
6. **Tooltips**: Add contextual help throughout app
7. **Multi-language**: Internationalize content

