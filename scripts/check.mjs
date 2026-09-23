import fs from 'node:fs';
import vm from 'node:vm';

const required=['index.html','manifest.webmanifest','sw.js','icon.svg','icon-192.png','icon-512.png','icon-maskable-512.png','apple-touch-icon.png','README.md','LICENSE'];
for(const file of required){if(!fs.existsSync(file)||fs.statSync(file).size===0)throw new Error(`Missing or empty: ${file}`)}

const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
if(manifest.display!=='standalone'||manifest.start_url!=='./')throw new Error('Invalid PWA display/start_url');
for(const icon of manifest.icons){if(!fs.existsSync(icon.src))throw new Error(`Manifest icon missing: ${icon.src}`)}

const html=fs.readFileSync('index.html','utf8');
for(const id of ['photo-input','recognize','people','items','mic','calculate','install-app']){if(!html.includes(`id="${id}"`))throw new Error(`Required UI id missing: ${id}`)}
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match=>match[1]);
for(const script of scripts)new vm.Script(script);
new vm.Script(fs.readFileSync('sw.js','utf8'));

const sample=`Лагер Бюро 400 мл.пиво 1 430,00\nСкидка ПГ -10%\n-43,00\nЗал Классический 2013 2 460,00\nBRIOCHE 2\nSTANDARD CUTLET 2\nRARE 2\nЗал Классический 2013 1 230,00\nBRIOCHE 1\nVEGETARIAN CUTLET 1\nFETA 1\nWELL DONE 1\nЗал Классический 2013 2 460,00\nBRIOCHE 2\nSTANDARD CUTLET 2\nMEDIUM 2\nАмерикано кофе 1 290,00\nСкидка ПГ -10% -29,00\nЗал Молочный коктейль 1 370,00\nКлубника 1\nСкидка ПГ -10% -37,00\nЗал Молочный коктейль 1 370,00\nСкидка ПГ -10% -37,00\nКлубника 1\nПОЛНЫЙ ИТОГ 2610,00\nК ОПЛАТЕ 2464,00`;
const parserCode=html.slice(html.indexOf('function parseReceipt'),html.indexOf('function normalize'));
const parserContext=vm.createContext({});vm.runInContext(parserCode,parserContext);
const rows=parserContext.parseReceipt(sample),total=rows.reduce((sum,row)=>sum+row.price,0),discounts=rows.reduce((sum,row)=>sum+row.discount,0);
if(rows.length!==7||total!==2464||discounts!==146)throw new Error(`Receipt parser failed: rows=${rows.length} total=${total} discounts=${discounts}`);

const grocery=`Пятёрочка
КАССОВЫЙ ЧЕК/ПРИХОД
ЦЕНА ДО СКИДКИ СКИДКА ЦЕНА КОЛ-ВО ИТОГО
ТЕНД.ГОЛЕНЬ КУР.ОХЛ.1КГ
НДС 10% 249.99 249.99 0.860КГ 214.99
РОС-Ш.Д.ШОК.КОФЕ С МОЛ.МОЛ.75Г
НДС 22% 74.99 74.99 1ШТ 74.99
ДСК ОГУРЦЫ КОРОТКОПЛОДНЫЕ 450Г
НДС 10% 99.99 15.00 84.99 1ШТ 84.99
БАКЛАЖАН
НДС 10% 169.99 30.01 139.98 0.602КГ 84.27
ЗЕЛЕНЬ ПЕТРУШКА В УПАКОВКЕ 100Г
НДС 10% 89.99 89.99 1ШТ 89.99
ПЯТЕР.ПАКЕТ МАЙКА Д/П.ПР.
НДС 22% 9.99 9.99 1ШТ 9.99
СКИДКА НА ЧЕК 33.06
ПОДЫТОГ 592.28
ИТОГ 559.22`;
const groceryRows=parserContext.parseReceipt(grocery),groceryTotal=groceryRows.reduce((sum,row)=>sum+row.price,0),groceryDiscounts=groceryRows.reduce((sum,row)=>sum+(row.discount||0),0);
const expectedNames=['ГОЛЕНЬ','ШОК','ОГУРЦЫ','БАКЛАЖАН','ПЕТРУШКА','ПАКЕТ'];
if(groceryRows.length!==6)throw new Error(`Grocery parser: expected 6 rows, got ${groceryRows.length}`);
if(Math.abs(groceryTotal-559.22)>.001)throw new Error(`Grocery parser: expected total 559.22, got ${groceryTotal}`);
expectedNames.forEach((name,i)=>{if(!groceryRows[i]?.name.includes(name))throw new Error(`Grocery parser: row ${i+1} should contain ${name}`)});
if(Math.abs(groceryRows[0].quantity-.86)>.001||Math.abs(groceryRows[3].quantity-.602)>.001)throw new Error('Grocery parser: weight parsing failed');
if(Math.abs(groceryDiscounts-33.06)>.011)throw new Error(`Grocery parser: expected discount 33.06, got ${groceryDiscounts}`);

const noisyGrocery=`(6) пягпёрочка
КАССОВЫЙ, ЧЕКЛПРИХОЙ
ЦЕНА 10 СКИДКИ СКИДКА LEH КОЛ-В
Мое 240.09 0.860КГ 214.99
HC. .L0K KOBE С MORO 767
FEC. Lok. owe 74.99 WT 74.99
0 К ОТУРЦЫ КОРОТКОПЛОДНЫЕ 45
99.99 15.00 4.99 WT 84.99
MCI 169.99 30.01 139 0.602F 84,27
ЗЕЛЕНЬ ПЕТРУШКА В УПАКОВКЕ 1007
ТЕР НАЯ amp, 69-9 WT 89.99
МАКЕТ МАР ПР.
ET Hank 9.99 WT
СКИДКА НА ЧЕК 33.06
ИТОГ 559.22`;
const noisyRows=parserContext.parseReceipt(noisyGrocery),noisyTotal=noisyRows.reduce((sum,row)=>sum+row.price,0);
if(noisyRows.length!==6||Math.abs(noisyTotal-559.22)>.001)throw new Error(`Noisy grocery OCR failed: rows=${noisyRows.length} total=${noisyTotal}`);

const voiceCode=html.slice(html.indexOf('function normalize'),html.indexOf('function receiptExample'));
const voiceContext=vm.createContext({state:{people:['Маша','Саша','Лёша'],items:[
  {name:'Классический',modifiers:['RARE'],owners:[]},
  {name:'Классический',modifiers:['VEGETARIAN CUTLET'],owners:[]},
  {name:'Классический',modifiers:['MEDIUM'],owners:[]},
  {name:'Молочный коктейль',modifiers:['Клубника'],owners:[]}
]},renderItems:()=>{}});
vm.runInContext(voiceCode,voiceContext);
const changed=voiceContext.applyVoice('редкая прожарка у Маши, вегетарианский бургер у Саши, средняя прожарка у Лёши, коктейль на всех');
const owners=JSON.stringify(voiceContext.state.items.map(item=>item.owners));
if(changed!==4||owners!==JSON.stringify([[0],[1],[2],[0,1,2]]))throw new Error(`Russian voice parser failed: ${owners}`);

console.log(`OK: PWA files, JS syntax, restaurant ${total}, grocery ${groceryTotal}, grocery discounts ${groceryDiscounts.toFixed(2)}, Russian voice cases`);
