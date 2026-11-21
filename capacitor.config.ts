import type { CapacitorConfig } from '@capacitor/cli'

/*
 * The same web app, wrapped as an iOS and an Android app. One codebase:
 * `npm run build` makes dist, and `npx cap sync` copies it into both shells.
 */
const config: CapacitorConfig = {
  appId: 'com.victorsaly.liliart',
  appName: 'LiliArt',
  webDir: 'dist',
  backgroundColor: '#ffffff',
  ios: {
    /* the header is magenta to the top edge; the page handles its own safe areas */
    contentInset: 'never',
  },
}

export default config
