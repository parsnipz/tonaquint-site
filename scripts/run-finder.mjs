import { crawl } from '../lib/finder.js'; import { save } from '../lib/store.js';
const d = await crawl({ log: console.log }); console.log(JSON.stringify(await save(d))); console.log(`count ${d.count}`); console.log(d.notes.join('\n'));
