// What NOAA publishes for each GOES satellite's GeoColor imagery: the whole-Earth view, the
// U.S. view and the regional views, each with its image sizes and how often a new scan
// arrives. Measured from NOAA's file listings on Nov 15, 2026; regenerate if NOAA adds or
// drops a view.
//
// Each size is [width, height, trim bottom, trim left]: how much of the picture to cut off
// to hide NOAA's logo (bottom-left corner) and caption bar (bottom edge), as fractions of its
// height and width. For each size, whichever cut loses less of the picture wins: just the
// bottom up past the logo, or the caption bar plus a strip down the left edge. Measured with
// scripts/measure-overlay.py and checked by eye. The whole Earth gets a round mask instead.
//
// Files live at cdn.star.nesdis.noaa.gov/<code>/ABI/<FD|CONUS|SECTOR/x>/GEOCOLOR/ and are
// named <YYYYDDDHHMM>_<code>-ABI-<FD|CONUS|x>-GEOCOLOR-<W>x<H>.jpg, where the time is the
// start of the scan in UTC. New scans start every `cadence` minutes, at minutes ending in
// `offset` (0, 10, 20... or 1, 6, 11...).

// Meteosat and Meteosat Indian Ocean (source 'eumetsat') work differently: their pictures come
// from EUMETSAT's map service as flat maps of an `extent`, at any size, every hour; see
// src/lib/eumetsat.ts. Himawari (source 'cira') comes from CIRA's SLIDER as map tiles, and its
// regions are `box`es cut from the full disk; see src/lib/cira.ts. Neither adds a logo or
// caption, so their sizes have no trims.

import type { Extent } from './eumetsat';
import type { Box } from './cira';

export interface View {
  id: string;
  code: string;
  label: string;
  group: 'whole' | 'region';
  shape: 'disk' | 'rect';
  cadence: number;
  offset: number;
  sizes: Size[];
  /** Meteosat regions only: the part of the flat map to show. */
  extent?: Extent;
  /** Roughly where a region is, as [south, west, north, east] in degrees (west greater than
   * east means it crosses the date line). Used to pick the best view of a place
   * (src/lib/nearby.ts); hand-set from each region's pictures, so only good to a degree or
   * two. The whole Earth and NOAA's "All 50 states" have none. */
  bounds?: [number, number, number, number];
  /** Himawari only: the part of CIRA's full-disk picture to show, as fractions of its width
   * and height (the whole disk is [0, 0, 1, 1]). Regions were worked out from latitude and
   * longitude boxes with the geostationary formulas. */
  box?: Box;
}

/** [width, height, trim bottom, trim left] */
export type Size = [number, number, number, number];

export interface Satellite {
  id: 'east' | 'west' | 'meteosat' | 'indian' | 'himawari';
  code: string;
  name: string;
  /** Label on the sky strip, when the name is too long for it. */
  short?: string;
  craft: string;
  lon: number;
  source: 'noaa' | 'eumetsat' | 'cira';
  /** EUMETSAT only: the map service layer, and the part of the flat map the satellite sees. */
  layer?: string;
  diskExtent?: Extent;
  views: View[];
}

export const SATELLITES: Satellite[] = [
  {
    "id": "east",
    "code": "GOES19",
    "name": "GOES East",
    "craft": "GOES-19",
    "lon": -75.2,
    "views": [
      {
        "id": "earth",
        "code": "FD",
        "label": "Whole Earth",
        "group": "whole",
        "shape": "disk",
        "cadence": 10,
        "offset": 0,
        "sizes": [
          [
            339,
            339,
            0,
            0
          ],
          [
            678,
            678,
            0,
            0
          ],
          [
            1808,
            1808,
            0,
            0
          ],
          [
            5424,
            5424,
            0,
            0
          ]
        ]
      },
      {
        "id": "us",
        "code": "CONUS",
        "label": "Continental U.S.",
        "group": "whole",
        "shape": "rect",
        "cadence": 5,
        "offset": 1,
        "sizes": [
          [
            416,
            250,
            0.116,
            0
          ],
          [
            625,
            375,
            0.0467,
            0.104
          ],
          [
            1250,
            750,
            0.036,
            0.079
          ],
          [
            2500,
            1500,
            0.0227,
            0.071
          ],
          [
            5000,
            3000,
            0.0227,
            0.071
          ]
        ],
        "bounds": [
          24,
          -125,
          50,
          -66
        ]
      },
      {
        "id": "can",
        "code": "can",
        "label": "Canada and northern U.S.",
        "group": "region",
        "shape": "rect",
        "cadence": 10,
        "offset": 0,
        "sizes": [
          [
            280,
            140,
            0.196,
            0
          ],
          [
            560,
            280,
            0.0611,
            0.1035
          ],
          [
            1125,
            560,
            0.0433,
            0.07
          ],
          [
            2250,
            1125,
            0.0289,
            0.076
          ],
          [
            4500,
            2250,
            0.0289,
            0.076
          ]
        ],
        "bounds": [
          42,
          -120,
          62,
          -55
        ]
      },
      {
        "id": "car",
        "code": "car",
        "label": "Caribbean",
        "group": "region",
        "shape": "rect",
        "cadence": 10,
        "offset": 0,
        "sizes": [
          [
            250,
            250,
            0.121,
            0
          ],
          [
            500,
            500,
            0.118,
            0
          ],
          [
            1000,
            1000,
            0.088,
            0
          ],
          [
            2000,
            2000,
            0.1,
            0
          ],
          [
            4000,
            4000,
            0.1,
            0
          ]
        ],
        "bounds": [
          10,
          -88,
          27,
          -58
        ]
      },
      {
        "id": "cam",
        "code": "cam",
        "label": "Central America",
        "group": "region",
        "shape": "rect",
        "cadence": 10,
        "offset": 0,
        "sizes": [
          [
            250,
            250,
            0.121,
            0
          ],
          [
            500,
            500,
            0.118,
            0
          ],
          [
            1000,
            1000,
            0.088,
            0
          ],
          [
            2000,
            2000,
            0.1,
            0
          ],
          [
            4000,
            4000,
            0.1,
            0
          ]
        ],
        "bounds": [
          5,
          -95,
          22,
          -75
        ]
      },
      {
        "id": "eep",
        "code": "eep",
        "label": "Eastern Pacific",
        "group": "region",
        "shape": "rect",
        "cadence": 10,
        "offset": 0,
        "sizes": [
          [
            450,
            270,
            0.111,
            0
          ],
          [
            900,
            540,
            0.0373,
            0.0849
          ],
          [
            1800,
            1080,
            0.0299,
            0.0566
          ],
          [
            3600,
            2160,
            0.0299,
            0.0566
          ]
        ],
        "bounds": [
          0,
          -140,
          35,
          -100
        ]
      },
      {
        "id": "cgl",
        "code": "cgl",
        "label": "Great Lakes",
        "group": "region",
        "shape": "rect",
        "cadence": 5,
        "offset": 1,
        "sizes": [
          [
            300,
            300,
            0.096,
            0
          ],
          [
            600,
            600,
            0.0993,
            0
          ],
          [
            1200,
            1200,
            0.0927,
            0
          ],
          [
            2400,
            2400,
            0.0852,
            0
          ]
        ],
        "bounds": [
          38,
          -95,
          50,
          -72
        ]
      },
      {
        "id": "ga",
        "code": "ga",
        "label": "Gulf of Mexico",
        "group": "region",
        "shape": "rect",
        "cadence": 5,
        "offset": 1,
        "sizes": [
          [
            250,
            250,
            0.121,
            0
          ],
          [
            500,
            500,
            0.118,
            0
          ],
          [
            1000,
            1000,
            0.088,
            0
          ],
          [
            2000,
            2000,
            0.1,
            0
          ],
          [
            4000,
            4000,
            0.1,
            0
          ]
        ],
        "bounds": [
          18,
          -98,
          31,
          -80
        ]
      },
      {
        "id": "mex",
        "code": "mex",
        "label": "Mexico",
        "group": "region",
        "shape": "rect",
        "cadence": 10,
        "offset": 0,
        "sizes": [
          [
            250,
            250,
            0.121,
            0
          ],
          [
            500,
            500,
            0.118,
            0
          ],
          [
            1000,
            1000,
            0.088,
            0
          ],
          [
            2000,
            2000,
            0.1,
            0
          ],
          [
            4000,
            4000,
            0.1,
            0
          ]
        ],
        "bounds": [
          14,
          -118,
          33,
          -86
        ]
      },
      {
        "id": "na",
        "code": "na",
        "label": "North Atlantic",
        "group": "region",
        "shape": "rect",
        "cadence": 10,
        "offset": 0,
        "sizes": [
          [
            450,
            270,
            0.111,
            0
          ],
          [
            900,
            540,
            0.0373,
            0.0849
          ],
          [
            1800,
            1080,
            0.0299,
            0.0566
          ],
          [
            3600,
            2160,
            0.0299,
            0.0566
          ]
        ],
        "bounds": [
          30,
          -70,
          65,
          -10
        ]
      },
      {
        "id": "ne",
        "code": "ne",
        "label": "Northeast U.S.",
        "group": "region",
        "shape": "rect",
        "cadence": 5,
        "offset": 1,
        "sizes": [
          [
            300,
            300,
            0.096,
            0
          ],
          [
            600,
            600,
            0.0993,
            0
          ],
          [
            1200,
            1200,
            0.0927,
            0
          ],
          [
            2400,
            2400,
            0.0852,
            0
          ]
        ],
        "bounds": [
          37,
          -82,
          48,
          -66
        ]
      },
      {
        "id": "nr",
        "code": "nr",
        "label": "Northern Rockies",
        "group": "region",
        "shape": "rect",
        "cadence": 5,
        "offset": 1,
        "sizes": [
          [
            300,
            300,
            0.096,
            0
          ],
          [
            600,
            600,
            0.0993,
            0
          ],
          [
            1200,
            1200,
            0.0927,
            0
          ],
          [
            2400,
            2400,
            0.0852,
            0
          ]
        ],
        "bounds": [
          40,
          -118,
          50,
          -100
        ]
      },
      {
        "id": "nsa",
        "code": "nsa",
        "label": "Northern South America",
        "group": "region",
        "shape": "rect",
        "cadence": 10,
        "offset": 0,
        "sizes": [
          [
            450,
            270,
            0.111,
            0
          ],
          [
            900,
            540,
            0.0373,
            0.0849
          ],
          [
            1800,
            1080,
            0.0299,
            0.0566
          ],
          [
            3600,
            2160,
            0.0299,
            0.0566
          ]
        ],
        "bounds": [
          -15,
          -82,
          13,
          -34
        ]
      },
      {
        "id": "pnw",
        "code": "pnw",
        "label": "Pacific Northwest",
        "group": "region",
        "shape": "rect",
        "cadence": 5,
        "offset": 1,
        "sizes": [
          [
            300,
            300,
            0.096,
            0
          ],
          [
            600,
            600,
            0.0993,
            0
          ],
          [
            1200,
            1200,
            0.0927,
            0
          ],
          [
            2400,
            2400,
            0.0852,
            0
          ]
        ],
        "bounds": [
          41,
          -126,
          50,
          -110
        ]
      },
      {
        "id": "psw",
        "code": "psw",
        "label": "Pacific Southwest",
        "group": "region",
        "shape": "rect",
        "cadence": 5,
        "offset": 1,
        "sizes": [
          [
            300,
            300,
            0.096,
            0
          ],
          [
            600,
            600,
            0.0993,
            0
          ],
          [
            1200,
            1200,
            0.0927,
            0
          ],
          [
            2400,
            2400,
            0.0852,
            0
          ]
        ],
        "bounds": [
          31,
          -125,
          42,
          -112
        ]
      },
      {
        "id": "pr",
        "code": "pr",
        "label": "Puerto Rico",
        "group": "region",
        "shape": "rect",
        "cadence": 10,
        "offset": 0,
        "sizes": [
          [
            300,
            300,
            0.096,
            0
          ],
          [
            600,
            600,
            0.0993,
            0
          ],
          [
            1200,
            1200,
            0.0927,
            0
          ],
          [
            2400,
            2400,
            0.0852,
            0
          ]
        ],
        "bounds": [
          16,
          -70,
          20,
          -63
        ]
      },
      {
        "id": "se",
        "code": "se",
        "label": "Southeast U.S.",
        "group": "region",
        "shape": "rect",
        "cadence": 5,
        "offset": 1,
        "sizes": [
          [
            300,
            300,
            0.096,
            0
          ],
          [
            600,
            600,
            0.0993,
            0
          ],
          [
            1200,
            1200,
            0.0927,
            0
          ],
          [
            2400,
            2400,
            0.0852,
            0
          ]
        ],
        "bounds": [
          24,
          -92,
          37,
          -75
        ]
      },
      {
        "id": "smv",
        "code": "smv",
        "label": "Southern Mississippi Valley",
        "group": "region",
        "shape": "rect",
        "cadence": 5,
        "offset": 1,
        "sizes": [
          [
            300,
            300,
            0.096,
            0
          ],
          [
            600,
            600,
            0.0993,
            0
          ],
          [
            1200,
            1200,
            0.0927,
            0
          ],
          [
            2400,
            2400,
            0.0852,
            0
          ]
        ],
        "bounds": [
          29,
          -98,
          37,
          -85
        ]
      },
      {
        "id": "sp",
        "code": "sp",
        "label": "Southern Plains",
        "group": "region",
        "shape": "rect",
        "cadence": 5,
        "offset": 1,
        "sizes": [
          [
            300,
            300,
            0.096,
            0
          ],
          [
            600,
            600,
            0.0993,
            0
          ],
          [
            1200,
            1200,
            0.0927,
            0
          ],
          [
            2400,
            2400,
            0.0852,
            0
          ]
        ],
        "bounds": [
          26,
          -108,
          40,
          -93
        ]
      },
      {
        "id": "sr",
        "code": "sr",
        "label": "Southern Rockies",
        "group": "region",
        "shape": "rect",
        "cadence": 5,
        "offset": 1,
        "sizes": [
          [
            300,
            300,
            0.096,
            0
          ],
          [
            600,
            600,
            0.0993,
            0
          ],
          [
            1200,
            1200,
            0.0927,
            0
          ],
          [
            2400,
            2400,
            0.0852,
            0
          ]
        ],
        "bounds": [
          31,
          -115,
          42,
          -101
        ]
      },
      {
        "id": "ssa",
        "code": "ssa",
        "label": "Southern South America",
        "group": "region",
        "shape": "rect",
        "cadence": 10,
        "offset": 0,
        "sizes": [
          [
            450,
            270,
            0.111,
            0
          ],
          [
            900,
            540,
            0.0373,
            0.0849
          ],
          [
            1800,
            1080,
            0.0299,
            0.0566
          ],
          [
            3600,
            2160,
            0.0299,
            0.0566
          ]
        ],
        "bounds": [
          -56,
          -82,
          -15,
          -34
        ]
      },
      {
        "id": "taw",
        "code": "taw",
        "label": "Tropical Atlantic",
        "group": "region",
        "shape": "rect",
        "cadence": 10,
        "offset": 0,
        "sizes": [
          [
            450,
            270,
            0.111,
            0
          ],
          [
            900,
            540,
            0.0373,
            0.0849
          ],
          [
            1800,
            1080,
            0.0299,
            0.0566
          ],
          [
            3600,
            2160,
            0.0299,
            0.0566
          ]
        ],
        "bounds": [
          5,
          -60,
          30,
          -15
        ]
      },
      {
        "id": "eus",
        "code": "eus",
        "label": "U.S. Atlantic coast",
        "group": "region",
        "shape": "rect",
        "cadence": 5,
        "offset": 1,
        "sizes": [
          [
            250,
            250,
            0.121,
            0
          ],
          [
            500,
            500,
            0.118,
            0
          ],
          [
            1000,
            1000,
            0.088,
            0
          ],
          [
            2000,
            2000,
            0.1,
            0
          ],
          [
            4000,
            4000,
            0.1,
            0
          ]
        ],
        "bounds": [
          25,
          -85,
          45,
          -60
        ]
      },
      {
        "id": "umv",
        "code": "umv",
        "label": "Upper Mississippi Valley",
        "group": "region",
        "shape": "rect",
        "cadence": 5,
        "offset": 1,
        "sizes": [
          [
            300,
            300,
            0.096,
            0
          ],
          [
            600,
            600,
            0.0993,
            0
          ],
          [
            1200,
            1200,
            0.0927,
            0
          ],
          [
            2400,
            2400,
            0.0852,
            0
          ]
        ],
        "bounds": [
          37,
          -100,
          49,
          -85
        ]
      }
    ],
    "source": "noaa"
  },
  {
    "id": "west",
    "code": "GOES18",
    "name": "GOES West",
    "craft": "GOES-18",
    "lon": -137.2,
    "views": [
      {
        "id": "earth",
        "code": "FD",
        "label": "Whole Earth",
        "group": "whole",
        "shape": "disk",
        "cadence": 10,
        "offset": 0,
        "sizes": [
          [
            339,
            339,
            0,
            0
          ],
          [
            678,
            678,
            0,
            0
          ],
          [
            1808,
            1808,
            0,
            0
          ],
          [
            5424,
            5424,
            0,
            0
          ]
        ]
      },
      {
        "id": "us",
        "code": "CONUS",
        "label": "Western U.S. and Pacific",
        "group": "whole",
        "shape": "rect",
        "cadence": 5,
        "offset": 1,
        "sizes": [
          [
            416,
            250,
            0.116,
            0
          ],
          [
            625,
            375,
            0.0467,
            0.104
          ],
          [
            1250,
            750,
            0.036,
            0.079
          ],
          [
            2500,
            1500,
            0.0227,
            0.071
          ],
          [
            5000,
            3000,
            0.0227,
            0.071
          ]
        ],
        "bounds": [
          15,
          -175,
          55,
          -100
        ]
      },
      {
        "id": "ak",
        "code": "ak",
        "label": "Alaska",
        "group": "region",
        "shape": "rect",
        "cadence": 10,
        "offset": 0,
        "sizes": [
          [
            250,
            250,
            0.121,
            0
          ],
          [
            500,
            500,
            0.118,
            0
          ],
          [
            1000,
            1000,
            0.088,
            0
          ],
          [
            2000,
            2000,
            0.1,
            0
          ],
          [
            4000,
            4000,
            0.1,
            0
          ]
        ],
        "bounds": [
          51,
          -170,
          72,
          -130
        ]
      },
      {
        "id": "gwas",
        "code": "gwas",
        "label": "All 50 states",
        "group": "region",
        "shape": "rect",
        "cadence": 10,
        "offset": 0,
        "sizes": [
          [
            450,
            270,
            0.111,
            0
          ],
          [
            900,
            540,
            0.0373,
            0.0849
          ],
          [
            1800,
            1080,
            0.0299,
            0.0566
          ],
          [
            3600,
            2160,
            0.0299,
            0.0566
          ]
        ]
      },
      {
        "id": "cak",
        "code": "cak",
        "label": "Central Alaska",
        "group": "region",
        "shape": "rect",
        "cadence": 10,
        "offset": 0,
        "sizes": [
          [
            300,
            300,
            0.096,
            0
          ],
          [
            600,
            600,
            0.0993,
            0
          ],
          [
            1200,
            1200,
            0.0927,
            0
          ],
          [
            2400,
            2400,
            0.0852,
            0
          ]
        ],
        "bounds": [
          58,
          -160,
          70,
          -140
        ]
      },
      {
        "id": "eep",
        "code": "eep",
        "label": "Eastern Pacific",
        "group": "region",
        "shape": "rect",
        "cadence": 10,
        "offset": 0,
        "sizes": [
          [
            450,
            270,
            0.111,
            0
          ],
          [
            900,
            540,
            0.0373,
            0.0849
          ],
          [
            1800,
            1080,
            0.0299,
            0.0566
          ],
          [
            3600,
            2160,
            0.0299,
            0.0566
          ]
        ],
        "bounds": [
          0,
          -140,
          35,
          -100
        ]
      },
      {
        "id": "hi",
        "code": "hi",
        "label": "Hawaii",
        "group": "region",
        "shape": "rect",
        "cadence": 10,
        "offset": 0,
        "sizes": [
          [
            300,
            300,
            0.096,
            0
          ],
          [
            600,
            600,
            0.0993,
            0
          ],
          [
            1200,
            1200,
            0.0927,
            0
          ],
          [
            2400,
            2400,
            0.0852,
            0
          ]
        ],
        "bounds": [
          18,
          -161,
          23,
          -154
        ]
      },
      {
        "id": "np",
        "code": "np",
        "label": "North Pacific",
        "group": "region",
        "shape": "rect",
        "cadence": 10,
        "offset": 0,
        "sizes": [
          [
            450,
            270,
            0.111,
            0
          ],
          [
            900,
            540,
            0.0373,
            0.0849
          ],
          [
            1800,
            1080,
            0.0299,
            0.0566
          ],
          [
            3600,
            2160,
            0.0299,
            0.0566
          ]
        ],
        "bounds": [
          30,
          160,
          62,
          -140
        ]
      },
      {
        "id": "pnw",
        "code": "pnw",
        "label": "Pacific Northwest",
        "group": "region",
        "shape": "rect",
        "cadence": 5,
        "offset": 1,
        "sizes": [
          [
            300,
            300,
            0.096,
            0
          ],
          [
            600,
            600,
            0.0993,
            0
          ],
          [
            1200,
            1200,
            0.0927,
            0
          ],
          [
            2400,
            2400,
            0.0852,
            0
          ]
        ],
        "bounds": [
          41,
          -126,
          50,
          -110
        ]
      },
      {
        "id": "psw",
        "code": "psw",
        "label": "Pacific Southwest",
        "group": "region",
        "shape": "rect",
        "cadence": 5,
        "offset": 1,
        "sizes": [
          [
            300,
            300,
            0.096,
            0
          ],
          [
            600,
            600,
            0.0993,
            0
          ],
          [
            1200,
            1200,
            0.0927,
            0
          ],
          [
            2400,
            2400,
            0.0852,
            0
          ]
        ],
        "bounds": [
          31,
          -125,
          42,
          -112
        ]
      },
      {
        "id": "tsp",
        "code": "tsp",
        "label": "South Pacific",
        "group": "region",
        "shape": "rect",
        "cadence": 10,
        "offset": 0,
        "sizes": [
          [
            450,
            270,
            0.111,
            0
          ],
          [
            900,
            540,
            0.0373,
            0.0849
          ],
          [
            1800,
            1080,
            0.0299,
            0.0566
          ],
          [
            3600,
            2160,
            0.0299,
            0.0566
          ]
        ],
        "bounds": [
          -30,
          -170,
          0,
          -120
        ]
      },
      {
        "id": "sea",
        "code": "sea",
        "label": "Southeast Alaska",
        "group": "region",
        "shape": "rect",
        "cadence": 10,
        "offset": 0,
        "sizes": [
          [
            300,
            300,
            0.096,
            0
          ],
          [
            600,
            600,
            0.0993,
            0
          ],
          [
            1200,
            1200,
            0.0927,
            0
          ],
          [
            2400,
            2400,
            0.0852,
            0
          ]
        ],
        "bounds": [
          54,
          -140,
          60,
          -130
        ]
      },
      {
        "id": "tpw",
        "code": "tpw",
        "label": "Tropical Pacific",
        "group": "region",
        "shape": "rect",
        "cadence": 10,
        "offset": 0,
        "sizes": [
          [
            450,
            270,
            0.111,
            0
          ],
          [
            900,
            540,
            0.0373,
            0.0849
          ],
          [
            1800,
            1080,
            0.0299,
            0.0566
          ],
          [
            3600,
            2160,
            0.0299,
            0.0566
          ]
        ],
        "bounds": [
          0,
          -170,
          25,
          -130
        ]
      },
      {
        "id": "wus",
        "code": "wus",
        "label": "U.S. Pacific coast",
        "group": "region",
        "shape": "rect",
        "cadence": 10,
        "offset": 0,
        "sizes": [
          [
            250,
            250,
            0.121,
            0
          ],
          [
            500,
            500,
            0.118,
            0
          ],
          [
            1000,
            1000,
            0.088,
            0
          ],
          [
            2000,
            2000,
            0.1,
            0
          ],
          [
            4000,
            4000,
            0.1,
            0
          ]
        ],
        "bounds": [
          32,
          -126,
          49,
          -114
        ]
      }
    ],
    "source": "noaa"
  },
  {
    "id": "meteosat",
    "code": "MTG",
    "name": "Meteosat",
    "craft": "Meteosat-12",
    "lon": 0,
    "source": "eumetsat",
    "views": [
      {
        "id": "earth",
        "code": "FD",
        "label": "Whole Earth",
        "group": "whole",
        "shape": "disk",
        "cadence": 60,
        "offset": 0,
        "sizes": [
          [
            678,
            678,
            0,
            0
          ],
          [
            1200,
            1200,
            0,
            0
          ],
          [
            1808,
            1808,
            0,
            0
          ],
          [
            2700,
            2700,
            0,
            0
          ]
        ]
      },
      {
        "id": "africa",
        "code": "africa",
        "label": "Africa",
        "group": "region",
        "shape": "rect",
        "cadence": 60,
        "offset": 0,
        "extent": {
          "south": -36,
          "west": -20,
          "north": 38,
          "east": 55
        },
        "sizes": [
          [
            600,
            592,
            0,
            0
          ],
          [
            1200,
            1184,
            0,
            0
          ],
          [
            2400,
            2368,
            0,
            0
          ]
        ],
        "bounds": [
          -36,
          -20,
          38,
          55
        ]
      },
      {
        "id": "europe",
        "code": "europe",
        "label": "Europe",
        "group": "region",
        "shape": "rect",
        "cadence": 60,
        "offset": 0,
        "extent": {
          "south": 34,
          "west": -25,
          "north": 72,
          "east": 45
        },
        "sizes": [
          [
            600,
            541,
            0,
            0
          ],
          [
            1200,
            1082,
            0,
            0
          ],
          [
            2400,
            2165,
            0,
            0
          ]
        ],
        "bounds": [
          34,
          -25,
          72,
          45
        ]
      }
    ]
  },
  {
    "id": "indian",
    "code": "MSG-IODC",
    "name": "Meteosat Indian Ocean",
    "short": "Indian Ocean",
    "craft": "Meteosat-9",
    "lon": 45.5,
    "source": "eumetsat",
    "layer": "msg_iodc:rgb_naturalenhncd",
    "diskExtent": {
      "south": -77,
      "west": -35.5,
      "north": 77,
      "east": 118.5
    },
    "views": [
      {
        "id": "earth",
        "code": "FD",
        "label": "Whole Earth",
        "group": "whole",
        "shape": "disk",
        "cadence": 60,
        "offset": 0,
        "sizes": [
          [
            678,
            678,
            0,
            0
          ],
          [
            1200,
            1200,
            0,
            0
          ],
          [
            1808,
            1808,
            0,
            0
          ],
          [
            2700,
            2700,
            0,
            0
          ]
        ]
      },
      {
        "id": "india",
        "code": "IN",
        "label": "India and South Asia",
        "group": "region",
        "shape": "rect",
        "cadence": 60,
        "offset": 0,
        "extent": {
          "south": 5,
          "west": 66,
          "north": 36,
          "east": 93
        },
        "sizes": [
          [
            600,
            689,
            0,
            0
          ],
          [
            1200,
            1378,
            0,
            0
          ],
          [
            1800,
            2067,
            0,
            0
          ]
        ],
        "bounds": [
          5,
          66,
          36,
          93
        ]
      },
      {
        "id": "middle-east",
        "code": "ME",
        "label": "Middle East",
        "group": "region",
        "shape": "rect",
        "cadence": 60,
        "offset": 0,
        "extent": {
          "south": 12,
          "west": 30,
          "north": 42,
          "east": 63
        },
        "sizes": [
          [
            600,
            545,
            0,
            0
          ],
          [
            1200,
            1091,
            0,
            0
          ],
          [
            1800,
            1636,
            0,
            0
          ]
        ],
        "bounds": [
          12,
          30,
          42,
          63
        ]
      }
    ]
  },
  {
    "id": "himawari",
    "code": "HIMAWARI9",
    "name": "Himawari",
    "craft": "Himawari-9",
    "lon": 140.7,
    "source": "cira",
    "views": [
      {
        "id": "earth",
        "code": "FD",
        "label": "Whole Earth",
        "group": "whole",
        "shape": "disk",
        "cadence": 10,
        "offset": 0,
        "box": [
          0,
          0,
          1,
          1
        ],
        "sizes": [
          [
            688,
            688,
            0,
            0
          ],
          [
            1376,
            1376,
            0,
            0
          ],
          [
            2752,
            2752,
            0,
            0
          ],
          [
            5504,
            5504,
            0,
            0
          ]
        ]
      },
      {
        "id": "japan",
        "code": "JAPAN",
        "label": "Japan and Korea",
        "group": "region",
        "shape": "rect",
        "cadence": 10,
        "offset": 0,
        "box": [
          0.3602,
          0.109,
          0.5452,
          0.2218
        ],
        "sizes": [
          [
            509,
            310,
            0,
            0
          ],
          [
            1018,
            621,
            0,
            0
          ],
          [
            2036,
            1242,
            0,
            0
          ]
        ],
        "bounds": [
          30,
          124,
          46,
          146
        ]
      },
      {
        "id": "east-asia",
        "code": "EAST-ASIA",
        "label": "East Asia",
        "group": "region",
        "shape": "rect",
        "cadence": 10,
        "offset": 0,
        "box": [
          0.1593,
          0.0874,
          0.588,
          0.3318
        ],
        "sizes": [
          [
            590,
            336,
            0,
            0
          ],
          [
            1180,
            673,
            0,
            0
          ],
          [
            2360,
            1345,
            0,
            0
          ],
          [
            4719,
            2690,
            0,
            0
          ]
        ],
        "bounds": [
          18,
          100,
          50,
          150
        ]
      },
      {
        "id": "southeast-asia",
        "code": "SOUTHEAST-ASIA",
        "label": "Southeast Asia",
        "group": "region",
        "shape": "rect",
        "cadence": 10,
        "offset": 0,
        "box": [
          0.1089,
          0.2883,
          0.4019,
          0.6089
        ],
        "sizes": [
          [
            403,
            441,
            0,
            0
          ],
          [
            806,
            882,
            0,
            0
          ],
          [
            1613,
            1765,
            0,
            0
          ],
          [
            3225,
            3529,
            0,
            0
          ]
        ],
        "bounds": [
          -11,
          95,
          22,
          130
        ]
      },
      {
        "id": "australia",
        "code": "AUSTRALIA",
        "label": "Australia",
        "group": "region",
        "shape": "rect",
        "cadence": 10,
        "offset": 0,
        "box": [
          0.2165,
          0.5872,
          0.6495,
          0.8852
        ],
        "sizes": [
          [
            596,
            410,
            0,
            0
          ],
          [
            1192,
            820,
            0,
            0
          ],
          [
            2383,
            1640,
            0,
            0
          ],
          [
            4766,
            3280,
            0,
            0
          ]
        ],
        "bounds": [
          -45,
          110,
          -9,
          156
        ]
      },
      {
        "id": "west-pacific",
        "code": "WEST-PACIFIC",
        "label": "Western Pacific",
        "group": "region",
        "shape": "rect",
        "cadence": 10,
        "offset": 0,
        "box": [
          0.2981,
          0.1813,
          0.7762,
          0.5
        ],
        "sizes": [
          [
            329,
            219,
            0,
            0
          ],
          [
            658,
            439,
            0,
            0
          ],
          [
            1316,
            877,
            0,
            0
          ],
          [
            2631,
            1754,
            0,
            0
          ],
          [
            5263,
            3508,
            0,
            0
          ]
        ],
        "bounds": [
          0,
          120,
          35,
          170
        ]
      }
    ]
  }
];
