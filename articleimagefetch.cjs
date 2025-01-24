// This script accomplishes the following:
// Fetches articles by an author ID.
// It includes the URLs for images in the article content.
// Useful when trying to retrieve all the images from an article
// The script uses the following API endpoint:
// GET /api/v3/articles
// Note: The API v3 call requires a bearer token with read permissions.

const https = require('https');
const readline = require('readline');

// Create an interface for input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to ask questions
const askQuestion = (question) => {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
};

// Function to extract image URLs from content
const extractImageUrls = (content) => {
    const imgUrls = [];
    const imgRegex = /<img[^>]+src="([^">]+)"/g;
    let match;

    while ((match = imgRegex.exec(content)) !== null) {
        imgUrls.push(match[1]);
    }

    return imgUrls;
};

// Function to fetch articles
const fetchArticles = (fqdn, authorId, bearerToken) => {
    return new Promise((resolve, reject) => {
        const apiUrl = `https://${fqdn}/api/v3/articles?authorId=${authorId}&sort=creation&order=desc`;

        const options = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${bearerToken}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(apiUrl, options, (res) => {
            let data = '';

            // Collect data chunks
            res.on('data', (chunk) => {
                data += chunk;
            });

            // On end of response
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(data);
                    const articles = parsedData.items.map(article => ({
                        id: article.id,
                        title: article.title,
                        content: article.body,
                        imageUrls: extractImageUrls(article.body),
                        owner: article.owner,
                        viewCount: article.viewCount,
                        score: article.score,
                        shareUrl: article.shareUrl
                    }));
                    resolve(articles);
                } catch (error) {
                    reject('Error parsing response data.');
                }
            });
        });

        // Handle request errors
        req.on('error', (error) => {
            reject(`Request error: ${error.message}`);
        });

        req.end();
    });
};

// Main function
const main = async () => {
    const fqdn = await askQuestion('Enter instance FQDN: ');
    const authorId = await askQuestion('Enter Author ID: ');
    const bearerToken = await askQuestion('Enter Bearer Token: ');

    try {
        const articles = await fetchArticles(fqdn, authorId, bearerToken);

        if (articles.length > 0) {
            console.log(`Fetched ${articles.length} articles.`);
            articles.forEach(article => {
                console.log(`\nTitle: ${article.title}`);
                console.log(`Owner: ${article.owner.name}`);
                console.log(`Share URL: ${article.shareUrl}`);
                if (article.imageUrls.length > 0) {
                    console.log('Image URLs:');
                    article.imageUrls.forEach(url => console.log(`- ${url}`));
                } else {
                    console.log('No images found.');
                }
            });
        } else {
            console.log('No articles found or an error occurred.');
        }
    } catch (error) {
        console.error(error);
    } finally {
        rl.close();
    }
};

main();