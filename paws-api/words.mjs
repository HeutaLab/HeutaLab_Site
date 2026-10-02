// The words a workshop code is made from: three of these and a two-digit number, as in
// "maple-otter-kite-47" (vault.mjs draws them). A teacher writes the code on the board and
// thirty children aged 9 to 12 type it, so every word is:
//   - 3 to 6 letters, lower case, an everyday word a child can read at a glance;
//   - spelt the way it sounds (no "knight", no "island"), and not a word that sounds like
//     another one (no "bear", no "blue", no "four");
//   - one thing, not a plural;
//   - friendly: nothing rude, sad or scary, and nothing that turns unkind next to another
//     word (so no skin colours, no family members, no "cow" or "pig").
// The list is in alphabetical order with no repeats: words.test.mjs checks all of the above
// that a machine can check. Adding words is safe at any time. Taking one out is safe too:
// a code is matched by its fingerprint, never looked up in this list.
// The count matters: three words and a number must give at least 2^34 codes, which needs
// 576 words or more.

export const WORDS = [
  'acorn', 'actor', 'amber', 'apple', 'apron', 'artist', 'ask', 'atlas', 'atom', 'attic', 'author', 'badge',
  'badger', 'bag', 'bagel', 'baker', 'bamboo', 'banana', 'banjo', 'banner', 'barn', 'basil', 'basin', 'basket',
  'bath', 'bay', 'beagle', 'beam', 'beaver', 'bed', 'beep', 'beetle', 'belt', 'bench', 'bib', 'big', 'bike', 'birch',
  'bison', 'bloom', 'boat', 'bobble', 'bobcat', 'boing', 'bolt', 'bonnet', 'book', 'boot', 'bounce', 'box', 'bran',
  'branch', 'brave', 'breeze', 'brick', 'bridge', 'bright', 'bronze', 'brook', 'broom', 'broth', 'brush', 'bubble',
  'bucket', 'bud', 'buddy', 'budgie', 'bug', 'bugle', 'bumpy', 'bun', 'bunny', 'burger', 'bus', 'bush', 'butter',
  'button', 'buzz', 'cabin', 'cactus', 'cake', 'camel', 'camera', 'camp', 'canary', 'candle', 'candy', 'canyon',
  'cap', 'cape', 'car', 'card', 'carp', 'carry', 'cashew', 'cat', 'catch', 'chair', 'chat', 'cheer', 'cheese',
  'cherry', 'chess', 'chick', 'chime', 'chive', 'clack', 'clam', 'clap', 'clay', 'clean', 'clever', 'click', 'cliff',
  'clip', 'cloak', 'clock', 'cloud', 'clover', 'coach', 'coast', 'coat', 'cod', 'coffee', 'coin', 'cola', 'collar',
  'collie', 'colt', 'comet', 'comic', 'cone', 'cookie', 'cool', 'corgi', 'cork', 'cot', 'cotton', 'couch', 'count',
  'cove', 'crab', 'crane', 'crate', 'crayon', 'cream', 'cress', 'crisp', 'crocus', 'crown', 'cub', 'cuddle', 'cuff',
  'cumin', 'cup', 'curly', 'curry', 'daisy', 'damp', 'dance', 'dancer', 'dash', 'dawn', 'day', 'denim', 'desk',
  'dig', 'ding', 'dingo', 'disco', 'dish', 'dive', 'dizzy', 'doctor', 'dodo', 'dog', 'doll', 'domino', 'donkey',
  'doodle', 'door', 'dream', 'dress', 'drift', 'drill', 'drum', 'dry', 'duck', 'dune', 'dusk', 'eagle', 'earwig',
  'east', 'egg', 'elf', 'elk', 'elm', 'emoji', 'emu', 'energy', 'engine', 'fable', 'falcon', 'fancy', 'farm',
  'farmer', 'fast', 'fence', 'fennel', 'fern', 'ferret', 'fetch', 'fig', 'film', 'finch', 'fizzy', 'flag', 'flan',
  'flash', 'flat', 'float', 'fluffy', 'flute', 'foal', 'fog', 'forest', 'fork', 'fox', 'frame', 'fresh', 'fridge',
  'frog', 'frost', 'fudge', 'funny', 'furry', 'fuzzy', 'galaxy', 'game', 'garden', 'garlic', 'gecko', 'genie',
  'gentle', 'gerbil', 'giant', 'gibbon', 'giggle', 'glen', 'glide', 'glider', 'globe', 'glow', 'glue', 'goal',
  'goat', 'gold', 'golf', 'gong', 'goose', 'grand', 'grape', 'grass', 'gravy', 'green', 'grin', 'grow', 'grub',
  'guava', 'gull', 'hammer', 'happy', 'harp', 'hat', 'hazel', 'hedge', 'helmet', 'help', 'helper', 'hen', 'hero',
  'heron', 'hide', 'hike', 'hill', 'hippo', 'hockey', 'holly', 'home', 'honk', 'hoodie', 'hook', 'hoop', 'hop',
  'hope', 'horn', 'house', 'hug', 'hum', 'hurdle', 'husky', 'hut', 'ice', 'igloo', 'indigo', 'ink', 'ivy', 'jacket',
  'jade', 'jangle', 'jar', 'jazz', 'jelly', 'jester', 'jet', 'jingle', 'jog', 'joke', 'jolly', 'judo', 'jug',
  'juggle', 'jump', 'jumper', 'jungle', 'karate', 'kayak', 'kebab', 'kettle', 'kilt', 'kind', 'king', 'kipper',
  'kite', 'kitten', 'kiwi', 'koala', 'label', 'lace', 'ladle', 'lake', 'lamp', 'laptop', 'lark', 'laser', 'leaf',
  'lemon', 'lemur', 'lentil', 'letter', 'lid', 'light', 'lilac', 'lily', 'lime', 'linen', 'lion', 'lizard', 'lodge',
  'lolly', 'long', 'look', 'lorry', 'lotus', 'lucky', 'magic', 'magnet', 'magpie', 'mango', 'mantis', 'map', 'maple',
  'marble', 'march', 'marrow', 'marsh', 'mask', 'meadow', 'mega', 'melon', 'meteor', 'midge', 'mild', 'milk',
  'minnow', 'mint', 'mirror', 'misty', 'mitten', 'mole', 'moon', 'mop', 'moss', 'moth', 'motor', 'mouse', 'movie',
  'mud', 'muffin', 'mug', 'music', 'nacho', 'nail', 'nap', 'navy', 'neat', 'net', 'newt', 'noodle', 'noon', 'north',
  'noun', 'number', 'nurse', 'nutmeg', 'oak', 'oat', 'olive', 'opal', 'opera', 'orange', 'orbit', 'otter', 'owl',
  'oyster', 'pack', 'packet', 'paddle', 'page', 'paint', 'pal', 'palace', 'pan', 'panda', 'panel', 'papaya', 'paper',
  'parade', 'parcel', 'park', 'parrot', 'party', 'pasta', 'patch', 'path', 'patter', 'peach', 'peanut', 'pebble',
  'pecan', 'peg', 'pen', 'pencil', 'pepper', 'pesto', 'petal', 'phone', 'photo', 'piano', 'pick', 'pickle', 'picnic',
  'piglet', 'pillow', 'pilot', 'pin', 'pine', 'pink', 'pipe', 'pitch', 'pitta', 'pixel', 'pixie', 'plan', 'planet',
  'plank', 'plant', 'plate', 'play', 'plug', 'pocket', 'poem', 'polite', 'polka', 'pollen', 'polo', 'poncho', 'pond',
  'pony', 'poodle', 'pop', 'poppy', 'porch', 'possum', 'poster', 'potato', 'potion', 'prawn', 'proud', 'prune',
  'puddle', 'puffin', 'pug', 'puma', 'pup', 'puppet', 'puppy', 'purple', 'purse', 'puzzle', 'queen', 'quick',
  'quilt', 'quince', 'quiz', 'rabbit', 'radar', 'radio', 'radish', 'raft', 'raisin', 'rake', 'ram', 'ramen',
  'ranger', 'rattle', 'reef', 'relay', 'relish', 'rest', 'ribbon', 'rice', 'riddle', 'ripple', 'river', 'robin',
  'robot', 'rock', 'rocket', 'roof', 'room', 'round', 'royal', 'ruby', 'rug', 'rugby', 'ruler', 'rumba', 'rumble',
  'run', 'saddle', 'sage', 'sailor', 'salad', 'salsa', 'salt', 'samosa', 'sand', 'sandal', 'satin', 'scarf', 'scone',
  'scout', 'seal', 'seesaw', 'share', 'shed', 'shelf', 'shiny', 'ship', 'shirt', 'short', 'shrew', 'shrimp', 'silk',
  'silly', 'silver', 'sing', 'singer', 'skate', 'sketch', 'ski', 'skip', 'skirt', 'sky', 'sledge', 'sleeve', 'slide',
  'sloth', 'slug', 'small', 'smart', 'smile', 'smooth', 'snail', 'snooze', 'snow', 'snug', 'soap', 'soccer', 'sock',
  'sofa', 'soft', 'soil', 'song', 'south', 'spade', 'spark', 'speedy', 'spell', 'spicy', 'spin', 'splash', 'splat',
  'spoon', 'spring', 'sprint', 'square', 'squash', 'squid', 'stag', 'stamp', 'star', 'step', 'stew', 'sticky',
  'stitch', 'stoat', 'stone', 'stool', 'stream', 'string', 'summer', 'super', 'sushi', 'swan', 'swift', 'swim',
  'swing', 'tabby', 'table', 'tablet', 'taco', 'tall', 'tango', 'tap', 'tape', 'taxi', 'teal', 'teddy', 'tell',
  'tennis', 'tent', 'think', 'thread', 'tiara', 'ticket', 'tidy', 'tiger', 'tile', 'timer', 'tiny', 'toast',
  'tock', 'toffee', 'tofu', 'token', 'tomato', 'topaz', 'torch', 'toucan', 'towel', 'tower', 'toy', 'track', 'trail',
  'train', 'tram', 'travel', 'tray', 'tree', 'trek', 'trophy', 'trout', 'truck', 'tub', 'tulip', 'tumble', 'tune',
  'tunic', 'tunnel', 'turkey', 'turnip', 'turtle', 'twig', 'twin', 'twirl', 'valley', 'van', 'vase', 'vault',
  'velvet', 'verb', 'vest', 'vet', 'video', 'violet', 'violin', 'visit', 'vole', 'wafer', 'wagon', 'wake', 'wall',
  'wallet', 'walnut', 'walrus', 'wand', 'warm', 'water', 'welly', 'west', 'whisk', 'whoosh', 'wig', 'wiggle',
  'willow', 'window', 'windy', 'wink', 'winter', 'wire', 'wish', 'wizard', 'wobble', 'wok', 'wombat', 'wooden',
  'wool', 'yak', 'yarn', 'yawn', 'yoga', 'yoyo', 'yummy', 'zany', 'zap', 'zebra', 'zing', 'zip', 'zoom',
];
