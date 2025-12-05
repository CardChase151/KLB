# KLB - Kingdom Legacy Builders

## Development Priorities

### 1. Mobile First
- **Primary target**: iOS and Android apps via Capacitor
- Design and build for mobile screens first
- Test on device/simulator before desktop

### 2. Desktop Second
- Desktop can mirror mobile layout (no need to stretch full width)
- Center content, keep mobile proportions
- Consistent experience across all platforms

---

## Status Bar Control

**Location**: `src/App.js`

```javascript
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

// In useEffect:
if (Capacitor.isNativePlatform()) {
  try {
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#000000' });
  } catch (e) {
    console.log('StatusBar not available:', e.message);
  }
}
```

**Safe Area CSS Variables** (in `src/App.css`):
```css
:root {
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
}
```

Use `var(--safe-top)` etc. in components if needed.

---

## Theme / Color Scheme

**Primary**: Black & White with Grey accents

| Element | Color |
|---------|-------|
| Background | #0a0a0a (near black) |
| Input Background | #1a1a1a |
| Input Border | #333 |
| Placeholder Text | #666 |
| Secondary Text | #888 |
| Primary Text | #ffffff |
| Primary Button | #ffffff bg, #000000 text |
| Accent (from logo) | Grey lion accent |

**No red** - all original red (#ff0000) has been replaced with white.

---

## Logo Assets

- **Icon** (app icons): `Downloads/KLB_Icon.jpg` -> used for favicon, app icons
- **Logo** (in-app): `Downloads/KLB_LOGO_BLACK.jpg` -> used for login, splash
- **Logo location in app**: `src/assets/klb-logo.png`

---

## Key Files

| File | Purpose |
|------|---------|
| `src/App.js` | StatusBar setup, routing |
| `src/App.css` | Safe area CSS variables, global styles |
| `src/onboarding/onboarding.css` | Login, create account, forgot password styles |
| `public/index.html` | Meta tags, viewport config |
| `public/manifest.json` | PWA config, app name |
| `capacitor.config.ts` | Native app config |

---

## Build Commands

```bash
# Dev server
npm start

# Build for production
npm run build

# Sync to native
npx cap sync

# Run iOS
npx cap run ios -l --external

# Run Android
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
npx cap run android -l --external
```

---

## Screen Header Pattern

All screens should use this header style (CardChase pattern):

```javascript
{/* Header */}
<div style={{
  display: 'flex',
  alignItems: 'center',
  padding: '12px 16px',
  paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
  backgroundColor: '#0a0a0a',
  flexShrink: 0,
  position: 'relative',
  gap: '12px'
}}>
  <button onClick={goBack} style={{
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    backgroundColor: '#1a1a1a',
    border: '1px solid #2a2a2a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#ffffff',
    fontSize: '1.2rem'
  }}>←</button>
  <h1 style={{
    color: '#ffffff',
    fontSize: '20px',
    fontWeight: '700',
    margin: 0,
    flex: 1,
    textAlign: 'center',
    marginRight: '40px'
  }}>Screen Title</h1>
  <div style={{
    position: 'absolute',
    bottom: 0,
    left: '40px',
    right: '40px',
    height: '2px',
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: '1px'
  }} />
</div>
```

---

## Dynamic Content (Admin-Managed)

Most screens display dynamic content from Supabase, managed via Admin Dashboard.

| Screen | Table | Content Type | Has Categories |
|--------|-------|--------------|----------------|
| Home | `home_content` | `home` | No |
| Training | `training_content` | `training` | Yes |
| Licensing | `licensing_content` | `licensing` | Yes |
| New Rep Start | `newrepstart_content` | `newrepstart` | No |
| Schedule | `schedule_content` | `schedule` | No (has times) |

### Adding a New Screen with Admin Content

1. Create screen in `src/main/newscreen.js`
2. Add route in `src/App.js`
3. Create table `newscreen_content` with columns:
   - `id`, `title`, `description`, `url`, `link_title`, `image_url`, `use_logo`, `category`, `sort_order`, `is_active`, `created_at`, `updated_at`
4. Add button in `src/admin/admin.js`
5. If categories needed, add to `getCategoriesForType()` in `src/admin/admin2.js`

---

## Image Storage (Supabase)

**Bucket**: `images`

**Folder structure** (by content type):
- `images/home/`
- `images/training/`
- `images/licensing/`
- `images/newrepstart/`
- `images/schedule/`

**ImageUpload component**: `src/admin/ImageUpload.js`
```javascript
<ImageUpload
  folder="home"  // folder name = contentType
  currentImageUrl={formData.image_url}
  onImageUploaded={(url) => setFormData({...formData, image_url: url})}
/>
```

**use_logo option**: Admin can check "Use KLB Logo" instead of uploading image
- Stores `use_logo: true` in database
- Frontend renders `src/assets/klb-logo.png`

---

## Notes

- Node 20 required (use `nvm use 20`)
- Capacitor 6 installed
- StatusBar plugin: @capacitor/status-bar@6
- **React 18** required (React 19 has Supabase hanging bug)

---

## Level Up Feature

Gamified training system with levels, content tracking, quizzes, and certificates.

### Database Tables

| Table | Purpose |
|-------|---------|
| `levels` | Level definitions (number, name, description) |
| `level_items` | Content within levels (video, audio, pdf, presentation, quiz) |
| `quizzes` | Quiz metadata |
| `quiz_questions` | Questions for quizzes |
| `quiz_options` | Multiple choice options |
| `user_level_progress` | User progress per item (%, completion) |
| `user_level_status` | User status per level (unlocked, completed) |
| `user_quiz_attempts` | Quiz attempt history |
| `certificate_settings` | Admin-configurable certificate text |
| `user_certificates` | Issued certificates |

### Key Files

| File | Purpose |
|------|---------|
| `src/main/levelup.js` | User-facing level screen (climbing visual) |
| `src/main/LevelItemViewer.js` | Content viewer (video/audio/pdf/quiz) |
| `src/admin/AdminLevelUp.js` | Admin panel for levels, items, quizzes |
| `migrations/add_level_up_tables.sql` | Database schema |

### Admin Flow

1. **Admin > Level Up Management** - Main admin screen
2. **Add Level** - Create levels (Level 1, 2, 3...)
3. **Click Level > Add Content Item** - Add content within a level
4. **Content Types**:
   - **Video/Audio**: Upload file, auto-tracks watch/listen progress
   - **PDF**: Upload file, tracks pages viewed
   - **Presentation**: Upload file, tracks slides viewed
   - **Quiz**: Creates quiz, then "Manage Quiz" to add questions
5. **Publish toggle** - Draft vs live
6. **Archive** - Soft delete (completed users can still see)

### Quiz Creation

1. Add content item with type "Quiz"
2. Click "Manage Quiz" on that item
3. Add questions with 2-4 multiple choice options
4. Mark correct answer(s)
5. Quiz stored in `quizzes`, `quiz_questions`, `quiz_options` tables

### Progress Tracking

| Content Type | How Tracked | Pass Threshold |
|--------------|-------------|----------------|
| Video | Watch time % | Admin-set (default 80%) |
| Audio | Listen time % | Admin-set (default 80%) |
| PDF | Pages viewed / total | Admin-set (default 80%) |
| Presentation | Slides viewed / total | Admin-set (default 80%) |
| Quiz | Score % | Admin-set (default 80%) |

### Level Unlock Logic

- Level 1 always unlocked
- Complete all items in level (meet pass threshold) = auto-unlock next level
- All levels complete = certificate available

### Certificate

- Admin configures description text in "Certificate Settings"
- User downloads PNG certificate when all levels complete
- Certificate stored in `user_certificates` with unique ID

### Storage Bucket

- **Bucket**: `level-files` (for video/audio/pdf/presentation uploads)
- **Max size**: 50MB per file

### User Reset

Admin can reset user progress via "User Progress" in admin panel.
