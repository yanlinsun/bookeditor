'use strict';

const Nzh = require('nzh');
const nzhcn = require('nzh/cn');
const nzhhk = require('nzh/hk');

const SEP_CHAR = "`!@#$%^&*()+={}\\[\\]\\\\|;':\\\",.<>\/?～·！¥…（）【】「」、；：，。《》？●　";
const EXP_SEP = new RegExp("[" + SEP_CHAR + "]", "gm");
const EXP_SEQ = /第?\s*([0-9零〇一二三四五六七八九十百千万]+)\s*[章节篇回]?/g;
const CH_NUM = "零〇一二三四五六七八九"
const CH_UNIT = "十百千万";

class Book {
    constructor(dom, title) {
        this.title = this.parseTitle(dom, title);
        this.chapters = new Map();
        this.deletedChapters = new Map();
        this.parseChapters(dom);
    }

    parseTitle(dom, defaultTitle) {
        let title = dom.querySelector("h1");
        if (title) {
            return title;
        } else {
            return defaultTitle;
        }
    }

    parseAuthor(html) {
        let match = html.match(/作者[：:]?(.*)<br>/);
        if (match && match.length > 1) {
            this.author = match[1];
        } else {
            this.author = "SIS001";
        }
    }

    parseDate(html) {
        let match = html.match(/(\d+)年(\d+)月(?:(\d+)日)?|(\d+)[\-\/]{1}(\d+)[\-\/]{1}(\d+)/);
        if (match) {
            let y = match[1] || match[4], m = match[2] || match [5], d = match[3] || match[6];
            if (!d) d = 0;
            if (match.length > 3)
                d = match[3];

            this.date = new Date(y + "-" + m + "-" + d);
        }
    }

    parsePublisher(html) {
        let match = html.match(/(?:首发于|发表于)[：:]?(.*)<br>/);
        if (match) {
            this.publisher = match[1];
            if (this.publisher.toLowerCase() == "sis001") {
                this.publisher = "第一会所";
            }
        }
    }

    parseChapters(dom) {
        let tocdiv = dom.querySelector("div.toc");
        Array.from(tocdiv.querySelectorAll("tr")).forEach(tr => {
            let link = tr.cells[0].querySelector("a");
            if (link) {
                let t = {};
                t.id = link.hash.substring(1);
                t.indent = 0;
                let span = link.parentNode.querySelector("span");
                if (span) {
                    let indentx = span.classList.toString().match(/indent(\d)?/);
                    if (indentx && indentx.length > 1) {
                        t.indent = parseInt(indentx[1], 10);
                    }
                }
                t.title = this.normalizeChapterTitle(link.innerText);
                t.order = this.parseOrder(t.title);
                let div = dom.querySelector("div[id='" + t.id + "']");
                if (!this.author) {
                    this.parseAuthor(div.innerHTML);
                }
                if (!this.date) {
                    this.parseDate(div.innerHTML);
                }
                if (!this.publisher) {
                    this.parsePublisher(div.innerHTML);
                }
                t.content = this.normalize(div.innerHTML);
                if (t.indent && t.content.length < 200)
                {
                    this.deletedChapters.set(t.id, t);
                } else {
                    this.chapters.set(t.id, t);
                }
            }
        });
        let sortedChapters = new Map();
        Array.from(this.chapters.values()).sort((a, b) => a.order - b.order).map(c => sortedChapters.set(c.id, c));
        this.chapters = sortedChapters;
        
    }

    get(id) {
        this.chapters.get(id);
    }

    delete(id) {
        this.deletedChapters.set(id, this.chapters.get(id));
        this.chapters.delete(id);
    }

    normalize(html) {
        html = html.replace(/<div class="title">.*<\/div>/g, "");
        html = html.replace(/<a href="#top">Back<\/a>/g, "");
        html = html.replace(/\[.*本帖最后由.*编辑.*\]/g, "");
        html = html.replace(/<\/?\w+\s*[^>]*>/g, "");
        html = html.replace(/&nbsp;/g, "");
        html = html.trim().replace(/^\s*$/mg, "</p><p>");
        html = html.replace(/[\r\n]/gm, "");
        html = html.replace(/\s*<\/p>/g, "</p>");
        html = html.replace(/<p>\s*/g, "<p>");
        html = html.replace(/<\/p>\s*<p>/g, "</p>\n<p>");
        html = html.replace(/<p><\/p>/g, "");
        return "<p>" + html + "</p>";
    }

    normalizeChapterTitle(title) {
        let reg = new RegExp("[" + SEP_CHAR + "]?" + this.title + "[" + SEP_CHAR + "]?");
        return title.replace(reg, "").replace(EXP_SEP, ' ').trim();
    }

    parseOrder(title) {
        let match = title.match(EXP_SEQ);
        if (match) {
            if (match.length > 0) {
                let seq = match[0];
                let i = nzhcn.decodeS(seq);
                if (i == 0)
                    i = nzhcn.decodeB(seq);
                if (i == 0)
                    i = nzhhk.decodeS(seq);
                if (i == 0)
                    i = nzhhk.decodeB(seq);
                if (i == 0)
                    i = parseInt(seq, 10);
                if (i == NaN)
                    i = 0;
                return i;
            }
        }
        return 0;
    }
}

module.exports = Book;
