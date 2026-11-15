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

export interface View {
  id: string;
  code: string;
  label: string;
  group: 'whole' | 'region';
  shape: 'disk' | 'rect';
  cadence: number;
  offset: number;
  sizes: Size[];
}

/** [width, height, trim bottom, trim left] */
export type Size = [number, number, number, number];

export interface Satellite {
  id: 'east' | 'west';
  code: string;
  name: string;
  craft: string;
  lon: number;
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
        ]
      },
      {
        "id": "ga",
        "code": "ga",
        "label": "Gulf of America",
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
        ]
      }
    ]
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
        ]
      }
    ]
  }
];
