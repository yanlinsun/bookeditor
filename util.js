'use strict';

const fs = require('fs');

async function readFile(fullpath) {
    return new Promise((resolve, reject) => {
        fs.readFile(fullpath, "utf-8", (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
}

module.exports = { readFile };
