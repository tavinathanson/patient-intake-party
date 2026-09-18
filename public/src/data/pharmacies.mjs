// Only the requested CVS entry is supplied as a real location. All other
// names/address combinations below are fictional game props, not a directory.
const cities = [
  { city: 'New York', state: 'NY', zip: '10011', zone: 'eastern', half: 'east', streets: ['8th Ave', 'Hudson Street', 'Orchard Street', 'West 14th Street'] },
  { city: 'Boston', state: 'MA', zip: '02118', zone: 'eastern', half: 'east', streets: ['Tremont Street', 'Warren Avenue', 'Harrison Avenue', 'Shawmut Avenue'] },
  { city: 'Miami', state: 'FL', zip: '33130', zone: 'eastern', half: 'east', streets: ['Coral Way', 'Palm Avenue', 'Bayfront Drive', 'Biscayne Lane'] },
  { city: 'Atlanta', state: 'GA', zip: '30308', zone: 'eastern', half: 'east', streets: ['Peachtree Lane', 'Piedmont Avenue', 'Juniper Street', 'Oak Grove Road'] },
  { city: 'Chicago', state: 'IL', zip: '60614', zone: 'central', half: 'east', streets: ['Clark Street', 'Lincoln Avenue', 'Fullerton Avenue', 'Lakeview Drive'] },
  { city: 'Dallas', state: 'TX', zip: '75204', zone: 'central', half: 'west', streets: ['Oak Lawn Avenue', 'Maple Avenue', 'Cedar Springs Road', 'Live Oak Street'] },
  { city: 'Denver', state: 'CO', zip: '80203', zone: 'mountain', half: 'west', streets: ['Colfax Avenue', 'Grant Street', 'Pearl Street', 'Sherman Street'] },
  { city: 'Phoenix', state: 'AZ', zip: '85004', zone: 'mountain', half: 'west', streets: ['Central Avenue', 'Roosevelt Street', 'Palm Lane', 'Desert View Road'] },
  { city: 'Seattle', state: 'WA', zip: '98122', zone: 'pacific', half: 'west', streets: ['Pike Street', 'Union Street', 'Madison Street', 'Broadway'] },
  { city: 'San Francisco', state: 'CA', zip: '94103', zone: 'pacific', half: 'west', streets: ['Market Street', 'Folsom Street', 'Howard Street', 'Mission Street'] },
];
const shops = [
  { name: 'CVS', national: true, drugstore: true, red: true },
  { name: 'Walgreens', national: true, drugstore: true, red: true },
  { name: 'Rite Aid', national: true, drugstore: true, red: false },
  { name: 'Walmart Pharmacy', national: true, bigStore: true, red: false },
  { name: 'Costco Pharmacy', national: true, bigStore: true, red: true },
  { name: 'Maple & Main Pharmacy', plant: true, place: true },
  { name: 'Cedar Care Pharmacy', plant: true, care: true },
  { name: 'Sunrise Community Pharmacy', sky: true, community: true },
  { name: 'North Star Pharmacy', sky: true, direction: true },
  { name: 'Good Neighbor Pharmacy', community: true, neighbor: true },
];

const rows = cities.flatMap((city, cityIndex) => shops.map((shop, shopIndex) => {
  const anchor = cityIndex === 0 && shopIndex === 0;
  const street = city.streets[shopIndex % city.streets.length];
  const number = 120 + cityIndex * 83 + shopIndex * 47;
  return {
    id: `pharmacy-${cityIndex}-${shopIndex}`,
    value: {
      pharmacyName: shop.name,
      pharmacyAddress: anchor ? '258 8th Ave, New York, NY 10011' : `${number} ${street}, ${city.city}, ${city.state} ${city.zip}`,
    },
    fictional: !anchor,
    city, shop,
  };
}));
const questions = [];
function clue(id, text, predicate) {
  questions.push({ id: `pharmacy-${id}`, text, yesIds: rows.filter(predicate).map(c => c.id) });
}

clue('national', 'Is your pharmacy part of a big national chain—the kind with corporate stationery and a hold-music budget?', c => Boolean(c.shop.national));
clue('east', 'Is this stakeout east of the Mississippi River? I need to know which way to point the trench coat.', c => c.city.half === 'east');
clue('pacific', 'Am I heading to California or Washington—the Pacific end of this paper trail?', c => c.city.zone === 'pacific');
clue('eastern', 'Is the pharmacy in New York, Massachusetts, Florida, or Georgia? My eastern dossier is getting thick.', c => c.city.zone === 'eastern');
clue('south', 'Should I pack for Florida, Georgia, Texas, or Arizona? The trench coat is not breathable.', c => ['FL', 'GA', 'TX', 'AZ'].includes(c.city.state));
clue('central', 'Is the pharmacy in Illinois or Texas? I have narrowed the getaway car’s route considerably.', c => ['IL', 'TX'].includes(c.city.state));
clue('big-store', 'Would I have to walk into a Walmart or Costco to reach this prescription counter?', c => Boolean(c.shop.bigStore));
clue('red', 'If I look up the chain’s logo, will red be one of its usual accomplices?', c => Boolean(c.shop.red));
clue('drugstore', 'Is this one of the three drugstore regulars: CVS, Walgreens, or Rite Aid?', c => Boolean(c.shop.drugstore));
clue('plant', 'Does the pharmacy’s name contain a tree—Maple or Cedar? I am interviewing the foliage.', c => Boolean(c.shop.plant));
clue('sky', 'Does the pharmacy’s name look up at the sky—Sunrise or Star?', c => Boolean(c.shop.sky));
clue('community', 'Does the name mention Community or Neighbor? Suspiciously friendly for this line of work.', c => Boolean(c.shop.community));

const cityQuestions = [
  'Is this pharmacy in New York City, where even my suspects walk faster than I do?',
  'Is this a Boston stakeout? I have been warned about parking the getaway car.',
  'Is the pharmacy in Miami? My trench coat has formally objected.',
  'Is Atlanta the scene of this prescription pickup?',
  'Is this pharmacy in Chicago? I am weighting down my hat as a precaution.',
  'Is the pharmacy in Dallas? This case may require a larger hat.',
  'Is Denver the city on the pharmacy’s address? This investigation is gaining altitude.',
  'Is the pharmacy in Phoenix? I will conduct the stakeout from the shade.',
  'Is this a Seattle pharmacy? The raincoat finally gets to justify its expense report.',
  'Is the pharmacy in San Francisco? I have requested a less hilly escape route.',
];
cities.forEach((city, i) => clue(`city-${i}`, cityQuestions[i], c => c.city.city === city.city));

const shopQuestions = [
  'Does the sign say CVS—three letters, and somehow the receipt is still a scroll?',
  'Does the sign say Walgreens? I have circled the W in red string.',
  'Does the sign say Rite Aid? I am checking whether the clue is, in fact, rite.',
  'Is it a Walmart pharmacy, tucked inside the land of unexpectedly large shopping carts?',
  'Is it a Costco pharmacy? I was told to bring a very large evidence bag.',
  'Is Maple & Main on the sign? Two perfectly respectable aliases.',
  'Does it call itself Cedar Care? The tree has retained a lawyer.',
  'Is Sunrise Community Pharmacy the name on the door?',
  'Does the sign say North Star Pharmacy? At least one clue knows where it is going.',
  'Is Good Neighbor Pharmacy on the sign? I shall question the neighbors.',
];
shops.forEach((shop, i) => clue(`shop-${i}`, shopQuestions[i], c => c.shop.name === shop.name));

export const pharmacyDeck = {
  candidates: rows.map(({ id, value, fictional }) => ({ id, value, fictional })),
  questions,
};
