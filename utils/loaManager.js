const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/loa.json');

function readLoa() {
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
}

function writeLoa(data) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

module.exports = { readLoa, writeLoa };