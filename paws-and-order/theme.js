// Paws & Order theme: everything specific to this comic-making site lives here.
// Every page imports it, and so do ai.js and the Worker (paws-api/), so changing
// the cast, the places, the palettes or the wording means editing this one file.
//
// TO ADD YOUR OWN CHARACTER: drop a square picture into img/cast/ (for example
// hero.png), then fill in the matching entry in `cast` below (name, role, story,
// look) and delete the line  placeholder: true.  Until then the slot shows an
// empty frame. Children can also add characters in the browser (Meet the gang),
// and those stay on their own device.

// The Worker (paws-api/) imports this file too. It has no page address to build
// from and needs no pictures, so it gets the site path instead.
const IMG = typeof import.meta.url === 'string' ? new URL('./img/', import.meta.url).href : '/paws-and-order/img/';

export default {
  id: 'pound',
  name: 'Paws & Order',
  town: 'Doodleville',

  // The house style, in words. It describes the look instead of naming an artist,
  // because putting a style into words is the skill being taught.
  houseStyle: 'hand-drawn children’s comic book illustration, loose and playful, thick slightly wobbly black ink outlines, visible pencil sketch lines under the ink, flat bright colours with coarse halftone dot shading, hand-drawn paper texture, simple flat lighting, looks like it was drawn by a very talented ten-year-old',

  // The five stages of making a comic, in the one order used everywhere: the home
  // page, the progress trail on every page (journey.js), and the Teachers page.
  // `where` says whose screen the work happens on: this site, or the image tool.
  // `page` is the address from the Paws & Order folder. `subs` are the small steps
  // inside a stage, as [id, label].
  stages: [
    { n: 1, id: 'look', name: 'Look closely', short: 'Look', colour: '#ffd23f', where: 'site', page: 'references/',
      say: 'Study a picture and notice what is really there.',
      subs: [['watch', 'Watch'], ['together', 'Together'], ['solo', 'Your turn'], ['send', 'Send it on']] },
    { n: 2, id: 'choose', name: 'Choose and describe', short: 'Choose', colour: '#5ec8f2', where: 'site', page: 'picture/#choose',
      say: 'Pick a character or a place, your colours and a level. Then put it into exact words.',
      subs: [['who', 'Who or where'], ['colours', 'Colours'], ['level', 'Level and tool'], ['words', 'Your words'], ['brief', 'Read your brief']] },
    { n: 3, id: 'create', name: 'Create with AI', short: 'Create', colour: '#ff9a3c', where: 'tool', page: 'picture/#create',
      say: 'Get your prompt here. Then make the picture in your image tool.',
      subs: [['prompt', 'Get your prompt'], ['tool', 'Use your image tool'], ['back', 'Come back']] },
    { n: 4, id: 'check', name: 'Check and improve', short: 'Check', colour: '#b18cff', where: 'site', page: 'picture/#check',
      say: 'Compare what you asked for with what you got. Change one thing and try again.',
      subs: [['aim', 'Aim'], ['prompt', 'Prompt'], ['result', 'Result'], ['compare', 'Compare'], ['why', 'Why'], ['change', 'Change one thing']] },
    { n: 5, id: 'build', name: 'Build and share', short: 'Build', colour: '#7be08f', where: 'site', page: 'builder/',
      say: 'Put your pictures into a comic. Save it, print it or download it.',
      subs: [['page', 'Pick a page'], ['pictures', 'Add your pictures'], ['words', 'Add the words'], ['share', 'Save and share']],
      // How many pictures each level's page needs, said before and inside the Comic Maker.
      needs: { basic: 'A storybook page needs 1 to 6 pictures.', medium: 'A four-panel comic needs 4 pictures.', advanced: 'A super page needs 5 or 6 pictures.' } },
  ],

  // The image tools the prompts can be tuned for. Teachers: check the age rules
  // of any tool before children use it. Most ask for 13+ or a school account.
  platforms: [
    { id: 'gemini', label: 'Gemini' },
    { id: 'chatgpt', label: 'ChatGPT' },
    { id: 'copilot', label: 'Copilot' },
    { id: 'nanobanana', label: 'Nano Banana' },
    { id: 'any', label: 'Any image maker' },
  ],

  // The gang. `name` is what the site calls them; `short` fits a button; `role`
  // is the part they play; `tag` is a few words on the card. `look` is the fixed
  // description children repeat in every prompt: it keeps a character
  // recognisable from picture to picture. `arc` is optional: how their face
  // changes across a story. `file` is the picture in img/cast/.
  // sticker: their folder in img/stickers/ (Explore shows them standing, cut out, on their colour).
  cast: [
    { id: 'hero', file: 'hero.png', sticker: 'nettle', colour: '#5ec8f2', sheet: 'sheet-inspector-nettle',
      name: 'Inspector Nettle', short: 'Nettle', role: 'The Inspector', tag: 'The hero',
      story: 'Small, clever and stubborn. Always sure that the truth matters and that clues are hiding in plain sight.',
      look: 'a young hedgehog detective, cream face and tummy, brown spines, big round wire-rimmed glasses, a steady clear-eyed look, a neat blue jacket with a gold star badge, a tiny stripy tie done up tight, and a flat brown detective cap with little holes for the spines to poke through' },
    { id: 'buddy', file: 'buddy.png', sticker: 'rocco', colour: '#ff9a3c', sheet: 'sheet-sergeant-rocco',
      name: 'Sergeant Rocco', short: 'Rocco', role: 'The Sergeant', tag: 'The big grumbler',
      story: 'Big, loud and quick to explode, but a softie underneath. Does whatever Chief Grumbleton says, and is a huge fan of Vivi Velvet.',
      look: 'a huge grey rhinoceros with one big horn, a square jaw with stubble, a white shirt with the sleeves rolled up over thick arms, red braces, a loosened crooked tie, dark trousers, a walkie-talkie clipped to a shoulder strap, his jacket slung over one shoulder, and a lollipop stick clamped in the corner of his mouth',
      arc: ['lazy smirk', 'sulky glower', 'sneaky grin', 'roaring tantrum', 'flicker of kindness'] },
    { id: 'trouble', file: 'trouble.png', sticker: 'grumbleton', colour: '#ff6b5b', sheet: 'sheet-chief-grumbleton',
      name: 'Chief Grumbleton', short: 'Grumbleton', role: 'The Chief', tag: 'The grumpy one',
      story: 'Runs the Police Pound and bosses Sergeant Rocco about. Secretly wants to win the Golden Doughnut Trophy by cheating.',
      look: 'a huge grumpy walrus with a big droopy moustache and two short tusks, a permanent scowl, tiny scheming eyebrows, a too-small peaked chief\u2019s cap perched on his head, a long belted red-brown coat with big gold buttons over a stripy waistcoat, flippers stuffed deep in his coat pockets' },
    { id: 'helper', file: 'helper.png', sticker: 'vivi', colour: '#ff8fc0', sheet: 'sheet-vivi-velvet',
      name: 'Vivi Velvet', short: 'Vivi', role: 'The Star', tag: 'The one who knows',
      story: 'A glamorous singer who knows every secret in Doodleville. Sergeant Rocco adores her, but she likes clever Inspector Nettle best.',
      look: 'a tall pink flamingo with long skinny legs and a bendy neck, wavy feathers swept up on top of her head, a small beauty spot on her cheek, big star-shaped earrings, a long purple sparkly evening gown, long white gloves, a fluffy black feather boa over one wing, and a cool sideways glance with one raised eyebrow' },
    { id: 'flash', file: 'flash.png', sticker: 'flash', colour: '#ffd23f', sheet: 'sheet-flash-the-crow',
      name: 'Flash the Crow', short: 'Flash', role: 'The Reporter', tag: 'The nosy one',
      story: 'Always first to a story and never without a camera. Flash will print anything, as long as it is exciting.',
      look: 'a skinny black crow reporter with shiny feathers, a sharp yellow beak, big curious eyes, a squashed cream press hat with a card tucked in the band, a rumpled tan raincoat with the collar up, a chunky old-fashioned camera on a strap round the neck and a notebook under one wing' },
    { id: 'mabel', file: 'mabel.png', sticker: 'mabel', colour: '#7be08f', sheet: 'sheet-mabel-mudge',
      name: 'Mabel Mudge', short: 'Mabel', role: 'The Inventor', tag: 'The tinkerer',
      story: 'Digs up brilliant ideas and wobbly gadgets in equal measure. Mabel can fix anything, and sometimes breaks it first.',
      look: 'a short round mole inventor with velvety dark grey fur, tiny squinting eyes behind big round goggles pushed up on her head, a pink pointy nose, huge pink digging paws, patched orange overalls with a big tool belt, and a mud smudge on one cheek' },
    { id: 'nana', file: 'nana.png', sticker: 'nana', colour: '#c3a6ff', sheet: 'sheet-nana-shellby',
      name: 'Nana Shellby', short: 'Nana', role: 'The Milkshake Lady', tag: 'The slow one',
      story: 'The oldest and slowest resident of Doodleville, and the kindest. She runs the milkshake bar and hears everything.',
      look: 'a very old, very slow green tortoise with a domed patterned shell, a wrinkly kind face, tiny round spectacles on a chain, a frilly white apron with cherry patterns tied over her shell and a paper hat like a diner waitress, one hand holding a tall milkshake glass on a tray' },
    { id: 'captain', file: 'captain.png', sticker: 'barnaby', colour: '#4fd1c5', sheet: 'sheet-captain-barnaby-bubbles',
      name: 'Captain Barnaby Bubbles', short: 'Barnaby', role: 'The Harbour Master', tag: 'The busy one',
      story: 'Keeps the harbour running with eight arms and a lot of whistling. Everyone waves at the Captain.',
      look: 'a cheerful purple octopus harbour master with a big round head, eight curly arms each holding a different useful thing (a telescope, a flag, a rope, a mug, a whistle, a clipboard, a fishing net and a lifebuoy), a white sailor cap with a gold anchor badge, a blue captain\u2019s jacket with brass buttons, and a big friendly smile' },
  ],
  castPlaceholder: IMG + 'cast/slot.svg',
  castFile: file => IMG + 'cast/' + file,

  // Places in Doodleville a picture can be set in. Like a character, each has a
  // fixed `look` that is repeated word for word, so the place stays the same from
  // picture to picture. `id` is also its reference picture (img/ref/) and its
  // small card picture (img/thumbs/). The doughnut factory is not one of them: its picture has AI
  // mistakes left in, and is used for Spot the AI slips (slips/), not as a model to repeat.
  places: [
    { id: 'police-pound', name: 'The Police Pound',
      look: 'the front of a blue police station with a star sign, orange steps, a police car parked outside and a doughnut in the bin' },
    { id: 'pound-office', name: 'The Pound Office',
      look: 'a police office with wonky desks, filing cabinets, a cork board, stacked doughnut boxes and a big window looking out at the skyline' },
    { id: 'milkshake-bar', name: 'The Milkshake Bar',
      look: 'a milkshake bar with red booths, tall stools, giant milkshakes and a colourful jukebox' },
    { id: 'puddle-street', name: 'Puddle Street',
      look: 'a drizzly evening street with puddles, a round orange car, a bent lamp post and shops with lit windows' },
    { id: 'sunset-street', name: 'Sunset Street',
      look: 'a street at sunset with tall wonky buildings, curly lamps and a yellow taxi' },
    { id: 'wonky-row', name: 'Wonky Row',
      look: 'a street of crooked coloured houses under a mustard sky, with animal-shaped mailboxes' },
    { id: 'harbour', name: 'The Harbour',
      look: 'a sunny harbour with a striped pink lighthouse, colourful boats and a cobbled quay with bollards' },
    { id: 'playground', name: 'The Playground',
      look: 'a playground with a yellow slide, climbing frames, swings, a seesaw, a sandpit and hopscotch under a big tree' },
    { id: 'duck-pond-park', name: 'Duck Pond Park',
      look: 'a park with a duck pond, lily pads, a wooden bridge, a bandstand, benches and a picnic blanket' },
    { id: 'funfair', name: 'The Funfair',
      look: 'a funfair at dusk with a big wheel, a merry-go-round, striped stalls and a candyfloss cart under strings of lights' },
    { id: 'library', name: 'The Library',
      look: 'a cosy library with tall bookshelves, a rolling ladder, beanbags, a round window and a desk lamp' },
  ],

  // Who is friends with whom, shown under the gang. Empty until there is a gang.
  // Each entry is [id, 'verb', id], for example ['hero', 'looks after', 'buddy'].
  relations: [['trouble', 'bosses', 'buddy'], ['buddy', 'is a big fan of', 'helper'], ['helper', 'likes', 'hero'], ['flash', 'chases stories about', 'trouble'], ['mabel', 'builds gadgets for', 'hero'], ['nana', 'feeds', 'buddy'], ['captain', 'waves at', 'nana']],

  // Colour families. `phrase` goes into prompts near verbatim. `colours` draws the swatch.
  palettes: {
    pop:    { label: 'Comic pop', colours: ['#2ec4f1', '#ff7b1c', '#3ccf5a', '#8a4fff', '#ffd23f'],
              note: 'Bright cyan, orange, green, purple and yellow. The classic comic look.',
              phrase: 'bright flat comic colours only: cyan blue, fiery orange, vivid green, purple and sunny yellow, no gradients, no other colours' },
    sunny:  { label: 'Sunshine', colours: ['#ffd23f', '#ff9f1c', '#ff5a36', '#fff1c9', '#7a3b12'],
              note: 'Warm yellow, orange and red. Say what glows.',
              phrase: 'warm flat colours only: sunny yellow, orange and tomato red on cream paper, no other colours' },
    sea:    { label: 'Splash', colours: ['#2ec4f1', '#1b6ca8', '#14b8a6', '#e0f7ff', '#0b3954'],
              note: 'Cool blues and teal, like a swimming pool.',
              phrase: 'cool flat colours only: cyan, ocean blue and teal with white highlights, no other colours' },
    jungle: { label: 'Jungle', colours: ['#3ccf5a', '#1f8a3c', '#b8e986', '#8b5a2b', '#fff1c9'],
              note: 'Greens from lime to deep leaf, with brown and cream.',
              phrase: 'flat greens from lime to deep leaf green with brown and cream, no other colours' },
    berry:  { label: 'Berry', colours: ['#8a4fff', '#ff5fa2', '#c2185b', '#ffd6ec', '#3b1c6e'],
              note: 'Purple, pink and magenta. Sweet and bold.',
              phrase: 'flat purple, pink and magenta with cream paper, no other colours' },
    bw:     { label: 'Colour me in', colours: ['#1a1a1a', '#ffffff', '#cfcfcf'],
              note: 'Black line art only, ready for you to colour by hand.',
              phrase: 'black and white line art only, thick clean outlines, no colour, no shading, ready to colour in' },
  },
  defaultPalette: 'pop',

  // How Look Closely steps from watching to working alone.
  modes: {
    demo:    { label: 'Watch',   sub: 'See it done',
               card: 'A finished example. Every answer is filled in, ready to talk through.',
               hint: 'Watch: this is how a sharp-eyed detective of details looks at a picture.' },
    guide:   { label: 'Together', sub: 'Work it out',
               card: 'Agree an answer as a group, then reveal each one and compare.',
               hint: 'Together: agree an answer first, then reveal the model one. Did you spot something it missed?' },
    create:  { label: 'Solo',    sub: 'Your turn',
               card: 'Answer in your own words, then send it to the prompt helper.',
               hint: 'Solo: answer in your own words. Short phrases are fine. Your answers build the description below.' },
    explore: { label: 'Explore', sub: 'Any picture',
               card: 'Any picture, any level. Shuffle to see another.',
               hint: 'Explore: any picture, any level. Shuffle to see another, then answer what you like.' },
  },

  // Starter reference pictures: alt text, then character or setting, then (for a
  // character picture that stands in for one of the gang) the cast id.
  refs: {
    'penguin-postie': ['A round penguin in a blue postie cap with a red satchel, holding up a letter and smiling', 'character'],
    'robot-chef':     ['A boxy grey robot in a tall chef’s hat holding a spatula, with a cheeky lopsided grin', 'character'],
    'owl-inventor':   ['A brown owl in round goggles with a tool belt and a glowing light bulb above its head', 'character'],
    'treehouse':      ['A sunny day with a big treehouse clubhouse in an oak tree, a rope ladder and flags', 'setting'],
    'bus-stop':       ['A rainy evening street with a bus stop, puddles, lamp posts and lit windows', 'setting'],
    'moon-base':      ['A cheerful moon base with round domes, a rover, stars and a blue Earth in the sky', 'setting'],
    'puddle-street':  ['A drizzly evening street with puddles, a round orange car, a bent lamp post and shops with lit windows', 'setting'],
    'pound-office':   ['A police office with wonky desks, filing cabinets, a cork board, stacked doughnut boxes and a big skyline window', 'setting'],
    'sunset-street':  ['A street at sunset with tall wonky buildings, curly lamps and a yellow taxi', 'setting'],
    'milkshake-bar':  ['A milkshake bar with red booths, tall stools, giant milkshakes and a colourful jukebox', 'setting'],
    'wonky-row':      ['A street of crooked coloured houses under a mustard sky, with animal-shaped mailboxes', 'setting'],
    'rooftop-balcony':['A balcony with two plant pots looking over a green twilight town with stars', 'setting'],
    'wet-pavement':   ['A long empty pavement in blue rain with big puddles, striped shutters and a red umbrella on the ground', 'setting'],
    'gang':           ['The whole gang standing together outside the police station: a hedgehog detective, a walrus chief, a rhino sergeant and a flamingo singer', 'character'],
    'harbour':        ['A sunny harbour with a striped pink lighthouse, colourful boats and a cobbled quay with bollards', 'setting'],
    'playground':     ['A playground with a yellow slide, climbing frames, swings, a seesaw, a sandpit and hopscotch under a big tree', 'setting'],
    'duck-pond-park': ['A park with a duck pond, lily pads, a wooden bridge, a bandstand, benches and a picnic blanket', 'setting'],
    'funfair':        ['A funfair at dusk with a big wheel, a merry-go-round, striped stalls and a candyfloss cart under strings of lights', 'setting'],
    'library':        ['A cosy library with tall bookshelves, a rolling ladder, beanbags, a round window and a desk lamp', 'setting'],
    'doughnut-factory':['A doughnut factory with winding conveyor belts covered in doughnuts, colourful pipes, mixers and steam', 'setting'],
    'rain-soaked-street': ['A rainy street of bright coloured shops with glowing windows, a tilted lamp post, puddles, a small blue car and a welcome mat', 'setting'],
    'police-pound':   ['The front of a blue police station with a star sign, orange steps, a police car and a doughnut in the bin', 'setting'],
  },
  refPath: name => IMG + 'ref/' + name + (/^(sheet-|place-sheet|puddle|pound-|sunset|milkshake|wonky|rooftop|wet-|police-pound|rain-soaked|gang|harbour|playground|duck-pond|funfair|library|doughnut|penguin|robot|owl|treehouse|bus-stop|moon)/.test(name) ? '.jpg' : '.svg'),

  // Three ways of looking. Each level has a Watch picture with worked answers,
  // a Together picture with answers to reveal, and a Solo picture left blank.
  levels: {
    basic: {
      name: 'Level 1', lens: 'What can you see?', short: 'what can you see?',
      blurb: 'Name what is there. No guessing and no story yet: only what you could point at.',
      qs: [['see', 'What can you see?', 'What I see'], ['accessories', 'What do they wear or hold?', 'Wearing or holding'],
           ['materials', 'What is it all made of?', 'Made of'], ['colours', 'What colours can you see?', 'Colours'],
           ['emotions', 'How do they feel?', 'Feeling'], ['expressions', 'What does their face show?', 'Face']],
      demo: ['penguin-postie', {
        see: 'A round penguin standing tall and holding up one letter, with a bag across its body.',
        accessories: 'A blue cap with a badge, a red satchel with a gold buckle, and a white envelope.',
        materials: 'Soft feathers, stiff cloth for the cap, leather for the bag, paper for the letter.',
        colours: 'Dark blue, white and orange, with a bright red bag and a pale yellow background.',
        emotions: 'Proud and cheerful. This penguin loves the job.',
        expressions: 'A big open smile, wide round eyes and raised eyebrows.' }],
      guide: ['robot-chef', {
        see: 'A square robot in a chef’s hat, holding a spatula up like a sword.',
        accessories: 'A tall white hat, a spatula, and a little apron with a heart on it.',
        materials: 'Shiny metal for the body, rubber for the hands, cloth for the hat and apron.',
        colours: 'Silver-grey body, white hat, a red apron and a warm orange background.',
        emotions: 'Mischievous and excited, as if a joke is about to happen.',
        expressions: 'A cheerful lopsided grin and glowing yellow round eyes.' }],
      create: 'owl-inventor',
    },
    medium: {
      name: 'Level 2', lens: 'The details', short: 'the details',
      blurb: 'Zoom in. These are the details that decide whether the AI draws your character or a stranger.',
      qs: [['hair', 'Fur, feathers or hair', 'Fur or feathers'], ['clothing', 'Clothes', 'Clothes'],
           ['accessories', 'Things they carry', 'Carrying'], ['jewellery', 'Shapes and patterns', 'Shapes and patterns'],
           ['angle', 'Where is the camera?', 'Camera angle'], ['lighting', 'Where does the light come from?', 'Light'],
           ['background', 'What is behind them?', 'Background']],
      demo: ['robot-chef', {
        hair: 'No hair at all. A few little antennae on top of the head, one of them bent.',
        clothing: 'A tall pleated white chef’s hat and a red apron tied at the back.',
        accessories: 'A spatula held up high in one hand. A whisk poking out of the apron pocket.',
        jewellery: 'A square head, a round dial on the chest, bolts at the corners, a heart on the apron.',
        angle: 'Eye level and straight on, so the robot looks right at us.',
        lighting: 'Even, flat light with a small bright shine on the top of the head.',
        background: 'A plain warm orange wall with a few floating kitchen stars.' }],
      guide: ['owl-inventor', {
        hair: 'Fluffy brown feathers with a paler tummy, and two feather tufts like ears.',
        clothing: 'A leather tool belt across the middle. No other clothes.',
        accessories: 'Round goggles pushed up on the head, a spanner, a glowing bulb.',
        jewellery: 'Round eyes, a heart-shaped face patch, and speckles on the chest.',
        angle: 'Eye level and straight on, so the owl looks right at us.',
        lighting: 'The bulb glows warm yellow, and its light lands on the owl’s face.',
        background: 'A dark teal workshop wall with a few gears and pipes.' }],
      create: 'penguin-postie',
    },
    advanced: {
      name: 'Level 3', lens: 'The world', short: 'the world',
      blurb: 'Step back. Mood, place and time are what make separate panels feel like one story.',
      qs: [['mood', 'What is the mood?', 'Mood'], ['setting', 'What is here?', 'What is here'],
           ['location', 'Where in the world is it?', 'Place'], ['time', 'What time of day is it?', 'Time of day'],
           ['season', 'What season is it?', 'Season'], ['weather', 'What is the weather doing?', 'Weather'],
           ['genre', 'What kind of story would happen here?', 'Story type'], ['style', 'How is it drawn?', 'Drawing style'],
           ['era', 'When is it: long ago, now or the future?', 'When']],
      demo: ['treehouse', {
        mood: 'Happy and adventurous. It feels like the start of a great day.',
        setting: 'A big oak tree with a wooden clubhouse, a rope ladder, a flag and a swing.',
        location: 'A garden at the edge of a wood, with rolling green hills far behind.',
        time: 'Morning.',
        season: 'Summer: the leaves are thick and green and the flowers are out.',
        weather: 'Sunny, with a few soft white clouds.',
        genre: 'A funny adventure about a secret club.',
        style: 'Flat bright colours, thick wobbly outlines and simple dot shading.',
        era: 'Today, or close to it. The clubhouse is homemade.' }],
      guide: ['bus-stop', {
        mood: 'Cosy but a little lonely, the way waiting feels in the rain.',
        setting: 'A bus stop with a bench, a lamp post, puddles and shops with lit windows.',
        location: 'A small town high street, with a red brick shop on the right.',
        time: 'Evening, just getting dark.',
        season: 'Nothing tells you. That is a gap to fill in your own prompt.',
        weather: 'Rain, with the road shining under the lamps.',
        genre: 'A mystery or a comedy: who is the bus stop waiting for?',
        style: 'Flat colour with thick outlines, and yellow window lights glowing.',
        era: 'Hard to say. The bus stop could be from any time in the last fifty years. Name it in your own prompt.' }],
      create: 'moon-base',
    },
  },

  // The three levels as a ladder. Each tier is a level; the teacher's workshop code
  // (or their own-key setup on the Teachers page) sets the highest one children can use.
  // `setting` holds the task and intro shown when Place is picked instead of Character.
  game: [
    { level: 1, tier: 'basic', name: 'Doodler', task: 'One character portrait.',
      intro: 'Doodler: one character, one clear picture. Say who they are and what they look like.',
      setting: { task: 'One empty room.',
        intro: 'Doodler: one place with nobody in it. Describe what is there and where the light comes from.' } },
    { level: 2, tier: 'medium', name: 'Sketcher', task: 'The same character in a place.',
      intro: 'Sketcher: same character, new place. Copy the shared paragraph word for word every time, or your character will change.',
      setting: { task: 'Two rooms, one building.',
        intro: 'Sketcher: two rooms, one building. Copy the shared paragraph word for word, or the walls stop matching.' } },
    { level: 3, tier: 'advanced', name: 'Storyteller', task: 'A three-picture story.',
      intro: 'Storyteller: three pictures, one story. Plan the shots with an AI partner before you make anything. The plan matters most.',
      setting: { task: 'One street, three shots.',
        intro: 'Storyteller: one street, three shots. Same time of day, same weather and same colours in every picture.' } },
  ],

  // What the helper hands out when the AI is busy, missing or down: starter prompts
  // from the files, one per level and subject. {palette} becomes the colour phrase,
  // {style} the house style, and {who} (or {Who}, capitalised) the picked character's
  // look (or DEFAULT_WHO in ai.js).
  stockBriefs: {
    character: {
      basic: {
        anchor: '',
        prompts: ['A character reference sheet of {who}, full body, standing facing us, one big clear expression. {style}. Colours: {palette}. Plain pale background. No words, no captions, no speech bubbles, no other characters.'],
        why_this_works: 'The style words do most of the work: without them, image tools drift to a shiny, realistic look. The plain background stops the tool from inventing a whole scene around your character.',
        platform_notes: 'Gemini needs the "no words, no captions" line most. ChatGPT and Copilot follow it more easily, but may need "flat hand-drawn illustration, not a 3D render".',
        watch_for: 'Check the colours first: any colour outside your palette means the colour line was ignored.',
      },
      medium: {
        anchor: '{style}. {Who}. Colours: {palette}. No words, no captions, no speech bubbles.',
        prompts: ['The character stands behind a big wooden counter in a tiny bakery in the morning, warm light through the window, trays of buns behind them.',
                  'The character sits on a park bench under a big tree in the afternoon, a picnic basket beside them, blue sky and fluffy clouds.'],
        why_this_works: 'The shared paragraph carries the character and the style, so copy it word for word into both prompts. Each prompt adds only the place, which is the one thing that should change.',
        platform_notes: 'On ChatGPT, upload the first picture again before the second prompt. On Gemini, stay in the same chat so it can remember details.',
        watch_for: 'Put the two pictures side by side. Is it the same face and the same clothes, or a stranger in similar clothes?',
      },
      advanced: {
        anchor: '{style}. {Who}. Colours: {palette}. No words, no captions, no speech bubbles.',
        prompts: ['Picture 1, wide shot: a sunny town square, the character stands small by the fountain.',
                  'Picture 2, medium shot: the character walks up the steps of the town hall, looking back over one shoulder at a balloon floating past.',
                  'Picture 3, close-up: the character’s surprised face at the big blue door, one hand on the handle, eyes wide.'],
        why_this_works: 'A shot list moves the camera closer each picture (wide, medium, close) while the shared paragraph keeps the character and colours fixed. Plan the story with an AI partner first: these three shots are only a starting skeleton.',
        platform_notes: 'Free chat tools need the shared paragraph pasted in full every time. Uploading the first picture as a reference helps a lot.',
        watch_for: 'Check the three pictures read in order without any words. Could someone else tell you what happened?',
      },
    },
    setting: {
      basic: {
        anchor: '',
        prompts: ['A wide shot of an empty treehouse clubhouse on a sunny morning, with nobody in it. Wooden floor, a little round table, cushions, a rope ladder, a window with a flag outside. {style}. Colours: {palette}. No characters, no words, no speech bubbles, no captions.'],
        why_this_works: 'Saying "with nobody in it" and "no characters, no words" stops chat tools from filling the room with a whole scene. Real things to draw and one clear light give the tool something to work with.',
        platform_notes: 'Gemini is the most likely to add people and captions anyway. ChatGPT and Copilot usually respect the "no" line.',
        watch_for: 'Look for people, speech bubbles or captions. Image tools often add all three when the prompt does not forbid them.',
      },
      medium: {
        anchor: 'Inside the same round clubhouse in a big tree, with nobody in it. Wooden plank walls, round windows with yellow curtains, string lights along the roof beams, a patchwork rug. {style}. Colours: {palette}. No characters, no words, no speech bubbles, no captions.',
        prompts: ['The main room: a little round table with mugs, cushions in a heap, a bookshelf on the back wall, a wide shot.',
                  'The lookout at the top: a ladder up through the floor, a telescope at a round window, a flag on a pole, a wide shot.'],
        why_this_works: 'The shared paragraph repeats the things that make two rooms one building (walls, windows, lights, rug). Each prompt adds a clear layout line, because the shared paragraph alone is not enough.',
        platform_notes: 'Gemini tends to invent a detail and then keep it. ChatGPT does better if you upload the first room as a reference.',
        watch_for: 'Check the windows and the string lights match in both rooms. Those are the details that go wrong first.',
      },
      advanced: {
        anchor: 'The same small seaside town on a bright windy day, tall thin houses in pink, yellow and blue, a harbour with little boats, empty of people. {style}. Colours: {palette}. No characters, no words, no speech bubbles, no captions.',
        prompts: ['Wide shot from the harbour wall: the whole row of houses, the boats bobbing, flags flapping.',
                  'The lane behind the bakery: crates, a blue door, a washing line with flags of laundry.',
                  'Low angle along the quay: three little boats tied up in a row, seagulls on the posts, the houses reflected in the water.'],
        why_this_works: 'A place sheet holds one time of day, one kind of weather and one set of colours in the shared paragraph, so separate shots feel like one town. Each shot changes only the camera.',
        platform_notes: 'Some tools drift to a different time of day unless you repeat it in every prompt.',
        watch_for: 'Check the time of day and the wind are in every shot. Those are the first things to slip.',
      },
    },
  },

  // The helper's questions for each part of a description, used only if the AI
  // flags a part as missing but sends no questions of its own.
  gateQuestions: {
    see: 'What is actually in the picture: who or what, and what are they doing?',
    details: 'Look closer. What small things do you notice, like clothes, objects, patterns or where the light falls?',
    world: 'Step back. Where is this, and what time of day or weather does it feel like?',
  },

  // What the check falls back to when the AI can't answer.
  compareChecklist: [
    'Style: is it still hand-drawn and comic-like, or has it gone shiny, 3D or realistic?',
    'Colours: are they the colours you asked for, or extra ones?',
    'Characters: is anyone there you did not ask for?',
    'Words: any lettering, captions or speech bubbles you did not ask for?',
    'Light: where does it come from, and is it where you asked?',
  ],

  // Pictures offered in the Comic Maker's library: empty places only, ready for stickers and words.
  // Character sheets, the practice characters and pictures with the gang already drawn in are left out
  // (the sticker tray has the gang). A picture not listed here still opens in templates and saved comics.
  library: ['police-pound', 'pound-office', 'milkshake-bar', 'puddle-street', 'sunset-street', 'wonky-row', 'harbour', 'playground', 'duck-pond-park', 'funfair', 'library', 'rooftop-balcony', 'wet-pavement', 'treehouse', 'bus-stop', 'moon-base'],

  // Colours for captions, balloons, thoughts and sound effects in the Comic Maker.
  // fill: the box (or a sound effect's letters); text: the words; line: the outline.
  letterColours: {
    white:  { label: 'White',    fill: '#ffffff', text: '#111111', line: '#111111' },
    paper:  { label: 'Cream',    fill: '#fff1c9', text: '#111111', line: '#111111' },
    yellow: { label: 'Yellow',   fill: '#ffd23f', text: '#111111', line: '#111111' },
    green:  { label: 'Green',    fill: '#7be08f', text: '#111111', line: '#111111' },
    blue:   { label: 'Blue',     fill: '#6fd3f7', text: '#111111', line: '#111111' },
    red:    { label: 'Orange',   fill: '#ff8a3d', text: '#111111', line: '#111111' },
    pink:   { label: 'Pink',     fill: '#ff8fc0', text: '#111111', line: '#111111' },
    black:  { label: 'Black',    fill: '#111111', text: '#fff6d8', line: '#fff6d8' },
  },

  // Page layouts in the Comic Maker (Level 3). The maker holds each layout's shapes and
  // colours; these are the words about it. `prompt` describes the look for your picture prompts.
  pageStyles: [
    { key: 'classic', name: 'Classic grid', era: 'Six even panels', title: 'Classic grid',
      about: 'Two panels across and three down. Every panel gets the same weight, so your story reads in order, like steps on a staircase.',
      prompt: 'Hand-drawn comic panel, thick wobbly black outlines, flat bright colours, simple halftone dot shading.' },
    { key: 'strips', name: 'Wide strips', era: 'Six long strips', title: 'Wide strips',
      about: 'Long thin strips stacked up the page, like a film screen. Great for a journey, a race or a slow reveal.',
      prompt: 'Very wide panoramic comic panel, thick wobbly black outlines, flat bright colours, room for a long horizon.' },
    { key: 'night', name: 'Night page', era: 'Dark page, glowing pictures', title: 'Night page',
      about: 'A dark blue page with no frames. Bright pictures glow against it, so it is perfect for space, stars and silly sleepovers.',
      prompt: 'Night-time scene, deep blue sky, glowing yellow windows and stars, flat bright colours, thick outlines.' },
    { key: 'action', name: 'Zoom page', era: 'Slanted cuts', title: 'Zoom page',
      about: 'A big opening picture, then panels with slanted edges that make everything feel fast. Use it for chases and surprises.',
      prompt: 'Dynamic action pose, bold thick outlines, bright flat colours, speed lines, a sense of zooming.' },
    { key: 'poster', name: 'Poster page', era: 'One huge picture', title: 'Poster page',
      about: 'One giant picture fills the whole page, with smaller panels laid on top at jaunty angles. It feels like a poster with a story inside.',
      prompt: 'Poster-style picture, big bold shapes, bright saturated flat colours, dramatic low angle, sunburst behind.' },
    { key: 'noir', name: 'Midnight noir', era: 'Black and white, like an old detective film', title: 'Midnight noir',
      about: 'A black page and every picture in black and white, stickers too, like a mystery film from long ago. Start wide to show where we are, slow down with three tall panels, then end on the big reveal.',
      prompt: 'Black and white comic panel, no colour at all, strong black shadows, one bright streetlamp, rain as white streaks, thick wobbly outlines, a spooky but friendly mystery.' },
  ],

  // Sound effects offered in the Comic Maker, grouped by what makes the noise.
  sfx: [
    ['Silly', ['BOING!', 'SPLAT!', 'BONK!', 'SQUISH', 'HONK!']],
    ['Big noises', ['KA-BOOM!', 'CRASH!', 'WHOOSH!', 'ZOOM!', 'THUD!']],
    ['Doors', ['SLAM!', 'KNOCK KNOCK', 'CREAK...', 'DING DONG', 'SQUEAK']],
    ['Animals', ['QUACK!', 'RIBBIT', 'HOOT', 'ROAR!', 'BUZZ']],
    ['Weather', ['SPLISH SPLASH', 'DRIP DRIP', 'RUMBLE', 'FLASH!', 'BRRR']],
    ['Feelings', ['GASP!', 'GIGGLE', 'OOPS!', 'YIKES!', 'YAY!']],
  ],

  // Stickers for the Comic Maker: the gang cut out of their character sheets, so a child can put them
  // into a picture without an image tool. Each is img/stickers/<dir>/<file>.webp with a see-through
  // background, plus a twin <file>-b.webp with a white sticker border. [file, label, starting width
  // in % of the panel]. To add a character, cut their sheet the same way and add an entry here.
  stickers: [
    { who: 'Inspector Nettle', dir: 'nettle', items: [
      ['standing', 'Standing', 37], ['side', 'Side on', 30], ['walking-away', 'Walking away', 30],
      ['examining', 'Examining clues', 41], ['notes', 'Taking notes', 30], ['pointing', 'Pointing', 49],
      ['face-pleased', 'Pleased', 27], ['face-thinking', 'Thinking', 28], ['face-confused', 'Confused', 24],
      ['face-suspicious', 'Suspicious', 24], ['face-determined', 'Determined', 24], ['face-cross', 'Cross', 24],
      ['magnifying-glass', 'Magnifying glass', 12], ['notepad', 'Notepad', 12], ['pencil', 'Pencil', 8],
    ] },
    { who: 'Sergeant Rocco', dir: 'rocco', items: [
      ['standing', 'Standing', 29], ['side', 'Side on', 21], ['walking-away', 'Walking away', 29],
      ['arms-crossed', 'Arms crossed', 32], ['stomping', 'Stomping', 45], ['cup-of-tea', 'Cup of tea', 37],
      ['face-smirk', 'Lazy smirk', 27], ['face-glower', 'Sulky glower', 28], ['face-grin', 'Sneaky grin', 26],
      ['face-tantrum', 'Roaring tantrum', 24], ['face-kind', 'Flicker of kindness', 28], ['walkie-talkie', 'Walkie-talkie', 8],
      ['lollipop', 'Lollipop', 9], ['braces', 'Red braces', 13],
    ] },
    { who: 'Chief Grumbleton', dir: 'grumbleton', items: [
      ['standing', 'Standing', 40], ['side', 'Side on', 30], ['walking-away', 'Walking away', 39],
      ['glaring', 'Glaring', 40], ['doughnut-theft', 'Doughnut theft', 48], ['bossing', 'Bossing', 46],
      ['face-scowl', 'Grumpy scowl', 30], ['face-smirk', 'Sneaky smirk', 30], ['face-shocked', 'Shocked', 30],
      ['face-tantrum', 'Tantrum', 30], ['face-guilty', 'Guilty', 30], ['face-pleased', 'Secretly pleased', 30],
      ['cap', 'Peaked cap', 14], ['tusk', 'Walrus tusk', 9], ['trophy', 'Doughnut trophy', 9],
    ] },
    { who: 'Flash the Crow', dir: 'flash', items: [
      ['standing', 'Standing', 23], ['side', 'Side on', 24], ['walking-away', 'Walking away', 22],
      ['snapping', 'Snapping a photo', 44], ['running', 'Running', 46], ['peeking', 'Peeking round a corner', 31],
      ['face-nosy', 'Nosy', 30], ['face-excited', 'Excited', 27], ['face-cheeky', 'Cheeky', 30],
      ['face-startled', 'Startled', 30], ['face-sulking', 'Sulking', 30], ['face-proud', 'Proud', 30],
      ['camera', 'Old camera', 14], ['notebook', 'Press notebook', 14], ['press-hat', 'Press hat', 14],
    ] },
    { who: 'Mabel Mudge', dir: 'mabel', items: [
      ['standing', 'Standing', 46], ['side', 'Side on', 40], ['walking-away', 'Walking away', 46],
      ['spanner', 'Waving a spanner', 46], ['popping-up', 'Popping out of a hole', 46], ['gadget', 'Carrying a gadget', 46],
      ['face-delighted', 'Delighted', 30], ['face-focused', 'Focused', 30], ['face-confused', 'Confused', 30],
      ['face-muddy', 'Muddy and grumpy', 30], ['face-triumphant', 'Triumphant', 30], ['goggles', 'Goggles', 14],
      ['big-spanner', 'Spanner', 14], ['tool-belt', 'Tool belt', 14],
    ] },
    { who: 'Nana Shellby', dir: 'nana', items: [
      ['standing', 'Standing', 46], ['side', 'Side on', 39], ['walking-away', 'Walking away', 46],
      ['carrying-tray', 'Carrying a tray', 46], ['leaning', 'Leaning on the counter', 43], ['waving', 'Waving', 38],
      ['face-smiling', 'Sweetly smiling', 30], ['face-sleepy', 'Sleepy', 30], ['face-surprised', 'Surprised', 28],
      ['face-telling-off', 'Telling off', 30], ['face-laughing', 'Laughing', 30], ['face-wise', 'Wise', 30],
      ['spectacles', 'Spectacles', 14], ['tray', 'Tray', 14], ['milkshake', 'Milkshake', 8],
    ] },
    { who: 'Vivi Velvet', dir: 'vivi', items: [
      ['standing', 'Standing', 18], ['side', 'Side on', 19], ['walking-away', 'Walking away', 20],
      ['singing', 'Singing', 34], ['bashful', 'Bashful', 21], ['dancing', 'Dancing', 40],
      ['face-cool', 'Cool glance', 21], ['face-sly', 'Sly smile', 26], ['face-surprised', 'Surprised', 25],
      ['face-giggling', 'Giggling', 27], ['face-sad', 'Sad', 30], ['face-wink', 'Cheeky wink', 27],
      ['earrings', 'Star earrings', 14], ['boa', 'Feather boa', 14], ['microphone', 'Microphone', 14],
    ] },
    { who: 'Captain Barnaby Bubbles', dir: 'barnaby', items: [
      ['standing', 'Standing', 46], ['side', 'Side on', 26], ['walking-away', 'Walking away', 46],
      ['waving', 'Waving all arms', 46], ['telescope', 'Looking through a telescope', 46], ['whistle', 'Blowing a whistle', 46],
      ['face-jolly', 'Jolly', 30], ['face-worried', 'Worried', 30], ['face-surprised', 'Surprised', 30],
      ['face-proud', 'Proud', 30], ['face-seasick', 'Seasick', 27], ['face-shouting', 'Shouting orders', 30],
      ['cap', 'Captain’s cap', 14], ['spyglass', 'Telescope', 14], ['lifebuoy', 'Lifebuoy', 14],
    ] },
  ],
  stickerPath: (dir, file, border) => IMG + 'stickers/' + dir + '/' + file + (border ? '-b' : '') + '.webp',
  thumbPath: name => IMG + 'thumbs/' + name + '.webp',

  // Starter pages for the Comic Maker (Featured templates, in Explore and in the Comic Maker). Each opens ready to go: a page layout,
  // a place picture from the library in every panel, the gang as stickers, and a first caption to get started.
  // level: 'medium' is the four-panel page; 'advanced' uses a page style. Panels are filled in order.
  // A sticker is [src, { cx, h, bottom, clip, flip }]: cx is the middle across the panel (0 to 1), h its height as a share of
  // the panel's height, bottom where its feet go (1 is the bottom edge; more than 1 sinks it below, for a close-up).
  // The Comic Maker works out the size from the picture's own shape, so a template fits any page layout.
  // Words are [type, text, { x, y, w }] in % of the panel; empty words show a hint for the child to fill in.
  templates: [
    { key: 'doughnut-thief', name: 'The Doughnut Thief', blurb: 'Someone took the doughnuts. Who did it?',
      thumb: ['doughnut-factory', 'grumbleton/doughnut-theft'], level: 'medium', title: 'The Doughnut Thief',
      panels: [
        { place: 'police-pound', stickers: [['nettle/standing', { cx: .5, h: .62 }]], words: [['caption', 'One sunny morning at the Police Pound...', { x: 3, y: 3, w: 70 }]] },
        { place: 'doughnut-factory', stickers: [['grumbleton/doughnut-theft', { cx: .52, h: .7 }]], words: [['thought', '', { x: 6, y: 5, w: 44 }]] },
        { place: 'pound-office', stickers: [['rocco/stomping', { cx: .5, h: .68 }]], words: [['speech', '', { x: 44, y: 6, w: 50 }]] },
        { place: 'milkshake-bar', stickers: [['nettle/pointing', { cx: .3, h: .6 }], ['grumbleton/face-guilty', { cx: .78, h: .5, bottom: 1.04, clip: true }]], words: [['speech', '', { x: 4, y: 5, w: 52 }]] },
      ] },
    { key: 'harbour-day', name: 'Harbour Day', blurb: 'Captain Barnaby has lost something in the sea.',
      thumb: ['harbour', 'barnaby/waving'], level: 'medium', title: 'Harbour Day',
      panels: [
        { place: 'harbour', stickers: [['barnaby/standing', { cx: .5, h: .62 }]], words: [['caption', 'It was the busiest day of the year at the harbour.', { x: 3, y: 3, w: 72 }]] },
        { place: 'harbour', stickers: [['barnaby/telescope', { cx: .55, h: .62, bottom: 1.03, clip: true }]], words: [['thought', '', { x: 4, y: 5, w: 44 }]] },
        { place: 'duck-pond-park', stickers: [['flash/snapping', { cx: .26, h: .56 }], ['vivi/dancing', { cx: .78, h: .66 }]], words: [['speech', '', { x: 36, y: 4, w: 50 }]] },
        { place: 'harbour', stickers: [['barnaby/face-surprised', { cx: .5, h: .62, bottom: 1.04, clip: true }]], words: [['sfx', 'SPLASH!', { x: 20, y: 8, w: 60 }]] },
      ] },
    { key: 'milkshake-mix-up', name: 'Milkshake Mix-up', blurb: 'Nana Shellby’s famous milkshake has gone missing.',
      thumb: ['milkshake-bar', 'nana/carrying-tray'], level: 'medium', title: 'The Milkshake Mix-up',
      panels: [
        { place: 'milkshake-bar', stickers: [['nana/carrying-tray', { cx: .5, h: .6 }]], words: [['caption', 'Nobody makes a milkshake like Nana Shellby.', { x: 3, y: 3, w: 70 }]] },
        { place: 'milkshake-bar', stickers: [['rocco/cup-of-tea', { cx: .5, h: .66 }]], words: [['speech', '', { x: 4, y: 5, w: 50 }]] },
        { place: 'sunset-street', stickers: [['nana/face-surprised', { cx: .5, h: .6, bottom: 1.04, clip: true }]], words: [['thought', '', { x: 50, y: 5, w: 46 }]] },
        { place: 'milkshake-bar', stickers: [['nana/waving', { cx: .3, h: .58 }], ['rocco/face-kind', { cx: .76, h: .48, bottom: 1.04, clip: true }]], words: [['speech', '', { x: 40, y: 4, w: 54 }]] },
      ] },
    { key: 'funfair-chase', name: 'Funfair Chase', blurb: 'Flash has the story of the year, and Rocco wants it.',
      thumb: ['funfair', 'flash/running'], level: 'advanced', style: 'strips', title: 'The Funfair Chase',
      panels: [
        { place: 'funfair', stickers: [['flash/running', { cx: .7, h: .9, bottom: 1.02 }]], words: [['caption', 'The funfair was open late...', { x: 2, y: 6, w: 40 }]] },
        { place: 'funfair', stickers: [['rocco/stomping', { cx: .3, h: .95, bottom: 1.02 }]], words: [['speech', '', { x: 50, y: 8, w: 34 }]] },
        { place: 'wonky-row', stickers: [['flash/peeking', { cx: .82, h: 1, bottom: 1.04, clip: true }]], words: [['thought', '', { x: 44, y: 8, w: 30 }]] },
        { place: 'playground', stickers: [['rocco/face-tantrum', { cx: .5, h: 1.25, bottom: 1.15, clip: true }]], words: [['sfx', 'ROAR!', { x: 64, y: 12, w: 34 }]] },
        { place: 'bus-stop', stickers: [['nana/waving', { cx: .25, h: .9, bottom: 1.02 }], ['flash/running', { cx: .7, h: .9, bottom: 1.02 }]], words: [['speech', '', { x: 36, y: 8, w: 26 }]] },
        { place: 'milkshake-bar', stickers: [['flash/face-proud', { cx: .3, h: 1.2, bottom: 1.12, clip: true }], ['rocco/face-kind', { cx: .75, h: 1.2, bottom: 1.12, clip: true }]], words: [['caption', '', { x: 2, y: 6, w: 34 }]] },
      ] },
    { key: 'moon-mission', name: 'Moon Base Mission', blurb: 'Mabel’s newest gadget goes a bit too far.',
      thumb: ['moon-base', 'mabel/gadget'], level: 'advanced', style: 'night', title: 'Moon Base Mission',
      panels: [
        { place: 'treehouse', stickers: [['mabel/gadget', { cx: .42, h: .62 }]], words: [['caption', 'Mabel Mudge had built her best gadget yet.', { x: 3, y: 3, w: 60 }]] },
        { place: 'rooftop-balcony', stickers: [['nettle/examining', { cx: .5, h: .7 }]], words: [['thought', '', { x: 4, y: 4, w: 58 }]] },
        { place: 'moon-base', stickers: [['mabel/spanner', { cx: .5, h: .7 }]], words: [['sfx', 'WHOOSH!', { x: 6, y: 6, w: 80 }]] },
        { place: 'moon-base', stickers: [['mabel/face-triumphant', { cx: .5, h: .75, bottom: 1.05, clip: true }]], words: [['speech', '', { x: 4, y: 4, w: 56 }]] },
        { place: 'moon-base', stickers: [['nettle/standing', { cx: .3, h: .62 }], ['mabel/standing', { cx: .7, h: .56 }]], words: [['speech', '', { x: 40, y: 4, w: 44 }]] },
      ] },
    { key: 'library-mystery', name: 'The Library Mystery', blurb: 'A black-and-white whodunnit. Every picture is a clue.',
      thumb: ['library', 'nettle/examining'], level: 'advanced', style: 'noir', title: 'The Library Mystery',
      panels: [
        { place: 'rain-soaked-street', stickers: [['nettle/standing', { cx: .7, h: .62 }]], words: [['caption', 'Midnight. The library clock had stopped.', { x: 3, y: 4, w: 46 }]] },
        { place: 'library', stickers: [['flash/peeking', { cx: .7, h: .8, bottom: 1.04, clip: true }]], words: [['thought', '', { x: 4, y: 4, w: 80 }]] },
        { place: 'library', stickers: [['vivi/face-surprised', { cx: .5, h: .62, bottom: 1.05, clip: true }]], words: [['speech', '', { x: 4, y: 4, w: 84 }]] },
        { place: 'wet-pavement', stickers: [['nettle/examining', { cx: .5, h: .7 }]], words: [['caption', '', { x: 4, y: 4, w: 84 }]] },
        { place: 'library', stickers: [['nettle/pointing', { cx: .3, h: .7 }], ['grumbleton/face-guilty', { cx: .78, h: .7, bottom: 1.06, clip: true }]], words: [['speech', '', { x: 4, y: 4, w: 40 }]] },
      ] },
  ],
};
