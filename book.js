
class Book {
    constructor(dom, title) {
        this.title = this.parseTitle(dom, title);
        this.chapters = new Map();
        this.deletedChapters = new Map();
        this.parseChapters(dom);
        this.parseAuthor(dom);
    }


    parseTitle(dom, defaultTitle) {
        let title = dom.querySelector("h1");
        if (title) {
            return title;
        } else {
            return defaultTitle;
        }
    }

    parseAuthor(dom) {
        this.author = "SIS";
    }

    parseChapters(dom) {
        let tocdiv = dom.querySelector("div.toc");
        let previousChapter = null;
        Array.from(tocdiv.querySelectorAll("tr")).forEach(tr => {
            let link = tr.cells[0].querySelector("a");
            if (link) {
                let t = {};
                t.id = link.hash.substring(1);
                var span = link.parentNode.querySelector("span");
                t.indent = span ? span.classList.contains("indent") : false;
                t.title = link.innerText;
                let div = dom.querySelector("div[id='" + t.id + "']");
                t.content = this.normalize(div.innerHTML);
                if (t.indent && previousChapter != null) {
                    t.parentChapter = previousChapter;
                }
                if (t.indent && t.content.length < 200)
                {
                    this.deletedChapters.set(t.id, t);
                } else {
                    this.chapters.set(t.id, t);
                }
                previousChapter = t;
            }
        });
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
        html = html.replace("<a href=\"#top\">Back</a>", "");
        html = html.replace(/\[.*本帖最后由.*编辑.*\]/g, "");
        html = html.replace(/<\/?\w+\s*[^>]*>/g, "");
        html = html.trim().replace(/^$/mg, "</p><p>");
        return "<p>" + html + "</p>";
    }
}

module.exports = Book;
