const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/tickets.json');

function readTickets() {
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
}

function writeTickets(data) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

module.exports = { readTickets, writeTickets };