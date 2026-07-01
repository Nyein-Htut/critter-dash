// A large bank of standalone sentences. Every race stitches together a
// handful of randomly chosen, randomly ordered sentences, so the number of
// possible paragraphs is huge (150 sentences, 4 per race, order matters =
// tens of millions of combinations). We additionally keep a rolling
// "recently used" set per sentence so the same sentence can't reappear
// again until the pool has mostly cycled through, which keeps every race
// feeling fresh even under heavy traffic.

const SENTENCES = [
  "The quick fox trots past the old wooden fence at dawn.",
  "A gentle breeze carried the scent of fresh rain across the meadow.",
  "She packed her bags and left before the sun had fully risen.",
  "Nobody expected the tiny seed to grow into such a tall tree.",
  "The library was silent except for the soft turning of pages.",
  "He tightened his shoelaces and sprinted toward the finish line.",
  "Clouds drifted lazily over the mountains as the day grew warm.",
  "The chef added a pinch of salt and stirred the bubbling pot.",
  "Children laughed as they chased bubbles across the sunny yard.",
  "A single lantern lit the narrow path through the quiet forest.",
  "The old clock on the wall ticked steadily through the night.",
  "Waves crashed against the rocks with a rhythmic, calming sound.",
  "She practiced the piano every evening after finishing her homework.",
  "The train rumbled through the valley just as the fog lifted.",
  "A curious cat watched the birds from its perch on the windowsill.",
  "The bakery filled the street with the smell of warm bread.",
  "He sketched the skyline quickly before the light began to fade.",
  "The garden bloomed with color after weeks of steady rain.",
  "Snow fell silently, covering the rooftops in soft white blankets.",
  "The captain steered the small boat carefully around the reef.",
  "Every morning the farmer fed the chickens before the sun rose.",
  "The scientist double checked her notes before starting the experiment.",
  "A rainbow stretched across the sky after the sudden summer storm.",
  "The puppy chased its tail in circles around the living room.",
  "They hiked for hours before finally reaching the hidden waterfall.",
  "The market buzzed with vendors selling fruit, spices, and flowers.",
  "A single candle flickered on the table as the storm raged outside.",
  "The astronaut floated gently past the window of the space station.",
  "Autumn leaves crunched beneath their boots as they walked the trail.",
  "The violinist tuned her instrument before stepping onto the stage.",
  "A soft drizzle began just as the parade started down Main Street.",
  "The old bridge creaked under the weight of the loaded wagon.",
  "Fireflies blinked lazily above the tall grass as evening settled in.",
  "The baker pulled a tray of golden cookies from the oven.",
  "A pod of dolphins raced alongside the ferry through calm waters.",
  "The mechanic wiped his hands and admired the freshly tuned engine.",
  "Lightning lit up the sky moments before the thunder finally rolled in.",
  "The librarian stacked the returned books neatly onto the cart.",
  "A gentle stream wound its way through the quiet green valley.",
  "The runner paced herself carefully during the first few miles.",
  "Warm light spilled through the curtains as the city began to wake.",
  "The kite dipped and soared above the crowded, windy beach.",
  "A flock of geese flew south in a perfect, shifting formation.",
  "The tailor measured the fabric twice before making the first cut.",
  "Steam rose from the mugs as they sat by the crackling fire.",
  "The hikers paused at the summit to take in the sweeping view.",
  "A stray kitten curled up beside the bakery's warm brick oven.",
  "The orchestra rehearsed the final movement until well past midnight.",
  "Sunlight sparkled on the lake as the canoe glided across it.",
  "The old sailor told stories of storms he had weathered long ago.",
  "A gentle hum filled the workshop as the woodworker sanded the table.",
  "The toddler giggled every time the puppy licked her tiny fingers.",
  "Morning fog rolled through the vineyard, hiding the rows of grapes.",
  "The pilot checked every gauge twice before requesting clearance.",
  "A crowd gathered quietly to watch the fireworks light up the harbor.",
  "The gardener trimmed the hedges into neat, even rows.",
  "Waves of golden wheat swayed gently in the late afternoon breeze.",
  "The detective examined the note carefully under the desk lamp.",
  "A warm loaf of bread cooled slowly on the kitchen windowsill.",
  "The climbers roped in together before crossing the icy ridge.",
  "Bright lanterns swung from the trees during the summer festival.",
  "The professor scribbled a quick diagram across the chalkboard.",
  "A soft melody drifted from the open window down the street.",
  "The fishermen hauled in their nets just before the tide turned.",
  "Dew clung to the spiderweb strung between two tall fence posts.",
  "The actor rehearsed his lines while pacing across the empty stage.",
  "A gentle rain tapped steadily against the tin roof all night.",
  "The blacksmith hammered the glowing metal into a graceful curve.",
  "Children built sandcastles as the tide crept slowly up the shore.",
  "The photographer waited patiently for the perfect beam of light.",
  "A curious fox peeked out from behind the tall garden hedge.",
  "The old radio crackled softly with a tune from decades ago.",
  "Snowflakes drifted past the streetlamp on a quiet winter evening.",
  "The rowers moved in perfect rhythm across the glassy lake.",
  "A warm cup of tea sat untouched beside the open novel.",
  "The farmer's dog trotted proudly beside the loaded hay wagon.",
  "Bright kites filled the sky above the crowded spring festival.",
  "The archer steadied her breath before releasing the final arrow.",
  "A narrow trail wound gently through the quiet pine forest.",
  "The chef plated the dessert with a careful drizzle of syrup.",
  "Moonlight spilled across the meadow, silvering the tall grass.",
  "The engineer traced the blueprint carefully with a steady hand.",
  "A soft breeze rustled the pages of the book left on the bench.",
  "The swimmer counted her strokes as she neared the final lap.",
  "Golden light spread across the field as the sun began to set.",
  "The potter shaped the clay slowly on the spinning wheel.",
  "A gentle tide pulled the small boats softly against the dock.",
  "The teacher wrote the day's lesson neatly across the whiteboard.",
  "Thunder rumbled in the distance as the campers zipped their tents.",
  "The juggler tossed three bright balls high above the cheering crowd.",
  "A cool mist settled over the hills just before sunrise.",
  "The carpenter measured twice before cutting the final plank.",
  "Bright stars scattered across the clear desert sky at midnight.",
  "The gardener watered the tomatoes before the midday heat arrived.",
  "A soft knock echoed through the quiet hallway just after midnight.",
  "The skater glided smoothly across the freshly resurfaced ice.",
  "Warm bread and butter waited on the table when they arrived.",
  "The astronomer adjusted the telescope toward the rising full moon.",
  "A gentle current carried the paper boat down the shallow stream.",
  "The tailor pinned the hem carefully before the final fitting.",
  "Bright orange leaves swirled across the empty schoolyard.",
  "The beekeeper checked each frame for signs of a healthy hive.",
  "A quiet hum settled over the office as everyone focused on work.",
  "The sculptor chipped away carefully at the rough block of stone.",
  "Morning light crept slowly across the wooden floor of the cabin.",
  "The rider adjusted the saddle before setting off down the trail.",
  "A soft chime rang out as the shop door swung gently open.",
  "The editor circled a few lines and scribbled a note in the margin.",
  "Bright balloons bobbed above the entrance to the county fair.",
  "The lighthouse beam swept steadily across the dark, restless sea.",
  "A warm glow spilled from the cabin windows into the snowy night.",
  "The violin case sat open beside the busker's small tip jar.",
  "Ripples spread slowly across the pond after the stone was tossed.",
  "The courier pedaled quickly through the narrow, crowded alley.",
  "A single owl called softly from somewhere deep in the woods.",
  "The chemist labeled each vial before placing it on the shelf.",
  "Bright red poppies dotted the hillside beneath the old windmill.",
  "The conductor raised his baton as the hall fell completely silent.",
  "A gentle wave lapped against the hull as the anchor was raised.",
  "The florist arranged the tulips carefully into a tall glass vase.",
  "Warm sunlight filtered through the leaves onto the forest path.",
  "The referee checked his watch before signaling the final whistle.",
  "A quiet whistle echoed as the old steam train pulled into the station.",
  "The seamstress threaded the needle and began the final stitch.",
  "Bright fireflies rose from the grass as darkness settled in.",
  "The surveyor marked the boundary with a row of small wooden stakes.",
  "A warm breeze carried the sound of laughter across the courtyard.",
  "The apprentice swept the workshop floor before locking up for the night.",
  "Soft clouds drifted low over the harbor as the fishing boats returned.",
  "The cartographer traced the coastline carefully onto the fresh map.",
  "A gentle rustle in the bushes revealed a family of curious rabbits.",
  "The barista drew a careful leaf pattern into the warm milk foam.",
  "Bright lanterns lined the pier as the night market opened for business.",
  "The falconer released the bird and watched it climb into the wind.",
];

// Rolling recently-used tracker, kept in memory. Small and cheap; resets
// automatically once most of the bank has been used so texts stay varied
// forever without ever needing an unbounded history.
let recentlyUsed = new Set();

function pickSentences(count) {
  const available = SENTENCES.map((_, i) => i).filter(i => !recentlyUsed.has(i));
  const pool = available.length >= count ? available : SENTENCES.map((_, i) => i);
  if (pool === SENTENCES.map((_, i) => i)) recentlyUsed.clear();

  const picked = [];
  const poolCopy = [...pool];
  while (picked.length < count && poolCopy.length > 0) {
    const idx = Math.floor(Math.random() * poolCopy.length);
    picked.push(poolCopy.splice(idx, 1)[0]);
  }

  picked.forEach(i => recentlyUsed.add(i));
  // Cap memory of "recently used" so the pool naturally recycles.
  if (recentlyUsed.size > SENTENCES.length - 5) {
    recentlyUsed = new Set([...recentlyUsed].slice(-Math.floor(SENTENCES.length * 0.6)));
  }

  return picked.map(i => SENTENCES[i]);
}

/**
 * Generates a fresh, randomized race paragraph.
 * @param {number} sentenceCount how many sentences to stitch together (default 4)
 */
function generateRaceText(sentenceCount = 4) {
  return pickSentences(sentenceCount).join(' ');
}

module.exports = { generateRaceText };
