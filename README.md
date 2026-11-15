# Live Earth

The whole planet and your corner of it, as NOAA’s weather satellites see it right now.

Live at [kylepace.dev/live-earth/](https://kylepace.dev/live-earth/), one of the labs on [kylepace.dev](https://kylepace.dev/labs/).

## Working on it

```sh
npm install
npm run dev      # local site at localhost:4321/live-earth/
npm run build    # must pass before pushing
npm test         # file names and scan timing, against real NOAA samples
npm run check    # accessibility, sideways scrolling, JavaScript weight, screenshots
npm run og       # re-render the share cards from design/og*.html
```

`main` deploys to Cloudflare automatically. How it's put together, and the rules it follows, are in [AGENTS.md](AGENTS.md).
