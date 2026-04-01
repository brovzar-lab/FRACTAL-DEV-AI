# Mobile Development

## React Native Architecture

**Project structure (Expo or bare RN):**
```
src/
  screens/         # Full screen views (mapped to routes)
  components/      # Reusable UI components
    ui/            # Primitives (Button, Input, Card)
    features/      # Domain components (ProjectCard, UserAvatar)
  navigation/      # React Navigation config, stacks, tabs
  hooks/           # Custom hooks
  services/        # API calls, business logic
  lib/             # Utilities, constants, types
  assets/          # Images, fonts, icons
```

**Navigation patterns:**
- Stack navigator for linear flows (auth, onboarding)
- Tab navigator for main app sections
- Drawer for secondary navigation
- Deep linking configured from day one (not retrofitted)

**State management for mobile:**
- Server state: TanStack Query (handles caching, refetch, offline)
- Local UI state: useState/useReducer
- Global app state: Zustand (lightweight, works well with RN)
- Persisted state: MMKV or AsyncStorage (MMKV is 30x faster)

## Mobile-First Design Principles

**Touch targets:** Minimum 44x44pt (Apple HIG) / 48x48dp (Material). No exceptions. Small tap targets are the #1 mobile UX failure.

**Spacing and layout:**
- Design for the thumb zone (bottom of screen = primary actions)
- Safe area insets on all screens (notch, home indicator, status bar)
- Keyboard-aware layouts (inputs scroll into view, submit button accessible)
- Pull-to-refresh for list screens
- Skeleton loaders, not spinners (perceived performance)

**Typography:**
- Minimum 16px body text on mobile (14px only for secondary/caption)
- Dynamic type / font scaling support (respect user accessibility settings)
- Line height 1.4-1.6 for readability

**Gestures:**
- Swipe-to-dismiss, swipe-to-delete where contextually appropriate
- Back gesture support (iOS swipe-from-edge, Android back button)
- Long press for secondary actions (with haptic feedback)
- Avoid gesture-only interactions — always provide a visible button alternative

## Native-Feel Performance

**List performance:**
- `FlatList` with `keyExtractor`, `getItemLayout` (if fixed height), `removeClippedSubviews`
- Never render all items — virtualize everything over 20 items
- Avoid inline function/object creation in `renderItem`
- Use `FlashList` (Shopify) for superior list performance over FlatList

**Animation:**
- Use `react-native-reanimated` for smooth 60fps animations (runs on UI thread)
- `react-native-gesture-handler` for gesture-driven animations
- Layout animations via `LayoutAnimation` for simple transitions
- Never animate with `setState` (causes JS thread bridge bottleneck)

**Image optimization:**
- Use `expo-image` or `react-native-fast-image` (caching, progressive loading)
- Serve appropriately sized images (don't download 2000px for a 100px thumbnail)
- WebP format where supported
- Placeholder/blurhash while loading

**App startup:**
- Minimize JS bundle size (tree-shake, code-split with lazy loading)
- Defer non-critical initialization
- Splash screen until first meaningful render (not until everything loads)
- Hermes engine enabled (significant startup improvement for Android)

## Cross-Platform Considerations

**Platform-specific code:**
```
Component.ios.tsx    / Component.android.tsx     # File-based
Platform.OS === 'ios' ? iosValue : androidValue  # Inline
Platform.select({ ios: value, android: value })  # Object-based
```

**Platform differences to handle:**
- Shadow: `shadow-*` on iOS, `elevation` on Android
- Status bar styling (translucent on Android, different APIs)
- Permissions (camera, location, notifications — request flow differs)
- Push notifications: APNs (iOS) vs FCM (Android), or use Expo Notifications
- Haptic feedback: `expo-haptics` or `react-native-haptic-feedback`

**Testing on real devices:**
- Simulators for development, but always verify on physical devices before release
- Test on both low-end and high-end devices
- Test on oldest supported OS version
- Test with accessibility settings enabled (large text, VoiceOver/TalkBack)

## App Store Considerations

- Privacy manifests required (iOS — declare data collection)
- App Tracking Transparency prompt if using IDFA
- Screenshot and metadata per device class
- Over-the-air updates (Expo EAS Update or CodePush) for JS-only changes
- Binary updates through store for native module changes
- Follow review guidelines strictly — rejection costs days
