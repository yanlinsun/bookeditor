'use strict';

const Nzh = require('nzh');
const nzhcn = require('nzh/cn');
const nzhhk = require('nzh/hk');

const SEP_CHAR = "`!@#$%^&*()+={}\\[\\]\\\\|;':\\\",.<>\/?～·！¥…（）【】「」、；：，。《》？●　";
const EXP_SEP = new RegExp("[" + SEP_CHAR + "]", "gm");
const FULL_WITH_NUM = String.fromCodePoint(65296,65297,65298,65299,65300,65301,65302,65303,65304,65305); // 0-9
const SEQ_PATTERN = "第?\\s*([0-9" + FULL_WITH_NUM + "零〇一二三四五六七八九十百千万]+)\\s*[章节篇回]?";
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
                    if (indentx) {
                        if (indentx[1] == null)
                            t.indent = 1;
                        else
                            t.indent = parseInt(indentx[1], 10);
                        if (t.indent == NaN)
                            t.indent = 1;
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
                t.ignore = t.indent && t.content.length < 200;
                this.chapters.set(t.id, t); // put it first, in case content has sub chapter
                t.content = this.normalize(t, div.innerHTML);
            }
        });
        let sortedChapters = new Map();
        Array.from(this.chapters.values()).sort((a, b) => a.indent == b.indent ? a.order - b.order : 0).map(c => sortedChapters.set(c.id, c));
        this.chapters = sortedChapters;
        
    }

    get(id) {
        this.chapters.get(id);
    }

    delete(id) {
        this.deletedChapters.set(id, this.chapters.get(id));
        this.chapters.delete(id);
    }

    normalize(chapter, html) {
        html = html.replace(/<div class="title">.*<\/div>/g, "");
        html = html.replace(/<a href="#top">Back<\/a>/g, "");
        html = html.replace(/\[.*本帖最后由.*编辑.*\]/g, "");
        html = html.replace(/<\/?\w+\s*[^>]*>/g, "");
        html = html.replace(/&nbsp;/g, "");
        html = html.trim().replace(/^\s*$/mg, "</p><p>");
        html = html.replace(/[\r\n]+/g, "");
        html = html.replace(/\s*<\/p>/g, "</p>");
        html = html.replace(/<p>\s*/g, "<p>");
        html = html.replace(/<p><\/p>/g, "");
        html = html.replace(/<\/p><p>/g, "</p>\n<p>");
        html = "<p>" + html + "</p>";
        // find possible chapters in content
        let result = null;
        let match, lastMatch;
        let cnt = 1;
        let exp = new RegExp("^<p>" + SEQ_PATTERN + "<\\/p>$", "gm");
        while((match = exp.exec(html)) !== null) {
            if (lastMatch) {
                let t = {};
                t.id = chapter.id + cnt++;
                t.indent = chapter.indent + 1;
                t.title = lastMatch[0].replace(/<\/?p>/g, "");
                t.order = chapter.order + 1;
                t.content = html.substring(lastMatch.index, match.index).replace(lastMatch[0] + "\n", "");
                t.ignore = t.indent && t.content.length < 200;
                this.chapters.set(t.id, t);
            } else {
                result = html.substring(0, match.index);
            }
            lastMatch = match;
        }
        if (lastMatch) {
            let t = {};
            t.id = chapter.id + cnt++;
            t.indent = chapter.indent + 1;
            t.title = lastMatch[0].replace(/<\/?p>/g, "");;
            t.order = chapter.order + 1;
            t.content = html.substring(lastMatch.index);
            t.ignore = t.indent && t.content.length < 200;
            this.chapters.set(t.id, t);
        }
        if (!result) 
            result = html;
        return result;
    }

    normalizeChapterTitle(title) {
        let reg = new RegExp("[" + SEP_CHAR + "]?" + this.title + "\\1");
        return title.replace(reg, "").replace(EXP_SEP, ' ').trim();
    }

    parseOrder(title) {
        let match = title.match(new RegExp(SEQ_PATTERN, "g"));
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
