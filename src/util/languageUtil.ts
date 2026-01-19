import fs from 'fs';
import path from 'path';

export async function getLanguage(short: string) {
    const languages = fs.readdirSync(path.join(__dirname, '../../data/language'))
    if (languages.includes(short + '.json')) {
        const _lang = fs.readFileSync(path.join(__dirname, `../../data/language/${short}.json`), 'utf-8');
        return JSON.parse(_lang);
    }
    return null;
}