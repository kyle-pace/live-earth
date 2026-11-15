<!-- BEGIN principles (web): synced from github.com/kyle-pace/principles. Edit them there; changes made here are overwritten. -->

## Development principles

These apply to every project Kyle builds, on any platform, with any agent. The project's own section of this file adds specifics and can override a default for that project. Kyle's direct instructions in a session override both.

### Priority order

When two goals conflict, the higher one wins:

1. Accessibility
2. Privacy
3. Correctness and reliability
4. Performance
5. Polish

### Accessibility comes first

Accessibility is designed in from the first commit, not audited in at the end.

- Meet WCAG 2.2 AA at minimum. Text contrast is at least 4.5:1 (3:1 for large text and for UI parts like borders and icons), in both light and dark mode.
- Use semantic, native elements first (`button`, `a`, `label`, headings in order, landmarks). Add ARIA only when no native element does the job.
- Everything interactive works with a keyboard, has a visible focus style and has an accessible name. Touch targets are at least 24×24 px; aim for 44×44.
- Never carry meaning with color alone. Meaningful images get alt text; decorative ones get empty alt.
- Respect user settings: reduced motion, light/dark preference, text zoom to 200% without breaking layout.
- Motion is short (under 300 ms for interface animation) and never `ease-in`.
- On the web, motion only runs inside `@media (prefers-reduced-motion: no-preference)`.

### Every screen size from day one

Layouts are designed for phones, tablets and big screens from the first commit, not stretched or squeezed in later.

- **Web projects** are fully responsive: mobile first, fluid from 320 px wide up to large desktop monitors. No sideways scrolling at 320 px. Cap line length for reading (about 70 characters), and let wider screens add columns instead of stretching text.
- Prefer fluid layouts (flexbox, grid, `clamp()`, container queries) over many fixed breakpoints.
- Handle touch, mouse and keyboard on every size, and respect safe areas and notches.

### Type

- Atkinson Hyperlegible Next for all text and Atkinson Hyperlegible Mono for code, in every product.
- Self-host the fonts. Never load them from Google Fonts or any other font CDN.
- On the web, use the `@fontsource/atkinson-hyperlegible-next` and `@fontsource/atkinson-hyperlegible-mono` packages.
- Offering a setting to switch to the device's own font is fine.

### Privacy comes second, and right behind

- Collect the least data that answers a real product question. No ad or marketing pixels, no fingerprinting, no selling or sharing data.
- Never put personal information in analytics: no names, emails, free-text input or precise location.
- Respect Global Privacy Control and Do Not Track by sending no analytics at all, and give people an opt-out.
- No cookies for analytics (keep the ID in `localStorage`), so no cookie banner is needed.
- Analytics only runs on the live production domain, never on localhost or preview builds.
- Any project that collects data has a short, plain-language privacy page.
- Secrets never go in Git. (Browser API keys that are public by design, like Amplitude's, are fine in code.)

### Default stack

Use these unless the project's section says otherwise. **Do not add any other third-party service, SDK, script, font or paid tool without asking Kyle first.**

- **Product analytics: Amplitude**, set up the private way:
  - on the web, use `startAnalytics` from kp-design's `kp-design/analytics`, which does all of this
  - autocapture on, IP address tracking off, identity in `localStorage`
  - off under GPC, Do Not Track or the opt-out; only on the live domain
  - Session Replay only if the project wants it: a small sample (about 5%), conservative masking, and its code only loaded for sampled sessions
  - custom events follow the naming rules under "Analytics events" below
- **Backend: Firebase** (Auth, Firestore, Functions, Storage) when a project needs accounts or shared data.
  - Security rules deny by default and are locked down before anything ships.
  - Firebase Analytics stays off; Amplitude covers analytics.
- **Web hosting: Cloudflare** (Workers with static assets). GitHub Pages is fine for a simple static site.
- **Design system for Kyle's websites: [kp-design](https://github.com/kyle-pace/kp-design)**, installed from GitHub and pinned to a commit. It holds the tokens, self-hosted Atkinson, header, footer, display settings and analytics; projects on kylepace.dev use its `DevLayout`. Don't copy these into a project; change them in kp-design. (Apple apps don't use it.)
- Put each outside service behind its own module (one file talks to Amplitude, one to Firebase), so switching tools means changing one file.
- CI checks the stack on every push: Amplitude is in every site and app, Firebase Analytics isn't, each Firebase config file is for a bundle ID the app really has, and Firestore rules aren't open. It can't see inside the Amplitude or Firebase consoles, so settings there (APNs keys, API key restrictions, a separate production project) still need a person.
- Keep running costs near zero: prefer static pages, free tiers and on-device work, and ask before adding anything that bills.

### Analytics events

Every project uses the same rules, so charts read the same way everywhere.

- **Event names:** Title Case, past-tense verb first, then the object: "Saved Recipe", "Viewed Deal", "Completed Onboarding". Not "Recipe Saved" and not `save_recipe`. Use the same verb for the same action across projects (Viewed, Opened, Tapped, Added, Removed, Changed, Saved, Completed).
- **Property names:** lowercase `snake_case` (`deal_id`, `stores_picked`). Keep names and values the same across events and projects when they mean the same thing.
- Leave Amplitude's own `[Amplitude] …` events alone. Add custom events only for actions that answer a real product question; autocapture covers page views and clicks.
- **One Amplitude project per product.**
- kylepace.dev and every experiment on it share the kylepace.dev project, so each experiment's custom events also send `experiment` with the project's slug (`experiment: "skill-tree"`).
- **Every new feature ships with its events.** Building a feature includes its analytics: the events that say whether people find it and use it, written in the same change as the feature, not left as a follow-up. Say in your report which events you added, or why the feature needs none.
- **Tracking plan first:** add each new event and its properties to the project's tracking plan in Amplitude, with a description and category, as part of the same piece of work. Do it yourself when you can reach Amplitude; if you can't, say so and list exactly what needs adding. Nothing should arrive as "unexpected".
- **Renaming an event:** rename it in code, then merge the old name into the new one in Amplitude so history stays connected. Don't rename in Amplitude alone.
- **New product:** create its Amplitude project and add a row for it to the "All projects overview" dashboard. A new experiment on kylepace.dev needs neither: it appears there by page path.

### Self-host everything; approve outside hosts one at a time

- Serve libraries, fonts and assets from the project itself. Install them from npm and bundle them, or keep a pinned copy in the repo (for example in `vendor/`) with a script that refreshes it.
- Never load them from a CDN like jsDelivr, unpkg or cdnjs.
- **Scripts, styles, fonts and APIs** from an outside host need Kyle's OK every time. Approvals are per project and per host. Once he approves, add the host to that project's `.agents/allowed-hosts.txt` with a comment saying what it's for and the date he approved it.
- **Images** are lighter, because an outside image can only learn that someone visited, not run code. An image host can be added without asking when the image belongs to the content being shown (a recipe site's own photo on a result for its recipe, a book's cover from the library that lists it). Load those images with `referrerpolicy="no-referrer"` and `loading="lazy"`, add the host to `.agents/allowed-hosts.txt` with a comment saying what it's for, and mention the new host to Kyle when you report back. Decorative images, stock photos and anything that looks like tracking still need his OK.
- All of this applies to hosts that JavaScript calls at runtime too, even though the CI check only sees HTML and CSS. List those in the same file.

### Look and feel: no generated defaults

- Before building a page or app's look, write a short plan in `design/PLAN.md`: the subject and who it's for, the one bold element, 4 to 6 named colors (light and dark), and the layout as a sketch. Take the ideas from the subject's own world, not from other websites. If a frontend-design skill is available, load it.
- Check the plan against the generated defaults and change anything that matches: a big headline over a muted sentence and a pill button; pills or one corner radius on everything; grids of identical cards; small labels above headings; colored dots or squares as decoration; details joined with middle dots; monospace for small labels; copy that explains the interface instead of using it.
- Spend boldness in one place and keep the rest quiet. Look at screenshots (phone and desktop, light and dark) before calling it done.
- Experiments on kylepace.dev are their own pages (kp-design's `LabLayout`) with their own look. The app comes first; the explanation goes on its About page, linked from the top bar.
- About pages use the same title, headings and step format everywhere (the `about-page` skill). The look can follow the project's theme; the words never do.

### How things get built

- Static and simple by default. Add JavaScript, servers or dependencies only where they earn it.
- Colors, type and spacing live in one tokens file. Light and dark mode exist from the start.
- Copy is plain language, written for the person using it.
- Don't add "Built with AI" lines or other AI credits to sites or apps unless Kyle asks.

### Correctness

- Anything that reads data from outside the project (a feed, a flyer, an API response, a file someone picks) gets a test that runs it against a saved real sample, plus one broken sample.
- One bad record never takes down the rest: skip it, log it, and keep going.
- A scheduled job that fails must fail out loud (a red run), and must never replace good published data with empty or partial data.
- A bug fix comes with a test that fails without the fix, when the project has tests.

### Performance

Budgets, not goals. If a project needs to go over (a map, a globe, a video player), its section says so and by how much.

- Content pages ship no more than 50 KB of JavaScript (compressed), and read fine without it.
- No single image over 200 KB. Images are sized to how they're shown, served as AVIF or WebP, given `width` and `height`, and lazy-loaded below the first screen.
- On a mid-range phone: the main content shows within 2.5 seconds (Largest Contentful Paint) and the layout shifts less than 0.1 (Cumulative Layout Shift). Lighthouse performance is 90 or higher on mobile.

### Shipping

- Small commits, each with a plain sentence saying what changed for the person using it.
- Websites deploy from `main`. Once the checks for the change's tier pass (see "Before you call it done"), push to `main`; no need to wait for Kyle. Use a branch and pull request when he asks for one, or when you want him to look before it goes live.
- Never force-push `main`, skip a failing check to get something out, or commit a secret.
- Changing the principles or kp-design changes every project. Test the change against one real project first, then roll it out.
- **Ask Kyle first, every time:** anything that costs money; a new outside service, SDK or host (see above); DNS, domain or email changes; deleting data, a repo or a deployed project; making a private repo public or a public one private; publishing something he hasn't linked publicly yet (a draft, a case study, an unannounced app); anything that speaks for him (his résumé, LinkedIn, a post or message in his name).
- When Kyle has to do a step himself (approve a setting, create a repo, sign in), give him the direct link to the exact page.
- If you couldn't finish or couldn't check something, say so plainly in your report. Don't describe work as done when a step was skipped.

### Teach Kyle as you go

Kyle is a product leader building his development skills through this work. Treat each session as a chance to teach, briefly.

- When a change involves a real decision (data structure, architecture, a library, security, performance, a tradeoff), explain it in plain language: what you chose, the main alternative, and why. A short paragraph, not a lecture.
- After making changes, show the most important part of the diff and walk through what it does in plain terms. Point out one thing worth learning from it.
- Define jargon the first time it comes up in a session.
- When a change is small and safe (a color, copy, a value, spacing), offer to let Kyle make it by hand, and tell him which file and line to change.
- Skip all of this for trivial changes like typos and formatting.

### Every new page or project ships with

- A share card (Open Graph image, 1200×630) in dark mode, using Atkinson. Follow `.agents/skills/share-card/SKILL.md`.
- A real title, description and favicon.
- A privacy note if it collects anything.

### Before you call it done

Match the checking to the change. If you're unsure which tier a change is, use the higher one. In your report, say which tier you used and what you ran.

**Tier 1: words and data.** Copy, a link, a value in a data file, a dependency pin, docs.

- The build passes, and so do any tests and linters.
- Read the changed text where it shows up in the built output.

**Tier 2: something people see or use changed.** Layout, styles, a component, a new control, new behavior.

- Everything in tier 1.
- A new feature has its events in code and in the Amplitude tracking plan (see "Analytics events").
- Run the project's check command (`npm run check` where a project has one). It runs axe on every page in light and dark, fails on sideways scrolling, and saves screenshots at 320, 768, 1280 and 1920 px. Fix what it finds.
- Look at the changed screen in light and dark, at the smallest size and a large one.
- Use new controls with the keyboard (and VoiceOver in apps): reachable, visible focus, a name that makes sense.

**Tier 3: a new page, screen or project, or a redesign.**

- Everything in tier 2.
- Look at every size in light and dark: 320, 768, 1280 and 1920 px wide.
- Check it at 200% text zoom (the largest Dynamic Type size in apps) and with reduced motion on.
- Everything under "Every new page or project ships with".
- Check it against the performance budgets.

CI runs the check command where a project has one, the stack check (see "Default stack"), and a third-party check that fails if a page loads scripts, styles, fonts or images from a host that isn't allowed. Don't add a host just to get past it: ask Kyle, or for a content image follow the image rule above.

<!-- END principles -->

## This project

Live Earth: The whole planet and your corner of it, as five weather satellites see it right now. It lives at [kylepace.dev/live-earth/](https://kylepace.dev/live-earth/) and is one of the experiments listed on the [kylepace.dev](https://github.com/kyle-pace/kylepace.dev) hub.

- **Confluence:** add this lab's page in the [Labs space](https://kylepace.atlassian.net/wiki/spaces/LABS/overview) and link it here.
- **It's its own Cloudflare Worker (`live-earth`) on the hub's domain.** The routes in `wrangler.jsonc` claim `kylepace.dev/live-earth` and `/live-earth/*`; everything else on the domain (favicon, robots.txt, privacy page) is served by the hub.
- **Everything this site serves lives under `/live-earth/`**: pages in `src/pages/live-earth/`, public files in `public/live-earth/`, built assets at `/live-earth/_astro/`. Don't use Astro's `base` option; with the Cloudflare adapter it serves files from the wrong folder.
- **It's a standalone lab, not a page of kylepace.dev.** The shell is kp-design's `LabLayout` (a back link to kylepace.dev, an "About" link on the right of the top bar, a one-line footer, display settings and analytics), pinned to a commit in package.json. There's no site header; the kylepace.dev links live in kp-design, not here.
- **Its look is its own.** The tokens are overridden in `src/styles/theme.css`; the reasoning, palette and layout are in `design/PLAN.md`. Read the plan before restyling.
- **The app comes first.** The page opens with one line of title and then the app. The explanation is the About page, `src/pages/live-earth/about.astro` (`/live-earth/about/`), with the standard title, headings and step format from the `about-page` skill. If how the lab is built or where its data comes from changes, change that page too.
- **Analytics** goes to the shared kylepace.dev Amplitude project through kp-design. Send custom events with `track()` from `src/lib/track.ts`, which adds `experiment: 'live-earth'`. Every new event goes in the kylepace.dev tracking plan in the same change.
- **Outside hosts** are listed in `.agents/allowed-hosts.txt`: NOAA's GOES image server, `cdn.star.nesdis.noaa.gov`, and EUMETSAT's map service, `view.eumetsat.int`, for the pictures themselves (loaded with no referrer), and CIRA's SLIDER, `slider.cira.colostate.edu`, which only the Worker talks to (see Himawari below). The page never fetches NOAA's file listings or any API; it works out each scan's file name from the clock (see below).
- **Five satellites, three sources.** `source` in `views.ts` says where each satellite's pictures come from: `noaa` (GOES East and West), `eumetsat` (Meteosat and Meteosat Indian Ocean, each with its own WMS `layer` and `diskExtent`) and `cira` (Himawari).
- **Meteosat is different.** Its pictures come from EUMETView's WMS (`src/lib/eumetsat.ts`) as flat maps of any area and size. Regions use them as they are; the whole Earth is fetched with CORS and redrawn as the round planet on a canvas (`reprojectDisk`). The page only asks for on-the-hour scans at least 35 minutes old: under EUMETSAT's data policy that's free Core data (CC BY 4.0), and fresher data may cost money, so don't make it fresher. The credit line "contains modified EUMETSAT Meteosat data <year>" is required. Meteosat Indian Ocean's Natural Colour layer is empty at night, so `wmsUrl` asks for a black background (`bgcolor`); without it the night side comes back white.
- **Himawari comes from CIRA's SLIDER as 688 px tiles** (`src/lib/cira.ts`). SLIDER sends no CORS headers, so the browser can't stitch its tiles on a canvas directly. Instead this lab has one server route, `src/pages/live-earth/cira/[...path].ts`, which relays exactly two kinds of address (the scan-times list and a tile) and lets Cloudflare cache them, so SLIDER serves each tile once. That route is why the Worker isn't static-only any more; it runs on the Workers free plan (100,000 requests a day). Regions are `box`es cut from the full disk, worked out from latitude and longitude with the geostationary formulas. Kyle approved SLIDER for this personal lab on Nov 15, 2026; check CIRA's terms before using it anywhere public-facing beyond this lab, and never in a shipped app.
- **How it finds pictures.** `src/lib/views.ts` lists every view NOAA publishes per satellite (sizes, how often scans start, how much of the bottom edge to trim). `src/lib/goes.ts` turns a scan time into a file name, and the viewer (`src/lib/viewer.ts`) tries the newest likely scan times with the smallest size until one loads. If NOAA adds, drops or renames a view, regenerate `views.ts` from NOAA's listings and re-measure the logo trim. Labels are ours, not NOAA's: the `ga` sector is labeled "Gulf of Mexico" (Kyle's call, Nov 15, 2026), so keep that if you regenerate. `npm test` checks the name and timing rules against real NOAA file names in `tests/fixtures/`.
- **Image budget exception.** The principles cap images at 200 KB, but the pictures are the content: about 2 MB at Standard detail and up to 10 MB at High. The page shows NOAA's smallest copy (20 to 40 KB) first, and only loads a size big enough for the screen.
- **The viewer is always black**, in light mode too, because the pictures are. Light and dark tokens still color the bar, footer and About page.
- **Share cards** are `design/og.html` and `design/og-about.html`, rendered to `public/live-earth/og.png` and `og-about.png` with `npm run og`.
- Run `npm run build` and `npm test` before pushing; both must pass. Cloudflare Workers Builds deploys `main`.
- **Checking a change:** `npm run build`, then `npm run check` (the `page-check` skill): axe in light and dark, sideways scrolling, JavaScript weight (the principles' 50 KB budget), and screenshots in `.check/`. CI runs it on every push. If the lab needs more JavaScript (a map, a globe), raise the budget with `--js-budget` in package.json's `check` script and say why here.
