// Run with: node --test paws-api/*.test.mjs
// The word list a workshop code is drawn from. A machine can check its shape and that
// none of the words on the lists below has crept in; whether a new word is friendly and
// spelt as it sounds still needs a person to read it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { WORDS } from "./words.mjs";

test("at least 600 words, each 3 to 6 plain letters, in order, none twice", () => {
  assert.ok(WORDS.length >= 600, String(WORDS.length));
  for (const w of WORDS) assert.match(w, /^[a-z]{3,6}$/);
  assert.equal(new Set(WORDS).size, WORDS.length, "a word is in the list twice: " + WORDS.filter((w, i) => WORDS.indexOf(w) !== i).join(", "));
  assert.deepEqual(WORDS, [...WORDS].sort(), "keep the list in alphabetical order");
  assert.ok(WORDS.length ** 3 * 90 >= 2 ** 34);
});

// Words that sound like another word (a child told the code out loud could spell either),
// or that are spelt in a way the sound does not give away.
const SOUND_ALIKE = `ad add air heir aisle isle allowed aloud ant aunt ate eight bail bale bald bawled ball bawl band banned bare bear baron barren
  base bass be bee beach beech bean been beat beet bell belle berry bury berth birth blew blue boar bore board bored bold bowled bough bow boy buoy brake break
  bread bred bridal bridle but butt buy by bye caught court cell sell cellar seller cent scent sent cereal serial cheap cheep check cheque chilli chilly choir
  chord cord cite sight site coarse course conker conquer coral choral creak creek crews cruise cue queue currant current cygnet signet dam damn days daze dear deer
  desert dessert dew due die dye doe dough done dun draft draught earn urn ewe you yew eye fair fare fairy ferry feat feet find fined fir fur flair flare flaw floor
  flea flee flew flu flour flower for four fore foul fowl gait gate genes jeans gilt guilt gnu knew new grate great groan grown guessed guest hail hale hair hare
  hall haul hart heart hay hey heal heel hear here heard herd hi high him hymn hoarse horse hole whole holy wholly hour our idle idol inn jam jamb key quay knead need
  knight night knit nit knot not know no knows nose lain lane law lore leak leek lessen lesson links lynx loan lone lock loch made maid mail male main mane maize maze
  mare mayor mat matt meat meet medal meddle merry marry mind mined missed mist moat mote moor more moose mousse morn mourn muscle mussel none nun oar ore one won
  pail pale pain pane pair pear pare passed past pause paws paw pore pour poor pea pee peace piece peak peek peal peel pearl purl pedal peddle pi pie plaice place
  plain plane plum plumb pole poll pray prey prince prints prize pries profit prophet rain reign rein raise rays rap wrap raw roar read red reed real reel right write rite
  ring wring road rode rowed roam rome role roll root route rose rows rye wry sail sale sauce source saw sore soar scene seen sea see seam seem seek sikh sew so sow
  shake sheikh shoe shoo shore sure side sighed sink sync soared sword sole soul some sum son sun sonny sunny stair stare stake steak stalk stork steal steel
  storey story suite sweet tail tale taper tapir tea tee team teem tear tier their there threw through throne thrown thyme time tic tick tide tied to too two toad towed toe tow
  tuba tuber tuna tuner vain vane vein wade weighed wail whale waist waste wait weight war wore ware wear where warn worn wave waive way weigh weak week
  weather whether which witch wood would yoke yolk`.split(/\s+/);

const SILENT_OR_ODD = `autumn ballet beret busy calm canoe castle chalk chef climb cocoa colour comb cosy cupboard debt diary doubt dove duvet echo friend
  ghost glove gnat gnome grey guard guess guide guitar half honey island juice knee knife knock lamb limb listen monkey ocean onion palm people pigeon pizza
  rhino rhyme salmon scissors shovel sorbet soup sponge sugar sword talk thumb tyre walk whistle woolly wren wrist yacht`.split(/\s+/);

// Not for a primary classroom: rude or nearly rude, sad, scary, or unkind next to another word.
const NOT_FRIENDLY = `ape ass baboon bang bat beast beer bite black blimp blood bomb bone boob booze brown bum burn butt cage cow coffin crap crash cry curse damn dark dead death devil
  die dirty drug drunk dumb dump evil fail fang fart fat fear fight fire gag ghost gin gore grave greed grim gun hate hell hit hurt idiot jail kick kid kill knife lazy
  loser lost mad mean mob monster nasty nut nude pain pansy pants pig pirate poo poop pot prison pub puff punch rage rat ride rob rope rude rum sad scar scream shadow shark
  shoot sick skull slap slave smash smell snake snot spider spit stab steal stink storm stupid tank tart thief tickle tit tomb toot toss trap ugly vomit war wasp weak wee
  weed weep white wicked wine witch wolf worm wound yellow zombie`.split(/\s+/);
// No family members: a code should not be able to remind a child of someone they miss.
const FAMILY = `aunt baby brother dad daddy family father gran granny mother mum mummy nephew niece sister uncle`.split(/\s+/);

test("no sound-alikes, no silent letters, nothing rude, sad or scary", () => {
  const blocked = new Set([...SOUND_ALIKE, ...SILENT_OR_ODD, ...NOT_FRIENDLY, ...FAMILY]);
  const hits = WORDS.filter((w) => blocked.has(w));
  assert.deepEqual(hits, []);
});

test("no plurals", () => {
  // The only words allowed to end in "s": none of them is more than one of something.
  const endsInS = ["atlas", "bus", "cactus", "chess", "cress", "crocus", "dress", "grass", "lotus", "mantis", "moss", "tennis", "walrus"];
  assert.deepEqual(WORDS.filter((w) => w.endsWith("s")), endsInS);
});

test("no two words are easy to mix up: none is another with s, es, y or ly on the end", () => {
  // "frost" and "frosty" in one list would be a typing slip waiting to happen.
  // ("bun" and "bunny", "pup" and "puppy" differ by more than an ending, and are fine.)
  const set = new Set(WORDS);
  assert.deepEqual(WORDS.filter((w) => ["s", "es", "y", "ly"].some((end) => set.has(w + end))), []);
});
