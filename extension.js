const vscode = require("vscode");
const axios = require("axios");

function activate(context) {
    console.log("Dept-Seek extension is now active!");
    
    const newsProvider = new NewsTreeDataProvider();
    vscode.window.registerTreeDataProvider("newsListView", newsProvider);
    
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
    statusBarItem.text = "📰 Loading news...";
    statusBarItem.command = "dept-seek.openNewsInSidebar";
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    context.subscriptions.push(
        vscode.commands.registerCommand("dept-seek.selectCategory", async () => {
            const category = await showCategoryPicker();
            if (category) {
                newsProvider.refresh(statusBarItem, category);
            }
        })
    );

    

    context.subscriptions.push(
        vscode.commands.registerCommand("dept-seek.openNewsInSidebar", () => {
            if (newsProvider.newsArticles.length > 0) {
                const article = newsProvider.newsArticles[newsProvider.currentNewsIndex];
                openNewsInSidebar(article.label, article.url,article.description,article.content);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("dept-seek.refreshNews", () => {
            console.log("Manual refresh triggered");
            const category = newsProvider.currentCategory || "technology";
            newsProvider.refresh(statusBarItem, category);
        })
    );

    setTimeout(async () => {
        const category = await showCategoryPicker();
        if (category) {
            newsProvider.refresh(statusBarItem, category);
            startNewsTicker(newsProvider, statusBarItem);
        }
    }, 2000);
}

class NewsTreeDataProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.newsArticles = [];
        this.currentNewsIndex = 0;
    }

    async fetchNews(statusBarItem, category) {
        try {
            statusBarItem.text = "⏳ Fetching news...";
            const response = await axios.get("https://newsapi.org/v2/top-headlines", {
                params: {
                    country: "us",
                    category: category ?? "technology",
                    apiKey: "409f6e2f8a1b4be2a2e25954321225bb",
                },
            });
console.log(response)
            this.newsArticles = response.data.articles.map(
                (article) => new NewsItem(article.title, article.url, article.description || "No description available.", article.content || "No Content available.")
            );

            this._onDidChangeTreeData.fire(null);
            statusBarItem.text = `📰 ${this.newsArticles[0]?.label || "No articles available"}`;
        } catch (error) {
            console.error("Error fetching news:", error);
            vscode.window.showErrorMessage("Failed to fetch news.");
            statusBarItem.text = "⚠️ Failed to fetch news";
        }
    }

    refresh(statusBarItem, category) {
        this.fetchNews(statusBarItem, category);
    }

    getTreeItem(element) {
        return element;
    }

    getChildren() {
        return this.newsArticles.length ? this.newsArticles : [];
    }
}

class NewsItem extends vscode.TreeItem {
    constructor(title, url, description,content) {
        super(`${title} - ${description}`, vscode.TreeItemCollapsibleState.None);
        this.url = url;
        this.description = description;
        this.content = content;
        this.command = {
            command: "dept-seek.openNewsInSidebar",
            title: "Open News in Sidebar",
            arguments: [title, url, description,content],
        };
    }
}

async function showCategoryPicker() {
    const categories = [
        "business", "entertainment", "general", "health",
        "science", "sports", "technology"
    ];

    const selected = await vscode.window.showQuickPick(categories, {
        placeHolder: "Select a news category",
    });

    return selected; // Returns undefined if the user cancels
}

function startNewsTicker(newsProvider, statusBarItem) {
    let newsIndex = 0;
    setInterval(() => {
        if (newsProvider.newsArticles.length > 0) {
            const article = newsProvider.newsArticles[newsIndex];
            statusBarItem.text = `📰 ${article.label}`;
            newsProvider.currentNewsIndex = newsIndex;
            newsIndex = (newsIndex + 1) % newsProvider.newsArticles.length;
        }
    }, 10000);
}

function openNewsInSidebar(title, url, description, content) {
    console.log("Opening Article:", { title, url, description, content });
    const panel = vscode.window.createWebviewPanel(
        "newsView",
        `📰 ${title}`,
        vscode.ViewColumn.Two,
        { enableScripts: true }
    );

    panel.webview.html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
            h2 { color:rgb(255, 255, 255); font-style:italic }
            p { font-size: 16px; color: #555; }
            button { padding: 10px 20px; margin-top: 10px; background: #007acc; color: white; border: none; cursor: pointer; }
            button:hover { background: #005f99; }
            #loading { font-size: 18px; color: #007acc; margin: 20px; }
            iframe { width: 100%; height: 80vh; border: none; display: none; }
            #errorMessage { display: none; color: red; font-weight: bold; }
            .{
            }
            a {
                display: inline-block;
                padding: 10px 20px;
                font-size: 18px;
                background: #007acc;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin-top: 20px;
                margin-bottom: 12px;
            }
            a:hover { background: #005f99; }
        </style>
        <script>
            function handleError() {
                document.getElementById('loading').style.display = 'none';
                document.getElementById('errorMessage').style.display = 'block';
            }
        </script>
    </head>
    <body>
        <h2>${title}</h2>
        <a href="${url}" target="_blank">📖 Open Article in Browser</a>
        <p id="loading">⏳ Loading article...</p>
        <iframe id="newsFrame" src="${url}" onerror="handleError()" 
                onload="document.getElementById('loading').style.display='none'; document.getElementById('newsFrame').style.display='block';">
        </iframe>
        <p id="errorMessage">⚠️ Unable to load article in VS Code.</p>
        <h3>Article Summary</h3>
       <p class="Summary">${content}</p>
    </body>
    </html>
    `;
}


function deactivate() {}

module.exports = {
    activate,
    deactivate,
};
