'use strict';

class EditorSavedBook {
    constructor(dom) {
        this.parseMeta(dom);
        if (!this.title) {
            this.title = this.parseTitle(dom);
        }
        this.chapters = new Map();
        this.deletedChapters = new Map();
        this.parseChapters(dom);
    }

    parseTitle(dom, defaultTitle) {
        let title = dom.querySelector("title");
        if (title) {
            return title;
        } else {
            return defaultTitle;
        }
    }

    parseMeta(dom) {
        let metas = dom.querySelectorAll("meta");
        for(let m of metas) {
            switch (m.name) {
                case "DC.creator":
                    this.author = m.content;
                    break;
                case "DC.language":
                    this.language = m.content;
                    break;
                case "DC.title":
                    this.title = m.content;
                    break;
                case "DC.date":
                    this.date = new Date(m.content);
                    break;
            }
        }
    }

    parseChapters(dom) {
        let contentDiv = dom.querySelector("div.main");
        Array.from(contentDiv.querySelectorAll("div.content")).forEach((div, i) => {
            let t = {};
            t.id = div.id;
            let heading = div.querySelector(".chapter");
            t.indent = parseInt(heading.indent, 10);
            t.title = heading.innerText;
            t.order = i;
            let text = div.querySelector("div.text");
            t.content = text.innerHTML;
            this.chapters.set(t.id, t);
        });
    }

    get(id) {
        this.chapters.get(id);
    }

    delete(id) {
        this.deletedChapters.set(id, this.chapters.get(id));
        this.chapters.delete(id);
    }
}

module.exports = EditorSavedBook;
