'use strict';

const {dialog} = require('electron').remote;
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const ui = require('./ui.js');
const BookEditor = require('./bookeditor');

let ebookConvertLocation = "/Applications/calibre.app/Contents/MacOS/ebook-convert";
let editor = null;

function init() {
    document.getElementById("book_file").onclick = opendir;
    document.getElementById("book_save").onclick = savebook;
    check();
}

async function opendir() {
    let result = await dialog.showOpenDialog({
            properties: ['openDirectory']
        });
    if (Array.isArray(result) && result.length > 0) {
        editor = new BookEditor(result[0]);
    }
}

async function savebook() {
    if (editor) {
        ui.message("Saving book");
        let file = await editor.save();
        if (file) {
            ui.message("Converting book");
            let filename = await convertAzw3(file.filename, file.filename.replace(path.extname(file.filename), ".azw3"));
            ui.message("Delete temp file");
            //file.delete();
            ui.message("Convert successful to " + filename);
        }
    } else {
        ui.message("Please select a file first");
    }
}

function check() {
    if (!fs.existsSync(ebookConvertLocation)) {
        ui.message("No calibre app found", true);
    }
}

async function convertAzw3(src, tgt) {
    let cmd = '"' + "/Applications/calibre.app/Contents/MacOS/ebook-convert" + '" "' + src + '" "' + tgt + '" --no-inline-toc --chapter-mark both --book-producer "EbookEditor" --language "zh_CN"';
    return await new Promise((resolve, reject) => {
        exec(cmd, (err, stdout, strerr) => {
            if (err) {
                console.error(err);
                ui.message(err, true);
                reject(err);
            } else {
                resolve(tgt);
            }
        })
    });
}

init()
