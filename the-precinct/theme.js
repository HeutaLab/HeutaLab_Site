// The Precinct theme: everything specific to the noir workshop lives here.
// The pages (home, References, Comic builder) and worker.js all import it,
// so a different theme later (a primary-school comic, say) is a new copy
// of this file rather than a rebuild of the site.

const IMG = '/the-precinct/img/';

export default {
  id: 'noir',
  name: 'The Precinct',
  houseStyle: 'Al Williamson, 1940s film noir comic book, black and white ink illustration',

  // The four characters. `look` is the fixed description attendees repeat in
  // every prompt: it is what keeps a character recognisable picture to picture.
  cast: [
    {
      id: 'commissioner', name: 'The Commissioner', tag: 'The villain',
      story: 'The bad guy. He runs the precinct and uses the Disillusioned Detective as his muscle.',
      look: 'a heavy-set man in his sixties, jowly face and a permanent scowl, a three-piece suit under a long belted trench coat, a grey fedora with a dark band, hands deep in his coat pockets',
      img: IMG + 'ref/chief.jpg',
    },
    {
      id: 'detective', name: 'The Detective', tag: 'The good guy',
      story: 'The hero. Straight, stubborn and still sure the truth matters. He is the one the Femme Fatale really wants.',
      look: 'a lean square-jawed man in his late twenties, clean-shaven with a steady clear-eyed gaze, a neat dark suit with a detective badge on the coat, pale shirt and tie done up tight, a fedora worn straight',
      img: IMG + 'ref/cop-badge.jpg',
    },
    {
      id: 'disillusioned', name: 'The Disillusioned Detective', tag: 'The bad cop',
      story: 'A brute, and the Commissioner’s pawn, though he doesn’t know it yet. He is in love with the Femme Fatale.',
      look: 'a big heavy-set man in his forties, bare-headed with slicked-back dark hair, a heavy brow over tired, half-lidded eyes and a hard glare, a rumpled dark suit and a loosened tie',
      img: IMG + 'ref/boss.jpg',
    },
    {
      id: 'femme', name: 'The Femme Fatale', tag: 'The one who knows',
      story: 'She admires the Disillusioned Detective, but it is the Detective she wants.',
      look: 'a woman in her thirties, shoulder-length 1940s waves, dark lipstick and arched brows, small drop earrings, a fitted pale jacket with wide lapels, a cool sideways glance',
      img: IMG + 'ref/bar.jpg',
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
    'bar':           ['A woman with waved hair in a bar booth facing a man in a dark suit, two men watching behind', 'character', 'femme'],
    'blonde-green':  ['Close-up of a blonde woman with dark lipstick, eyes lowered, in green tones', 'character', 'femme'],
    'blonde-yellow': ['A blonde woman in a yellow jacket looking down, lit buildings behind her', 'character', 'femme'],
    'rain-street':   ['A rain-soaked town street at night: a parked car, a streetlamp and a figure in a doorway', 'setting'],
    'office':        ['An empty office with desks, filing cabinets and a city skyline through the windows', 'setting'],
    'sunset-street': ['A city street at sunset with lit windows, street lamps and a parked black car', 'setting'],
    'fedora':        ['A stern man in a fedora and trench coat, close-up', 'character', 'commissioner'],
    'boss':          ['A heavy-set man with slicked-back hair in a suit, glaring', 'character', 'disillusioned'],
    'cop-badge':     ['A square-jawed man in a hat with a badge on his coat, light flaring behind him', 'character', 'detective'],
    'lamp-man':      ['A man in a suit under a street lamp against a yellow sky', 'character', 'detective'],
    'blue-man':      ['A man in a dark coat looking back down a blue night street', 'character'],
    'houses':        ['A street of old houses under a yellow sky, a man walking and a parked car', 'setting'],
    'green-city':    ['A man on a balcony with a green-tinted city skyline behind him', 'setting'],
    'walking-woman': ['A woman in a yellow coat walking past parked cars at dusk', 'character'],
    'teal-woman':    ['A woman with long wavy hair in teal and blue tones, looking sideways', 'character', 'femme'],
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

  // Pictures offered in the comic builder's library.
  library: ['chief','hat-woman','cop','bar','blonde-green','blonde-yellow','rain-street','office','sunset-street','fedora','boss',
    'cop-badge','lamp-man','blue-man','houses','green-city','walking-woman','teal-woman','detective-car','sunset-man',
    'walking-rain','hat-green'],
};
