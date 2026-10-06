import type { AbilityDefinition, CardDefinition, Catalog } from '../rules/types';
const set = 'opus-ph';
const version = 'opus-ph-v1';
const a = (id: string, kind: AbilityDefinition['kind'], handler: string, text: string, ex = false): AbilityDefinition => ({ id, kind, handler, text, ex });
function card(number: string, name: string, element: CardDefinition['elements'][number], type: CardDefinition['type'], cost: number, power: number | null, rarity: CardDefinition['rarity'], options: Partial<Pick<CardDefinition, 'generic' | 'keywords' | 'jobs' | 'abilities' | 'summonHandler' | 'ex' | 'text'>> = {}): CardDefinition {
  return {
    number, name, set, provenance: 'placeholder', version, rarity, type, elements: [element], cost, power,
    jobs: type === 'Forward' ? ['Soldier'] : type === 'Backup' ? ['Support'] : [],
    categories: ['Placeholder'], generic: false, keywords: [], abilities: [], summonHandler: null,
    ex: false, text: 'No abilities.', ...options,
  };
}
const cards: CardDefinition[] = [
  card('P-001L','Cinder Marshal','Fire','Forward',3,7000,'L',{keywords:['Brave'],abilities:[a('flare-order','special','cinder-marshal-special','{S}, {Fire}, {D}: Choose 1 Forward. Deal it 7000 damage.')]}),
  card('P-002C','Cinder Marshal','Fire','Forward',2,5000,'C'),
  card('P-003C','Ash Recruit','Fire','Forward',1,3000,'C',{generic:true}), card('P-004C','Ash Recruit','Fire','Forward',2,5000,'C',{generic:true}),
  card('P-005R','Spark Runner','Fire','Forward',2,4000,'R',{keywords:['Haste'],text:'Haste.'}),
  card('P-006R','Ember Duelist','Fire','Forward',3,6000,'R',{keywords:['First Strike'],text:'First Strike.'}),
  card('P-007H','Dusk Reaver','Dark','Forward',3,7000,'H',{abilities:[a('dusk-reaver-enter','auto','dusk-reaver-enter','When Dusk Reaver enters the field, choose 1 Forward. It loses 2000 power until the end of the turn.')]}),
  card('P-008H','Dawn Guardian','Light','Forward',3,7000,'H',{abilities:[a('dawn-guardian-replacement','replacement','dawn-guardian-damage','If Dawn Guardian would be dealt damage, reduce that damage by 1000 instead.')]}),
  card('P-009C','Coal Tender','Fire','Backup',1,null,'C'),
  card('P-010C','Forge Apprentice','Fire','Backup',1,null,'C',{abilities:[a('forge-apprentice-action','action','forge-apprentice-buff','{D}: Choose 1 Fire Forward. It gains 1000 power until the end of the turn.')]}),
  card('P-011R','Quartermaster','Fire','Backup',2,null,'R',{abilities:[a('quartermaster-enter','auto','quartermaster-search','When Quartermaster enters the field, you may search your main deck for 1 Job Soldier and add it to your hand.')]}),
  card('P-012H','Banner Smith','Fire','Backup',2,null,'H',{abilities:[a('banner-smith-field','field','banner-smith-buff','Fire Forwards you control gain 1000 power.')]}),
  card('P-013R','Ember Medic','Fire','Backup',2,null,'R',{abilities:[a('ember-medic-special','special','ember-medic-recover','{Fire}, {D}, put Ember Medic into the Break Zone: Choose 1 Forward in your Break Zone. Add it to your hand.')]}),
  card('P-014R','Cinder Witness','Fire','Backup',2,null,'R',{abilities:[a('cinder-witness-leave','auto','cinder-witness-damage','When a Forward you control is put from the field into the Break Zone, choose 1 Forward. Deal it 1000 damage.')]}),
  card('P-015C','Scorch','Fire','Summon',1,null,'C',{summonHandler:'scorch',ex:true,text:'EX Burst. Choose 1 Forward. Deal it 4000 damage.'}),
  card('P-016R','Twin Embers','Fire','Summon',2,null,'R',{summonHandler:'twin-embers',text:'Choose 2 Forwards. Deal each of them 3000 damage.'}),
  card('P-017R','War Cry','Fire','Summon',1,null,'R',{summonHandler:'war-cry',text:'Choose 1 Forward. It gains 3000 power and Brave until the end of the turn.'}),
  card('P-018R','Ashen Verdict','Fire','Summon',3,null,'R',{summonHandler:'ashen-verdict',text:'Choose 1 dull Forward. Break it.'}),
  card('P-019H','Final Spark','Fire','Summon',4,null,'H',{summonHandler:'final-spark',text:'Deal your opponent 2 points of damage.'}),
  card('P-020H','Controlled Burn','Fire','Summon',3,null,'H',{summonHandler:'controlled-burn',text:'Choose a Backup of cost 2 or less to break, or choose a Forward to remove from the game.'}),
  card('P-021L','Tide Warden','Water','Forward',3,7000,'L',{abilities:[a('tide-warden-enter','auto','tide-warden-activate','When Tide Warden enters the field, choose 1 Forward. Activate it.'),a('undertow','special','tide-warden-special','{S}, {Water}, {D}: Choose 1 Forward. Return it to its owner’s hand.')]}),
  card('P-022C','Tide Warden','Water','Forward',2,5000,'C'),
  card('P-023C','River Recruit','Water','Forward',1,3000,'C',{generic:true}), card('P-024C','River Recruit','Water','Forward',2,5000,'C',{generic:true}),
  card('P-025R','Frost Binder','Water','Forward',3,6000,'R',{abilities:[a('frost-binder-enter','auto','frost-binder-enter','When Frost Binder enters the field, choose 1 Forward. Dull and Freeze it.')]}),
  card('P-026R','Tide Duelist','Water','Forward',3,6000,'R',{keywords:['First Strike'],text:'First Strike.'}),
  card('P-027H','Night Regent','Dark','Forward',3,7000,'H',{abilities:[a('night-regent-leave','auto','night-regent-leave','When Night Regent is put from the field into the Break Zone, choose 1 Forward. It loses power equal to Night Regent’s power until the end of the turn.')]}),
  card('P-028H','Dawn Arbiter','Light','Forward',3,7000,'H'),
  card('P-029C','Brook Tender','Water','Backup',1,null,'C'),
  card('P-030C','Wave Apprentice','Water','Backup',1,null,'C',{abilities:[a('wave-apprentice-action','action','wave-apprentice-activate','{D}: Choose 1 Forward. Activate it.')]}),
  card('P-031R','Archive Keeper','Water','Backup',2,null,'R',{abilities:[a('archive-keeper-enter','auto','archive-keeper-draw-discard','EX Burst. When Archive Keeper enters the field, draw 1 card, then discard 1 card.',true)],ex:true,text:'EX Burst. When Archive Keeper enters the field, draw 1 card, then discard 1 card.'}),
  card('P-032R','Recovery Clerk','Water','Backup',2,null,'R',{abilities:[a('recovery-clerk-action','action','recovery-clerk-bottom','{Water}, {D}: Choose 1 card in your Break Zone. Put it on the bottom of your main deck.')]}),
  card('P-033R','Tide Witness','Water','Backup',2,null,'R',{abilities:[a('tide-witness-leave','auto','tide-witness-draw','When a Forward you control leaves the field, you may draw 1 card.')]}),
  card('P-034R','Mist Caller','Water','Backup',2,null,'R',{abilities:[a('mist-caller-end','auto','mist-caller-activate','At the beginning of your End Phase, choose 1 Forward. Activate it.')]}),
  card('P-035C','Return Tide','Water','Summon',2,null,'C',{summonHandler:'return-tide',ex:true,text:'EX Burst. Choose 1 Forward. Return it to its owner’s hand.'}),
  card('P-036R','Stillwater','Water','Summon',2,null,'R',{summonHandler:'stillwater',text:'Choose 1 Summon on the stack. Cancel its effect and put it into its owner’s Break Zone.'}),
  card('P-037R','Guarding Current','Water','Summon',1,null,'R',{summonHandler:'guarding-current',text:'Choose 1 Forward. It gains 2000 power and First Strike until the end of the turn.'}),
  card('P-038R','Shape Tide','Water','Summon',2,null,'R',{summonHandler:'shape-tide',text:'Choose 1 Forward. Its power becomes 4000 until the end of the turn.'}),
  card('P-039H','Borrowed Banner','Water','Summon',4,null,'H',{summonHandler:'borrowed-banner',text:'Choose 1 Character your opponent controls. Gain control of it until the end of the turn.'}),
  card('P-040R','Rising Undertow','Water','Summon',2,null,'R',{summonHandler:'rising-undertow',text:'Draw 2 cards. At the beginning of your End Phase, discard 1 card.'}),
];
export const opusPhNumbers = cards.map(entry => entry.number);
export const opusPh: Catalog = Object.fromEntries(cards.map(entry => [entry.number, entry]));
