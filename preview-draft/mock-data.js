// Project ▸ Book ▸ Scene. Characters & continuity live on the BOOK.
const DATA = {
  projects: [
    {
      id: 'p1',
      name: 'Tidewater Cycle',
      books: [
        {
          id: 'b1',
          name: 'The Salt Road',
          characters: [
            {
              name: 'Marisol Vane',
              role: 'Lead',
              bio: 'Salt-smuggler of the drowned channels. Her scarred left hand keeps its distance from any flame.',
            },
            {
              name: 'Elias Corr',
              role: 'Foil',
              bio: 'Customs inspector of the Tidewatch. He counts everything and believes almost none of it — and does not yet know her name.',
            },
            {
              name: 'Dun',
              role: 'Ally',
              bio: 'The ferryman, who speaks only in tolls.',
            },
            {
              name: 'Sister Wren',
              role: 'Ally',
              bio: 'Keeps the tide-chapel and the names of the drowned. Owes Marisol a silence.',
            },
          ],
          continuity: [
            {
              title: 'The gate closes at dusk',
              body: 'The bargain scene runs on a single hour — the closing gate is the clock beneath every line.',
              where: 'set in Scene 01',
            },
            {
              title: 'The scarred hand',
              body: 'Since the cistern fire. She shields it from the lantern.',
              where: 'established early',
              soft: true,
            },
            {
              title: 'Her true name',
              body: 'Elias must not learn it before the closing scenes.',
              where: 'payoff · Names for the Drowned',
            },
            {
              title: 'The “iron tide”',
              body: 'The sea reads as old iron at dusk — hold that metal note whenever the tide turns.',
              where: 'Scene 02 · ¶1',
              at: { s: 1, p: 0 },
            },
            {
              title: 'Scarred hand near flame',
              body: 'She keeps it low, away from the lantern here — consistent with the cistern burn.',
              where: 'Scene 02 · ¶4',
              at: { s: 1, p: 3 },
            },
          ],
          scenes: [
            {
              title: 'The Tidewatch Gate',
              status: 'done',
              paras: [
                'The gate had teeth. Everyone said so, though only the drowned could name them.',
                'Marisol waited in the lee of the customs house until the bells went quiet, counting the inspectors the way her mother had taught her to count debts — twice, and then once more for the one you missed.',
              ],
            },
            {
              title: 'Marisol’s Bargain',
              status: 'drafting',
              paras: [
                'The tide came in the color of old iron, and with it came the smell of the cisterns — brine and rust and something sweeter underneath that Marisol had learned, over years, not to name.',
                'Elias Corr was waiting at the third mooring, exactly where the letter said he would be. He had the look of a man who counted things for a living: salt, coin, the small dishonesties of everyone who passed his gate.',
                '“You’re late,” he said, without turning. “The Watch closes at dusk. You know this.”',
                '“I know the tide better than the Watch does.” She let the skiff drift the last few feet, keeping her scarred hand low against the gunwale, away from the lantern. “And the tide says we have an hour.”',
                'He turned then. Whatever he had expected, it was not her — not the ledger she carried, not the name she had not yet given him, not the bargain already forming in the space between them like frost on glass.',
              ],
            },
            {
              title: 'Ash in the Cistern',
              status: 'drafting',
              paras: [
                'The fire had left the cistern years ago, but the ash never fully went. It gathered in the low places, and Marisol’s hand remembered every one of them.',
                'She descended without a light. Down here, light was a way of announcing your debts to whoever waited in the dark.',
              ],
            },
            {
              title: 'The Long Ford',
              status: 'outline',
              paras: ['This scene waits, outlined but unwritten.'],
            },
            {
              title: 'Names for the Drowned',
              status: 'empty',
              paras: ['This page is still empty.'],
            },
            {
              title: 'The Cartographer’s Debt',
              status: 'empty',
              paras: ['This page is still empty.'],
            },
          ],
        },
        {
          id: 'b2',
          name: 'The Drowned Coast',
          characters: [
            {
              name: 'Marisol Vane',
              role: 'Lead',
              bio: 'Older now, and captaining rather than smuggling. Still counts every debt twice.',
            },
            {
              name: 'The Cartographer',
              role: 'Foil',
              bio: 'Maps a coast that keeps rearranging itself. Trades in a certainty he does not have.',
            },
            {
              name: 'Sister Wren',
              role: 'Ally',
              bio: 'Followed the tide-chapel south; the names came with her.',
            },
          ],
          continuity: [
            {
              title: 'The coast redraws itself',
              body: 'After every storm. No map older than a season can be trusted.',
              where: 'series rule',
            },
            {
              title: 'Marisol commands the Kittiwake',
              body: 'Not a smuggler’s skiff any longer.',
              where: 'established Scene 01',
              soft: true,
            },
          ],
          scenes: [
            {
              title: 'Salt and Ash',
              status: 'drafting',
              paras: [
                'The coast had moved again in the night, the way it always did after a hard blow, and the Cartographer stood at the rail cursing his own maps.',
                '“You could just ask the water,” Marisol said. “It never lies. It only forgets.”',
              ],
            },
            {
              title: 'The Kittiwake',
              status: 'outline',
              paras: [
                'Outlined: Marisol takes on a cargo she is forbidden to inspect.',
              ],
            },
            {
              title: 'What the Tide Kept',
              status: 'empty',
              paras: ['This page is still empty.'],
            },
          ],
        },
      ],
    },
    {
      id: 'p2',
      name: 'Standalones',
      books: [
        {
          id: 'b3',
          name: 'Ash & Ember',
          characters: [
            {
              name: 'Ren',
              role: 'Lead',
              bio: 'A lamplighter in a city that has forgotten why it fears the dark.',
            },
            {
              name: 'Hale',
              role: 'Foil',
              bio: 'Sells oil by day and rumours by night.',
            },
          ],
          continuity: [
            {
              title: 'The lamps must never all go dark at once',
              body: 'Ren has believed this since childhood.',
              where: 'premise',
            },
          ],
          scenes: [
            {
              title: 'Last Light',
              status: 'drafting',
              paras: [
                'Ren climbed the seventh lamp as the bells struck six, and for the first time in her life the wick would not catch.',
              ],
            },
            {
              title: 'The Long Dark',
              status: 'empty',
              paras: ['This page is still empty.'],
            },
          ],
        },
      ],
    },
  ],
};

// seed "last edited" ordinals (higher = more recent); bumped to Date.now() as you type
const SEED = { b1: [30, 50, 40, 10, 0, 0], b2: [20, 5, 0], b3: [10, 0] };

// style_rules (book-level): title + content
const STYLE = {
  b1: [
    {
      title: 'Voice',
      content:
        'Close third, past tense. Stay in Marisol’s head — no head-hopping inside a scene.',
    },
    {
      title: 'Dialogue',
      content:
        'Curly quotes. Em dash for interruption, ellipsis for trailing off.',
    },
    {
      title: 'Numbers',
      content:
        'Spell out under a hundred; numerals for coin and cargo weights.',
    },
    {
      title: 'Place names',
      content:
        'The Tidewatch, the drowned channels, the cisterns — lowercase “the” except at a sentence start.',
    },
  ],
  b2: [
    {
      title: 'Framing tense',
      content:
        'Present tense in the framing scenes only; the past-tense body carries the story.',
    },
    {
      title: 'Ships',
      content: 'Vessels set in italics — the Kittiwake, the Gannet.',
    },
  ],
  b3: [
    {
      title: 'Keep it lean',
      content: 'Short sentences. This is a thriller, not a tapestry.',
    },
  ],
};
