// The Precinct theme: everything specific to the noir workshop lives here.
// The pages (home, References, Comic builder) and worker.js all import it,
// so a different theme later (a primary-school comic, say) is a new copy
// of this file rather than a rebuild of the site.

const IMG = '/the-precinct/img/';

export default {
  id: 'noir',
  name: 'The Precinct',
  houseStyle: 'Al Williamson, 1940s film noir comic book, black and white ink illustration',

  // The four characters. `name` is what the site calls them everywhere; `short`
  // fits a button; `role` is the part they play. `look` is the fixed description
  // attendees repeat in every prompt: it keeps a character recognisable picture
  // to picture.
  cast: [
    {
      id: 'commissioner', name: 'Commissioner Harlan Vance', short: 'Harlan Vance', role: 'The Commissioner', tag: 'The villain',
      story: 'The bad guy. He runs the precinct and uses Sergeant Frank Rourke as his muscle.',
      look: 'a heavy-set man in his sixties, jowly face and a permanent scowl, a three-piece suit under a long belted trench coat, a grey fedora with a dark band, hands deep in his coat pockets',
      img: IMG + 'ref/vance-card.jpg',
    },
    {
      id: 'detective', name: 'Edward Novak', short: 'Edward Novak', role: 'The Detective', tag: 'The good guy',
      story: 'The hero. Straight, stubborn and still sure the truth matters. He is the one Vera Sinclair really wants.',
      look: 'a lean square-jawed man in his late twenties, clean-shaven, steel-rimmed round 1940s spectacles with thin wire frames and clear lenses, a steady clear-eyed gaze, a neat dark suit jacket with a detective badge pinned on the chest, pale shirt and dark tie done up tight, a dark fedora worn straight',
      img: IMG + 'ref/novak-card.jpg',
    },
    {
      id: 'disillusioned', name: 'Sergeant Frank Rourke', short: 'Frank Rourke', role: 'The Disillusioned Detective', tag: 'The bad cop',
      story: 'A brute with a short fuse, always one word from exploding. He is Vance’s pawn, though he doesn’t know it yet, and he is in love with Vera Sinclair.',
      look: 'a big, heavy-set, muscular man in his forties, square stubbled jaw and dark hair swept back, a white shirt open at the collar with the sleeves rolled up over thick forearms, braces, a loosened dark tie, dark pleated trousers, a shoulder holster, his jacket slung over one shoulder, a matchstick clamped in the corner of his mouth, fists clenched, always on the verge of exploding with rage',
      // From Glenn's character sheet: how his face changes across the story.
      arc: ['lazy smirk', 'sullen glower', 'predatory grin', 'snarling rage', 'flicker of conscience'],
      img: IMG + 'ref/rourke-card.jpg',
    },
    {
      id: 'femme', name: 'Vera Sinclair', short: 'Vera Sinclair', role: 'The Femme Fatale', tag: 'The one who knows',
      story: 'She admires Frank Rourke, but it is Edward Novak she wants.',
      look: 'a woman in her thirties, shoulder-length platinum-blonde hair in soft 1940s waves, a beauty mark on her cheek, dark lipstick and arched brows, pearl drop earrings, a long black sleeveless evening gown, long pale evening gloves, a black fur stole over one arm, black heels, a cool sideways glance',
      img: IMG + 'ref/vera-card.jpg',
    },
  ],

  // Who wants what from whom, shown under the cast so nobody mixes them up.
  relations: [
    ['commissioner', 'uses', 'disillusioned'],
    ['disillusioned', 'is in love with', 'femme'],
    ['femme', 'admires', 'disillusioned'],
    ['femme', 'wants', 'detective'],
  ],

  // Monochrome plus at most one accent family. `phrase` goes into prompts near verbatim.
  palettes: {
    bw:     { label: 'Black & white', dot: 'linear-gradient(90deg,#111 50%,#ddd 50%)', ink: '#e6e6e6', sample: IMG + 'pal-bw.jpg',
              note: 'Ink and grey wash. The easiest to hold across panels.',
              phrase: 'black and white ink only, grey wash tones, no colour' },
    yellow: { label: 'Yellow', dot: '#f2c744', ink: '#f2c744', sample: IMG + 'pal-yellow.jpg',
              note: 'The house style. Say what glows: lamps, windows, a taxi.',
              phrase: 'black ink and grey tones with a single yellow accent (lamplight, lit windows, a taxi), no other colours' },
    green:  { label: 'Green', dot: '#4f8a62', ink: '#7fc08e', sample: IMG + 'pal-green.jpg',
              note: 'A whole-image tint. Describe the shadows and highlights, not objects.',
              phrase: 'deep green-black shadows, muted teal-green midtones and pale green highlights, no other colours' },
    blue:   { label: 'Blue', dot: '#2d5a9a', ink: '#7fa6e0', sample: IMG + 'pal-blue.jpg',
              note: 'Midnight rain. Cold highlights, blue-black shadows.',
              phrase: 'midnight blue and blue-black shadows with pale cold highlights, no other colours' },
    red:    { label: 'Red & amber', dot: '#d4552c', ink: '#f07a4a', sample: IMG + 'pal-red.jpg',
              note: 'Sunset, neon, fire. Keep it to one or two hot spots.',
              phrase: 'black and charcoal with red-orange and amber accents (sunset, neon, fire), no other colours' },
  },
  defaultPalette: 'yellow',

  // How the References page steps from watching to working alone.
  modes: {
    demo:    { label: 'Demo',    sub: 'See it done',
               card: 'A worked example. Every answer is filled in, ready to talk through.',
               hint: 'Demo: a worked example, read aloud. This is how a practised eye reads a picture.' },
    guide:   { label: 'Guide',   sub: 'Work it together',
               card: 'Agree an answer as a group, then reveal each one and compare.',
               hint: 'Guide: agree an answer together first, then reveal the model one. Did you spot something it missed?' },
    create:  { label: 'Create',  sub: 'Your turn',
               card: 'Answer in your own words, then send it to the briefing desk.',
               hint: 'Create: answer in your own words. Short phrases are fine. Your answers build the description below.' },
    explore: { label: 'Explore', sub: 'Any picture',
               card: 'Any picture, any level. Shuffle until one grabs you.',
               hint: 'Explore: any picture, any level. Shuffle, answer what you like, and send it to the desk.' },
  },

  // Reference pictures: alt text, character or setting, and (for character
  // pictures that fit one) the cast member it could stand in for.
  refs: {
    'chief':         ['A heavy-set police chief in a fedora and long trench coat, hands in his pockets, scowling', 'character', 'commissioner'],
    'hat-woman':     ['A woman in a black wide-brimmed hat glancing over her shoulder against a yellow sky', 'character'],
    'cop':           ['A uniformed police officer in a peaked cap with a badge and a star on his collar', 'character'],
    'bar':           ['A woman with waved hair in a bar booth facing a man in a dark suit, two men watching behind', 'character'],
    'blonde-green':  ['Close-up of a blonde woman with dark lipstick, eyes lowered, in green tones', 'character'],
    'blonde-yellow': ['A blonde woman in a yellow jacket looking down, lit buildings behind her', 'character'],
    'rain-street':   ['A rain-soaked town street at night: a parked car, a streetlamp and a figure in a doorway', 'setting'],
    'office':        ['An empty office with desks, filing cabinets and a city skyline through the windows', 'setting'],
    'sunset-street': ['A city street at sunset with lit windows, street lamps and a parked black car', 'setting'],
    'fedora':        ['A stern man in a fedora and trench coat, close-up', 'character', 'commissioner'],
    'boss':          ['A heavy-set man with slicked-back hair in a suit, glaring', 'character'],
    'novak-card':    ['A young man in round wire-rimmed glasses and a dark fedora, dark suit and tie, a badge on his jacket, a glow of light behind him', 'character', 'detective'],
    'vance-card':    ['A heavy-set older man in a fedora and belted trench coat over a three-piece suit, hands in his pockets, staring coldly out of the dark', 'character', 'commissioner'],
    'vera-card':     ['A woman with shoulder-length platinum-blonde waves, pearl earrings and a black evening gown, looking back over her shoulder with a knowing smile', 'character', 'femme'],
    'rourke-card':   ['A huge muscular man in shirtsleeves, braces and a loosened tie, teeth bared around a matchstick, glaring out of the dark', 'character', 'disillusioned'],
    'rourke-front':  ['A huge muscular man in shirtsleeves and braces, a holster at his side and a jacket over his shoulder, scowling', 'character', 'disillusioned'],
    'rourke-snarl':  ['Close-up of a dark-haired man baring his teeth around a cigarette, face half in shadow', 'character', 'disillusioned'],
    'rourke-rage':   ['A stubbled man snarling with rage, a matchstick clamped in his teeth', 'character', 'disillusioned'],
    'rourke-sheet':  ['A character sheet for Frank Rourke: front, side and back views, and five expressions from lazy smirk to flicker of conscience', 'character', 'disillusioned'],
    'cop-badge':     ['A square-jawed man in a hat with a badge on his coat, light flaring behind him', 'character', 'detective'],
    'lamp-man':      ['A man in a suit under a street lamp against a yellow sky', 'character', 'detective'],
    'blue-man':      ['A man in a dark coat looking back down a blue night street', 'character'],
    'houses':        ['A street of old houses under a yellow sky, a man walking and a parked car', 'setting'],
    'green-city':    ['A man on a balcony with a green-tinted city skyline behind him', 'setting'],
    'walking-woman': ['A woman in a yellow coat walking past parked cars at dusk', 'character'],
    'teal-woman':    ['A woman with long wavy hair in teal and blue tones, looking sideways', 'character'],
    'detective-car': ['A detective in a fedora glancing back at a sedan on a rainy street', 'character', 'detective'],
    'sunset-man':    ['A man in a hat and coat against a red-orange sunset', 'character'],
    'walking-rain':  ['A man walking alone along a wet pavement in blue rain', 'setting'],
    'hat-green':     ['A man in a fedora and tie under city lights, in green tones', 'character'],
  },
  refPath: name => IMG + 'ref/' + name + '.jpg',

  // Three ways of looking. Each level has a Demo picture with worked answers,
  // a Guide picture with answers to reveal, and a Create picture left blank.
  levels: {
    basic: {
      name: 'Basic', lens: 'What do you see?', short: 'what do you see?',
      blurb: 'Name what is there. No guessing and no story yet: only what you could point at.',
      qs: [['see','What do you see?','What I see'], ['accessories','What accessories do you see?','Accessories'],
           ['materials','What materials do you see?','Materials'], ['colours','What colours do you see?','Colours'],
           ['emotions','What emotions do you see?','Emotion'], ['expressions','What expressions do you see?','Expression']],
      demo: ['chief', {
        see: 'A heavy-set police chief standing square to us, hands deep in his coat pockets.',
        accessories: 'A fedora with a dark band, and a tie.',
        materials: 'A long trench coat with wide lapels and epaulettes, a buttoned waistcoat, a felt hat.',
        colours: 'Black, white and greys only. Ink shading, no colour at all.',
        emotions: 'Displeasure. He has already made up his mind about you.',
        expressions: 'A scowl: brows pulled down, eyes narrowed, mouth turned down at the corners.' }],
      guide: ['hat-woman', {
        see: 'A woman looking back over her shoulder, with dark city buildings behind her.',
        accessories: 'A black hat with a flat crown and a wide brim.',
        materials: 'A soft sleeveless top; a stiff felt hat.',
        colours: 'A flat bright yellow sky, black silhouettes, warm brown skin, an orange top.',
        emotions: 'Wary and guarded, maybe challenging.',
        expressions: 'A sideways glance, lips slightly parted, one brow a little raised.' }],
      create: 'cop',
    },
    medium: {
      name: 'Medium', lens: 'The details', short: 'the details',
      blurb: 'Zoom in. These are the details that decide whether the AI draws your character or a stranger.',
      qs: [['hair','Hair style','Hair'], ['clothing','Clothing','Clothing'], ['makeup','Makeup','Makeup'],
           ['accessories','Accessories','Accessories'], ['jewellery','Jewellery','Jewellery'],
           ['angle','Camera angle','Camera angle'], ['lighting','Lighting','Lighting'], ['background','Background','Background']],
      demo: ['bar', {
        hair: 'Shoulder-length 1940s waves, swept back from the face, full at the sides.',
        clothing: 'A pale jacket with wide lapels over a dark top and an open-collared blouse. He wears a dark suit.',
        makeup: 'Dark lipstick, arched brows, lined eyes.',
        accessories: 'Glasses of dark drink and a glass carafe of water on the table.',
        jewellery: 'Small drop earrings.',
        angle: 'Eye level, a medium shot over the man’s shoulder, so we sit in on the conversation.',
        lighting: 'Pendant lamps overhead: soft light on her face, his half in shadow.',
        background: 'A booth in a bar or diner, a window partition, two men in suits watching.' }],
      guide: ['blonde-green', {
        hair: 'Long blonde waves falling past the shoulders, parted to one side.',
        clothing: 'A green jacket with a wide lapel.',
        makeup: 'Very dark lipstick, winged eyeliner, heavy lids.',
        accessories: 'None visible, and that is worth saying in a prompt: “no hat, no props”.',
        jewellery: 'None visible.',
        angle: 'A close-up from slightly above, looking down at her.',
        lighting: 'Hard light from the upper left; half her face falls into shadow.',
        background: 'Dark teal with rough brush strokes. No setting at all.' }],
      create: 'blonde-yellow',
    },
    advanced: {
      name: 'Advanced', lens: 'The world', short: 'the world',
      blurb: 'Step back. Mood, place and time are what make separate panels feel like one story.',
      qs: [['mood','Mood','Mood'], ['setting','Setting','Setting'], ['location','Location','Location'],
           ['time','Time of day','Time of day'], ['season','Season','Season'], ['weather','Weather','Weather'],
           ['genre','Genre','Genre'], ['style','Style','Style'], ['era','Era','Era']],
      demo: ['rain-street', {
        mood: 'Lonely and uneasy. Someone is waiting, and we don’t know for what.',
        setting: 'An empty main street: a parked car, a streetlamp, one figure in a doorway.',
        location: 'A small American town: low shopfronts on the left, a brick building on the right.',
        time: 'Night.',
        season: 'Late autumn or winter: the tree branches are bare.',
        weather: 'Heavy rain, with the road shining under it.',
        genre: 'Crime noir.',
        style: 'Flat graphic comic art: hard black shapes and a limited blue palette.',
        era: '1940s to 1950s, going by the car’s rounded shape.' }],
      guide: ['office', {
        mood: 'Quiet and orderly, as if everyone has just stepped out.',
        setting: 'An office: desks, swivel chairs, filing cabinets, shelves of box files.',
        location: 'High up in a city building, with a skyline and a spired tower through the windows.',
        time: 'Daytime. Light floods in and throws hard shadows across the floor.',
        season: 'Nothing tells you. That is a gap to fill in your own prompt.',
        weather: 'Hard to say: the sky is grey, but the light is strong.',
        genre: 'Detective or police drama.',
        style: 'Detailed ink illustration with heavy black shadows, in black and white.',
        era: 'Hard to pin down: the furniture could be anywhere from the 1940s to the 1970s. Another gap to fill: name the era.' }],
      create: 'sunset-street',
    },
  },

  // The workshop as a game: each tier is a level, unlocked by a code the
  // facilitator announces from the stage. worker.js checks the code on every
  // request; the page only uses these for names and intros.
  game: [
    { level: 1, tier: 'basic', name: 'Rookie', task: 'One character portrait.',
      intro: 'Rookie: one face, one case. A single portrait, lit like it matters.' },
    { level: 2, tier: 'medium', name: 'Detective', task: 'The same face in a room.',
      intro: 'Detective: same face, new room. The anchor paragraph goes in word for word, every time, or the face walks off the job.' },
    { level: 3, tier: 'advanced', name: 'Commissioner', task: 'A three-panel shot list.',
      intro: 'Commissioner: three panels, one story. Work out the shots with an AI as your partner before anything gets drawn. The pictures are optional; the plan is not.' },
  ],

  // What the desk hands out when the AI is busy or down: stock briefs from the
  // files, one per tier and subject. {palette} becomes the palette phrase and
  // {who} (or {Who}, capitalised) the picked character's look (or DEFAULT_WHO in worker.js).
  stockBriefs: {
    character: {
      basic: {
        anchor: '',
        prompts: ['A character reference sheet of {who}, full body, standing square to the viewer, one clear guarded expression. 1940s film noir comic book, black and white ink illustration with fine hatching and one hard light from the upper left. Limited palette: {palette}. Plain pale background. No text, no captions, no speech balloons, no other people.'],
        why_this_works: 'Era, medium and one named light source do most of the work: without them, image tools drift to a modern colour comic. The plain background keeps the tool from inventing a scene around your character.',
        platform_notes: 'Gemini needs the "no text, no captions" line most; ChatGPT and Copilot follow it more readily but may need "flat ink illustration, not digital painting".',
        watch_for: 'Check the colours first: any colour outside your palette means the palette line was ignored.',
      },
      medium: {
        anchor: '1940s film noir comic book, black and white ink illustration with fine hatching. {Who}. Limited palette: {palette}. No text, no captions, no speech balloons.',
        prompts: ['The character stands behind a wide wooden desk in a dim office at night, venetian blinds throwing striped shadows across the wall, a desk lamp the only light.',
                  'The character waits in the doorway of a rain-soaked alley at night, a single streetlamp behind, a long shadow stretched across the wet cobbles.'],
        why_this_works: 'The anchor carries the character and the style, so paste it word for word into both prompts. Each prompt adds only the room, which is the one thing that should change.',
        platform_notes: 'On ChatGPT, upload the first picture back in before the second prompt; on Gemini, stay in the same chat so it can hold details.',
        watch_for: 'Put the two pictures side by side: is it the same face and the same coat, or a stranger in similar clothes?',
      },
      advanced: {
        anchor: '1940s film noir comic book, black and white ink illustration with fine hatching, strong single light source. {Who}. Limited palette: {palette}. No text, no captions, no speech balloons.',
        prompts: ['Panel 1, wide establishing shot: a rain-soaked city street at night, the character stands small under a streetlamp outside the precinct steps.',
                  'Panel 2, medium shot: the character climbs the precinct steps, looking back over one shoulder, a lit window above.',
                  'Panel 3, close-up: the character\u2019s face half in shadow at the office door, one hand on the handle, eyes narrowed.'],
        why_this_works: 'A shot list moves the camera closer each panel (wide, medium, close) while the anchor keeps the character and palette fixed. Plan the story first with an AI partner; these three shots are only a starting skeleton.',
        platform_notes: 'Midjourney holds a character best with an image reference or --seed; the free chat tools need the anchor pasted in full every time.',
        watch_for: 'Check the three panels read in order without words: can someone else tell you what happened?',
      },
    },
    setting: {
      basic: {
        anchor: '',
        prompts: ['A wide establishing shot of an empty 1940s police detective office at night, empty of people. Wooden desks with typewriters and telephones, filing cabinets, a coat stand, tall windows with venetian blinds and rain on the glass, a single desk lamp throwing hard shadows. 1940s film noir comic book, black and white ink illustration with fine hatching. Limited palette: {palette}. No characters, no text, no dialogue, no captions.'],
        why_this_works: 'Saying "empty of people" and "no characters, no text" stops chat tools from filling the room with a whole scene. Concrete furniture and one light source give the tool something to draw instead.',
        platform_notes: 'Gemini is the most likely to add people and captions anyway; ChatGPT and Copilot usually respect the negative line.',
        watch_for: 'Look for people, speech balloons or captions: tested Gemini runs added all three when the prompt did not forbid them.',
      },
      medium: {
        anchor: 'Inside the same 1940s city police precinct building at night, empty of people. Checkerboard ceiling tiles, tall multi-pane windows with venetian blinds, rain on the glass, green-shaded desk lamps. 1940s film noir comic book, black and white ink illustration with fine hatching. Limited palette: {palette}. No characters, no text, no dialogue, no captions.',
        prompts: ['The detectives’ bullpen: rows of wooden desks with typewriters and telephones, filing cabinets along the back wall, a wide establishing shot.',
                  'The chief’s private office: one large desk facing the door, a leather chair, a framed city map on the wall, a wide establishing shot.'],
        why_this_works: 'The anchor repeats the details that make two rooms one building (ceiling, windows, lamps, weather). Each prompt adds a concrete layout line; in testing, the anchor alone was not enough.',
        platform_notes: 'Gemini tends to invent a detail such as rain and then keep it; ChatGPT benefits from uploading the first room as a reference.',
        watch_for: 'Check the windows and ceiling match across both rooms: those are the details that break first.',
      },
      advanced: {
        anchor: 'The same 1940s American city block at night in heavy rain, wet streets shining under streetlamps, brick buildings with fire escapes, empty of people. 1940s film noir comic book, black and white ink illustration with fine hatching. Limited palette: {palette}. No characters, no text, no dialogue, no captions.',
        prompts: ['Wide street shot from the corner: the whole block, a row of shopfronts with dark windows, streetlamps receding into the rain.',
                  'The alley beside the corner building: bins, a fire escape, a single bulb over a side door.',
                  'Low angle along the kerb: three parked 1940s sedans, rain bouncing off their roofs, the streetlamps reflected in puddles.'],
        why_this_works: 'A location sheet holds one time of day, one weather and one palette in the anchor, so separate shots read as one place. Each shot changes only the camera.',
        platform_notes: 'Midjourney keeps a location best with --seed or an image reference; Gemini may drift to daylight unless night is repeated in every prompt.',
        watch_for: 'Check the time of day and the rain are in every shot: those are the first things to slip.',
      },
    },
  },

  // The desk's questions for each part of a description, used only if the AI
  // flags a part as missing but sends no questions of its own.
  gateQuestions: {
    see: 'What is actually in the picture: who or what, and what are they doing?',
    details: 'Look closer: what are they wearing or holding, and what is on their face?',
    world: 'Step back: where is this, and what time of day or weather does it feel like?',
  },

  // What the compare check falls back to when the AI can't answer in time.
  compareChecklist: [
    'Style: does it still look like 1940s ink, or has it gone modern, glossy or cartoon?',
    'Era: are the clothes, cars and rooms from the right decade?',
    'People: is anyone there you did not ask for?',
    'Text: any lettering, captions or speech balloons?',
    'Light: where does it come from, and is it the light you asked for?',
  ],

  // Pictures offered in the comic builder's library.
  library: ['chief','hat-woman','cop','bar','blonde-green','blonde-yellow','rain-street','office','sunset-street','fedora','boss',
    'cop-badge','lamp-man','blue-man','houses','green-city','walking-woman','teal-woman','detective-car','sunset-man',
    'walking-rain','hat-green','novak-card','vance-card','rourke-card','vera-card','rourke-front','rourke-snarl','rourke-rage','rourke-sheet'],

  // Colours for captions, balloons, thoughts and sound effects in the comic builder, taken from the palettes above.
  // fill: the box (or a sound effect's letters); text: the words; line: the outline.
  letterColours: {
    white:  { label: 'White',       fill: '#ffffff', text: '#111111', line: '#111111' },
    paper:  { label: 'Old paper',   fill: '#e9e0c8', text: '#111111', line: '#111111' },
    yellow: { label: 'Yellow',      fill: '#f2c744', text: '#111111', line: '#111111' },
    green:  { label: 'Green',       fill: '#7fc08e', text: '#111111', line: '#111111' },
    blue:   { label: 'Blue',        fill: '#7fa6e0', text: '#111111', line: '#111111' },
    red:    { label: 'Red & amber', fill: '#f07a4a', text: '#111111', line: '#111111' },
    black:  { label: 'Black',       fill: '#111111', text: '#f3eee0', line: '#f3eee0' },
  },

  // Page styles in the comic builder (Advanced). The builder holds each style's look (panel shapes, frames,
  // page colour, lettering); these are the words about it. `prompt` describes the look rather than naming the
  // artist: some AI tools refuse living artists' names, and putting a style into words is the skill being taught.
  pageStyles: [
    { key: 'williamson', name: '1940s · Williamson', era: '1940s–50s newspaper noir', title: 'Al Williamson',
      about: 'Even panels, clean frames and plenty of room: the newspaper-strip noir that Al Williamson and his generation drew. Every panel gets the same weight, so the story reads at a steady walk.',
      prompt: 'Black ink illustration with fine hatching, 1940s film-noir comic strip, clean lines, strong single light source.' },
    { key: 'ronin', name: '1980s · Ronin', era: 'Frank Miller, Ronin (1983)', title: 'Ronin strips',
      about: 'Frank Miller borrowed from Japanese manga and samurai films: thin, wide strips like a film screen. Time slows down, and a small movement across three strips feels huge.',
      prompt: 'Wide cinematic frame, loose expressive ink, muted colour washes, influenced by 1970s Japanese manga.' },
    { key: 'sincity', name: '1990s · Sin City', era: 'Frank Miller, Sin City (1991)', title: 'Sin City',
      about: 'Black page, no frames, pure black and white: shapes are cut out of shadow. Panels bleed into the dark, so the gutters disappear and the page reads as one image. Your pictures are inked black and white to match.',
      prompt: 'Stark black and white, no grey tones, heavy solid shadows, silhouettes, rain as white streaks, high contrast.' },
    { key: 'marvel', name: '1960s · Marvel', era: 'Jack Kirby and the 1960s Marvel Bullpen', title: 'Kirby dynamics',
      about: 'Jack Kirby made the page itself move: slanted cuts, a huge opening panel, bodies and sound effects bursting out. Stan Lee wrote and edited; the look is Kirby’s (with Ditko and Romita).',
      prompt: 'Dynamic action pose, dramatic foreshortening, bold thick outlines, bright flat colours, energy lines.' },
    { key: 'image', name: '1990s · Image', era: 'Image Comics and the 1990s', title: 'Image era',
      about: 'Big and loud: one picture fills the whole page, with smaller panels stacked on top at angles, thick white frames, and colour everywhere. Posters as much as stories.',
      prompt: 'Poster-style splash, extreme detail, glossy saturated colour, dramatic low camera angle, lens flare.' },
  ],

  // Sound effects offered in the comic builder, grouped by what makes the noise.
  sfx: [
    ['Gunfire', ['BLAM!', 'BANG!', 'RAT-A-TAT!', 'KA-BLAM!', 'PING!']],
    ['Fists', ['POW!', 'WHAM!', 'THUD!', 'CRACK!', 'OOF!']],
    ['Doors', ['SLAM!', 'KNOCK KNOCK', 'CREAK…', 'CLICK', 'CRASH!']],
    ['The street', ['SCREECH!', 'VROOM!', 'HONK!', 'SPLASH', 'WHEEE-OOO']],
    ['The office', ['RING RING!', 'CLACK CLACK', 'TICK TOCK', 'SHHH…', 'DING!']],
    ['Night', ['DRIP… DRIP…', 'PITTER PAT', 'BOOM!', 'HOOT', 'ZZZ']],
  ],
};
